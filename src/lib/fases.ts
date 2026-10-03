/**
 * Fases do Método R.E.A.L.: Rastreio, Estratégia, Ajuste e Lifestyle.
 *
 * O banco guarda os ids antigos (enum fase_real: rotina, estrategia,
 * autonomia, liberdade) e a tela mostra os nomes oficiais. Trocar só o
 * rótulo evita mexer no enum, nas conteudos_real já gravadas e nas fichas.
 * Todo lugar que mostra a fase usa este arquivo.
 */
export type FaseId = "rotina" | "estrategia" | "autonomia" | "liberdade";

export interface FaseReal {
  id: FaseId;
  letra: string;
  rotulo: string;
  /** Frase curta, a mesma do site (página Método R.E.A.L.). */
  desc: string;
  cor: string;
}

export const FASES_REAL: FaseReal[] = [
  { id: "rotina", letra: "R", rotulo: "Rastreio", desc: "Entender rotina, fome, gatilhos e história alimentar", cor: "#3B82F6" },
  { id: "estrategia", letra: "E", rotulo: "Estratégia", desc: "Prioridades simples e um plano flexível para a vida real", cor: "#8B5CF6" },
  { id: "autonomia", letra: "A", rotulo: "Ajuste", desc: "Ajustes pelo que funcionou e pelo que travou", cor: "#F59E0B" },
  { id: "liberdade", letra: "L", rotulo: "Lifestyle", desc: "Hábitos sustentáveis, autonomia e leveza", cor: "#22C55E" },
];

/** Aceita também os nomes oficiais, caso algum dado venha com eles. */
const SINONIMOS: Record<string, FaseId> = {
  rastreio: "rotina",
  ajuste: "autonomia",
  lifestyle: "liberdade",
};

export function faseId(valor: string | null | undefined): FaseId {
  const v = (valor || "").toLowerCase();
  if (FASES_REAL.some((f) => f.id === v)) return v as FaseId;
  return SINONIMOS[v] ?? "rotina";
}

export function fase(valor: string | null | undefined): FaseReal {
  const id = faseId(valor);
  return FASES_REAL.find((f) => f.id === id)!;
}

export function rotuloFase(valor: string | null | undefined): string {
  return fase(valor).rotulo;
}

/** Fase "geral" das conteudos_real: biblioteca para todos, fora da Jornada. */
export const FASE_GERAL = "geral";

/** Abas do portal que recebem a biblioteca geral, pela tag "aba:<id>". */
export const ABAS_BIBLIOTECA = [
  { id: "suplementos", rotulo: "Suplementos" },
  { id: "materiais", rotulo: "Materiais" },
  { id: "orientacoes", rotulo: "Orientações" },
  { id: "receitas", rotulo: "Receitas" },
] as const;

export type AbaBiblioteca = (typeof ABAS_BIBLIOTECA)[number]["id"];

export const tagDaAba = (aba: AbaBiblioteca) => `aba:${aba}`;

export function abaDasTags(tags: string[] | null | undefined): AbaBiblioteca | null {
  const t = (tags || []).find((x) => x.startsWith("aba:"));
  const id = t?.slice(4);
  return ABAS_BIBLIOTECA.some((a) => a.id === id) ? (id as AbaBiblioteca) : null;
}

/** Bucket privado dos arquivos da biblioteca (migration 20261003120000). */
export const BUCKET_CONTEUDOS = "conteudos-real";
