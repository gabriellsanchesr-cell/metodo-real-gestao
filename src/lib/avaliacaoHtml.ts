/**
 * Avaliação física no visual do feedback físico (layout v4 da engine
 * Gabriel Nutri/agents/feedback_builder.py), montada a partir do banco.
 *
 * A mesma página serve ao portal (aberta em tela cheia) e à exportação do
 * nutri (arquivo .html que abre sozinho e tem "Salvar em PDF"). O estilo e
 * as animações vêm de feedbackAssets.ts, gerado da engine; aqui só se monta
 * o conteúdo, com as mesmas classes.
 */
import { differenceInCalendarDays } from "date-fns";
import { dataLocal } from "@/lib/datas";
import { classificarGordura, calcIMC, calcRCQ, normalizarSexo } from "@/lib/antropometria";
import { MEDIDAS_CORPO } from "@/lib/checkin";
import { FEEDBACK_CSS, FEEDBACK_HEAD_JS, FEEDBACK_JS, FEEDBACK_LOGO_B64, FEEDBACK_SVG_PRINT } from "@/lib/feedbackAssets";

export type AvaliacaoLinha = Record<string, unknown> & { id?: string; data_avaliacao: string };

export interface FotoAvaliacao {
  angulo: string;
  data: string; // AAAA-MM-DD
  url: string; // data: ou URL assinada
}

export interface OpcoesAvaliacaoHtml {
  paciente: { nome_completo: string; sexo?: string | null; fase_real?: string | null };
  /** Todas as avaliações da paciente, em qualquer ordem. */
  avaliacoes: AvaliacaoLinha[];
  /** A avaliação aberta. Sem ela, vale a mais recente. */
  avaliacaoId?: string | null;
  fotos?: FotoAvaliacao[];
  /** Mostra o botão "Salvar em PDF" (arquivo exportado). */
  comBotaoPdf?: boolean;
}

type Direcao = "maior" | "menor" | "neutro";
interface Medida { chave: string; rotulo: string; unidade: "kg" | "cm" | "%" | "mm"; direcao: Direcao }

const CRN = "Gabriel Sanches, CRN-8 18451";

// Mais é melhor (maior), menos é melhor (menor) ou só informativo (neutro).
// Peso é neutro de propósito: a balança não manda sozinha.
const COMPOSICAO: Medida[] = [
  { chave: "peso", rotulo: "Peso", unidade: "kg", direcao: "neutro" },
  { chave: "percentual_gordura_dobras", rotulo: "Gordura", unidade: "%", direcao: "menor" },
  { chave: "massa_magra_kg", rotulo: "Massa magra", unidade: "kg", direcao: "maior" },
  { chave: "massa_gorda_kg", rotulo: "Massa gorda", unidade: "kg", direcao: "menor" },
];
const MENOR_E_MELHOR = new Set(["circ_cintura", "circ_abdomen", "circ_quadril"]);
const CIRCUNFERENCIAS: Medida[] = MEDIDAS_CORPO.map((m) => ({
  chave: m.key, rotulo: m.label, unidade: "cm", direcao: MENOR_E_MELHOR.has(m.key) ? "menor" : "neutro",
}));
const DOBRAS: Medida[] = [
  ["dobra_triceps", "Dobra tricipital"], ["dobra_biceps", "Dobra bicipital"], ["dobra_subescapular", "Dobra subescapular"],
  ["dobra_axilar_media", "Dobra axilar média"], ["dobra_peitoral", "Dobra peitoral"], ["dobra_abdominal", "Dobra abdominal"],
  ["dobra_suprailiaca", "Dobra suprailíaca"], ["dobra_coxa", "Dobra da coxa"], ["dobra_panturrilha", "Dobra da panturrilha"],
].map(([chave, rotulo]) => ({ chave, rotulo, unidade: "mm" as const, direcao: "menor" as const }));

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function escapar(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const fmt = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");
const fmt2 = (v: number) => v.toFixed(2).replace(".", ",");
const num = (v: unknown): number | null => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : null;
};
const ddmm = (iso: string) => { const [, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}`; };
const ddmmaaaa = (iso: string) => { const [a, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${a}`; };

function classe(delta: number, direcao: Direcao): "up" | "down" | "flat" {
  if (delta === 0 || direcao === "neutro") return "flat";
  return (delta > 0 && direcao === "maior") || (delta < 0 && direcao === "menor") ? "up" : "down";
}
const textoDelta = (d: number) => (d === 0 ? "0" : `${d > 0 ? "+" : ""}${fmt(d)}`);

