import { NextRequest, NextResponse } from "next/server";
import { cookieMaxAge, cookieName, sessionToken, signInWithGoogleProfile } from "@/lib/auth";
import {
  createOnboardingToken,
  exchangeGoogleCode,
  fetchGoogleProfile,
  getGoogleCallbackUrl,
  GOOGLE_OAUTH_COOKIE,
  ONBOARDING_COOKIE,
  safeNext,
  verifyGoogleOAuthState,
} from "@/lib/auth-google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const isSecure = req.headers.get("x-forwarded-proto") === "https" || url.protocol === "https:";

  const redirectToLogin = (params: Record<string, string>) => {
    const dest = new URL("/login", url.origin);
    for (const [k, v] of Object.entries(params)) {
      if (v) dest.searchParams.set(k, v);
    }
    const res = NextResponse.redirect(dest);
    res.cookies.set({
      name: GOOGLE_OAUTH_COOKIE,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      maxAge: 0,
    });
    return res;
  };

  // 1. Check if user cancelled or Google returned an error
  if (errorParam) {
    if (errorParam === "access_denied") {
      return redirectToLogin({ error: "google_access_denied" });
    }
    return redirectToLogin({
      error: "google_failed",
      reason: errorDescription || errorParam,
    });
  }

  if (!code || !state) {
    return redirectToLogin({
      error: "google_failed",
      reason: "Missing authorization code or state from Google.",
    });
  }

  // 2. Validate state against HTTP-only cookie
  const cookieToken = req.cookies.get(GOOGLE_OAUTH_COOKIE)?.value;
  const stateCheck = verifyGoogleOAuthState(cookieToken, state);
  if (!stateCheck.valid) {
    console.warn("[auth-google] state verification failed:", stateCheck.error);
    return redirectToLogin({ error: "google_state_mismatch" });
  }

  const nextDestination = safeNext(stateCheck.next);

  // 3. Exchange code for tokens
  const callbackUrl = getGoogleCallbackUrl(req);
  const tokenResult = await exchangeGoogleCode(code, callbackUrl);
  if ("error" in tokenResult) {
    return redirectToLogin({
      error: "google_failed",
      reason: tokenResult.error,
    });
  }

  // 4. Fetch user profile from Google
  const profileResult = await fetchGoogleProfile(tokenResult.access_token);
  if ("error" in profileResult) {
    return redirectToLogin({
      error: "google_failed",
      reason: profileResult.error,
    });
  }

  const profile = profileResult.user;
  if (!profile.email) {
    return redirectToLogin({
      error: "google_failed",
      reason: "No email address was provided by Google.",
    });
  }

  if (!profile.email_verified) {
    return redirectToLogin({ error: "google_unverified" });
  }

  // 5. Look up user / auto-accept pending invite / trigger onboarding for new users
  const signInResult = await signInWithGoogleProfile({
    email: profile.email,
    name: profile.name,
    googleId: profile.sub,
    avatarUrl: profile.picture,
  });

  if ("needsOnboarding" in signInResult) {
    const onboardingToken = createOnboardingToken({
      ...signInResult.profile,
      next: nextDestination,
    });

    const destUrl = new URL("/onboarding", url.origin);
    const res = NextResponse.redirect(destUrl);

    res.cookies.set({
      name: ONBOARDING_COOKIE,
      value: onboardingToken,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      maxAge: 3600, // 1 hour
    });

    res.cookies.set({
      name: GOOGLE_OAUTH_COOKIE,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      maxAge: 0,
    });

    return res;
  }

  if ("error" in signInResult) {
    if (signInResult.error.toLowerCase().includes("no depoii account found")) {
      return redirectToLogin({
        error: "google_no_account",
        email: profile.email,
        next: nextDestination,
      });
    }
    return redirectToLogin({
      error: "google_failed",
      reason: signInResult.error,
    });
  }

  // 6. Sign in succeeded: set session cookie and redirect to target destination
  const destUrl = new URL(nextDestination, url.origin);
  const res = NextResponse.redirect(destUrl);

  // Set Depoii session cookie
  res.cookies.set({
    name: cookieName(),
    value: sessionToken(signInResult.user),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: cookieMaxAge(),
  });

  // Clear OAuth state cookie
  res.cookies.set({
    name: GOOGLE_OAUTH_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 0,
  });

  return res;
}
