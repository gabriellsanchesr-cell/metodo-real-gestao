/**
 * Contas do portal da paciente, separadas da tela para poder testar.
 */
import { addDays, format } from "date-fns";

/**
 * Data de hoje no fuso da paciente, "yyyy-MM-dd". Nunca usar
 * toISOString().slice(0, 10): isso é UTC, e depois das 21h em Brasília já é
 * o dia seguinte (o jantar ia para o diário de amanhã).
 */
export function hojeLocal(agora: Date = new Date()): string {
  return format(agora, "yyyy-MM-dd");
}

/**
 * Dias seguidos com registro no diário. Se hoje ainda não tem registro, a
 * sequência conta até ontem: às 8h da manhã ela não deve aparecer zerada.
 */
export function sequenciaDeDias(datas: string[], agora: Date = new Date()): number {
  const dias = new Set(datas);
  let inicio = 0;
  if (!dias.has(hojeLocal(agora))) inicio = 1;
  let n = 0;
  while (dias.has(hojeLocal(addDays(agora, -(inicio + n))))) n++;
  return n;
}

interface AvaliacaoComPeso { peso?: number | null }

/**
 * Peso para a tela inicial: o da avaliação mais recente (lista em ordem
 * decrescente de data), com a variação desde o peso inicial do cadastro.
 */
export function pesoAtual(
  avaliacoes: AvaliacaoComPeso[],
  pesoInicial: number | null | undefined,
): { peso: number | null; variacao: number | null } {
  const ultima = avaliacoes.find((a) => a.peso != null && Number(a.peso) > 0);
  const inicial = pesoInicial != null && Number(pesoInicial) > 0 ? Number(pesoInicial) : null;
  if (!ultima) return { peso: inicial, variacao: null };
  const peso = Number(ultima.peso);
  const variacao = inicial != null ? Math.round((peso - inicial) * 10) / 10 : null;
  return { peso, variacao: variacao === 0 ? 0 : variacao };
}

const FASES: Record<string, string> = {
  rotina: "Rotina",
  estrategia: "Estratégia",
  autonomia: "Autonomia",
  liberdade: "Liberdade",
};

export function rotuloFase(fase: string | null | undefined): string {
  return (fase && FASES[fase]) || "—";
}

interface RefeicaoComHorario {
  horario_sugerido?: string | null;
  ordem?: number | null;
  nome_customizado?: string | null;
}

/** Minutos desde a meia-noite de "HH:MM" ou "HH:MM:SS"; null se inválido. */
function minutos(h: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(h ?? "");
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v >= 0 && v < 24 * 60 ? v : null;
}

/** Tolerância: a refeição das 12h ainda é "a próxima" até as 12h30. */
const TOLERANCIA_MIN = 30;

/**
 * Próxima refeição pelo horário sugerido. Depois da última do dia, mostra a
 * primeira de amanhã. Sem nenhum horário no plano, não há como saber: null.
 */
export function proximaRefeicao<T extends RefeicaoComHorario>(
  refeicoes: T[],
  agora: Date = new Date(),
): { refeicao: T; amanha: boolean } | null {
  const comHorario = refeicoes
    .filter((r) => r.nome_customizado !== "Resumo do PDF")
    .map((r) => ({ r, min: minutos(r.horario_sugerido) }))
    .filter((x): x is { r: T; min: number } => x.min != null)
    .sort((a, b) => a.min - b.min || (a.r.ordem ?? 0) - (b.r.ordem ?? 0));
  if (comHorario.length === 0) return null;
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const hoje = comHorario.find((x) => x.min + TOLERANCIA_MIN >= agoraMin);
  return hoje ? { refeicao: hoje.r, amanha: false } : { refeicao: comHorario[0].r, amanha: true };
}
