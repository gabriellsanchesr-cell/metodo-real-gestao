import { describe, it, expect } from "vitest";
import {
  montarFila, montarPlacar, preencherMensagem, primeiroNome, normalizarTelefone, linkWhatsApp,
  proximoToqueDepoisDeEnvio, evoluiuAFavor, lerCsvLeads, MENSAGENS_PADRAO,
  type DadosFila, type LeadFila, type PacienteFila, type AvaliacaoFila,
} from "@/lib/captacao";

const HOJE = "2026-09-29";

const lead = (p: Partial<LeadFila>): LeadFila => ({
  id: "l1", nome: "Ana Souza", telefone: "(44) 99999-0000", origem: "personal", status: "novo",
  created_at: "2026-09-29T10:00:00Z", ultimo_toque: null, proximo_toque: null, tentativas: 0, ...p,
});

const paciente = (p: Partial<PacienteFila>): PacienteFila => ({
  id: "p1", nome_completo: "Maria Clara Silva", telefone: "44999990000", objetivo: "emagrecimento",
  ativo: true, created_at: "2026-06-01T00:00:00Z", ...p,
});

const aval = (p: Partial<AvaliacaoFila>): AvaliacaoFila => ({
  paciente_id: "p1", data_avaliacao: "2026-08-01", peso: 70, percentual_gordura_dobras: 30,
  bio_percentual_gordura: null, massa_magra_kg: 49, ...p,
});

const base = (p: Partial<DadosFila> = {}): DadosFila => ({
  leads: [], pacientes: [], contratos: [], ultimaAtividade: {}, avaliacoes: [], parceiros: [],
  toques: [], diasAlerta: 7, hoje: HOJE, ...p,
});

describe("mensagens", () => {
  it("usa o primeiro nome com inicial maiúscula", () => {
    expect(primeiroNome("maria clara")).toBe("Maria");
    expect(primeiroNome("+55 44 9999-0000")).toBe("");
  });

  it("sem nome conhecido, tira a vírgula e o marcador", () => {
    expect(preencherMensagem("Oi, {nome}! Tudo bem?", { nome: "+55 44 9999" })).toBe("Oi! Tudo bem?");
    expect(preencherMensagem("{nome}, fiquei feliz.", { nome: "" })).toBe("fiquei feliz.");
  });

  it("nenhuma mensagem padrão tem travessão, emoji ou marcador sobrando", () => {
    for (const t of Object.values(MENSAGENS_PADRAO)) {
      expect(t).not.toMatch(/—/);
      expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(preencherMensagem(t, { nome: "Ana" })).not.toMatch(/\{\w+\}/);
    }
  });

  it("renovação mostra o valor mensal equivalente", () => {
    expect(MENSAGENS_PADRAO.renovacao).toMatch(/R\$210\/mês/);
    expect(MENSAGENS_PADRAO.renovacao).toMatch(/R\$196\/mês/);
  });
});

describe("telefone e link", () => {
  it("põe DDI 55 no formato brasileiro", () => {
    expect(normalizarTelefone("(44) 99727-1545")).toBe("5544997271545");
    expect(normalizarTelefone("+55 44 99727-1545")).toBe("5544997271545");
    expect(normalizarTelefone("123")).toBeNull();
  });

  it("codifica o texto no wa.me", () => {
    expect(linkWhatsApp("44997271545", "Oi, Ana!")).toBe("https://wa.me/5544997271545?text=Oi%2C%20Ana!");
    expect(linkWhatsApp(null, "x")).toBeNull();
  });
});

describe("cadência", () => {
  it("1 dia depois do 1º toque, 3 depois do 2º, e encerra no 3º", () => {
    expect(proximoToqueDepoisDeEnvio(0, HOJE)).toBe("2026-09-30");
    expect(proximoToqueDepoisDeEnvio(1, HOJE)).toBe("2026-10-02");
    expect(proximoToqueDepoisDeEnvio(2, HOJE)).toBeNull();
  });
});

