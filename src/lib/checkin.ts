/**
 * Check-in semanal respondido pela paciente no portal (tabela
 * checkins_semanais, migration 20261010120000). Regras num lugar só, usadas
 * pelo portal, pela ficha, pelo sino e pelo painel.
 */
import { addDays, differenceInCalendarDays } from "date-fns";
import { dataLocal, isoLocal } from "@/lib/datas";

export const NOTAS_CHECKIN = ["fome", "disposicao", "intestino", "sono", "treino", "alimentacao", "seguiu_plano", "vontade_doce", "agua"] as const;
export type NotaCheckin = (typeof NOTAS_CHECKIN)[number];

export interface PerguntaCheckin {
  id: NotaCheckin;
  rotulo: string;
  pergunta: string;
  /** Pontas da escala. A nota 5 é sempre o lado bom, em todas as perguntas. */
  ruim: string;
  bom: string;
  /** Dica do campo de texto livre. */
  dica: string;
}

export const PERGUNTAS: PerguntaCheckin[] = [
  { id: "fome", rotulo: "Fome", pergunta: "Como ficou a sua fome ao longo dos dias?", ruim: "Muita fome", bom: "Fome sob controle", dica: "Em que horário a fome apertou mais?" },
  { id: "disposicao", rotulo: "Disposição", pergunta: "Como esteve a sua energia no dia a dia?", ruim: "Sem energia", bom: "Muita disposição", dica: "Algum momento do dia em que a energia caiu?" },
  { id: "intestino", rotulo: "Intestino", pergunta: "Como funcionou o seu intestino?", ruim: "Preso ou desregulado", bom: "Funcionando bem", dica: "Gases, inchaço ou mudança na frequência?" },
  { id: "sono", rotulo: "Sono", pergunta: "Como foi a qualidade do seu sono?", ruim: "Dormi mal", bom: "Dormi muito bem", dica: "Dificuldade para pegar no sono ou acordou no meio da noite?" },
  { id: "treino", rotulo: "Treino", pergunta: "Como foi o seu rendimento nos treinos?", ruim: "Rendi pouco ou não treinei", bom: "Rendi muito bem", dica: "Quantos treinos fez? Sentiu fraqueza em algum?" },
  { id: "alimentacao", rotulo: "Alimentação", pergunta: "Como você se sentiu com a comida do plano?", ruim: "Enjoei, cansei", bom: "Gostando bastante", dica: "Enjoou de alguma refeição? O que gostaria de trocar?" },
  { id: "seguiu_plano", rotulo: "Plano", pergunta: "O quanto você conseguiu seguir o plano?", ruim: "Quase nada", bom: "Quase tudo", dica: "Qual refeição foi mais difícil de manter?" },
  { id: "vontade_doce", rotulo: "Vontade de doce", pergunta: "Como ficaram a vontade de doce e a ansiedade com comida?", ruim: "Muito difícil de lidar", bom: "Bem tranquilo", dica: "Em que situação a vontade apareceu?" },
  { id: "agua", rotulo: "Água", pergunta: "O quanto você chegou perto da meta de água?", ruim: "Bebi muito pouco", bom: "Bati a meta", dica: "O que atrapalhou?" },
];

/** Circunferências, as mesmas chaves e a mesma ordem da avaliação física. */
export const MEDIDAS_CORPO: { key: string; label: string }[] = [
  { key: "circ_pescoco", label: "Pescoço" },
  { key: "circ_torax", label: "Tórax" },
  { key: "circ_ombro", label: "Ombro" },
  { key: "circ_cintura", label: "Cintura" },
  { key: "circ_quadril", label: "Quadril" },
  { key: "circ_abdomen", label: "Abdômen" },
  { key: "circ_braco_esq", label: "Braço Esq. Relaxado" },
  { key: "circ_braco_dir", label: "Braço Dir. Relaxado" },
  { key: "circ_braco_contraido_esq", label: "Braço Esq. Contraído" },
  { key: "circ_braco_contraido_dir", label: "Braço Dir. Contraído" },
  { key: "circ_antebraco_esq", label: "Antebraço Esq." },
  { key: "circ_antebraco_dir", label: "Antebraço Dir." },
  { key: "circ_coxa_proximal_esq", label: "Coxa Proximal Esq." },
  { key: "circ_coxa_proximal_dir", label: "Coxa Proximal Dir." },
  { key: "circ_coxa_medial_esq", label: "Coxa Medial Esq." },
  { key: "circ_coxa_medial_dir", label: "Coxa Medial Dir." },
  { key: "circ_coxa_distal_esq", label: "Coxa Distal Esq." },
  { key: "circ_coxa_distal_dir", label: "Coxa Distal Dir." },
  { key: "circ_panturrilha_esq", label: "Panturrilha Esq." },
  { key: "circ_panturrilha_dir", label: "Panturrilha Dir." },
];

