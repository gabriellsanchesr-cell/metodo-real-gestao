/**
 * Formulários clínicos montados a partir de uma definição (seções e campos).
 * Usado pela anamnese (modelo do Gabriel) e pelo retorno. As respostas ficam
 * num jsonb, { idDoCampo: valor }, e a mesma definição serve para preencher,
 * para ler e para virar texto corrido.
 */

export type TipoCampo =
  | "texto" // uma linha
  | "textoLongo" // várias linhas
  | "nota" // 1 a 5, com as pontas da escala
  | "opcoes" // uma opção entre várias
  | "numero"
  | "hora"
  | "simnao";

export interface Campo {
  id: string;
  rotulo: string;
  tipo: TipoCampo;
  dica?: string;
  opcoes?: string[];
  unidade?: string;
  /** Pontas da escala de 1 a 5 (nota 5 é sempre o lado bom). */
  ruim?: string;
  bom?: string;
  /** Ocupa a linha inteira no computador. */
  largo?: boolean;
}

export interface Secao {
  id: string;
  titulo: string;
  descricao?: string;
  campos: Campo[];
}

export type Respostas = Record<string, string | number | boolean | null | undefined>;

export function vazio(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** Valor para exibir ("Sim", "4/5", "2 garrafas"...). */
export function valorLegivel(c: Campo, v: unknown): string {
  if (vazio(v)) return "";
  if (c.tipo === "simnao") return v === true || v === "sim" ? "Sim" : "Não";
  if (c.tipo === "nota") return `${v}/5`;
  if (c.tipo === "numero" && c.unidade) return `${String(v).replace(".", ",")} ${c.unidade}`;
  return String(v).trim();
}

/** Quantos campos foram respondidos, para mostrar o progresso. */
export function progresso(secoes: Secao[], r: Respostas): { feitos: number; total: number } {
  const campos = secoes.flatMap((s) => s.campos);
  return { feitos: campos.filter((c) => !vazio(r[c.id])).length, total: campos.length };
}

/** Texto corrido, uma seção por bloco, só com o que foi respondido. */
export function respostasEmTexto(secoes: Secao[], r: Respostas): string {
  return secoes
    .map((s) => {
      const linhas = s.campos.filter((c) => !vazio(r[c.id])).map((c) => `${c.rotulo}: ${valorLegivel(c, r[c.id])}`);
      return linhas.length ? `${s.titulo.toUpperCase()}\n${linhas.join("\n")}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/** Notas de 1 a 5 que ficaram em 1 ou 2: o que pede atenção na leitura. */
export function notasBaixas(secoes: Secao[], r: Respostas): { secao: string; campo: Campo; nota: number }[] {
  const out: { secao: string; campo: Campo; nota: number }[] = [];
  for (const s of secoes) {
    for (const c of s.campos) {
      const n = Number(r[c.id]);
      if (c.tipo === "nota" && !vazio(r[c.id]) && n <= 2) out.push({ secao: s.titulo, campo: c, nota: n });
    }
  }
  return out;
}
