import { CalendarCheck, Mail, MessageSquare, Phone, RefreshCw, Users } from "lucide-react";

import { EmptyState } from "@/components/crm/Surfaces";
import { formatDateTime, type Activity } from "@/lib/crm";
import { cn } from "@/lib/utils";

const icons: Record<string, typeof Phone> = {
  Call: Phone,
  Email: Mail,
  Meeting: Users,
  Note: MessageSquare,
  "Status Change": RefreshCw,
  "Follow-up Completed": CalendarCheck,
};

const tones: Record<string, string> = {
  Call: "bg-status-contacted/12 text-status-contacted",
  Email: "bg-status-qualified/14 text-status-qualified",
  Meeting: "bg-status-new/12 text-status-new",
  Note: "bg-muted text-muted-foreground",
  "Status Change": "bg-status-converted/14 text-status-converted",
  "Follow-up Completed": "bg-status-followup/14 text-status-followup",
};

export function ActivityTimeline({
  activities,
  emptyMessage = "Activities appear here as soon as something happens.",
}: {
  activities: Activity[];
  emptyMessage?: string;
}) {
  if (activities.length === 0) {
    return <EmptyState title="No activity yet" description={emptyMessage} />;
  }

  return (
    <div className="flex flex-col">
      {activities.map((activity, index) => {
        const Icon = icons[activity.activity_type] ?? MessageSquare;
        const isLast = index === activities.length - 1;
        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  tones[activity.activity_type] ?? "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              {!isLast ? <span className="bg-border w-px flex-1" /> : null}
            </div>
            <div className={cn("min-w-0", isLast ? "" : "pb-4")}>
              <p className="text-sm">{activity.description}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {activity.activity_type} · {formatDateTime(activity.activity_date)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
