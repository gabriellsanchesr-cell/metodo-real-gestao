import { describe, expect, it } from "vitest";
import { ANAMNESE_SECOES } from "@/lib/anamneseModelo";
import { RETORNO_SECOES } from "@/lib/retornoModelo";
import { notasBaixas, progresso, respostasEmTexto, valorLegivel } from "@/lib/formularios";

describe.each([["anamnese", ANAMNESE_SECOES], ["retorno", RETORNO_SECOES]])("modelo %s", (_, secoes) => {
  it("ids únicos e textos sem travessão", () => {
    const ids = secoes.flatMap((s) => s.campos.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    const textos = secoes.flatMap((s) => [s.titulo, s.descricao ?? "", ...s.campos.flatMap((c) => [c.rotulo, c.dica ?? "", c.ruim ?? "", c.bom ?? "", ...(c.opcoes ?? [])])]).join(" ");
    expect(textos).not.toMatch(/[—–]/);
  });

  it("toda nota tem as duas pontas da escala, toda opção tem opções", () => {
    for (const c of secoes.flatMap((s) => s.campos)) {
      if (c.tipo === "nota") expect(c.ruim && c.bom).toBeTruthy();
      if (c.tipo === "opcoes") expect(c.opcoes?.length).toBeGreaterThan(1);
    }
  });
});

describe("respostas", () => {
  it("texto corrido só com o que foi respondido", () => {
    const t = respostasEmTexto(RETORNO_SECOES, { sono_nota: 2, peso: "71,4", relato: "  " });
    expect(t).toContain("Qualidade do sono: 2/5");
    expect(t).toContain("Peso: 71,4 kg");
    expect(t).not.toContain("Relato livre");
  });

  it("notas baixas e progresso", () => {
    const r = { sono_nota: 2, intestino_nota: 5, fome_geral: 1 };
    expect(notasBaixas(RETORNO_SECOES, r).map((b) => b.campo.id)).toEqual(["fome_geral", "sono_nota"]);
    expect(progresso(RETORNO_SECOES, r).feitos).toBe(3);
  });

  it("sim e não legíveis", () => {
    const c = RETORNO_SECOES.flatMap((s) => s.campos).find((x) => x.id === "compulsao")!;
    expect(valorLegivel(c, true)).toBe("Sim");
    expect(valorLegivel(c, false)).toBe("Não");
  });
});
