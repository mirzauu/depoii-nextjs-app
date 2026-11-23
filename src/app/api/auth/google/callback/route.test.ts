import { describe, expect, it } from "vitest";
import { GET as handleCallback } from "./route";
import { NextRequest } from "next/server";
import { createGoogleOAuthState, GOOGLE_OAUTH_COOKIE } from "@/lib/auth-google";

describe("GET /api/auth/google/callback", () => {
  it("redirects to login with access_denied when user cancels consent", async () => {
    const req = new NextRequest("http://localhost:4417/api/auth/google/callback?error=access_denied");
    const res = await handleCallback(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/login");
    expect(location).toContain("error=google_access_denied");
  });

  it("redirects to login when authorization code is missing", async () => {
    const req = new NextRequest("http://localhost:4417/api/auth/google/callback");
    const res = await handleCallback(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/login");
    expect(location).toContain("error=google_failed");
  });

  it("redirects to login when OAuth state token mismatch occurs", async () => {
    const { stateToken } = createGoogleOAuthState("/map");
    const req = new NextRequest(`http://localhost:4417/api/auth/google/callback?code=mock_code&state=${stateToken}`);
    // No cookie set on request
    const res = await handleCallback(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/login");
    expect(location).toContain("error=google_state_mismatch");
  });
});
