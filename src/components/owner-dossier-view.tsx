"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Landmark,
  Layers,
  Lock,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { ParcelDetailDrawer } from "@/components/parcel-detail-drawer";
import { num, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface OwnerDetailData {
  id: string;
  canonicalName: string;
  normalizedName: string;
  entityType: string;
  headquartersAddress: string;
  headquartersCity: string;
  headquartersState: string;
  headquartersZip: string;
  websiteUrl: string;
  linkedinUrl: string;
  logoUrl: string;
  managementFirm: string;
  totalProperties: number;
  totalBuildingSqft: number;
  totalBuildingSqftFormatted: string;
  totalAssessedValuation: number;
  totalAssessedValuationFormatted: string;
  agingRoofsCount: number;
  hailExposedCount: number;
  contacts: Array<{
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    title: string;
    roleCategory: string;
    email?: string;
    emailStatus?: string;
    phone?: string;
    phoneType?: string;
    linkedinUrl?: string;
    isPrimaryDecisionMaker: boolean;
  }>;
  parcels: Array<{
    id: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    buildingSqft: number;
    yearBuilt: number;
    roofAgeYears: number;
    lastReroofDate: string | null;
    lastReroofPermitNo: string | null;
    totalValuation: number;
    lat: number;
    lng: number;
  }>;
}

export interface OwnerDossierViewProps {
  ownerId: string;
  onBack?: () => void;
  onExpand?: () => void;
  backHref?: string;
  backLabel?: string;
  isDrawer?: boolean;
}

type TabId = "portfolio" | "contacts" | "strategy";

export function OwnerDossierView({
  ownerId,
  onBack,
  onExpand,
  backHref = "/owners",
  backLabel = "Back to owners table",
  isDrawer = false,
}: OwnerDossierViewProps) {
  const [data, setData] = useState<OwnerDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("portfolio");
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [revealedContacts, setRevealedContacts] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Left pane accordions
  const [profileOpen, setProfileOpen] = useState(true);
  const [capexOpen, setCapexOpen] = useState(true);
  const [geoOpen, setGeoOpen] = useState(true);

  // Tab 1 parcel filter: "all" vs "aging"
  const [parcelFilter, setParcelFilter] = useState<"all" | "aging">("all");

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/owners/${encodeURIComponent(ownerId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Portfolio profile not found");
        return res.json();
      })
      .then((res) => {
        if (res.owner) {
          setData(res.owner);
        } else {
          setError("Failed to load owner portfolio record");
        }
      })
      .catch((err) => {
        console.error("Failed to load owner profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load owner profile");
      })
      .finally(() => setLoading(false));
  }, [ownerId]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRevealContact = (id: string) => {
    setRevealedContacts((prev) => new Set([...prev, id]));
  };

  const headquartersLine = useMemo(() => {
    if (!data) return "";
    const parts = [
      data.headquartersAddress,
      data.headquartersCity,
      data.headquartersState,
      data.headquartersZip,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "North Texas Corporate Registry";
  }, [data]);

  const googleSearchUrl = useMemo(() => {
    if (!data?.canonicalName) return null;
    const q = `${data.canonicalName} commercial real estate ${data.headquartersCity || "Dallas"}`;
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }, [data?.canonicalName, data?.headquartersCity]);

  const websiteUrl = useMemo(() => {
    if (!data?.websiteUrl) return null;
    const url = data.websiteUrl.trim();
    return url.startsWith("http") ? url : `https://${url}`;
  }, [data?.websiteUrl]);

  const filteredParcels = useMemo(() => {
    if (!data?.parcels) return [];
    if (parcelFilter === "aging") {
      return data.parcels.filter((p) => (p.roofAgeYears || 0) >= 20);
    }
    return data.parcels;
  }, [data?.parcels, parcelFilter]);

  const citiesRepresented = useMemo(() => {
    if (!data?.parcels) return [];
    const counts = new Map<string, number>();
    for (const p of data.parcels) {
      const c = p.city || "Dallas";
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [data?.parcels]);

  const tabs = useMemo(() => {
    return [
      {
        id: "portfolio" as TabId,
        label: "Portfolio Assets",
        count: data?.parcels?.length,
        icon: Building2,
      },
      {
        id: "contacts" as TabId,
        label: "Decision Makers",
        count: data?.contacts?.length,
        icon: Users,
      },
      {
        id: "strategy" as TabId,
        label: "CapEx & Strategy",
        icon: Sparkles,
      },
    ];
  }, [data?.parcels?.length, data?.contacts?.length]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-16 text-center text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <span className="size-2 rounded-full bg-[#B4E4D6] animate-ping" />
          <span className="font-medium text-xs">Loading commercial owner portfolio...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-16 text-center text-xs text-muted-foreground space-y-3">
        <p className="text-rose-600 font-medium">{error || "Owner profile not found"}</p>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground hover:bg-muted cursor-pointer"
          >
            ← {backLabel}
          </button>
        ) : (
          <Link
            href={backHref}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground hover:bg-muted"
          >
            ← {backLabel}
          </Link>
        )}
      </div>
    );
  }

  const estReroofPipeline = Math.round((data.totalBuildingSqft * 9.5) / 1000) * 1000;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* ========================================================================= */}
      {/* PANE 1: FIXED TOP PANE (Header & Executive Decision Strip - NEVER SCROLLS) */}
      {/* ========================================================================= */}
      <header className="shrink-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur-md px-5 py-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Landmark className="size-5 text-neutral-800 dark:text-neutral-200" />
                {data.canonicalName}
              </h1>

              {/* Classification Tag */}
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/50 uppercase tracking-wider">
                {(data.entityType || "commercial_operator").replace(/_/g, " ")}
              </span>

              {/* Social Proof & External Intelligence Action Icons */}
              <div className="flex items-center gap-1.5">
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Visit official site: ${data.websiteUrl}`}
                    className="size-7 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 dark:border-border/70 dark:bg-[#1c1c18] dark:hover:bg-[#232320] dark:text-muted-foreground dark:hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Globe className="size-3.5" />
                  </a>
                )}

                {data.linkedinUrl && (
                  <a
                    href={data.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View corporate LinkedIn profile"
                    className="size-7 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-sky-600 dark:border-border/70 dark:bg-[#1c1c18] dark:hover:bg-[#232320] dark:text-muted-foreground dark:hover:text-sky-400 dark:hover:border-sky-500/40 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z" />
                    </svg>
                  </a>
                )}

                {googleSearchUrl && (
                  <a
                    href={googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Google Intelligence Search for ${data.canonicalName}`}
                    className="size-7 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 dark:border-border/70 dark:bg-[#1c1c18] dark:hover:bg-[#232320] dark:text-muted-foreground dark:hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Search className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3 text-muted-foreground" />
              <span>{headquartersLine}</span>
              {data.managementFirm && (
                <span className="text-muted-foreground/80">· Managed by {data.managementFirm}</span>
              )}
            </p>
          </div>

          {/* Primary Top Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                title="Expand to Full In-Page View"
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 dark:border-border/70 dark:bg-[#1c1c18] dark:text-foreground dark:hover:bg-[#232320] px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer select-none"
              >
                <Maximize2 className="size-3.5" />
                <span className="hidden sm:inline">Full In-Page View</span>
                <span className="sm:hidden">Full</span>
              </button>
            )}

            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 dark:border-border/70 dark:bg-[#1c1c18] dark:text-muted-foreground dark:hover:bg-[#232320] dark:hover:text-foreground transition-colors cursor-pointer select-none"
              >
                {isDrawer ? <X className="size-3.5" /> : null}
                <span>{isDrawer ? (backLabel || "Close") : `← ${backLabel}`}</span>
              </button>
            ) : (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 dark:border-border/70 dark:bg-[#1c1c18] dark:text-muted-foreground dark:hover:bg-[#232320] dark:hover:text-foreground transition-colors"
              >
                ← {backLabel}
              </Link>
            )}
          </div>
        </div>

        {/* 4-Pillar Executive Summary Strip (Always Visible at Top - Parity with Property UI) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2.5 border-t border-border/40 text-xs">
          {/* 1. Portfolio Assets */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">Portfolio Scale</span>
            <div className="text-foreground font-semibold tabular-nums">
              {data.totalProperties} Commercial Buildings
            </div>
            <span className="block text-[11px] font-normal text-muted-foreground truncate">
              {data.headquartersCity || "North Texas"} Commercial Asset Footprint
            </span>
          </div>

          {/* 2. Portfolio Square Feet */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">Building Area</span>
            <div className="text-foreground font-semibold tabular-nums">
              {data.totalBuildingSqftFormatted}
            </div>
            <span className="block text-[11px] font-normal text-muted-foreground truncate">
              {data.totalProperties > 0
                ? `Avg ${num(Math.round(data.totalBuildingSqft / data.totalProperties))} sq ft / building`
                : "Certified CAD Records"}
            </span>
          </div>

          {/* 3. Assessed Valuation */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">Appraisal Valuation</span>
            <div className="text-foreground font-semibold tabular-nums">
              {data.totalAssessedValuationFormatted}
            </div>
            <span className="block text-[11px] font-normal text-muted-foreground truncate">
              County Appraisal District Certified
            </span>
          </div>

          {/* 4. Roof Capex Cycle */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">Roof Capex Window</span>
            <div className="text-foreground font-semibold tabular-nums">
              {data.agingRoofsCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {data.agingRoofsCount} Aging Roofs (&gt;20 yrs)
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">Maintained Lifecycle</span>
              )}
            </div>
            <span className="block text-[11px] font-normal text-muted-foreground truncate">
              {data.agingRoofsCount > 0 ? "Immediate replacement targets" : "Monitored asset schedule"}
            </span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* SPLIT WORKBENCH CONTAINER (PANES 2 & 3: FIXED SEPARATE SCROLLS)          */}
      {/* ========================================================================= */}
      <div className={cn("flex-1 min-h-0 flex flex-col overflow-hidden", isDrawer ? "xl:flex-row" : "lg:flex-row")}>
        {/* ===================================================================== */}
        {/* PANE 2: LEFT PANE (Corporate & Asset Profile - INDEPENDENT SCROLLBAR) */}
        {/* ===================================================================== */}
        <aside
          className={cn(
            "shrink-0 border-b border-border/70 overflow-y-auto h-full p-5 space-y-4 bg-neutral-50/70 dark:bg-[#131310] [scrollbar-width:thin] [scrollbar-color:#292925_transparent]",
            isDrawer
              ? "w-full xl:w-[380px] 2xl:w-[420px] xl:border-b-0 xl:border-r"
              : "w-full lg:w-[460px] xl:w-[480px] lg:border-b-0 lg:border-r"
          )}
        >
          {/* 1. Corporate Profile Card */}
          <div className="rounded-xl border border-border bg-white dark:bg-[#1c1c18] overflow-hidden shadow-xs">
            <div
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none transition-colors hover:bg-neutral-50 dark:hover:bg-[#20201c]"
            >
              <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Landmark className="size-4 text-neutral-600 dark:text-neutral-400" />
                <span>Corporate Intelligence</span>
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen(!profileOpen);
                }}
                className="size-7 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-[#232320] dark:hover:bg-[#2c2c28] border border-border flex items-center justify-center text-foreground transition-colors cursor-pointer"
              >
                {profileOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            {profileOpen && (
              <div className="px-5 pb-5 pt-3 border-t border-border space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
                  <div className="rounded-lg border border-border bg-neutral-50 dark:bg-[#171714] p-3 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground block font-sans">Entity Class</span>
                    <span className="text-foreground font-semibold capitalize font-sans">
                      {(data.entityType || "commercial_operator").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-neutral-50 dark:bg-[#171714] p-3 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground block font-sans">Headquarters</span>
                    <span className="text-foreground font-semibold font-sans">
                      {data.headquartersCity}, {data.headquartersState}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Canonical Name</span>
                    <span className="font-medium text-foreground text-right">{data.canonicalName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Operating Management</span>
                    <span className="font-medium text-foreground text-right">
                      {data.managementFirm || "Internal Portfolio Management"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Executive Contacts</span>
                    <span className="font-medium text-foreground text-right font-mono">
                      {data.contacts.length} verified
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Roofing CapEx Opportunity Profile */}
          <div className="rounded-xl border border-border bg-white dark:bg-[#1c1c18] overflow-hidden shadow-xs">
            <div
              onClick={() => setCapexOpen(!capexOpen)}
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none transition-colors hover:bg-neutral-50 dark:hover:bg-[#20201c]"
            >
              <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
                <span>Roofing CapEx Portfolio</span>
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCapexOpen(!capexOpen);
                }}
                className="size-7 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-[#232320] dark:hover:bg-[#2c2c28] border border-border flex items-center justify-center text-foreground transition-colors cursor-pointer"
              >
                {capexOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            {capexOpen && (
              <div className="px-5 pb-5 pt-3 border-t border-border space-y-3 text-xs">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-3 space-y-1">
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-semibold text-xs">
                    <span>Targetable Roof Area</span>
                    <span>{data.totalBuildingSqftFormatted}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Estimated commercial reroof capital cycle value at \$9.50/sq ft:
                  </p>
                  <p className="text-base font-bold text-foreground font-mono tabular-nums">
                    {usd(estReroofPipeline)}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Aging Roofs (&gt;20 yrs)</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                      {data.agingRoofsCount} buildings
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Recent Permits Filed</span>
                    <span className="font-medium text-foreground font-mono">
                      {data.parcels.filter((p) => p.lastReroofDate).length} assets
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Hail Zone Overlap</span>
                    <span className="font-medium text-foreground font-mono">
                      {data.hailExposedCount} high-risk assets
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Geographic Asset Footprint */}
          <div className="rounded-xl border border-border bg-white dark:bg-[#1c1c18] overflow-hidden shadow-xs">
            <div
              onClick={() => setGeoOpen(!geoOpen)}
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none transition-colors hover:bg-neutral-50 dark:hover:bg-[#20201c]"
            >
              <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Geographic Footprint</span>
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGeoOpen(!geoOpen);
                }}
                className="size-7 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-[#232320] dark:hover:bg-[#2c2c28] border border-border flex items-center justify-center text-foreground transition-colors cursor-pointer"
              >
                {geoOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            {geoOpen && (
              <div className="px-5 pb-5 pt-3 border-t border-border space-y-2 text-xs">
                <p className="text-muted-foreground text-[11px]">
                  Municipal distribution across North Texas commercial sub-markets:
                </p>
                <div className="space-y-1.5 pt-1">
                  {citiesRepresented.map(([cityName, count]) => (
                    <div key={cityName} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                      <span className="font-medium text-foreground">{cityName}, TX</span>
                      <span className="font-mono text-muted-foreground text-[11px] tabular-nums">
                        {count} {count === 1 ? "building" : "buildings"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ===================================================================== */}
        {/* PANE 3: RIGHT PANE (Dynamic Action Workbench - INDEPENDENT SCROLLBAR) */}
        {/* ===================================================================== */}
        <main className="flex-1 min-w-0 overflow-y-auto h-full p-5 space-y-4 bg-neutral-100/60 dark:bg-[#171714] [scrollbar-width:thin] [scrollbar-color:#292925_transparent]">
          {/* Apollo-Style Segmented View Switcher (Sticky at top of Right Pane) */}
          <div className="sticky top-0 z-10 bg-neutral-100/90 dark:bg-[#171714]/90 backdrop-blur-md pb-2 pt-0">
            <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border bg-neutral-200/60 dark:bg-[#131310] overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer select-none whitespace-nowrap",
                      active
                        ? "bg-white dark:bg-[#1c1c18] text-foreground font-semibold shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-neutral-200/70 dark:hover:bg-[#20201c]"
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                    {tab.count != null && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[11px] tabular-nums font-mono",
                          active
                            ? "bg-neutral-100 dark:bg-[#232320] text-foreground"
                            : "bg-neutral-200 dark:bg-[#232320]/60 text-muted-foreground"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: PORTFOLIO BUILDINGS TABLE */}
          {activeTab === "portfolio" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-white dark:bg-[#1c1c18] overflow-hidden shadow-xs">
                {/* Table Header Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      Portfolio Buildings ({data.parcels.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setParcelFilter("all")}
                      className={cn(
                        "rounded px-2.5 py-1 text-xs font-medium transition-colors border cursor-pointer",
                        parcelFilter === "all"
                          ? "bg-neutral-900 text-white dark:bg-white/10 dark:text-white border-neutral-900 dark:border-white/20 font-semibold"
                          : "bg-neutral-100 dark:bg-[#181922] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                      )}
                    >
                      All ({data.parcels.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setParcelFilter("aging")}
                      className={cn(
                        "rounded px-2.5 py-1 text-xs font-medium transition-colors border cursor-pointer",
                        parcelFilter === "aging"
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold"
                          : "bg-neutral-100 dark:bg-[#181922] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                      )}
                    >
                      Overdue Roofs &gt;20 yrs ({data.parcels.filter((p) => (p.roofAgeYears || 0) >= 20).length})
                    </button>
                  </div>
                </div>

                {/* Table Area */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="apollo-th h-[39px] border-b border-border bg-neutral-50 dark:bg-[#171714] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-2.5 whitespace-nowrap min-w-[240px]">Property Address</th>
                        <th className="px-4 py-2.5 whitespace-nowrap min-w-[120px]">City</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap min-w-[110px]">Roof Area</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap min-w-[90px]">Built</th>
                        <th className="px-4 py-2.5 text-center whitespace-nowrap min-w-[120px]">Roof Age</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap min-w-[120px]">Valuation</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap min-w-[100px] pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 dark:divide-neutral-800/50">
                      {filteredParcels.map((parcel) => {
                        const isAging = (parcel.roofAgeYears || 0) >= 20;
                        const isMid = (parcel.roofAgeYears || 0) >= 12 && (parcel.roofAgeYears || 0) < 20;

                        return (
                          <tr
                            key={parcel.id}
                            className="apollo-row h-12 hover:bg-neutral-50 dark:hover:bg-[#20201c] transition-colors"
                          >
                            <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap">
                              <span className="font-semibold">{parcel.address || "Commercial Asset"}</span>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                              {parcel.city || "Dallas"}, TX
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums whitespace-nowrap text-foreground">
                              {parcel.buildingSqft ? `${num(parcel.buildingSqft)} sq ft` : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums whitespace-nowrap text-muted-foreground">
                              {parcel.yearBuilt || "—"}
                            </td>
                            <td className="px-4 py-2 text-center whitespace-nowrap">
                              {isAging ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                  <Clock className="size-2.5" />
                                  <span>{parcel.roofAgeYears} yrs (Overdue)</span>
                                </span>
                              ) : isMid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                  <span>{parcel.roofAgeYears} yrs</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                  <span>{parcel.roofAgeYears ? `${parcel.roofAgeYears} yrs` : "Recent"}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums whitespace-nowrap text-foreground">
                              {parcel.totalValuation ? usd(parcel.totalValuation) : "—"}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap pr-4">
                              <button
                                type="button"
                                onClick={() => setSelectedParcelId(parcel.id)}
                                className="inline-flex h-6 items-center rounded border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DECISION MAKERS & EXECUTIVE CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-white dark:bg-[#1c1c18] p-5 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Corporate Decision Makers ({data.contacts.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Verified asset managers, VP of facilities, and portfolio executives with capital expenditure signing authority.
                    </p>
                  </div>
                </div>

                {data.contacts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No verified contacts listed for this corporate entity yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-4">
                    {data.contacts.map((contact) => {
                      const isRevealed = revealedContacts.has(contact.id);
                      const initial = contact.fullName ? contact.fullName.charAt(0) : "D";

                      return (
                        <div
                          key={contact.id}
                          className="rounded-lg border border-border bg-neutral-50/60 dark:bg-[#171714] p-4 flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="size-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold flex items-center justify-center shrink-0 border border-neutral-300 dark:border-neutral-700">
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold text-foreground">
                                  {contact.fullName}
                                </h4>
                                {contact.isPrimaryDecisionMaker && (
                                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-[#B4E4D6] px-1.5 py-0.2 text-[10px] font-semibold">
                                    Primary Decision Maker
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{contact.title}</p>
                              <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                                {(contact.roleCategory || "Executive").replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>

                          {/* Contact Details / Reveal Area */}
                          <div className="pt-2 border-t border-border/60 text-xs space-y-2">
                            {isRevealed ? (
                              <div className="space-y-1.5 font-mono text-[11px]">
                                {contact.phone && (
                                  <div className="flex items-center justify-between bg-white dark:bg-[#1c1c18] border border-border p-2 rounded">
                                    <div className="flex items-center gap-2 text-foreground">
                                      <Phone className="size-3 text-emerald-600 dark:text-emerald-400" />
                                      <span>{contact.phone}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(contact.phone!)}
                                      className="text-neutral-400 hover:text-foreground cursor-pointer"
                                      title="Copy phone"
                                    >
                                      {copiedText === contact.phone ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                                    </button>
                                  </div>
                                )}
                                {contact.email && (
                                  <div className="flex items-center justify-between bg-white dark:bg-[#1c1c18] border border-border p-2 rounded">
                                    <div className="flex items-center gap-2 text-foreground truncate pr-2">
                                      <Mail className="size-3 text-sky-600 dark:text-sky-400 shrink-0" />
                                      <span className="truncate">{contact.email}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(contact.email!)}
                                      className="text-neutral-400 hover:text-foreground cursor-pointer shrink-0"
                                      title="Copy email"
                                    >
                                      {copiedText === contact.email ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between bg-white dark:bg-[#1c1c18] border border-dashed border-border p-2 rounded">
                                <div className="space-y-0.5">
                                  <p className="text-[11px] text-muted-foreground">Direct phone & corporate email</p>
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    Verified Deliverable Contact
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRevealContact(contact.id)}
                                  className="inline-flex items-center gap-1.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 px-2.5 py-1 text-[11px] font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                                >
                                  <Lock className="size-3" />
                                  <span>Reveal Contact</span>
                                </button>
                              </div>
                            )}

                            {contact.linkedinUrl && (
                              <div className="pt-0.5">
                                <a
                                  href={contact.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline"
                                >
                                  <span>LinkedIn Executive Profile</span>
                                  <ExternalLink className="size-2.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CAPEX & OUTBOUND STRATEGY PLAYBOOK */}
          {activeTab === "strategy" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-white dark:bg-[#1c1c18] p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Enterprise Master Services Agreement (MSA) Playbook
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    How commercial roofing contractors win multi-building maintenance, inspection, and reroofing contracts with this owner.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="rounded-lg border border-border bg-neutral-50 dark:bg-[#171714] p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      The Asset Management Hook
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Institutional owners and REITs do not buy one roof at a time from hail chasers. They manage balance sheet risk. Lead with a complimentary <strong>Multi-Asset Roof Condition Survey</strong> across their {data.totalProperties} properties to identify upcoming CapEx liabilities before tenant renewal cycles.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-neutral-50 dark:bg-[#171714] p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Immediate Replacement Leverage
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This entity currently carries <strong>{data.agingRoofsCount} commercial properties with roofs over 20 years old</strong>. Offer a phased 3-year capital replacement plan rather than demanding an immediate full-portfolio commitment.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/80 bg-neutral-50/50 dark:bg-[#171714]/50 p-4 space-y-2 text-xs">
                  <span className="font-semibold text-foreground">Recommended Pitch Subject:</span>
                  <div className="font-mono bg-white dark:bg-[#1c1c18] p-2.5 rounded border border-border text-foreground select-all">
                    CapEx Roof Audit for {data.canonicalName} North Texas Portfolio ({data.totalProperties} properties)
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Embedded Parcel Detail Inspection Drawer */}
      {selectedParcelId && (
        <ParcelDetailDrawer
          parcelId={selectedParcelId}
          onClose={() => setSelectedParcelId(null)}
          titlePrefix="Portfolio Asset Inspection"
        />
      )}
    </div>
  );
}
