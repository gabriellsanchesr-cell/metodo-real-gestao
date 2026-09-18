import { describe, it, expect } from "vitest";
import {
  normalizarSexo, calcIdade, calcIMC, pesoIdeal, calcRCQ, calcCMB,
  calcComposicao, siri, calcTMB, calcMacros, classificarGordura, conferirCoerenciaMacros,
  type Protocolo,
} from "@/lib/antropometria";

describe("normalizarSexo", () => {
  it("aceita as grafias que existem no banco", () => {
    expect(normalizarSexo("M")).toBe("M");
    expect(normalizarSexo("masculino")).toBe("M");
    expect(normalizarSexo("Feminino")).toBe("F");
    expect(normalizarSexo("f")).toBe("F");
  });

  it("nao chuta masculino quando o dado falta", () => {
    // Era a origem de um erro silencioso: qualquer valor diferente de "F"
    // virava masculino, mudando a TMB em 166 kcal no Mifflin.
    expect(normalizarSexo(null)).toBeNull();
    expect(normalizarSexo("")).toBeNull();
    expect(normalizarSexo("outro")).toBeNull();
  });
});

describe("calcIdade", () => {
  it("devolve null sem data de nascimento, em vez de supor 30 anos", () => {
    expect(calcIdade(null)).toBeNull();
    expect(calcIdade("")).toBeNull();
    expect(calcIdade("nao-e-data")).toBeNull();
  });

  it("calcula a idade considerando o aniversario do ano corrente", () => {
    const hoje = new Date();
    const fez30 = new Date(hoje.getFullYear() - 30, hoje.getMonth(), hoje.getDate());
    expect(calcIdade(fez30.toISOString())).toBe(30);

    const fazAmanha = new Date(hoje.getFullYear() - 30, hoje.getMonth(), hoje.getDate() + 1);
    expect(calcIdade(fazAmanha.toISOString())).toBe(29);
  });
});

describe("calcIMC", () => {
  it("calcula e classifica pela OMS", () => {
    expect(calcIMC(70, 175).imc).toBeCloseTo(22.86, 2);
    expect(calcIMC(70, 175).classificacao).toBe("Normal");
    expect(calcIMC(50, 175).classificacao).toBe("Baixo peso");
    expect(calcIMC(80, 175).classificacao).toBe("Sobrepeso");
    expect(calcIMC(95, 175).classificacao).toBe("Obesidade I");
    expect(calcIMC(110, 175).classificacao).toBe("Obesidade II");
    expect(calcIMC(130, 175).classificacao).toBe("Obesidade III");
  });

  it("nao inventa resultado com dado faltando", () => {
    expect(calcIMC(null, 175).imc).toBeNull();
    expect(calcIMC(70, 0).imc).toBeNull();
  });

  it("espera altura em centimetros", () => {
    // Se alguém passar metros por engano o IMC estoura, e é melhor
    // que estoure de forma visível do que passar despercebido.
    expect(calcIMC(70, 1.75).imc).toBeGreaterThan(1000);
  });
});

describe("pesoIdeal", () => {
  it("usa a faixa de IMC 18,5 a 24,9", () => {
    expect(pesoIdeal(170)).toEqual({ min: 53.5, max: 72 });
  });
});

describe("calcRCQ", () => {
  it("aplica os cortes da OMS por sexo", () => {
    expect(calcRCQ(84, 100, "M").risco).toBe("Normal");
    expect(calcRCQ(92, 100, "M").risco).toBe("Elevado");
    expect(calcRCQ(86, 100, "F").risco).toBe("Elevado");
    expect(calcRCQ(82, 100, "F").risco).toBe("Moderado");
  });

  it("devolve a razao mas omite o risco quando o sexo e desconhecido", () => {
    const r = calcRCQ(90, 100, null);
    expect(r.rcq).toBe(0.9);
    expect(r.risco).toBeNull();
  });
});

describe("calcCMB", () => {
  it("converte a dobra de milimetros para centimetros", () => {
    // 30cm de braço com 20mm de tríceps: 30 - pi*2 = 23.72
    expect(calcCMB(30, 20)).toBeCloseTo(23.72, 2);
  });
});

describe("siri", () => {
  it("converte densidade em percentual de gordura", () => {
    expect(siri(1.05)).toBeCloseTo(21.43, 2);
    expect(siri(1.07)).toBeCloseTo(12.62, 2);
  });
});

// ─── O bug que motivou este módulo ───────────────────────────────────