/** Série de uma medida nas avaliações (só as datas em que ela foi medida). */
function serie(avs: AvaliacaoLinha[], chave: string): { data: string; v: number }[] {
  return avs.map((a) => ({ data: a.data_avaliacao.slice(0, 10), v: num(a[chave]) })).filter((p): p is { data: string; v: number } => p.v != null);
}

// ------------------------------------------------------------- gráficos
let spkN = 0;
function spark(rotulo: string, pts: { data: string; v: number }[], direcao: Direcao, unidade: string): string {
  const W = 240, H = 100, px = 16;
  const t0 = dataLocal(pts[0].data), t1 = dataLocal(pts[pts.length - 1].data);
  const span = Math.max(differenceInCalendarDays(t1, t0), 1);
  let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v));
  const rng = hi - lo || 1;
  lo -= rng * 0.35; hi += rng * 0.35;
  const X = (d: string) => px + (differenceInCalendarDays(dataLocal(d), t0) / span) * (W - 2 * px);
  const Y = (v: number) => 14 + ((hi - v) / (hi - lo)) * (H - 30);
  const xy = pts.map((p) => [X(p.data), Y(p.v)] as const);
  const linha = "M" + xy.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
  const ultimo = xy[xy.length - 1];
  const area = `${linha} L${ultimo[0].toFixed(1)} ${H - 4} L${xy[0][0].toFixed(1)} ${H - 4} Z`;
  const v0 = pts[0].v, v1 = pts[pts.length - 1].v;
  const delta = Math.round((v1 - v0) * 10) / 10;
  const cls = classe(delta, direcao);
  const gid = `g${++spkN}`;
  const pontos = xy.slice(0, -1).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" class="pt"/>`).join("")
    + `<circle cx="${ultimo[0].toFixed(1)}" cy="${ultimo[1].toFixed(1)}" r="5.5" class="pt-end"/>`;
  const l0 = `<text x="${Math.max(xy[0][0] - 6, 2).toFixed(1)}" y="${Math.max(xy[0][1] - 9, 10).toFixed(1)}" text-anchor="start" class="sv-l">${fmt(v0)}</text>`;
  const l1 = `<text x="${Math.min(ultimo[0] + 6, W - 2).toFixed(1)}" y="${Math.max(ultimo[1] - 11, 10).toFixed(1)}" text-anchor="end" class="sv-l sv-e">${fmt(v1)}</text>`;
  return `<div class="spk ${cls}"><div class="spk-h"><b>${escapar(rotulo)}</b><span class="chip-d ${cls}">${textoDelta(delta)}</span></div>`
    + `<div class="spk-v">${fmt(v1)} <small>${unidade}</small></div>`
    + `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapar(rotulo)} de ${fmt(v0)} para ${fmt(v1)}">`
    + `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/>`
    + `<stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>`
    + `<path d="${area}" fill="url(#${gid})" class="ar"/><path d="${linha}" pathLength="1" class="ln"/>${pontos}${l0}${l1}</svg>`
    + `<div class="spk-f"><span>${ddmm(pts[0].data)} &rarr; ${ddmm(pts[pts.length - 1].data)}</span></div></div>`;
}

function linhaDoTempo(datasMedidas: string[], datasFotos: string[]): string {
  const todas = [...new Set([...datasMedidas, ...datasFotos])].sort();
  if (todas.length < 2) return "";
  const t0 = dataLocal(todas[0]), t1 = dataLocal(todas[todas.length - 1]);
  const span = Math.max(differenceInCalendarDays(t1, t0), 1);
  const pos = (d: string) => 3 + (differenceInCalendarDays(dataLocal(d), t0) / span) * 94;
  let marcas = "";
  for (let cur = new Date(t0.getFullYear(), t0.getMonth(), 1); cur <= t1; cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)) {
    if (cur >= t0) marcas += `<i class="tk" style="left:${(3 + (differenceInCalendarDays(cur, t0) / span) * 94).toFixed(1)}%"><em>${MESES[cur.getMonth()]}</em></i>`;
  }
  const fila = (nome: string, lista: string[], cls: string) =>
    `<div class="tl-r"><span>${nome}</span><div class="tl-t">${lista.map((d) => `<i class="${cls}" style="left:${pos(d).toFixed(1)}%" title="${ddmm(d)}"></i>`).join("")}</div></div>`;
  return `<div class="tline"><h4>Linha do tempo &middot; ${differenceInCalendarDays(t1, t0)} dias</h4>`
    + (datasFotos.length ? fila("Fotos", datasFotos, "df") : "") + fila("Medidas", datasMedidas, "dm")
    + `<div class="tl-m">${marcas}</div><div class="tl-e"><span>${ddmm(todas[0])}</span><span>${ddmm(todas[todas.length - 1])}</span></div></div>`;
}

