/**
 * Último peso da paciente, buscando nas três fontes (avaliação física,
 * acompanhamento semanal e check-in). Um lugar só, para a ficha, o chat e o
 * cálculo energético mostrarem o mesmo número.
 */
import { supabase } from "@/integrations/supabase/client";
import { ultimoPeso } from "@/lib/painel";

export async function buscarUltimoPeso(pacienteId: string) {
  const [avaliacoes, acomp, checkins] = await Promise.all([
    supabase.from("avaliacoes_fisicas").select("data_avaliacao, peso, created_at").eq("paciente_id", pacienteId)
      .not("peso", "is", null).order("data_avaliacao", { ascending: false }).limit(10),
    supabase.from("acompanhamentos").select("data_registro, peso, created_at").eq("paciente_id", pacienteId)
      .not("peso", "is", null).order("data_registro", { ascending: false }).limit(10),
    // Antes da migration do check-in a busca falha; aí fica sem essa fonte.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("checkins_semanais").select("semana, peso, created_at").eq("paciente_id", pacienteId)
      .not("peso", "is", null).order("semana", { ascending: false }).limit(10),
  ]);
  return ultimoPeso(avaliacoes.data || [], acomp.data || [], checkins.error ? [] : checkins.data || []);
}
