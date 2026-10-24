import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Lead } from "@/lib/crm";
import { exportLeads, type ExportFormat } from "@/lib/leads-export";

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (XLSX)" },
  { value: "pdf", label: "PDF" },
  { value: "json", label: "JSON" },
];

/** Dropdown that asks for a format, then downloads the leads returned by getLeads. */
export function ExportMenu({
  trigger,
  getLeads,
  baseName,
  title,
  label = "Download as",
  disabled,
}: {
  trigger: (busy: boolean) => ReactNode;
  getLeads: () => Lead[] | Promise<Lead[]>;
  baseName: string;
  title?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function run(format: ExportFormat) {
    setBusy(true);
    try {
      const leads = await getLeads();
      if (leads.length === 0) {
        toast.info("No leads to export");
        return;
      }
      const name = await exportLeads(leads, format, baseName, title);
      toast.success(`Downloaded ${name}`);
    } catch (error) {
      toast.error((error as Error).message || "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || busy}>
        {trigger(busy)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map((f) => (
          <DropdownMenuItem key={f.value} onSelect={() => run(f.value)}>
            {f.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BusyIcon({ busy, icon }: { busy: boolean; icon: ReactNode }) {
  return busy ? <Loader2 className="size-4 animate-spin" /> : <>{icon}</>;
}