describe("fila: leads", () => {
  it("lead novo sem toque entra no topo", () => {
    const f = montarFila(base({ leads: [lead({})] }));
    expect(f[0].gatilho).toBe("lead_novo");
    expect(f[0].prioridade).toBe(1);
    expect(f[0].mensagem).toMatch(/^Oi, Ana!/);
  });

  it("lead em contato parado há 2 dias vira quente; com 1 dia, não", () => {
    const q = montarFila(base({ leads: [lead({ status: "em_contato", ultimo_toque: "2026-09-27T12:00:00Z" })] }));
    expect(q.map((i) => i.gatilho)).toEqual(["lead_quente"]);
    const n = montarFila(base({ leads: [lead({ status: "em_contato", ultimo_toque: "2026-09-28T12:00:00Z" })] }));
    expect(n).toHaveLength(0);
  });

  it("follow-up aparece no dia marcado e atrasado, não antes", () => {
    const hoje = montarFila(base({ leads: [lead({ ultimo_toque: "2026-09-28T10:00:00Z", proximo_toque: HOJE, tentativas: 1 })] }));
    expect(hoje[0].gatilho).toBe("follow_up");
    expect(hoje[0].motivo).toBe("Toque 2, depois de 1 sem resposta.");
    const futuro = montarFila(base({ leads: [lead({ status: "em_contato", ultimo_toque: "2026-09-20T10:00:00Z", proximo_toque: "2026-10-01" })] }));
    expect(futuro).toHaveLength(0);
  });

  it("retomada marcada de quem já demonstrou interesse usa a mensagem de lead quente", () => {
    const f = montarFila(base({ leads: [lead({ status: "em_contato", proximo_toque: "2026-09-27", tentativas: 0 })] }));
    expect(f[0].gatilho).toBe("lead_quente");
    expect(f[0].motivo).toBe("Demonstrou interesse. Retomada marcada para hoje (2 dia(s) de atraso).");
  });

  it("convertido e perdido ficam fora", () => {
    const f = montarFila(base({ leads: [lead({ status: "converteu" }), lead({ id: "l2", status: "perdido" })] }));
    expect(f).toHaveLength(0);
  });

  it("ex-paciente entra no máximo 5 por semana, descontando os já tocados", () => {
    const leads = Array.from({ length: 8 }, (_, i) => lead({ id: `e${i}`, nome: `Ex ${i}`, origem: "ex_paciente" }));
    expect(montarFila(base({ leads })).filter((i) => i.gatilho === "ex_paciente")).toHaveLength(5);
    const toques = ["x1", "x2"].map((id) => ({ lead_id: id, paciente_id: null, parceiro_id: null, gatilho: "ex_paciente", resultado: "enviado", created_at: "2026-09-27T10:00:00Z" }));
    expect(montarFila(base({ leads, toques })).filter((i) => i.gatilho === "ex_paciente")).toHaveLength(3);
  });
});

