import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  googleAuthConfigured,
  signInWithGoogleProfile,
  completeOnboarding,
  createUser,
} from "@/lib/auth";
import {
  createGoogleOAuthState,
  verifyGoogleOAuthState,
  createOnboardingToken,
  verifyOnboardingToken,
  buildGoogleAuthorizeUrl,
  verifyGoogleIdToken,
  safeNext,
} from "@/lib/auth-google";
import { query } from "@/lib/pg";

describe("Google OAuth state security", () => {
  it("generates a signed state token and verifies it successfully", () => {
    const { stateToken } = createGoogleOAuthState("/territory");
    expect(stateToken).toContain(".");

    const result = verifyGoogleOAuthState(stateToken, stateToken);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.next).toBe("/territory");
    }
  });

  it("sanitizes unsafe destination URLs in state to prevent open redirects", () => {
    expect(safeNext("https://malicious.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext("/crm/leads")).toBe("/crm/leads");
    expect(safeNext(null)).toBe("/");

    const { stateToken } = createGoogleOAuthState("https://evil.com");
    const result = verifyGoogleOAuthState(stateToken, stateToken);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.next).toBe("/");
    }
  });

  it("fails verification if cookie token and param token do not match", () => {
    const token1 = createGoogleOAuthState("/").stateToken;
    const token2 = createGoogleOAuthState("/").stateToken;

    const result = verifyGoogleOAuthState(token1, token2);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("mismatch");
    }
  });

  it("fails verification if state signature is tampered with", () => {
    const { stateToken } = createGoogleOAuthState("/capital");
    const [payload] = stateToken.split(".");
    const tamperedToken = `${payload}.invalidsignature123`;

    const result = verifyGoogleOAuthState(tamperedToken, tamperedToken);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("signature");
    }
  });

  it("correctly identifies when google auth credentials are configured", () => {
    const origId = process.env.GOOGLE_CLIENT_ID;
    const origSecret = process.env.GOOGLE_CLIENT_SECRET;

    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(googleAuthConfigured()).toBe(false);

    process.env.GOOGLE_CLIENT_ID = "mock-id.apps.googleusercontent.com";
    expect(googleAuthConfigured()).toBe(false);

    process.env.GOOGLE_CLIENT_SECRET = "mock-secret";
    expect(googleAuthConfigured()).toBe(true);

    if (origId) process.env.GOOGLE_CLIENT_ID = origId;
    else delete process.env.GOOGLE_CLIENT_ID;
    if (origSecret) process.env.GOOGLE_CLIENT_SECRET = origSecret;
    else delete process.env.GOOGLE_CLIENT_SECRET;
  });

  it("builds a correct Google authorization URL", () => {
    process.env.GOOGLE_CLIENT_ID = "my-test-client-id";
    const authUrl = buildGoogleAuthorizeUrl("http://localhost:4417/api/auth/google/callback", "test-state-token");
    const parsed = new URL(authUrl);

    expect(parsed.origin).toBe("https://accounts.google.com");
    expect(parsed.pathname).toBe("/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("my-test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:4417/api/auth/google/callback");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("state")).toBe("test-state-token");
    expect(parsed.searchParams.get("scope")).toContain("openid");
  });
});

