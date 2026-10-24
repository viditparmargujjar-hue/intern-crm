import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchNotifications, markNotificationsRead } from "@/lib/crm-api";
import { formatDateTime } from "@/lib/crm";
import { cn } from "@/lib/utils";

/** In-app notification center. Reminders are created on the server and deduplicated. */
export function NotificationBell({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications, refetchInterval: 120_000 });
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at);
  const markRead = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)} aria-label={`Notifications, ${unread.length} unread`}>
          <Bell className="size-4" />
          {unread.length ? (
            <span className="bg-brand text-primary-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread.length ? (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markRead.mutate(unread.map((n) => n.id))}>
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {q.isError ? (
            <p className="text-destructive p-4 text-xs">Could not load notifications.</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-xs">You're all caught up.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={cn("border-b px-3 py-2.5 last:border-0", !n.read_at && "bg-brand/5")}>
                <p className={cn("text-sm", n.kind === "overdue" && "text-status-lost", !n.read_at && "font-semibold")}>{n.title}</p>
                {n.body ? <p className="text-muted-foreground text-xs">{n.body}</p> : null}
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">{formatDateTime(n.created_at)}</span>
                  {n.lead_id ? (
                    <Link to="/leads/$id" params={{ id: n.lead_id }} className="text-primary text-[11px] font-medium hover:underline" onClick={() => !n.read_at && markRead.mutate([n.id])}>
                      Open lead
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
