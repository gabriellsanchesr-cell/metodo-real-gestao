import { describe, expect, it } from "vitest";
import {
  PERGUNTAS, NOTAS_CHECKIN, checkinPendente, mediaDoCheckin, pedirMedidas, pontosDeAtencao,
  semCheckinNaSemana, semanaDoCheckin, variacaoMedidas,
} from "@/lib/checkin";

// 10/10/2026 é sábado.
const dia = (d: number, h = 10) => new Date(2026, 9, d, h, 0);

describe("semanaDoCheckin", () => {
  it("é o sábado mais recente, e o próprio dia quando hoje é sábado", () => {
    expect(semanaDoCheckin(dia(10))).toBe("2026-10-10");
    expect(semanaDoCheckin(dia(11))).toBe("2026-10-10"); // domingo
    expect(semanaDoCheckin(dia(16))).toBe("2026-10-10"); // sexta
    expect(semanaDoCheckin(dia(17))).toBe("2026-10-17"); // sábado seguinte
    expect(semanaDoCheckin(dia(9))).toBe("2026-10-03"); // sexta anterior
  });

  it("usa o dia local: sábado às 23h ainda é sábado", () => {
    expect(semanaDoCheckin(dia(10, 23))).toBe("2026-10-10");
    expect(semanaDoCheckin(dia(9, 23))).toBe("2026-10-03");
  });
});

describe("checkinPendente", () => {
  it("pendente até responder a semana atual", () => {
    expect(checkinPendente([], dia(12))).toBe(true);
    expect(checkinPendente([{ semana: "2026-10-03" }], dia(12))).toBe(true);
    expect(checkinPendente([{ semana: "2026-10-10" }], dia(12))).toBe(false);
    expect(checkinPendente([{ semana: "2026-10-10" }], dia(17))).toBe(true);
  });
});

describe("pedirMedidas", () => {
  const on = { checkin_medidas: true };
  const m = { circ_cintura: 80 };

  it("só para quem o nutri habilitou", () => {
    expect(pedirMedidas({ checkin_medidas: false }, [], dia(10))).toBe(false);
    expect(pedirMedidas({}, [], dia(10))).toBe(false);
    expect(pedirMedidas(on, [], dia(10))).toBe(true);
  });

  it("a cada 14 dias: semana sim, semana não", () => {
    expect(pedirMedidas(on, [{ semana: "2026-10-03", medidas: m }], dia(10))).toBe(false);
    expect(pedirMedidas(on, [{ semana: "2026-09-26", medidas: m }], dia(10))).toBe(true);
  });

  it("check-in sem medidas não reinicia a contagem, e o desta semana não conta", () => {
    expect(pedirMedidas(on, [{ semana: "2026-10-03", medidas: null }, { semana: "2026-09-26", medidas: m }], dia(10))).toBe(true);
    expect(pedirMedidas(on, [{ semana: "2026-10-10", medidas: m }, { semana: "2026-09-26", medidas: m }], dia(12))).toBe(true);
  });
});

describe("pontosDeAtencao e média", () => {
  it("nota 1 ou 2 e a caixa de dificuldades", () => {
    const pontos = pontosDeAtencao({ fome: 2, sono: 3, intestino: 1, comentarios: { fome: " à noite " }, dificuldades: "Fim de semana" });
    expect(pontos).toEqual([
      { rotulo: "Fome", nota: 2, texto: "à noite" },
      { rotulo: "Intestino", nota: 1, texto: null },
      { rotulo: "Dificuldades", nota: null, texto: "Fim de semana" },
    ]);
    expect(pontosDeAtencao({ fome: 4, dificuldades: "  " })).toEqual([]);
  });

  it("média só das respondidas", () => {
    expect(mediaDoCheckin({ fome: 4, sono: 5, treino: null })).toBe(4.5);
    expect(mediaDoCheckin({})).toBeNull();
  });
});

describe("variacaoMedidas", () => {
  it("compara com o check-in anterior mais recente que tem a medida", () => {
    const v = variacaoMedidas({ circ_cintura: 78, circ_quadril: 100 }, [{ circ_quadril: 101 }, { circ_cintura: 80.5 }]);
    expect(v).toEqual([
      { key: "circ_cintura", label: "Cintura", valor: 78, variacao: -2.5 },
      { key: "circ_quadril", label: "Quadril", valor: 100, variacao: -1 },
    ]);
  });
});

describe("semCheckinNaSemana", () => {
  it("quem não respondeu a semana atual", () => {
    const pacs = [{ id: "a" }, { id: "b" }];
    const r = semCheckinNaSemana(pacs, [{ paciente_id: "a", semana: "2026-10-10" }, { paciente_id: "b", semana: "2026-10-03" }], dia(12));
    expect(r.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("perguntas", () => {
  it("uma por nota, sem travessão nem emoji", () => {
    expect(PERGUNTAS.map((p) => p.id)).toEqual([...NOTAS_CHECKIN]);
    const texto = PERGUNTAS.map((p) => [p.pergunta, p.ruim, p.bom, p.dica].join(" ")).join(" ");
    expect(texto).not.toMatch(/[—–]/);
    expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
