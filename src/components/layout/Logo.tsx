import { cn } from "@/lib/utils";

/** The red "PI" brand mark. */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-gradient-logo text-primary-foreground grid size-9 shrink-0 place-items-center rounded-xl font-bold tracking-tight shadow-glass",
        className,
      )}
    >
      PI
    </div>
  );
}
