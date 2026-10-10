import { describe, it, expect } from "vitest";
import { addDays, subDays } from "date-fns";
import { usaPortal, emAcompanhamento, pacientesVencidos, retornosPendentes, semPesoNaSemana, consultasParaFechar, ultimoPeso } from "@/lib/painel";

const agora = new Date(2026, 8, 30, 10, 0);
const ha = (dias: number) => subDays(agora, dias).toISOString();
const p = (id: string, account_status = "ativo", ativo: boolean | null = true) => ({ id, account_status, ativo });

const naoArquivada = (x: { ativo?: boolean | null }) => x.ativo !== false;

describe("usaPortal", () => {
  it("só portal liberado e cadastro não arquivado", () => {
    expect(usaPortal(p("a"))).toBe(true);
    expect(usaPortal(p("b", "ativo", null))).toBe(true);
    expect(usaPortal(p("c", "sem_conta"))).toBe(false);
    expect(usaPortal(p("d", "desativado"))).toBe(false);
    expect(usaPortal(p("e", "ativo", false))).toBe(false);
  });
});

describe("pacientesVencidos", () => {
  it("vale o contrato ativo de vencimento mais distante, vencido antes de hoje", () => {
    const v = pacientesVencidos([
      { paciente_id: "venceu", status: "ativo", data_vencimento: "2026-09-29" },
      { paciente_id: "hoje", status: "ativo", data_vencimento: "2026-09-30" },
      { paciente_id: "renovou", status: "ativo", data_vencimento: "2026-09-01" },
      { paciente_id: "renovou", status: "ativo", data_vencimento: "2026-10-30" },
      { paciente_id: "antigo", status: "renovado", data_vencimento: "2026-08-01" },
    ], agora);
    expect([...v]).toEqual(["venceu"]);
  });
});

describe("emAcompanhamento", () => {
  it("conta quem não usa o portal e deixa de fora arquivadas e vencidas", () => {
    const vencidos = new Set(["v"]);
    expect(emAcompanhamento(p("a"), vencidos)).toBe(true);
    expect(emAcompanhamento(p("b", "sem_conta"), vencidos)).toBe(true);
    expect(emAcompanhamento(p("c", "desativado"), vencidos)).toBe(true);
    expect(emAcompanhamento(p("v"), vencidos)).toBe(false);
    expect(emAcompanhamento(p("e", "ativo", false), vencidos)).toBe(false);
    expect(emAcompanhamento({ ...p("i"), inativo: true }, vencidos)).toBe(false);
  });
});

describe("retornosPendentes", () => {
  const pacs = ["d29", "d30", "d45", "d46"].map((id) => p(id));
  const cons = [
    { paciente_id: "d29", data_hora: ha(29), status: "realizado" },
    { paciente_id: "d30", data_hora: ha(30), status: "realizado" },
    { paciente_id: "d45", data_hora: ha(45), status: "faltou" },
    { paciente_id: "d46", data_hora: ha(46), status: "realizado" },
  ];

  it("conta de 30 a 45 dias, inclusive, mais antigas primeiro", () => {
    expect(retornosPendentes(pacs, cons, agora, naoArquivada).map((r) => [r.paciente.id, r.dias])).toEqual([["d45", 45], ["d30", 30]]);
  });

  it("quem já tem retorno marcado não conta", () => {
    const comFutura = [...cons, { paciente_id: "d30", data_hora: addDays(agora, 3).toISOString(), status: "agendado" }];
    expect(retornosPendentes(pacs, comFutura, agora, naoArquivada).map((r) => r.paciente.id)).toEqual(["d45"]);
  });

  it("consulta futura cancelada não segura o retorno", () => {
    const futuraCancelada = [...cons, { paciente_id: "d30", data_hora: addDays(agora, 3).toISOString(), status: "cancelado" }];
    expect(retornosPendentes(pacs, futuraCancelada, agora, naoArquivada).map((r) => r.paciente.id)).toContain("d30");
  });

  it("ignora consulta cancelada como última consulta", () => {
    const r = retornosPendentes([p("x")], [
      { paciente_id: "x", data_hora: ha(35), status: "realizado" },
      { paciente_id: "x", data_hora: ha(5), status: "cancelado" },
    ], agora, naoArquivada);
    expect(r.map((i) => i.dias)).toEqual([35]);
  });

  it("só quem passa no critério de ativa", () => {
    const cons35 = [{ paciente_id: "s", data_hora: ha(35), status: "realizado" }];
    expect(retornosPendentes([p("s", "sem_conta")], cons35, agora, naoArquivada)).toHaveLength(1);
    expect(retornosPendentes([p("s", "sem_conta", false)], cons35, agora, naoArquivada)).toEqual([]);
  });
});

