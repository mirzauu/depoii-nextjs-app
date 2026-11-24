"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DepoiiMark } from "@/components/depoii-logo";

const ROLE_OPTIONS = [
  "CEO / Owner",
  "Estimator",
  "Sales / Business Dev",
  "Project Manager",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ email: string; name: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [orgName, setOrgName] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedRole, setSelectedRole] = useState("CEO / Owner");
  const [customRole, setCustomRole] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/onboarding")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.email) {
          setProfile(data);
          // Suggest org name if user has a recognizable name
          if (data.name) {
            setOrgName(`${data.name}'s Roofing`);
          }
        }
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setLoadingProfile(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const finalRole = selectedRole === "Other" ? customRole.trim() : selectedRole;

    if (!orgName.trim()) {
      setError("Please enter your company or organization name.");
      return;
    }

    if (!finalRole) {
      setError("Please specify your role or job title.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: orgName.trim(),
          website: website.trim(),
          roleTitle: finalRole,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };

      if (!res.ok) {
        setError(data.error || "Could not complete setup. Please try again.");
        return;
      }

      router.replace(data.next || "/");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <DepoiiMark className="size-10 animate-pulse text-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <DepoiiMark className="size-10 text-foreground" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Set up your workspace</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {profile?.name
              ? `Welcome to Depoii, ${profile.name}! Tell us about your company to get started.`
              : "Welcome to Depoii! Tell us about your company to get started."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          {/* Organization Name */}
          <div className="space-y-1.5">
            <Label htmlFor="orgName">
              Company / Organization Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="orgName"
              name="orgName"
              type="text"
              required
              autoFocus
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Apex Commercial Roofing"
              className="h-10"
            />
          </div>

          {/* Website (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="website">Website</Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Input
              id="website"
              name="website"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. https://apexroofing.com"
              className="h-10"
            />
          </div>

          {/* Role / Title */}
          <div className="space-y-2">
            <Label>
              Your Role / Title <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedRole === r
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {selectedRole === "Other" && (
              <div className="pt-1.5">
                <Input
                  type="text"
                  required
                  placeholder="Enter your job title (e.g. Operations Director)"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting} className="h-10 w-full font-medium">
            {submitting ? "Setting up workspace…" : "Complete Setup & Enter Dashboard →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
