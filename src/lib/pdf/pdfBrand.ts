import jsPDF from "jspdf";
import "jspdf-autotable";

export interface PdfConfig {
  crn?: string;
  telefone?: string;
  site?: string;
  cor_primaria?: string;
  incluir_capa?: boolean;
  marca_dagua?: boolean;
  nome_nutricionista?: string;
}

export const BRAND = {
  primary: [43, 57, 144] as [number, number, number],     // #004AAD
  accent: [91, 110, 199] as [number, number, number],     // #3B7BD6
  text: [26, 31, 60] as [number, number, number],         // #0E1E35
  textBody: [44, 44, 44] as [number, number, number],     // #2C2C2C
  textLabel: [107, 112, 128] as [number, number, number], // #6B7080
  tableLine: [226, 229, 240] as [number, number, number], // #E2E5F0
  tableHeader: [244, 245, 250] as [number, number, number], // #F4F5FA
  white: [255, 255, 255] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
};

export const MARGINS = { top: 20, bottom: 25, left: 20, right: 20 };
export const PAGE_WIDTH = 210;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

export function createDoc(): jsPDF {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

export function addHeader(doc: jsPDF, title: string, _config?: PdfConfig) {
  const pageW = doc.internal.pageSize.getWidth();
  // Logo text (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text("Gabriel Sanches", MARGINS.left, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.textLabel);
  doc.text("Nutrição Individualizada", MARGINS.left, 16);

  // Title (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text(title, pageW - MARGINS.right, 12, { align: "right" });

  // Separator line
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.5);
  doc.line(MARGINS.left, 19, pageW - MARGINS.right, 19);
}

export function addFooter(doc: jsPDF, config?: PdfConfig) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    const y = pageH - 12;

    // Separator
    doc.setDrawColor(...BRAND.tableLine);
    doc.setLineWidth(0.3);
    doc.line(MARGINS.left, y - 3, pageW - MARGINS.right, y - 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.textLabel);

    const site = config?.site || "gabrielnutri.com.br";
    const crn = config?.crn ? ` | CRN ${config.crn}` : "";
    doc.text(`Gabriel Sanches — Nutrição Individualizada | ${site}${crn}`, MARGINS.left, y);
    doc.text(`Página ${i} de ${totalPages}`, pageW - MARGINS.right, y, { align: "right" });
  }
}

export function addWatermark(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(200, 200, 200);
    doc.text("CONFIDENCIAL", pageW / 2, pageH / 2, {
      align: "center",
      angle: 45,
    });
  }
}

export function sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.primary);
  doc.text(text, MARGINS.left, y);
  return y + 8;
}

export function subTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.text);
  doc.text(text, MARGINS.left, y);
  return y + 6;
}

export function bodyText(doc: jsPDF, y: number, text: string, maxWidth?: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.textBody);
  const lines = doc.splitTextToSize(text, maxWidth || CONTENT_WIDTH);
  doc.text(lines, MARGINS.left, y);
  return y + lines.length * 4.5;
}

export function labelText(doc: jsPDF, y: number, label: string, value: string, x?: number): number {
  const startX = x || MARGINS.left;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.textLabel);
  doc.text(label, startX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.textBody);
  doc.text(value, startX + doc.getTextWidth(label) + 2, y);
  return y + 5;
}

export function checkNewPage(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - MARGINS.bottom) {
    doc.addPage();
    addHeader(doc, "");
    return MARGINS.top + 10;
  }
  return y;
}

export function addCoverPage(
  doc: jsPDF,
  title: string,
  pacienteNome: string,
  config?: PdfConfig,
  extra?: { periodo?: string; dataEmissao?: string }
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cx = pageW / 2;

  // Blue accent line at top
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 4, "F");

  // Logo area
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND.primary);
  doc.text("Gabriel Sanches", cx, 60, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.textLabel);
  doc.text("Nutrição Individualizada", cx, 70, { align: "center" });

  // Separator
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.8);
  doc.line(cx - 30, 80, cx + 30, 80);

  // Document title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.text);
  doc.text(title, cx, 100, { align: "center" });

  // Patient name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.textBody);
  doc.text(pacienteNome, cx, 115, { align: "center" });

  let infoY = 135;
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.textLabel);

  if (extra?.periodo) {
    doc.text(extra.periodo, cx, infoY, { align: "center" });
    infoY += 8;
  }

  const dataEmissao = extra?.dataEmissao || new Date().toLocaleDateString("pt-BR");
  doc.text(`Data de emissão: ${dataEmissao}`, cx, infoY, { align: "center" });
  infoY += 8;

  const nutri = config?.nome_nutricionista || "Gabriel Sanches";
  const crn = config?.crn ? ` | CRN ${config.crn}` : "";
  doc.text(`${nutri}${crn}`, cx, infoY, { align: "center" });

  // Bottom line
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, pageH - 4, pageW, 4, "F");

  doc.addPage();
}

