import { describe, it, expect } from "vitest";
import { addDays, subDays } from "date-fns";
import { ehAtiva, retornosPendentes, semPesoNaSemana, consultasParaFechar, ultimoPeso } from "@/lib/painel";

const agora = new Date(2026, 8, 30, 10, 0);
const ha = (dias: number) => subDays(agora, dias).toISOString();
const p = (id: string, account_status = "ativo", ativo: boolean | null = true) => ({ id, account_status, ativo });

describe("ehAtiva", () => {
  it("só portal liberado e cadastro não arquivado", () => {
    expect(ehAtiva(p("a"))).toBe(true);
    expect(ehAtiva(p("b", "ativo", null))).toBe(true);
    expect(ehAtiva(p("c", "sem_conta"))).toBe(false);
    expect(ehAtiva(p("d", "desativado"))).toBe(false);
    expect(ehAtiva(p("e", "ativo", false))).toBe(false);
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
    expect(retornosPendentes(pacs, cons, agora).map((r) => [r.paciente.id, r.dias])).toEqual([["d45", 45], ["d30", 30]]);
  });

  it("quem já tem retorno marcado não conta", () => {
    const comFutura = [...cons, { paciente_id: "d30", data_hora: addDays(agora, 3).toISOString(), status: "agendado" }];
    expect(retornosPendentes(pacs, comFutura, agora).map((r) => r.paciente.id)).toEqual(["d45"]);
  });

  it("consulta futura cancelada não segura o retorno", () => {
    const futuraCancelada = [...cons, { paciente_id: "d30", data_hora: addDays(agora, 3).toISOString(), status: "cancelado" }];
    expect(retornosPendentes(pacs, futuraCancelada, agora).map((r) => r.paciente.id)).toContain("d30");
  });

  it("ignora consulta cancelada como última consulta", () => {
    const r = retornosPendentes([p("x")], [
      { paciente_id: "x", data_hora: ha(35), status: "realizado" },
      { paciente_id: "x", data_hora: ha(5), status: "cancelado" },
    ], agora);
    expect(r.map((i) => i.dias)).toEqual([35]);
  });

  it("só pacientes ativas", () => {
    expect(retornosPendentes([p("s", "sem_conta")], [{ paciente_id: "s", data_hora: ha(35), status: "realizado" }], agora)).toEqual([]);
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
