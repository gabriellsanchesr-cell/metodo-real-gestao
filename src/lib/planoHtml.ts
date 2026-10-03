/**
 * Plano alimentar em HTML, gerado pela engine do consultório
 * (agents/plano_builder.py). O HTML traz os próprios dados em
 * <script type="application/json" id="plano-dados">: totais reais e a lista
 * de alimentos. Por isso, diferente do PDF, aqui não há leitura por IA: o que
 * o portal grava é exatamente o que a engine calculou.
 */
import { LISTA_ALIMENTOS, type AlimentoReferenciaPdf } from "@/lib/substituicoes";
import { TACO_ENGINE } from "@/lib/tacoEngine";

export interface OpcaoPlanoHtml {
  letra: string;
  descricao: string;
  livre: boolean;
  kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  fibra_g: number;
}

export interface PlanoHtmlDia {
  chave: string;
  titulo: string;
  kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  fibra_g: number;
  refeicoes: { nome: string; hora: string; kcal: number; opcoes: OpcaoPlanoHtml[] }[];
}

export interface DadosPlanoHtml {
  formato: "plano-real";
  versao: number;
  paciente: string;
  emissao_iso: string | null;
  planos: PlanoHtmlDia[];
  /**
   * Versão 1: só alimentos simples, com a chave TACO. Versão 2: também as
   * receitas (chave null) e os números por 100 g de cada item.
   */
  alimentos: {
    nome: string;
    quantidade_g: number;
    refeicao: string;
    chave: string | null;
    kcal_100g?: number;
    proteina_100g?: number;
    carboidrato_100g?: number;
    gordura_100g?: number;
  }[];
}

/** O arquivo do plano é HTML? (o tipo do plano continua "anexo"; o formato vem da extensão). */
export function ehPlanoHtml(path: string | null | undefined): boolean {
  return !!path && /\.html?$/i.test(path);
}

/** Lê o bloco de dados do HTML. Null quando o arquivo não veio da engine. */
export function extrairDadosPlanoHtml(html: string): DadosPlanoHtml | null {
  const m = /<script[^>]*\bid=["']plano-dados["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m) return null;
  try {
    const dados = JSON.parse(m[1]);
    if (dados?.formato !== "plano-real" || !Array.isArray(dados.planos) || dados.planos.length === 0) return null;
    return dados as DadosPlanoHtml;
  } catch {
    return null;
  }
}

/**
 * Totais do resumo do portal. Com mais de uma rotina no mesmo arquivo
 * (semana e fim de semana), vale a primeira, que é a do dia a dia.
 */
export function totaisDoPlanoHtml(dados: DadosPlanoHtml) {
  const p = dados.planos[0];
  return {
    kcal: p.kcal,
    proteina_g: p.proteina_g,
    carboidrato_g: p.carboidrato_g,
    gordura_g: p.gordura_g,
    fibra_g: p.fibra_g,
  };
}

/**
 * Chave da base TACO da engine -> nome na lista da calculadora. Só entra o
 * par em que a energia por 100 g bate; o resto cai no casamento por nome
 * (sinônimos) ou fica de fora, como já acontece com o PDF.
 */
export const CHAVE_ENGINE_PARA_LISTA: Record<string, string> = {
  arroz: "Arroz cozido",
  feijao: "Feijão, cozido",
  feijao_preto: "Feijão, cozido",
  frango: "Frango, peito, sem pele, pronto",
  patinho: "Carne, bovina, patinho, sem gordura, grelhado",
  ovo: "Ovo, inteiro, cozido",
  clara: "Ovo, de galinha, clara, cozida",
  batata: "Batata, inglesa, cozida",
  batata_doce: "Batata, doce, cozida",
  mandioca: "Mandioca, cozida",
  aveia: "Aveia, flocos, crua",
  banana: "Banana",
  tapioca: "Tapioca, goma hidratada (Yoki)",
  cuscuz: "Cuscuz, de milho, cozido com sal",
  macarrao: "Macarrão, trigo, cozido",
  lentilha: "Lentilha, cozida",
  mussarela: "Queijo, mozarela",
  queijo_minas: "Queijo, minas, frescal",
  cottage: "Queijo cottage",
  requeijao: "Queijo, requeijão, cremoso",
  requeijao_light: "Requeijão light (Vigor)",
  iog_desnatado: "Iogurte, natural, desnatado",
  iog_grego: "Iogurte grego tradicional (Nestlé)",
  leite: "Leite, vaca, integral",
  leite_desn: "Leite, vaca, desnatado",
  whey: "Whey protein 80%",
  peito_peru: "Peito de peru defumado (Sadia)",
  presunto: "Presunto, sem capa de gordura",
  azeite: "Azeite",
  pasta_amendoim: "Pasta de amendoim integral",
  castanha_caju: "Castanha-de-caju",
  chia: "Chia, semente",
  granola: "Granola sem açúcar (Mãe Terra Zero Açúcar)",
  morango: "Morango, cru",
  manga: "Manga, crua",
  melancia: "Melancia, crua",
  laranja: "Laranja",
  uva: "Uva",
  kiwi: "Kiwi, cru",
  poncan: "Mexerica crua",
  abacaxi: "Abacaxi, cru",
};

const NOMES_DA_LISTA = new Set(LISTA_ALIMENTOS.map((a) => a.nome));

/**
 * Alimentos do plano no formato de planos_alimentares.alimentos_referencia.
 * Leva os números por 100 g do próprio plano (versão 2) ou, no arquivo
 * antigo, da tabela da engine pela chave. Com eles o alimento entra na
 * calculadora mesmo sem par na lista: antes maçã, pão integral, farelo de
 * aveia, arroz integral e as receitas ficavam de fora.
 */
export function alimentosReferenciaDoPlanoHtml(dados: DadosPlanoHtml): AlimentoReferenciaPdf[] {
  return (dados.alimentos || []).map((a) => {
    const par = a.chave ? CHAVE_ENGINE_PARA_LISTA[a.chave] : undefined;
    const taco = a.chave ? TACO_ENGINE[a.chave] : undefined;
    const kcal = a.kcal_100g ?? taco?.[0];
    return {
      nome: a.nome,
      quantidade_g: a.quantidade_g,
      refeicao: a.refeicao,
      correspondente: par && NOMES_DA_LISTA.has(par) ? par : null,
      ...(kcal != null ? {
        kcal_100g: kcal,
        proteina_100g: a.proteina_100g ?? taco?.[1] ?? 0,
        carboidrato_100g: a.carboidrato_100g ?? taco?.[2] ?? 0,
        gordura_100g: a.gordura_100g ?? taco?.[3] ?? 0,
      } : {}),
    };
  });
}
