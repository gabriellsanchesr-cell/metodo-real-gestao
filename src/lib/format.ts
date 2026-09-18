/**
 * Formatação de valores exibidos ao usuário.
 * Centralizado para não haver duas regras de moeda convivendo na aplicação.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Moeda em real, sempre com duas casas decimais. */
export function formatBRL(valor: number | string | null | undefined): string {
  const n = Number(valor);
  return BRL.format(Number.isFinite(n) ? n : 0);
}
