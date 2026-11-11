import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  createDoc, addHeader, addFooter, addWatermark, addCoverPage, sectionTitle, bodyText, autoTable, BRAND, MARGINS, CONTENT_WIDTH, checkNewPage, addInfoBlock, PdfConfig,
} from "./pdfBrand";

export interface PlanoExportOptions {
  incluirMacros: boolean;
  incluirCaloriasAlimento: boolean;
  incluirSubstituicoes: boolean;
  incluirObsRefeicao: boolean;
  incluirObsGerais: boolean;
  incluirTotaisDiarios: boolean;
  incluirOrientacoes: boolean;
  incluirCapa: boolean;
}

interface PlanoData {
  nome: string;
  observacoes?: string;
  data_inicio?: string;
  data_fim?: string;
  refeicoes: {
    tipo: string;
    horario_sugerido?: string;
    observacoes?: string;
    substituicoes_sugeridas?: string;
    alimentos: {
      nome_alimento: string;
      quantidade: number;
      medida_caseira: string;
      energia_kcal: number;
      proteina_g: number;
      carboidrato_g: number;
      lipidio_g: number;
    }[];
  }[];
}

const TIPO_LABELS: Record<string, string> = {
  cafe_da_manha: "Café da Manhã", lanche_da_manha: "Lanche da Manhã",
  almoco: "Almoço", lanche_da_tarde: "Lanche da Tarde",
  jantar: "Jantar", ceia: "Ceia",
};

export function generatePlanoAlimentarPdf(
  plano: PlanoData,
  paciente: { nome_completo: string; data_nascimento?: string; objetivo?: string },
  config: PdfConfig,
  options: PlanoExportOptions,
): jsPDF {
  const doc = createDoc();

  // Cover page
  if (options.incluirCapa) {
    const periodo = plano.data_inicio && plano.data_fim
      ? `Vigência: ${formatDate(plano.data_inicio)} a ${formatDate(plano.data_fim)}`
      : undefined;
    addCoverPage(doc, "Plano Alimentar", paciente.nome_completo, config, { periodo });
  }

  addHeader(doc, "Plano Alimentar", config);
  let y = 28;

  // Identification
  const idade = paciente.data_nascimento ? calcAge(paciente.data_nascimento) : null;
  const fields = [
    { label: "Nome", value: paciente.nome_completo },
    ...(idade ? [{ label: "Idade", value: `${idade} anos` }] : []),
    ...(paciente.objetivo ? [{ label: "Objetivo", value: formatObj(paciente.objetivo) }] : []),
    { label: "Data do plano", value: new Date().toLocaleDateString("pt-BR") },
    { label: "Nutricionista", value: `${config.nome_nutricionista || "Gabriel Sanches"}${config.crn ? ` | CRN ${config.crn}` : ""}` },
  ];
  y = addInfoBlock(doc, y, fields);

  // Daily totals
  if (options.incluirTotaisDiarios) {
    const totals = calcDailyTotals(plano.refeicoes);
    y = checkNewPage(doc, y, 20);
    y = sectionTitle(doc, y, "Resumo Nutricional do Dia");

    const totalKcal = totals.kcal || 1;
    const pPct = Math.round((totals.prot * 4 / totalKcal) * 100);
    const cPct = Math.round((totals.carb * 4 / totalKcal) * 100);
    const gPct = Math.round((totals.lip * 9 / totalKcal) * 100);

    y = autoTable(doc, y,
      [["Calorias Totais", "Proteína", "Carboidrato", "Gordura"]],
      [[
        `${Math.round(totals.kcal)} kcal`,
        `${Math.round(totals.prot)}g (${pPct}%)`,
        `${Math.round(totals.carb)}g (${cPct}%)`,
        `${Math.round(totals.lip)}g (${gPct}%)`,
      ]]
    );
  }

  // Meals
  y = checkNewPage(doc, y, 15);
  y = sectionTitle(doc, y, "Refeições");

  for (const ref of plano.refeicoes) {
    y = checkNewPage(doc, y, 30);

    // Meal header
    const mealLabel = TIPO_LABELS[ref.tipo] || ref.tipo;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.primary);
    doc.text(mealLabel, MARGINS.left, y);

    if (ref.horario_sugerido) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.textLabel);
      doc.text(ref.horario_sugerido, MARGINS.left + CONTENT_WIDTH, y, { align: "right" });
    }
    y += 3;

    // Subtotal
    if (options.incluirMacros && ref.alimentos.length > 0) {
      const sub = calcMealTotals(ref.alimentos);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.textLabel);
      doc.text(
        `${Math.round(sub.kcal)} kcal | P: ${Math.round(sub.prot)}g | C: ${Math.round(sub.carb)}g | G: ${Math.round(sub.lip)}g`,
        MARGINS.left, y
      );
      y += 4;
    }

    // Foods table
    if (ref.alimentos.length > 0) {
      const showMacros = options.incluirMacros;
      const showKcalAlimento = options.incluirCaloriasAlimento;

      const head = ["Alimento", "Qtd", "Med. Caseira"];
      if (showKcalAlimento) head.push("Kcal");
      if (showMacros) head.push("P(g)", "C(g)", "G(g)");

      const body = ref.alimentos.map(a => {
        const row: (string | number)[] = [
          a.nome_alimento,
          `${a.quantidade}g`,
          a.medida_caseira || "",
        ];
        if (showKcalAlimento) row.push(Math.round(a.energia_kcal));
        if (showMacros) row.push(
          Math.round(a.proteina_g),
          Math.round(a.carboidrato_g),
          Math.round(a.lipidio_g),
        );
        return row;
      });

      y = autoTable(doc, y, [head], body);
    }

    // Substitutions
    if (options.incluirSubstituicoes && ref.substituicoes_sugeridas) {
      y = checkNewPage(doc, y, 12);
      doc.setFillColor(244, 245, 250);
      const lines = doc.splitTextToSize(`Substituições sugeridas: ${ref.substituicoes_sugeridas}`, CONTENT_WIDTH - 8);
      doc.roundedRect(MARGINS.left, y - 3, CONTENT_WIDTH, lines.length * 4 + 6, 1, 1, "F");
      doc.setDrawColor(...BRAND.primary);
      doc.setLineWidth(0.8);
      doc.line(MARGINS.left, y - 3, MARGINS.left, y - 3 + lines.length * 4 + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.textBody);
      doc.text(lines, MARGINS.left + 4, y + 1);
      y += lines.length * 4 + 8;
    }

    // Observation
    if (options.incluirObsRefeicao && ref.observacoes) {
      y = checkNewPage(doc, y, 10);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.textLabel);
      const obsLines = doc.splitTextToSize(`Obs: ${ref.observacoes}`, CONTENT_WIDTH);
      doc.text(obsLines, MARGINS.left, y);
      y += obsLines.length * 4 + 4;
    }

    // Separator
    doc.setDrawColor(...BRAND.tableLine);
    doc.setLineWidth(0.2);
    doc.line(MARGINS.left, y, MARGINS.left + CONTENT_WIDTH, y);
    y += 6;
  }

  // General observations
  if (options.incluirObsGerais && plano.observacoes) {
    y = checkNewPage(doc, y, 20);
    y = sectionTitle(doc, y, "Observações Gerais");
    y = bodyText(doc, y, plano.observacoes);
  }

  // Footer & watermark
  addFooter(doc, config);
  if (config.marca_dagua) addWatermark(doc);

  return doc;
}

