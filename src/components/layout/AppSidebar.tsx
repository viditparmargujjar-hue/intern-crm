import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity as ActivityIcon,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/layout/Logo";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { initials } from "@/lib/crm";
import { cn } from "@/lib/utils";

export const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Leads", to: "/leads", icon: UserRound },
  { label: "Lead Pipeline", to: "/pipeline", icon: KanbanSquare },
  { label: "Follow-ups", to: "/follow-ups", icon: CalendarClock },
  { label: "Activities", to: "/activities", icon: ActivityIcon },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

export function SidebarContents({
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const items =
    me?.role === "admin"
      ? [...navItems, { label: "Admin Panel", to: "/admin", icon: ShieldCheck } as const]
      : navItems;

  async function signOut() {
    const wasAdmin = me?.role === "admin";
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: wasAdmin ? "/admin/login" : "/auth", replace: true });
  }

  function isActive(to: string) {
    if (to === "/") return pathname === "/";
    return pathname.startsWith(to);
  }

  return (
    <div className={cn("flex h-full flex-col gap-1 py-5", collapsed ? "px-3" : "px-4")}>
      <div className={cn("mb-5 flex items-center gap-2.5 py-1", collapsed ? "justify-center" : "px-2")}>
        <Logo />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-none font-semibold">Pixel Infinite</p>
            <p className="text-muted-foreground mt-1 text-[11px]">
              {me?.role === "admin" ? "Admin workspace" : "Intern workspace"}
            </p>
          </div>
        ) : null}
        {!collapsed ? (
          <span className="ml-auto flex items-center">
            <ThemeSwitcher />
            <NotificationBell />
          </span>
        ) : null}
      </div>

      {!collapsed ? (
        <p className="text-muted-foreground mb-1 px-3 text-[10px] font-semibold tracking-[0.14em] uppercase">
          Menu
        </p>
      ) : null}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary text-primary-foreground shadow-glass"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {active ? (
                <span className="bg-brand absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full" />
              ) : null}
              <item.icon className="size-4 shrink-0" />
              {!collapsed ? item.label : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed ? "Collapse" : null}
          </button>
        ) : null}
        <div className={cn("bg-muted/50 rounded-xl border", collapsed ? "p-1.5" : "p-2.5")}>
          <div className={cn("flex items-center gap-2.5", collapsed && "flex-col")}>
            <div className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
              {initials(me?.name ?? "")}
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{me?.name ?? "…"}</p>
                <p className="text-muted-foreground truncate text-[11px]">{me?.email ?? ""}</p>
                {me ? (
                  <span className="bg-accent text-accent-foreground mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold">
                    {me.role === "admin" ? "Admin" : "Intern"}
                  </span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={signOut}
              aria-label="Log out"
              title="Log out"
              className="text-muted-foreground hover:bg-card hover:text-destructive rounded-lg p-1.5 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem("pi-sidebar-collapsed") === "1");
  }, []);
  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem("pi-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }
  return (
    <aside
      className={cn(
        "bg-card hidden shrink-0 border-r transition-[width] duration-200 md:block",
        collapsed ? "w-[76px]" : "w-60",
      )}
    >
      <div className="sticky top-0 h-screen">
        <SidebarContents collapsed={collapsed} onToggle={toggle} />
      </div>
    </aside>
  );
}