export function addInfoBlock(doc: jsPDF, y: number, fields: { label: string; value: string }[]): number {
  const blockY = y;
  doc.setFillColor(...BRAND.tableHeader);
  doc.roundedRect(MARGINS.left, blockY - 4, CONTENT_WIDTH, fields.length * 6 + 6, 2, 2, "F");

  let currentY = blockY + 2;
  for (const field of fields) {
    currentY = labelText(doc, currentY, `${field.label}: `, field.value, MARGINS.left + 4);
  }
  return currentY + 4;
}

export function autoTable(
  doc: jsPDF,
  startY: number,
  head: string[][],
  body: (string | number)[][],
  options?: any
): number {
  (doc as any).autoTable({
    startY,
    head,
    body,
    margin: { left: MARGINS.left, right: MARGINS.right },
    headStyles: {
      fillColor: BRAND.tableHeader,
      textColor: BRAND.text,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 2,
    },
    bodyStyles: {
      textColor: BRAND.textBody,
      fontSize: 9,
      cellPadding: 2,
    },
    alternateRowStyles: { fillColor: [250, 251, 255] },
    styles: { lineColor: BRAND.tableLine, lineWidth: 0.2 },
    ...options,
  });
  return (doc as any).lastAutoTable.finalY + 6;
}

export async function loadPdfConfig(userId: string): Promise<PdfConfig> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase
    .from("configuracoes_clinica")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return {
      crn: (data as any).crn || undefined,
      telefone: (data as any).telefone || undefined,
      site: (data as any).site || "gabrielnutri.com.br",
      cor_primaria: (data as any).cor_primaria || "#004AAD",
      incluir_capa: (data as any).incluir_capa ?? true,
      marca_dagua: (data as any).marca_dagua ?? false,
    };
  }

  // Try from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("crn, nome_completo")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    crn: profile?.crn || undefined,
    nome_nutricionista: profile?.nome_completo || "Gabriel Sanches",
    site: "gabrielnutri.com.br",
    incluir_capa: true,
    marca_dagua: false,
  };
}

// ─── Extra visual helpers (stat cards, charts, legends) ─────────────
export const VARIATION = {
  good: [22, 163, 74] as [number, number, number],
  bad: [220, 38, 38] as [number, number, number],
  neutral: [107, 112, 128] as [number, number, number],
};

export interface StatCard {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaTone?: "good" | "bad" | "neutral";
}

/** Renders a row of compact stat cards across the content width. */
export function statCards(doc: jsPDF, y: number, cards: StatCard[], perRow = 5): number {
  if (!cards.length) return y;
  const rows: StatCard[][] = [];
  for (let i = 0; i < cards.length; i += perRow) rows.push(cards.slice(i, i + perRow));

  const gap = 3;
  const height = 26;

  for (const row of rows) {
    const width = (CONTENT_WIDTH - gap * (row.length - 1)) / row.length;
    row.forEach((card, i) => {
      const x = MARGINS.left + i * (width + gap);
      doc.setFillColor(...BRAND.tableHeader);
      doc.setDrawColor(...BRAND.tableLine);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, width, height, 2, 2, "FD");
      // accent bar
      doc.setFillColor(...BRAND.primary);
      doc.roundedRect(x, y, 1.4, height, 0.7, 0.7, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.textLabel);
      doc.text(doc.splitTextToSize(card.label.toUpperCase(), width - 6)[0], x + 4, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...BRAND.text);
      doc.text(card.value, x + 4, y + 13.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      if (card.sub) {
        doc.setTextColor(...BRAND.textLabel);
        doc.text(doc.splitTextToSize(card.sub, width - 6)[0], x + 4, y + 18);
      }
      if (card.delta) {
        const tone = card.deltaTone || "neutral";
        doc.setTextColor(...VARIATION[tone]);
        doc.setFont("helvetica", "bold");
        doc.text(doc.splitTextToSize(card.delta, width - 6)[0], x + 4, y + 22);
      }
    });
    y += height + gap;
  }
  return y + 6;
}

