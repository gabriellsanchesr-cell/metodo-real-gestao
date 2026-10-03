/**
 * Substituição de alimentos por equivalência calórica.
 *
 * A troca mantém as calorias, não os macronutrientes: 100 kcal de arroz e
 * 100 kcal de pão têm a mesma energia, mas não a mesma proteína ou fibra.
 * Por isso a busca fica restrita à categoria do alimento de origem.
 */
import { ALIMENTOS } from "./substituicoesDados";
import { ALIMENTOS_EXTRAS } from "./substituicoesExtras";

export type CategoriaSubstituicao = "carboidrato" | "proteina" | "gordura";

export interface Alimento {
  id: string;
  nome: string;
  categoria: CategoriaSubstituicao;
  /** Energia em kcal por 100 g. */
  kcal100g: number;
}

export const CATEGORIAS: { id: CategoriaSubstituicao; rotulo: string }[] = [
  { id: "carboidrato", rotulo: "Carboidratos" },
  { id: "proteina", rotulo: "Proteínas" },
  { id: "gordura", rotulo: "Gorduras" },
];

// A paçoca aparece em duas categorias na planilha, então o nome sozinho não é chave.
export const LISTA_ALIMENTOS: Alimento[] = [
  ...ALIMENTOS.map(([categoria, nome, kcal100g]) => ({ categoria, nome, kcal100g })),
  ...ALIMENTOS_EXTRAS,
]
  .map(({ categoria, nome, kcal100g }) => ({ id: `${categoria}:${nome}`, nome, categoria, kcal100g }))
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

/** Gramas do alimento que fornecem `kcal`. */
export function gramasPara(kcal100g: number, kcal: number): number {
  if (!(kcal100g > 0) || !(kcal > 0)) return 0;
  return (kcal / kcal100g) * 100;
}

/** Calorias em `gramas` do alimento. */
export function kcalEm(kcal100g: number, gramas: number): number {
  if (!(kcal100g > 0) || !(gramas > 0)) return 0;
  return (gramas * kcal100g) / 100;
}

/** Quantidade de `destino` com as mesmas calorias de `gramas` de `origem`. */
export function equivalente(origem: Alimento, gramas: number, destino: Alimento): number {
  return gramasPara(destino.kcal100g, kcalEm(origem.kcal100g, gramas));
}

/**
 * Gramas para mostrar na tela. Balança de cozinha mede de 1 em 1 g, então
 * casa decimal só abaixo de 10 g, onde meio grama de azeite ainda faz diferença.
 */
export function formatarGramas(g: number): string {
  if (!(g > 0)) return "0 g";
  if (g < 10) return `${(Math.round(g * 2) / 2).toLocaleString("pt-BR")} g`;
  return `${Math.round(g).toLocaleString("pt-BR")} g`;
}

/**
 * Alimento que está no plano da paciente, pronto para servir de ponto de
 * partida. Estende `Alimento` para a calculadora tratar os dois igual.
 */
export interface ItemDoPlano extends Alimento {
  gramas: number | null;
  refeicao: string | null;
}

/** Como a leitura do PDF anexado grava cada alimento (coluna alimentos_referencia). */
export interface AlimentoReferenciaPdf {
  nome: string;
  quantidade_g?: number | null;
  refeicao?: string | null;
  /** Nome exato de um item de LISTA_ALIMENTOS, ou null se não houver par. */
  correspondente?: string | null;
  /**
   * Números do próprio plano, por 100 g (planos em HTML da engine). Quando
   * vêm, valem mais que o par da lista: são os da conta do plano.
   */
  kcal_100g?: number | null;
  proteina_100g?: number | null;
  carboidrato_100g?: number | null;
  gordura_100g?: number | null;
}

interface AlimentoPlanoLinha {
  nome_alimento?: string | null;
  quantidade?: number | null;
  energia_kcal?: number | null;
  proteina_g?: number | null;
  carboidrato_g?: number | null;
  lipidio_g?: number | null;
}

// Abaixo disso é folha, legume ou bebida sem caloria: trocar alface por
// arroz "equivalente" não faz sentido.
const KCAL100G_MINIMO = 25;

/** Categoria pelo macro que mais contribui com energia. */
export function categoriaPorMacros(p: number, c: number, g: number): CategoriaSubstituicao | null {
  const e = { proteina: p * 4, carboidrato: c * 4, gordura: g * 9 };
  const total = e.proteina + e.carboidrato + e.gordura;
  if (!(total > 0)) return null;
  return (Object.keys(e) as CategoriaSubstituicao[]).reduce((a, b) => (e[b] > e[a] ? b : a));
}

