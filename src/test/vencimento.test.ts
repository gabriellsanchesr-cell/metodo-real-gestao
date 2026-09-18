import { describe, it, expect } from "vitest";
import {
  calcularVencimento, diasAteVencimento, situacao, rotuloPrazo, progressoPeriodo,
  inicioDaRenovacao, contratoVigente, formatarData, hojeISO,
} from "@/lib/vencimento";

describe("calcularVencimento", () => {
  it("soma meses de calendario", () => {
    expect(calcularVencimento("2026-09-18", "mensal")).toBe("2026-10-18");
    expect(calcularVencimento("2026-09-18", "bimestral")).toBe("2026-11-18");
    expect(calcularVencimento("2026-09-18", "trimestral")).toBe("2026-12-18");
  });

  it("trata fim de mes sem pular para o mes seguinte", () => {
    expect(calcularVencimento("2026-01-31", "mensal")).toBe("2026-02-28");
    expect(calcularVencimento("2028-01-31", "mensal")).toBe("2028-02-29"); // bissexto
  });

  it("atravessa a virada do ano", () => {
    expect(calcularVencimento("2026-11-15", "trimestral")).toBe("2027-02-15");
  });

  it("personalizado nao calcula nada", () => {
    expect(calcularVencimento("2026-09-18", "personalizado")).toBeNull();
  });
});

describe("diasAteVencimento e situacao", () => {
  const hoje = "2026-09-18";

  it("conta dias de calendario", () => {
    expect(diasAteVencimento("2026-09-25", hoje)).toBe(7);
    expect(diasAteVencimento("2026-09-18", hoje)).toBe(0);
    expect(diasAteVencimento("2026-09-15", hoje)).toBe(-3);
  });

  it("classifica pelo limite de alerta", () => {
    expect(situacao(-1)).toBe("vencido");
    expect(situacao(0)).toBe("vence_hoje");
    expect(situacao(7)).toBe("vencendo");
    expect(situacao(8)).toBe("em_dia");
    expect(situacao(10, 14)).toBe("vencendo");
  });
});

describe("rotuloPrazo", () => {
  it("usa o singular e o plural certos", () => {
    expect(rotuloPrazo(0)).toBe("Vence hoje");
    expect(rotuloPrazo(1)).toBe("Vence amanhã");
    expect(rotuloPrazo(5)).toBe("Vence em 5 dias");
    expect(rotuloPrazo(-1)).toBe("Venceu ontem");
    expect(rotuloPrazo(-4)).toBe("Venceu há 4 dias");
  });
});

describe("progressoPeriodo", () => {
  it("vai de 0 a 100 dentro do periodo", () => {
    expect(progressoPeriodo("2026-09-01", "2026-10-01", "2026-09-01")).toBe(0);
    expect(progressoPeriodo("2026-09-01", "2026-10-01", "2026-09-16")).toBe(50);
    expect(progressoPeriodo("2026-09-01", "2026-10-01", "2026-12-01")).toBe(100);
    expect(progressoPeriodo("2026-09-01", "2026-10-01", "2026-08-01")).toBe(0);
  });
});

describe("inicioDaRenovacao", () => {
  it("renovando antes de vencer, emenda no fim do periodo anterior", () => {
    expect(inicioDaRenovacao("2026-09-25", "2026-09-18")).toBe("2026-09-25");
  });
  it("renovando depois de vencer, comeca hoje", () => {
    expect(inicioDaRenovacao("2026-08-01", "2026-09-18")).toBe("2026-09-18");
  });
});

describe("contratoVigente", () => {
  it("escolhe o ativo com vencimento mais distante", () => {
    const c = contratoVigente([
      { status: "renovado", data_vencimento: "2026-12-01" },
      { status: "ativo", data_vencimento: "2026-10-01" },
      { status: "ativo", data_vencimento: "2026-11-01" },
    ]);
    expect(c?.data_vencimento).toBe("2026-11-01");
  });
  it("devolve null sem ativo", () => {
    expect(contratoVigente([{ status: "encerrado", data_vencimento: "2026-10-01" }])).toBeNull();
  });
});

describe("formatacao", () => {
  it("formata sem passar por fuso", () => {
    expect(formatarData("2026-09-01")).toBe("01/09/2026");
    expect(formatarData(null)).toBe("—");
  });
  it("hojeISO usa o calendario local", () => {
    expect(hojeISO(new Date(2026, 8, 18, 23, 30))).toBe("2026-09-18");
  });
});
