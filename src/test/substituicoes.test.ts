import { describe, it, expect } from "vitest";
import {
  LISTA_ALIMENTOS, gramasPara, kcalEm, equivalente, formatarGramas, buscarAlimentos, itensDoPlano,
  correspondenciaConfiavel,
} from "@/lib/substituicoes";

const achar = (nome: string) => {
  const a = LISTA_ALIMENTOS.find((x) => x.nome === nome);
  if (!a) throw new Error(`alimento não encontrado: ${nome}`);
  return a;
};

describe("dados", () => {
  it("tem os 269 alimentos da planilha, todos com energia válida", () => {
    expect(LISTA_ALIMENTOS).toHaveLength(269);
    for (const a of LISTA_ALIMENTOS) {
      expect(a.kcal100g).toBeGreaterThan(0);
      // Nada passa de 900 kcal/100 g (gordura pura é 884).
      expect(a.kcal100g).toBeLessThanOrEqual(900);
    }
  });

  it("ids são únicos mesmo com a paçoca em duas categorias", () => {
    expect(new Set(LISTA_ALIMENTOS.map((a) => a.id)).size).toBe(LISTA_ALIMENTOS.length);
    expect(LISTA_ALIMENTOS.filter((a) => a.nome === "Paçoca, amendoim")).toHaveLength(2);
  });

  it("confere com a TACO em alimentos de referência", () => {
    expect(achar("Arroz cozido").kcal100g).toBeCloseTo(128, 0);
    expect(achar("Batata, doce, cozida").kcal100g).toBeCloseTo(77, 0);
    expect(achar("Azeite").kcal100g).toBe(884);
    expect(achar("Frango, peito, sem pele, cru").kcal100g).toBeCloseTo(119, 0);
  });

  it("nomes corrigidos da planilha", () => {
    expect(() => achar("Carne, bovina, filé mignon, sem gordura, cru")).not.toThrow();
    expect(() => achar("Amendoim, torrado, salgado")).not.toThrow();
    expect(LISTA_ALIMENTOS.some((a) => a.nome.includes("/10minutos") || a.nome.endsWith(","))).toBe(false);
  });
});

describe("contas", () => {
  it("gramasPara e kcalEm são inversas", () => {
    expect(gramasPara(884, 100)).toBeCloseTo(11.31, 2);
    expect(kcalEm(128, 100)).toBe(128);
    expect(kcalEm(77, gramasPara(77, 250))).toBeCloseTo(250, 6);
  });

  it("100 g de arroz cozido equivalem a ~166 g de batata-doce cozida", () => {
    const g = equivalente(achar("Arroz cozido"), 100, achar("Batata, doce, cozida"));
    expect(g).toBeGreaterThan(160);
    expect(g).toBeLessThan(172);
  });

  it("entrada inválida devolve zero em vez de NaN ou Infinity", () => {
    expect(gramasPara(0, 100)).toBe(0);
    expect(gramasPara(100, NaN)).toBe(0);
    expect(kcalEm(100, -5)).toBe(0);
  });
});

describe("formatarGramas", () => {
  it("inteiro a partir de 10 g, meio grama abaixo disso", () => {
    expect(formatarGramas(165.6)).toBe("166 g");
    expect(formatarGramas(11.31)).toBe("11 g");
    expect(formatarGramas(5.66)).toBe("5,5 g");
    expect(formatarGramas(0)).toBe("0 g");
  });
});

describe("buscarAlimentos", () => {
  it("ignora acento, caixa e ordem das palavras", () => {
    const r = buscarAlimentos(LISTA_ALIMENTOS, "ACAI");
    expect(r.map((a) => a.nome)).toContain("Açaí, polpa, com xarope de guaraná e glucose");
    expect(buscarAlimentos(LISTA_ALIMENTOS, "cru frango peito").map((a) => a.nome))
      .toContain("Frango, peito, sem pele, cru");
  });
});