export function generatePlanoSimplificadoPdf(
  plano: PlanoData,
  paciente: { nome_completo: string },
  config: PdfConfig,
): jsPDF {
  const doc = createDoc();
  addHeader(doc, "Meu Plano Alimentar", config);
  let y = 28;

  // Simple identification
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.text);
  doc.text(paciente.nome_completo, MARGINS.left, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.textLabel);
  doc.text(`Atualizado em ${new Date().toLocaleDateString("pt-BR")}`, MARGINS.left, y);
  y += 10;

  for (const ref of plano.refeicoes) {
    y = checkNewPage(doc, y, 25);
    const mealLabel = TIPO_LABELS[ref.tipo] || ref.tipo;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...BRAND.primary);
    doc.text(mealLabel, MARGINS.left, y);
    if (ref.horario_sugerido) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.textLabel);
      doc.text(ref.horario_sugerido, MARGINS.left + CONTENT_WIDTH, y, { align: "right" });
    }
    y += 7;

    for (const a of ref.alimentos) {
      y = checkNewPage(doc, y, 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...BRAND.textBody);
      doc.text(`• ${a.nome_alimento} — ${a.medida_caseira || `${a.quantidade}g`}`, MARGINS.left + 2, y);
      y += 6;
    }

    if (ref.substituicoes_sugeridas) {
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.accent);
      const subLines = doc.splitTextToSize(`Substituições: ${ref.substituicoes_sugeridas}`, CONTENT_WIDTH - 4);
      doc.text(subLines, MARGINS.left + 2, y);
      y += subLines.length * 5 + 2;
    }

    y += 4;
    doc.setDrawColor(...BRAND.tableLine);
    doc.setLineWidth(0.2);
    doc.line(MARGINS.left, y, MARGINS.left + CONTENT_WIDTH, y);
    y += 6;
  }

  if (plano.observacoes) {
    y = checkNewPage(doc, y, 15);
    y = sectionTitle(doc, y, "Dicas do seu Nutricionista");
    y = bodyText(doc, y, plano.observacoes);
  }

  addFooter(doc, config);
  return doc;
}

// Helpers
function calcDailyTotals(refeicoes: PlanoData["refeicoes"]) {
  let kcal = 0, prot = 0, carb = 0, lip = 0;
  for (const r of refeicoes) {
    for (const a of r.alimentos) {
      kcal += a.energia_kcal || 0;
      prot += a.proteina_g || 0;
      carb += a.carboidrato_g || 0;
      lip += a.lipidio_g || 0;
    }
  }
  return { kcal, prot, carb, lip };
}

function calcMealTotals(alimentos: PlanoData["refeicoes"][0]["alimentos"]) {
  let kcal = 0, prot = 0, carb = 0, lip = 0;
  for (const a of alimentos) {
    kcal += a.energia_kcal || 0;
    prot += a.proteina_g || 0;
    carb += a.carboidrato_g || 0;
    lip += a.lipidio_g || 0;
  }
  return { kcal, prot, carb, lip };
}

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatObj(obj: string): string {
  const map: Record<string, string> = {
    emagrecimento: "Emagrecimento", ganho_de_massa: "Ganho de massa",
    saude_intestinal: "Saúde intestinal", controle_ansiedade_alimentar: "Controle da ansiedade alimentar",
    performance: "Performance", outro: "Outro",
  };
  return map[obj] || obj;
}
