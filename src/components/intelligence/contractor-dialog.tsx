"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { 
  engineGet, 
  mapPermitSearch, 
  mapContractorProfile, 
  mapContractorBuildings,
  type ContractorProfile, 
  type EnginePermit,
  type ContractorBuilding 
} from "@/lib/engine-api";
import { pct, shortDate, usd } from "@/lib/format";
import { DepoiiLoader } from "@/components/depoii-logo";
import { ParcelDetailDrawer } from "@/components/parcel-detail-drawer";
import { Building2, ExternalLink, MapPin, Building, Home, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function mapsUrl(address: string, lat: number | null, lng: number | null) {
  if (lat != null && lng != null) return `https://www.google.com/maps?q=${lat},${lng}&t=k`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function ContractorDialog({ contractor, onClose }: { contractor: ContractorProfile | null; onClose: () => void }) {
  return (
    <Dialog open={!!contractor} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        {contractor && <ContractorBody contractor={contractor} />}
      </DialogContent>
    </Dialog>
  );
}

export function ContractorBody({ contractor: initial, hideTitle = false }: { contractor: ContractorProfile; hideTitle?: boolean }) {
  const [profile, setProfile] = useState<ContractorProfile | null>(null);

  useEffect(() => {
    if (!initial.phone && !initial.website && !initial.rcatProfileUrl && !initial.bbbProfileUrl) {
      const controller = new AbortController();
      engineGet("contractors/profile", { name: initial.name || initial.id }, mapContractorProfile, controller.signal)
        .then((res) => { if (res) setProfile(res); })
        .catch(() => {});
      return () => controller.abort();
    }
  }, [initial.name, initial.id, initial.phone, initial.website, initial.rcatProfileUrl, initial.bbbProfileUrl]);

  const contractor = profile ?? initial;
  const [permits, setPermits] = useState<EnginePermit[] | null>(null);
  const [matched, setMatched] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Buildings state with Commercial as default filter
  const [buildingFilter, setBuildingFilter] = useState<"commercial" | "all">("commercial");
  const [buildings, setBuildings] = useState<ContractorBuilding[] | null>(null);
  const [buildingsTotal, setBuildingsTotal] = useState<number>(0);
  const [commercialCount, setCommercialCount] = useState<number>(0);
  const [allCount, setAllCount] = useState<number>(0);
  const [buildingsLoading, setBuildingsLoading] = useState<boolean>(false);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const names = [contractor.name, ...contractor.aliases.filter((alias) => alias !== contractor.name)];
    setPermits(null);
    setError(null);
    (async () => {
      let last: EnginePermit[] = [];
      for (const name of names) {
        const page = await engineGet("permits/search", { contractor: name, limit: 100, sort_by: "date_desc" }, mapPermitSearch, controller.signal);
        last = page.permits;
        if (page.permits.length) {
          setMatched(name);
          setPermits(page.permits);
          return;
        }
      }
      setMatched("");
      setPermits(last);
    })().catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "The data engine did not respond.");
      setPermits([]);
    });
    return () => controller.abort();
  }, [contractor]);

  // Fetch buildings under contractor with active filter
  useEffect(() => {
    const controller = new AbortController();
    setBuildingsLoading(true);
    engineGet(
      "contractors/buildings",
      { name: contractor.name || contractor.id, filter: buildingFilter, limit: 200 },
      mapContractorBuildings,
      controller.signal
    )
      .then((res) => {
        setBuildings(res.buildings);
        setBuildingsTotal(res.total);
        if (res.commercialCount !== undefined) setCommercialCount(res.commercialCount);
        if (res.allCount !== undefined) setAllCount(res.allCount);
      })
      .catch(() => {
        setBuildings([]);
      })
      .finally(() => {
        setBuildingsLoading(false);
      });
    return () => controller.abort();
  }, [contractor.name, contractor.id, buildingFilter]);

  const facts: [string, string][] = [
    ["License", contractor.license],
    ["Phone", contractor.phone],
    ["Website", contractor.website],
    ["Headquarters", contractor.hq],
    ["Year founded", contractor.founded],
    ["Crew capacity", contractor.crew],
    ["Certifications", contractor.certifications.join(", ")],
    ["Ownership", contractor.ownership],
    ["Acquisition", contractor.acquisition],
    ["Subcontracting", contractor.subcontracting],
    ["Notes", contractor.maNotes],
  ];
  const aliases = contractor.aliases.filter((alias) => alias.trim().toLowerCase() !== contractor.name.trim().toLowerCase());

  return (
    <>
      <div>
        {!hideTitle && (
          <h2 className="flex items-center gap-3 text-lg font-semibold">
            {contractor.logoUrl ? <img src={contractor.logoUrl} alt="" width={40} height={40} className="size-10 rounded-md bg-white object-contain p-1" /> : null}
            {contractor.name}
          </h2>
        )}
        <p className="text-sm text-muted-foreground">
          {contractor.jurisdiction || "All locations"} · {contractor.permits.toLocaleString()} permits · {contractor.valuationLabel || usd(contractor.valuation, true)}{contractor.share > 0 ? ` · ${pct(contractor.share, 1)} share` : ""} · {contractor.roofSystem || "roof system not stated"}
        </p>
      </div>
      {aliases.length > 0 && (
        <p className="text-xs text-muted-foreground">Also filed as {aliases.join(", ")}</p>
      )}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="buildings">
            Buildings {allCount > 0 ? `(${allCount})` : buildingsTotal > 0 ? `(${buildingsTotal})` : ""}
          </TabsTrigger>
          <TabsTrigger value="permits">All permits</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          {(contractor.rcatProfileUrl || contractor.bbbProfileUrl || contractor.linkedinCompanyUrl) && (
            <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verified Credentials & External Profiles
              </h3>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {contractor.rcatProfileUrl && (
                  <a
                    href={contractor.rcatProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20"
                  >
                    <span className="font-semibold text-red-400">RCAT</span>
                    <span>{contractor.rcatLicenseType || "Licensed Contractor"}{contractor.rcatLicenseNumber ? ` (${contractor.rcatLicenseNumber})` : ""}</span>
                    <span className="text-[10px] opacity-75">↗</span>
                  </a>
                )}
                {contractor.bbbProfileUrl && (
                  <a
                    href={contractor.bbbProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-200 transition-colors hover:bg-blue-500/20"
                  >
                    <span className="font-semibold text-blue-400">BBB</span>
                    <span>{contractor.bbbRating ? `Rating: ${contractor.bbbRating}` : ""}{contractor.bbbAccredited ? " · Accredited" : ""}</span>
                    <span className="text-[10px] opacity-75">↗</span>
                  </a>
                )}
                {contractor.linkedinCompanyUrl && (
                  <a
                    href={contractor.linkedinCompanyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
                  >
                    <span className="font-semibold text-sky-400">LinkedIn</span>
                    <span>Company Profile</span>
                    <span className="text-[10px] opacity-75">↗</span>
                  </a>
                )}
              </div>
            </div>
          )}
          <dl className="grid gap-3 py-2 text-sm sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="break-words">{value || "Not on record"}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leadership</h3>
            {contractor.leadership.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Not on record</p>
            ) : (
              <ul className="mt-2 space-y-3 pb-2">
                {contractor.leadership.map((person) => (
                  <li key={person.name}>
                    <p className="text-sm font-medium">{person.name}</p>
                    {person.title && <p className="text-xs text-muted-foreground">{person.title}</p>}
                    <p className="text-xs">
                      {[person.phone, person.email].filter(Boolean).join(" · ")}
                      {person.linkedin && (
                        <>
                          {" · "}
                          <a href={person.linkedin} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">LinkedIn</a>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* Dedicated Buildings Tab with Filter */}
        <TabsContent value="buildings" className="space-y-4">
          {/* Filter Bar: Commercial (Default) vs All */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setBuildingFilter("commercial")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                  buildingFilter === "commercial"
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Building className="size-3.5" />
                <span>Commercial</span>
                {commercialCount > 0 && (
                  <span className={cn(
                    "ml-1 rounded-full px-1.5 py-0.2 text-[10px]",
                    buildingFilter === "commercial" 
                      ? "bg-primary-foreground/20 text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {commercialCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setBuildingFilter("all")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                  buildingFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Building2 className="size-3.5" />
                <span>All Buildings</span>
                {allCount > 0 && (
                  <span className={cn(
                    "ml-1 rounded-full px-1.5 py-0.2 text-[10px]",
                    buildingFilter === "all" 
                      ? "bg-primary-foreground/20 text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {allCount}
                  </span>
                )}
              </button>
            </div>

            <span className="text-[11px] text-muted-foreground">
              {buildingFilter === "commercial" 
                ? `Showing ${buildings?.length ?? 0} commercial properties`
                : `Showing all ${buildings?.length ?? 0} physical job sites`}
            </span>
          </div>

          {buildingsLoading && <DepoiiLoader label={`Loading ${buildingFilter === "commercial" ? "commercial " : ""}buildings for ${contractor.name}…`} className="py-8" />}
          
          {!buildingsLoading && (!buildings || buildings.length === 0) && (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                No {buildingFilter === "commercial" ? "commercial " : ""}buildings found on record.
              </p>
              {buildingFilter === "commercial" && allCount > 0 && (
                <button
                  type="button"
                  onClick={() => setBuildingFilter("all")}
                  className="text-xs text-sky-400 hover:underline"
                >
                  View all {allCount} residential and mixed job sites
                </button>
              )}
            </div>
          )}

          {!!buildings?.length && (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Building Address</TableHead>
                    <TableHead>Owner & Parcel</TableHead>
                    <TableHead className="hidden md:table-cell">Property & SqFt</TableHead>
                    <TableHead className="text-right">Permits / Work</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildings.map((b) => (
                    <TableRow 
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => {
                        const targetId = b.parcelAccount || b.id;
                        setSelectedParcelId(targetId);
                      }}
                    >
                      <TableCell className="max-w-56">
                        <div className="flex items-start gap-2">
                          <Building2 className={cn("size-4 shrink-0 mt-0.5", b.isCommercial ? "text-amber-400" : "text-muted-foreground")} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm block truncate text-foreground hover:text-sky-400">
                                {b.address}
                              </span>
                              {b.isCommercial && (
                                <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-400 border border-amber-500/30">
                                  COMMERCIAL
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {b.city}, {b.state}
                              {(b.address || (b.lat != null && b.lng != null)) && (
                                <a 
                                  href={mapsUrl(b.address, b.lat, b.lng)} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-sky-400 hover:underline inline-flex items-center gap-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Map <ExternalLink className="size-2.5" />
                                </a>
                              )}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <span className="block truncate text-sm font-medium">
                          {b.owner || "Property Owner (Private)"}
                        </span>
                        <span className="block text-xs font-mono text-muted-foreground truncate">
                          {b.parcelAccount ? b.parcelAccount : "Unplatted / Permit Jobsite"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="block text-xs text-foreground">
                          {b.propertyType || (b.isCommercial ? "Commercial Building" : "Residential / Jobsite")}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {b.sqft > 0 ? `${b.sqft.toLocaleString()} sq ft` : "SqFt not reported"}
                          {b.yearBuilt ? ` · Built ${b.yearBuilt}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border",
                          b.isCommercial 
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                        )}>
                          {b.permitCount} {b.permitCount === 1 ? "Permit" : "Permits"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          {b.latestPermitDate ? shortDate(b.latestPermitDate) : "—"} · {b.workType}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="permits">
          {permits == null && !error && <DepoiiLoader label={`Loading permits for ${contractor.name}…`} className="py-8" />}
          {error && <p className="py-6 text-sm text-red-300">{error}</p>}
          {permits && !permits.length && <p className="py-6 text-sm text-muted-foreground">No permits matched this contractor name or its aliases. The leaderboard name often differs from the name printed on the permit.</p>}
          {matched && matched !== contractor.name && <p className="pb-2 text-xs text-muted-foreground">Matched permits filed as {matched}.</p>}
          {!!permits?.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permit</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="hidden md:table-cell">Scope</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permits.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-medium">{p.permitNumber}</span>
                      <span className="block text-xs text-muted-foreground">{p.issued ? shortDate(p.issued) : "—"} · {p.status || p.category}</span>
                    </TableCell>
                    <TableCell className="max-w-48">
                      <span className="block truncate">{p.address || "Address not published"}</span>
                      {(p.address || (p.lat != null && p.lng != null)) && (
                        <a href={mapsUrl(p.address, p.lat, p.lng)} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline">Satellite</a>
                      )}
                    </TableCell>
                    <TableCell className="hidden max-w-64 truncate md:table-cell" title={p.description}>{p.description || "—"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{p.valuation ? usd(p.valuation, true) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Parcel detail drawer when user clicks on any building */}
      <ParcelDetailDrawer
        parcelId={selectedParcelId}
        onClose={() => setSelectedParcelId(null)}
      />
    </>
  );
}
