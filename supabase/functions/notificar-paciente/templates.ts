/**
 * Modelos dos e-mails enviados às pacientes.
 *
 * Arquivo puro, sem nada de Deno, para poder ser testado pelo vitest do app
 * (src/test/emailTemplates.test.ts).
 *
 * O texto é montado AQUI, no servidor. O app só informa o tipo do aviso e
 * alguns dados curtos (título, data). Assim ninguém consegue usar a função
 * para disparar um e-mail com conteúdo arbitrário em nome da clínica.
 *
 * Voz da marca: firme e humana, sem emoji, sem travessão, sem culpa,
 * acentuação completa, e sem adjetivo com gênero, porque o mesmo texto vai
 * para pacientes de qualquer gênero.
 */

export const TIPOS = [
  "plano_novo",
  "plano_atualizado",
  "consulta_agendada",
  "consulta_remarcada",
  "consulta_cancelada",
  "orientacao_nova",
  "material_novo",
  "receita_nova",
  "conteudo_liberado",
  "meta_nova",
  "feedback_diario",
  "questionario_enviado",
  "avaliacao_registrada",
  "exame_registrado",
] as const;

export type TipoAviso = (typeof TIPOS)[number];

export function isTipoAviso(t: unknown): t is TipoAviso {
  return typeof t === "string" && (TIPOS as readonly string[]).includes(t);
}

export interface DadosAviso {
  /** Nome do plano, da orientação, do material etc. */
  titulo?: string | null;
  /** Data e hora em ISO, para consultas. */
  data?: string | null;
  /** Token do questionário, para montar o link direto. */
  token?: string | null;
}

export interface ContextoEmail {
  nomePaciente: string;
  nomeClinica: string;
  urlApp: string;
  logoUrl?: string | null;
  whatsapp?: string | null;
}

export interface EmailMontado {
  assunto: string;
  html: string;
  texto: string;
}

