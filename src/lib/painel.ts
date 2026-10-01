/**
 * Critérios das métricas do painel, num lugar só. Antes o Dashboard e os
 * Relatórios contavam "retorno pendente" de jeitos diferentes e davam
 * números diferentes para a mesma pergunta.
 */
import { differenceInCalendarDays, format, subDays } from "date-fns";

export interface PacienteBasico {
  id: string;
  ativo?: boolean | null;
  account_status?: string | null;
}

export interface ConsultaBasica {
  paciente_id: string;
  data_hora: string;
  status?: string | null;
}

/**
 * Paciente ativa, na definição do Gabriel: tem o portal liberado e o
 * cadastro não está arquivado. É o filtro "Ativo" da lista de pacientes.
 */
export function ehAtiva(p: PacienteBasico): boolean {
  return p.account_status === "ativo" && p.ativo !== false;
}

/** Janela do retorno pendente, em dias desde a última consulta. */
export const RETORNO_MIN_DIAS = 30;
export const RETORNO_MAX_DIAS = 45;

/**
 * Ativas que estão na hora de voltar: a última consulta (que não foi
 * cancelada) aconteceu há 30 a 45 dias e não há consulta futura marcada.
 * Mais recentes primeiro na fila: quem está há mais tempo aparece antes.
 */
export function retornosPendentes<P extends PacienteBasico>(
  pacientes: P[],
  consultas: ConsultaBasica[],
  agora: Date = new Date(),
): { paciente: P; dias: number }[] {
  const ultima = new Map<string, Date>();
  const comFutura = new Set<string>();
  for (const c of consultas) {
    const d = new Date(c.data_hora);
    if (Number.isNaN(d.getTime())) continue;
    if (d > agora) {
      if (c.status === "agendado") comFutura.add(c.paciente_id);
      continue;
    }
    if (c.status === "cancelado") continue;
    const prev = ultima.get(c.paciente_id);
    if (!prev || d > prev) ultima.set(c.paciente_id, d);
  }
  const lista: { paciente: P; dias: number }[] = [];
  for (const p of pacientes) {
    if (!ehAtiva(p) || comFutura.has(p.id)) continue;
    const u = ultima.get(p.id);
    if (!u) continue;
    const dias = differenceInCalendarDays(agora, u);
    if (dias >= RETORNO_MIN_DIAS && dias <= RETORNO_MAX_DIAS) lista.push({ paciente: p, dias });
  }
  return lista.sort((a, b) => b.dias - a.dias);
}

/** Ativas sem peso lançado nos últimos 7 dias (data local, não UTC). */
export function semPesoNaSemana<P extends PacienteBasico>(
  pacientes: P[],
  acompanhamentos: { paciente_id: string; data_registro: string; peso?: number | null }[],
  agora: Date = new Date(),
): P[] {
  const desde = format(subDays(agora, 7), "yyyy-MM-dd");
  const comPeso = new Set(
    acompanhamentos.filter((a) => a.peso != null && a.data_registro >= desde).map((a) => a.paciente_id),
  );
  return pacientes.filter((p) => ehAtiva(p) && !comPeso.has(p.id));
}

/** Consultas que já passaram e continuam "agendado": falta marcar realizada ou falta. */
export function consultasParaFechar<C extends ConsultaBasica>(consultas: C[], agora: Date = new Date()): C[] {
  return consultas
    .filter((c) => c.status === "agendado" && new Date(c.data_hora) < agora)
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
}

/**
 * Último peso e a variação em relação ao anterior, juntando as duas fontes:
 * avaliações físicas (onde o nutri pesa) e acompanhamentos (lançados pelo
 * nutri ou pela paciente no portal). Antes a ficha só olhava acompanhamentos
 * e mostrava "sem peso" para quem tinha avaliação.
 */
export function ultimoPeso(
  avaliacoes: { data_avaliacao: string; peso?: number | null }[],
  acompanhamentos: { data_registro: string; peso?: number | null }[],
): { peso: number; data: string; variacao: number | null } | null {
  const registros = [
    ...avaliacoes.map((a) => ({ data: a.data_avaliacao.slice(0, 10), peso: a.peso })),
    ...acompanhamentos.map((a) => ({ data: a.data_registro.slice(0, 10), peso: a.peso })),
  ]
    .filter((r): r is { data: string; peso: number } => r.peso != null && Number(r.peso) > 0)
    .sort((a, b) => b.data.localeCompare(a.data));
  if (registros.length === 0) return null;
  const [ultimo, anterior] = registros;
  const variacao = anterior ? Math.round((Number(ultimo.peso) - Number(anterior.peso)) * 10) / 10 : null;
  return { peso: Number(ultimo.peso), data: ultimo.data, variacao };
}
