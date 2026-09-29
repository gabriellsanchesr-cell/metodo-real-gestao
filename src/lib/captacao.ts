/**
 * Captação: monta a fila de "quem tocar hoje".
 *
 * Funções puras, sem Supabase: recebem os dados já carregados e devolvem a
 * fila ordenada por prioridade, com o motivo e a mensagem pronta. Quem envia
 * é o nutricionista, pelo WhatsApp; nada aqui dispara mensagem.
 *
 * Datas de calendário no formato "AAAA-MM-DD", como em lib/vencimento.
 */
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { diasAteVencimento, hojeISO } from "@/lib/vencimento";

export type Gatilho =
  | "lead_novo"
  | "lead_quente"
  | "follow_up"
  | "renovacao"
  | "vencido"
  | "sumico"
  | "indicacao"
  | "ex_paciente"
  | "parceiro";

export const GATILHOS: Record<Gatilho, { rotulo: string; prioridade: number; silencio: number }> = {
  // silencio: dias sem repetir o mesmo gatilho para a mesma pessoa depois de um toque.
  lead_novo:   { rotulo: "Lead novo", prioridade: 1, silencio: 0 },
  lead_quente: { rotulo: "Lead quente parado", prioridade: 1, silencio: 0 },
  follow_up:   { rotulo: "Follow-up", prioridade: 2, silencio: 0 },
  renovacao:   { rotulo: "Renovação", prioridade: 2, silencio: 3 },
  vencido:     { rotulo: "Plano vencido", prioridade: 3, silencio: 5 },
  sumico:      { rotulo: "Sem contato", prioridade: 3, silencio: 14 },
  indicacao:   { rotulo: "Pedir indicação", prioridade: 4, silencio: 60 },
  ex_paciente: { rotulo: "Ex-paciente", prioridade: 5, silencio: 0 },
  parceiro:    { rotulo: "Parceiro", prioridade: 5, silencio: 30 },
};

/** Regras de cadência. Ficam aqui para o teste e a tela usarem os mesmos números. */
export const REGRAS = {
  diasLeadQuente: 2,
  diasSumico: 45,
  diasVencidoMax: 60,
  janelaIndicacao: 3,
  diasContratoIndicacao: 30,
  diasParceiro: 30,
  exPacientesPorSemana: 5,
  /** Intervalo até o próximo toque depois do 1º e do 2º toque sem resposta. */
  cadencia: [1, 3] as const,
};

