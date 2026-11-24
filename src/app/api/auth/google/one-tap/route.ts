import { NextRequest, NextResponse } from "next/server";
import { cookieMaxAge, cookieName, sessionToken, signInWithGoogleProfile } from "@/lib/auth";
import {
  createOnboardingToken,
  ONBOARDING_COOKIE,
  safeNext,
  verifyGoogleIdToken,
} from "@/lib/auth-google";

export const dynamic = "force-dynamic";

function getCookieDomain(req: NextRequest): string | undefined {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl?.hostname ||
    "";
  if (host.includes("depoii.com")) {
    return ".depoii.com";
  }
  return undefined;
}

function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = [
    "https://depoii.com",
    "https://www.depoii.com",
    "https://app.depoii.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4417",
  ];

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  if (allowed.includes(origin) || origin.endsWith(".depoii.com")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const contentType = req.headers.get("content-type") || "";
  let credential = "";
  let next = "/";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { credential?: string; next?: string };
    credential = (body.credential || "").trim();
    next = safeNext(body.next);
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await req.formData().catch(() => new FormData());
    credential = String(formData.get("credential") || "").trim();
    next = safeNext(String(formData.get("next") || "/"));
  }

  const isFormPost =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  const isSecure = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https:");
  const cookieDomain = getCookieDomain(req);

  if (!credential) {
    if (isFormPost) {
      return NextResponse.redirect(new URL("/login?error=google_failed&reason=Missing+credential", req.url), 303);
    }
    return NextResponse.json({ error: "Missing Google ID token credential." }, { status: 400, headers: corsHeaders });
  }

  // 1. Verify Google ID token
  const verifyResult = await verifyGoogleIdToken(credential);
  if ("error" in verifyResult) {
    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/login?error=google_failed&reason=${encodeURIComponent(verifyResult.error)}`, req.url),
        303,
      );
    }
    return NextResponse.json({ error: verifyResult.error }, { status: 401, headers: corsHeaders });
  }

  const profile = verifyResult.user;

  // 2. Look up or auto-register user
  const signInResult = await signInWithGoogleProfile({
    email: profile.email,
    name: profile.name,
    googleId: profile.sub,
    avatarUrl: profile.picture,
  });

  // 3. New user needs onboarding
  if ("needsOnboarding" in signInResult) {
    const onboardingToken = createOnboardingToken({
      ...signInResult.profile,
      next,
    });

    if (isFormPost) {
      const res = NextResponse.redirect(new URL("/onboarding", req.url), 303);
      res.cookies.set({
        name: ONBOARDING_COOKIE,
        value: onboardingToken,
        path: "/",
        domain: cookieDomain,
        httpOnly: true,
        sameSite: "lax",
        secure: isSecure,
        maxAge: 3600,
      });
      return res;
    }

    const res = NextResponse.json(
      { ok: true, step: "onboarding", next: "/onboarding" },
      { headers: corsHeaders },
    );
    res.cookies.set({
      name: ONBOARDING_COOKIE,
      value: onboardingToken,
      path: "/",
      domain: cookieDomain,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      maxAge: 3600,
    });
    return res;
  }

  if ("error" in signInResult) {
    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/login?error=google_failed&reason=${encodeURIComponent(signInResult.error)}`, req.url),
        303,
      );
    }
    return NextResponse.json({ error: signInResult.error }, { status: 400, headers: corsHeaders });
  }

  // 4. Existing user signed in
  const user = signInResult.user;
  const targetUrl = next || "/";

  if (isFormPost) {
    const res = NextResponse.redirect(new URL(targetUrl, req.url), 303);
    res.cookies.set({
      name: cookieName(),
      value: sessionToken(user),
      path: "/",
      domain: cookieDomain,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      maxAge: cookieMaxAge(),
    });
    return res;
  }

  const res = NextResponse.json(
    { ok: true, step: "done", next: targetUrl },
    { headers: corsHeaders },
  );
  res.cookies.set({
    name: cookieName(),
    value: sessionToken(user),
    path: "/",
    domain: cookieDomain,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: cookieMaxAge(),
  });
  return res;
}
