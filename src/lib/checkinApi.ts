/**
 * Acesso à tabela checkins_semanais (migration 20261010120000). O arquivo de
 * tipos gerado ainda não a conhece, então o cast fica concentrado aqui.
 */
import { supabase } from "@/integrations/supabase/client";
import { isoLocal } from "@/lib/datas";
import { NOTAS_CHECKIN, type Checkin, type NotaCheckin } from "@/lib/checkin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** A migration ainda não foi aplicada? (tabela ou coluna inexistente) */
export function faltaMigrationCheckin(erro: { code?: string; message?: string } | null | undefined): boolean {
  if (!erro) return false;
  return erro.code === "42P01" || erro.code === "PGRST205" || erro.code === "42703" || /checkins_semanais|checkin_medidas/.test(erro.message ?? "");
}

export async function listarCheckins(pacienteId: string, limite = 26): Promise<{ checkins: Checkin[]; semTabela: boolean }> {
  const { data, error } = await db
    .from("checkins_semanais")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("semana", { ascending: false })
    .limit(limite);
  if (error) return { checkins: [], semTabela: faltaMigrationCheckin(error) };
  return { checkins: (data ?? []) as Checkin[], semTabela: false };
}

export interface RespostaCheckin {
  notas: Partial<Record<NotaCheckin, number>>;
  comentarios: Partial<Record<NotaCheckin, string>>;
  peso: number | null;
  dificuldades: string;
  conquista: string;
  medidas: Record<string, number> | null;
}

/**
 * Grava (ou corrige) o check-in da semana e espelha peso, medidas básicas,
 * disposição, sono e aderência em acompanhamentos, para o gráfico de peso, o
 * relatório mensal e o painel continuarem valendo sem saber do check-in.
 */
export async function salvarCheckin(
  paciente: { id: string; user_id: string },
  semana: string,
  r: RespostaCheckin,
): Promise<void> {
  const comentarios = Object.fromEntries(Object.entries(r.comentarios).filter(([, v]) => v && v.trim()).map(([k, v]) => [k, v!.trim()]));
  const linha = {
    paciente_id: paciente.id,
    user_id: paciente.user_id,
    semana,
    peso: r.peso,
    ...Object.fromEntries(NOTAS_CHECKIN.map((n) => [n, r.notas[n] ?? null])),
    comentarios,
    dificuldades: r.dificuldades.trim() || null,
    conquista: r.conquista.trim() || null,
    medidas: r.medidas && Object.keys(r.medidas).length ? r.medidas : null,
    visto_nutri: false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("checkins_semanais").upsert(linha, { onConflict: "paciente_id,semana" });
  if (error) throw error;

  // Espelho em acompanhamentos. Se falhar, o check-in já está salvo: só avisa no console.
  const acomp = {
    peso: r.peso,
    circunferencia_abdominal: r.medidas?.circ_abdomen ?? r.medidas?.circ_cintura ?? null,
    circunferencia_quadril: r.medidas?.circ_quadril ?? null,
    nivel_energia: r.notas.disposicao ?? null,
    qualidade_sono: r.notas.sono ?? null,
    aderencia_plano: r.notas.seguiu_plano != null ? r.notas.seguiu_plano * 20 : null,
    observacoes_paciente: r.dificuldades.trim() || null,
  };
  const { data: existente } = await db
    .from("acompanhamentos")
    .select("id")
    .eq("paciente_id", paciente.id)
    .eq("registrado_pela_paciente", true)
    .gte("data_registro", semana)
    .order("data_registro", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error: erroAcomp } = existente
    ? await db.from("acompanhamentos").update(acomp).eq("id", existente.id)
    : await db.from("acompanhamentos").insert({
        ...acomp, paciente_id: paciente.id, user_id: paciente.user_id, data_registro: isoLocal(), registrado_pela_paciente: true,
      });
  if (erroAcomp) console.warn("[checkin] espelho em acompanhamentos", erroAcomp);
}

export async function marcarCheckinVisto(id: string, visto = true): Promise<void> {
  const { error } = await db.from("checkins_semanais").update({ visto_nutri: visto }).eq("id", id);
  if (error) throw error;
}

/** Só o nutri apaga (a paciente corrige, mas não exclui). */
export async function excluirCheckin(id: string): Promise<void> {
  const { error } = await db.from("checkins_semanais").delete().eq("id", id);
  if (error) throw error;
}

export async function definirMedidasNoCheckin(pacienteId: string, ligado: boolean): Promise<void> {
  const { error } = await db.from("pacientes").update({ checkin_medidas: ligado }).eq("id", pacienteId);
  if (error) throw error;
}
