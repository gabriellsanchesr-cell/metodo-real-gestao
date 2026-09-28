/**
 * Liberar, bloquear e excluir o acesso da paciente ao portal, pela Edge
 * Function manage-patient-auth.
 *
 * Quando a função responde com erro (400, 403...), o supabase-js só diz
 * "Edge Function returned a non-2xx status code". O motivo de verdade vem no
 * corpo da resposta; é ele que precisa aparecer para o nutri.
 */
import { supabase } from "@/integrations/supabase/client";

export type AcaoAcesso = "deactivate" | "reactivate" | "delete";

export async function gerenciarAcesso(action: AcaoAcesso, pacienteId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("manage-patient-auth", {
    body: { action, paciente_id: pacienteId },
  });
  if (data?.error) throw new Error(data.error);
  if (!error) return;

  // FunctionsHttpError traz a Response original em `context`.
  const resposta = (error as { context?: Response }).context;
  if (resposta && typeof resposta.json === "function") {
    const corpo = await resposta.json().catch(() => null);
    if (corpo?.error) throw new Error(corpo.error);
  }
  throw new Error(error.message || "Não consegui falar com o servidor.");
}

/** Quem pode passar por cada ação, e por que as outras ficam de fora. */
export function separarPorAcesso<T extends { account_status?: string | null }>(
  pacientes: T[],
  action: "deactivate" | "reactivate",
): { aplicaveis: T[]; ignoradas: { paciente: T; motivo: string }[] } {
  const alvo = action === "deactivate" ? "ativo" : "desativado";
  const aplicaveis: T[] = [];
  const ignoradas: { paciente: T; motivo: string }[] = [];
  for (const p of pacientes) {
    const st = p.account_status || "sem_conta";
    if (st === alvo) aplicaveis.push(p);
    else ignoradas.push({
      paciente: p,
      motivo: st === "sem_conta" ? "não tem conta no portal" : action === "deactivate" ? "já está bloqueada" : "já está liberada",
    });
  }
  return { aplicaveis, ignoradas };
}

/** "Anna Maria (não tem conta no portal), ..." para os avisos de ação em massa. */
export function descreverIgnoradas(ignoradas: { paciente: { nome_completo: string }; motivo: string }[]): string {
  return ignoradas.slice(0, 4).map((i) => `${i.paciente.nome_completo.trim()} (${i.motivo})`).join(", ")
    + (ignoradas.length > 4 ? ` e mais ${ignoradas.length - 4}` : "");
}

/**
 * Arquiva a paciente e, se pedido, bloqueia o portal de quem está liberada.
 * O bloqueio vem depois: se ele falhar, o arquivamento já valeu e o erro diz
 * que só o acesso ficou para trás.
 */
export async function arquivarPaciente(
  p: { id: string; account_status?: string | null },
  bloquear: boolean,
): Promise<void> {
  const { error } = await supabase.from("pacientes").update({ ativo: false }).eq("id", p.id);
  if (error) throw error;
  if (bloquear && p.account_status === "ativo") {
    try {
      await gerenciarAcesso("deactivate", p.id);
    } catch (e) {
      throw new Error(`arquivada, mas o acesso não foi bloqueado: ${(e as Error).message}`);
    }
  }
}