describe("semPesoNaSemana", () => {
  it("ativas sem peso nos últimos 7 dias", () => {
    const pacs = [p("com"), p("sem"), p("antigo"), p("semconta", "sem_conta")];
    const acomp = [
      { paciente_id: "com", data_registro: "2026-09-27", peso: 70 },
      { paciente_id: "antigo", data_registro: "2026-09-20", peso: 70 },
      { paciente_id: "sem", data_registro: "2026-09-29", peso: null },
    ];
    expect(semPesoNaSemana(pacs, acomp, agora).map((x) => x.id)).toEqual(["sem", "antigo"]);
    expect(semPesoNaSemana(pacs, acomp, agora, new Set(["sem"])).map((x) => x.id)).toEqual(["antigo"]);
  });
});

describe("consultasParaFechar", () => {
  it("passadas e ainda agendadas, da mais antiga para a mais nova", () => {
    const cons = [
      { paciente_id: "a", data_hora: ha(1), status: "agendado" },
      { paciente_id: "b", data_hora: ha(90), status: "agendado" },
      { paciente_id: "c", data_hora: ha(2), status: "realizado" },
      { paciente_id: "d", data_hora: addDays(agora, 1).toISOString(), status: "agendado" },
    ];
    expect(consultasParaFechar(cons, agora).map((c) => c.paciente_id)).toEqual(["b", "a"]);
  });
});


describe("ultimoPeso", () => {
  it("junta avaliações e acompanhamentos e pega o mais recente", () => {
    expect(ultimoPeso(
      [{ data_avaliacao: "2026-09-01", peso: 70 }, { data_avaliacao: "2026-08-01", peso: 71.5 }],
      [{ data_registro: "2026-09-26", peso: 69.2 }],
    )).toEqual({ peso: 69.2, data: "2026-09-26", variacao: -0.8 });
  });

  it("sem nenhum peso, nada", () => {
    expect(ultimoPeso([{ data_avaliacao: "2026-09-01", peso: null }], [])).toBeNull();
  });

  it("um só registro, sem variação", () => {
    expect(ultimoPeso([{ data_avaliacao: "2026-09-01", peso: 70 }], [])).toEqual({ peso: 70, data: "2026-09-01", variacao: null });
  });
});

describe("ultimoPeso com check-in", () => {
  it("o check-in entra como fonte e não conta duas vezes com o espelho no acompanhamento", () => {
    const r = ultimoPeso(
      [{ data_avaliacao: "2026-10-03", peso: 82.8 }],
      [{ data_registro: "2026-10-12", peso: 82.1, created_at: "2026-10-12T13:00:00Z" }],
      [{ semana: "2026-10-10", peso: 82.1, created_at: "2026-10-12T13:00:00Z" }],
    );
    expect(r).toEqual({ peso: 82.1, data: "2026-10-12", variacao: -0.7 });
  });

  it("check-in sem espelho no acompanhamento também vale", () => {
    const r = ultimoPeso([{ data_avaliacao: "2026-10-03", peso: 82.8 }], [], [{ semana: "2026-10-10", peso: 82, created_at: "2026-10-11T15:00:00Z" }]);
    expect(r).toEqual({ peso: 82, data: "2026-10-11", variacao: -0.8 });
  });

  it("no mesmo dia, vale o que foi lançado por último", () => {
    const r = ultimoPeso(
      [{ data_avaliacao: "2026-10-05", peso: 70, created_at: "2026-10-05T12:00:00Z" }],
      [{ data_registro: "2026-10-05", peso: 69.5, created_at: "2026-10-05T18:00:00Z" }],
    );
    expect(r?.peso).toBe(69.5);
  });
});
