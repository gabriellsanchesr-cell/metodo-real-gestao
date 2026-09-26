import { describe, it, expect } from "vitest";
import {
  LISTA_ALIMENTOS, gramasPara, kcalEm, equivalente, formatarGramas, buscarAlimentos, itensDoPlano,
  correspondenciaConfiavel, agruparDoPlano, refeicoesDoPlano,
} from "@/lib/substituicoes";

const achar = (nome: string) => {
  const a = LISTA_ALIMENTOS.find((x) => x.nome === nome);
  if (!a) throw new Error(`alimento não encontrado: ${nome}`);
  return a;
};

describe("dados", () => {
  it("tem os 269 alimentos da planilha e os 22 extras, todos com energia válida", () => {
    expect(LISTA_ALIMENTOS).toHaveLength(291);
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

describe("alimentos extras", () => {
  it("nomes novos não colidem com a planilha", () => {
    expect(new Set(LISTA_ALIMENTOS.map((a) => a.id)).size).toBe(LISTA_ALIMENTOS.length);
  });

  // O nome precisa passar pela trava das variações, senão a leitura do PDF
  // liga o alimento certo e a tela recusa.
  it("casam com o que os PDFs dos planos escrevem", () => {
    const pares: [string, string][] = [
      ["iogurte natural desnatado", "Iogurte, natural, desnatado"],
      ["requeijao light", "Requeijão light (Vigor)"],
      ["granola sem açúcar", "Granola sem açúcar (Mãe Terra Zero Açúcar)"],
      ["farelo de aveia", "Farelo de aveia"],
      ["pasta de amendoim integral", "Pasta de amendoim integral"],
      ["acai zero acucar", "Açaí, polpa congelada, sem açúcar (zero)"],
      ["suco de laranja natural", "Laranja, pêra, suco natural"],
      ["suco de uva integral", "Suco de uva integral (Aurora)"],
      ["pão de forma integral", "Pão, trigo, forma, integral"],
      ["peito de peru", "Peito de peru defumado (Sadia)"],
      ["leite integral", "Leite, vaca, integral"],
      ["rap10 integral", "Rap10 integral (Pullman)"],
    ];
    for (const [pdf, lista] of pares) {
      expect(LISTA_ALIMENTOS.some((a) => a.nome === lista), lista).toBe(true);
      expect(correspondenciaConfiavel(pdf, lista), `${pdf} -> ${lista}`).toBe(true);
    }
    // E continuam barrando a variação errada.
    expect(correspondenciaConfiavel("leite desnatado", "Leite, vaca, integral")).toBe(false);
    expect(correspondenciaConfiavel("iogurte natural desnatado", "Iogurte, natural")).toBe(false);
  });

  it("ignora observação entre parênteses", () => {
    expect(correspondenciaConfiavel("leite desnatado (não usar integral)", "Leite, vaca, desnatado")).toBe(true);
  });

  it("básicos sem par da IA ganham par fixo; combinações continuam sem par", () => {
    const itens = itensDoPlano({
      alimentos_referencia: ["frango grelhado", "filé de frango grelhado", "ovos mexidos", "patinho moido refogado",
        "carne moída magra", "tapioca (goma)", "frango ou carne magra", "pate de frango (frango desfiado + requeijao light)"]
        .map((nome) => ({ nome, quantidade_g: 100, refeicao: "Almoço", correspondente: null })),
    });
    expect(itens.map((i) => i.nome)).toEqual([
      "frango grelhado", "filé de frango grelhado", "ovos mexidos", "patinho moido refogado", "carne moída magra", "tapioca (goma)",
    ]);
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

  it("classifica pelo macro dominante, na ordem das refeições", () => {
    const itens = itensDoPlano(plano);
    expect(itens.map((i) => [i.nome, i.categoria, i.refeicao])).toEqual([
      ["Arroz branco cozido", "carboidrato", "Café da manhã"],
      ["arroz branco cozido", "carboidrato", "Almoço"],
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

  it("não repete o mesmo alimento na mesma refeição (opções A/B)", () => {
    const linha = { nome_alimento: "arroz", quantidade: 100, energia_kcal: 128, proteina_g: 2.5, carboidrato_g: 28, lipidio_g: 0.2 };
    const itens = itensDoPlano({ refeicoes: [{ nome: "Almoço", alimentos_plano: [linha, linha] }] });
    expect(itens).toHaveLength(1);
  });

  it("ids distintos para o mesmo alimento em quantidades ou refeições diferentes", () => {
    const itens = itensDoPlano({
      alimentos_referencia: [
        { nome: "Banana nanica", quantidade_g: 65, refeicao: "Pré-treino", correspondente: "Banana" },
        { nome: "Banana nanica", quantidade_g: 90, refeicao: "Café da manhã", correspondente: "Banana" },
        { nome: "Banana nanica", quantidade_g: 65, refeicao: "Café da manhã", correspondente: "Banana" },
      ],
    });
    expect(new Set(itens.map((i) => i.id)).size).toBe(3);
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

describe("agruparDoPlano", () => {
  const ref = (nome: string, g: number, refeicao: string, correspondente: string) =>
    ({ nome, quantidade_g: g, refeicao, correspondente });
  // Plano real que mostrava "Mel" e "Arroz" repetidos na tela.
  const itens = itensDoPlano({
    alimentos_referencia: [
      ref("Banana nanica", 65, "Pré-treino", "Banana"),
      ref("Mel", 20, "Café da manhã", "Mel, de abelha"),
      ref("Arroz branco cozido", 300, "Almoço", "Arroz cozido"),
      ref("Arroz branco cozido", 300, "Jantar", "Arroz cozido"),
      ref("Banana nanica", 90, "Café da manhã", "Banana"),
    ],
  });

  it("sem refeição escolhida, um cartão por alimento com as refeições juntas", () => {
    const g = agruparDoPlano(itens, "carboidrato", null);
    expect(g.map((x) => [x.item.nome, x.refeicoes, x.gramasVariam])).toEqual([
      ["Banana nanica", ["Pré-treino", "Café da manhã"], true],
      ["Mel", ["Café da manhã"], false],
      ["Arroz branco cozido", ["Almoço", "Jantar"], false],
    ]);
  });

  it("com refeição escolhida, só os alimentos dela", () => {
    const g = agruparDoPlano(itens, "carboidrato", "Café da manhã");
    expect(g.map((x) => [x.item.nome, x.item.gramas])).toEqual([["Mel", 20], ["Banana nanica", 90]]);
  });

  it("lista as refeições na ordem do plano", () => {
    expect(refeicoesDoPlano(itens)).toEqual(["Pré-treino", "Café da manhã", "Almoço", "Jantar"]);
  });
});