describe("Google Profile Authentication & Auto-Provisioning", () => {
  beforeEach(async () => {
    // Clean up test accounts
    await query(`delete from app.users where email in ('google-existing@example.com', 'google-invited@example.com', 'google-stranger@example.com', 'google-auto@example.com')`).catch(() => {});
    await query(`delete from app.team_invites where email in ('google-invited@example.com')`).catch(() => {});
  });

  afterEach(async () => {
    delete process.env.GOOGLE_ALLOW_OPEN_SIGNUP;
  });

  it("signs in an existing user with Google and links their Google ID", async () => {
    // 1. Create org and user first
    const orgId = "test-org-google-1";
    await query(`insert into app.orgs (id, name, disabled, created_at) values ($1, 'Test Org', 0, now()) on conflict do nothing`, [orgId]);
    await createUser(orgId, "google-existing@example.com", "dummy-pw", "Existing User", "rep");

    // 2. Sign in with Google
    const result = await signInWithGoogleProfile({
      email: "google-existing@example.com",
      name: "Existing User Google",
      googleId: "google-sub-12345",
      avatarUrl: "https://lh3.googleusercontent.com/avatar.jpg",
    });

    expect("user" in result).toBe(true);
    if ("user" in result) {
      expect(result.user.email).toBe("google-existing@example.com");
      expect(result.user.orgId).toBe(orgId);
    }
  });

  it("automatically accepts a pending team invite when signing in with Google", async () => {
    const orgId = "test-org-google-invite";
    await query(`insert into app.orgs (id, name, disabled, created_at) values ($1, 'Inviting Org', 0, now()) on conflict do nothing`, [orgId]);
    const inviterId = await createUser(orgId, "inviter@example.com", "dummy-pw", "Inviter", "owner");

    // Create pending invite for google-invited@example.com
    await query(
      `insert into app.team_invites (id, org_id, email, name, role, token_hash, status, invited_by, created_at, expires_at)
       values ('inv-1', $1, 'google-invited@example.com', 'Invited Teammate', 'rep', 'hash1', 'pending', $2, now(), now() + interval '7 days')`,
      [orgId, inviterId],
    );

    // Sign in with Google with that invited email
    const result = await signInWithGoogleProfile({
      email: "google-invited@example.com",
      name: "Invited Teammate Real Name",
      googleId: "google-sub-9999",
    });

    expect("user" in result).toBe(true);
    if ("user" in result) {
      expect(result.user.email).toBe("google-invited@example.com");
      expect(result.user.orgId).toBe(orgId);
      expect(result.user.role).toBe("rep");
    }

    // Verify invite marked accepted
    const inviteRows = await query<{ status: string }>(`select status from app.team_invites where id = 'inv-1'`);
    expect(inviteRows[0]?.status).toBe("accepted");
  });

  it("rejects an unknown user when open signup is explicitly disabled", async () => {
    process.env.GOOGLE_ALLOW_OPEN_SIGNUP = "false";

    const result = await signInWithGoogleProfile({
      email: "google-stranger@example.com",
      name: "Unknown Stranger",
      googleId: "google-stranger-id",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("No Depoii account found");
    }
  });

  it("triggers onboarding for a new user with Google", async () => {
    delete process.env.GOOGLE_ALLOW_OPEN_SIGNUP;

    const result = await signInWithGoogleProfile({
      email: "google-auto@example.com",
      name: "New Roofer",
      googleId: "google-auto-id-888",
    });

    expect("needsOnboarding" in result).toBe(true);
    if ("needsOnboarding" in result) {
      expect(result.profile.email).toBe("google-auto@example.com");
      expect(result.profile.name).toBe("New Roofer");
    }
  });

  it("creates onboarding token and verifies it correctly", () => {
    const token = createOnboardingToken({
      email: "test-onboarding@example.com",
      name: "Test User",
      googleId: "gid-123",
      next: "/crm",
    });

    const check = verifyOnboardingToken(token);
    expect(check.valid).toBe(true);
    if (check.valid) {
      expect(check.data.email).toBe("test-onboarding@example.com");
      expect(check.data.next).toBe("/crm");
    }
  });

  it("completes onboarding with custom company name, website, and role title", async () => {
    const result = await completeOnboarding({
      email: "google-auto@example.com",
      name: "New Roofer",
      googleId: "google-auto-id-888",
      orgName: "Summit Commercial Roofing",
      website: "https://summitroofing.com",
      roleTitle: "Lead Estimator",
    });

    expect("user" in result).toBe(true);
    if ("user" in result) {
      expect(result.user.email).toBe("google-auto@example.com");
      expect(result.user.orgName).toBe("Summit Commercial Roofing");
      expect(result.user.role).toBe("owner");

      // Verify org website was stored
      const orgRows = await query<{ website: string }>(`select website from app.orgs where id = $1`, [result.user.orgId]);
      expect(orgRows[0]?.website).toBe("https://summitroofing.com");

      // Verify user title was stored
      const userRows = await query<{ title: string }>(`select title from app.users where id = $1`, [result.user.id]);
      expect(userRows[0]?.title).toBe("Lead Estimator");
    }
  });

  describe("Google ID token verification (One Tap)", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("rejects missing or empty token", async () => {
      const result = await verifyGoogleIdToken("");
      expect("error" in result).toBe(true);
    });

    it("rejects token with audience mismatch", async () => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            aud: "wrong-client-id.apps.googleusercontent.com",
            iss: "https://accounts.google.com",
            sub: "12345",
            email: "user@example.com",
            email_verified: "true",
          }),
          { status: 200 },
        );

      const result = await verifyGoogleIdToken("valid-format-jwt");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("was not issued for this application");
      }
    });

    it("rejects token with unverified email", async () => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: "https://accounts.google.com",
            sub: "12345",
            email: "user@example.com",
            email_verified: "false",
          }),
          { status: 200 },
        );

      const result = await verifyGoogleIdToken("valid-jwt");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("not verified");
      }
    });

    it("successfully verifies valid Google ID token", async () => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: "https://accounts.google.com",
            sub: "google-onetap-user-999",
            email: "onetap@example.com",
            name: "OneTap User",
            picture: "https://lh3.googleusercontent.com/avatar.jpg",
            email_verified: "true",
            exp: String(Math.floor(Date.now() / 1000) + 3600),
          }),
          { status: 200 },
        );

      const result = await verifyGoogleIdToken("valid-token");
      expect("user" in result).toBe(true);
      if ("user" in result) {
        expect(result.user.email).toBe("onetap@example.com");
        expect(result.user.name).toBe("OneTap User");
        expect(result.user.sub).toBe("google-onetap-user-999");
        expect(result.user.picture).toBe("https://lh3.googleusercontent.com/avatar.jpg");
        expect(result.user.email_verified).toBe(true);
      }
    });
  });
});
