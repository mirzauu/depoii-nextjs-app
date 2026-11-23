"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Clock,
  CloudHail,
  FileText,
  Flame,
  HardHat,
  House,
  Landmark,
  Lock,
  MapPin,
  Shield,
  Trophy,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { DepoiiAiMark, DepoiiMark } from "./depoii-logo";
import { useMe } from "@/hooks/use-me";

type NavIcon = React.ComponentType<any>;
type NavLink = { href: string; label: string; icon?: NavIcon; match?: string[]; engine?: boolean; badge?: string; disabled?: boolean; permission?: string };
type NavGroup = { id: string; label: string; icon?: NavIcon; items: NavLink[]; match?: string[] };

export const TOP: (NavLink & { icon: NavIcon })[] = [
  { href: "/", label: "Overview", icon: House, permission: "nav:overview" },
  { href: "/competitors", label: "Leaderboard", icon: Trophy, engine: true, permission: "nav:competitors" },
  { href: "", label: "AI Assistant", icon: DepoiiAiMark, badge: "Soon", disabled: true },
];

export const GROUPS: NavGroup[] = [
  {
    id: "leads",
    label: "Leads",
    items: [
      { href: "/pipeline", label: "Hot Sheet", icon: Flame, match: ["/parcels", "/property"], permission: "nav:pipeline" },
      { href: "/roof-aging", label: "Aging Roof", icon: Clock, engine: true, permission: "nav:roof_aging" },
      { href: "/map", label: "Hail Map", icon: CloudHail, engine: true, permission: "nav:map" },
    ],
  },
  {
    id: "prospect",
    label: "Prospect and enrich",
    items: [
      { href: "/buildings", label: "Property", icon: Building2, engine: true, permission: "nav:buildings" },
      { href: "/owners", label: "Owners & REITs", icon: Landmark, engine: true, permission: "nav:owners" },
      { href: "/contractors", label: "Contractors", icon: HardHat, match: ["/contractors"], engine: true, permission: "nav:contractors" },
      { href: "/permits", label: "Permit", icon: FileText, engine: true, permission: "nav:permits" },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    items: [
      { href: "/territory", label: "Territory Explorer", icon: MapPin, match: ["/territory"], permission: "nav:territory" },
      { href: "/claims", label: "My Claims", icon: Lock, match: ["/claims"], permission: "nav:claims" },
      { href: "/outcomes", label: "Field Outcomes", icon: ClipboardCheck, permission: "nav:outcomes" },
      { href: "/team", label: "Team", icon: Users, permission: "nav:team" },
      { href: "", label: "CRM", icon: Workflow, badge: "Soon", disabled: true, permission: "nav:crm" },
    ],
  },
];

export const FLAT_NAV: NavLink[] = [...TOP, ...GROUPS.flatMap((g) => g.items)];

export const ENGINE_PATHS = [...TOP.filter((i) => i.engine).map((i) => i.href), ...GROUPS.flatMap((g) => g.items).filter((i) => i.engine).map((i) => i.href), "/territory", "/claims", "/pipeline", "/team", "/outcomes", "/crm", "/buildings", "/settings", "/login", "/admin", "/parcels", "/property", "/contractors", "/jobsites", "/multiphase", "/capital", "/dark-market", "/storm-targets", "/competitors", "/map", "/owners"];

export const SidebarPreview = createContext<{ path: string; go: (href: string) => void } | null>(null);

function NavTo({ href, className, title, onClick, children }: { href: string; className?: string; title?: string; onClick?: () => void; children: ReactNode }) {
  const preview = useContext(SidebarPreview);
  if (!preview) {
    return (
      <Link href={href} title={title} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      title={title}
      className={className}
      onClick={() => {
        onClick?.();
        preview.go(href);
      }}
    >
      {children}
    </button>
  );
}

export function isActive(path: string, link: NavLink, fromParam?: string | null) {
  if (!link.href) return false;
  if (link.href === "/") return path === "/";
  if (link.href === "/pipeline" && fromParam === "roof-aging") return false;
  if (link.href === "/roof-aging" && fromParam === "roof-aging" && (path.startsWith("/parcels") || path.startsWith("/property"))) return true;
  return [link.href, ...(link.match ?? [])].filter(Boolean).some((p) => path === p || path.startsWith(`${p}/`));
}

function groupActive(path: string, group: NavGroup, fromParam?: string | null) {
  return group.items.some((i) => isActive(path, i, fromParam)) || (group.match ?? []).filter(Boolean).some((p) => path.startsWith(p));
}

const GROUPS_KEY = "depoii:nav-groups-v7";
const RAIL_KEY = "depoii:sidebar";
const DEFAULT_OPEN = Object.fromEntries(GROUPS.map((group) => [group.id, group.id !== "organization"]));

export function AccountMenu({ collapsed = false }: { collapsed?: boolean }) {
  const preview = useContext(SidebarPreview);
  const router = useRouter();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) return;
    router.replace("/login");
    router.refresh();
  };

  const initial = me?.email ? me.email.charAt(0).toUpperCase() : "D";

  return (
    <div ref={box} className={cn("relative", collapsed && "flex justify-center")}>
      <button
        type="button"
        aria-label="Account"
        aria-expanded={open}
        title={me?.email || "Account"}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer",
          collapsed ? "size-9 justify-center" : "w-full gap-2.5 px-2.5 py-1.5 text-left",
        )}
      >
        <div className="size-7 shrink-0 rounded-full bg-muted text-foreground font-semibold text-xs flex items-center justify-center border border-border">
          {initial}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
              {me?.email ? me.email.split("@")[0] : "Depoii User"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {me?.orgName || "Free Tier"}
            </p>
          </div>
        )}
      </button>
      {open && !preview && (
        <div
          className={cn(
            "z-50 rounded-xl border border-border bg-popover p-1.5 text-[13px] text-popover-foreground shadow-2xl",
            collapsed
              ? "absolute bottom-0 left-full ml-2 w-56"
              : "absolute bottom-full left-0 mb-2 w-full min-w-[220px]"
          )}
        >
          {/* User Info Header with Email & Workspace */}
          <div className="px-2.5 py-2 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <div className="size-7 shrink-0 rounded-full bg-muted text-foreground font-semibold text-[11px] flex items-center justify-center border border-border">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-popover-foreground truncate leading-tight">{me?.email || "User"}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{me?.orgName || "Depoii Workspace"}</p>
              </div>
            </div>
            {me?.platformRole && (
              <span className="inline-block mt-1 rounded bg-muted text-foreground text-[9px] font-semibold px-1.5 py-0.5 border border-border uppercase tracking-wider">
                {me.platformRole}
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <div className="py-1 space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span>Workspace settings</span>
            </Link>
          </div>

          <div className="my-1 border-t border-border" />

          {/* Sign Out Action */}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <span>Sign out</span>
          </button>
        </div>
      )}
      {open && preview && (
        <div className="absolute bottom-full left-1 z-50 mb-1.5 w-44 rounded-lg border border-border bg-popover p-2 text-xs text-muted-foreground shadow-xl">
          Sample workspace. Sign in for your team.
        </div>
      )}
    </div>
  );
}

