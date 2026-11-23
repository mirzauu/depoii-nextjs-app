import { NextRequest, NextResponse } from "next/server";
import { googleAuthConfigured } from "@/lib/auth";
import {
  buildGoogleAuthorizeUrl,
  createGoogleOAuthState,
  getGoogleCallbackUrl,
  GOOGLE_OAUTH_COOKIE,
  safeNext,
} from "@/lib/auth-google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));

  if (!googleAuthConfigured()) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "google_not_configured");
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const { stateToken } = createGoogleOAuthState(next);
  const callbackUrl = getGoogleCallbackUrl(req);
  const authUrl = buildGoogleAuthorizeUrl(callbackUrl, stateToken);

  const res = NextResponse.redirect(authUrl);
  const isSecure = req.headers.get("x-forwarded-proto") === "https" || url.protocol === "https:";

  res.cookies.set({
    name: GOOGLE_OAUTH_COOKIE,
    value: stateToken,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 600, // 10 minutes
  });

  return res;
}