describe("itensDoPlano", () => {
  const plano = {
    refeicoes: [
      {
        nome: "Almoço", ordem: 2,
        alimentos_plano: [
          { nome_alimento: "arroz branco cozido", quantidade: 120, energia_kcal: 154, proteina_g: 3, carboidrato_g: 34, lipidio_g: 0.2 },
          { nome_alimento: "frango grelhado", quantidade: 100, energia_kcal: 159, proteina_g: 32, carboidrato_g: 0, lipidio_g: 2.5 },
          { nome_alimento: "alface", quantidade: 50, energia_kcal: 5, proteina_g: 0.5, carboidrato_g: 1, lipidio_g: 0.1 },
          { nome_alimento: "azeite", quantidade: 5, energia_kcal: 44, proteina_g: 0, carboidrato_g: 0, lipidio_g: 5 },
          { nome_alimento: "feijão", quantidade: 80, energia_kcal: null },
        ],
      },
      {
        nome: "Café da manhã", ordem: 1,
        alimentos_plano: [
          { nome_alimento: "Resumo nutricional do PDF", quantidade: 1, energia_kcal: 1600, proteina_g: 100, carboidrato_g: 180, lipidio_g: 50 },
          { nome_alimento: "Arroz branco cozido", quantidade: 120, energia_kcal: 154, proteina_g: 3, carboidrato_g: 34, lipidio_g: 0.2 },
        ],
      },
    ],
  };

  it("classifica pelo macro dominante, na ordem das refeições, sem duplicar", () => {
    const itens = itensDoPlano(plano);
    expect(itens.map((i) => [i.nome, i.categoria, i.refeicao])).toEqual([
      ["Arroz branco cozido", "carboidrato", "Café da manhã"],
      ["frango grelhado", "proteina", "Almoço"],
      ["azeite", "gordura", "Almoço"],
    ]);
    expect(itens[0].kcal100g).toBeCloseTo(128.3, 1);
    expect(itens[0].gramas).toBe(120);
  });

  it("ignora a linha-resumo do PDF, folhas e itens sem energia", () => {
    const nomes = itensDoPlano(plano).map((i) => i.nome);
    expect(nomes).not.toContain("Resumo nutricional do PDF");
    expect(nomes).not.toContain("alface");
    expect(nomes).not.toContain("feijão");
  });

  it("usa a energia da lista para alimentos lidos do PDF anexado", () => {
    const itens = itensDoPlano({
      alimentos_referencia: [
        { nome: "pão francês", quantidade_g: 50, refeicao: "Café", correspondente: "Pão, trigo, soja ou milho, francês, integral ou sovado" },
        { nome: "whey", quantidade_g: null, correspondente: "Whey protein 80%" },
        { nome: "chá", quantidade_g: 200, correspondente: null },
        { nome: "inventado", quantidade_g: 10, correspondente: "Alimento que não existe" },
      ],
    });
    expect(itens.map((i) => [i.nome, i.categoria, i.gramas])).toEqual([
      ["pão francês", "carboidrato", 50],
      ["whey", "proteina", null],
    ]);
  });

  it("aceita plano vazio ou coluna com lixo", () => {
    expect(itensDoPlano(null)).toEqual([]);
    expect(itensDoPlano({ alimentos_referencia: "x" as never })).toEqual([]);
  });
});

describe("correspondenciaConfiavel", () => {
  // Casos reais da leitura do PDF de um plano anexado.
  it("recusa variações que mudam a energia", () => {
    expect(correspondenciaConfiavel("farelo de aveia", "Aveia, flocos, crua")).toBe(false);
    expect(correspondenciaConfiavel("iogurte natural desnatado", "Iogurte com sabor")).toBe(false);
    expect(correspondenciaConfiavel("requeijao light", "Queijo, requeijão, cremoso")).toBe(false);
    expect(correspondenciaConfiavel("pão de forma", "Pão, aveia, forma")).toBe(false);
    expect(correspondenciaConfiavel("batata inglesa cozida", "Batata, inglesa, frita")).toBe(false);
    expect(correspondenciaConfiavel("pasta de amendoim", "Paçoca, amendoim")).toBe(false);
    expect(correspondenciaConfiavel("semente de chia", "Linhaça, semente")).toBe(false);
    expect(correspondenciaConfiavel("molho de tomate", "Tomate, extrato")).toBe(false);
    expect(correspondenciaConfiavel("peito de peru", "Peru, assado")).toBe(false);
  });

  it("aceita o mesmo alimento", () => {
    expect(correspondenciaConfiavel("arroz", "Arroz cozido")).toBe(true);
    expect(correspondenciaConfiavel("batata doce cozida", "Batata, doce, cozida")).toBe(true);
    expect(correspondenciaConfiavel("ovos mexidos", "Ovo, inteiro, cozido")).toBe(true);
    expect(correspondenciaConfiavel("whey protein", "Whey protein 80%")).toBe(true);
    expect(correspondenciaConfiavel("pão francês", "Pão, trigo, soja ou milho, francês, integral ou sovado")).toBe(true);
  });

  it("itensDoPlano deixa de fora a ligação recusada", () => {
    const itens = itensDoPlano({
      alimentos_referencia: [
        { nome: "farelo de aveia", quantidade_g: 14, correspondente: "Aveia, flocos, crua" },
        { nome: "arroz", quantidade_g: 90, correspondente: "Arroz cozido" },
      ],
    });
    expect(itens.map((i) => i.nome)).toEqual(["arroz"]);
  });
});
