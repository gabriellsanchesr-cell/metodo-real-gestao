/**
 * Substituição de alimentos por equivalência calórica.
 *
 * A troca mantém as calorias, não os macronutrientes: 100 kcal de arroz e
 * 100 kcal de pão têm a mesma energia, mas não a mesma proteína ou fibra.
 * Por isso a busca fica restrita à categoria do alimento de origem.
 */
import { ALIMENTOS } from "./substituicoesDados";

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
export const LISTA_ALIMENTOS: Alimento[] = ALIMENTOS.map(([categoria, nome, kcal100g]) => ({
  id: `${categoria}:${nome}`,
  nome,
  categoria,
  kcal100g,
}));

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
  return { id: `plano:${nome}:${gramas}`, nome, categoria, kcal100g, gramas, refeicao };
}

/** Um alimento lido do PDF anexado usa a energia do item correspondente da lista. */
export function itemDeReferenciaPdf(r: AlimentoReferenciaPdf, lista: Alimento[] = LISTA_ALIMENTOS): ItemDoPlano | null {
  const nome = (r.nome || "").trim();
  const par = r.correspondente ? lista.find((a) => a.nome === r.correspondente) : undefined;
  if (!nome || !par) return null;
  const gramas = Number(r.quantidade_g);
  return {
    id: `pdf:${nome}:${par.id}`,
    nome,
    categoria: par.categoria,
    kcal100g: par.kcal100g,
    gramas: gramas > 0 ? gramas : null,
    refeicao: r.refeicao?.trim() || null,
  };
}

interface PlanoParaSubstituicao {
  refeicoes?: { nome?: string | null; ordem?: number | null; alimentos_plano?: AlimentoPlanoLinha[] | null }[] | null;
  alimentos_referencia?: AlimentoReferenciaPdf[] | null;
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
      const item = itemDeAlimentoPlano(a, r.nome || null);
      if (item) itens.push(item);
    }
  }
  for (const r of Array.isArray(plano.alimentos_referencia) ? plano.alimentos_referencia : []) {
    const item = itemDeReferenciaPdf(r);
    if (item) itens.push(item);
  }
  const vistos = new Set<string>();
  return itens.filter((i) => {
    const chave = `${semAcento(i.nome)}|${Math.round(i.gramas ?? 0)}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
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
