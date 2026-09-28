import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { separarPorAcesso } from "@/lib/acessoPortal";

const p = (nome: string, account_status: string | null) => ({ nome, account_status });

describe("separarPorAcesso", () => {
  // Caso real: só "Anna Maria" (sem conta) selecionada e "Desativar acesso"
  // não fazia nada, sem aviso.
  it("paciente sem conta fica de fora com o motivo", () => {
    const r = separarPorAcesso([p("Anna Maria", "sem_conta")], "deactivate");
    expect(r.aplicaveis).toHaveLength(0);
    expect(r.ignoradas[0].motivo).toBe("não tem conta no portal");
  });

  it("status vazio conta como sem conta", () => {
    expect(separarPorAcesso([p("X", null)], "reactivate").ignoradas[0].motivo).toBe("não tem conta no portal");
  });

  it("bloquear só pega quem está liberada; liberar só quem está bloqueada", () => {
    const lista = [p("A", "ativo"), p("B", "desativado"), p("C", "sem_conta")];
    const bloquear = separarPorAcesso(lista, "deactivate");
    expect(bloquear.aplicaveis.map((x) => x.nome)).toEqual(["A"]);
    expect(bloquear.ignoradas.map((x) => [x.paciente.nome, x.motivo])).toEqual([
      ["B", "já está bloqueada"],
      ["C", "não tem conta no portal"],
    ]);
    const liberar = separarPorAcesso(lista, "reactivate");
    expect(liberar.aplicaveis.map((x) => x.nome)).toEqual(["B"]);
    expect(liberar.ignoradas.find((x) => x.paciente.nome === "A")?.motivo).toBe("já está liberada");
  });
});
