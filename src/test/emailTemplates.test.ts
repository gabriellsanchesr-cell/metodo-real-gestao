import { describe, it, expect } from "vitest";
import {
  TIPOS, montarEmail, escapar, limparTitulo, primeiroNome, formatarDataHora, isTipoAviso,
} from "../../supabase/functions/notificar-paciente/templates";

const ctx = {
  nomePaciente: "Maria Clara Souza",
  nomeClinica: "Método R.E.A.L",
  urlApp: "https://app.exemplo.com.br/",
  whatsapp: "(44) 99999-0000",
};

describe("todos os tipos de aviso", () => {
  for (const tipo of TIPOS) {
    it(`${tipo} monta assunto, HTML e texto`, () => {
      const e = montarEmail(tipo, { titulo: "Plano Setembro", data: "2026-09-25T17:30:00Z" }, ctx);
      expect(e.assunto.length).toBeGreaterThan(5);
      expect(e.html).toContain("Olá, Maria.");
      expect(e.texto).toContain("Olá, Maria.");
      expect(e.texto).toContain("https://app.exemplo.com.br/");
    });

    it(`${tipo} respeita a voz da marca`, () => {
      const e = montarEmail(tipo, { titulo: "X", data: "2026-09-25T17:30:00Z" }, ctx);
      const tudo = e.assunto + e.html + e.texto;
      expect(tudo, "travessão").not.toMatch(/[—–]/);
      expect(tudo, "emoji").not.toMatch(/\p{Extended_Pictographic}/u);
      expect(tudo.toLowerCase()).not.toMatch(/\b(secar|culpa|disciplina|projeto verão)\b/);
    });
  }
});

describe("seguranca", () => {
  it("escapa HTML vindo do titulo", () => {
    const e = montarEmail("plano_novo", { titulo: '<script>alert(1)</script>' }, ctx);
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
  });

  it("escapa o nome da paciente", () => {
    const e = montarEmail("plano_novo", {}, { ...ctx, nomePaciente: '<img src=x onerror=1> Ana' });
    expect(e.html).not.toContain("<img src=x");
  });

  it("ignora token de questionario com caracteres estranhos", () => {
    const ok = montarEmail("questionario_enviado", { token: "abc123XYZ_-9" }, ctx);
    expect(ok.texto).toContain("/questionario/abc123XYZ_-9");

    const ruim = montarEmail("questionario_enviado", { token: "../../admin?x=1" }, ctx);
    expect(ruim.texto).not.toContain("admin");
    expect(ruim.texto).toContain("/portal");
  });

  it("so usa logo servido por https", () => {
    const http = montarEmail("plano_novo", {}, { ...ctx, logoUrl: "http://inseguro/logo.png" });
    expect(http.html).not.toContain("inseguro");
    const https = montarEmail("plano_novo", {}, { ...ctx, logoUrl: "https://cdn.exemplo/logo.png" });
    expect(https.html).toContain("https://cdn.exemplo/logo.png");
  });

  it("reconhece somente os tipos conhecidos", () => {
    expect(isTipoAviso("plano_novo")).toBe(true);
    expect(isTipoAviso("qualquer_coisa")).toBe(false);
    expect(isTipoAviso(42)).toBe(false);
  });
});

describe("utilitarios", () => {
  it("escapar cobre os cinco caracteres perigosos", () => {
    expect(escapar(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("limparTitulo remove quebras de linha e corta o tamanho", () => {
    expect(limparTitulo("Plano\n\nnovo")).toBe("Plano novo");
    expect(limparTitulo("x".repeat(300))!.length).toBe(120);
    expect(limparTitulo("   ")).toBeNull();
    expect(limparTitulo(123)).toBeNull();
  });

  it("primeiroNome", () => {
    expect(primeiroNome("  Ana Paula Lima ")).toBe("Ana");
  });

  it("formata data e hora no horario de Brasilia", () => {
    // 17:30 UTC = 14:30 em Brasília
    expect(formatarDataHora("2026-09-25T17:30:00Z")).toBe("sexta-feira, 25 de setembro, às 14h30");
    expect(formatarDataHora("2026-09-25T13:00:00Z")).toBe("sexta-feira, 25 de setembro, às 10h");
    expect(formatarDataHora("nao-e-data")).toBeNull();
  });

  it("consulta sem data ainda produz texto correto", () => {
    const e = montarEmail("consulta_agendada", {}, ctx);
    expect(e.texto).toContain("Sua consulta foi agendada.");
  });

  it("inclui o WhatsApp so com digitos", () => {
    const e = montarEmail("plano_novo", {}, ctx);
    expect(e.html).toContain("https://wa.me/44999990000");
  });
});
