"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DepoiiMark } from "@/components/depoii-logo";

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <DepoiiMark className="size-10 text-foreground" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Depoii</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {step === "email" ? "Sign in to your account" : `Enter the code sent to ${email}`}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {step === "email" && (
            <>
              <a
                href={`/api/auth/google?next=${encodeURIComponent(nextDestination)}`}
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "h-10 w-full flex items-center justify-center gap-2.5 border-border/80 hover:bg-muted font-medium text-sm transition-colors cursor-pointer",
                })}
              >
                <GoogleIcon className="size-4 shrink-0" />
                <span>Continue with Google</span>
              </a>

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
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-10 tracking-[0.3em]"
                  placeholder="000000"
                  autoFocus
                />
              </div>
            )}
            {shownError ? <p className="text-sm text-destructive">{shownError}</p> : null}
            <Button type="submit" disabled={pending} className="h-10 w-full">
              {pending
                ? "Signing in…"
                : step === "email"
                  ? email.trim().toLowerCase() === "admin@depoii.local"
                    ? "Sign in"
                    : "Send code"
                  : "Sign in"}
            </Button>
            {step === "otp" ? (
              <div className="flex items-center justify-between gap-3 text-sm">
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
