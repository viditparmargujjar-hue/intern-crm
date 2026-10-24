import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { supabase } from "@/integrations/supabase/client";
import { getApprovalStatus } from "@/lib/auth";
import { setDateFormat } from "@/lib/crm";
import { usePreferences } from "@/lib/preferences";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const status = await getApprovalStatus(data.user.id);
    if (status !== "admin" && status !== "approved") {
      // Pending or rejected interns cannot enter the CRM.
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AppShell,
});

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { preferences } = usePreferences();
  // Apply the user's preferred date format app-wide.
  useEffect(() => setDateFormat(preferences.dateFormat), [preferences.dateFormat]);
  return (
    <div className={`bg-background flex min-h-screen ${pathname === "/" || pathname === "/admin" ? "premium-workspace" : ""}`}>
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <MobileNav />
        <main key={pathname} className="animate-page mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
