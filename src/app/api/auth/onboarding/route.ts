import { NextRequest, NextResponse } from "next/server";
import { completeOnboarding, cookieMaxAge, cookieName, sessionToken } from "@/lib/auth";
import { ONBOARDING_COOKIE, safeNext, verifyOnboardingToken } from "@/lib/auth-google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ONBOARDING_COOKIE)?.value;
  const tokenCheck = verifyOnboardingToken(token);

  if (!tokenCheck.valid) {
    return NextResponse.json({ error: tokenCheck.error }, { status: 401 });
  }

  return NextResponse.json({
    email: tokenCheck.data.email,
    name: tokenCheck.data.name || "",
    avatarUrl: tokenCheck.data.avatarUrl || "",
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ONBOARDING_COOKIE)?.value;
  const tokenCheck = verifyOnboardingToken(token);

  if (!tokenCheck.valid) {
    return NextResponse.json(
      { error: "Onboarding session expired. Please sign in again with Google." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    orgName?: string;
    website?: string;
    roleTitle?: string;
  };

  const orgName = (body.orgName || "").trim();
  const website = (body.website || "").trim();
  const roleTitle = (body.roleTitle || "").trim();

  if (!orgName) {
    return NextResponse.json({ error: "Company or organization name is required." }, { status: 400 });
  }

  if (!roleTitle) {
    return NextResponse.json({ error: "Your role or job title is required." }, { status: 400 });
  }

  const result = await completeOnboarding({
    email: tokenCheck.data.email,
    name: tokenCheck.data.name,
    googleId: tokenCheck.data.googleId,
    avatarUrl: tokenCheck.data.avatarUrl,
    orgName,
    website,
    roleTitle,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const isSecure = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https:");
  const nextDestination = safeNext(tokenCheck.data.next) || "/";

  const res = NextResponse.json({
    ok: true,
    next: nextDestination,
  });

  // Set Depoii session cookie
  res.cookies.set({
    name: cookieName(),
    value: sessionToken(result.user),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: cookieMaxAge(),
  });

  // Clear onboarding token cookie
  res.cookies.set({
    name: ONBOARDING_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 0,
  });

  return res;
}
