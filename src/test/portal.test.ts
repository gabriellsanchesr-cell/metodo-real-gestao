import { describe, it, expect } from "vitest";
import { hojeLocal, sequenciaDeDias, pesoAtual, rotuloFase, proximaRefeicao } from "@/lib/portal";

// Datas locais: new Date(ano, mês, dia, hora) usa o fuso da máquina, como o celular da paciente.
const em = (d: number, h = 12, m = 0) => new Date(2026, 8, d, h, m);

describe("hojeLocal", () => {
  it("jantar às 22h30 continua no mesmo dia", () => {
    expect(hojeLocal(em(28, 22, 30))).toBe("2026-09-28");
    expect(hojeLocal(em(28, 23, 59))).toBe("2026-09-28");
  });
});

describe("sequenciaDeDias", () => {
  const dias = ["2026-09-27", "2026-09-26", "2026-09-25", "2026-09-23"];

  it("às 8h, sem registro hoje, conta até ontem", () => {
    expect(sequenciaDeDias(dias, em(28, 8))).toBe(3);
  });

  it("com registro hoje, conta hoje também", () => {
    expect(sequenciaDeDias(["2026-09-28", ...dias], em(28, 20))).toBe(4);
  });

  it("sem registro ontem nem hoje, zera", () => {
    expect(sequenciaDeDias(["2026-09-25"], em(28))).toBe(0);
    expect(sequenciaDeDias([], em(28))).toBe(0);
  });
});

describe("pesoAtual", () => {
  it("usa a avaliação mais recente e a variação desde o início", () => {
    expect(pesoAtual([{ peso: 68.4 }, { peso: 70 }], 71.6)).toEqual({ peso: 68.4, variacao: -3.2 });
  });

  it("pula avaliação sem peso", () => {
    expect(pesoAtual([{ peso: null }, { peso: 70 }], 72)).toEqual({ peso: 70, variacao: -2 });
  });

  it("sem avaliação fica o peso inicial, sem variação", () => {
    expect(pesoAtual([], 72)).toEqual({ peso: 72, variacao: null });
    expect(pesoAtual([], null)).toEqual({ peso: null, variacao: null });
  });

  it("sem peso inicial mostra o peso sem variação", () => {
    expect(pesoAtual([{ peso: 65 }], null)).toEqual({ peso: 65, variacao: null });
  });
});

describe("rotuloFase", () => {
  it("com acento", () => {
    expect(rotuloFase("estrategia")).toBe("Estratégia");
    expect(rotuloFase(null)).toBe("—");
  });
});

describe("proximaRefeicao", () => {
  const refs = [
    { nome_customizado: "Almoço", horario_sugerido: "12:00:00", ordem: 3 },
    { nome_customizado: "Café da manhã", horario_sugerido: "07:30", ordem: 1 },
    { nome_customizado: "Jantar", horario_sugerido: "19:30:00", ordem: 5 },
    { nome_customizado: "Ceia", horario_sugerido: null, ordem: 6 },
    { nome_customizado: "Resumo do PDF", horario_sugerido: "00:00", ordem: 0 },
  ];
  const nome = (r: ReturnType<typeof proximaRefeicao>) => r && [r.refeicao.nome_customizado, r.amanha];

  it("antes da primeira", () => expect(nome(proximaRefeicao(refs, em(28, 6)))).toEqual(["Café da manhã", false]));
  it("entre refeições", () => expect(nome(proximaRefeicao(refs, em(28, 15)))).toEqual(["Jantar", false]));
  it("até 30 min depois do horário ainda é a atual", () => expect(nome(proximaRefeicao(refs, em(28, 12, 25)))).toEqual(["Almoço", false]));
  it("depois da última, a primeira de amanhã", () => expect(nome(proximaRefeicao(refs, em(28, 22)))).toEqual(["Café da manhã", true]));
  it("sem horários no plano, nada", () => expect(proximaRefeicao([{ horario_sugerido: null }], em(28))).toBeNull());
});

describe("datas sem hora", () => {
  it("AAAA-MM-DD é o dia local, não UTC", async () => {
    const { dataLocal, isoLocal } = await import("@/lib/datas");
    const d = dataLocal("2026-10-05");
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 5]);
    expect(isoLocal(new Date(2026, 9, 5, 23, 30))).toBe("2026-10-05");
  });
});