export interface ChartSeries {
  labels: string[];
  values: (number | null)[];
  title: string;
  unit?: string;
}

/** Vector line chart with axes auto-scaled to the real min/max of the series. */
export function lineChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  series: ChartSeries,
): number {
  const pts = series.values
    .map((v, i) => ({ v, i }))
    .filter(p => p.v != null && Number.isFinite(Number(p.v))) as { v: number; i: number }[];

  // frame + title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.text);
  doc.text(series.title, x, y + 4);

  const plotTop = y + 10;
  const plotBottom = y + height - 7;
  const plotLeft = x + 13;
  const plotRight = x + width - 2;

  doc.setDrawColor(...BRAND.tableLine);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 2, 2, "S");

  if (pts.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.textLabel);
    doc.text("Sem dados", x + width / 2, (plotTop + plotBottom) / 2, { align: "center" });
    return y + height;
  }

  const vals = pts.map(p => p.v);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1e-6) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  min -= pad; max += pad;

  const sx = (i: number) =>
    series.values.length <= 1
      ? (plotLeft + plotRight) / 2
      : plotLeft + (i / (series.values.length - 1)) * (plotRight - plotLeft);
  const sy = (v: number) => plotBottom - ((v - min) / (max - min)) * (plotBottom - plotTop);

  // gridlines + y labels
  doc.setFontSize(6);
  for (let g = 0; g <= 3; g++) {
    const v = min + ((max - min) * g) / 3;
    const gy = sy(v);
    doc.setDrawColor(...BRAND.tableLine);
    doc.setLineWidth(0.1);
    doc.line(plotLeft, gy, plotRight, gy);
    doc.setTextColor(...BRAND.textLabel);
    doc.text(v.toFixed(1), plotLeft - 1.5, gy + 1.2, { align: "right" });
  }

  // line
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.6);
  for (let k = 1; k < pts.length; k++) {
    doc.line(sx(pts[k - 1].i), sy(pts[k - 1].v), sx(pts[k].i), sy(pts[k].v));
  }
  // points + value labels
  doc.setFillColor(...BRAND.primary);
  doc.setFontSize(5.6);
  pts.forEach((p, idx) => {
    doc.circle(sx(p.i), sy(p.v), 0.9, "F");
    if (pts.length <= 8 || idx === 0 || idx === pts.length - 1) {
      doc.setTextColor(...BRAND.text);
      doc.text(String(p.v), sx(p.i), sy(p.v) - 2, { align: "center" });
    }
  });

  // x labels (first, middle, last to avoid overlap)
  doc.setFontSize(5.6);
  doc.setTextColor(...BRAND.textLabel);
  const idxs = new Set<number>([pts[0].i, pts[pts.length - 1].i]);
  if (pts.length > 2) idxs.add(pts[Math.floor(pts.length / 2)].i);
  idxs.forEach(i => {
    const label = series.labels[i] || "";
    const px = sx(i);
    const align = i === 0 ? "left" : i === series.labels.length - 1 ? "right" : "center";
    doc.text(label, px, plotBottom + 4.5, { align: align as any });
  });

  return y + height;
}

export function legendBlock(doc: jsPDF, y: number, title: string, lines: string[]): number {
  const h = lines.length * 4 + 10;
  doc.setFillColor(...BRAND.tableHeader);
  doc.setDrawColor(...BRAND.tableLine);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGINS.left, y, CONTENT_WIDTH, h, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.text);
  doc.text(title, MARGINS.left + 4, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.textLabel);
  lines.forEach((l, i) => doc.text(l, MARGINS.left + 4, y + 10.5 + i * 4));
  return y + h + 5;
}

export function signatureBlock(doc: jsPDF, y: number, config?: PdfConfig): number {
  const cx = MARGINS.left + CONTENT_WIDTH / 2;
  doc.setDrawColor(...BRAND.textLabel);
  doc.setLineWidth(0.3);
  doc.line(cx - 35, y, cx + 35, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  doc.text(config?.nome_nutricionista || "Gabriel Sanches", cx, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.textLabel);
  doc.text(`Nutricionista${config?.crn ? ` | CRN ${config.crn}` : ""}`, cx, y + 9.5, { align: "center" });
  return y + 14;
}
