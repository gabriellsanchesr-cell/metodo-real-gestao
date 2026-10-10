/**
 * Chamada de Edge Function que exige login.
 *
 * Duas coisas que o supabase-js não faz sozinho:
 * 1) quando a função responde com erro, o motivo vem no corpo da resposta, e
 *    não em error.message ("non-2xx status code");
 * 2) a função confere o login no servidor. Se a sessão foi encerrada em outro
 *    aparelho, o token guardado aqui ainda parece válido e a função responde
 *    "Token inválido". Tenta renovar a sessão uma vez; se não der, pede novo login.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSAO_EXPIRADA = "Sua sessão expirou. Saia do sistema e entre de novo para continuar.";

async function invocar<T>(nome: string, body: unknown): Promise<{ data: T | null; erro: string | null; status?: number }> {
  const { data, error } = await supabase.functions.invoke(nome, { body: body as Record<string, unknown> });
  if (!error) {
    const erroNoCorpo = (data as { error?: string } | null)?.error;
    return { data: data as T, erro: erroNoCorpo ?? null };
  }
  // FunctionsHttpError traz a Response original em `context`.
  const resposta = (error as { context?: Response }).context;
  let motivo: string | null = null;
  if (resposta && typeof resposta.json === "function") {
    const corpo = await resposta.json().catch(() => null);
    motivo = corpo?.error ?? null;
  }
  return { data: null, erro: motivo || error.message || "Não consegui falar com o servidor.", status: resposta?.status };
}

export async function chamarFuncao<T = unknown>(nome: string, body: unknown): Promise<T> {
  let r = await invocar<T>(nome, body);
  const loginRecusado = r.status === 401 || /token inv[aá]lido|n[aã]o autorizado/i.test(r.erro ?? "");
  if (r.erro && loginRecusado) {
    const { error } = await supabase.auth.refreshSession();
    if (error) throw new Error(SESSAO_EXPIRADA);
    r = await invocar<T>(nome, body);
    if (r.erro && (r.status === 401 || /token inv[aá]lido/i.test(r.erro))) throw new Error(SESSAO_EXPIRADA);
  }
  if (r.erro) throw new Error(r.erro);
  return r.data as T;
}