/** Um alimento do plano montado (ou importado) vira ponto de partida pelos próprios números. */
export function itemDeAlimentoPlano(a: AlimentoPlanoLinha, refeicao: string | null): ItemDoPlano | null {
  const nome = (a.nome_alimento || "").trim();
  const gramas = Number(a.quantidade);
  const kcal = Number(a.energia_kcal);
  if (!nome || !(gramas > 0) || !(kcal > 0)) return null;
  const kcal100g = (kcal / gramas) * 100;
  if (kcal100g < KCAL100G_MINIMO) return null;
  const categoria = categoriaPorMacros(Number(a.proteina_g) || 0, Number(a.carboidrato_g) || 0, Number(a.lipidio_g) || 0);
  if (!categoria) return null;
  // O id precisa distinguir quantidade e refeição: com id repetido o React
  // duplica cartões na tela a cada atualização.
  return { id: `plano:${refeicao ?? ""}:${nome}:${gramas}`, nome, categoria, kcal100g, gramas, refeicao };
}

// Variações que mudam muito a energia. A leitura do PDF às vezes liga
// "farelo de aveia" a "Aveia, flocos" (246 contra 394 kcal) ou "iogurte
// desnatado" a "Iogurte com sabor"; com a energia errada a troca sai errada.
/** Se o PDF diz isto, o item da lista também precisa dizer. */
const VARIACOES_DO_PDF = ["light", "desnatad", "zero", "diet", "farelo", "integral", "natural", "sem acucar", "proteic", "magro", "sem lactose", "pasta de", "peito de peru"];
/** Se o item da lista diz isto, o PDF também precisa dizer. */
const VARIACOES_DA_LISTA = ["aveia", "com sabor", "chocolate", "calda", "frit", "recheado", "condensado", "milanesa", "com pele", "com gordura", "enlatad", "em barra", "instantaneo", "doce", "pacoca", "pe-de-moleque", "linhaca", "extrato"];

/**
 * A ligação feita pela leitura do PDF é confiável? Recusa quando um lado
 * tem uma variação que o outro não tem. Na dúvida o alimento fica de fora,
 * melhor do que mostrar uma troca com a caloria errada.
 */
export function correspondenciaConfiavel(nomePdf: string, nomeLista: string): boolean {
  // Observação entre parênteses não descreve o alimento: "leite desnatado
  // (não usar integral)" é leite desnatado.
  const pdf = semAcento(nomePdf).replace(/\([^)]*\)/g, " ");
  const lista = semAcento(nomeLista);
  if (VARIACOES_DO_PDF.some((v) => pdf.includes(v) && !lista.includes(v))) return false;
  if (VARIACOES_DA_LISTA.some((v) => lista.includes(v) && !pdf.includes(v))) return false;
  return true;
}

/**
 * Alimentos básicos que a leitura por IA às vezes deixa sem par de uma
 * leitura para outra. Só o alimento sozinho: "frango ou carne magra" e
 * "patê de frango" continuam sem par.
 */
const SINONIMOS: [RegExp, string][] = [
  [/^(file de )?(peito de )?frango (grelhado|desfiado|cozido|assado)$/, "Frango, peito, sem pele, pronto"],
  [/^ovos? (inteiros? )?(mexidos?|cozidos?)$/, "Ovo, inteiro, cozido"],
  [/^(carne moida|patinho moido|patinho)( de patinho)?( magra)?( refogad[ao]| grelhado)?$/, "Carne, bovina, patinho, sem gordura, grelhado"],
  [/^(tapioca|goma de tapioca)( \(goma\)| hidratada)?$/, "Tapioca, goma hidratada (Yoki)"],
];

function sinonimo(nome: string): string | null {
  const n = semAcento(nome).trim().replace(/\s+/g, " ");
  return SINONIMOS.find(([rx]) => rx.test(n))?.[1] ?? null;
}

/** Um alimento lido do PDF anexado usa a energia do item correspondente da lista. */
export function itemDeReferenciaPdf(r: AlimentoReferenciaPdf, lista: Alimento[] = LISTA_ALIMENTOS): ItemDoPlano | null {
  const nome = (r.nome || "").trim();
  const proprio = itemComNumerosProprios(r, lista);
  if (proprio || !nome) return proprio;
  const alvo = r.correspondente || sinonimo(nome);
  const par = alvo ? lista.find((a) => a.nome === alvo) : undefined;
  if (!nome || !par || !correspondenciaConfiavel(nome, par.nome)) return null;
  const gramas = Number(r.quantidade_g);
  return {
    id: `pdf:${r.refeicao?.trim() ?? ""}:${nome}:${gramas > 0 ? gramas : ""}:${par.id}`,
    nome,
    categoria: par.categoria,
    kcal100g: par.kcal100g,
    gramas: gramas > 0 ? gramas : null,
    refeicao: r.refeicao?.trim() || null,
  };
}

/** Alimento que já traz energia e macros por 100 g (plano em HTML da engine). */
function itemComNumerosProprios(r: AlimentoReferenciaPdf, lista: Alimento[]): ItemDoPlano | null {
  const nome = (r.nome || "").trim();
  const kcal100g = Number(r.kcal_100g);
  const gramas = Number(r.quantidade_g);
  if (!nome || !(kcal100g >= KCAL100G_MINIMO)) return null;
  const alvo = r.correspondente || sinonimo(nome);
  const par = alvo ? lista.find((a) => a.nome === alvo) : undefined;
  const categoria = par?.categoria
    ?? categoriaPorMacros(Number(r.proteina_100g) || 0, Number(r.carboidrato_100g) || 0, Number(r.gordura_100g) || 0);
  if (!categoria) return null;
  const refeicao = r.refeicao?.trim() || null;
  return {
    id: `html:${refeicao ?? ""}:${nome}:${gramas > 0 ? gramas : ""}`,
    nome,
    categoria,
    kcal100g: Math.round(kcal100g * 10) / 10,
    gramas: gramas > 0 ? gramas : null,
    refeicao,
  };
}

