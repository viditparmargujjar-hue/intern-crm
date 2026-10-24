import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, CalendarClock, CheckCircle2, ClipboardCheck, KanbanSquare, ListTodo, Plus, Sparkles, UserRound } from "lucide-react";
import { FollowUpFormDialog } from "@/components/crm/FollowUpFormDialog";
import { demoActivities, demoFollowUps, demoLeads } from "@/lib/demo-data";

import { ConversionFunnel, StatusDonut } from "@/components/crm/DashboardCharts";
import { useCurrentUser } from "@/lib/auth";
import { ReminderWidgets } from "@/components/crm/ReminderWidgets";

import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { StatusBadge } from "@/components/crm/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  PanelHeader,
  StatCard,
} from "@/components/crm/Surfaces";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { fetchActivities, fetchCustomers, fetchFollowUps, fetchLeads } from "@/lib/crm-api";
import { formatDate, isOverdue } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Pixel Infinite CRM" },
      {
        name: "description",
        content: "See your leads, follow-ups and latest activity at a glance.",
      },
      { property: "og:title", content: "Dashboard — Pixel Infinite CRM" },
      {
        property: "og:description",
        content: "See your leads, follow-ups and latest activity at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const customers = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const followUps = useQuery({ queryKey: ["follow_ups"], queryFn: fetchFollowUps });
  const activities = useQuery({ queryKey: ["activities"], queryFn: fetchActivities });

  // Show display-only Demo Data until the workspace has real leads.
  const isDemo = leads.isSuccess && leads.data.length === 0;
  const allLeads = isDemo ? demoLeads : (leads.data ?? []);
  const allFollowUps = isDemo && !followUps.data?.length ? demoFollowUps : (followUps.data ?? []);

  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter((lead) => lead.status === "New").length;
  const activeFollowUps = allFollowUps.filter((item) => item.status === "Pending").length;
  const overdueCount = allFollowUps.filter(isOverdue).length;
  const tasks = allFollowUps.filter((f) => f.follow_up_type === "Task");
  const tasksPending = tasks.filter((t) => t.status === "Pending").length;
  const tasksDone = tasks.filter((t) => t.status === "Completed").length;
  const converted = allLeads.filter((lead) => lead.status === "Converted").length;
  const qualified = allLeads.filter((lead) => lead.status === "Qualified").length;
  const { data: me } = useCurrentUser();
  const myLeads = me ? allLeads.filter((l) => l.assigned_user_id === me.id).length : 0;

  // Trend: leads added in the last 7 days vs the 7 days before that.
  const day = 86_400_000;
  const now = Date.now();
  const ageOf = (l: { created_at: string }) => now - new Date(l.created_at).getTime();
  const last7 = allLeads.filter((l) => ageOf(l) < 7 * day).length;
  const prev7 = allLeads.filter((l) => ageOf(l) >= 7 * day && ageOf(l) < 14 * day).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const recentLeads = allLeads.slice(0, 5);
  const upcoming = allFollowUps
    .filter((item) => item.status === "Pending" && !isOverdue(item))
    .slice(0, 4);
  const recentActivities = (isDemo && !activities.data?.length ? demoActivities : (activities.data ?? [])).slice(0, 5);

  const leadNames = new Map(allLeads.map((lead) => [lead.id, lead.full_name]));
  const customerNames = new Map((customers.data ?? []).map((item) => [item.id, item.name]));

  return (
    <div className="premium-dashboard">
      <PageHeader
        title={`${greeting}, Vidit Parmar`}
        description={
          me?.role === "admin"
            ? "Workspace overview across every intern and lead."
            : `Here's your pipeline today${myLeads ? ` · ${myLeads} leads assigned to you` : ""}.`
        }
        actions={
          <>
            <LeadFormDialog
              trigger={
                <Button>
                  <Plus className="size-4" /> New lead
                </Button>
              }
            />
            <FollowUpFormDialog
              trigger={
                <Button variant="outline">
                  <ListTodo className="size-4" /> Add task
                </Button>
              }
            />
            <Button variant="outline" asChild>
              <Link to="/pipeline">
                <KanbanSquare className="size-4" /> Update status
              </Link>
            </Button>
          </>
        }
      />

      {isDemo ? (
        <div className="bg-status-followup/10 text-status-followup mb-4 flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-xs font-medium">
          <span className="bg-status-followup text-background rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
            Demo Data
          </span>
          Sample records for preview only — they disappear once you add your first lead.
        </div>
      ) : null}

      <section className="dashboard-stats mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="Total Leads"
          value={leads.isPending ? "—" : totalLeads}
          icon={<UserRound className="size-4" />}
          tone="brand"
          trend={leads.isPending ? undefined : { value: last7 - prev7, label: "vs last week" }}
        />
        <StatCard
          label="New Leads"
          value={leads.isPending ? "—" : newLeads}
          hint={`${last7} added this week`}
          icon={<Sparkles className="size-4" />}
          tone="glow"
        />
        <StatCard
          label="Qualified Leads"
          value={leads.isPending ? "—" : qualified}
          hint="Ready for a proposal"
          icon={<BadgeCheck className="size-4" />}
          tone="followup"
        />
        <StatCard
          label="Converted Leads"
          value={leads.isPending ? "—" : converted}
          hint={totalLeads ? `${Math.round((converted / totalLeads) * 100)}% conversion` : undefined}
          icon={<CheckCircle2 className="size-4" />}
          tone="converted"
        />
        <StatCard
          label="Pending Follow-ups"
          value={followUps.isPending ? "—" : activeFollowUps}
          hint={overdueCount > 0 ? `${overdueCount} overdue` : "All on track"}
          icon={<CalendarClock className="size-4" />}
          tone="lost"
        />
        <StatCard
          label="Tasks Pending"
          value={followUps.isPending ? "—" : tasksPending}
          hint="Open to-dos"
          icon={<ListTodo className="size-4" />}
          tone="followup"
        />
        <StatCard
          label="Tasks Completed"
          value={followUps.isPending ? "—" : tasksDone}
          hint="Nicely done"
          icon={<ClipboardCheck className="size-4" />}
          tone="converted"
        />
      </section>

      <ReminderWidgets />

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <PanelHeader title="Lead Status Distribution" />
          {leads.isPending ? (
            <LoadingRows rows={3} />
          ) : totalLeads === 0 ? (
            <EmptyState title="No data yet" description="Charts appear once you add leads." />
          ) : (
            <StatusDonut leads={allLeads} />
          )}
        </Panel>
        <Panel className="p-5">
          <PanelHeader title="Lead Conversion" />
          {leads.isPending ? (
            <LoadingRows rows={3} />
          ) : totalLeads === 0 ? (
            <EmptyState title="No data yet" description="Charts appear once you add leads." />
          ) : (
            <ConversionFunnel leads={allLeads} />
          )}
        </Panel>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <PanelHeader
            title="Recent Leads"
            action={
              <Link to="/leads" className="text-brand text-xs font-medium">
                View all →
              </Link>
            }
          />
          {leads.isPending ? (
            <LoadingRows />
          ) : leads.isError ? (
            <ErrorState message={(leads.error as Error).message} />
          ) : recentLeads.length === 0 ? (
            <EmptyState
              title="No leads yet"
              description="Add your first lead to start tracking your pipeline."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border/70 border-b text-left text-[11px] tracking-wider uppercase">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Company</th>
                    <th className="hidden pb-2 font-medium sm:table-cell">Source</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="hidden pb-2 font-medium md:table-cell">Priority</th>
                    <th className="pb-2 text-right font-medium">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted">
                      <td className="py-3 font-medium">
                        {isDemo ? (
                          lead.full_name
                        ) : (
                          <Link to="/leads/$id" params={{ id: lead.id }} className="hover:underline">
                            {lead.full_name}
                          </Link>
                        )}
                        {lead.email ? <span className="text-muted-foreground block text-[11px] font-normal">{lead.email}</span> : null}
                      </td>
                      <td className="text-muted-foreground py-3">{lead.company_name ?? "—"}</td>
                      <td className="text-muted-foreground hidden py-3 sm:table-cell">
                        {lead.lead_source ?? "—"}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="hidden py-3 md:table-cell">
                        <StatusBadge status={lead.priority} />
                      </td>
                      <td className="text-muted-foreground py-3 text-right">
                        {formatDate(lead.next_follow_up)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <PanelHeader
            title="Upcoming Follow-ups"
            action={
              <Link to="/follow-ups" className="text-brand text-xs font-medium">
                All →
              </Link>
            }
          />
          {followUps.isPending ? (
            <LoadingRows rows={3} />
          ) : followUps.isError ? (
            <ErrorState message={(followUps.error as Error).message} />
          ) : upcoming.length === 0 ? (
            <EmptyState
              title="Nothing scheduled"
              description="Schedule a follow-up from a lead or from the Follow-ups page."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map((item) => (
                <div key={item.id} className="bg-muted/40 hover:bg-muted rounded-lg border p-3 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {item.follow_up_type} ·{" "}
                      {item.lead_id
                        ? (leadNames.get(item.lead_id) ?? "Lead")
                        : (customerNames.get(item.customer_id ?? "") ?? "Customer")}
                    </p>
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      {formatDate(item.follow_up_date)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="text-muted-foreground mt-1 text-xs">{item.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel className="p-5">
        <PanelHeader
          title="Recent Activities"
          action={
            <Link to="/activities" className="text-brand text-xs font-medium">
              Full timeline →
            </Link>
          }
        />
        {activities.isPending ? (
          <LoadingRows rows={3} />
        ) : activities.isError ? (
          <ErrorState message={(activities.error as Error).message} />
        ) : (
          <ActivityTimeline activities={recentActivities} />
        )}
      </Panel>
    </div>
  );
}
