import { describe, expect, it } from "vitest";
import {
  CHAVE_ENGINE_PARA_LISTA,
  alimentosReferenciaDoPlanoHtml,
  ehPlanoHtml,
  extrairDadosPlanoHtml,
  totaisDoPlanoHtml,
} from "@/lib/planoHtml";
import { LISTA_ALIMENTOS, itemDeReferenciaPdf } from "@/lib/substituicoes";

// Mesmo formato que agents/plano_builder.py embute (dados fictícios).
const dados = {
  formato: "plano-real",
  versao: 1,
  paciente: "Paciente Teste",
  emissao: "1 · Outubro · 2026",
  emissao_iso: "2026-10-01",
  planos: [
    {
      chave: "semana", titulo: "Segunda a sexta", rotulo: "Segunda a sexta",
      kcal: 1860, proteina_g: 136.2, carboidrato_g: 222.4, gordura_g: 49.1, fibra_g: 42, g_kg: "1,7",
      faixa_kcal: [1799, 1958],
      refeicoes: [{ nome: "Almoço", hora: "12:00", kcal: 524, opcoes: [] }],
    },
    {
      chave: "fds", titulo: "Sábado e domingo", rotulo: "Fim de semana",
      kcal: 1632, proteina_g: 129, carboidrato_g: 189, gordura_g: 39, fibra_g: 37, g_kg: "1,7",
      faixa_kcal: [1604, 1696], refeicoes: [],
    },
  ],
  alimentos: [
    { nome: "Arroz branco", quantidade_g: 100, refeicao: "Almoço", chave: "arroz" },
    { nome: "Frango grelhado ou assado", quantidade_g: 100, refeicao: "Almoço", chave: "frango" },
    { nome: "Goiabada", quantidade_g: 25, refeicao: "Almoço", chave: "goiabada" },
  ],
};

function html(json: string) {
  return `<!DOCTYPE html><html><body><div class="page"></div>
<script type="application/json" id="plano-dados">${json}</script><script>var x=1</script></body></html>`;
}

describe("plano em HTML", () => {
  it("reconhece o formato pela extensão", () => {
    expect(ehPlanoHtml("planos/abc/1_Plano.html")).toBe(true);
    expect(ehPlanoHtml("planos/abc/1_Plano.HTM")).toBe(true);
    expect(ehPlanoHtml("planos/abc/1_Plano.pdf")).toBe(false);
    expect(ehPlanoHtml(null)).toBe(false);
  });

  it("lê os dados embutidos, inclusive com </ escapado", () => {
    const json = JSON.stringify(dados).replace(/<\//g, "<\\/");
    const lido = extrairDadosPlanoHtml(html(json));
    expect(lido?.paciente).toBe("Paciente Teste");
    expect(lido?.planos).toHaveLength(2);
  });

  it("recusa HTML sem dados ou de outra origem", () => {
    expect(extrairDadosPlanoHtml("<html><body>plano antigo</body></html>")).toBeNull();
    expect(extrairDadosPlanoHtml(html("{quebrado"))).toBeNull();
    expect(extrairDadosPlanoHtml(html(JSON.stringify({ formato: "outro", planos: [{}] })))).toBeNull();
  });

  it("usa os totais da primeira rotina", () => {
    const t = totaisDoPlanoHtml(dados as never);
    expect(t.kcal).toBe(1860);
    expect(t.proteina_g).toBeCloseTo(136.2);
  });

  it("todo par chave -> calculadora existe na lista", () => {
    const nomes = new Set(LISTA_ALIMENTOS.map((a) => a.nome));
    const faltando = Object.values(CHAVE_ENGINE_PARA_LISTA).filter((n) => !nomes.has(n));
    expect(faltando).toEqual([]);
  });

  it("alimentos viram itens da calculadora quando há par", () => {
    const refs = alimentosReferenciaDoPlanoHtml(dados as never);
    expect(refs[0]).toMatchObject({ nome: "Arroz branco", quantidade_g: 100, correspondente: "Arroz cozido" });
    expect(refs[2].correspondente).toBeNull();
    const item = itemDeReferenciaPdf(refs[1]);
    expect(item?.gramas).toBe(100);
    expect(item?.categoria).toBe("proteina");
  });
});