describe("fila: pacientes", () => {
  const contrato = (venc: string, inicio = "2026-08-29") => ({ paciente_id: "p1", status: "ativo", data_inicio: inicio, data_vencimento: venc });

  it("renovação dentro da janela de alerta", () => {
    const f = montarFila(base({ pacientes: [paciente({})], contratos: [contrato("2026-10-06")], ultimaAtividade: { p1: "2026-09-20" } }));
    expect(f.map((i) => i.gatilho)).toEqual(["renovacao"]);
    const fora = montarFila(base({ pacientes: [paciente({})], contratos: [contrato("2026-10-07")], ultimaAtividade: { p1: "2026-09-20" } }));
    expect(fora.map((i) => i.gatilho)).not.toContain("renovacao");
  });

  it("vencido até 60 dias; depois disso sai da fila de vencido", () => {
    const f = montarFila(base({ pacientes: [paciente({})], contratos: [contrato("2026-09-20", "2026-08-20")], ultimaAtividade: { p1: "2026-09-10" } }));
    expect(f[0].gatilho).toBe("vencido");
    const velho = montarFila(base({ pacientes: [paciente({})], contratos: [contrato("2026-07-01", "2026-06-01")], ultimaAtividade: { p1: "2026-09-10" } }));
    expect(velho.map((i) => i.gatilho)).not.toContain("vencido");
  });

  it("renovação já tocada fica em silêncio por 3 dias", () => {
    const toques = [{ lead_id: null, paciente_id: "p1", parceiro_id: null, gatilho: "renovacao", resultado: "enviado", created_at: "2026-09-28T10:00:00Z" }];
    const f = montarFila(base({ pacientes: [paciente({})], contratos: [contrato("2026-10-03")], ultimaAtividade: { p1: "2026-09-20" }, toques }));
    expect(f).toHaveLength(0);
  });

  it("sem contato há mais de 45 dias", () => {
    const f = montarFila(base({ pacientes: [paciente({})], ultimaAtividade: { p1: "2026-08-10" } }));
    expect(f.map((i) => i.gatilho)).toEqual(["sumico"]);
    const ok = montarFila(base({ pacientes: [paciente({})], ultimaAtividade: { p1: "2026-08-20" } }));
    expect(ok).toHaveLength(0);
  });

  it("paciente arquivado não entra", () => {
    const f = montarFila(base({ pacientes: [paciente({ ativo: false })], ultimaAtividade: { p1: "2026-01-01" } }));
    expect(f).toHaveLength(0);
  });

  it("indicação após avaliação recente com evolução", () => {
    const avaliacoes = [aval({}), aval({ data_avaliacao: "2026-09-28", percentual_gordura_dobras: 28 })];
    const f = montarFila(base({ pacientes: [paciente({})], avaliacoes, ultimaAtividade: { p1: "2026-09-28" } }));
    expect(f.map((i) => i.gatilho)).toEqual(["indicacao"]);
  });

  it("sem evolução, não pede indicação", () => {
    const avaliacoes = [aval({}), aval({ data_avaliacao: "2026-09-28", percentual_gordura_dobras: 31, peso: 71 })];
    const f = montarFila(base({ pacientes: [paciente({})], avaliacoes, ultimaAtividade: { p1: "2026-09-28" } }));
    expect(f).toHaveLength(0);
  });

  it("indicação aos 30 dias de contrato", () => {
    const f = montarFila(base({ pacientes: [paciente({})], contratos: [contrato("2026-11-29", "2026-08-30")], ultimaAtividade: { p1: "2026-09-20" } }));
    expect(f.map((i) => i.gatilho)).toEqual(["indicacao"]);
  });

  it("uma linha por paciente: renovação vence sumiço", () => {
    const f = montarFila(base({ pacientes: [paciente({})], contratos: [contrato("2026-10-02")], ultimaAtividade: { p1: "2026-07-01" } }));
    expect(f.map((i) => i.gatilho)).toEqual(["renovacao"]);
  });

  it("mensagem de paciente nunca leva dado clínico", () => {
    const avaliacoes = [aval({}), aval({ data_avaliacao: "2026-09-28", percentual_gordura_dobras: 28 })];
    const f = montarFila(base({ pacientes: [paciente({})], avaliacoes }));
    for (const i of f) expect(i.mensagem).not.toMatch(/\d+(,\d+)?\s*(kg|%)/);
  });
});

