"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  Search, 
  X, 
  Check, 
  ShieldAlert, 
  Clock, 
  Layers, 
  FileText,
  Building
} from "lucide-react";
import { cn } from "cn";

export type ModalityScope = "total" | "net_new" | "claimed";

export interface ApolloFilterState {
  scope: ModalityScope;
  roofAge: string[];
  stormImpact: string[];
  sqftRange: string[];
  permitStatus: string[];
  propertyType: string[];
}

export const INITIAL_FILTERS: ApolloFilterState = {
  scope: "total",
  roofAge: [],
  stormImpact: [],
  sqftRange: [],
  permitStatus: [],
  propertyType: []
};

interface ApolloFilterDrawerProps {
  filters: ApolloFilterState;
  onChange: (filters: ApolloFilterState) => void;
  isOpen: boolean;
  onToggle: () => void;
  counts?: {
    total: number;
    netNew: number;
    claimed: number;
  };
}

export function ApolloFilterDrawer({
  filters,
  onChange,
  isOpen,
  onToggle,
  counts = { total: 1420, netNew: 1380, claimed: 40 }
}: ApolloFilterDrawerProps) {
  const [filterSearch, setFilterSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    roofAge: true,
    stormImpact: true,
    sqft: false,
    permits: false,
    property: false
  });

  const toggleSection = (section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleScopeChange = (scope: ModalityScope) => {
    onChange({ ...filters, scope });
  };

  const toggleFilterItem = (category: keyof Omit<ApolloFilterState, "scope">, value: string) => {
    const current = filters[category] as string[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [category]: updated });
  };

  const clearAllFilters = () => {
    onChange({
      ...INITIAL_FILTERS,
      scope: filters.scope
    });
  };

  const activeCount = 
    filters.roofAge.length + 
    filters.stormImpact.length + 
    filters.sqftRange.length + 
    filters.permitStatus.length + 
    filters.propertyType.length;

  if (!isOpen) return null;

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-full text-xs select-none">
      {/* 3-Tier Modality Scopes (Total / Net New / Claimed) */}
      <div className="p-3 border-b border-border">
        <div className="flex rounded-lg bg-muted p-0.5 border border-border">
          <button
            type="button"
            onClick={() => handleScopeChange("total")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium text-center transition-colors cursor-pointer",
              filters.scope === "total"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Total <span className="text-[10px] opacity-70">({counts.total})</span>
          </button>
          <button
            type="button"
            onClick={() => handleScopeChange("net_new")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium text-center transition-colors cursor-pointer",
              filters.scope === "net_new"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Net New <span className="text-[10px] opacity-70">({counts.netNew})</span>
          </button>
          <button
            type="button"
            onClick={() => handleScopeChange("claimed")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium text-center transition-colors cursor-pointer",
              filters.scope === "claimed"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Claimed <span className="text-[10px] opacity-70">({counts.claimed})</span>
          </button>
        </div>
      </div>

      {/* Filter Search Input */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-2 text-muted-foreground" />
          <input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search filters..."
            className="w-full h-7 pl-8 pr-2.5 bg-muted/50 rounded-md border border-border text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
          />
        </div>
      </div>

      {/* Active Filter Clear & Badges */}
      {activeCount > 0 && (
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-semibold text-foreground">
            {activeCount} {activeCount === 1 ? "Filter" : "Filters"} Applied
          </span>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[11px] text-foreground hover:underline cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter Accordion List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Accordion 1: Roof Age */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            type="button"
            onClick={() => toggleSection("roofAge")}
            className="w-full h-8 px-2.5 flex items-center justify-between text-[12px] font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 text-foreground" />
              <span>Roof Age</span>
              {filters.roofAge.length > 0 && (
                <span className="size-4 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center">
                  {filters.roofAge.length}
                </span>
              )}
            </div>
            {expanded.roofAge ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
          </button>
          {expanded.roofAge && (
            <div className="p-2 space-y-1 border-t border-border bg-muted/30">
              {[
                { label: "20+ Years (Replacement Imminent)", value: "20+" },
                { label: "15 - 20 Years (Vulnerable)", value: "15-20" },
                { label: "5 - 15 Years (Mid-Life)", value: "5-15" },
                { label: "< 5 Years (New Roof)", value: "<5" },
              ].map((opt) => {
                const checked = filters.roofAge.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent cursor-pointer text-[12px] text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFilterItem("roofAge", opt.value)}
                      className="size-3.5 rounded border-border bg-background accent-primary"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Accordion 2: Storm Impact */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            type="button"
            onClick={() => toggleSection("stormImpact")}
            className="w-full h-8 px-2.5 flex items-center justify-between text-[12px] font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-3.5 text-amber-500 dark:text-amber-400" />
              <span>Storm Impact</span>
              {filters.stormImpact.length > 0 && (
                <span className="size-4 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center">
                  {filters.stormImpact.length}
                </span>
              )}
            </div>
            {expanded.stormImpact ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
          </button>
          {expanded.stormImpact && (
            <div className="p-2 space-y-1 border-t border-border bg-muted/30">
              {[
                { label: "Severe Hail (> 1.75\")", value: "severe_hail" },
                { label: "Moderate Hail (1.25\" - 1.75\")", value: "mod_hail" },
                { label: "High Wind (60+ mph)", value: "high_wind" },
                { label: "Recent Storm (< 90 Days)", value: "recent_90d" },
              ].map((opt) => {
                const checked = filters.stormImpact.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent cursor-pointer text-[12px] text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFilterItem("stormImpact", opt.value)}
                      className="size-3.5 rounded border-border bg-background accent-primary"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Accordion 3: Square Footage */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            type="button"
            onClick={() => toggleSection("sqft")}
            className="w-full h-8 px-2.5 flex items-center justify-between text-[12px] font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="size-3.5 text-blue-500 dark:text-blue-400" />
              <span>Building Sq Ft</span>
              {filters.sqftRange.length > 0 && (
                <span className="size-4 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center">
                  {filters.sqftRange.length}
                </span>
              )}
            </div>
            {expanded.sqft ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
          </button>
          {expanded.sqft && (
            <div className="p-2 space-y-1 border-t border-border bg-muted/30">
              {[
                { label: "50,000+ Sq Ft (Enterprise)", value: "50k+" },
                { label: "25,000 - 50,000 Sq Ft", value: "25k-50k" },
                { label: "10,000 - 25,000 Sq Ft", value: "10k-25k" },
                { label: "< 10,000 Sq Ft (Small Commercial)", value: "<10k" },
              ].map((opt) => {
                const checked = filters.sqftRange.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent cursor-pointer text-[12px] text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFilterItem("sqftRange", opt.value)}
                      className="size-3.5 rounded border-border bg-background accent-primary"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Accordion 4: Permits */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            type="button"
            onClick={() => toggleSection("permits")}
            className="w-full h-8 px-2.5 flex items-center justify-between text-[12px] font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="size-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Permit Activity</span>
            </div>
            {expanded.permits ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
          </button>
          {expanded.permits && (
            <div className="p-2 space-y-1 border-t border-border bg-muted/30">
              {[
                { label: "Recent Roof Permit (< 1 yr)", value: "permit_1yr" },
                { label: "No Permit History", value: "no_permit" },
              ].map((opt) => {
                const checked = filters.permitStatus.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent cursor-pointer text-[12px] text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFilterItem("permitStatus", opt.value)}
                      className="size-3.5 rounded border-border bg-background accent-primary"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Accordion 5: Property Type */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            type="button"
            onClick={() => toggleSection("property")}
            className="w-full h-8 px-2.5 flex items-center justify-between text-[12px] font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building className="size-3.5 text-purple-500 dark:text-purple-400" />
              <span>Property Type</span>
            </div>
            {expanded.property ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
          </button>
          {expanded.property && (
            <div className="p-2 space-y-1 border-t border-border bg-muted/30">
              {[
                { label: "Warehouse / Distribution", value: "warehouse" },
                { label: "Retail Center / Mall", value: "retail" },
                { label: "Commercial Office", value: "office" },
                { label: "Industrial Facility", value: "industrial" },
              ].map((opt) => {
                const checked = filters.propertyType.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent cursor-pointer text-[12px] text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFilterItem("propertyType", opt.value)}
                      className="size-3.5 rounded border-border bg-background accent-primary"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

