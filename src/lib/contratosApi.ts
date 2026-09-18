/**
 * Acesso às tabelas criadas na migration 20260918120000.
 *
 * O arquivo de tipos gerado (integrations/supabase/types.ts) ainda não as
 * conhece; ele é regenerado depois que a migration é aplicada no banco.
 * Enquanto isso, o cast fica concentrado aqui, e não espalhado pelas telas.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Contrato, Modalidade } from "@/lib/vencimento";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ContratoComPaciente extends Contrato {
  user_id: string;
  pacientes?: { id: string; nome_completo: string; ativo: boolean | null } | null;
}

export interface NovoContrato {
  user_id: string;
  paciente_id: string;
  modalidade: Modalidade;
  data_inicio: string;
  data_vencimento: string;
  valor?: number | null;
  observacoes?: string | null;
}

export async function listarContratosDoPaciente(pacienteId: string): Promise<Contrato[]> {
  const { data, error } = await db
    .from("contratos_acompanhamento")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("data_vencimento", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Contratos ativos de todas as pacientes, do vencimento mais próximo ao mais distante. */
export async function listarContratosAtivos(): Promise<ContratoComPaciente[]> {
  const { data, error } = await db
    .from("contratos_acompanhamento")
    .select("*, pacientes(id, nome_completo, ativo)")
    .eq("status", "ativo")
    .order("data_vencimento", { ascending: true });
  if (error) throw error;
  return (data ?? []).filter((c: ContratoComPaciente) => c.pacientes?.ativo !== false);
}

export async function criarContrato(c: NovoContrato) {
  const { error } = await db.from("contratos_acompanhamento").insert(c);
  if (error) throw error;
}

export async function atualizarContrato(id: string, campos: Partial<NovoContrato> & { status?: Contrato["status"] }) {
  const { error } = await db.from("contratos_acompanhamento").update(campos).eq("id", id);
  if (error) throw error;
}

/** Renova: o contrato atual vira "renovado" e nasce um novo, ativo. */
export async function renovarContrato(atualId: string, novo: NovoContrato) {
  await atualizarContrato(atualId, { status: "renovado" });
  try {
    await criarContrato(novo);
  } catch (e) {
    // Sem transação no cliente: se a criação falhar, desfaz a primeira etapa
    // para a paciente não ficar sem nenhum contrato ativo.
    await atualizarContrato(atualId, { status: "ativo" }).catch(() => undefined);
    throw e;
  }
}

export interface EmailEnviado {
  id: string;
  tipo: string;
  assunto: string;
  destinatario: string;
  status: "pendente" | "enviado" | "falhou" | "simulado" | "ignorado";
  erro: string | null;
  created_at: string;
}

export async function listarEmailsDoPaciente(pacienteId: string, limite = 50): Promise<EmailEnviado[]> {
  const { data, error } = await db
    .from("notificacoes_email")
    .select("id, tipo, assunto, destinatario, status, erro, created_at")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data ?? [];
}

export async function definirReceberEmails(pacienteId: string, receber: boolean) {
  const { error } = await db.from("pacientes").update({ receber_emails: receber }).eq("id", pacienteId);
  if (error) throw error;
}

/** Quantos dias antes o sistema começa a destacar um vencimento. */
export async function lerDiasAlerta(): Promise<number> {
  const { data } = await db.from("configuracoes_clinica").select("dias_alerta_vencimento").maybeSingle();
  const n = Number(data?.dias_alerta_vencimento);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

/**
 * Verdadeiro quando o erro é "tabela não existe", ou seja, a migration
 * ainda não foi aplicada no banco. As telas usam isso para explicar o que
 * falta em vez de mostrar um erro genérico.
 */
export function faltaMigration(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205" || err.code === "42703"
    || /does not exist|schema cache/i.test(err.message ?? "");
}
