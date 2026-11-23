"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search,
  X,
  Phone,
  Building2,
  ShieldCheck,
  Filter,
  ChevronDown,
  ChevronRight,
  MapPin,
  Briefcase,
  Layers,
  Clock,
  Landmark,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useDebounced } from "@/components/engine-layout";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OwnerDossierView } from "@/components/owner-dossier-view";
import { num, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

const LIMIT = 50;

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Entities" },
  { value: "reit", label: "REITs" },
  { value: "institutional_pe", label: "Institutional / PE" },
  { value: "property_manager", label: "Property Management" },
  { value: "private_operator", label: "Private Operators" },
];

export default function OwnersBrowsePage() {
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [minProperties, setMinProperties] = useState("2");
  const [minSqft, setMinSqft] = useState("0");
  const [hasAgingRoofs, setHasAgingRoofs] = useState(false);
  const [hasContact, setHasContact] = useState(false);
  const [sort, setSort] = useState("properties_desc");
  const [offset, setOffset] = useState(0);
  const [hideFilters, setHideFilters] = useState(false);

  // Accordion filter toggles matching Property Browse & Hot Sheet
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    entity: true,
    portfolio: true,
    sqft: true,
    roofs: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullDetailId, setFullDetailId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Data fetching state
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    total_owners: number;
    total_portfolio_sqft: number;
    total_portfolio_valuation_usd: number;
    owners: Array<{
      id: string;
      canonicalName?: string;
      canonical_name?: string;
      normalizedName?: string;
      normalized_name?: string;
      entityType?: string;
      entity_type?: string;
      headquartersCity?: string;
      headquarters_city?: string;
      headquartersState?: string;
      headquarters_state?: string;
      managementFirm?: string;
      management_firm?: string;
      totalProperties?: number;
      total_properties?: number;
      totalBuildingSqft?: number;
      total_building_sqft?: number;
      totalBuildingSqftFormatted?: string;
      total_building_sqft_formatted?: string;
      totalAssessedValuation?: number;
      total_assessed_valuation?: number;
      totalAssessedValuationFormatted?: string;
      total_assessed_valuation_formatted?: string;
      agingRoofsCount?: number;
      aging_roofs_count?: number;
      hailExposedCount?: number;
      hail_exposed_count?: number;
      contacts_count?: number;
      has_contacts?: boolean;
      hasContacts?: boolean;
      contacts?: any[];
    }>;
  } | null>(null);

  const qSearch = useDebounced(search, 300);
  const qSqft = useDebounced(minSqft, 300);
  const qMinProps = useDebounced(minProperties, 300);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String(offset),
      sort_by: sort,
    });
    if (qSearch) params.set("search", qSearch);
    if (entityType && entityType !== "all") params.set("entity_type", entityType);
    if (qMinProps && qMinProps !== "0") params.set("min_properties", qMinProps);
    if (qSqft && qSqft !== "0") params.set("min_sqft", qSqft);
    if (hasAgingRoofs) params.set("has_aging_roofs", "true");
    if (hasContact) params.set("has_contact", "true");

    fetch(`/api/owners?${params.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res);
      })
      .catch((err) => console.error("Failed to query owners directory:", err))
      .finally(() => setLoading(false));
  }, [qSearch, entityType, qMinProps, qSqft, hasAgingRoofs, hasContact, sort, offset]);

  const rows = data?.owners ?? [];
  const total = data?.total_owners ?? 0;

  const allSelected = rows.length > 0 && rows.every((r) => selectedRowIds.has(r.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedRowIds(new Set());
    else setSelectedRowIds(new Set(rows.map((r) => r.id)));
  };
  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearch("");
    setEntityType("all");
    setMinProperties("2");
    setMinSqft("0");
    setHasAgingRoofs(false);
    setHasContact(false);
    setSort("properties_desc");
    setOffset(0);
  };

  const activeFiltersCount = [
    Boolean(search),
    entityType !== "all",
    Boolean(minProperties && minProperties !== "2"),
    Boolean(minSqft && minSqft !== "0"),
    hasAgingRoofs,
    hasContact,
    sort !== "properties_desc",
  ].filter(Boolean).length;

  const pageIndex = Math.floor(offset / LIMIT);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(total, offset + LIMIT);
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  if (fullDetailId) {
    return (
      <div className="flex h-[calc(100dvh-53px)] max-h-[calc(100dvh-53px)] flex-col bg-background text-foreground antialiased font-sans overflow-hidden">
        <OwnerDossierView
          ownerId={fullDetailId}
          onBack={() => setFullDetailId(null)}
          backLabel="Back to owners table"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-53px)] max-h-[calc(100dvh-53px)] flex-col bg-background text-foreground antialiased font-sans overflow-hidden">
      {/* Top Header Row - Fixed (Parity with Property UI) */}
      <div className="shrink-0 border-b border-border bg-background px-5 py-3.5 z-20 text-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2">
                <Landmark className="size-5 text-neutral-800 dark:text-neutral-200" />
                Owners & REITs Directory
              </h1>
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700/50">
                North Texas Portfolios
              </span>
            </div>
            <p className="text-xs font-medium text-rose-600 dark:text-[#DE7272]">
              Institutional real estate investment trusts, asset managers, and commercial portfolios ({num(total)} mapped owners). Includes verified portfolio scale, capex cycles, and executive contacts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {num(total)} commercial portfolios in directory
            </span>
          </div>
        </div>
      </div>

      {/* Action & Filter Sub-Bar - Fixed (Parity with Property UI) */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-5 py-2.5 text-xs z-20 shrink-0 text-foreground">
        {/* Left Side: Toggle Sidebar & Search */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHideFilters((prev) => !prev)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 px-2.5 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none"
          >
            <Filter className="size-3 text-muted-foreground dark:text-neutral-400" />
            <span>{hideFilters ? "Show Filters" : "Hide Filters"}</span>
          </button>

          {/* Search Input */}
          <div className="relative min-w-[260px] sm:min-w-[340px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground dark:text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              placeholder="Search owner, REIT, or parent management firm"
              className="h-8 w-full rounded-md border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#16171d] pl-8 pr-3 text-xs text-foreground dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition-colors focus:border-neutral-400 dark:focus:border-neutral-700 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setOffset(0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Sorting & Reset */}
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="h-8 rounded-md border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 px-2.5 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none"
            >
              Reset filters ({activeFiltersCount})
            </button>
          )}

          {/* Sorting Dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setOffset(0);
              }}
              className="h-8 appearance-none rounded-md border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 pl-2.5 pr-7 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white outline-none cursor-pointer"
            >
              <option value="properties_desc">Most properties</option>
              <option value="properties_asc">Fewest properties</option>
              <option value="sqft_desc">Largest portfolio area</option>
              <option value="sqft_asc">Smallest portfolio area</option>
              <option value="aging_roofs_desc">Most overdue roofs (&gt;20 yrs)</option>
              <option value="val_desc">Highest valuation</option>
              <option value="name_asc">Owner name A–Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground dark:text-neutral-500" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Filter Sidebar - Exact Hot Sheet / Property Browse Layout & Style */}
        {!hideFilters && (
          <aside className="w-80 shrink-0 border-r border-border bg-background text-muted-foreground flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
              {/* Segmented Count Tabs: All, REITs, Institutional, Private */}
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-muted/60 p-0.5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setEntityType("all");
                    setOffset(0);
                  }}
                  className={cn(
                    "flex flex-col items-center rounded-md py-1.5 transition-colors border",
                    entityType === "all"
                      ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white border-neutral-300 dark:border-white/20 font-semibold shadow-sm"
                      : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider">All</span>
                  <span className="text-xs font-semibold">{num(total)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntityType("reit");
                    setOffset(0);
                  }}
                  className={cn(
                    "flex flex-col items-center rounded-md py-1.5 transition-colors border",
                    entityType === "reit"
                      ? "border-[#B4E4D6]/50 bg-[#B4E4D6]/20 text-emerald-800 dark:text-[#B4E4D6] font-semibold shadow-sm"
                      : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider">REIT</span>
                  <span className="text-xs font-semibold">Trust</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntityType("institutional_pe");
                    setOffset(0);
                  }}
                  className={cn(
                    "flex flex-col items-center rounded-md py-1.5 transition-colors border",
                    entityType === "institutional_pe"
                      ? "border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-300 font-semibold shadow-sm"
                      : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider">Inst</span>
                  <span className="text-xs font-semibold">PE</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntityType("private_operator");
                    setOffset(0);
                  }}
                  className={cn(
                    "flex flex-col items-center rounded-md py-1.5 transition-colors border",
                    entityType === "private_operator"
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-[#FFCA88] font-semibold shadow-sm"
                      : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider">Priv</span>
                  <span className="text-xs font-semibold">Oper</span>
                </button>
              </div>

              {/* Accordion Filter Cards */}
              <div className="space-y-2.5">
                {/* 1. Entity Classification */}
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSection("entity")}
                    className="flex w-full items-center justify-between text-neutral-800 dark:text-neutral-200 font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-3.5 text-muted-foreground dark:text-neutral-400" />
                      <span>Classification</span>
                    </div>
                    {openSections.entity ? (
                      <ChevronDown className="size-3 text-muted-foreground dark:text-neutral-500" />
                    ) : (
                      <ChevronRight className="size-3 text-muted-foreground dark:text-neutral-500" />
                    )}
                  </button>

                  {openSections.entity && (
                    <div className="mt-2.5 space-y-2">
                      <div className="relative">
                        <select
                          value={entityType}
                          onChange={(e) => {
                            setEntityType(e.target.value);
                            setOffset(0);
                          }}
                          className="h-8 w-full appearance-none rounded-md border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0f1015] px-2.5 pr-7 text-xs text-foreground dark:text-neutral-200 outline-none focus:border-neutral-400 dark:focus:border-neutral-700 cursor-pointer"
                        >
                          {ENTITY_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground dark:text-neutral-500" />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Portfolio Scale (Min Properties) */}
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSection("portfolio")}
                    className="flex w-full items-center justify-between text-neutral-800 dark:text-neutral-200 font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="size-3.5 text-muted-foreground dark:text-neutral-400" />
                      <span>Portfolio Scale</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {minProperties && minProperties !== "2" && (
                        <span className="rounded bg-neutral-200 dark:bg-white/10 text-neutral-800 dark:text-white px-1 text-[10px]">
                          {minProperties}+
                        </span>
                      )}
                      {openSections.portfolio ? (
                        <ChevronDown className="size-3 text-muted-foreground dark:text-neutral-500" />
                      ) : (
                        <ChevronRight className="size-3 text-muted-foreground dark:text-neutral-500" />
                      )}
                    </div>
                  </button>

                  {openSections.portfolio && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {["1", "2", "5", "10", "25", "50"].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => {
                              setMinProperties(count);
                              setOffset(0);
                            }}
                            className={cn(
                              "rounded px-2 py-0.5 text-[10px] transition-colors border cursor-pointer",
                              minProperties === count
                                ? "bg-neutral-900 text-white dark:bg-white/10 dark:text-white border-neutral-900 dark:border-white/20 font-semibold"
                                : "bg-neutral-100 dark:bg-[#181922] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                            )}
                          >
                            {count === "1" ? "Any (1+)" : `${count}+ bldgs`}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={minProperties === "2" ? "" : minProperties}
                          onChange={(e) => {
                            setMinProperties(e.target.value.replace(/\D/g, ""));
                            setOffset(0);
                          }}
                          placeholder="Min properties (Default 2+)"
                          className="w-full rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0f1015] px-2.5 py-1 text-xs text-foreground dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none pr-16 font-mono"
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">
                          properties
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Portfolio Square Feet */}
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSection("sqft")}
                    className="flex w-full items-center justify-between text-neutral-800 dark:text-neutral-200 font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 text-muted-foreground dark:text-neutral-400" />
                      <span>Portfolio Sq Ft</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {minSqft && minSqft !== "0" && (
                        <span className="rounded bg-neutral-200 dark:bg-white/10 text-neutral-800 dark:text-white px-1 text-[10px]">
                          1 x
                        </span>
                      )}
                      {openSections.sqft ? (
                        <ChevronDown className="size-3 text-muted-foreground dark:text-neutral-500" />
                      ) : (
                        <ChevronRight className="size-3 text-muted-foreground dark:text-neutral-500" />
                      )}
                    </div>
                  </button>

                  {openSections.sqft && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {["0", "50000", "100000", "250000", "500000", "1000000"].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setMinSqft(size);
                              setOffset(0);
                            }}
                            className={cn(
                              "rounded px-2 py-0.5 text-[10px] transition-colors border cursor-pointer",
                              minSqft === size || (size === "0" && (!minSqft || minSqft === "0"))
                                ? "bg-neutral-900 text-white dark:bg-white/10 dark:text-white border-neutral-900 dark:border-white/20 font-semibold"
                                : "bg-neutral-100 dark:bg-[#181922] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                            )}
                          >
                            {size === "0"
                              ? "Any"
                              : `${Number(size) >= 1000000 ? `${Number(size) / 1000000}M+` : `${Number(size) / 1000}k+`}`}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={minSqft === "0" ? "" : minSqft}
                          onChange={(e) => {
                            setMinSqft(e.target.value.replace(/\D/g, ""));
                            setOffset(0);
                          }}
                          placeholder="Min total sq ft (Any)"
                          className="w-full rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0f1015] px-2.5 py-1 text-xs text-foreground dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none pr-12 font-mono"
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">
                          sq ft
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Roof Opportunity & Verified Contacts */}
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSection("roofs")}
                    className="flex w-full items-center justify-between text-neutral-800 dark:text-neutral-200 font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-emerald-600 dark:text-[#B4E4D6]" />
                      <span>Opportunity Signals</span>
                    </div>
                    {openSections.roofs ? (
                      <ChevronDown className="size-3 text-muted-foreground dark:text-neutral-500" />
                    ) : (
                      <ChevronRight className="size-3 text-muted-foreground dark:text-neutral-500" />
                    )}
                  </button>

                  {openSections.roofs && (
                    <div className="mt-2.5 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setHasAgingRoofs(!hasAgingRoofs);
                          setOffset(0);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between rounded px-2 py-1.5 text-[11px] border transition-colors cursor-pointer",
                          hasAgingRoofs
                            ? "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-[#FFCA88] font-semibold"
                            : "bg-neutral-100 dark:bg-[#181922] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3" />
                          <span>Has Aging Roofs (&gt;20 yrs)</span>
                        </span>
                        {hasAgingRoofs && <CheckCircle2 className="size-3 text-amber-600 dark:text-[#FFCA88]" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setHasContact(!hasContact);
                          setOffset(0);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between rounded px-2 py-1.5 text-[11px] border transition-colors cursor-pointer",
                          hasContact
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-[#B4E4D6] font-semibold"
                            : "bg-neutral-100 dark:bg-[#181922] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3" />
                          <span>Verified Executive Contacts</span>
                        </span>
                        {hasContact && <CheckCircle2 className="size-3 text-emerald-600 dark:text-[#B4E4D6]" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-border p-3 bg-sidebar">
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer select-none"
              >
                Clear All Filters
              </button>
            </div>
          </aside>
        )}

        {/* Right Table Container */}
        <main className="min-w-0 flex-1 flex flex-col justify-between overflow-x-auto bg-background text-foreground">
          {/* Table Scroll Area */}
          <div className="min-w-0 flex-1 overflow-auto relative">
            {loading && !data ? (
              <div className="p-16 text-center text-xs text-muted-foreground dark:text-neutral-400 space-y-2">
                <div className="flex items-center justify-center gap-2 text-foreground dark:text-neutral-200">
                  <span className="size-2 rounded-full bg-[#B4E4D6] animate-ping" />
                  <span className="font-medium text-xs">Loading North Texas commercial owners directory...</span>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="p-16 text-center text-xs text-muted-foreground dark:text-neutral-400 space-y-2">
                <p>No commercial owners or REITs match these filters.</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1 text-foreground dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <table className="w-full min-w-max text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-background dark:bg-[#171714]">
                  <tr className="apollo-th h-[39px] border-b border-border bg-background text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="sticky top-0 z-20 bg-background dark:bg-[#171714] border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider w-12 px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        disabled={rows.length === 0}
                        aria-label="Select all owners"
                        className="size-3.5 rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-foreground dark:text-white focus:ring-0 cursor-pointer disabled:opacity-40"
                      />
                    </th>
                    <th className="sticky left-12 top-0 z-30 bg-background dark:bg-[#171714] px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap border-b border-border uppercase text-[11px] tracking-wider min-w-[300px]">
                      Owner / REIT Portfolio
                    </th>
                    <th className="sticky top-0 z-20 bg-background dark:bg-[#171714] border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider px-4 py-2.5 whitespace-nowrap min-w-[170px]">
                      Classification
                    </th>
                    <th className="sticky top-0 z-20 bg-background dark:bg-[#171714] border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider px-4 py-2.5 text-right whitespace-nowrap min-w-[110px]">
                      <button
                        type="button"
                        onClick={() => setSort(sort === "properties_desc" ? "properties_asc" : "properties_desc")}
                        className="inline-flex items-center gap-1 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
                        title="Click to sort by properties"
                      >
                        <span>Properties</span>
                        {sort.startsWith("properties") && (
                          <span className="text-[10px] text-amber-500">{sort === "properties_desc" ? "▼" : "▲"}</span>
                        )}
                      </button>
                    </th>
                    <th className="sticky top-0 z-20 bg-background dark:bg-[#171714] border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider px-4 py-2.5 text-right whitespace-nowrap min-w-[140px]">
                      <button
                        type="button"
                        onClick={() => setSort(sort === "sqft_desc" ? "sqft_asc" : "sqft_desc")}
                        className="inline-flex items-center gap-1 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
                        title="Click to sort by square feet"
                      >
                        <span>Portfolio Sq Ft</span>
                        {sort.startsWith("sqft") && (
                          <span className="text-[10px] text-amber-500">{sort === "sqft_desc" ? "▼" : "▲"}</span>
                        )}
                      </button>
                    </th>
                    <th className="sticky top-0 z-20 bg-background dark:bg-[#171714] border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider px-4 py-2.5 text-center whitespace-nowrap min-w-[130px]">
                      <button
                        type="button"
                        onClick={() => setSort(sort === "aging_roofs_desc" ? "properties_desc" : "aging_roofs_desc")}
                        className="inline-flex items-center gap-1 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
                        title="Click to sort by aging roofs"
                      >
                        <span>Overdue Roofs</span>
                        {sort.startsWith("aging_roofs") && (
                          <span className="text-[10px] text-amber-500">▼</span>
                        )}
                      </button>
                    </th>
                    <th className="sticky top-0 z-20 bg-background dark:bg-[#171714] border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider px-4 py-2.5 text-right whitespace-nowrap min-w-[140px]">
                      <button
                        type="button"
                        onClick={() => setSort(sort === "val_desc" ? "properties_desc" : "val_desc")}
                        className="inline-flex items-center gap-1 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
                        title="Click to sort by valuation"
                      >
                        <span>Valuation</span>
                        {sort === "val_desc" && <span className="text-[10px] text-amber-500">▼</span>}
                      </button>
                    </th>
                    <th className="sticky top-0 z-20 bg-background dark:bg-[#171714] border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider px-4 py-2.5 pr-4 text-right whitespace-nowrap min-w-[160px]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60 dark:divide-neutral-800/50">
                  {rows.map((row) => {
                    const isRowSelected = selectedRowIds.has(row.id);
                    const isDrawerOpen = selectedId === row.id;
                    const isHighlighted = isRowSelected || isDrawerOpen;

                    const canonicalName = row.canonicalName || row.canonical_name || "Commercial Owner";
                    const entityTypeStr = (row.entityType || row.entity_type || "commercial_operator").replace(/_/g, " ");
                    const cityStr = row.headquartersCity || row.headquarters_city;
                    const stateStr = row.headquartersState || row.headquarters_state || "TX";
                    const mgmtFirm = row.managementFirm || row.management_firm;
                    const totalProps = row.totalProperties ?? row.total_properties ?? 0;
                    const sqftFormatted = row.totalBuildingSqftFormatted || row.total_building_sqft_formatted || (row.totalBuildingSqft ? `${num(row.totalBuildingSqft)} sq ft` : "—");
                    const agingRoofs = row.agingRoofsCount ?? row.aging_roofs_count ?? 0;
                    const valFormatted = row.totalAssessedValuationFormatted || row.total_assessed_valuation_formatted || (row.totalAssessedValuation ? usd(row.totalAssessedValuation) : "—");
                    const hasDirectContacts = Boolean(row.hasContacts || row.has_contacts || (row.contacts && row.contacts.length > 0));

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                        className={cn(
                          "apollo-row h-14 group transition-colors duration-150 cursor-pointer border-b border-border",
                          isHighlighted
                            ? "bg-muted/80 hover:bg-muted text-foreground dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.10)] dark:text-foreground"
                            : "bg-background hover:bg-muted/50 dark:bg-[#171714] dark:hover:bg-[rgb(35,35,30)] text-foreground"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="w-12 px-4 py-0 text-center sticky left-0 z-10 bg-background group-hover:bg-muted/50 dark:bg-[#171714] dark:group-hover:bg-[rgb(35,35,30)]">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectRow(row.id);
                            }}
                            aria-label={`Select ${canonicalName}`}
                            className="size-3.5 rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-foreground dark:text-white focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Owner / REIT Sticky Left */}
                        <td
                          className={cn(
                            "sticky left-12 z-10 px-4 py-2 h-14 align-middle text-[12px] font-medium whitespace-nowrap min-w-[300px] transition-colors duration-150",
                            isHighlighted
                              ? "bg-muted/80 group-hover:bg-muted text-foreground dark:bg-[rgba(255,255,255,0.06)] dark:group-hover:bg-[rgba(255,255,255,0.10)] dark:text-foreground"
                              : "bg-background group-hover:bg-muted/50 dark:bg-[#171714] dark:group-hover:bg-[rgb(35,35,30)] text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                              {canonicalName}
                            </span>
                            {hasDirectContacts && (
                              <span
                                title="Verified direct decision maker contact available"
                                className="inline-flex size-4 items-center justify-center rounded-full border border-[#B4E4D6]/40 bg-[#B4E4D6]/15 dark:bg-[#B4E4D6]/10 text-[#1b7e65] dark:text-[#B4E4D6] shrink-0"
                              >
                                <Phone className="size-2.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {cityStr ? `${cityStr}, ${stateStr}` : "North Texas Portfolios"}
                            {mgmtFirm ? ` · ${mgmtFirm}` : ""}
                          </p>
                        </td>

                        {/* Classification */}
                        <td className="px-4 py-2 h-14 align-middle text-[12px] min-w-[170px] whitespace-nowrap text-muted-foreground">
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/50 uppercase tracking-wider">
                            {entityTypeStr}
                          </span>
                        </td>

                        {/* Properties Count */}
                        <td className="px-4 py-2 h-14 align-middle text-[12px] min-w-[110px] text-right font-mono tabular-nums whitespace-nowrap text-foreground font-semibold">
                          {num(totalProps)}
                        </td>

                        {/* Portfolio Sq Ft */}
                        <td className="px-4 py-2 h-14 align-middle text-[12px] min-w-[140px] text-right font-mono tabular-nums whitespace-nowrap text-foreground">
                          {sqftFormatted}
                        </td>

                        {/* Overdue Roofs */}
                        <td className="px-4 py-2 h-14 align-middle text-[12px] min-w-[130px] text-center whitespace-nowrap">
                          {agingRoofs > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-mono tabular-nums">
                              <Clock className="size-2.5" />
                              <span>{agingRoofs} roofs</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-mono">0</span>
                          )}
                        </td>

                        {/* Valuation */}
                        <td className="px-4 py-2 h-14 align-middle text-[12px] min-w-[140px] text-right font-mono tabular-nums whitespace-nowrap text-foreground">
                          {valFormatted}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-2 h-14 align-middle text-[12px] min-w-[160px] text-right whitespace-nowrap pr-4">
                          <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(row.id)}
                              className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted hover:border-border transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => setFullDetailId(row.id)}
                              className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted hover:border-border transition-colors cursor-pointer"
                            >
                              Dossier →
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Fixed Pagination Bar */}
          <div className="shrink-0 flex items-center justify-between border-t border-border bg-background px-5 py-3 text-xs text-muted-foreground z-10">
            <div>
              {loading ? (
                <div className="flex items-center gap-2 text-foreground">
                  <span className="size-2 rounded-full bg-[#B4E4D6] animate-ping" />
                  <span className="font-medium text-xs">Querying commercial portfolios...</span>
                </div>
              ) : (
                <span>
                  Showing <strong className="text-foreground font-medium">{from}–{to}</strong> of <strong className="text-foreground font-medium">{num(total)}</strong> commercial portfolios{selectedRowIds.size > 0 && <span className="ml-2 text-amber-400 font-semibold">· {selectedRowIds.size} selected</span>}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground mr-2">
                Page {pageIndex + 1} of {pageCount}
              </span>
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                className="rounded border border-border bg-background px-2.5 py-1 text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer select-none transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + LIMIT >= total || loading}
                onClick={() => setOffset(offset + LIMIT)}
                className="rounded border border-border bg-background px-2.5 py-1 text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer select-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Owner & REIT Portfolio Dossier Inspection Drawer (Right Sheet Drawer - Full Parity) */}
      <Sheet open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:w-[90vw] md:w-[80vw] lg:w-[65vw] xl:w-[60vw] 2xl:w-[55vw] min-w-[50vw] sm:max-w-none p-0 flex flex-col h-full overflow-hidden border-l border-border dark:border-neutral-800 shadow-2xl bg-background"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Owner & REIT Portfolio Dossier</SheetTitle>
            <SheetDescription>Comprehensive commercial asset portfolio, roof lifecycle, and executive contacts.</SheetDescription>
          </SheetHeader>
          {selectedId && (
            <OwnerDossierView
              ownerId={selectedId}
              onBack={() => setSelectedId(null)}
              onExpand={() => {
                setFullDetailId(selectedId);
                setSelectedId(null);
              }}
              backLabel="Close"
              isDrawer={true}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