function barras(linhas: { rotulo: string; delta: number; cls: string }[], d0: string, d1: string): string {
  if (!linhas.length) return "";
  const mx = Math.max(...linhas.map((l) => Math.abs(l.delta))) || 1;
  const corpo = [...linhas].sort((a, b) => b.delta - a.delta).map((l) => {
    const w = (Math.abs(l.delta) / mx) * 50;
    const pos = l.delta >= 0 ? `left:50%;width:${w.toFixed(1)}%` : `right:50%;width:${w.toFixed(1)}%`;
    return `<div class="bar-r"><span class="bl">${escapar(l.rotulo)}</span><div class="bt"><i class="bz"></i><i class="bb ${l.cls}" style="${pos}"></i></div><span class="bv ${l.cls}">${textoDelta(l.delta)}</span></div>`;
  }).join("");
  return `<div class="bars"><h4>Quanto cada região mudou &middot; ${ddmm(d0)} a ${ddmm(d1)}</h4>${corpo}`
    + `<p class="note">Barra para a direita: a medida aumentou. Para a esquerda: diminuiu. A cor mostra se a mudança caminha na direção do objetivo.</p></div>`;
}

// ------------------------------------------------------------- fotos
function figura(f: FotoAvaliacao): string {
  return `<figure class="ph" data-cap="${escapar(f.angulo)} &middot; ${ddmm(f.data)}"><img src="${escapar(f.url)}" alt="${escapar(f.angulo)} ${ddmm(f.data)}"><figcaption>${ddmm(f.data)}</figcaption></figure>`;
}
const ROTULO_ANGULO: Record<string, string> = { frente: "Frente", lateral: "Lateral", costas: "Costas" };

function secoesDeFotos(fotos: FotoAvaliacao[]): { antesAgora: string; galeria: string } {
  if (!fotos.length) return { antesAgora: "", galeria: "" };
  const datas = [...new Set(fotos.map((f) => f.data))].sort();
  const angulos = [...new Set(fotos.map((f) => f.angulo))].sort((a, b) => Object.keys(ROTULO_ANGULO).indexOf(a) - Object.keys(ROTULO_ANGULO).indexOf(b));
  const blocos = angulos.map((ang) => {
    const figs = datas.map((d) => {
      const f = fotos.find((x) => x.angulo === ang && x.data === d);
      return f ? figura(f) : `<figure class="ph empty"><span>sem foto</span><figcaption>${ddmm(d)}</figcaption></figure>`;
    }).join("");
    return `<div class="gal"><div class="gal-h"><h4>${ROTULO_ANGULO[ang] ?? escapar(ang)}</h4><span class="hint">deslize para o lado &rarr;</span></div><div class="track">${figs}</div></div>`;
  }).join("");
  const galeria = `<section class="sec photo-sec" id="fotos" data-reveal><h3>Sequência de fotos</h3>${blocos}`
    + `<p class="note">Fotos no mesmo local e roupa são referência visual, não medição exata: luz e ângulo mudam um pouco de um dia para o outro. Toque em uma foto para ampliar.</p></section>`;
  let antesAgora = "";
  if (datas.length >= 2) {
    const ini = datas[0], fim = datas[datas.length - 1];
    const pares = angulos.map((ang) => {
      const a = fotos.find((x) => x.angulo === ang && x.data === ini);
      const b = fotos.find((x) => x.angulo === ang && x.data === fim);
      return a && b ? `<div class="pair"><h4>${ROTULO_ANGULO[ang] ?? escapar(ang)}</h4><div class="pair-in">${figura(a)}${figura(b)}</div></div>` : "";
    }).join("");
    if (pares) {
      antesAgora = `<section class="sec impact impact-photos-only" id="antes-agora" data-reveal><h3>Antes e agora &middot; fotos</h3>`
        + `<p class="lead">O primeiro e o último registro lado a lado, para enxergar o caminho sem julgamento do corpo.</p>`
        + `<div class="pairs"><div class="pair-legend"><span>Antes &middot; ${ddmm(ini)}</span><span>Agora &middot; ${ddmm(fim)}</span></div>${pares}</div>`
        + `<p class="note">Fotos são referência visual e dependem de pose, luz e distância.</p></section>`;
    }
  }
  return { antesAgora, galeria };
}

