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
