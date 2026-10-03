/**
 * Critérios das métricas do painel, num lugar só. Antes o Dashboard e os
 * Relatórios contavam "retorno pendente" de jeitos diferentes e davam
 * números diferentes para a mesma pergunta.
 */
import { differenceInCalendarDays, format, subDays } from "date-fns";

export interface PacienteBasico {
  id: string;
  ativo?: boolean | null;
  /** Parou o acompanhamento sem ser arquivada (migration de 02/10). */
  inativo?: boolean | null;
  account_status?: string | null;
}

export interface ConsultaBasica {
  paciente_id: string;
  data_hora: string;
  status?: string | null;
}

/**
 * Usa o portal: acesso liberado e cadastro não arquivado. É o filtro
 * "Usam o portal" da lista de pacientes e quem recebe o lembrete de peso.
 */
export function usaPortal(p: PacienteBasico): boolean {
  return p.account_status === "ativo" && p.ativo !== false;
}

/**
 * Pacientes com o acompanhamento vencido: o contrato vigente (o ativo de
 * vencimento mais distante) terminou antes de hoje. Renovado em dia, sai daqui.
 */
export function pacientesVencidos(
  contratos: { paciente_id: string; status?: string | null; data_vencimento: string }[],
  agora: Date = new Date(),
): Set<string> {
  const hoje = format(agora, "yyyy-MM-dd");
  const vigente = new Map<string, string>();
  for (const c of contratos) {
    if (c.status && c.status !== "ativo") continue;
    const atual = vigente.get(c.paciente_id);
    if (!atual || c.data_vencimento > atual) vigente.set(c.paciente_id, c.data_vencimento);
  }
  return new Set([...vigente].filter(([, venc]) => venc.slice(0, 10) < hoje).map(([id]) => id));
}

/**
 * Ativa, na definição do Gabriel: em acompanhamento, com ou sem portal.
 * Cadastro não arquivado, não marcado como inativo e acompanhamento não
 * vencido. Quem não usa o portal (atendimento só presencial ou pelo
 * WhatsApp) também conta.
 */
export function emAcompanhamento(p: PacienteBasico, vencidos: Set<string>): boolean {
  return p.ativo !== false && p.inativo !== true && !vencidos.has(p.id);
}

export type SituacaoPaciente = "ativo" | "vencido" | "inativo" | "arquivado";

export const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ativo: "Ativo",
  vencido: "Vencido",
  inativo: "Inativo",
  arquivado: "Arquivado",
};

/**
 * Onde a paciente está, na ordem em que uma situação vence a outra:
 * arquivada, depois inativa (marcada à mão), depois vencida; o resto é ativa.
 * É o mesmo critério dos filtros da lista de pacientes e do Dashboard.
 */
export function situacaoPaciente(p: PacienteBasico, vencidos: Set<string>): SituacaoPaciente {
  if (p.ativo === false) return "arquivado";
  if (p.inativo === true) return "inativo";
  if (vencidos.has(p.id)) return "vencido";
  return "ativo";
}

/** Janela do retorno pendente, em dias desde a última consulta. */
export const RETORNO_MIN_DIAS = 30;
export const RETORNO_MAX_DIAS = 45;

/**
 * Pacientes que estão na hora de voltar: a última consulta (que não foi
 * cancelada) aconteceu há 30 a 45 dias e não há consulta futura marcada.
 * Mais recentes primeiro na fila: quem está há mais tempo aparece antes.
 */
export function retornosPendentes<P extends PacienteBasico>(
  pacientes: P[],
  consultas: ConsultaBasica[],
  agora: Date,
  ehAtiva: (p: P) => boolean,
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

/**
 * Quem usa o portal e não lançou peso nos últimos 7 dias (data local, não
 * UTC). Quem não usa o portal fica de fora: não tem onde lançar.
 */
export function semPesoNaSemana<P extends PacienteBasico>(
  pacientes: P[],
  acompanhamentos: { paciente_id: string; data_registro: string; peso?: number | null }[],
  agora: Date = new Date(),
  vencidos: Set<string> = new Set(),
): P[] {
  const desde = format(subDays(agora, 7), "yyyy-MM-dd");
  const comPeso = new Set(
    acompanhamentos.filter((a) => a.peso != null && a.data_registro >= desde).map((a) => a.paciente_id),
  );
  return pacientes.filter((p) => usaPortal(p) && p.inativo !== true && !vencidos.has(p.id) && !comPeso.has(p.id));
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
