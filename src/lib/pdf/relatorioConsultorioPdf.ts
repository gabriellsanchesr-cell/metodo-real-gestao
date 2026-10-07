import { dataLocal } from "@/lib/datas";
import {
  createDoc, addHeader, addFooter, addCoverPage, sectionTitle, bodyText,
  autoTable, MARGINS, loadPdfConfig, checkNewPage, labelText,
} from "./pdfBrand";

export async function generateRelatorioConsultorioPdf(
  pacientes: any[],
  consultas: any[],
  avaliacoes: any[],
  acompanhamentos: any[],
  checklists: any[],
  userId?: string,
) {
  const config = userId ? await loadPdfConfig(userId) : {};
  const doc = createDoc();
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  // Cover
  addCoverPage(doc, "Relatório do Consultório", "Visão Geral", config, { dataEmissao });

  // Page 1 - Carteira
  addHeader(doc, "Relatório do Consultório");
  let y = 28;
  y = sectionTitle(doc, y, "1. Carteira de Pacientes");

  // Situação vem de Relatorios.tsx (src/lib/painel.ts); sem ela, cai no cadastro.
  const ativos = pacientes.filter(p => (p.situacao ?? (p.ativo === false ? "arquivado" : "ativo")) === "ativo");
  const inativos = pacientes.filter(p => !ativos.includes(p));
  const retencao = pacientes.length > 0 ? Math.round((ativos.length / pacientes.length) * 100) : 0;

  y = labelText(doc, y, "Total de pacientes ativos: ", String(ativos.length));
  y = labelText(doc, y, "Pacientes inativos: ", String(inativos.length));
  y = labelText(doc, y, "Taxa de retenção: ", `${retencao}%`);
  y = labelText(doc, y, "Total de consultas: ", String(consultas.filter(c => c.status === "realizado").length));
  y += 4;

  // Distribuição por fase
  y = sectionTitle(doc, y, "2. Distribuição por Fase R.E.A.L.");
  const fases = ["rotina", "estrategia", "autonomia", "liberdade"];
  const faseLabels: Record<string, string> = { rotina: "Rastreio", estrategia: "Estratégia", autonomia: "Ajuste", liberdade: "Lifestyle" };
  const faseData = fases.map(f => [faseLabels[f], String(ativos.filter(p => p.fase_real === f).length)]);
  y = autoTable(doc, y, [["Fase", "Pacientes"]], faseData);

  // Distribuição por objetivo
  y = checkNewPage(doc, y, 40);
  y = sectionTitle(doc, y, "3. Distribuição por Objetivo");
  const objMap: Record<string, number> = {};
  ativos.forEach(p => { const o = p.objetivo || "outro"; objMap[o] = (objMap[o] || 0) + 1; });
  const objData = Object.entries(objMap).map(([k, v]) => [k, String(v)]);
  y = autoTable(doc, y, [["Objetivo", "Pacientes"]], objData);

  // Evolução clínica resumida
  y = checkNewPage(doc, y, 40);
  y = sectionTitle(doc, y, "4. Evolução Clínica");
  const evolRows = ativos.map(p => {
    const avals = avaliacoes.filter((a: any) => a.paciente_id === p.id && a.peso).sort((a: any, b: any) => dataLocal(a.data_avaliacao).getTime() - dataLocal(b.data_avaliacao).getTime());
    if (avals.length < 2) return null;
    const v = Math.round((avals[avals.length - 1].peso - avals[0].peso) * 10) / 10;
    return [p.nome_completo, String(avals[0].peso), String(avals[avals.length - 1].peso), `${v > 0 ? "+" : ""}${v}kg`];
  }).filter(Boolean) as string[][];

  if (evolRows.length > 0) {
    y = autoTable(doc, y, [["Paciente", "Peso Inicial", "Peso Atual", "Variação"]], evolRows);
  } else {
    y = bodyText(doc, y, "Sem dados suficientes de evolução clínica.");
  }

  // Engajamento resumo
  y = checkNewPage(doc, y, 30);
  y = sectionTitle(doc, y, "5. Engajamento");
  const totalCheckins = checklists.filter(c => c.respondido).length;
  const aderencias = checklists.filter(c => c.respondido && c.aderencia_plano != null);
  const mediaAderencia = aderencias.length > 0
    ? Math.round(aderencias.reduce((s: number, c: any) => s + c.aderencia_plano, 0) / aderencias.length)
    : 0;

  y = labelText(doc, y, "Total de check-ins respondidos: ", String(totalCheckins));
  y = labelText(doc, y, "Aderência média ao plano: ", `${mediaAderencia}%`);

  addFooter(doc, config);
  doc.save(`relatorio_consultorio_${dataEmissao.replace(/\//g, "-")}.pdf`);
}