export type Checkin = {
  id: string;
  paciente_id: string;
  semana: string;
  peso: number | null;
  comentarios: Record<string, string> | null;
  dificuldades: string | null;
  conquista: string | null;
  medidas: Record<string, number> | null;
  visto_nutri: boolean;
  created_at: string;
} & { [K in NotaCheckin]: number | null };

/** Intervalo das medidas, em dias. */
export const DIAS_ENTRE_MEDIDAS = 14;

/**
 * Semana do check-in: o sábado mais recente (hoje, se hoje for sábado), como
 * "AAAA-MM-DD" local. O e-mail sai no sábado e a resposta vale até a sexta.
 */
export function semanaDoCheckin(hoje: Date = new Date()): string {
  const desdeSabado = (hoje.getDay() + 1) % 7; // sábado 0, domingo 1, ... sexta 6
  return isoLocal(addDays(hoje, -desdeSabado));
}

export function checkinDaSemana<C extends { semana: string }>(checkins: C[], hoje: Date = new Date()): C | null {
  const semana = semanaDoCheckin(hoje);
  return checkins.find((c) => c.semana.slice(0, 10) === semana) ?? null;
}

export function checkinPendente(checkins: { semana: string }[], hoje: Date = new Date()): boolean {
  return checkinDaSemana(checkins, hoje) === null;
}

function temMedidas(c: { medidas?: Record<string, number> | null }): boolean {
  return !!c.medidas && Object.values(c.medidas).some((v) => Number(v) > 0);
}

/**
 * Pedir medidas neste check-in? Só para quem o nutri habilitou, e quando a
 * última semana com medidas foi há 14 dias ou mais (ou nunca houve).
 * O check-in desta semana não conta: quem está editando continua vendo o bloco.
 */
export function pedirMedidas(
  paciente: { checkin_medidas?: boolean | null },
  checkins: { semana: string; medidas?: Record<string, number> | null }[],
  hoje: Date = new Date(),
): boolean {
  if (paciente.checkin_medidas !== true) return false;
  const semana = semanaDoCheckin(hoje);
  const anteriores = checkins.filter((c) => c.semana.slice(0, 10) < semana && temMedidas(c)).map((c) => c.semana.slice(0, 10)).sort();
  const ultima = anteriores[anteriores.length - 1];
  if (!ultima) return true;
  return differenceInCalendarDays(dataLocal(semana), dataLocal(ultima)) >= DIAS_ENTRE_MEDIDAS;
}

export interface PontoDeAtencao {
  rotulo: string;
  nota: number | null;
  texto: string | null;
}

/** O que pede olhar do nutri: notas 1 ou 2 e a caixa de dificuldades. */
export function pontosDeAtencao(c: Partial<Checkin>): PontoDeAtencao[] {
  const pontos: PontoDeAtencao[] = [];
  for (const p of PERGUNTAS) {
    const nota = c[p.id];
    if (nota != null && nota <= 2) pontos.push({ rotulo: p.rotulo, nota, texto: c.comentarios?.[p.id]?.trim() || null });
  }
  if (c.dificuldades?.trim()) pontos.push({ rotulo: "Dificuldades", nota: null, texto: c.dificuldades.trim() });
  return pontos;
}

/** Média das notas respondidas, com uma casa. Null se nenhuma foi respondida. */
export function mediaDoCheckin(c: Partial<Checkin>): number | null {
  const notas = NOTAS_CHECKIN.map((n) => c[n]).filter((v): v is number => v != null);
  if (notas.length === 0) return null;
  return Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10;
}

/** Variação de cada medida em relação ao check-in anterior que a tem. */
export function variacaoMedidas(
  atual: Record<string, number> | null | undefined,
  anteriores: (Record<string, number> | null | undefined)[],
): { key: string; label: string; valor: number; variacao: number | null }[] {
  if (!atual) return [];
  return MEDIDAS_CORPO.filter((m) => Number(atual[m.key]) > 0).map((m) => {
    const antes = anteriores.map((a) => Number(a?.[m.key])).find((v) => v > 0);
    const valor = Number(atual[m.key]);
    return { key: m.key, label: m.label, valor, variacao: antes ? Math.round((valor - antes) * 10) / 10 : null };
  });
}

/** Portal liberado, em acompanhamento, que não respondeu o check-in da semana. */
export function semCheckinNaSemana<P extends { id: string }>(
  pacientes: P[],
  checkins: { paciente_id: string; semana: string }[],
  hoje: Date = new Date(),
): P[] {
  const semana = semanaDoCheckin(hoje);
  const responderam = new Set(checkins.filter((c) => c.semana.slice(0, 10) === semana).map((c) => c.paciente_id));
  return pacientes.filter((p) => !responderam.has(p.id));
}
