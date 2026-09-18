/**
 * Vencimento do acompanhamento.
 *
 * Tudo aqui trabalha com datas "AAAA-MM-DD" (a coluna do banco é `date`),
 * sem hora e sem fuso, para "vence hoje" significar hoje no calendário da
 * clínica e não depender do horário em que a tela foi aberta.
 */
import { addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";

export type Modalidade = "mensal" | "bimestral" | "trimestral" | "personalizado";

export const MODALIDADES: { valor: Modalidade; rotulo: string; meses: number | null }[] = [
  { valor: "mensal", rotulo: "Mensal", meses: 1 },
  { valor: "bimestral", rotulo: "Bimestral", meses: 2 },
  { valor: "trimestral", rotulo: "Trimestral", meses: 3 },
  { valor: "personalizado", rotulo: "Personalizado", meses: null },
];

export function rotuloModalidade(m: string | null | undefined): string {
  return MODALIDADES.find((x) => x.valor === m)?.rotulo ?? "—";
}

export type Situacao = "vencido" | "vence_hoje" | "vencendo" | "em_dia";

export interface Contrato {
  id: string;
  paciente_id: string;
  modalidade: Modalidade;
  data_inicio: string;
  data_vencimento: string;
  valor?: number | null;
  status: "ativo" | "renovado" | "encerrado";
  observacoes?: string | null;
}

/** Hoje, como "AAAA-MM-DD" no calendário local. */
export function hojeISO(agora: Date = new Date()): string {
  return format(agora, "yyyy-MM-dd");
}

/**
 * Data de vencimento a partir do início e da modalidade. Soma meses de
 * calendário, não 30 dias: 31/01 mais um mês vence em 28/02 (ou 29/02).
 * Devolve null para "personalizado", em que a data é escolhida à mão.
 */
export function calcularVencimento(inicio: string, modalidade: Modalidade): string | null {
  const meses = MODALIDADES.find((m) => m.valor === modalidade)?.meses;
  if (!meses || !inicio) return null;
  return format(addMonths(parseISO(inicio), meses), "yyyy-MM-dd");
}

/** Dias de hoje até o vencimento. Negativo quando já venceu. */
export function diasAteVencimento(vencimento: string, hoje: string = hojeISO()): number {
  return differenceInCalendarDays(parseISO(vencimento), parseISO(hoje));
}

export function situacao(dias: number, diasAlerta = 7): Situacao {
  if (dias < 0) return "vencido";
  if (dias === 0) return "vence_hoje";
  if (dias <= diasAlerta) return "vencendo";
  return "em_dia";
}

/** Frase curta para a interface. */
export function rotuloPrazo(dias: number): string {
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  if (dias > 1) return `Vence em ${dias} dias`;
  if (dias === -1) return "Venceu ontem";
  return `Venceu há ${Math.abs(dias)} dias`;
}

/** Quanto do período já passou, de 0 a 100. */
export function progressoPeriodo(inicio: string, vencimento: string, hoje: string = hojeISO()): number {
  const total = differenceInCalendarDays(parseISO(vencimento), parseISO(inicio));
  if (total <= 0) return 100;
  const passados = differenceInCalendarDays(parseISO(hoje), parseISO(inicio));
  return Math.min(100, Math.max(0, Math.round((passados / total) * 100)));
}

/**
 * Início sugerido para a renovação. Renovando antes de vencer, o período
 * novo começa onde o antigo termina, para ninguém perder dias pagos.
 * Renovando depois, começa hoje, para não cobrar pelo tempo em que a
 * paciente esteve fora.
 */
export function inicioDaRenovacao(vencimentoAnterior: string, hoje: string = hojeISO()): string {
  return vencimentoAnterior > hoje ? vencimentoAnterior : hoje;
}

/** Contrato vigente da paciente: o ativo mais recente. */
export function contratoVigente<T extends Pick<Contrato, "status" | "data_vencimento">>(contratos: T[]): T | null {
  const ativos = contratos.filter((c) => c.status === "ativo");
  if (ativos.length === 0) return null;
  return ativos.reduce((a, b) => (b.data_vencimento > a.data_vencimento ? b : a));
}

/** "25/09/2026" a partir de "2026-09-25", sem passar por fuso. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}
