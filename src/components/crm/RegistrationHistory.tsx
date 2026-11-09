import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, RotateCcw } from "lucide-react";
import { useState } from "react";

import { ErrorState, LoadingRows } from "@/components/crm/Surfaces";
import { FormField } from "@/components/crm/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listRegistrationHistory } from "@/lib/admin.functions";
import { formatDateTime } from "@/lib/crm";
import { EMPTY_HISTORY_FILTERS, filterRegistrationHistory, reviewerKey } from "@/lib/registration-history";

export function RegistrationHistory({ id, name }: { id: string; name: string | null }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_HISTORY_FILTERS);
  const fetchHistory = useServerFn(listRegistrationHistory);
  const history = useQuery({
    queryKey: ["registration-history", id],
    queryFn: () => fetchHistory({ data: { id } }),
    enabled: open,
  });
  const entries = history.data ?? [];
  const filtered = filterRegistrationHistory(entries, filters);
  const admins = Array.from(new Map(entries.map((entry) => [reviewerKey(entry), entry])).entries());
  const hasFilters = filters.admin !== "all" || filters.outcome !== "all" || !!filters.from || !!filters.to;
  const invalidRange = !!filters.from && !!filters.to && filters.from > filters.to;

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setFilters(EMPTY_HISTORY_FILTERS); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Review history" aria-label={`Review history for ${name ?? "intern"}`}>
          <History className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Review history</DialogTitle>
          <DialogDescription className="break-words">{name ?? "Intern registration"}</DialogDescription>
        </DialogHeader>
        {history.isPending ? <LoadingRows rows={2} /> : history.isError ? (
          <div className="space-y-3">
            <ErrorState message="Review history couldn't be loaded." />
            <Button variant="outline" onClick={() => history.refetch()}>Try again</Button>
          </div>
        ) : history.data.length === 0 ? (
          <p className="text-muted-foreground py-6 text-sm">No recorded reviews for this registration.</p>
        ) : (
          <>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Admin" htmlFor={`history-admin-${id}`}>
              <Select value={filters.admin} onValueChange={(admin) => setFilters((prev) => ({ ...prev, admin }))}>
                <SelectTrigger id={`history-admin-${id}`} className="min-w-0" aria-label="Filter by admin"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All admins</SelectItem>
                  {admins.map(([key, entry]) => <SelectItem key={key} value={key}>{[entry.reviewer_name, entry.reviewer_email].filter(Boolean).join(" · ") || "Reviewer unavailable"}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Outcome" htmlFor={`history-outcome-${id}`}>
              <Select value={filters.outcome} onValueChange={(outcome) => setFilters((prev) => ({ ...prev, outcome }))}>
                <SelectTrigger id={`history-outcome-${id}`} aria-label="Filter by outcome"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outcomes</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="From" htmlFor={`history-from-${id}`}>
              <Input id={`history-from-${id}`} type="date" className="min-w-0" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} />
            </FormField>
            <FormField label="To" htmlFor={`history-to-${id}`}>
              <Input id={`history-to-${id}`} type="date" className="min-w-0" value={filters.to} aria-invalid={invalidRange} aria-describedby={invalidRange ? `history-range-error-${id}` : undefined} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} />
            </FormField>
          </div>
          {invalidRange ? <p id={`history-range-error-${id}`} role="alert" className="text-destructive text-xs">End date must be on or after start date.</p> : null}
          <div className="flex items-center justify-between gap-2">
            <p role="status" aria-live="polite" className="text-muted-foreground text-xs">{filtered.length} of {entries.length} {entries.length === 1 ? "decision" : "decisions"}</p>
            <Button variant="ghost" size="sm" disabled={!hasFilters} onClick={() => setFilters(EMPTY_HISTORY_FILTERS)}><RotateCcw className="size-3.5" />Clear filters</Button>
          </div>
          {!filtered.length ? <p className="text-muted-foreground py-6 text-center text-sm">{invalidRange ? "Choose a valid date range." : "No decisions match these filters."}</p> : (
          <ol className="divide-border divide-y">
            {filtered.map((entry) => (
              <li key={entry.id} className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.status === "approved" ? "default" : "destructive"} className="capitalize">{entry.status}</Badge>
                  <time dateTime={entry.reviewed_at} className="text-muted-foreground text-xs">{formatDateTime(entry.reviewed_at)}</time>
                </div>
                <p className="break-words text-sm font-medium">{entry.reviewer_name || entry.reviewer_email || "Reviewer unavailable"}</p>
                {entry.reviewer_name && entry.reviewer_email ? <p className="text-muted-foreground break-all text-xs">{entry.reviewer_email}</p> : null}
                {entry.previous_status ? <p className="text-muted-foreground text-xs capitalize">{entry.previous_status} → {entry.status}</p> : null}
                {entry.historical ? <p className="text-muted-foreground text-xs">Previously recorded review. Earlier decisions were not tracked.</p> : null}
              </li>
            ))}
          </ol>
          )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}