describe("fila: parceiros e ordem", () => {
  it("parceiro sem indicação há 30 dias", () => {
    const parceiros = [{ id: "pa1", nome: "Rafael Personal", telefone: "44988887777", ativo: true, created_at: "2026-08-01T00:00:00Z" }];
    expect(montarFila(base({ parceiros }))[0].gatilho).toBe("parceiro");
    const leads = [lead({ status: "converteu", parceiro_id: "pa1", created_at: "2026-09-20T00:00:00Z" })];
    expect(montarFila(base({ parceiros, leads }))).toHaveLength(0);
  });

  it("ordena por prioridade", () => {
    const f = montarFila(base({
      leads: [lead({})],
      pacientes: [paciente({})],
      ultimaAtividade: { p1: "2026-07-01" },
    }));
    expect(f.map((i) => i.gatilho)).toEqual(["lead_novo", "sumico"]);
  });

  it("texto editado pelo nutricionista substitui o padrão", () => {
    const f = montarFila(base({ leads: [lead({})], mensagens: { lead_novo: "Olá, {nome}." } }));
    expect(f[0].mensagem).toBe("Olá, Ana.");
  });
});

describe("evoluiuAFavor", () => {
  it("hipertrofia: massa magra subindo", () => {
    expect(evoluiuAFavor("ganho_de_massa", aval({}), aval({ massa_magra_kg: 50, peso: 72, percentual_gordura_dobras: 31 }))).toBe(true);
    expect(evoluiuAFavor("ganho_de_massa", aval({}), aval({ massa_magra_kg: 48, percentual_gordura_dobras: 29 }))).toBe(false);
  });

  it("dobras mandam sobre bioimpedância", () => {
    const a = aval({ bio_percentual_gordura: 25 });
    const b = aval({ data_avaliacao: "2026-09-01", percentual_gordura_dobras: 31, bio_percentual_gordura: 20, peso: 70 });
    expect(evoluiuAFavor("emagrecimento", a, b)).toBe(false);
  });
});

describe("placar", () => {
  it("conta a semana e a origem dos pacientes do mês", () => {
    const toques = [
      { lead_id: "a", paciente_id: null, parceiro_id: null, gatilho: "lead_novo", resultado: "enviado", created_at: "2026-09-27T10:00:00Z" },
      { lead_id: "a", paciente_id: null, parceiro_id: null, gatilho: "lead_novo", resultado: "respondeu", created_at: "2026-09-28T10:00:00Z" },
      { lead_id: "b", paciente_id: null, parceiro_id: null, gatilho: "follow_up", resultado: "enviado", created_at: "2026-09-10T10:00:00Z" },
      { lead_id: "a", paciente_id: null, parceiro_id: null, gatilho: "lead_novo", resultado: "converteu", created_at: "2026-09-28T11:00:00Z" },
    ];
    const pac = [
      { origem: "personal", created_at: "2026-09-02T00:00:00Z" },
      { origem: "personal", created_at: "2026-09-12T00:00:00Z" },
      { origem: null, created_at: "2026-09-15T00:00:00Z" },
      { origem: "instagram", created_at: "2026-08-15T00:00:00Z" },
    ];
    const p = montarPlacar(toques, pac, HOJE);
    expect(p.toquesSemana).toBe(1);
    expect(p.respostasSemana).toBe(1);
    expect(p.convertidosMes).toBe(1);
    expect(p.origemMes[0]).toEqual({ origem: "personal", rotulo: "Personal / parceiro", total: 2 });
    expect(p.origemMes).toHaveLength(2);
  });
});

describe("lerCsvLeads", () => {
  it("lê ponto e vírgula, aspas, BOM e data brasileira", () => {
    const csv = String.fromCharCode(0xfeff) + 'Nome;Telefone;Origem;Status;Anotações;Proximo_toque\n"Silva, Ana";44999990000;personal;em_contato;"disse ""sim""";30/09/2026\n;;;;;\n;+55 44 8888-7777;xyz;;;';
    const { leads, ignoradas } = lerCsvLeads(csv);
    expect(ignoradas).toBe(1);
    expect(leads[0]).toMatchObject({ nome: "Silva, Ana", origem: "personal", status: "em_contato", anotacoes: 'disse "sim"', proximo_toque: "2026-09-30" });
    expect(leads[1]).toMatchObject({ nome: "+55 44 8888-7777", origem: "outro", status: "novo" });
  });
});
