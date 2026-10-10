/**
 * lembrete-peso-semanal
 *
 * Todo sábado de manhã (agendado no banco com pg_cron, migration
 * 20260930120000), manda às pacientes ativas um e-mail lembrando de
 * responder o check-in da semana no portal. O nome da função e o tipo
 * "lembrete_peso" ficaram de quando o lembrete era só do peso; o peso agora
 * é uma das respostas do check-in.
 *
 * Quem recebe: portal liberado (account_status = 'ativo'), cadastro não
 * arquivado nem marcado como inativo, e-mail válido, avisos por e-mail
 * ligados, lembrete ligado nas configurações da clínica, e que NÃO respondeu
 * o check-in desta semana (checkins_semanais, migration 20261010120000).
 *
 * Proteção: a chamada do agendamento usa a chave pública do projeto, então
 * qualquer um poderia chamar. Por isso: (1) a rodada geral só roda no
 * sábado, horário de Brasília; (2) nenhuma paciente recebe mais de um
 * lembrete a cada 6 dias (conferido no histórico notificacoes_email).
 *
 * Teste manual: o nutri logado pode mandar { paciente_id } para enviar só
 * para uma paciente dele, em qualquer dia (a regra dos 6 dias continua).
 *
 * Segredos: os mesmos de notificar-paciente (RESEND_API_KEY, LOVABLE_API_KEY,
 * EMAIL_FROM, APP_URL).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Cópia de notificar-paciente/templates.ts: o empacotador do Lovable não
// aceita import de outra pasta de função. src/test/emailTemplates.test.ts
// falha se as duas cópias ficarem diferentes.
import { montarEmail } from "./templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TIPO = "lembrete_peso";
const SEIS_DIAS_MS = 6 * 24 * 60 * 60 * 1000;

/** Sábado no horário de Brasília (UTC−3, sem horário de verão desde 2019). */
function ehSabadoEmBrasilia(agora = new Date()): boolean {
  return new Date(agora.getTime() - 3 * 60 * 60 * 1000).getUTCDay() === 6;
}

/** "yyyy-mm-dd" de 6 dias atrás em Brasília, para comparar com data_registro. */
function dataSeisDiasAtras(agora = new Date()): string {
  return new Date(agora.getTime() - 3 * 60 * 60 * 1000 - SEIS_DIAS_MS).toISOString().slice(0, 10);
}

