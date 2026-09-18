/**
 * notificar-paciente
 *
 * Envia à paciente um aviso por e-mail sobre algo que a nutricionista
 * enviou ou alterou (plano, consulta, orientação etc.), pelo Resend.
 *
 * Corpo:
 *   { acao: "status" }
 *     -> { configurado: boolean }   (se há provedor de e-mail pronto)
 *   { paciente_id, tipo, dados? }
 *     -> { status: "enviado" | "simulado" | "ignorado" | "falhou", ... }
 *
 * Segredos do backend:
 *   RESEND_API_KEY  chave da conexão segura com o Resend
 *   LOVABLE_API_KEY chave gerenciada pela plataforma
 *   EMAIL_FROM      remetente, ex.: "Método R.E.A.L <contato@seudominio.com.br>"
 *                   (o domínio precisa estar verificado no Resend)
 *   APP_URL         endereço público do app, ex.: https://app.seudominio.com.br
 *
 * Sem RESEND_API_KEY ou EMAIL_FROM, nada é enviado: o aviso é registrado no
 * histórico como "simulado", para o fluxo poder ser testado antes.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isTipoAviso, montarEmail, type DadosAviso } from "./templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Janela em que um aviso idêntico é tratado como clique duplo. */
const JANELA_DUPLICADO_MS = 2 * 60 * 1000;

/**
 * Tipos que costumam sair em rajada. Responder cinco registros do diário em
 * sequência deve virar um e-mail, não cinco.
 */
const JANELA_POR_TIPO: Partial<Record<string, number>> = {
  feedback_diario: 60 * 60 * 1000,
  plano_atualizado: 30 * 60 * 1000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const emailFrom = Deno.env.get("EMAIL_FROM") || "";
    const configurado = Boolean(resendKey && lovableApiKey && emailFrom);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await callerClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Token inválido" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));

    if (body?.acao === "status") return json({ configurado });

    const { paciente_id, tipo } = body ?? {};
    const dados: DadosAviso = {
      titulo: typeof body?.dados?.titulo === "string" ? body.dados.titulo : null,
      data: typeof body?.dados?.data === "string" ? body.dados.data : null,
      token: typeof body?.dados?.token === "string" ? body.dados.token : null,
    };

    if (typeof paciente_id !== "string" || !/^[0-9a-f-]{36}$/i.test(paciente_id)) {
      return json({ error: "paciente_id inválido" }, 400);
    }
    if (!isTipoAviso(tipo)) return json({ error: "Tipo de aviso desconhecido" }, 400);

    // ── Permissão: dona da paciente, ou membro ativo da equipe dela ──────
    const { data: paciente } = await admin
      .from("pacientes")
      .select("id, user_id, nome_completo, email, receber_emails")
      .eq("id", paciente_id)
      .maybeSingle();
    if (!paciente) return json({ error: "Paciente não encontrada" }, 404);

    let autorizado = paciente.user_id === callerId;
    if (!autorizado) {
      const { data: membro } = await admin
        .from("equipe_membros")
        .select("id")
        .eq("auth_user_id", callerId)
        .eq("created_by", paciente.user_id)
        .eq("ativo", true)
        .maybeSingle();
      autorizado = Boolean(membro);
    }
    if (!autorizado) return json({ error: "Sem permissão para esta paciente" }, 403);

    // ── Contexto da clínica ─────────────────────────────────────────────
    const { data: clinica } = await admin
      .from("configuracoes_clinica")
      .select("nome_clinica, logo_url, whatsapp, email_resposta")
      .eq("user_id", paciente.user_id)
      .maybeSingle();

    let replyTo = clinica?.email_resposta || null;
    if (!replyTo) {
      const { data: dono } = await admin.auth.admin.getUserById(paciente.user_id);
      replyTo = dono?.user?.email ?? null;
    }

    const urlApp = Deno.env.get("APP_URL") || req.headers.get("Origin") || "";
    const email = montarEmail(tipo, dados, {
      nomePaciente: paciente.nome_completo,
      nomeClinica: clinica?.nome_clinica || "Método R.E.A.L",
      urlApp,
      logoUrl: clinica?.logo_url,
      whatsapp: clinica?.whatsapp,
    });

    const registrar = async (status: string, extra: { erro?: string; provider_id?: string } = {}) => {
      await admin.from("notificacoes_email").insert({
        user_id: paciente.user_id,
        paciente_id: paciente.id,
        enviado_por: callerId,
        tipo,
        assunto: email.assunto,
        destinatario: paciente.email || "",
        status,
        erro: extra.erro ?? null,
        provider_id: extra.provider_id ?? null,
      });
    };

    // ── Casos em que não se envia ───────────────────────────────────────
    if (paciente.receber_emails === false) {
      await registrar("ignorado", { erro: "Avisos por e-mail desligados para esta paciente" });
      return json({ status: "ignorado", motivo: "desligado" });
    }
    const destino = (paciente.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
      await registrar("falhou", { erro: "Paciente sem e-mail válido no cadastro" });
      return json({ status: "falhou", motivo: "sem_email" });
    }

    // Clique duplo ou salvar duas vezes seguidas não vira dois e-mails.
    const janela = JANELA_POR_TIPO[tipo] ?? JANELA_DUPLICADO_MS;
    const desde = new Date(Date.now() - janela).toISOString();
    const { data: recente } = await admin
      .from("notificacoes_email")
      .select("id")
      .eq("paciente_id", paciente.id)
      .eq("tipo", tipo)
      .eq("assunto", email.assunto)
      .in("status", ["enviado", "simulado"])
      .gte("created_at", desde)
      .limit(1);
    if (recente && recente.length > 0) return json({ status: "ignorado", motivo: "duplicado" });

    if (!configurado) {
      await registrar("simulado", { erro: "Provedor de e-mail ainda não configurado" });
      return json({ status: "simulado" });
    }

    // ── Envio ───────────────────────────────────────────────────────────
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [destino],
        subject: email.assunto,
        html: email.html,
        text: email.texto,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const detalhe = (await res.text()).slice(0, 500);
      console.error("Resend falhou", res.status, detalhe);
      await registrar("falhou", { erro: `Resend ${res.status}: ${detalhe}` });
      return json({ status: "falhou", motivo: "provedor" }, 502);
    }

    const enviado = await res.json().catch(() => ({}));
    await registrar("enviado", { provider_id: enviado?.id });
    return json({ status: "enviado" });
  } catch (e) {
    console.error("notificar-paciente", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
