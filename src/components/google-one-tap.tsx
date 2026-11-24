"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: "signin" | "signup" | "use";
            prompt_parent_id?: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (notification?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            getNotDisplayedReason: () => string;
            getSkippedReason: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export function GoogleOneTap({
  clientId,
  next = "/",
  onSuccess,
  onError,
}: {
  clientId?: string | null;
  next?: string;
  onSuccess?: (nextUrl: string) => void;
  onError?: (err: string) => void;
}) {
  const router = useRouter();
  const initializedRef = useRef(false);

  useEffect(() => {
    const activeClientId = clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!activeClientId) return;

    // Load Google Identity Services script if not already present
    const scriptId = "google-jssdk-one-tap";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const setupOneTap = () => {
      if (initializedRef.current || !window.google?.accounts?.id) return;
      initializedRef.current = true;

      try {
        window.google.accounts.id.initialize({
          client_id: activeClientId,
          callback: async ({ credential }) => {
            if (!credential) return;
            try {
              const res = await fetch("/api/auth/google/one-tap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential, next }),
              });
              const data = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                next?: string;
                error?: string;
              };

              if (!res.ok || !data.ok) {
                const errorMsg = data.error || "Google One Tap sign-in failed.";
                onError?.(errorMsg);
                return;
              }

              const target = data.next || next || "/";
              if (onSuccess) {
                onSuccess(target);
              } else {
                router.replace(target);
                router.refresh();
              }
            } catch (err) {
              console.error("[google-one-tap] submission error:", err);
              onError?.("Network error completing Google sign-in.");
            }
          },
          auto_select: false,
          cancel_on_tap_outside: false,
          context: "signin",
          use_fedcm_for_prompt: true,
        });

        window.google.accounts.id.prompt();
      } catch (err) {
        console.warn("[google-one-tap] initialization warning:", err);
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = setupOneTap;
      document.head.appendChild(script);
    } else if (window.google?.accounts?.id) {
      setupOneTap();
    } else {
      script.addEventListener("load", setupOneTap);
    }

    return () => {
      try {
        window.google?.accounts?.id?.cancel();
      } catch {}
    };
  }, [clientId, next, router, onSuccess, onError]);

  return null;
}
