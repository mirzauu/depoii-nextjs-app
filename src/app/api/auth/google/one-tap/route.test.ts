import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, OPTIONS } from "./route";
import * as authGoogle from "@/lib/auth-google";
import * as auth from "@/lib/auth";

describe("POST /api/auth/google/one-tap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles OPTIONS preflight with CORS headers for depoii.com", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/google/one-tap", {
      method: "OPTIONS",
      headers: {
        origin: "https://depoii.com",
      },
    });

    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://depoii.com");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("returns 400 when credential is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/google/one-tap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Missing");
  });

  it("returns 401 when token verification fails", async () => {
    vi.spyOn(authGoogle, "verifyGoogleIdToken").mockResolvedValue({
      error: "Google token was not issued for this application.",
    });

    const req = new NextRequest("http://localhost:3000/api/auth/google/one-tap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "bad-token" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("was not issued for this application");
  });

  it("triggers onboarding for new user and sets onboarding cookie", async () => {
    vi.spyOn(authGoogle, "verifyGoogleIdToken").mockResolvedValue({
      user: {
        sub: "google-new-id",
        email: "brandnew@example.com",
        name: "New Visitor",
        email_verified: true,
      },
    });

    vi.spyOn(auth, "signInWithGoogleProfile").mockResolvedValue({
      needsOnboarding: true,
      profile: {
        email: "brandnew@example.com",
        name: "New Visitor",
        googleId: "google-new-id",
      },
    });

    const req = new NextRequest("http://localhost:3000/api/auth/google/one-tap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "valid-jwt" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.step).toBe("onboarding");
    expect(json.next).toBe("/onboarding");

    // Verify cookie was set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("depoii_onboarding=");
  });

  it("logs in existing user and sets session cookie", async () => {
    vi.spyOn(authGoogle, "verifyGoogleIdToken").mockResolvedValue({
      user: {
        sub: "google-existing-id",
        email: "existing@example.com",
        name: "Existing User",
        email_verified: true,
      },
    });

    vi.spyOn(auth, "signInWithGoogleProfile").mockResolvedValue({
      user: {
        id: "usr_123",
        email: "existing@example.com",
        name: "Existing User",
        orgId: "org_123",
        orgName: "Acme Roofing",
        role: "admin",
        platformRole: "user",
      },
    });

    const req = new NextRequest("http://localhost:3000/api/auth/google/one-tap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "valid-jwt", next: "/buildings" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.step).toBe("done");
    expect(json.next).toBe("/buildings");

    // Verify session cookie was set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("depoii_session=");
  });

  it("redirects 303 with session cookie and .depoii.com domain on browser form POST", async () => {
    vi.spyOn(authGoogle, "verifyGoogleIdToken").mockResolvedValue({
      user: {
        sub: "google-existing-id",
        email: "existing@example.com",
        name: "Existing User",
        email_verified: true,
      },
    });

    vi.spyOn(auth, "signInWithGoogleProfile").mockResolvedValue({
      user: {
        id: "usr_123",
        email: "existing@example.com",
        name: "Existing User",
        orgId: "org_123",
        orgName: "Acme Roofing",
        role: "admin",
        platformRole: "user",
      },
    });

    const formData = new FormData();
    formData.append("credential", "valid-jwt");
    formData.append("next", "/");

    const req = new NextRequest("https://app.depoii.com/api/auth/google/one-tap", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.depoii.com/");
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("depoii_session=");
    expect(setCookie).toContain("Domain=.depoii.com");
  });
});