// ------------------------------------------------------------- página
function heroi(titulo: string, subtitulo: string, janela: string, chips: string[]): string {
  const nome = titulo.split(/\s+/).map((w, i) => `<span class="w"><span style="--i:${i}">${escapar(w)}</span></span>`).join(" ");
  const ch = chips.map((c, i) => `<span class="chip" style="--i:${i}">${c}</span>`).join("");
  const logo = `data:image/png;base64,${FEEDBACK_LOGO_B64}`;
  return `<header class="hero"><div class="hero-bg" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i><img class="mark" src="${logo}" alt=""></div>`
    + `<div class="hero-in"><div class="hero-top"><img class="logo" src="${logo}" alt="Gabriel Sanches Nutrição"><div class="date"><span>Avaliação</span><b>${janela}</b></div></div>`
    + `<div class="eyebrow">Avaliação física &middot; Nutrição Individualizada</div><h1>${nome}</h1><p class="sub">${escapar(subtitulo)}</p><div class="chips">${ch}</div></div></header>`;
}

function paragrafos(texto: string): string {
  return texto.split(/\n\s*\n|\r\n\s*\r\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${escapar(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/** HTML completo da avaliação, pronto para abrir sozinho ou num iframe. */
export function montarAvaliacaoHtml(o: OpcoesAvaliacaoHtml): string {
  spkN = 0;
  const todas = [...o.avaliacoes].sort((a, b) => a.data_avaliacao.localeCompare(b.data_avaliacao));
  if (!todas.length) throw new Error("Nenhuma avaliação para montar.");
  const atual = todas.find((a) => a.id === o.avaliacaoId) ?? todas[todas.length - 1];
  const ate = todas.filter((a) => a.data_avaliacao <= atual.data_avaliacao);
  const primeira = ate[0];
  const temHistorico = ate.length >= 2;
  const dAtual = atual.data_avaliacao.slice(0, 10), dIni = primeira.data_avaliacao.slice(0, 10);
  const sexo = normalizarSexo(o.paciente.sexo);
  const fotos = (o.fotos ?? []).filter((f) => f.data <= dAtual);

  const todasMedidas = [...COMPOSICAO, ...CIRCUNFERENCIAS, ...DOBRAS];
  // Linhas da tabela: medidas presentes na avaliação atual.
  const linhas = todasMedidas.map((m) => {
    const fim = num(atual[m.chave]);
    if (fim == null) return null;
    const ini = temHistorico ? num(primeira[m.chave]) : null;
    const delta = ini != null ? Math.round((fim - ini) * 10) / 10 : null;
    return { m, ini, fim, delta, cls: delta != null ? classe(delta, m.direcao) : "flat" };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // KPIs: com histórico, o que mais mudou desde a primeira avaliação (fora o peso); sem histórico, a composição de hoje.
  const peso = num(atual.peso), altura = num(atual.altura);
  const imc = calcIMC(peso, altura);
  const gord = num(atual.percentual_gordura_dobras) ?? num(atual.bio_percentual_gordura);
  let kpis: { v: string; l: string; cls: string }[];
  if (temHistorico) {
    kpis = linhas.filter((l) => l.delta != null && l.m.chave !== "peso" && l.delta !== 0)
      .sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!)).slice(0, 4)
      .map((l) => ({ v: textoDelta(l.delta!), l: `${l.m.rotulo} (${l.m.unidade})`, cls: l.cls === "flat" ? "" : l.cls }));
  } else {
    kpis = [
      peso != null ? { v: fmt(peso), l: "Peso (kg)", cls: "" } : null,
      gord != null ? { v: fmt(gord), l: "Gordura (%)", cls: "" } : null,
      num(atual.massa_magra_kg) != null ? { v: fmt(num(atual.massa_magra_kg)!), l: "Massa magra (kg)", cls: "" } : null,
      imc.imc != null ? { v: fmt(imc.imc), l: "IMC", cls: "" } : null,
    ].filter((k): k is { v: string; l: string; cls: string } => k !== null);
  }
  const kpisHtml = kpis.length ? `<div class="kpis">${kpis.map((k) => `<div class="kpi"><div class="v ${k.cls}">${k.v}</div><div class="l">${escapar(k.l)}</div></div>`).join("")}</div>` : "";

  // Destaques de composição: IMC, % de gordura e relação cintura/quadril, com a classificação.
  const rcq = calcRCQ(num(atual.circ_cintura), num(atual.circ_quadril), sexo);
  const classeGord = classificarGordura(gord, sexo);
  const destaques = [
    imc.imc != null ? { k: "IMC", t: fmt(imc.imc), d: imc.classificacao ?? "", tom: "flat" } : null,
    gord != null ? { k: "Gordura corporal", t: `${fmt(gord)}%`, d: classeGord && classeGord !== "—" ? classeGord : "Pelas dobras cutâneas", tom: "flat" } : null,
    rcq.rcq != null ? { k: "Cintura / quadril", t: fmt2(rcq.rcq), d: rcq.risco ? `Risco ${String(rcq.risco).toLowerCase()}` : "Quanto menor, mais marcada a cintura", tom: rcq.risco && /elevad|moderad/i.test(rcq.risco) ? "down" : "up" } : null,
  ].filter((x): x is { k: string; t: string; d: string; tom: string } => x !== null);
  const destaquesHtml = destaques.length
    ? `<div class="dest">${destaques.map((d) => `<div class="dst ${d.tom}"><span class="dk">${d.k}</span><b>${d.t}</b><p>${escapar(d.d)}</p></div>`).join("")}</div>`
    : "";

  // Gráficos (só com duas avaliações ou mais).
  let evolucao = "";
  if (temHistorico) {
    const datasMedidas = ate.map((a) => a.data_avaliacao.slice(0, 10));
    const datasFotos = [...new Set(fotos.map((f) => f.data))].sort();
    const comVariacao = linhas.filter((l) => l.delta != null && l.m.chave !== "peso" && l.m.unidade === "cm");
    const sparks = [...COMPOSICAO.filter((m) => m.chave !== "peso"), ...CIRCUNFERENCIAS.filter((m) => m.direcao === "menor")]
      .map((m) => ({ m, s: serie(ate, m.chave) })).filter(({ s }) => s.length >= 2)
      .map(({ m, s }) => spark(m.rotulo, s, m.direcao, m.unidade)).join("");
    const ci = serie(ate, "circ_cintura"), qu = new Map(serie(ate, "circ_quadril").map((p) => [p.data, p.v]));
    const pares = ci.filter((p) => qu.get(p.data)).map((p) => ({ data: p.data, v: p.v / qu.get(p.data)! }));
    const rcqHtml = pares.length >= 2
      ? `<div class="rcq ${pares[pares.length - 1].v < pares[0].v ? "up" : pares[pares.length - 1].v > pares[0].v ? "down" : "flat"}"><div><span class="rl">Relação cintura / quadril</span>`
        + `<div class="rv">${fmt2(pares[0].v)} <i>&rarr;</i> <b>${fmt2(pares[pares.length - 1].v)}</b></div></div>`
        + `<p>Quanto menor, mais a cintura está marcada em relação ao quadril. Entre ${ddmm(pares[0].data)} e ${ddmm(pares[pares.length - 1].data)}, passou de ${fmt2(pares[0].v)} para ${fmt2(pares[pares.length - 1].v)}.</p></div>`
      : "";
    const pesos = serie(ate, "peso");
    const pesoHtml = pesos.length >= 2
      ? `<div class="peso"><h4>E a balança?</h4>${spark("Peso", pesos, "neutro", "kg")}<p class="note">O peso oscila com água, intestino e treino. Ele aparece aqui só para mostrar que a história está nas medidas e na composição.</p></div>`
      : "";
    const corpo = linhaDoTempo(datasMedidas, datasFotos)
      + barras(comVariacao.map((l) => ({ rotulo: l.m.rotulo, delta: l.delta!, cls: l.cls })), dIni, dAtual)
      + (sparks ? `<div class="sparks">${sparks}</div>` : "") + rcqHtml + pesoHtml;
    if (corpo) evolucao = `<section class="sec evol" id="evolucao" data-reveal><h3>Evolução em gráficos</h3>${corpo}</section>`;
  }

  const tabela = linhas.length
    ? `<section class="sec med-sec" id="medidas" data-reveal><h3>${temHistorico ? `Evolução das medidas &middot; ${ddmm(dIni)} a ${ddmm(dAtual)}` : `Medidas de ${ddmm(dAtual)}`}</h3>`
      + `<table class="med"><thead><tr><th>Medida</th>${temHistorico ? `<th>${ddmm(dIni)}</th><th>${ddmm(dAtual)}</th><th>Variação</th>` : "<th>Valor</th>"}</tr></thead><tbody>`
      + linhas.map((l) => `<tr><td class="lbl">${escapar(l.m.rotulo)} (${l.m.unidade})</td>`
        + (temHistorico ? `<td>${l.ini != null ? fmt(l.ini) : "&ndash;"}</td><td>${fmt(l.fim)}</td><td class="delta ${l.cls}">${l.delta != null ? textoDelta(l.delta) : "&ndash;"}</td>` : `<td>${fmt(l.fim)}</td>`)
        + "</tr>").join("")
      + `</tbody></table><div class="note">Circunferências em centímetros, dobras em milímetros, peso e massas em quilos. A cor mostra se a mudança caminha na direção do objetivo; peso fica neutro.</div></section>`
    : "";

  const { antesAgora, galeria } = secoesDeFotos(fotos);
  const obs = String(atual.observacoes ?? "").trim();
  const leitura = obs ? `<section class="sec read" id="leitura" data-reveal><h3>Leitura da sua evolução</h3>${paragrafos(obs)}</section>` : "";

  const ctx = `<div class="ctx"><h4>Como ler este material</h4><p>Aqui estão ${temHistorico ? "as suas medidas desde a primeira avaliação" : "as suas medidas e a sua composição corporal de hoje"}. O objetivo é <span class="hl">enxergar o caminho</span>, não te julgar. ${temHistorico ? "A cor mostra se cada mudança vai na direção do seu objetivo." : "Nas próximas avaliações, este material passa a mostrar a evolução."}</p></div>`;

  const dias = temHistorico ? differenceInCalendarDays(dataLocal(dAtual), dataLocal(dIni)) : 0;
  const stats = temHistorico
    ? `<div class="stats"><div><b>${dias}</b><span>dias de acompanhamento</span></div><div><b>${ate.length}</b><span>avaliações</span></div>${fotos.length ? `<div><b>${new Set(fotos.map((f) => f.data)).size}</b><span>registros de foto</span></div>` : ""}</div>`
    : "";

  const nav: [string, string][] = [];
  if (antesAgora) nav.push(["antes-agora", "Antes e agora"]);
  if (evolucao) nav.push(["evolucao", "Gráficos"]);
  if (galeria) nav.push(["fotos", "Fotos"]);
  if (tabela) nav.push(["medidas", "Medidas"]);
  if (leitura) nav.push(["leitura", "Leitura"]);
  const secnav = nav.length > 1 ? `<nav class="secnav" aria-label="Seções"><div class="sn-track">${nav.map(([i, t]) => `<a href="#${i}">${t}</a>`).join("")}</div></nav>` : "";

  const chips = [
    peso != null ? `${fmt(peso)} kg` : null,
    gord != null ? `${fmt(gord)}% de gordura` : null,
    temHistorico ? `${ate.length} avaliações` : "Primeira avaliação",
  ].filter((c): c is string => !!c);

  const fecho = `<section class="closing" data-reveal><blockquote>${"Leveza também se aprende.".split(" ").map((w, i) => `<span class="qw" style="--i:${i}">${w}</span>`).join(" ")}</blockquote><div class="sign">Gabriel Sanches &middot; Nutrição Individualizada</div></section>`;
  const rodape = `${CRN} &middot; Nutrição Individualizada &middot; Documento de acompanhamento. ${fotos.length ? "As fotos são dados sensíveis e de" : "Informações de"} uso exclusivo do seu atendimento.`;

  const corpo = stats + secnav + kpisHtml + destaquesHtml + ctx + antesAgora + evolucao + galeria + tabela + leitura + fecho;
  const titulo = `Avaliação física - ${o.paciente.nome_completo}`;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`
    + `<meta name="theme-color" content="#06101f"><title>${escapar(titulo)}</title><script>${FEEDBACK_HEAD_JS}</script>`
    + `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
    + `<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">`
    + `<style>${FEEDBACK_CSS}</style></head><body><div class="progress" aria-hidden="true"></div><div class="page">`
    + heroi(o.paciente.nome_completo, `avaliação física de ${ddmmaaaa(dAtual)}`, ddmmaaaa(dAtual), chips)
    + corpo + `<div class="foot">${rodape}</div></div>`
    + (o.comBotaoPdf ? `<button type="button" class="fab">${FEEDBACK_SVG_PRINT}Salvar em PDF</button>` : "")
    + `<div class="lb" role="dialog" aria-label="Foto ampliada"><button type="button" aria-label="Fechar">&times;</button><img alt=""><span></span></div>`
    + `<script>${FEEDBACK_JS}</script></body></html>`;
}
