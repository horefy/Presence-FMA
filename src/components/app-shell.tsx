"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  CalendarDays,
  ChartColumnBig,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Table2,
  UserCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, RESOURCES } from "@/lib/registry";
import { getIcon } from "@/components/icons";
import { initials } from "@/lib/utils";

export interface ShellUser {
  name: string;
  email: string;
  roles: { code: string; name: string }[];
  permissions: string[];
}

const SPECIAL_LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/appels", label: "Feuilles d'appel", icon: ClipboardCheck },
  { href: "/emploi-du-temps", label: "Emploi du temps", icon: CalendarDays },
  { href: "/rapports", label: "Rapports et statistiques", icon: ChartColumnBig },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

/* ------------------------------ Sidebar ---------------------------------- */

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-300 hover:bg-slate-800 hover:text-white",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarContent({
  user,
  pathname,
  onNavigate,
}: {
  user: ShellUser;
  pathname: string;
  onNavigate?: () => void;
}) {
  const can = (key: string, action = "read") =>
    user.permissions.includes("*") || user.permissions.includes(`${key}:${action}`);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Table2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Gestion Presences</p>
          <p className="truncate text-[11px] text-slate-400">Personnel &amp; Apprenants</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {/* Liens directs */}
        <div className="space-y-1">
          {SPECIAL_LINKS.map((l) => (
            <NavLink
              key={l.href}
              href={l.href}
              label={l.label}
              icon={l.icon}
              active={pathname === l.href || pathname.startsWith(`${l.href}/`)}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* Ressources du registre */}
        {NAV_GROUPS.map((group) => {
          const items = RESOURCES.filter(
            (r) => r.group === group.key && can(r.key, "read"),
          );
          if (!items.length) return null;
          return (
            <div key={group.key}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((r) => {
                  const Icon = getIcon(r.icon);
                  const href = `/${r.key}`;
                  return (
                    <NavLink
                      key={r.key}
                      href={href}
                      label={r.label}
                      icon={Icon}
                      active={pathname === href || pathname.startsWith(`${href}/`)}
                      onNavigate={onNavigate}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Utilisateur */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/profil"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-slate-800"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
            {initials(user.name.split(" ")[0], user.name.split(" ")[1])}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">
              {user.roles[0]?.name ?? "Utilisateur"}
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/login" })}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Se deconnecter
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- Shell ---------------------------------- */

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Barre laterale (desktop) */}
      <aside className="no-print hidden w-64 shrink-0 bg-slate-900 lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent user={user} pathname={pathname} />
        </div>
      </aside>

      {/* Tiroir (mobile) */}
      {open ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative h-full w-72 bg-slate-900">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              user={user}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {/* Contenu */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-slate-900">Gestion Presences</p>
          <Link
            href="/notifications"
            className="ml-auto rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            href="/profil"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Profil"
          >
            <UserCircle2 className="h-5 w-5" />
          </Link>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
