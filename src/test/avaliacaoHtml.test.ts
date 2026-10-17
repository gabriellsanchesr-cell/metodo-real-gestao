import { describe, expect, it } from "vitest";
import { montarAvaliacaoHtml } from "@/lib/avaliacaoHtml";

const paciente = { nome_completo: "Pedro Henrique", sexo: "masculino" };
const av1 = { id: "a1", data_avaliacao: "2026-07-05", peso: 117, altura: 181, circ_cintura: 109, circ_quadril: 118, percentual_gordura_dobras: 25, massa_magra_kg: 87.7 };
const av2 = { id: "a2", data_avaliacao: "2026-09-05", peso: 112.3, altura: 181, circ_cintura: 93, circ_quadril: 116, percentual_gordura_dobras: 22.7, massa_magra_kg: 86.8, observacoes: "Ótima semana.\n\nSeguimos <firmes>." };

describe("montarAvaliacaoHtml", () => {
  it("com histórico: variações, cores e gráficos", () => {
    const h = montarAvaliacaoHtml({ paciente, avaliacoes: [av2, av1], avaliacaoId: "a2" });
    expect(h).toContain("Evolução das medidas &middot; 05/07 a 05/09");
    expect(h).toMatch(/Cintura \(cm\)<\/td><td>109<\/td><td>93<\/td><td class="delta up">-16<\/td>/);
    expect(h).toMatch(/Peso \(kg\)<\/td><td>117<\/td><td>112,3<\/td><td class="delta flat">-4,7<\/td>/);
    expect(h).toContain('id="evolucao"');
    expect(h).toContain("62</b><span>dias de acompanhamento");
  });

  it("leitura vem das observações, escapada, e some quando vazia", () => {
    const h = montarAvaliacaoHtml({ paciente, avaliacoes: [av1, av2] });
    expect(h).toContain("<p>Ótima semana.</p><p>Seguimos &lt;firmes&gt;.</p>");
    expect(montarAvaliacaoHtml({ paciente, avaliacoes: [av1] })).not.toContain('id="leitura"');
  });

  it("primeira avaliação: composição de hoje, sem gráficos", () => {
    const h = montarAvaliacaoHtml({ paciente, avaliacoes: [av1] });
    expect(h).toContain("Medidas de 05/07");
    expect(h).toContain("Primeira avaliação");
    expect(h).not.toContain('id="evolucao"');
  });

  it("abre a avaliação escolhida, ignorando as posteriores", () => {
    const h = montarAvaliacaoHtml({ paciente, avaliacoes: [av1, av2], avaliacaoId: "a1" });
    expect(h).toContain("avaliação física de 05/07/2026");
    expect(h).not.toContain("112,3");
  });

  it("sem travessão e com botão de PDF só quando pedido", () => {
    const h = montarAvaliacaoHtml({ paciente, avaliacoes: [av1, av2], comBotaoPdf: true });
    expect(h).toContain("Salvar em PDF");
    const visivel = h.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>/g, "");
    expect(visivel).not.toMatch(/[—–]/);
  });
});
