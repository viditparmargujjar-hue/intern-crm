import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, Eye, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BusyIcon, ExportMenu } from "@/components/crm/ExportMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/crm/ConfirmDialog";
import { InternMultiSelect } from "@/components/crm/InternMultiSelect";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { EmptyState, ErrorState, LoadingRows, Panel } from "@/components/crm/Surfaces";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/lib/auth";
import { bulkAssignLeads, deleteLead, fetchLeadAssignments, fetchLeads } from "@/lib/crm-api";
import { LEAD_STATUSES, formatDate } from "@/lib/crm";
import { sanitizeFilename } from "@/lib/leads-export";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({
    meta: [
      { title: "Leads — Pixel Infinite CRM" },
      { name: "description", content: "Add, search, filter and manage every lead in one table." },
      { property: "og:title", content: "Leads — Pixel Infinite CRM" },
      {
        property: "og:description",
        content: "Add, search, filter and manage every lead in one table.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const PAGE_SIZE = 10;

  const { data: me } = useCurrentUser();
  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const assignments = useQuery({ queryKey: ["lead_assignments"], queryFn: fetchLeadAssignments });

  const remove = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Lead deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete the lead"),
  });

  const bulkAssign = useMutation({
    mutationFn: () => bulkAssignLeads([...selected], assignIds),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(`Shared ${selected.size} lead${selected.size === 1 ? "" : "s"} with ${assignIds.length} intern${assignIds.length === 1 ? "" : "s"}`);
      setAssignOpen(false);
      setAssignIds([]);
      setSelected(new Set());
    },
    onError: (error: Error) => toast.error(error.message || "Could not assign the leads"),
  });

  /** Number of extra interns a lead is shared with. */
  const sharedCount = (leadId: string) =>
    (assignments.data ?? []).filter((a) => a.lead_id === leadId).length;

  const term = search.trim().toLowerCase();
  const visible = (leads.data ?? []).filter((lead) => {
    const matchesStatus = status === "All" || lead.status === status;
    const matchesSearch =
      term.length === 0 ||
      [lead.full_name, lead.company_name, lead.email, lead.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });
  const filtered = term.length > 0 || status !== "All";
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const all = leads.data ?? [];
  const selectedLeads = all.filter((l) => selected.has(l.id));
  const allVisibleSelected = visible.length > 0 && visible.every((l) => selected.has(l.id));
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const selectAll = () => setSelected(new Set([...selected, ...visible.map((l) => l.id)]));
  const deselectAll = () => setSelected(new Set());

  return (
    <>
      <PageHeader
        title="Leads"
        description="Everyone you are talking to, with their current status."
        actions={
          <>
            <ExportMenu
              disabled={all.length === 0}
              label={filtered ? "Export filtered leads" : "Export all leads"}
              baseName={filtered ? "filtered_leads" : "all_leads"}
              title={filtered ? "Filtered leads" : "All leads"}
              getLeads={() => (filtered ? visible : all)}
              trigger={(busy) => (
                <Button variant="outline">
                  <BusyIcon busy={busy} icon={<Download className="size-4" />} />
                  {filtered ? "Export filtered" : "Export all leads"}
                </Button>
              )}
            />
            <LeadFormDialog
              trigger={
                <Button>
                  <Plus className="size-4" /> Add lead
                </Button>
              }
            />
          </>
        }
      />

      <Panel className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search by name, company, email or phone"
              className="bg-muted/40 pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-muted/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              {LEAD_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {all.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {selected.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={selectAll} disabled={visible.length === 0}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll} disabled={selected.size === 0}>
              Deselect all
            </Button>
            {me?.role === "admin" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={selected.size === 0}
                onClick={() => setAssignOpen(true)}
              >
                <Users className="size-4" /> Assign to interns
              </Button>
            ) : null}
            <ExportMenu
              disabled={selected.size === 0}
              label="Download selected as"
              baseName="selected_leads"
              title="Selected leads"
              getLeads={() => selectedLeads}
              trigger={(busy) => (
                <Button size="sm" variant="outline">
                  <BusyIcon busy={busy} icon={<Download className="size-4" />} />
                  Download selected
                </Button>
              )}
            />
          </div>
        ) : null}

        {leads.isPending ? (
          <LoadingRows rows={6} />
        ) : leads.isError ? (
          <ErrorState message={(leads.error as Error).message} />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No leads found"
            description="Try a different search or status filter, or add a new lead."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border/70 border-b text-left text-[11px] tracking-wider uppercase">
                  <th className="w-8 pb-2">
                    <Checkbox
                      aria-label="Select all leads"
                      checked={allVisibleSelected}
                      onCheckedChange={(v) => (v ? selectAll() : deselectAll())}
                    />
                  </th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="hidden pb-2 font-medium md:table-cell">Company</th>
                  <th className="hidden pb-2 font-medium lg:table-cell">Source</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="hidden pb-2 font-medium sm:table-cell">Next follow-up</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border/70 divide-y">
                {pageRows.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted">
                    <td className="py-3">
                      <Checkbox
                        aria-label={`Select ${lead.full_name}`}
                        checked={selected.has(lead.id)}
                        onCheckedChange={(v) => toggle(lead.id, v === true)}
                      />
                    </td>
                    <td className="py-3">
                      <Link
                        to="/leads/$id"
                        params={{ id: lead.id }}
                        className="font-medium hover:underline"
                      >
                        {lead.full_name}
                      </Link>
                      <p className="text-muted-foreground text-xs">{lead.email ?? "—"}</p>
                      {sharedCount(lead.id) > 0 ? (
                        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px]">
                          <Users className="size-3" /> Shared with {sharedCount(lead.id)} intern{sharedCount(lead.id) === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-muted-foreground hidden py-3 md:table-cell">
                      {lead.company_name ?? "—"}
                    </td>
                    <td className="text-muted-foreground hidden py-3 lg:table-cell">
                      {lead.lead_source ?? "—"}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="text-muted-foreground hidden py-3 sm:table-cell">
                      {formatDate(lead.next_follow_up)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label="View lead">
                          <Link to="/leads/$id" params={{ id: lead.id }}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <ExportMenu
                          baseName={`lead_${sanitizeFilename(lead.full_name)}`}
                          title={`Lead: ${lead.full_name}`}
                          getLeads={() => [lead]}
                          trigger={(busy) => (
                            <Button variant="ghost" size="icon" aria-label="Download lead">
                              <BusyIcon busy={busy} icon={<Download className="size-4" />} />
                            </Button>
                          )}
                        />
                        <LeadFormDialog
                          lead={lead}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Edit lead">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          title="Delete this lead?"
                          description={`${lead.full_name} and their follow-ups and activities will be removed. This cannot be undone.`}
                          onConfirm={() => remove.mutate(lead.id)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete lead"
                              className="text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t px-1 pt-4 text-xs">
              <span>
                Showing {visible.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                {Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length} leads
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </Button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant={n === currentPage ? "default" : "ghost"}
                    size="sm"
                    className="w-8 px-0"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                ))}
                <Button variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign {selected.size} lead{selected.size === 1 ? "" : "s"} to interns</DialogTitle>
            <DialogDescription>
              Selected interns gain access to every checked lead. Existing assignments are kept.
            </DialogDescription>
          </DialogHeader>
          <InternMultiSelect value={assignIds} onChange={setAssignIds} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={assignIds.length === 0 || bulkAssign.isPending}
              onClick={() => bulkAssign.mutate()}
            >
              {bulkAssign.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
