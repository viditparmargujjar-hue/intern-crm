import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/crm/ConfirmDialog";
import { FollowUpFormDialog } from "@/components/crm/FollowUpFormDialog";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { EmptyState, ErrorState, LoadingRows, Panel } from "@/components/crm/Surfaces";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  completeFollowUp,
  deleteFollowUp,
  fetchCustomers,
  fetchFollowUpAssignments,
  fetchFollowUps,
  fetchLeads,
} from "@/lib/crm-api";
import { useProfiles } from "@/components/crm/AssigneeSelect";
import { formatDateTime, isOverdue, type FollowUp } from "@/lib/crm";
import { useCurrentUser } from "@/lib/auth";
import { cancelFollowUp } from "@/lib/crm-api";
import { getReminderState, matchesReminderFilter, REMINDER_FILTERS, type ReminderFilter } from "@/lib/reminders";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — Pixel Infinite CRM" },
      { name: "description", content: "Plan, track and complete every follow-up." },
      { property: "og:title", content: "Follow-ups — Pixel Infinite CRM" },
      { property: "og:description", content: "Plan, track and complete every follow-up." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { state?: ReminderFilter | undefined; mine?: boolean | undefined } => ({
    state: REMINDER_FILTERS.includes(search["state"] as ReminderFilter) ? (search["state"] as ReminderFilter) : undefined,
    mine: search["mine"] === true || search["mine"] === "true" ? true : undefined,
  }),
  component: FollowUpsPage,
});

/** Checks a follow-up against the chosen due-date option. */
function matchesDue(followUp: FollowUp, filter: string): boolean {
  if (filter === "any") return true;
  const date = parseISO(followUp.follow_up_date);
  const today = startOfToday();
  switch (filter) {
    case "overdue":
      return isOverdue(followUp);
    case "today":
      return isSameDay(date, today);
    case "week":
      return isWithinInterval(date, { start: today, end: addDays(today, 7) });
    case "month":
      return isSameMonth(date, today);
    default:
      return true;
  }
}

function FollowUpsPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: me } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [due, setDue] = useState("any");
  const [owner, setOwner] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Follow-up whose edit dialog is open (opened by clicking a calendar chip)
  const [dialogFollowUp, setDialogFollowUp] = useState<FollowUp | null>(null);

  const followUps = useQuery({ queryKey: ["follow_ups"], queryFn: fetchFollowUps });
  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const customers = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const assignments = useQuery({ queryKey: ["follow_up_assignments"], queryFn: fetchFollowUpAssignments });
  const { data: profiles } = useProfiles();

  /** Names of the extra interns a follow-up is shared with. */
  function sharedNames(followUp: FollowUp): string[] {
    return (assignments.data ?? [])
      .filter((a) => a.follow_up_id === followUp.id && a.user_id !== followUp.assigned_user_id)
      .map((a) => (profiles ?? []).find((p) => p.id === a.user_id)?.full_name ?? "Unknown");
  }

  const complete = useMutation({
    mutationFn: completeFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Follow-up marked as completed");
    },
    onError: (error: Error) => toast.error(error.message || "Could not complete the follow-up"),
  });

  const cancel = useMutation({
    mutationFn: cancelFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Follow-up cancelled");
    },
    onError: (error: Error) => toast.error(error.message || "Could not cancel the follow-up"),
  });

  const remove = useMutation({
    mutationFn: deleteFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Follow-up deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete the follow-up"),
  });

  /** Finds the lead or customer name a follow-up belongs to. */
  function targetName(followUp: FollowUp): string {
    if (followUp.lead_id) {
      return leads.data?.find((l) => l.id === followUp.lead_id)?.full_name ?? "Unknown lead";
    }
    if (followUp.customer_id) {
      return customers.data?.find((c) => c.id === followUp.customer_id)?.name ?? "Unknown customer";
    }
    return "—";
  }

  const all = followUps.data ?? [];

  /** Everyone who currently owns at least one follow-up. */
  const owners = useMemo(
    () =>
      Array.from(new Set(all.map((f) => f.assigned_to).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [all],
  );

  const query = search.trim().toLowerCase();
  const filtersActive = Boolean(searchParams.state) || Boolean(searchParams.mine) || query !== "" || status !== "all" || due !== "any" || owner !== "all";

  const filtered = all.filter((followUp) => {
    if (searchParams.state && !matchesReminderFilter(followUp, searchParams.state)) return false;
    if (searchParams.mine && me && followUp.assigned_user_id !== me.id) return false;
    if (status !== "all") {
      if (status === "overdue") {
        if (!isOverdue(followUp)) return false;
      } else if (followUp.status !== status) {
        return false;
      }
    }
    if (!matchesDue(followUp, due)) return false;
    if (owner !== "all" && followUp.assigned_to !== owner) return false;
    if (query) {
      const haystack =
        [targetName(followUp), followUp.follow_up_type, followUp.description ?? "", followUp.assigned_to ?? ""]
          .join(" ")
          .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const overdue = filtered.filter((f) => isOverdue(f));
  const upcoming = filtered.filter((f) => f.status === "Pending" && !isOverdue(f));
  const completed = filtered.filter((f) => f.status === "Completed");
  const cancelled = filtered.filter((f) => f.status === "Cancelled");

  /** Groups the filtered follow-ups by their due date (yyyy-MM-dd). */
  const byDate = useMemo(() => {
    const map = new Map<string, FollowUp[]>();
    for (const f of filtered) {
      const key = f.follow_up_date;
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    return map;
  }, [filtered]);

  /** Every day cell shown in the current month grid (including padding days). */
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return days;
  }, [month]);

  const selectedItems = selectedDate ? (byDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []) : [];

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setDue("any");
    setOwner("all");
    navigate({ search: {} });
  }

  function targetLink(followUp: FollowUp) {
    if (followUp.lead_id) {
      return (
        <Link
          to="/leads/$id"
          params={{ id: followUp.lead_id }}
          className="text-primary font-medium hover:underline"
        >
          {targetName(followUp)}
        </Link>
      );
    }
    return <span className="font-medium">{targetName(followUp)}</span>;
  }

  function FollowUpRow({ followUp }: { followUp: FollowUp }) {
    const done = followUp.status !== "Pending";
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {targetLink(followUp)}
            <StatusBadge status={getReminderState(followUp)} />
            <StatusBadge status={followUp.priority} />
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">
            {followUp.follow_up_type} · {formatDateTime(followUp.due_at)}
            {followUp.assigned_to ? ` · ${followUp.assigned_to}` : ""}
            {sharedNames(followUp).length ? ` · shared with ${sharedNames(followUp).join(", ")}` : ""}
            {followUp.description ? ` — ${followUp.description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!done && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => complete.mutate(followUp)}
              disabled={complete.isPending}
            >
              <CheckCircle2 className="mr-1 size-4" /> Complete
            </Button>
          )}
          {!done && (
            <ConfirmDialog
              title="Cancel this follow-up?"
              description="It stays in the history as cancelled. You can reopen it by editing it."
              onConfirm={() => cancel.mutate(followUp)}
              trigger={
                <Button size="sm" variant="ghost" disabled={cancel.isPending}>
                  <X className="mr-1 size-4" /> Cancel
                </Button>
              }
            />
          )}
          <FollowUpFormDialog
            followUp={followUp}
            trigger={
              <Button size="icon" variant="ghost" aria-label="Edit or reschedule follow-up">
                <Pencil className="size-4" />
              </Button>
            }
          />
          <ConfirmDialog
            title="Delete this follow-up?"
            description="This removes the follow-up permanently. The lead or customer stays untouched."
            onConfirm={() => remove.mutate(followUp.id)}
            trigger={
              <Button size="icon" variant="ghost" aria-label="Delete follow-up">
                <Trash2 className="text-destructive size-4" />
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  function Section({
    title,
    items,
    emptyText,
  }: {
    title: string;
    items: FollowUp[];
    emptyText: string;
  }) {
    return (
      <Panel>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-display text-sm font-semibold">{title}</h2>
          <span className="text-muted-foreground text-xs">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <EmptyState
            title={emptyText}
            description={
              filtersActive
                ? "Try widening your search or clearing the filters."
                : "Schedule a follow-up to keep the conversation going."
            }
          />
        ) : (
          <div className="divide-y">
            {items.map((f) => (
              <FollowUpRow key={f.id} followUp={f} />
            ))}
          </div>
        )}
      </Panel>
    );
  }

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Never let a conversation go cold."
        actions={
          <div className="flex items-center gap-2">
            <div className="bg-muted flex rounded-md p-0.5" role="group" aria-label="Switch view">
              <Button
                size="sm"
                variant={view === "list" ? "secondary" : "ghost"}
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
              >
                <List className="mr-1 size-4" /> List
              </Button>
              <Button
                size="sm"
                variant={view === "calendar" ? "secondary" : "ghost"}
                onClick={() => setView("calendar")}
                aria-pressed={view === "calendar"}
              >
                <CalendarDays className="mr-1 size-4" /> Calendar
              </Button>
            </div>
            <FollowUpFormDialog
              trigger={
                <Button>
                  <Plus className="mr-1 size-4" /> Schedule follow-up
                </Button>
              }
            />
          </div>
        }
      />

      <Panel className="mb-6">
        <div className="flex flex-col gap-3 p-4">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by person, description, type…"
              className="pl-9"
              aria-label="Search follow-ups"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={due} onValueChange={setDue}>
              <SelectTrigger aria-label="Filter by due date">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any due date</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="week">Due within 7 days</SelectItem>
                <SelectItem value="month">Due this month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger aria-label="Filter by assigned person">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                {owners.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              Showing {filtered.length} of {all.length} follow-ups
            </span>
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <X className="mr-1 size-4" /> Clear filters
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {followUps.isLoading ? (
        <Panel>
          <LoadingRows />
        </Panel>
      ) : view === "list" ? (
        <div className="space-y-6">
          <Section title="Overdue" items={overdue} emptyText="Nothing overdue — nice work!" />
          <Section title="Upcoming" items={upcoming} emptyText="No upcoming follow-ups yet." />
          <Section title="Completed" items={completed} emptyText="Completed follow-ups will appear here." />
          <Section title="Cancelled" items={cancelled} emptyText="No cancelled follow-ups." />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-display text-sm font-semibold">{format(month, "MMMM yyyy")}</h2>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Previous month"
                  onClick={() => setMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>
                  Today
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Next month"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-px p-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-muted-foreground py-1 text-center text-xs font-medium">
                  {d}
                </div>
              ))}
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const items = byDate.get(key) ?? [];
                const inMonth = isSameMonth(day, month);
                const selected = selectedDate !== null && isSameDay(day, selectedDate);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    aria-label={`${format(day, "d MMMM yyyy")}, ${items.length} follow-ups`}
                    className={`flex min-h-16 flex-col items-stretch gap-1 rounded-md p-1.5 text-left transition-colors ${
                      selected
                        ? "bg-primary/10 ring-primary ring-1"
                        : "hover:bg-muted/60"
                    } ${inMonth ? "" : "opacity-40"}`}
                  >
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday(day) ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {items.slice(0, 2).map((f) => {
                      const done = f.status === "Completed";
                      return (
                        <span
                          key={f.id}
                          role="button"
                          tabIndex={0}
                          title={`Open ${targetName(f)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(day);
                            setDialogFollowUp(f);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              e.preventDefault();
                              setSelectedDate(day);
                              setDialogFollowUp(f);
                            }
                          }}
                          className={`flex cursor-pointer items-center gap-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium hover:ring-1 hover:ring-current ${
                            done
                              ? "bg-muted text-muted-foreground line-through"
                              : isOverdue(f)
                                ? "bg-destructive/15 text-destructive"
                                : "bg-primary/15 text-primary"
                          }`}
                        >
                          <span className="truncate">{targetName(f)}</span>
                          {!done && (
                            <span
                              role="button"
                              tabIndex={0}
                              title={`Mark ${targetName(f)} complete`}
                              aria-label={`Mark ${targetName(f)} complete on ${format(day, "d MMMM")}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                complete.mutate(f);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  complete.mutate(f);
                                }
                              }}
                              className="ml-auto shrink-0 rounded-full p-px opacity-60 hover:opacity-100"
                            >
                              <CheckCircle2 className="size-3" />
                            </span>
                          )}
                        </span>
                      );
                    })}
                    {items.length > 2 && (
                      <span className="text-muted-foreground px-1 text-[10px]">
                        +{items.length - 2} more
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Panel>
          <Panel>
            <div className="border-b px-4 py-3">
              <h2 className="font-display text-sm font-semibold">
                {selectedDate ? format(selectedDate, "EEEE, d MMMM") : "Pick a day"}
              </h2>
              <p className="text-muted-foreground text-xs">
                {selectedDate ? `${selectedItems.length} follow-up(s) due` : "Select a date to see its tasks."}
              </p>
            </div>
            {selectedDate === null ? (
              <EmptyState
                title="No day selected"
                description="Click any day on the calendar to open its follow-ups."
              />
            ) : selectedItems.length === 0 ? (
              <EmptyState
                title="Nothing due this day"
                description="Schedule a follow-up to fill this slot."
              />
            ) : (
              <div className="divide-y">
                {selectedItems.map((f) => (
                  <FollowUpRow key={f.id} followUp={f} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Edit dialog opened by clicking a calendar chip */}
      {dialogFollowUp && (
        <FollowUpFormDialog
          followUp={dialogFollowUp}
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setDialogFollowUp(null);
          }}
        />
      )}
    </div>
  );
}
