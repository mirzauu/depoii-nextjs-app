"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DepoiiMark } from "@/components/depoii-logo";
import { GoogleOneTap } from "@/components/google-one-tap";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function ShowcaseRightPane() {
  return (
    <div className="relative hidden lg:flex flex-col items-center justify-center p-8 lg:p-12 xl:p-16 select-none bg-neutral-950 overflow-hidden">
      {/* Apollo-Style Angled Steel Blue Polygon Canvas */}
      <div
        className="absolute inset-y-0 right-0 left-8 xl:left-14 bg-[#1b3b54] shadow-2xl"
        style={{
          clipPath: "polygon(11% 0%, 100% 0%, 100% 100%, 0% 100%)",
        }}
      />

      {/* Foreground Container */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Layer 1: Background Subtle Offset Frame (Apollo elevation cue) */}
        <div className="relative w-full">
          <div className="absolute -top-3 -left-3 right-3 h-56 rounded-xl border border-white/10 bg-white/5 pointer-events-none" />

          {/* Layer 2: Clean, Crisp White Property Dossier Card */}
          <div className="relative rounded-xl border border-neutral-200/90 bg-white text-neutral-900 shadow-2xl p-5 space-y-4">
            {/* Top Navigation Tabs */}
            <div className="flex items-center rounded-lg bg-neutral-100 p-0.5 border border-neutral-200/80 text-xs font-medium">
              <span className="flex-1 text-center py-1 rounded-md bg-white shadow-xs text-neutral-900 font-semibold">
                Property Dossier
              </span>
              <span className="flex-1 text-center py-1 text-neutral-500">
                Decision Maker
              </span>
            </div>

            {/* Property Headline */}
            <div>
              <div className="text-base font-bold tracking-tight text-neutral-900">
                3500 Manor Way
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Brookhollow Distribution Center · Dallas, TX 75235
              </div>
            </div>

            {/* Property Metrics Table */}
            <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50/80 text-xs">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-neutral-500">Roof Age</span>
                <span className="font-semibold text-neutral-900">23 years (Built 2001)</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-neutral-500">Roof System</span>
                <span className="font-medium text-neutral-800">Built-Up Asphalt (BUR)</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-neutral-500">Storm Exposure</span>
                <span className="font-semibold text-neutral-900">1.75″ hail swath recorded</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-neutral-500">Building Area</span>
                <span className="font-medium text-neutral-800">84,200 sq ft</span>
              </div>
            </div>

            {/* Decision Maker Contact Strip */}
            <div className="rounded-lg border border-neutral-200 p-3 space-y-1.5 bg-white">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-neutral-900">David Harrison</span>
                <span className="text-[11px] text-neutral-400">VP Facilities</span>
              </div>
              <div className="text-xs text-neutral-600">
                Hines Commercial Portfolio
              </div>
              <div className="text-xs text-neutral-500 pt-1.5 border-t border-neutral-150 flex items-center justify-between font-mono">
                <span>d.harrison@hines.com</span>
                <span>(214) 741-2800</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-0.5">
              <div className="w-full py-2 text-center text-xs font-medium rounded-lg bg-neutral-900 text-white">
                View Property Record
              </div>
            </div>
          </div>
        </div>

        {/* Big Stat & Headline (Under the Card, matching Apollo layout) */}
        <div className="mt-8 text-center space-y-2 px-2">
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            70,000+
          </div>
          <div className="text-base font-semibold text-neutral-100">
            Commercial Properties Across Texas
          </div>
          <p className="text-xs sm:text-sm text-neutral-300/80 leading-relaxed max-w-xs mx-auto">
            Identify aging roof lifecycles, cross-reference severe storm swaths, and connect directly with verified property decision-makers.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { google?: boolean; googleClientId?: string | null }) => {
        if (data.google && data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(() => {});
  }, []);

  const queryError = (() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");
    const emailParam = searchParams.get("email");

    if (!errorParam) return "";
    switch (errorParam) {
      case "google_not_configured":
        return "Google sign-in is not configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.";
      case "google_access_denied":
        return "Google sign-in was cancelled.";
      case "google_no_account":
        return emailParam
          ? `No Depoii account found for ${emailParam}. Ask your team administrator to invite you.`
          : "No Depoii account found for this Google account. Ask your team administrator to invite you.";
      case "google_unverified":
        return "Your Google email address is unverified. Please verify your email with Google first.";
      case "google_state_mismatch":
        return "Sign-in session expired or security verification failed. Please try again.";
      case "google_failed":
        return reasonParam || "Could not sign in with Google. Please try again or use email sign-in.";
      case "link":
        return reasonParam || "That sign-in link is not valid. Sign in with your email instead.";
      case "invite":
        return "That invite is not valid or has expired. Ask your admin to send a new one.";
      default:
        return reasonParam || "An error occurred during sign in.";
    }
  })();

  const shownError = error || queryError;

  const sendCode = async () => {
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; step?: string; bypassed?: boolean };
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      if (data.bypassed || data.step !== "otp") {
        router.replace(safeNext(searchParams.get("next")));
        router.refresh();
        return;
      }
      setStep("otp");
      setCode("");
    } catch {
      setError("Could not sign in.");
    } finally {
      setPending(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        step?: string;
        next?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      if (data.step === "onboarding" || data.next === "/onboarding") {
        router.replace("/onboarding");
        router.refresh();
        return;
      }
      router.replace(safeNext(searchParams.get("next")));
      router.refresh();
    } catch {
      setError("Could not sign in.");
    } finally {
      setPending(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "email") await sendCode();
    else await verifyCode();
  };

  const nextDestination = safeNext(searchParams.get("next"));

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-background">
      <GoogleOneTap
        clientId={googleClientId}
        next={nextDestination}
        onError={(err) => setError(err)}
      />
      {/* Left Column: Authentication */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 min-h-screen">
        {/* Top Header & Brand */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <DepoiiMark className="size-8 text-foreground" />
            <span className="text-xl font-bold tracking-tight">Depoii</span>
          </Link>
          <div className="text-xs text-muted-foreground hidden sm:block">
            Commercial Roofing Intelligence
          </div>
        </div>

        {/* Center: Auth Form Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Welcome to Depoii</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {step === "email"
                ? "Enter your work email or continue with Google to access your account"
                : `Enter the verification code sent to ${email}`}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {step === "email" && (
              <>
                {/* Google Sign In Button */}
                <a
                  href={`/api/auth/google?next=${encodeURIComponent(nextDestination)}`}
                  className={buttonVariants({
                    className:
                      "h-10 w-full flex items-center justify-center gap-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-neutral-300/80 dark:border-neutral-700 font-medium text-sm transition-colors cursor-pointer shadow-xs",
                  })}
                >
                  <GoogleIcon className="size-4 shrink-0" />
                  <span>Continue with Google</span>
                </a>

                {/* Divider */}
                <div className="relative flex items-center justify-center py-1">
                  <div className="w-full border-t border-border" />
                  <span className="bg-background px-2.5 text-xs uppercase tracking-wider text-muted-foreground absolute font-medium">
                    Or continue with email
                  </span>
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-4">
              {step === "email" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">Work Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10"
                    placeholder="you@company.com"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs font-medium">Verification Code</Label>
                  <Input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-10 tracking-[0.3em] font-mono"
                    placeholder="000000"
                    autoFocus
                  />
                </div>
              )}

              {shownError ? <p className="text-xs text-destructive font-medium">{shownError}</p> : null}

              <Button type="submit" disabled={pending} className="h-10 w-full font-medium shadow-xs">
                {pending
                  ? step === "email"
                    ? "Sending code…"
                    : "Verifying…"
                  : step === "email"
                    ? email.trim().toLowerCase() === "admin@depoii.local"
                      ? "Sign in"
                      : "Continue with email"
                    : "Verify and continue"}
              </Button>

              {step === "otp" ? (
                <div className="flex items-center justify-between gap-3 text-xs pt-1">
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:underline"
                    disabled={pending}
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError("");
                    }}
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:underline"
                    disabled={pending}
                    onClick={() => void sendCode()}
                  >
                    Resend code
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>

        {/* Bottom Legal & Support Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
          <div>© 2026 Depoii Inc. All rights reserved.</div>
          <div className="mt-1 text-[11px] text-muted-foreground/80">
            <a href="https://depoii.com" className="hover:underline">Home</a>
            <span className="mx-2">•</span>
            <span>Support: hello@depoii.com</span>
          </div>
        </div>
      </div>

      {/* Right Column: Apollo-Style Commercial Showcase */}
      <ShowcaseRightPane />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <DepoiiMark className="size-10 text-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