describe("Petroski", () => {
  const dobrasF = {
    dobra_axilar_media: 8, dobra_suprailiaca: 8, dobra_coxa: 8, dobra_panturrilha: 6,
  }; // soma 30mm

  it("mulher com 30mm de dobras fica na faixa plausivel, nao em 43%", () => {
    const r = calcComposicao({
      protocolo: "petroski", sexo: "F", idade: 30,
      dobras: dobrasF, pesoKg: 60, alturaCm: 165,
    });
    expect(r.pctGordura).not.toBeNull();
    expect(r.pctGordura!).toBeGreaterThan(10);
    expect(r.pctGordura!).toBeLessThan(25);
  });

  it("responde ao aumento das dobras", () => {
    const base = { protocolo: "petroski" as Protocolo, sexo: "F" as const, idade: 30, pesoKg: 60, alturaCm: 165 };
    const magra = calcComposicao({ ...base, dobras: dobrasF });
    const gorda = calcComposicao({
      ...base,
      dobras: { dobra_axilar_media: 25, dobra_suprailiaca: 25, dobra_coxa: 25, dobra_panturrilha: 25 }, // 100mm
    });
    // A versão anterior era quase plana: 43,4% em 30mm contra 56,0% em 100mm.
    expect(gorda.pctGordura! - magra.pctGordura!).toBeGreaterThan(15);
  });

  it("exige peso e estatura no feminino", () => {
    const r = calcComposicao({
      protocolo: "petroski", sexo: "F", idade: 30, dobras: dobrasF,
    });
    expect(r.pctGordura).toBeNull();
    expect(r.faltando).toEqual(["peso", "altura"]);
  });

  it("mantem o masculino, que ja estava correto", () => {
    const r = calcComposicao({
      protocolo: "petroski", sexo: "M", idade: 30,
      dobras: { dobra_subescapular: 8, dobra_triceps: 8, dobra_suprailiaca: 8, dobra_panturrilha: 6 },
    });
    expect(r.pctGordura).toBeCloseTo(11.6, 1);
  });
});

describe("concordancia entre protocolos", () => {
  // Nenhum protocolo deve destoar grosseiramente dos outros para a mesma
  // pessoa. Foi assim que o Petroski feminino apareceu.
  it("mulher de 30 anos, dobras equivalentes, todos entre 10% e 35%", () => {
    const comum = { sexo: "F" as const, idade: 30, pesoKg: 60, alturaCm: 165 };
    const dobras = {
      dobra_triceps: 12, dobra_suprailiaca: 12, dobra_coxa: 16, dobra_subescapular: 12,
      dobra_axilar_media: 10, dobra_panturrilha: 10, dobra_abdominal: 14,
      dobra_peitoral: 10, dobra_biceps: 8,
    };
    const protocolos: Protocolo[] = ["pollock3", "pollock7", "petroski", "guedes", "durnin", "faulkner"];
    for (const protocolo of protocolos) {
      const r = calcComposicao({ ...comum, protocolo, dobras });
      expect(r.pctGordura, `${protocolo} devolveu ${r.pctGordura}`).not.toBeNull();
      expect(r.pctGordura!, `${protocolo} fora da faixa`).toBeGreaterThan(10);
      expect(r.pctGordura!, `${protocolo} fora da faixa`).toBeLessThan(35);
    }
  });
});

describe("calcComposicao: dados faltando", () => {
  it("avisa qual dobra falta em vez de somar zero", () => {
    const r = calcComposicao({
      protocolo: "pollock3", sexo: "F", idade: 30,
      dobras: { dobra_triceps: 12, dobra_suprailiaca: 0, dobra_coxa: 16 },
    });
    expect(r.pctGordura).toBeNull();
    expect(r.faltando).toContain("dobra_suprailiaca");
  });
});

describe("calcTMB", () => {
  const base = { pesoKg: 70, alturaCm: 175, idade: 30 } as const;

  it("Mifflin-St Jeor bate com a referencia", () => {
    expect(calcTMB({ ...base, sexo: "M", formula: "mifflin" })).toBeCloseTo(1648.75, 2);
    expect(calcTMB({ ...base, sexo: "F", formula: "mifflin" })).toBeCloseTo(1482.75, 2);
  });

  it("a diferenca entre sexos no Mifflin e de 166 kcal", () => {
    const m = calcTMB({ ...base, sexo: "M", formula: "mifflin" })!;
    const f = calcTMB({ ...base, sexo: "F", formula: "mifflin" })!;
    expect(m - f).toBeCloseTo(166, 5);
  });

  it("Harris-Benedict revisada bate com a referencia", () => {
    expect(calcTMB({ ...base, sexo: "M", formula: "harris_revisada" })).toBeCloseTo(1695.67, 1);
  });

  it("FAO/OMS muda de faixa aos 30 anos", () => {
    const aos29 = calcTMB({ ...base, idade: 29, sexo: "M", formula: "fao_oms" })!;
    const aos30 = calcTMB({ ...base, idade: 30, sexo: "M", formula: "fao_oms" })!;
    expect(aos29).toBeCloseTo(15.3 * 70 + 679, 5);
    expect(aos30).toBeCloseTo(11.6 * 70 + 879, 5);
  });

  it("Cunningham sem massa magra devolve null em vez de numero errado", () => {
    expect(calcTMB({ ...base, sexo: "M", formula: "cunningham" })).toBeNull();
    expect(calcTMB({ ...base, sexo: "M", formula: "cunningham", mlgKg: 60 })).toBe(1820);
  });

  it("Tinsley escolhe a equacao pela variavel disponivel, nao pelo sexo", () => {
    // Antes, o feminino usava a equação de massa livre de gordura aplicada
    // ao peso corporal, o que não é uma variante por sexo.
    const homemSemMlg = calcTMB({ ...base, sexo: "M", formula: "tinsley" });
    const mulherSemMlg = calcTMB({ ...base, sexo: "F", formula: "tinsley" });
    expect(homemSemMlg).toBe(mulherSemMlg);
    expect(homemSemMlg).toBeCloseTo(24.8 * 70 + 10, 5);

    const comMlg = calcTMB({ ...base, sexo: "F", formula: "tinsley", mlgKg: 50 });
    expect(comMlg).toBeCloseTo(25.9 * 50 - 284, 5);
  });

  it("todas as formulas devolvem valor fisiologicamente possivel", () => {
    const formulas = ["harris_benedict", "harris_revisada", "mifflin", "fao_oms", "owen", "tinsley"] as const;
    for (const formula of formulas) {
      for (const sexo of ["M", "F"] as const) {
        const tmb = calcTMB({ ...base, sexo, formula })!;
        expect(tmb, `${formula}/${sexo} devolveu ${tmb}`).toBeGreaterThan(1000);
        expect(tmb, `${formula}/${sexo} devolveu ${tmb}`).toBeLessThan(2600);
      }
    }
  });
});