const NOME_REFEICAO: Record<string, string> = {
  cafe_da_manha: "Café da manhã", lanche_da_manha: "Lanche da manhã", almoco: "Almoço",
  lanche_da_tarde: "Lanche da tarde", jantar: "Jantar", ceia: "Ceia",
};

interface RefeicaoParaSubstituicao {
  nome?: string | null;
  nome_customizado?: string | null;
  tipo?: string | null;
  ordem?: number | null;
  alimentos_plano?: AlimentoPlanoLinha[] | null;
}

function nomeDaRefeicao(r: RefeicaoParaSubstituicao): string | null {
  return r.nome_customizado?.trim() || r.nome?.trim() || (r.tipo ? NOME_REFEICAO[r.tipo] ?? null : null);
}

interface PlanoParaSubstituicao {
  refeicoes?: RefeicaoParaSubstituicao[] | null;
  alimentos_referencia?: unknown;
}

function referenciaPdfValida(valor: unknown): valor is AlimentoReferenciaPdf {
  return typeof valor === "object" && valor !== null && "nome" in valor && typeof valor.nome === "string";
}

/**
 * Tudo que dá para trocar no plano ativo, na ordem das refeições, sem repetir
 * o mesmo alimento na mesma quantidade (as opções A/B costumam repetir itens).
 */
export function itensDoPlano(plano: PlanoParaSubstituicao | null | undefined): ItemDoPlano[] {
  if (!plano) return [];
  const itens: ItemDoPlano[] = [];
  const refeicoes = [...(plano.refeicoes || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  for (const r of refeicoes) {
    for (const a of r.alimentos_plano || []) {
      // A linha-resumo do PDF anexado soma o dia todo; não é um alimento.
      if (a.nome_alimento === "Resumo nutricional do PDF") continue;
      const item = itemDeAlimentoPlano(a, nomeDaRefeicao(r));
      if (item) itens.push(item);
    }
  }
  const referencias = Array.isArray(plano.alimentos_referencia)
    ? plano.alimentos_referencia.filter(referenciaPdfValida)
    : [];
  for (const r of referencias) {
    const item = itemDeReferenciaPdf(r);
    if (item) itens.push(item);
  }
  const vistos = new Set<string>();
  // Repetição só dentro da mesma refeição (as opções A/B repetem itens).
  return itens.filter((i) => {
    const chave = `${semAcento(i.refeicao ?? "")}|${semAcento(i.nome)}|${Math.round(i.gramas ?? 0)}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

/** Refeições do plano, na ordem em que aparecem. */
export function refeicoesDoPlano(itens: ItemDoPlano[]): string[] {
  return [...new Set(itens.map((i) => i.refeicao).filter((r): r is string => !!r))];
}

export interface GrupoDoPlano {
  /** Primeira ocorrência: é dela que saem as gramas ao tocar. */
  item: ItemDoPlano;
  refeicoes: string[];
  /** O mesmo alimento aparece com quantidades diferentes nas refeições. */
  gramasVariam: boolean;
}

/**
 * Alimentos do plano para mostrar, um cartão por alimento. Sem refeição
 * escolhida junta as ocorrências do mesmo nome; com refeição, só as dela.
 */
export function agruparDoPlano(
  itens: ItemDoPlano[],
  categoria: CategoriaSubstituicao,
  refeicao: string | null,
): GrupoDoPlano[] {
  const grupos = new Map<string, GrupoDoPlano>();
  for (const i of itens) {
    if (i.categoria !== categoria) continue;
    if (refeicao && i.refeicao !== refeicao) continue;
    const chave = semAcento(i.nome);
    const g = grupos.get(chave);
    if (!g) {
      grupos.set(chave, { item: i, refeicoes: i.refeicao ? [i.refeicao] : [], gramasVariam: false });
      continue;
    }
    if (i.refeicao && !g.refeicoes.includes(i.refeicao)) g.refeicoes.push(i.refeicao);
    if (Math.round(i.gramas ?? 0) !== Math.round(g.item.gramas ?? 0)) g.gramasVariam = true;
  }
  return [...grupos.values()];
}

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Busca sem diferenciar acento nem maiúscula ("acai" encontra "Açaí"). */
export function buscarAlimentos(lista: Alimento[], termo: string): Alimento[] {
  const t = semAcento(termo.trim());
  if (!t) return lista;
  const partes = t.split(/\s+/);
  return lista.filter((a) => {
    const nome = semAcento(a.nome);
    return partes.every((p) => nome.includes(p));
  });
}
