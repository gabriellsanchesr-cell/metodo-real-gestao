import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  createDoc, addHeader, addFooter, addWatermark, addCoverPage,
  sectionTitle, bodyText, autoTable, BRAND, MARGINS, CONTENT_WIDTH,
  checkNewPage, PdfConfig,
} from "./pdfBrand";
import { dataLocal } from "@/lib/datas";

export interface RelatorioExportOptions {
  mes: number; // 0-11
  ano: number;
  incluirGraficos: boolean;
  incluirCheckins: boolean;
  incluirAnotacoes: boolean;
  incluirPlano: boolean;
  conquistasTexto: string;
}

export function generateRelatorioMensalPdf(
  acompanhamentos: any[],
  consultas: any[],
  planoAtivo: any | null,
  paciente: { nome_completo: string },
  config: PdfConfig,
  options: RelatorioExportOptions,
): jsPDF {
  const doc = createDoc();
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const mesLabel = `${meses[options.mes]} ${options.ano}`;

  // Cover
  addCoverPage(doc, `Relatório de Evolução — ${mesLabel}`, paciente.nome_completo, config, {
    periodo: `Período: ${mesLabel}`,
  });

  addHeader(doc, "Relatório Mensal", config);
  let y = 28;

  // Filter records for the month
  const filtered = acompanhamentos.filter(r => {
    const d = dataLocal(r.data_registro);
    return d.getMonth() === options.mes && d.getFullYear() === options.ano;
  });

  // Section 2 — Executive Summary
  y = sectionTitle(doc, y, "Resumo Executivo");

  if (filtered.length > 0) {
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const pesoInicial = first.peso;
    const pesoFinal = last.peso;
    const variacao = pesoInicial != null && pesoFinal != null ? Math.round((pesoFinal - pesoInicial) * 100) / 100 : null;
    const avgAderencia = Math.round(filtered.reduce((s, r) => s + (r.aderencia_plano || 0), 0) / filtered.length);
    const avgEnergia = (filtered.reduce((s, r) => s + (r.nivel_energia || 0), 0) / filtered.length).toFixed(1);

    y = autoTable(doc, y,
      [["Peso Inicial", "Peso Final", "Variação", "Check-ins", "Aderência Média", "Energia Média"]],
      [[
        pesoInicial != null ? `${pesoInicial} kg` : "—",
        pesoFinal != null ? `${pesoFinal} kg` : "—",
        variacao != null ? `${variacao > 0 ? "+" : ""}${variacao} kg` : "—",
        `${filtered.length} semanas`,
        `${avgAderencia}%`,
        `${avgEnergia}/5`,
      ]]
    );
  } else {
    y = bodyText(doc, y, "Nenhum registro de acompanhamento encontrado neste período.");
  }

  // Section 3 — Weekly Evolution
  if (filtered.length > 0) {
    y = checkNewPage(doc, y, 30);
    y = sectionTitle(doc, y, "Evolução Semanal");

    const body = filtered.map((r, i) => [
      `${i + 1}`,
      dataLocal(r.data_registro).toLocaleDateString("pt-BR"),
      r.peso != null ? `${r.peso} kg` : "—",
      r.circunferencia_abdominal != null ? `${r.circunferencia_abdominal} cm` : "—",
      r.circunferencia_quadril != null ? `${r.circunferencia_quadril} cm` : "—",
      r.aderencia_plano != null ? `${r.aderencia_plano}%` : "—",
      r.nivel_energia != null ? `${r.nivel_energia}/5` : "—",
      r.qualidade_sono != null ? `${r.qualidade_sono}/5` : "—",
    ]);

    // Add averages row
    if (filtered.length > 1) {
      const avg = (key: string) => {
        const vals = filtered.filter(r => r[key] != null).map(r => r[key]);
        return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : "—";
      };
      body.push([
        "Média", "", `${avg("peso")} kg`, `${avg("circunferencia_abdominal")} cm`,
        `${avg("circunferencia_quadril")} cm`, `${avg("aderencia_plano")}%`,
        `${avg("nivel_energia")}/5`, `${avg("qualidade_sono")}/5`,
      ]);
    }

    y = autoTable(doc, y,
      [["Sem.", "Data", "Peso", "Abd.", "Quadril", "Aderência", "Energia", "Sono"]],
      body,
    );
  }

  // Section 5 — Check-in details
  if (options.incluirCheckins && filtered.length > 0) {
    y = checkNewPage(doc, y, 20);
    y = sectionTitle(doc, y, "Detalhes dos Check-ins");

    for (const r of filtered) {
      y = checkNewPage(doc, y, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.text);
      doc.text(dataLocal(r.data_registro).toLocaleDateString("pt-BR"), MARGINS.left, y);
      y += 5;

      const items = [
        r.peso != null ? `Peso: ${r.peso} kg` : null,
        r.aderencia_plano != null ? `Aderência: ${r.aderencia_plano}%` : null,
        r.nivel_energia != null ? `Energia: ${r.nivel_energia}/5` : null,
        r.qualidade_sono != null ? `Sono: ${r.qualidade_sono}/5` : null,
      ].filter(Boolean);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.textBody);
      doc.text(items.join(" | "), MARGINS.left, y);
      y += 5;

      if (r.observacoes_paciente) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...BRAND.textLabel);
        const lines = doc.splitTextToSize(`"${r.observacoes_paciente}"`, CONTENT_WIDTH);
        doc.text(lines, MARGINS.left, y);
        y += lines.length * 4 + 2;
      }

      if (options.incluirAnotacoes && r.observacoes_nutricionista) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BRAND.accent);
        const lines = doc.splitTextToSize(`Nota clínica: ${r.observacoes_nutricionista}`, CONTENT_WIDTH);
        doc.text(lines, MARGINS.left, y);
        y += lines.length * 4 + 2;
      }
      y += 3;
    }
  }

  // Section 6 — Consultations
  const consultasMes = consultas.filter(c => {
    const d = new Date(c.data_hora);
    return d.getMonth() === options.mes && d.getFullYear() === options.ano;
  });

  if (consultasMes.length > 0) {
    y = checkNewPage(doc, y, 20);
    y = sectionTitle(doc, y, "Consultas do Período");
    const tipoMap: Record<string, string> = {
      primeira_consulta: "Primeira consulta", retorno: "Retorno",
      online: "Online", presencial: "Presencial",
    };
    const statusMap: Record<string, string> = {
      agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado", faltou: "Faltou",
    };
    const body = consultasMes.map(c => [
      new Date(c.data_hora).toLocaleDateString("pt-BR"),
      tipoMap[c.tipo] || c.tipo || "—",
      statusMap[c.status] || c.status || "—",
    ]);
    y = autoTable(doc, y, [["Data", "Tipo", "Status"]], body);
  }

  // Section 7 — Active Plan
  if (options.incluirPlano && planoAtivo) {
    y = checkNewPage(doc, y, 15);
    y = sectionTitle(doc, y, "Plano Alimentar do Período");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.textBody);
    doc.text(`Plano ativo: ${planoAtivo.nome}`, MARGINS.left, y);
    y += 8;
  }

  // Section 8 — Achievements
  if (options.conquistasTexto) {
    y = checkNewPage(doc, y, 20);
    y = sectionTitle(doc, y, "Conquistas e Observações");
    y = bodyText(doc, y, options.conquistasTexto);
  }

  addFooter(doc, config);
  if (config.marca_dagua) addWatermark(doc);
  return doc;
}
