/**
 * Downloads ONE lead (plus its follow-ups) as PDF, CSV or Excel.
 * Only real stored fields are exported — nothing is invented.
 */
import { supabase } from "@/integrations/supabase/client";
import type { FollowUp, Lead } from "@/lib/crm";
import { formatDate, formatDateTime } from "@/lib/crm";

export type LeadExportFormat = "pdf" | "csv" | "xlsx";

async function fetchLeadFollowUps(leadId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("lead_id", leadId)
    .order("follow_up_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function leadRows(lead: Lead): [string, string][] {
  return [
    ["Full Name", lead.full_name],
    ["Email", lead.email ?? ""],
    ["Phone Number", lead.phone ?? ""],
    ["Company", lead.company_name ?? ""],
    ["Lead Source", lead.lead_source ?? ""],
    ["Lead Status", lead.status],
    ["Assigned To", lead.assigned_to ?? ""],
    ["Next Follow-up", lead.next_follow_up ? formatDate(lead.next_follow_up) : ""],
    ["Created Date", formatDateTime(lead.created_at)],
    ["Notes", lead.notes ?? ""],
  ];
}

function followUpText(f: FollowUp): string {
  return [
    formatDate(f.follow_up_date),
    f.follow_up_type,
    f.status,
    f.assigned_to ? `Assigned: ${f.assigned_to}` : "",
    f.description ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function fileBase(lead: Lead): string {
  const safe = lead.full_name.trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_");
  return `Lead_${safe || "Unnamed"}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadLead(lead: Lead, format: LeadExportFormat): Promise<string> {
  const followUps = await fetchLeadFollowUps(lead.id);
  const rows = leadRows(lead);
  const fuRows: [string, string][] = followUps.map((f, i) => [`Follow-up ${i + 1}`, followUpText(f)]);
  const all = [...rows, ...(fuRows.length ? fuRows : [["Follow-ups", "None"] as [string, string]])];
  const filename = `${fileBase(lead)}.${format}`;

  if (format === "csv") {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [["Field", "Value"], ...all].map((r) => r.map(esc).join(",")).join("\r\n");
    saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
  } else if (format === "xlsx") {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const data = [
      [
        { value: "Field", fontWeight: "bold" as const },
        { value: "Value", fontWeight: "bold" as const },
      ],
      ...all.map(([k, v]) => [{ value: k }, { value: v, wrap: true }]),
    ];
    await writeXlsxFile(data, { columns: [{ width: 20 }, { width: 70 }] }).toFile(filename);
  } else {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2 - 130;
    let y = margin;
    doc.setFont("helvetica", "bold").setFontSize(18).text(lead.full_name, margin, y);
    y += 18;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(120);
    doc.text("Lead details — Pixel Infinite CRM", margin, y);
    doc.setTextColor(0);
    y += 28;
    for (const [k, v] of all) {
      const lines = doc.splitTextToSize(v || "—", width) as string[];
      const h = lines.length * 14 + 8;
      if (y + h > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold").setFontSize(10).text(k, margin, y);
      doc.setFont("helvetica", "normal").text(lines, margin + 130, y);
      y += h;
    }
    doc.save(filename);
  }
  return filename;
}