/** Escapa tudo que vem de fora antes de entrar no HTML. */
export function escapar(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Limita e limpa textos curtos vindos do app. */
export function limparTitulo(t: unknown, max = 120): string | null {
  if (typeof t !== "string") return null;
  const limpo = t.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return limpo ? limpo.slice(0, max) : null;
}

export function primeiroNome(nome: string): string {
  const p = (nome || "").trim().split(/\s+/)[0];
  return p || "Olá";
}

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * "quinta-feira, 25 de setembro, às 14h30", no horário de Brasília.
 * Feito à mão porque o runtime das Edge Functions não garante os dados de
 * localidade do pt-BR no Intl.
 */
export function formatarDataHora(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const br = new Date(d.getTime() - 3 * 60 * 60 * 1000); // UTC-3, sem horário de verão desde 2019
  const hh = br.getUTCHours();
  const mm = String(br.getUTCMinutes()).padStart(2, "0");
  const hora = mm === "00" ? `${hh}h` : `${hh}h${mm}`;
  return `${DIAS[br.getUTCDay()]}, ${br.getUTCDate()} de ${MESES[br.getUTCMonth()]}, às ${hora}`;
}

interface Conteudo {
  assunto: string;
  titulo: string;
  paragrafos: string[];
  botao: string;
  caminho: string;
}

function conteudo(tipo: TipoAviso, d: DadosAviso): Conteudo {
  const titulo = limparTitulo(d.titulo);
  const quando = formatarDataHora(d.data);
  const token = typeof d.token === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(d.token) ? d.token : null;

  switch (tipo) {
    case "plano_novo":
      return {
        assunto: "Seu novo plano alimentar está disponível",
        titulo: "Seu plano alimentar está pronto",
        paragrafos: [
          titulo ? `O plano <strong>${escapar(titulo)}</strong> já está no seu portal.` : "Seu novo plano já está no seu portal.",
          "Leia com calma. Ele foi montado para caber na sua rotina real, e as opções de cada refeição existem para você escolher a que funciona no seu dia.",
        ],
        botao: "Ver meu plano",
        caminho: "/portal",
      };
    case "plano_atualizado":
      return {
        assunto: "Seu plano alimentar foi ajustado",
        titulo: "Fizemos um ajuste no seu plano",
        paragrafos: [
          titulo ? `O plano <strong>${escapar(titulo)}</strong> foi atualizado.` : "Seu plano foi atualizado.",
          "Ajustar faz parte do método. Confira o que mudou antes da próxima refeição.",
        ],
        botao: "Ver o que mudou",
        caminho: "/portal",
      };
    case "consulta_agendada":
      return {
        assunto: "Sua consulta está agendada",
        titulo: "Consulta agendada",
        paragrafos: [
          quando ? `Sua consulta ficou marcada para <strong>${escapar(quando)}</strong>.` : "Sua consulta foi agendada.",
          "Se precisar remarcar, é só me avisar com antecedência.",
        ],
        botao: "Ver no portal",
        caminho: "/portal",
      };
    case "consulta_remarcada":
      return {
        assunto: "Sua consulta mudou de horário",
        titulo: "Consulta remarcada",
        paragrafos: [
          quando ? `O novo horário da sua consulta é <strong>${escapar(quando)}</strong>.` : "Sua consulta foi remarcada.",
          "Confira se o horário novo funciona para você.",
        ],
        botao: "Ver no portal",
        caminho: "/portal",
      };
    case "consulta_cancelada":
      return {
        assunto: "Sua consulta foi cancelada",
        titulo: "Consulta cancelada",
        paragrafos: [
          quando ? `A consulta de <strong>${escapar(quando)}</strong> foi cancelada.` : "Uma consulta sua foi cancelada.",
          "Quando quiser marcar um novo horário, é só me chamar.",
        ],
        botao: "Abrir meu portal",
        caminho: "/portal",
      };
    case "orientacao_nova":
      return {
        assunto: "Nova orientação no seu portal",
        titulo: "Uma orientação nova para você",
        paragrafos: [
          titulo ? `Deixei a orientação <strong>${escapar(titulo)}</strong> no seu portal.` : "Deixei uma orientação nova no seu portal.",
          "São poucos minutos de leitura que fazem diferença na semana.",
        ],
        botao: "Ler orientação",
        caminho: "/portal",
      };
    case "material_novo":
      return {
        assunto: "Material novo no seu portal",
        titulo: "Material novo disponível",
        paragrafos: [
          titulo ? `O material <strong>${escapar(titulo)}</strong> já está no seu portal.` : "Um material novo já está no seu portal.",
        ],
        botao: "Ver material",
        caminho: "/portal",
      };
    case "receita_nova":
      return {
        assunto: "Uma receita nova para você",
        titulo: "Receita nova no seu portal",
        paragrafos: [
          titulo ? `Deixei a receita <strong>${escapar(titulo)}</strong> no seu portal.` : "Deixei uma receita nova no seu portal.",
          "Ela foi escolhida para caber no seu plano. Se algum ingrediente não fizer parte da sua rotina, me fala que a gente troca.",
        ],
        botao: "Ver receita",
        caminho: "/portal",
      };
    case "conteudo_liberado":
      // Disparado na mudança de fase da paciente, que é quando os
      // conteúdos daquela etapa são liberados para ela.
      return {
        assunto: "Você avançou de fase no Método R.E.A.L.",
        titulo: "Uma fase nova começa",
        paragrafos: [
          titulo
            ? `Você entrou na fase <strong>${escapar(titulo)}</strong> do Método R.E.A.L.`
            : "Você avançou para a próxima fase do Método R.E.A.L.",
          "Os conteúdos dessa etapa já estão liberados no seu portal. Avançar de fase é sinal de que a estrutura está cabendo na sua rotina.",
        ],
        botao: "Ver a nova fase",
        caminho: "/portal",
      };
    case "meta_nova":
      return {
        assunto: "Uma meta nova para esta fase",
        titulo: "Meta nova",
        paragrafos: [
          titulo ? `Registrei a meta <strong>${escapar(titulo)}</strong> no seu portal.` : "Registrei uma meta nova no seu portal.",
          "Meta boa é a que cabe na sua rotina. Se não couber, a gente ajusta.",
        ],
        botao: "Ver minhas metas",
        caminho: "/portal",
      };
    case "feedback_diario":
      return {
        assunto: "Respondi o seu diário alimentar",
        titulo: "Tem retorno no seu diário",
        paragrafos: [
          "Li o que você registrou e deixei um retorno no seu diário alimentar.",
        ],
        botao: "Ler retorno",
        caminho: "/portal",
      };
    case "questionario_enviado":
      return {
        assunto: "Um questionário para você responder",
        titulo: "Questionário para responder",
        paragrafos: [
          titulo ? `Preciso que você responda o questionário <strong>${escapar(titulo)}</strong>.` : "Preciso que você responda um questionário rápido.",
          "Suas respostas guiam o próximo ajuste do seu acompanhamento.",
        ],
        botao: "Responder agora",
        caminho: token ? `/questionario/${token}` : "/portal",
      };
    case "avaliacao_registrada":
      return {
        assunto: "Sua avaliação física foi registrada",
        titulo: "Avaliação registrada",
        paragrafos: [
          "Os resultados da sua avaliação física já estão no seu portal.",
          "Número é informação, não julgamento. Na consulta a gente conversa sobre o que eles mostram.",
        ],
        botao: "Ver avaliação",
        caminho: "/portal",
      };
    case "exame_registrado":
      return {
        assunto: "Seus exames foram registrados",
        titulo: "Exames registrados",
        paragrafos: [
          titulo ? `Registrei <strong>${escapar(titulo)}</strong> no seu portal.` : "Registrei seus exames no seu portal.",
        ],
        botao: "Ver exames",
        caminho: "/portal",
      };
  }
}

/** Texto puro a partir do HTML dos parágrafos, para clientes sem HTML. */
function paraTexto(html: string): string {
  return html.replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

export function montarEmail(tipo: TipoAviso, dados: DadosAviso, ctx: ContextoEmail): EmailMontado {
  const c = conteudo(tipo, dados);
  const base = ctx.urlApp.replace(/\/+$/, "");
  const link = `${base}${c.caminho}`;
  const nome = escapar(primeiroNome(ctx.nomePaciente));
  const clinica = escapar(ctx.nomeClinica);
  const zap = ctx.whatsapp ? ctx.whatsapp.replace(/\D/g, "") : "";

  const logo = ctx.logoUrl && /^https:\/\//.test(ctx.logoUrl)
    ? `<img src="${escapar(ctx.logoUrl)}" alt="${clinica}" height="40" style="display:block;height:40px;margin:0 auto 8px">`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(c.assunto)}</title></head>
<body style="margin:0;padding:0;background:#f3f5fb;font-family:Arial,Helvetica,sans-serif;color:#1f2544">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5fb;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#2b3a8f;padding:24px;text-align:center">
${logo}<div style="color:#ffffff;font-size:13px;letter-spacing:1px;text-transform:uppercase">${clinica}</div>
</td></tr>
<tr><td style="padding:32px 28px 8px">
<p style="margin:0 0 6px;font-size:15px;color:#5b6283">Olá, ${nome}.</p>
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#1f2544">${escapar(c.titulo)}</h1>
${c.paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#343a5c">${p}</p>`).join("\n")}
</td></tr>
<tr><td style="padding:8px 28px 32px" align="left">
<a href="${escapar(link)}" style="display:inline-block;background:#2b3a8f;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:999px">${escapar(c.botao)}</a>
</td></tr>
<tr><td style="padding:18px 28px 26px;border-top:1px solid #eceef6;font-size:12px;line-height:1.6;color:#8a90ad">
${zap ? `Dúvidas? Me chame no WhatsApp: <a href="https://wa.me/${zap}" style="color:#2b3a8f">clique aqui</a>.<br>` : ""}
Você recebe este e-mail porque faz acompanhamento com ${clinica}. Se preferir não receber estes avisos, é só responder pedindo.
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const texto = [
    `Olá, ${primeiroNome(ctx.nomePaciente)}.`,
    "",
    c.titulo,
    "",
    ...c.paragrafos.map(paraTexto),
    "",
    `${c.botao}: ${link}`,
    "",
    zap ? `Dúvidas? WhatsApp: https://wa.me/${zap}` : "",
    `Você recebe este e-mail porque faz acompanhamento com ${ctx.nomeClinica}.`,
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");

  return { assunto: c.assunto, html, texto };
}