/** Sábado de referência do check-in em Brasília, "yyyy-mm-dd" (igual a semanaDoCheckin do app). */
function semanaDoCheckin(agora = new Date()): string {
  const br = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const desdeSabado = (br.getUTCDay() + 1) % 7;
  return new Date(br.getTime() - desdeSabado * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const emailFrom = Deno.env.get("EMAIL_FROM") || "";
    const urlApp = Deno.env.get("APP_URL") || "";
    const configurado = Boolean(resendKey && lovableApiKey && emailFrom);
    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));

    // ── Quem chamou: nutri logado (teste de uma paciente) ou o agendamento ──
    let pacienteUnica: string | null = null;
    let nutriTeste: string | null = null;
    if (typeof body?.paciente_id === "string") {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: u } = await caller.auth.getUser(token);
      if (!u?.user) return json({ error: "Teste manual exige login do nutri" }, 401);
      nutriTeste = u.user.id;
      pacienteUnica = body.paciente_id;
    } else if (!ehSabadoEmBrasilia()) {
      return json({ status: "ignorado", motivo: "Rodada geral só aos sábados" });
    }

    // ── Candidatas ──────────────────────────────────────────────────────
    let q = admin
      .from("pacientes")
      // "*": a coluna inativo vem de uma migration posterior e pode não existir.
      .select("*")
      .eq("account_status", "ativo")
      .or("ativo.is.null,ativo.eq.true");
    if (pacienteUnica) q = q.eq("id", pacienteUnica);
    const { data: pacientes, error } = await q;
    if (error) throw error;
    if (nutriTeste && pacientes?.[0] && pacientes[0].user_id !== nutriTeste) {
      return json({ error: "Sem permissão para esta paciente" }, 403);
    }

    const desdeData = dataSeisDiasAtras();
    const semana = semanaDoCheckin();
    const desdeEnvio = new Date(Date.now() - SEIS_DIAS_MS).toISOString();
    const clinicas = new Map<string, { nome_clinica?: string; logo_url?: string; whatsapp?: string; email_resposta?: string; lembrete_peso_semanal?: boolean } | null>();
    const resultado = { enviados: 0, simulados: 0, pulados: 0, falhas: 0 };

    for (const p of pacientes || []) {
      // Configuração da clínica, uma vez por nutri. A coluna do liga/desliga
      // vem na mesma migration; sem ela, conta como ligado.
      if (!clinicas.has(p.user_id)) {
        const { data } = await admin.from("configuracoes_clinica").select("*").eq("user_id", p.user_id).maybeSingle();
        clinicas.set(p.user_id, data);
      }
      const clinica = clinicas.get(p.user_id);
      if (clinica?.lembrete_peso_semanal === false && !pacienteUnica) { resultado.pulados++; continue; }

      if (p.inativo === true && !pacienteUnica) { resultado.pulados++; continue; }

      const destino = (p.email || "").trim();
      if (p.receber_emails === false || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) { resultado.pulados++; continue; }

      // Já respondeu o check-in desta semana: nada a lembrar. Se a tabela do
      // check-in ainda não existe, vale a regra antiga (peso nos últimos 6 dias).
      if (!pacienteUnica) {
        const { data: feitos, error: erroCheckin } = await admin.from("checkins_semanais").select("id")
          .eq("paciente_id", p.id).eq("semana", semana).limit(1);
        if (erroCheckin) {
          const { data: pesos } = await admin.from("acompanhamentos").select("id")
            .eq("paciente_id", p.id).not("peso", "is", null).gte("data_registro", desdeData).limit(1);
          if (pesos && pesos.length > 0) { resultado.pulados++; continue; }
        } else if (feitos && feitos.length > 0) { resultado.pulados++; continue; }
      }

      // No máximo um lembrete a cada 6 dias, chame quem chamar.
      const { data: recente } = await admin.from("notificacoes_email").select("id")
        .eq("paciente_id", p.id).eq("tipo", TIPO).in("status", ["enviado", "simulado"])
        .gte("created_at", desdeEnvio).limit(1);
      if (recente && recente.length > 0) { resultado.pulados++; continue; }

      const email = montarEmail(TIPO, {}, {
        nomePaciente: p.nome_completo,
        nomeClinica: clinica?.nome_clinica || "Método R.E.A.L",
        urlApp,
        logoUrl: clinica?.logo_url,
        whatsapp: clinica?.whatsapp,
      });
      const registrar = (status: string, extra: { erro?: string; provider_id?: string } = {}) =>
        admin.from("notificacoes_email").insert({
          user_id: p.user_id, paciente_id: p.id, enviado_por: nutriTeste ?? p.user_id, tipo: TIPO,
          assunto: email.assunto, destinatario: destino, status,
          erro: extra.erro ?? null, provider_id: extra.provider_id ?? null,
        });

      if (!configurado) {
        await registrar("simulado", { erro: "Provedor de e-mail ainda não configurado" });
        resultado.simulados++;
        continue;
      }

      let replyTo = clinica?.email_resposta || null;
      if (!replyTo) {
        const { data: dono } = await admin.auth.admin.getUserById(p.user_id);
        replyTo = dono?.user?.email ?? null;
      }
      const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "X-Connection-Api-Key": resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: emailFrom, to: [destino], subject: email.assunto, html: email.html, text: email.texto,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });
      if (!res.ok) {
        const detalhe = (await res.text()).slice(0, 500);
        await registrar("falhou", { erro: `Resend ${res.status}: ${detalhe}` });
        resultado.falhas++;
        continue;
      }
      const enviado = await res.json().catch(() => ({}));
      await registrar("enviado", { provider_id: enviado?.id });
      resultado.enviados++;
    }

    return json({ status: "ok", ...resultado });
  } catch (e) {
    console.error("lembrete-peso-semanal", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
