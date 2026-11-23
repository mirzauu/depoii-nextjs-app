"use client";

import { useState } from "react";
import { 
  Building2, 
  MapPin, 
  ShieldAlert, 
  Clock, 
  Sparkles, 
  Plus, 
  Download, 
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  Layers,
  X,
  Check
} from "lucide-react";
import { cn } from "cn";

export interface BuildingRecord {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  roofAge: number;
  sqft: number;
  hailImpact: string;
  lastPermitYear: number | null;
  ownerName: string;
  claimed: boolean;
}

interface ApolloTableProps {
  records: BuildingRecord[];
  totalCount: number;
  onClaim?: (id: string) => void;
  onRowClick?: (record: BuildingRecord) => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
}

export function ApolloTable({
  records,
  totalCount,
  onClaim,
  onRowClick,
  isFilterOpen,
  onToggleFilter
}: ApolloTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(records.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const isAllSelected = records.length > 0 && selectedIds.size === records.length;
  const isAnySelected = selectedIds.size > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background text-foreground overflow-hidden">
      {/* Apollo-Style Sub-Header Action Bar */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between gap-3 shrink-0 bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Buildings</h1>
            <span className="text-[12px] text-muted-foreground">({totalCount.toLocaleString()} records)</span>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Toggle Filters Button */}
          <button
            type="button"
            onClick={onToggleFilter}
            className="h-7 px-2.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-foreground text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{isFilterOpen ? "Hide Filters" : "Show Filters"}</span>
          </button>

          {/* Saved View Selector Dropdown */}
          <button
            type="button"
            className="hidden sm:flex h-7 px-2.5 rounded-md border border-border bg-muted/50 text-muted-foreground text-[12px] font-medium items-center gap-1.5 transition-colors"
          >
            <span>Default View</span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="h-7 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="size-3 text-primary-foreground" />
            <span>Research with AI</span>
          </button>
          <button
            type="button"
            className="hidden md:flex h-7 px-2.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-foreground text-[12px] font-medium items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="size-3 text-muted-foreground" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Toolbar (Apollo Floating Overlay Banner) */}
      {isAnySelected && (
        <div className="h-10 px-4 bg-muted border-b border-border flex items-center justify-between text-xs animate-in slide-in-from-top-1 duration-150 shrink-0 text-foreground">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? "record" : "records"} selected
            </span>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-foreground hover:underline cursor-pointer"
            >
              Select all {totalCount} records
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-[11px] flex items-center gap-1 hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
            >
              <Check className="size-3" />
              Claim Selected
            </button>
            <button
              type="button"
              className="h-7 px-2.5 rounded-md border border-border bg-background text-foreground text-[11px] font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              Add to Hot Sheet
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer ml-1"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* High-Density 40px Data Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              {/* Checkbox Column */}
              <th className="apollo-th w-10 text-center sticky left-0 z-30 bg-background">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all rows"
                  className="size-3.5 rounded border-border bg-background accent-primary cursor-pointer"
                />
              </th>

              {/* Building Address Column */}
              <th className="apollo-th min-w-[240px] sticky left-10 z-30 bg-background">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                  <span>Building Address</span>
                  <ArrowUpDown className="size-3 text-muted-foreground" />
                </div>
              </th>

              <th className="apollo-th min-w-[120px]">Roof Age</th>
              <th className="apollo-th min-w-[130px]">Estimated Sq Ft</th>
              <th className="apollo-th min-w-[160px]">Storm Impact</th>
              <th className="apollo-th min-w-[130px]">Last Permit</th>
              <th className="apollo-th min-w-[200px]">Owner / Entity</th>
              <th className="apollo-th min-w-[130px] text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {records.map((rec) => {
              const isSelected = selectedIds.has(rec.id);
              return (
                <tr
                  key={rec.id}
                  onClick={() => onRowClick?.(rec)}
                  className={cn("apollo-row group cursor-pointer", isSelected && "selected")}
                >
                  {/* Pinned Checkbox */}
                  <td
                    onClick={(e) => toggleSelectRow(rec.id, e)}
                    className="apollo-td w-10 text-center sticky left-0 z-10 bg-background group-hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="size-3.5 rounded border-border bg-background accent-primary cursor-pointer"
                    />
                  </td>

                  {/* Pinned Address */}
                  <td className="apollo-td sticky left-10 z-10 bg-background group-hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <div className="size-6 shrink-0 rounded bg-muted text-foreground flex items-center justify-center border border-border">
                        <Building2 className="size-3.5 text-foreground" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-foreground transition-colors">
                          {rec.address}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-1.5">
                          {rec.city}, {rec.state} {rec.zip}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Roof Age Badge */}
                  <td className="apollo-td">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                        rec.roofAge >= 20
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          : rec.roofAge >= 15
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      )}
                    >
                      <Clock className="size-2.5" />
                      {rec.roofAge} Years
                    </span>
                  </td>

                  {/* Sq Ft */}
                  <td className="apollo-td font-mono text-[11px] text-muted-foreground">
                    {rec.sqft.toLocaleString()} sq ft
                  </td>

                  {/* Storm Impact */}
                  <td className="apollo-td">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="size-3 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="text-foreground text-[11px] truncate">{rec.hailImpact}</span>
                    </div>
                  </td>

                  {/* Last Permit */}
                  <td className="apollo-td text-muted-foreground text-[11px]">
                    {rec.lastPermitYear ? `${rec.lastPermitYear} (Reroof)` : "None on file"}
                  </td>

                  {/* Owner */}
                  <td className="apollo-td">
                    <span className="text-foreground text-[12px] hover:underline cursor-pointer truncate">
                      {rec.ownerName}
                    </span>
                  </td>

                  {/* Inline Action Triggers */}
                  <td className="apollo-td text-right">
                    <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {rec.claimed ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          Claimed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onClaim?.(rec.id)}
                          className="h-6 px-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="h-10 px-4 border-t border-border bg-background flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <span>Showing 1 - {records.length} of {totalCount.toLocaleString()} buildings</span>
        <div className="flex items-center gap-1">
          <button className="h-7 px-2 rounded border border-border hover:bg-muted text-foreground disabled:opacity-40 cursor-pointer">
            Prev
          </button>
          <span className="h-7 px-2.5 rounded bg-primary text-primary-foreground flex items-center justify-center font-medium">
            1
          </span>
          <button className="h-7 px-2 rounded border border-border hover:bg-muted text-foreground cursor-pointer">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

