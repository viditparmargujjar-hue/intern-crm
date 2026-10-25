import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingRows, Panel, PanelHeader } from "@/components/crm/Surfaces";
import { isAdmin } from "@/lib/auth";
import { listAccounts, listRegistrations } from "@/lib/admin.functions";
import { formatDate, isOverdue } from "@/lib/crm";
import { useState } from "react";
import { CalendarClock, ClipboardCheck, Hourglass, Search, UserCheck, UserRound, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/crm/Surfaces";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { fetchActivities, fetchFollowUps, fetchLeads } from "@/lib/crm-api";
import { demoActivities, demoFollowUps, demoLeads } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    // Interns are sent back to their dashboard.
    if (!(await isAdmin(context.user.id))) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Admin Panel — Pixel Infinite CRM" },
      { name: "description", content: "Manage intern accounts in Pixel Infinite CRM." },
      { property: "og:title", content: "Admin Panel — Pixel Infinite CRM" },
      { property: "og:description", content: "Manage intern accounts in Pixel Infinite CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const fetchAccounts = useServerFn(listAccounts);
  const accounts = useQuery({ queryKey: ["admin-accounts"], queryFn: () => fetchAccounts() });
  const fetchRegs = useServerFn(listRegistrations);
  const regs = useQuery({ queryKey: ["registrations"], queryFn: () => fetchRegs() });
  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const followUps = useQuery({ queryKey: ["follow_ups"], queryFn: fetchFollowUps });
  const activities = useQuery({ queryKey: ["activities"], queryFn: fetchActivities });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  // Display-only Demo Data while the workspace has no real leads.
  const isDemo = leads.isSuccess && leads.data.length === 0;
  const allLeads = isDemo ? demoLeads : (leads.data ?? []);
  const allFu = isDemo && !followUps.data?.length ? demoFollowUps : (followUps.data ?? []);
  const acts = (isDemo && !activities.data?.length ? demoActivities : (activities.data ?? [])).slice(0, 6);

  const regByUser = new Map((regs.data ?? []).map((r) => [r.user_id, r.status]));
  const interns = (accounts.data ?? []).filter((a) => a.role === "intern");
  const pending = (regs.data ?? []).filter((r) => r.status === "pending").length;
  const active = interns.filter((i) => regByUser.get(i.id) === "approved").length;
  const dash = (q: { isPending: boolean }, v: number) => (q.isPending ? "—" : v);

  const q = search.trim().toLowerCase();
  const visible = (accounts.data ?? []).filter((a) => {
    const status = a.role === "admin" ? "admin" : (regByUser.get(a.id) ?? "pending");
    if (statusFilter !== "all" && status !== statusFilter) return false;
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });
  const detail = (accounts.data ?? []).find((a) => a.id === selected);
  const detailLeads = detail ? allLeads.filter((l) => l.assigned_user_id === detail.id) : [];

  return (
    <div className="premium-dashboard premium-admin space-y-6">
      <PageHeader title="Admin Panel" description="All CRM accounts and their roles." />
      {isDemo ? (
        <p className="text-muted-foreground text-xs">
          <span className="bg-status-followup text-background mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">Demo Data</span>
          Lead, task and activity figures use sample records until real leads exist.
        </p>
      ) : null}
      <section className="dashboard-stats grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Interns" value={dash(accounts, interns.length)} icon={<Users className="size-4" />} tone="brand" />
        <StatCard label="Pending Approvals" value={dash(regs, pending)} hint={pending ? "Needs review" : "All clear"} icon={<Hourglass className="size-4" />} tone="followup" />
        <StatCard label="Active Interns" value={dash(regs, active)} icon={<UserCheck className="size-4" />} tone="converted" />
        <StatCard label="Total Leads" value={dash(leads, allLeads.length)} icon={<UserRound className="size-4" />} tone="glow" />
        <StatCard label="Follow-ups Due" value={dash(followUps, allFu.filter((f) => f.status === "Pending" && (isOverdue(f) || new Date(f.due_at).getTime() - Date.now() < 2 * 86_400_000)).length)} hint="Overdue or within 48h" icon={<CalendarClock className="size-4" />} tone="lost" />
        <StatCard label="Completed Tasks" value={dash(followUps, allFu.filter((f) => f.status === "Completed").length)} icon={<ClipboardCheck className="size-4" />} tone="converted" />
      </section>
      <Panel>
        <PanelHeader title="Accounts" />
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="pl-9" aria-label="Search accounts" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className="border-input bg-background h-9 rounded-md border px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        {accounts.isLoading ? (
          <LoadingRows />
        ) : accounts.error ? (
          <ErrorState message={(accounts.error as Error).message} />
        ) : !visible.length ? (
          <EmptyState title="No matching accounts" description="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Joined</th>
                  <th className="py-2 pr-4">Last sign-in</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="py-2.5 pr-4 font-medium">{a.name}</td>
                    <td className="py-2.5 pr-4">{a.email}</td>
                    <td className="py-2.5 pr-4 capitalize">{a.role}</td>
                    <td className="py-2.5 pr-4">{formatDate(a.created_at)}</td>
                    <td className="py-2.5 pr-4">{a.last_sign_in_at ? formatDate(a.last_sign_in_at) : "—"}</td>
                    <td className="py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(selected === a.id ? null : a.id)}>
                        {selected === a.id ? "Hide" : "View"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {detail ? (
          <div className="bg-muted/40 mt-4 grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-4">
            <div><p className="text-muted-foreground text-xs">Name</p><p className="font-medium">{detail.name}</p></div>
            <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium break-all">{detail.email}</p></div>
            <div><p className="text-muted-foreground text-xs">Approval</p><p className="font-medium capitalize">{detail.role === "admin" ? "Admin" : (regByUser.get(detail.id) ?? "pending")}</p></div>
            <div><p className="text-muted-foreground text-xs">Assigned leads</p><p className="font-medium">{detailLeads.length}</p></div>
          </div>
        ) : null}
      </Panel>
      <Panel>
        <PanelHeader title="Recent Activity" />
        {activities.isPending ? <LoadingRows rows={3} /> : <ActivityTimeline activities={acts} />}
      </Panel>
    </div>
  );
}
