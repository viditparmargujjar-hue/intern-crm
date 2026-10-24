import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Loader2, Mail, Phone, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAssigneeName, useProfiles } from "@/components/crm/AssigneeSelect";
import { FollowUpFormDialog } from "@/components/crm/FollowUpFormDialog";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { ErrorState, Panel } from "@/components/crm/Surfaces";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/lib/auth";
import { fetchPipelineLeads, moveLeadStatus, type PipelineFilters } from "@/lib/crm-api";
import { formatDate, LEAD_SOURCES, PIPELINE_STAGES, PRIORITIES, type Lead } from "@/lib/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "Lead Pipeline — Pixel Infinite CRM" },
      { name: "description", content: "Drag leads through every stage of your sales pipeline." },
      { property: "og:title", content: "Lead Pipeline — Pixel Infinite CRM" },
      { property: "og:description", content: "Drag leads through every stage of your sales pipeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PipelinePage,
});

const emptyFilters: PipelineFilters = { search: "", assignee: "all", source: "all", priority: "all", followUp: "any", status: "all" };

function PipelinePage() {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: profiles } = useProfiles();
  const nameOf = useAssigneeName();
  const [filters, setFilters] = useState<PipelineFilters>(emptyFilters);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const key = ["pipeline", filters] as const;
  const leads = useQuery({ queryKey: key, queryFn: () => fetchPipelineLeads(filters), placeholderData: (p) => p });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const move = useMutation({
    mutationFn: ({ lead, to }: { lead: Lead; to: string }) => moveLeadStatus(lead, to),
    onMutate: async ({ lead, to }) => {
      setPendingId(lead.id);
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const previous = queryClient.getQueryData<Lead[]>(key);
      queryClient.setQueryData<Lead[]>(key, (old) => old?.map((l) => (l.id === lead.id ? { ...l, status: to } : l)));
      return { previous };
    },
    onError: (error: Error, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous); // put the card back
      toast.error(error.message || "Could not move the lead");
    },
    onSuccess: (_d, { to }) => toast.success(`Moved to ${to}`),
    onSettled: () => {
      setPendingId(null);
      queryClient.invalidateQueries();
    },
  });

  function requestMove(lead: Lead, to: string) {
    if (move.isPending || lead.status === to) return; // one update at a time
    move.mutate({ lead, to });
  }

  function onDragEnd(e: DragEndEvent) {
    const lead = (leads.data ?? []).find((l) => l.id === e.active.id);
    if (lead && e.over) requestMove(lead, String(e.over.id));
  }

  const set = (k: keyof PipelineFilters, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const active = JSON.stringify(filters) !== JSON.stringify(emptyFilters);
  const stages = filters.status === "all" ? PIPELINE_STAGES : PIPELINE_STAGES.filter((s) => s === filters.status);
  const all = leads.data ?? [];

  return (
    <div>
      <PageHeader
        title="Lead Pipeline"
        description={`${all.length} leads${me?.role === "admin" ? " across the team" : " assigned to you"}. Drag a card or use its stage menu.`}
        actions={
          <FollowUpFormDialog trigger={<Button><Plus className="mr-1 size-4" /> Schedule follow-up</Button>} />
        }
      />

      <Panel className="mb-5 p-4">
        <div className="relative mb-3">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Search name, email, phone or company…" aria-label="Search leads" value={filters.search} onChange={(e) => set("search", e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {me?.role === "admin" ? (
            <FilterSelect label="Assigned intern" value={filters.assignee} onChange={(v) => set("assignee", v)}
              options={[["all", "All interns"], ["unassigned", "Unassigned"], ...(profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? ""] as [string, string])]} />
          ) : null}
          <FilterSelect label="Source" value={filters.source} onChange={(v) => set("source", v)} options={[["all", "All sources"], ...LEAD_SOURCES.map((s) => [s, s] as [string, string])]} />
          <FilterSelect label="Priority" value={filters.priority} onChange={(v) => set("priority", v)} options={[["all", "All priorities"], ...PRIORITIES.map((s) => [s, s] as [string, string])]} />
          <FilterSelect label="Follow-up date" value={filters.followUp} onChange={(v) => set("followUp", v)}
            options={[["any", "Any follow-up date"], ["overdue", "Overdue"], ["today", "Today"], ["week", "Next 7 days"], ["none", "No follow-up set"]]} />
          <FilterSelect label="Status" value={filters.status} onChange={(v) => set("status", v)} options={[["all", "All stages"], ...PIPELINE_STAGES.map((s) => [s, s] as [string, string])]} />
        </div>
        {active ? (
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setFilters(emptyFilters)}>
            <X className="mr-1 size-4" /> Clear all filters
          </Button>
        ) : null}
      </Panel>

      {leads.isError ? (
        <ErrorState message={(leads.error as Error).message} />
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
            {stages.map((stage) => {
              const items = all.filter((l) => l.status === stage);
              return (
                <Column key={stage} stage={stage} count={items.length} loading={leads.isLoading}>
                  {items.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} owner={nameOf(lead.assigned_user_id, lead.assigned_to)} saving={pendingId === lead.id} disabled={move.isPending} onMove={(to) => requestMove(lead, to)} />
                  ))}
                </Column>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Column({ stage, count, loading, children }: { stage: string; count: number; loading: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section ref={setNodeRef} aria-label={`${stage} stage`} className={cn("bg-muted/40 flex w-[280px] shrink-0 snap-start flex-col rounded-xl border p-2.5 transition-colors", isOver && "border-brand bg-brand/5")}>
      <header className="mb-2.5 flex items-center justify-between px-1">
        <StatusBadge status={stage} />
        <span className="text-muted-foreground text-xs font-semibold tabular-nums">{count}</span>
      </header>
      <div className="flex min-h-24 flex-col gap-2.5">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </>
        ) : count === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">No leads here</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function LeadCard({ lead, owner, saving, disabled, onMove }: { lead: Lead; owner: string; saving: boolean; disabled: boolean; onMove: (to: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, disabled });
  const overdue = lead.next_follow_up && lead.next_follow_up < new Date().toISOString().slice(0, 10);
  return (
    <article
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn("bg-card shadow-glass relative cursor-grab rounded-lg border p-3 text-sm active:cursor-grabbing", isDragging && "z-10 opacity-80 ring-2 ring-brand", saving && "opacity-70")}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable lead card"
    >
      {saving ? <Loader2 className="text-muted-foreground absolute top-3 right-3 size-4 animate-spin" aria-label="Saving" /> : null}
      <Link to="/leads/$id" params={{ id: lead.id }} className="font-semibold hover:underline" onPointerDown={(e) => e.stopPropagation()}>
        {lead.full_name}
      </Link>
      {lead.company_name ? <p className="text-muted-foreground text-xs">{lead.company_name}</p> : null}
      <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
        {lead.email ? <p className="flex items-center gap-1.5 truncate"><Mail className="size-3" />{lead.email}</p> : null}
        {lead.phone ? <p className="flex items-center gap-1.5"><Phone className="size-3" />{lead.phone}</p> : null}
        <p className={cn("flex items-center gap-1.5", overdue && "text-status-lost font-medium")}>
          <CalendarClock className="size-3" />{lead.next_follow_up ? formatDate(lead.next_follow_up) : "No follow-up"}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={lead.priority} />
        {lead.lead_source ? <span className="bg-muted rounded-full px-2 py-0.5 text-[11px]">{lead.lead_source}</span> : null}
      </div>
      <p className="text-muted-foreground mt-2 text-[11px]">Owner: <span className="text-foreground font-medium">{owner}</span></p>
      <div className="mt-2 flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Select value={lead.status} onValueChange={onMove} disabled={disabled}>
          <SelectTrigger className="h-8 flex-1 text-xs" aria-label={`Change stage for ${lead.full_name}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <FollowUpFormDialog fixedLeadId={lead.id} trigger={<Button size="icon" variant="outline" className="size-8" aria-label={`Schedule follow-up for ${lead.full_name}`}><CalendarClock className="size-4" /></Button>} />
      </div>
    </article>
  );
}
