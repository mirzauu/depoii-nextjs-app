import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionToken } from "@/lib/auth";

function isPublicAsset(pathname: string) {
  return (
    pathname === "/icon.svg" ||
    pathname === "/apple-icon" ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/api/aerial") ||
    pathname.startsWith("/api/timeline-aerial") ||
    pathname.startsWith("/api/parcel-boundary") ||
    pathname.startsWith("/aerial_cache") ||
    pathname.startsWith("/cesium")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The official landing page lives exclusively on depoii.com (Notion marketing site).
  // Redirect legacy /welcome requests straight to depoii.com.
  if (pathname === "/welcome" || pathname.startsWith("/welcome/")) {
    return NextResponse.redirect("https://depoii.com", 308);
  }

  // Allow static assets, health checks, and public onboarding/auth flows
  if (
    isPublicAsset(pathname) ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/pilot") ||
    pathname.startsWith("/api/feedback") ||
    pathname === "/api/engine/health"
  ) {
    return NextResponse.next();
  }

  // If already authenticated and visiting /login, redirect to the app
  if (pathname.startsWith("/login")) {
    if (!request.nextUrl.searchParams.has("error")) {
      const session = await readSessionToken(request.cookies.get("depoii_session")?.value);
      if (session) {
        const dest = request.nextUrl.searchParams.get("next") || "/";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return NextResponse.next();
  }

  // All other routes (including base URL "/") require an active session.
  // Unauthenticated visitors are redirected to /login as the default page.
  const session = await readSessionToken(request.cookies.get("depoii_session")?.value);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
