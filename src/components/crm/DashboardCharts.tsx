import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { LEAD_STATUSES } from "@/lib/crm";

const statusColor: Record<string, string> = {
  New: "var(--status-new)",
  Contacted: "var(--status-contacted)",
  "Follow-up": "var(--status-followup)",
  Qualified: "var(--status-qualified)",
  Converted: "var(--status-converted)",
  Lost: "var(--status-lost)",
};

const config = Object.fromEntries(
  LEAD_STATUSES.map((s) => [s, { label: s, color: statusColor[s] ?? "var(--primary)" }]),
) satisfies ChartConfig;

/** Donut of leads per status, from real lead rows. */
export function StatusDonut({ leads }: { leads: { status: string }[] }) {
  const data = LEAD_STATUSES.map((s) => ({
    status: s,
    count: leads.filter((l) => l.status === s).length,
  })).filter((d) => d.count > 0);
  const total = leads.length;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ChartContainer config={config} className="aspect-square h-44 shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
          <Pie data={data} dataKey="count" nameKey="status" innerRadius={50} outerRadius={78} strokeWidth={2}>
            {data.map((d) => (
              <Cell key={d.status} fill={statusColor[d.status]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {LEAD_STATUSES.map((s) => {
          const n = leads.filter((l) => l.status === s).length;
          return (
            <li key={s} className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ background: statusColor[s] }} />
              <span className="text-muted-foreground flex-1">{s}</span>
              <span className="font-semibold tabular-nums">
                {n}
                <span className="text-muted-foreground ml-1 font-normal">
                  {total ? Math.round((n / total) * 100) : 0}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const funnelConfig = { count: { label: "Leads", color: "var(--primary)" } } satisfies ChartConfig;

/** Pipeline funnel: how many leads reached each stage. */
export function ConversionFunnel({ leads }: { leads: { status: string }[] }) {
  const rank: Record<string, number> = { New: 0, Contacted: 1, "Follow-up": 2, Qualified: 3, Converted: 4 };
  const stages = ["New", "Contacted", "Follow-up", "Qualified", "Converted"];
  const active = leads.filter((l) => l.status !== "Lost");
  const data = stages.map((stage, i) => ({
    stage,
    count: active.filter((l) => (rank[l.status] ?? -1) >= i).length,
  }));
  const rate = leads.length
    ? Math.round((leads.filter((l) => l.status === "Converted").length / leads.length) * 100)
    : 0;

  return (
    <div>
      <p className="mb-3 text-xs">
        <span className="text-2xl font-semibold tabular-nums">{rate}%</span>{" "}
        <span className="text-muted-foreground">of all leads converted</span>
      </p>
      <ChartContainer config={funnelConfig} className="h-44 w-full">
        <BarChart data={data} margin={{ left: -20, right: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.stage} fill={d.stage === "Converted" ? "var(--brand)" : "var(--primary)"} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
