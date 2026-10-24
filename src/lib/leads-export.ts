/**
 * Exports one or many leads as CSV, Excel, PDF or JSON.
 * Data comes straight from the database rows the user is allowed to see.
 */
import { format as fmt } from "date-fns";

import type { Lead } from "@/lib/crm";
import { formatDate, formatDateTime } from "@/lib/crm";

export type ExportFormat = "csv" | "xlsx" | "pdf" | "json";

const COLUMNS: { label: string; get: (l: Lead) => string }[] = [
  { label: "Lead ID", get: (l) => l.id },
  { label: "Full Name", get: (l) => l.full_name },
  { label: "Email", get: (l) => l.email ?? "" },
  { label: "Phone", get: (l) => l.phone ?? "" },
  { label: "Company", get: (l) => l.company_name ?? "" },
  { label: "Lead Source", get: (l) => l.lead_source ?? "" },
  { label: "Status", get: (l) => l.status },
  { label: "Assigned To", get: (l) => l.assigned_to ?? "" },
  { label: "Created Date", get: (l) => formatDateTime(l.created_at) },
  { label: "Follow-up Date", get: (l) => (l.next_follow_up ? formatDate(l.next_follow_up) : "") },
  { label: "Notes", get: (l) => l.notes ?? "" },
];

export function sanitizeFilename(name: string): string {
  const safe = name
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return safe || "lead";
}

export function leadsToCsv(leads: Lead[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    COLUMNS.map((c) => esc(c.label)).join(","),
    ...leads.map((l) => COLUMNS.map((c) => esc(c.get(l))).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n");
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads the given leads. Returns the file name used. */
export async function exportLeads(
  leads: Lead[],
  format: ExportFormat,
  baseName: string,
  title = "Leads",
): Promise<string> {
  if (leads.length === 0) throw new Error("There are no leads to export.");
  const filename = `${sanitizeFilename(baseName)}.${format}`;

  if (format === "csv") {
    save(new Blob([leadsToCsv(leads)], { type: "text/csv;charset=utf-8" }), filename);
  } else if (format === "json") {
    const records = leads.map((l) => ({
      id: l.id,
      full_name: l.full_name,
      email: l.email,
      phone: l.phone,
      company_name: l.company_name,
      lead_source: l.lead_source,
      status: l.status,
      assigned_to: l.assigned_to,
      created_at: l.created_at,
      next_follow_up: l.next_follow_up,
      notes: l.notes,
    }));
    const body = JSON.stringify(
      { exported_at: new Date().toISOString(), count: records.length, leads: records },
      null,
      2,
    );
    save(new Blob([body], { type: "application/json;charset=utf-8" }), filename);
  } else if (format === "xlsx") {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const data = [
      COLUMNS.map((c) => ({ value: c.label, fontWeight: "bold" as const })),
      ...leads.map((l) => COLUMNS.map((c) => ({ value: c.get(l), wrap: c.label === "Notes" }))),
    ];
    const widths = [38, 22, 28, 16, 22, 14, 12, 18, 20, 14, 50];
    await writeXlsxFile(data, { columns: widths.map((width) => ({ width })) }).toFile(filename);
  } else {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const m = 36;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    // Lead ID is omitted from the PDF table to keep it readable.
    const cols = COLUMNS.filter((c) => c.label !== "Lead ID");
    const ratios = [1.3, 1.6, 1, 1.2, 0.9, 0.8, 1, 1.2, 0.9, 2.2];
    const total = ratios.reduce((a, b) => a + b, 0);
    const widths = ratios.map((r) => ((pageW - m * 2) * r) / total);

    let y = m;
    doc.setFont("helvetica", "bold").setFontSize(16).text(title, m, y);
    y += 16;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110);
    doc.text(
      `Pixel Infinite CRM · Exported ${fmt(new Date(), "d MMM yyyy, HH:mm")} · ${leads.length} lead${leads.length === 1 ? "" : "s"}`,
      m,
      y,
    );
    doc.setTextColor(0);
    y += 20;

    const header = () => {
      doc.setFont("helvetica", "bold").setFontSize(8);
      let x = m;
      cols.forEach((c, i) => {
        doc.text(c.label, x + 2, y);
        x += widths[i] ?? 0;
      });
      y += 4;
      doc.setDrawColor(180).line(m, y, pageW - m, y);
      y += 10;
      doc.setFont("helvetica", "normal");
    };
    header();
    for (const lead of leads) {
      const cells = cols.map(
        (c, i) => doc.splitTextToSize(c.get(lead) || "—", (widths[i] ?? 0) - 4) as string[],
      );
      const h = Math.max(...cells.map((c) => c.length)) * 10 + 6;
      if (y + h > pageH - m) {
        doc.addPage();
        y = m;
        header();
      }
      let x = m;
      cells.forEach((lines, i) => {
        doc.text(lines, x + 2, y);
        x += widths[i] ?? 0;
      });
      y += h - 6;
      doc.setDrawColor(230).line(m, y, pageW - m, y);
      y += 10;
    }
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFontSize(8).setTextColor(130);
      doc.text(`Page ${p} of ${pages}`, pageW - m, pageH - 16, { align: "right" });
    }
    doc.save(filename);
  }
  return filename;
}
