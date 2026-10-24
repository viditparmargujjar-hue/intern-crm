import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** The frosted panel used for every card and table block. */
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card shadow-glass rounded-xl border", className)}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {action}
    </div>
  );
}

/** Small statistic card used on the dashboard. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  trend,
}: {
  label: string;
  value: number | string;
  hint?: string | undefined;
  icon: ReactNode;
  tone?: "brand" | "glow" | "followup" | "converted" | "lost";
  /** Change vs. the previous period, e.g. +3. */
  trend?: { value: number; label: string } | undefined;
}) {
  const tones: Record<string, string> = {
    brand: "bg-status-new/10 text-status-new",
    glow: "bg-status-qualified/12 text-status-qualified",
    followup: "bg-status-followup/14 text-status-followup",
    converted: "bg-status-converted/12 text-status-converted",
    lost: "bg-status-lost/10 text-status-lost",
  };

  return (
    <Panel className="lift p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}>{icon}</span>
      </div>
      <p className="mt-2 text-[28px] leading-tight font-semibold tabular-nums">{value}</p>
      {trend ? (
        <p className="mt-1 text-xs">
          <span
            className={cn(
              "font-semibold",
              trend.value > 0 ? "text-status-converted" : trend.value < 0 ? "text-status-lost" : "text-muted-foreground",
            )}
          >
            {trend.value > 0 ? "▲ +" : trend.value < 0 ? "▼ " : ""}
            {trend.value}
          </span>{" "}
          <span className="text-muted-foreground">{trend.label}</span>
        </p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      ) : null}
    </Panel>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border/70 grid place-items-center rounded-xl border border-dashed px-6 py-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-xs">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border px-4 py-6 text-center text-sm">
      Something went wrong while loading this data.
      {message ? <span className="mt-1 block text-xs opacity-80">{message}</span> : null}
    </div>
  );
}
