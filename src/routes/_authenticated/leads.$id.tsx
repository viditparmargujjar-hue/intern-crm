import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Download, CalendarPlus, CheckCircle2, Pencil, StickyNote, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { BusyIcon, ExportMenu } from "@/components/crm/ExportMenu";
import { sanitizeFilename } from "@/lib/leads-export";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { AddNoteDialog } from "@/components/crm/AddNoteDialog";
import { FollowUpFormDialog } from "@/components/crm/FollowUpFormDialog";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { StatusBadge } from "@/components/crm/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  PanelHeader,
} from "@/components/crm/Surfaces";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  changeLeadStatus,
  convertLeadToCustomer,
  fetchActivities,
  fetchFollowUps,
  fetchLead,
  fetchLeadAssignments,
} from "@/lib/crm-api";
import { useProfiles } from "@/components/crm/AssigneeSelect";
import { AvatarChip } from "@/components/crm/InternMultiSelect";
import { formatDate, formatDateTime } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({
    meta: [
      { title: "Lead details — Pixel Infinite CRM" },
      { name: "description", content: "Contact details, notes, follow-ups and activity history." },
      { property: "og:title", content: "Lead details — Pixel Infinite CRM" },
      {
        property: "og:description",
        content: "Contact details, notes, follow-ups and activity history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => fetchLead(id) });
  const followUps = useQuery({ queryKey: ["follow_ups"], queryFn: fetchFollowUps });
  const activities = useQuery({ queryKey: ["activities"], queryFn: fetchActivities });
  const assignments = useQuery({ queryKey: ["lead_assignments"], queryFn: fetchLeadAssignments });
  const { data: profiles } = useProfiles();

  const convert = useMutation({
    mutationFn: () => convertLeadToCustomer(lead.data!),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Lead converted to a customer");
    },
    onError: (error: Error) => toast.error(error.message || "Could not convert the lead"),
  });

  const markLost = useMutation({
    mutationFn: () => changeLeadStatus(lead.data!, "Lost"),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Lead marked as lost");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update the lead"),
  });

  if (lead.isPending) {
    return <LoadingRows rows={5} />;
  }
  if (lead.isError || !lead.data) {
    return <ErrorState message={(lead.error as Error | null)?.message ?? "Lead not found."} />;
  }

  const current = lead.data;
  const leadFollowUps = (followUps.data ?? []).filter((item) => item.lead_id === current.id);
  const leadActivities = (activities.data ?? []).filter((item) => item.lead_id === current.id);
  const profileName = (uid: string) =>
    (profiles ?? []).find((p) => p.id === uid)?.full_name ??
    (profiles ?? []).find((p) => p.id === uid)?.email ??
    "Unknown";
  const sharedIds = (assignments.data ?? [])
    .filter((a) => a.lead_id === current.id && a.user_id !== current.assigned_user_id)
    .map((a) => a.user_id);

  return (
    <>
      <Link
        to="/leads"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to leads
      </Link>

      <PageHeader
        title={current.full_name}
        description={current.company_name ?? "No company on file"}
        actions={
          <>
            <ExportMenu
              baseName={`lead_${sanitizeFilename(current.full_name)}`}
              title={`Lead: ${current.full_name}`}
              getLeads={() => [current]}
              trigger={(busy) => (
                <Button variant="outline">
                  <BusyIcon busy={busy} icon={<Download className="size-4" />} /> Download
                </Button>
              )}
            />
            <LeadFormDialog
              lead={current}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" /> Edit lead
                </Button>
              }
            />
            <AddNoteDialog
              leadId={current.id}
              trigger={
                <Button variant="outline">
                  <StickyNote className="size-4" /> Add note
                </Button>
              }
            />
            <FollowUpFormDialog
              fixedLeadId={current.id}
              trigger={
                <Button variant="outline">
                  <CalendarPlus className="size-4" /> Schedule follow-up
                </Button>
              }
            />
            {current.status !== "Converted" ? (
              <Button onClick={() => convert.mutate()} disabled={convert.isPending}>
                <CheckCircle2 className="size-4" /> Convert to customer
              </Button>
            ) : null}
            {current.status !== "Lost" ? (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => markLost.mutate()}
                disabled={markLost.isPending}
              >
                <XCircle className="size-4" /> Mark as lost
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          <PanelHeader title="Contact information" />
          <dl className="space-y-3 text-sm">
            <Row label="Email" value={current.email ?? "—"} />
            <Row label="Phone" value={current.phone ?? "—"} />
            <Row label="Assigned to" value={current.assigned_to ?? "—"} />
            <Row label="Created" value={formatDateTime(current.created_at)} />
          </dl>
        </Panel>

        <Panel className="p-5">
          <PanelHeader title="Company information" />
          <dl className="space-y-3 text-sm">
            <Row label="Company" value={current.company_name ?? "—"} />
            <Row label="Lead source" value={current.lead_source ?? "—"} />
            <Row label="Next follow-up" value={formatDate(current.next_follow_up)} />
          </dl>
        </Panel>

        <Panel className="p-5">
          <PanelHeader title="Team" />
          <dl className="space-y-3 text-sm">
            <Row
              label="Owner"
              value={current.assigned_user_id ? profileName(current.assigned_user_id) : (current.assigned_to ?? "—")}
            />
          </dl>
          <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <Users className="size-3.5" /> Shared with
          </p>
          {sharedIds.length === 0 ? (
            <p className="text-muted-foreground mt-1 text-sm">Not shared with anyone else.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sharedIds.map((uid) => (
                <AvatarChip key={uid} name={profileName(uid)} />
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <PanelHeader title="Current status" />
          <StatusBadge status={current.status} />
          <p className="text-muted-foreground mt-4 text-xs font-medium tracking-wide uppercase">
            Notes
          </p>
          <p className="mt-1 text-sm whitespace-pre-line">{current.notes ?? "No notes yet."}</p>
        </Panel>

        <Panel className="p-5 lg:col-span-1">
          <PanelHeader title="Follow-up history" />
          {followUps.isPending ? (
            <LoadingRows rows={3} />
          ) : leadFollowUps.length === 0 ? (
            <EmptyState
              title="No follow-ups"
              description="Schedule one so you remember the next step."
            />
          ) : (
            <ul className="space-y-3">
              {leadFollowUps.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.follow_up_type}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDate(item.follow_up_date)}
                    {item.description ? ` · ${item.description}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="p-5 lg:col-span-2">
          <PanelHeader title="Activity history" />
          {activities.isPending ? (
            <LoadingRows rows={3} />
          ) : (
            <ActivityTimeline activities={leadActivities} />
          )}
        </Panel>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right text-sm font-medium break-all">{value}</dd>
    </div>
  );
}