describe("calcMacros", () => {
  it("distribui por g/kg", () => {
    const r = calcMacros({ metaKcal: 2000, pesoKg: 70, proteinaModo: "gkg", proteinaValor: 1.8, carboidratoPct: 50 });
    expect(r.proteina.g).toBe(126);
    expect(r.proteina.kcal).toBe(504);
    expect(r.carboidrato.kcal).toBe(1000);
    expect(r.valido).toBe(true);
  });

  it("as tres fracoes somam o total de calorias", () => {
    const r = calcMacros({ metaKcal: 2000, pesoKg: 70, proteinaModo: "pct", proteinaValor: 30, carboidratoPct: 45 });
    expect(r.proteina.kcal + r.carboidrato.kcal + r.gordura.kcal).toBeCloseTo(2000, 0);
  });

  it("reprova proteina e carboidrato somando mais de 100%", () => {
    // Antes isso passava como válido e gravava gordura negativa no banco.
    const r = calcMacros({ metaKcal: 2000, pesoKg: 70, proteinaModo: "pct", proteinaValor: 40, carboidratoPct: 80 });
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("100%");
    expect(r.gordura.g).toBeLessThan(0);
  });

  it("avisa quando a gordura fica baixa demais", () => {
    const r = calcMacros({ metaKcal: 2000, pesoKg: 70, proteinaModo: "pct", proteinaValor: 35, carboidratoPct: 55 });
    expect(r.valido).toBe(true);
    expect(r.erro).toContain("20%");
  });
});

describe("classificarGordura", () => {
  it("usa faixas distintas por sexo", () => {
    expect(classificarGordura(15, "M")).toBe("Bom");
    expect(classificarGordura(13, "F")).toBe("Muito baixo");
    expect(classificarGordura(15, "F")).toBe("Excelente");
    expect(classificarGordura(22, "F")).toBe("Bom");
  });

  it("nao classifica sem sexo", () => {
    expect(classificarGordura(20, null)).toBeNull();
  });
});

describe("conferirCoerenciaMacros", () => {
  it("aceita plano cujos macros batem com a caloria", () => {
    // 150*4 + 200*4 + 60*9 = 1940
    const r = conferirCoerenciaMacros({ kcal: 1940, proteina_g: 150, carboidrato_g: 200, gordura_g: 60 });
    expect(r.coerente).toBe(true);
    expect(r.kcalCalculado).toBe(1940);
  });

  it("tolera o arredondamento normal de um plano", () => {
    const r = conferirCoerenciaMacros({ kcal: 2000, proteina_g: 150, carboidrato_g: 200, gordura_g: 60 });
    expect(r.coerente).toBe(true);
  });

  it("reprova um digito lido errado pela IA", () => {
    // carboidrato lido como 2000 em vez de 200
    const r = conferirCoerenciaMacros({ kcal: 1940, proteina_g: 150, carboidrato_g: 2000, gordura_g: 60 });
    expect(r.coerente).toBe(false);
    expect(r.mensagem).toContain("kcal");
    expect(r.divergenciaPct!).toBeGreaterThan(100);
  });

  it("nao opina quando falta algum dos quatro valores", () => {
    const r = conferirCoerenciaMacros({ kcal: 2000, proteina_g: null, carboidrato_g: 200, gordura_g: 60 });
    expect(r.coerente).toBe(true);
    expect(r.mensagem).toBeNull();
  });

  it("reprova caloria zerada com macros preenchidos", () => {
    const r = conferirCoerenciaMacros({ kcal: 0, proteina_g: 150, carboidrato_g: 200, gordura_g: 60 });
    expect(r.coerente).toBe(false);
  });
});