export function Sidebar({ defaultCollapsed }: { defaultCollapsed?: boolean } = {}) {
  const livePath = usePathname();
  const preview = useContext(SidebarPreview);
  const path = preview?.path ?? livePath;
  const me = useMe();
  const adminLink = { href: "/admin", label: "Super Admin", match: ["/admin"] };
  const initialCollapsed = defaultCollapsed ?? (preview ? true : false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [open, setOpen] = useState<Record<string, boolean>>(DEFAULT_OPEN);
  const [logoOn, setLogoOn] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const logoTimer = useRef(0);

  const [fromParam, setFromParam] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setFromParam(sp.get("from"));
    }
  }, [path]);

  useEffect(() => {
    setNavReady(true);
    if (!preview) {
      const saved = localStorage.getItem(RAIL_KEY);
      if (saved) {
        setCollapsed(saved === "collapsed");
      } else if (defaultCollapsed !== undefined) {
        setCollapsed(defaultCollapsed);
      }
    } else {
      setCollapsed(defaultCollapsed !== undefined ? defaultCollapsed : true);
    }
    try {
      const saved = JSON.parse(localStorage.getItem(GROUPS_KEY) || "null");
      if (saved && typeof saved === "object") setOpen((prev) => ({ ...prev, ...saved }));
    } catch {}
  }, [preview, defaultCollapsed]);

  useEffect(() => {
    const current = GROUPS.find((g) => groupActive(path, g, fromParam));
    if (current) setOpen((o) => (o[current.id] ? o : { ...o, [current.id]: true }));
  }, [path, fromParam]);

  useEffect(() => {
    if (!preview) {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(open));
    }
  }, [open, preview]);

  const setRail = (value: boolean) => {
    setCollapsed(value);
    if (!preview) {
      localStorage.setItem(RAIL_KEY, value ? "collapsed" : "open");
    }
  };

  const onGroup = (id: string) => {
    if (collapsed) {
      if (!preview) {
        setRail(false);
      }
      setOpen((o) => ({ ...o, [id]: true }));
    } else {
      setOpen((o) => ({ ...o, [id]: !o[id] }));
    }
  };

  const canAccess = (perm?: string) => {
    if (!perm) return true;
    if (me?.platformRole === "superadmin" || me?.role === "owner") return true;
    if (!me?.permissions || me.permissions.length === 0) return true;
    if (me.permissions.includes("*")) return true;
    return me.permissions.includes(perm);
  };

  const orgLabel = navReady && me?.orgName?.trim() ? me.orgName.trim() : "Organization";

  const visibleTop = TOP.filter((link) => canAccess(link.permission));
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    label: group.id === "organization" ? orgLabel : group.label,
    items: group.items.filter((item) => canAccess(item.permission)),
  })).filter((group) => group.items.length > 0);

  const fade = cn("overflow-hidden whitespace-nowrap transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100");
  
  // Apollo item row styling: 32px height (h-8), 13.5px font, subtle hover, left accent pill on active
  const rowBase = "group flex w-full items-center gap-2.5 h-8 px-2.5 overflow-hidden rounded-md text-[13.5px] font-medium whitespace-nowrap text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors relative";
  const rowActive = "bg-sidebar-accent text-sidebar-foreground font-medium shadow-xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2.5px] before:bg-foreground before:rounded-r";

  const renderGroup = (group: NavGroup) => {
    const expanded = !collapsed && !!open[group.id];
    const showItems = collapsed || expanded;

    const itemsNode = (
      <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", showItems ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={!showItems}>
          <div className="flex flex-col gap-0.5 py-0.5">
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              const active = isActive(path, item, fromParam);
              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    title={`${item.label} (Coming Soon)`}
                    aria-disabled="true"
                    className={cn(
                      rowBase,
                      "cursor-not-allowed select-none text-muted-foreground/60 hover:bg-transparent hover:text-muted-foreground/60 justify-between",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ItemIcon && <ItemIcon className="size-[17px] shrink-0 text-muted-foreground/60" />}
                      <span className={cn(fade, "truncate")}>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={cn(fade, "rounded-full border border-border bg-muted/60 px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground")}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }
              return (
                <NavTo
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    rowBase,
                    active && rowActive,
                    "justify-between",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ItemIcon && (
                      <ItemIcon
                        className={cn(
                          "size-[17px] shrink-0 transition-colors",
                          active ? "text-sidebar-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground",
                        )}
                      />
                    )}
                    <span className={cn(fade, "truncate")}>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cn(fade, "rounded-full border border-border bg-muted/60 px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground")}>
                      {item.badge}
                    </span>
                  )}
                </NavTo>
              );
            })}
          </div>
        </div>
      </div>
    );

    const buttonNode = !collapsed ? (
      <button
        type="button"
        onClick={() => onGroup(group.id)}
        title={group.label}
        aria-expanded={expanded}
        className="group flex w-full items-center justify-between h-7.5 px-2.5 overflow-hidden rounded-md text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground transition-colors cursor-pointer select-none"
      >
        <span className={cn(fade, "flex-1 text-left truncate")}>{group.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
    ) : (
      <div className="my-1 border-t border-sidebar-border" />
    );

    return (
      <div key={group.id} className="flex flex-col mt-2 first:mt-0">
        {buttonNode}
        {itemsNode}
      </div>
    );
  };

  return (
    <aside className={cn("sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex print:hidden", preview && "flex! h-full", collapsed ? "w-16" : "w-[248px]")}>
      <div className="h-12 flex items-center gap-2 px-3.5 border-b border-sidebar-border">
        <NavTo
          href="/"
          title="Depoii"
          className="flex min-w-0 items-center gap-2.5 overflow-hidden whitespace-nowrap"
          onClick={() => {
            setLogoOn(true);
            window.clearTimeout(logoTimer.current);
            logoTimer.current = window.setTimeout(() => setLogoOn(false), 1000);
          }}
        >
          <DepoiiMark animated={logoOn} className="size-6 text-sidebar-foreground" />
          <span className={cn(fade, "text-[15px] font-semibold tracking-tight text-sidebar-foreground")}>Depoii</span>
        </NavTo>
        {!collapsed && (
          <button type="button" onClick={() => setRail(true)} title="Collapse sidebar" className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer">
            <ChevronsLeft className="size-3.5" />
          </button>
        )}
      </div>
      {collapsed && (
        <button type="button" onClick={() => setRail(false)} title="Expand sidebar" className="mx-auto my-2 rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer">
          <ChevronsRight className="size-3.5" />
        </button>
      )}

      <nav data-tour="sidebar-nav" className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-2 py-2">
        {/* Top items (Overview, Leaderboard, AI Assistant) with increased spacing */}
        <div className="flex flex-col gap-1">
          {visibleTop.map((link) => {
            const Icon = link.icon;
            if (!Icon) return null;
            if (link.disabled) {
              return (
                <div
                  key={link.label}
                  title={`${link.label} (Coming Soon)`}
                  aria-disabled="true"
                  className={cn(rowBase, "cursor-not-allowed select-none text-muted-foreground/60 hover:bg-transparent hover:text-muted-foreground/60 justify-between")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("size-[17px] shrink-0", link.label === "AI Assistant" ? "text-[#FF9C6D]" : "text-muted-foreground/60")} />
                    <span className={fade}>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className={cn(fade, "rounded-full border border-border bg-muted/60 px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground")}>
                      {link.badge}
                    </span>
                  )}
                </div>
              );
            }
            return (
              <NavTo key={link.href} href={link.href} title={link.label} className={cn(rowBase, isActive(path, link, fromParam) && rowActive)}>
                <Icon className="size-[17px] shrink-0 text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
                <span className={fade}>{link.label}</span>
              </NavTo>
            );
          })}
        </div>

        {visibleGroups.length > 0 && <div className="my-2 border-t border-sidebar-border" />}

        {visibleGroups.map((g) => renderGroup(g))}

        {navReady && me?.platformRole === "superadmin" && (
          <div className="mt-auto border-t border-sidebar-border pt-2">
            <NavTo href={adminLink.href} title={adminLink.label} className={cn(rowBase, isActive(path, adminLink, fromParam) && rowActive)}>
              <Shield className="size-[17px] shrink-0 text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
              <span className={fade}>{adminLink.label}</span>
            </NavTo>
          </div>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-2 flex flex-col gap-0.5">
        <AccountMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
