// Alimentos que aparecem nos planos e não estavam na planilha de substituições.
// Energia em kcal por 100 g (ou 100 ml), com a fonte de cada valor:
//   TACO: Tabela Brasileira de Composição de Alimentos, 4ª ed. (NEPA/Unicamp)
//   USDA: FoodData Central, SR Legacy (código FDC entre parênteses)
//   Rótulo: tabela nutricional do fabricante, convertida para 100 g
// Marca no nome quando o valor é de rótulo: outras marcas podem variar.
import type { CategoriaSubstituicao } from "./substituicoes";

export interface AlimentoExtra {
  categoria: CategoriaSubstituicao;
  nome: string;
  kcal100g: number;
  fonte: string;
}

export const ALIMENTOS_EXTRAS: readonly AlimentoExtra[] = [
  // Carboidratos
  { categoria: "carboidrato", nome: "Morango, cru", kcal100g: 30.1, fonte: "TACO 239" },
  { categoria: "carboidrato", nome: "Melão, cru", kcal100g: 29.4, fonte: "TACO 236" },
  { categoria: "carboidrato", nome: "Melancia, crua", kcal100g: 32.6, fonte: "TACO 235" },
  { categoria: "carboidrato", nome: "Laranja, pêra, suco natural", kcal100g: 32.7, fonte: "TACO 215" },
  { categoria: "carboidrato", nome: "Iogurte, natural, desnatado", kcal100g: 41.5, fonte: "TACO 449" },
  { categoria: "carboidrato", nome: "Pão, trigo, forma, integral", kcal100g: 253.2, fonte: "TACO 52" },
  { categoria: "carboidrato", nome: "Farelo de aveia", kcal100g: 246, fonte: "USDA 168872" },
  { categoria: "carboidrato", nome: "Macarrão, trigo, cozido", kcal100g: 158, fonte: "USDA 168928" },
  { categoria: "carboidrato", nome: "Leite, vaca, desnatado", kcal100g: 35, fonte: "USDA 173432" },
  { categoria: "carboidrato", nome: "Tapioca, goma hidratada (Yoki)", kcal100g: 225, fonte: "Rótulo Yoki: 148 kcal em 66 g" },
  { categoria: "carboidrato", nome: "Rap10 integral (Pullman)", kcal100g: 272.5, fonte: "Rótulo Pullman: 109 kcal em 40 g" },
  { categoria: "carboidrato", nome: "Suco de uva integral (Aurora)", kcal100g: 63, fonte: "Rótulo Aurora: 126 kcal em 200 ml" },
  { categoria: "carboidrato", nome: "Iogurte grego tradicional (Nestlé)", kcal100g: 114, fonte: "Rótulo Nestlé" },
  // Granola divide energia entre gordura (45%) e carboidrato (43%); fica em
  // carboidrato porque é assim que ela entra no plano, no lugar da aveia.
  { categoria: "carboidrato", nome: "Granola sem açúcar (Mãe Terra Zero Açúcar)", kcal100g: 402.5, fonte: "Rótulo Mãe Terra" },

  // Proteínas
  { categoria: "proteina", nome: "Queijo cottage", kcal100g: 98, fonte: "USDA 172179" },
  { categoria: "proteina", nome: "Peito de peru defumado (Sadia)", kcal100g: 110, fonte: "Rótulo Sadia: 44 kcal em 40 g" },

  // Gorduras (a maior parte da energia vem da gordura)
  { categoria: "gordura", nome: "Iogurte, natural", kcal100g: 51.5, fonte: "TACO 448" },
  { categoria: "gordura", nome: "Leite, vaca, integral", kcal100g: 61, fonte: "USDA 171265" },
  { categoria: "gordura", nome: "Açaí, polpa congelada, sem açúcar (zero)", kcal100g: 58, fonte: "TACO 168" },
  { categoria: "gordura", nome: "Chia, semente", kcal100g: 486, fonte: "USDA 170554" },
  { categoria: "gordura", nome: "Pasta de amendoim integral", kcal100g: 598, fonte: "USDA 172470" },
  { categoria: "gordura", nome: "Requeijão light (Vigor)", kcal100g: 140, fonte: "Rótulo Vigor: 42 kcal em 30 g" },
];
