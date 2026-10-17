/**
 * enviar-push
 *
 * Manda uma notificação para o celular de uma paciente (todos os aparelhos
 * em que ela ativou os avisos). Hoje é chamada pelo chat do nutri quando ele
 * responde; os avisos de plano, avaliação e check-in saem de
 * notificar-paciente e lembrete-peso-semanal, que têm a própria cópia de
 * webpush.ts.
 *
 * Corpo: { paciente_id, titulo, corpo, url?, tag? }. Só o nutri dono da
 * paciente (ou alguém da equipe dele) pode chamar.
 *
 * Segredos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (opcional).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chavesVapidDoAmbiente, enviarPushParaPaciente } from "./webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: eu } = await caller.auth.getUser(authHeader.replace("Bearer ", ""));
    if (eu || !u?.user) return json({ error: "Token inválido" }, 401);

    const body = await req.json().catch(() => ({}));
    if (body?.acao === "status") return json({ configurado: chavesVapidDoAmbiente(Deno.env) !== null });

    const pacienteId = body?.paciente_id;
    if (typeof pacienteId !== "string" || !/^[0-9a-f-]{36}$/i.test(pacienteId)) return json({ error: "paciente_id inválido" }, 400);
    const titulo = texto(body?.titulo, 80), corpo = texto(body?.corpo, 180);
    if (!titulo) return json({ error: "Falta o título" }, 400);
    const url = typeof body?.url === "string" && body.url.startsWith("/") ? body.url : "/portal";

    const { data: paciente } = await admin.from("pacientes").select("id, user_id").eq("id", pacienteId).maybeSingle();
    if (!paciente) return json({ error: "Paciente não encontrada" }, 404);
    let autorizado = paciente.user_id === u.user.id;
    if (!autorizado) {
      const { data: membro } = await admin.from("equipe_membros").select("id")
        .eq("auth_user_id", u.user.id).eq("created_by", paciente.user_id).eq("ativo", true).maybeSingle();
      autorizado = Boolean(membro);
    }
    if (!autorizado) return json({ error: "Sem permissão para esta paciente" }, 403);

    const enviados = await enviarPushParaPaciente(admin, pacienteId, { titulo, corpo, url, tag: texto(body?.tag, 40) || undefined }, chavesVapidDoAmbiente(Deno.env));
    return json({ status: "ok", enviados });
  } catch (e) {
    console.error("enviar-push", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
