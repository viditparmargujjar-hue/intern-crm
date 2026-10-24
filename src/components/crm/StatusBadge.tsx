import { cn } from "@/lib/utils";

/** Colour for each status we show anywhere in the app. */
const badgeStyles: Record<string, string> = {
  New: "bg-status-new/12 text-status-new",
  Contacted: "bg-status-contacted/12 text-status-contacted",
  "Follow-up": "bg-status-followup/14 text-status-followup",
  Qualified: "bg-status-qualified/14 text-status-qualified",
  Converted: "bg-status-converted/14 text-status-converted",
  Lost: "bg-status-lost/12 text-status-lost",
  Pending: "bg-status-followup/14 text-status-followup",
  Completed: "bg-status-converted/14 text-status-converted",
  Overdue: "bg-status-lost/12 text-status-lost",
  "Due Soon": "bg-status-followup/14 text-status-followup",
  Upcoming: "bg-muted text-muted-foreground",
  Cancelled: "bg-muted text-muted-foreground line-through",
  High: "bg-status-lost/12 text-status-lost",
  Medium: "bg-status-followup/14 text-status-followup",
  Low: "bg-muted text-muted-foreground",
  Active: "bg-status-converted/14 text-status-converted",
  Inactive: "bg-muted text-muted-foreground",
};

const dotStyles: Record<string, string> = {
  New: "bg-status-new",
  Contacted: "bg-status-contacted",
  "Follow-up": "bg-status-followup",
  Qualified: "bg-status-qualified",
  Converted: "bg-status-converted",
  Lost: "bg-status-lost",
  Pending: "bg-status-followup",
  Completed: "bg-status-converted",
  Overdue: "bg-status-lost",
  "Due Soon": "bg-status-followup",
  Upcoming: "bg-muted-foreground",
  Cancelled: "bg-muted-foreground",
  High: "bg-status-lost",
  Medium: "bg-status-followup",
  Low: "bg-muted-foreground",
  Active: "bg-status-converted",
  Inactive: "bg-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        badgeStyles[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotStyles[status] ?? "bg-muted-foreground")} />
      {status}
    </span>
  );
}
