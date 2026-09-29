/**
 * Acesso às tabelas da migration 20260929120000_captacao.
 *
 * Como em contratosApi, o arquivo de tipos gerado ainda não conhece as
 * colunas e tabelas novas; o cast fica concentrado aqui.
 */
import { addDays, format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { lerDiasAlerta, listarContratosAtivos } from "@/lib/contratosApi";
import { hojeISO } from "@/lib/vencimento";
import {
  GATILHOS, proximoToqueDepoisDeEnvio,
  type DadosFila, type Gatilho, type ItemFila, type LeadFila, type LeadImportado,
} from "@/lib/captacao";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Categoria das respostas rápidas que substituem as mensagens padrão da fila. */
export const CATEGORIA_CAPTACAO = "Captação";

export interface Parceiro {
  id: string;
  user_id: string;
  nome: string;
  tipo: string;
  telefone: string | null;
  slug: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
}

const dia = (iso: string) => iso.slice(0, 10);

function maisRecentePorPaciente(linhas: { paciente_id: string | null; data: string | null }[]) {
  const out: Record<string, string> = {};
  for (const l of linhas) {
    if (!l.paciente_id || !l.data) continue;
    const d = dia(l.data);
    if (!out[l.paciente_id] || d > out[l.paciente_id]) out[l.paciente_id] = d;
  }
  return out;
}

/** Tudo que a fila precisa, numa leva só. Lança o erro original se faltar a migration. */
export async function carregarDadosFila(): Promise<{ dados: DadosFila; pacientesNovos: { origem: string | null; created_at: string }[] }> {
  const seisMeses = new Date(Date.now() - 180 * 86400000).toISOString();
  const [leads, pacientes, contratos, diasAlerta, consultas, planos, avaliacoes, parceiros, toques, respostas] = await Promise.all([
    db.from("leads").select("id, nome, telefone, origem, status, created_at, ultimo_toque, proximo_toque, tentativas, parceiro_id"),
    db.from("pacientes").select("id, nome_completo, telefone, objetivo, ativo, created_at, origem"),
    listarContratosAtivos(),
    lerDiasAlerta(),
    db.from("consultas").select("paciente_id, data_hora").eq("status", "realizado"),
    db.from("planos_alimentares").select("paciente_id, created_at").not("paciente_id", "is", null),
    db.from("avaliacoes_fisicas")
      .select("paciente_id, data_avaliacao, peso, percentual_gordura_dobras, bio_percentual_gordura, massa_magra_kg")
      .gte("data_avaliacao", seisMeses.slice(0, 10)),
    db.from("parceiros").select("id, nome, telefone, ativo, created_at"),
    db.from("captacao_toques").select("lead_id, paciente_id, parceiro_id, gatilho, resultado, created_at").gte("created_at", seisMeses),
    db.from("respostas_rapidas").select("titulo, texto").eq("categoria", CATEGORIA_CAPTACAO).eq("ativo", true),
  ]);

  for (const r of [leads, pacientes, consultas, planos, avaliacoes, parceiros, toques]) {
    if (r.error) throw r.error;
  }

  const ultimaAtividade = maisRecentePorPaciente([
    ...(consultas.data ?? []).map((c: { paciente_id: string; data_hora: string }) => ({ paciente_id: c.paciente_id, data: c.data_hora })),
    ...(planos.data ?? []).map((p: { paciente_id: string; created_at: string }) => ({ paciente_id: p.paciente_id, data: p.created_at })),
  ]);

  // Resposta rápida cujo título é o nome do gatilho ("Renovação", "Pedir indicação"...).
  const mensagens: Partial<Record<Gatilho, string>> = {};
  for (const r of (respostas.data ?? []) as { titulo: string; texto: string }[]) {
    const g = (Object.keys(GATILHOS) as Gatilho[]).find((k) => GATILHOS[k].rotulo.toLowerCase() === r.titulo.trim().toLowerCase());
    if (g) mensagens[g] = r.texto;
  }

  const listaPacientes = pacientes.data ?? [];
  return {
    dados: {
      leads: leads.data ?? [],
      pacientes: listaPacientes,
      contratos,
      ultimaAtividade,
      avaliacoes: avaliacoes.data ?? [],
      parceiros: parceiros.data ?? [],
      toques: toques.data ?? [],
      diasAlerta,
      mensagens,
    },
    pacientesNovos: listaPacientes.map((p: { origem: string | null; created_at: string }) => ({ origem: p.origem, created_at: p.created_at })),
  };
}

async function registrarToque(userId: string, item: Pick<ItemFila, "alvo" | "id" | "gatilho">, resultado: string) {
  const alvo = item.alvo === "lead" ? { lead_id: item.id } : item.alvo === "paciente" ? { paciente_id: item.id } : { parceiro_id: item.id };
  const { error } = await db.from("captacao_toques").insert({ user_id: userId, gatilho: item.gatilho, resultado, ...alvo });
  if (error) throw error;
}

/**
 * Mensagem enviada. Para lead, avança a cadência: próximo toque em 1 dia,
 * depois em 3, e no terceiro sem resposta o lead é encerrado sem insistir.
 */
export async function marcarEnviado(userId: string, item: ItemFila) {
  await registrarToque(userId, item, "enviado");
  if (item.alvo !== "lead" || !item.lead) return;
  const l = item.lead;
  const proximo = proximoToqueDepoisDeEnvio(l.tentativas);
  const encerra = proximo === null;
  const campos: Record<string, unknown> = {
    ultimo_toque: new Date().toISOString(),
    tentativas: l.tentativas + 1,
    proximo_toque: proximo,
  };
  if (l.status === "novo") campos.status = "em_contato";
  if (encerra) {
    campos.status = "perdido";
    campos.motivo_perda = "Sem resposta depois de 3 toques";
  }
  const { error } = await db.from("leads").update(campos).eq("id", l.id);
  if (error) throw error;
}

/** O lead respondeu: zera a cadência. Se ficar parado 2 dias, volta como lead quente. */
export async function marcarRespondeu(userId: string, lead: LeadFila, gatilho: Gatilho) {
  await registrarToque(userId, { alvo: "lead", id: lead.id, gatilho }, "respondeu");
  const { error } = await db.from("leads").update({
    ultimo_toque: new Date().toISOString(),
    tentativas: 0,
    proximo_toque: null,
    status: lead.status === "novo" ? "em_contato" : lead.status,
  }).eq("id", lead.id);
  if (error) throw error;
}

/** "Agora não": some da fila por alguns dias. */
export async function adiar(userId: string, item: ItemFila, dias = 3) {
  if (item.alvo === "lead") {
    const proximo = format(addDays(parseISO(hojeISO()), dias), "yyyy-MM-dd");
    const { error } = await db.from("leads").update({ proximo_toque: proximo }).eq("id", item.id);
    if (error) throw error;
    return;
  }
  await registrarToque(userId, item, "adiado");
}

export async function marcarPerdido(userId: string, lead: LeadFila, gatilho: Gatilho, motivo: string) {
  await registrarToque(userId, { alvo: "lead", id: lead.id, gatilho }, "perdido");
  const { error } = await db.from("leads").update({ status: "perdido", motivo_perda: motivo || null, proximo_toque: null }).eq("id", lead.id);
  if (error) throw error;
}

/**
 * Cria o paciente a partir do lead, com origem e vínculo, e fecha o lead.
 * Devolve o id do paciente para a tela abrir a ficha.
 */
export async function converterLead(
  userId: string,
  lead: { id: string; nome: string; telefone: string | null; email: string | null; origem: string },
): Promise<string> {
  const { data, error } = await db.from("pacientes").insert({
    user_id: userId,
    nome_completo: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    origem: lead.origem,
    lead_id: lead.id,
  }).select("id").single();
  if (error) throw error;
  const pacienteId = data.id as string;
  const upd = await db.from("leads").update({ status: "converteu", paciente_id: pacienteId, proximo_toque: null }).eq("id", lead.id);
  if (upd.error) throw upd.error;
  await registrarToque(userId, { alvo: "lead", id: lead.id, gatilho: "lead_quente" }, "converteu");
  return pacienteId;
}

export async function importarLeads(userId: string, leads: LeadImportado[]) {
  if (leads.length === 0) return;
  const { error } = await db.from("leads").insert(leads.map((l) => ({ ...l, user_id: userId })));
  if (error) throw error;
}

// ---- Parceiros ------------------------------------------------------
export async function listarParceiros(): Promise<Parceiro[]> {
  const { data, error } = await db.from("parceiros").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

export function gerarSlug(nome: string): string {
  return nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function salvarParceiro(userId: string, p: Partial<Parceiro> & { nome: string }) {
  const payload = {
    user_id: userId,
    nome: p.nome.trim(),
    tipo: p.tipo ?? "personal",
    telefone: p.telefone || null,
    slug: p.slug || gerarSlug(p.nome),
    ativo: p.ativo ?? true,
    observacoes: p.observacoes || null,
  };
  const { error } = p.id
    ? await db.from("parceiros").update(payload).eq("id", p.id)
    : await db.from("parceiros").insert(payload);
  if (error) throw error;
}