export const ORIGENS_LEAD = [
  { value: "indicacao", label: "Indicação de paciente" },
  { value: "personal", label: "Personal / parceiro" },
  { value: "amigo", label: "Amigo / rede pessoal" },
  { value: "ex_paciente", label: "Ex-paciente" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

export function rotuloOrigem(v: string | null | undefined): string {
  if (!v) return "Sem origem";
  return ORIGENS_LEAD.find((o) => o.value === v)?.label ?? v;
}

// ---------------------------------------------------------------------
// Tipos de entrada (só os campos usados)
// ---------------------------------------------------------------------
export interface LeadFila {
  id: string;
  nome: string;
  telefone: string | null;
  origem: string;
  status: string;
  created_at: string;
  ultimo_toque: string | null;
  proximo_toque: string | null;
  tentativas: number;
  parceiro_id?: string | null;
}

export interface PacienteFila {
  id: string;
  nome_completo: string;
  telefone: string | null;
  objetivo: string | null;
  ativo: boolean | null;
  created_at: string;
}

export interface ContratoFila {
  paciente_id: string;
  status: string;
  data_inicio: string;
  data_vencimento: string;
}

export interface AvaliacaoFila {
  paciente_id: string;
  data_avaliacao: string;
  peso: number | null;
  percentual_gordura_dobras: number | null;
  bio_percentual_gordura: number | null;
  massa_magra_kg: number | null;
}

export interface ParceiroFila {
  id: string;
  nome: string;
  telefone: string | null;
  ativo: boolean;
  created_at: string;
}

export interface ToqueFila {
  lead_id: string | null;
  paciente_id: string | null;
  parceiro_id: string | null;
  gatilho: string;
  resultado: string;
  created_at: string;
}

export interface DadosFila {
  leads: LeadFila[];
  pacientes: PacienteFila[];
  contratos: ContratoFila[];
  /** Data (AAAA-MM-DD) da última atividade por paciente: consulta realizada ou plano. */
  ultimaAtividade: Record<string, string>;
  avaliacoes: AvaliacaoFila[];
  parceiros: ParceiroFila[];
  toques: ToqueFila[];
  diasAlerta: number;
  /** Textos editados pelo nutricionista, por gatilho. Os que faltarem usam o padrão. */
  mensagens?: Partial<Record<Gatilho, string>>;
  hoje?: string;
}

export type Alvo = "lead" | "paciente" | "parceiro";

export interface ItemFila {
  chave: string;
  alvo: Alvo;
  id: string;
  nome: string;
  telefone: string | null;
  gatilho: Gatilho;
  prioridade: number;
  motivo: string;
  mensagem: string;
  /** Para leads: dá para marcar resposta e perda. */
  lead?: LeadFila;
}

// ---------------------------------------------------------------------
// Mensagens padrão (voz da marca: firme, humana, sem pressão, sem dado clínico)
// ---------------------------------------------------------------------
export const MENSAGENS_PADRAO: Record<Gatilho, string> = {
  lead_novo:
    "Oi, {nome}! Aqui é o Gabriel, nutricionista. Que bom que você chegou até mim. Me conta: hoje, o que mais te trava na alimentação? Com isso eu consigo te explicar como funcionaria o acompanhamento no seu caso.",
  lead_quente:
    "Oi, {nome}! Passando para retomar nossa conversa. Se ainda fizer sentido organizar sua alimentação agora, eu te passo os horários disponíveis desta semana. Se preferir tirar alguma dúvida antes, pode mandar por aqui.",
  follow_up:
    "Oi, {nome}! Não sei se você conseguiu ver minha última mensagem. Fico à disposição para te explicar como funciona o acompanhamento, sem compromisso. Se não for o seu momento, está tudo certo também.",
  renovacao:
    "Oi, {nome}! Seu período de acompanhamento está chegando ao fim e eu queria olhar com você o que já mudou e qual é o próximo passo. Para continuar, você pode seguir no mensal (R$240/mês), no bimestral (R$210/mês, R$420 no total) ou no trimestral (R$196/mês, R$590 no total). Qual faz mais sentido para a sua rotina agora?",
  vencido:
    "Oi, {nome}! Seu período de acompanhamento terminou há alguns dias e eu não quis deixar passar sem falar com você. Como está a rotina? Se quiser retomar, a gente ajusta a estratégia ao que você está vivendo hoje.",
  sumico:
    "Oi, {nome}! Faz um tempo que a gente não conversa e lembrei de você. Como estão as coisas com a alimentação e a rotina? Não é cobrança, é só para saber se posso te ajudar em algo.",
  indicacao:
    "{nome}, fiquei muito feliz com a sua evolução. Queria te pedir uma coisa: se você conhece alguém que vive começando e largando dieta, ou que sabe o que deveria fazer mas não consegue sustentar, pode me apresentar. Chegar por indicação de quem já vive o processo faz diferença. Eu cuido do resto com todo o cuidado.",
  ex_paciente:
    "Oi, {nome}! Tudo bem? Lembrei de você esses dias e quis saber como você está. Como anda a alimentação e a rotina desde a época em que a gente trabalhou junto? Se sentir que é hora de colocar as coisas no eixo de novo, estou por aqui.",
  parceiro:
    "Fala, {nome}! Tudo certo? Passando para agradecer a parceria e me colocar à disposição. Se algum aluno seu estiver com dificuldade de alinhar a alimentação ao treino, pode me encaminhar que eu cuido do atendimento e te mantenho informado da evolução, com a autorização do aluno.",
};

/** Primeiro nome, com a inicial maiúscula. */
export function primeiroNome(nome: string): string {
  const p = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  if (!p || /^\+?\d/.test(p)) return "";
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

/** Troca {nome} e {personal}. Sem nome conhecido, "Oi, {nome}!" vira "Oi!". */
export function preencherMensagem(texto: string, vars: { nome: string; personal?: string }): string {
  const nome = primeiroNome(vars.nome);
  let t = texto;
  if (!nome) t = t.replace(/,\s*\{nome\}(?=[!.,?])/g, "").replace(/\{nome\},\s*/g, "");
  return t
    .replace(/\{nome\}/g, nome)
    .replace(/\{personal\}/g, vars.personal ?? "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Número para o wa.me: só dígitos, com DDI 55 quando vier no formato
 * brasileiro de 10 ou 11 dígitos. Devolve null se não der para usar.
 */
export function normalizarTelefone(tel: string | null | undefined): string | null {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if (d.length >= 12 && d.length <= 15) return d;
  return null;
}

export function linkWhatsApp(tel: string | null | undefined, texto: string): string | null {
  const n = normalizarTelefone(tel);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}

/** Próximo toque depois de um envio sem resposta. null encerra a cadência. */
export function proximoToqueDepoisDeEnvio(tentativasAntes: number, hoje: string = hojeISO()): string | null {
  const intervalo = REGRAS.cadencia[tentativasAntes];
  if (intervalo === undefined) return null;
  return format(addDays(parseISO(hoje), intervalo), "yyyy-MM-dd");
}

// ---------------------------------------------------------------------
// Evolução para o momento de indicação
// ---------------------------------------------------------------------
/**
 * Verdadeiro quando a última avaliação mostra evolução a favor do objetivo
 * em relação à anterior. Dobras mandam sobre bioimpedância.
 */
export function evoluiuAFavor(objetivo: string | null, anterior: AvaliacaoFila, atual: AvaliacaoFila): boolean {
  const gord = (a: AvaliacaoFila) => a.percentual_gordura_dobras ?? a.bio_percentual_gordura;
  const gA = gord(anterior), gB = gord(atual);
  const caiuGordura = gA != null && gB != null && gB < gA;
  const subiuMagra = anterior.massa_magra_kg != null && atual.massa_magra_kg != null
    && atual.massa_magra_kg > anterior.massa_magra_kg;

  const caiuMagra = anterior.massa_magra_kg != null && atual.massa_magra_kg != null
    && atual.massa_magra_kg < anterior.massa_magra_kg;

  if (objetivo === "ganho_de_massa") return subiuMagra || (caiuGordura && !caiuMagra);
  if (objetivo === "emagrecimento") {
    const caiuPeso = anterior.peso != null && atual.peso != null && atual.peso < anterior.peso;
    return caiuGordura || caiuPeso;
  }
  return caiuGordura || subiuMagra;
}

// ---------------------------------------------------------------------
// A fila
// ---------------------------------------------------------------------
const dia = (iso: string) => iso.slice(0, 10);
const diasDesde = (iso: string, hoje: string) => differenceInCalendarDays(parseISO(hoje), parseISO(dia(iso)));

const LEAD_ABERTO = new Set(["novo", "em_contato", "agendou"]);

export function montarFila(d: DadosFila): ItemFila[] {
  const hoje = d.hoje ?? hojeISO();
  const texto = (g: Gatilho) => d.mensagens?.[g]?.trim() || MENSAGENS_PADRAO[g];
  const itens: ItemFila[] = [];

  /** Houve toque deste gatilho para este alvo dentro do período de silêncio? */
  const silenciado = (campo: "paciente_id" | "parceiro_id", id: string, g: Gatilho) => {
    const janela = GATILHOS[g].silencio;
    if (janela <= 0) return false;
    return d.toques.some((t) => t[campo] === id && t.gatilho === g && diasDesde(t.created_at, hoje) < janela);
  };

  const add = (i: Omit<ItemFila, "chave" | "prioridade" | "mensagem"> & { vars?: { personal?: string } }) => {
    itens.push({
      ...i,
      chave: `${i.alvo}:${i.id}`,
      prioridade: GATILHOS[i.gatilho].prioridade,
      mensagem: preencherMensagem(texto(i.gatilho), { nome: i.nome, ...i.vars }),
    });
  };

  // ---- Leads -------------------------------------------------------
  // Ex-pacientes entram aos poucos: no máximo N por semana, contando os já tocados.
  const exTocadosSemana = new Set(
    d.toques.filter((t) => t.gatilho === "ex_paciente" && t.lead_id && diasDesde(t.created_at, hoje) < 7).map((t) => t.lead_id),
  ).size;
  let vagasEx = Math.max(0, REGRAS.exPacientesPorSemana - exTocadosSemana);

  const leadsOrdenados = [...d.leads].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const l of leadsOrdenados) {
    if (!LEAD_ABERTO.has(l.status)) continue;
    const base = { alvo: "lead" as const, id: l.id, nome: l.nome, telefone: l.telefone, lead: l };
    const agendadoFuturo = l.proximo_toque != null && l.proximo_toque > hoje;
    if (agendadoFuturo) continue;

    if (l.status === "novo" && !l.ultimo_toque) {
      if (l.origem === "ex_paciente") {
        if (vagasEx <= 0) continue;
        vagasEx--;
        add({ ...base, gatilho: "ex_paciente", motivo: "Ex-paciente com bom resultado, ainda sem contato." });
      } else {
        const idade = diasDesde(l.created_at, hoje);
        add({ ...base, gatilho: "lead_novo", motivo: idade === 0 ? "Chegou hoje. Responder rápido converte." : `Chegou há ${idade} dia(s) e ainda não recebeu resposta.` });
      }
      continue;
    }

    if (l.proximo_toque != null) {
      const atraso = diasDesde(l.proximo_toque, hoje);
      const atrasado = atraso === 0 ? "" : ` (${atraso} dia(s) de atraso)`;
      // Sem tentativas pendentes, a última palavra foi da pessoa: é retomada de conversa, não cobrança de resposta.
      if (l.tentativas === 0 && l.status !== "novo") {
        add({ ...base, gatilho: "lead_quente", motivo: `Demonstrou interesse. Retomada marcada para hoje${atrasado}.` });
      } else {
        add({ ...base, gatilho: "follow_up", motivo: `Toque ${l.tentativas + 1}, depois de ${l.tentativas} sem resposta${atrasado}.` });
      }
      continue;
    }

    if (l.status === "em_contato" || l.status === "agendou") {
      const ref = l.ultimo_toque ?? l.created_at;
      const parado = diasDesde(ref, hoje);
      if (parado >= REGRAS.diasLeadQuente) {
        add({ ...base, gatilho: "lead_quente", motivo: `Demonstrou interesse e está sem retorno há ${parado} dias.` });
      }
    }
  }

  // ---- Pacientes ----------------------------------------------------
  const pacientes = new Map(d.pacientes.map((p) => [p.id, p]));
  const contratoPorPaciente = new Map<string, ContratoFila>();
  for (const c of d.contratos) {
    if (c.status !== "ativo") continue;
    const atual = contratoPorPaciente.get(c.paciente_id);
    if (!atual || c.data_vencimento > atual.data_vencimento) contratoPorPaciente.set(c.paciente_id, c);
  }
  const jaNaFila = new Set<string>();

  // Renovação e vencido
  for (const [pid, c] of contratoPorPaciente) {
    const p = pacientes.get(pid);
    if (!p || p.ativo === false) continue;
    const dias = diasAteVencimento(c.data_vencimento, hoje);
    const base = { alvo: "paciente" as const, id: pid, nome: p.nome_completo, telefone: p.telefone };
    // Dentro da janela, a paciente sai das outras regras mesmo se já foi tocada
    // (silêncio): a conversa da vez é a de renovação, não um pedido a mais.
    if (dias >= 0 && dias <= d.diasAlerta) {
      jaNaFila.add(pid);
      if (!silenciado("paciente_id", pid, "renovacao")) {
        add({ ...base, gatilho: "renovacao", motivo: dias === 0 ? "O plano vence hoje." : `O plano vence em ${dias} dia(s).` });
      }
    } else if (dias < 0 && -dias <= REGRAS.diasVencidoMax) {
      jaNaFila.add(pid);
      if (!silenciado("paciente_id", pid, "vencido")) {
        add({ ...base, gatilho: "vencido", motivo: `Venceu há ${-dias} dia(s) e não foi renovado.` });
      }
    }
  }

  // Momento de indicação: avaliação recente com evolução, ou 30 dias de contrato.
  const avalPorPaciente = new Map<string, AvaliacaoFila[]>();
  for (const a of d.avaliacoes) {
    const l = avalPorPaciente.get(a.paciente_id) ?? [];
    l.push(a);
    avalPorPaciente.set(a.paciente_id, l);
  }
  for (const p of d.pacientes) {
    if (p.ativo === false || jaNaFila.has(p.id) || silenciado("paciente_id", p.id, "indicacao")) continue;
    const base = { alvo: "paciente" as const, id: p.id, nome: p.nome_completo, telefone: p.telefone };
    const avs = (avalPorPaciente.get(p.id) ?? []).sort((a, b) => b.data_avaliacao.localeCompare(a.data_avaliacao));
    if (avs.length >= 2 && diasDesde(avs[0].data_avaliacao, hoje) <= REGRAS.janelaIndicacao && evoluiuAFavor(p.objetivo, avs[1], avs[0])) {
      add({ ...base, gatilho: "indicacao", motivo: "Avaliação recente mostrou evolução. Bom momento para pedir indicação." });
      jaNaFila.add(p.id);
      continue;
    }
    const c = contratoPorPaciente.get(p.id);
    if (c) {
      const decorridos = diasDesde(c.data_inicio, hoje);
      if (decorridos >= REGRAS.diasContratoIndicacao && decorridos < REGRAS.diasContratoIndicacao + REGRAS.janelaIndicacao) {
        add({ ...base, gatilho: "indicacao", motivo: "Completou 30 dias de acompanhamento." });
        jaNaFila.add(p.id);
      }
    }
  }

  // Sem contato há muito tempo
  for (const p of d.pacientes) {
    if (p.ativo === false || jaNaFila.has(p.id) || silenciado("paciente_id", p.id, "sumico")) continue;
    const ultima = d.ultimaAtividade[p.id] ?? dia(p.created_at);
    const parado = diasDesde(ultima, hoje);
    if (parado > REGRAS.diasSumico) {
      add({ alvo: "paciente", id: p.id, nome: p.nome_completo, telefone: p.telefone, gatilho: "sumico", motivo: `Sem consulta nem plano novo há ${parado} dias.` });
    }
  }

  // ---- Parceiros ----------------------------------------------------
  for (const pa of d.parceiros) {
    if (!pa.ativo || silenciado("parceiro_id", pa.id, "parceiro")) continue;
    const datas = d.leads.filter((l) => l.parceiro_id === pa.id).map((l) => dia(l.created_at));
    const ultima = datas.sort().at(-1) ?? dia(pa.created_at);
    const parado = diasDesde(ultima, hoje);
    if (parado >= REGRAS.diasParceiro) {
      add({ alvo: "parceiro", id: pa.id, nome: pa.nome, telefone: pa.telefone, gatilho: "parceiro", motivo: `Sem indicação nova há ${parado} dias.` });
    }
  }

  return itens.sort((a, b) => a.prioridade - b.prioridade || a.nome.localeCompare(b.nome, "pt-BR"));
}

// ---------------------------------------------------------------------
// Placar
// ---------------------------------------------------------------------
export interface Placar {
  toquesSemana: number;
  respostasSemana: number;
  convertidosMes: number;
  origemMes: { origem: string; rotulo: string; total: number }[];
}

export function montarPlacar(
  toques: ToqueFila[],
  pacientesNovos: { origem: string | null; created_at: string }[],
  hoje: string = hojeISO(),
): Placar {
  const semana = toques.filter((t) => diasDesde(t.created_at, hoje) < 7);
  const mes = hoje.slice(0, 7);
  const doMes = pacientesNovos.filter((p) => p.created_at.slice(0, 7) === mes);
  const cont = new Map<string, number>();
  for (const p of doMes) cont.set(p.origem ?? "", (cont.get(p.origem ?? "") ?? 0) + 1);
  return {
    toquesSemana: semana.filter((t) => t.resultado === "enviado").length,
    respostasSemana: semana.filter((t) => t.resultado === "respondeu").length,
    convertidosMes: toques.filter((t) => t.resultado === "converteu" && t.created_at.slice(0, 7) === mes).length,
    origemMes: [...cont.entries()]
      .map(([origem, total]) => ({ origem, rotulo: rotuloOrigem(origem || null), total }))
      .sort((a, b) => b.total - a.total),
  };
}

// ---------------------------------------------------------------------
// Importação de CSV
// ---------------------------------------------------------------------
export interface LeadImportado {
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string;
  status: string;
  anotacoes: string | null;
  proximo_toque: string | null;
}

/** Divide uma linha CSV respeitando aspas. Aceita vírgula ou ponto e vírgula. */
function dividirLinha(linha: string, sep: string): string[] {
  const out: string[] = [];
  let atual = "", aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas;
    } else if (c === sep && !aspas) { out.push(atual); atual = ""; }
    else atual += c;
  }
  out.push(atual);
  return out.map((s) => s.trim());
}

/** "30/09/2026" ou "2026-09-30" para "2026-09-30". */
function dataISO(v: string): string | null {
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const STATUS_VALIDOS = new Set(["novo", "em_contato", "agendou", "converteu", "perdido"]);

/**
 * Lê um CSV com cabeçalho. Colunas reconhecidas: nome, telefone, email,
 * origem, status, anotacoes, proximo_toque. Linhas sem nome e sem telefone
 * são ignoradas; sem nome, o telefone vira o nome.
 */
export function lerCsvLeads(conteudo: string): { leads: LeadImportado[]; ignoradas: number } {
  const linhas = (conteudo.charCodeAt(0) === 0xfeff ? conteudo.slice(1) : conteudo).split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length === 0) return { leads: [], ignoradas: 0 };
  const sep = (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const cab = dividirLinha(linhas[0], sep).map((c) => c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_"));
  const col = (nome: string) => cab.indexOf(nome);
  const origensValidas = new Set(ORIGENS_LEAD.map((o) => o.value));

  const leads: LeadImportado[] = [];
  let ignoradas = 0;
  for (const linha of linhas.slice(1)) {
    const v = dividirLinha(linha, sep);
    const pega = (n: string) => (col(n) >= 0 ? v[col(n)] ?? "" : "");
    const telefone = pega("telefone") || null;
    const nome = pega("nome") || telefone || "";
    if (!nome) { ignoradas++; continue; }
    const origem = pega("origem").toLowerCase();
    const status = pega("status").toLowerCase();
    leads.push({
      nome,
      telefone,
      email: pega("email") || null,
      origem: origensValidas.has(origem) ? origem : "outro",
      status: STATUS_VALIDOS.has(status) ? status : "novo",
      anotacoes: pega("anotacoes") || null,
      proximo_toque: dataISO(pega("proximo_toque")),
    });
  }
  return { leads, ignoradas };
}
