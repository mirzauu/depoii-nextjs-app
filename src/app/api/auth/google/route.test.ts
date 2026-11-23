import { beforeEach, describe, expect, it } from "vitest";
import { GET as handleGoogleInit } from "./route";
import { NextRequest } from "next/server";
import { GOOGLE_OAUTH_COOKIE } from "@/lib/auth-google";

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  it("redirects to /login with error if Google OAuth is not configured", async () => {
    const req = new NextRequest("http://localhost:4417/api/auth/google?next=/capital");
    const res = await handleGoogleInit(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=google_not_configured");
    expect(location).toContain("next=%2Fcapital");
  });

  it("redirects to Google Accounts authorization URL and sets oauth state cookie when configured", async () => {
    process.env.GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret";

    const req = new NextRequest("http://localhost:4417/api/auth/google?next=/territory");
    const res = await handleGoogleInit(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location.startsWith("https://accounts.google.com/o/oauth2/v2/auth")).toBe(true);

    const redirectUrl = new URL(location);
    expect(redirectUrl.searchParams.get("client_id")).toBe("mock-client-id.apps.googleusercontent.com");
    expect(redirectUrl.searchParams.get("response_type")).toBe("code");
    expect(redirectUrl.searchParams.get("scope")).toContain("openid");
    expect(redirectUrl.searchParams.get("state")).toBeTruthy();

    // Verify state cookie is set
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(GOOGLE_OAUTH_COOKIE);
  });
});
