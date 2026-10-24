import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { useAssigneeName } from "@/components/crm/AssigneeSelect";
import { Panel, PanelHeader } from "@/components/crm/Surfaces";
import { useCurrentUser } from "@/lib/auth";
import { fetchFollowUps } from "@/lib/crm-api";
import { countReminders, type ReminderFilter } from "@/lib/reminders";
import { cn } from "@/lib/utils";

/** Counts come from real follow-up rows; the database already limits what each user can see. */
export function ReminderWidgets() {
  const { data: me } = useCurrentUser();
  const followUps = useQuery({ queryKey: ["follow_ups"], queryFn: fetchFollowUps });
  const nameOf = useAssigneeName();
  if (!me) return null;
  const admin = me.role === "admin";
  const all = followUps.data ?? [];
  const scoped = admin ? all : all.filter((f) => f.assigned_user_id === me.id);
  const c = countReminders(scoped);
  const prefix = admin ? "" : "My ";
  const tiles: { label: string; value: number; state: ReminderFilter; tone: string }[] = [
    { label: `${prefix}pending follow-ups`, value: c.pending, state: "pending", tone: "text-foreground" },
    { label: `${prefix}overdue`, value: c.overdue, state: "overdue", tone: "text-status-lost" },
    { label: `${prefix}due today`, value: c.today, state: "today", tone: "text-status-followup" },
    { label: `${prefix}upcoming`, value: c.upcoming, state: "upcoming", tone: "text-status-new" },
  ];

  const byOwner = new Map<string, typeof all>();
  if (admin) {
    for (const f of all.filter((x) => x.status === "Pending")) {
      const k = f.assigned_user_id ?? `name:${f.assigned_to ?? ""}`;
      byOwner.set(k, [...(byOwner.get(k) ?? []), f]);
    }
  }

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
      <Panel className="p-5">
        <PanelHeader title={admin ? "Follow-up reminders" : "My follow-up reminders"} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((t) => (
            <Link key={t.state} to="/follow-ups" search={{ state: t.state, mine: !admin }} className="hover:bg-muted/60 rounded-lg border p-3 transition-colors">
              <p className={cn("text-2xl font-semibold tabular-nums", t.tone)}>{followUps.isPending ? "—" : t.value}</p>
              <p className="text-muted-foreground text-xs capitalize">{t.label}</p>
            </Link>
          ))}
        </div>
      </Panel>
      {admin ? (
        <Panel className="p-5">
          <PanelHeader title="Pending by intern" />
          {byOwner.size === 0 ? (
            <p className="text-muted-foreground text-xs">No pending follow-ups.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {[...byOwner.entries()].map(([k, items]) => {
                const cc = countReminders(items);
                const name = k.startsWith("name:") ? k.slice(5) || "Unassigned" : nameOf(k);
                return (
                  <li key={k} className="flex items-center justify-between">
                    <span className="truncate">{name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {cc.pending} pending{cc.overdue ? <span className="text-status-lost"> · {cc.overdue} overdue</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      ) : null}
    </section>
  );
}
