import { describe, it, expect, vi, beforeEach } from "vitest";

const chamadas: string[] = [];
let erroNoBloqueio: string | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (v: { ativo: boolean }) => ({
        eq: async (_c: string, id: string) => { chamadas.push(`arquivar:${id}:${v.ativo}`); return { error: null }; },
      }),
    }),
    functions: {
      invoke: async (_n: string, { body }: { body: { action: string; paciente_id: string } }) => {
        chamadas.push(`${body.action}:${body.paciente_id}`);
        return erroNoBloqueio ? { data: { error: erroNoBloqueio }, error: null } : { data: { success: true }, error: null };
      },
    },
  },
}));

import { arquivarPaciente } from "@/lib/acessoPortal";

beforeEach(() => { chamadas.length = 0; erroNoBloqueio = null; });

describe("arquivarPaciente", () => {
  it("sem marcar a caixa, só arquiva (o login continua)", async () => {
    await arquivarPaciente({ id: "a", account_status: "ativo" }, false);
    expect(chamadas).toEqual(["arquivar:a:false"]);
  });

  it("marcando, arquiva e bloqueia quem está liberada", async () => {
    await arquivarPaciente({ id: "a", account_status: "ativo" }, true);
    expect(chamadas).toEqual(["arquivar:a:false", "deactivate:a"]);
  });

  it("marcando, não tenta bloquear quem não tem conta ou já está bloqueada", async () => {
    await arquivarPaciente({ id: "s", account_status: "sem_conta" }, true);
    await arquivarPaciente({ id: "d", account_status: "desativado" }, true);
    expect(chamadas).toEqual(["arquivar:s:false", "arquivar:d:false"]);
  });

  it("se o bloqueio falhar, avisa que o arquivamento valeu", async () => {
    erroNoBloqueio = "Paciente não tem conta vinculada";
    await expect(arquivarPaciente({ id: "a", account_status: "ativo" }, true))
      .rejects.toThrow("arquivada, mas o acesso não foi bloqueado: Paciente não tem conta vinculada");
    expect(chamadas[0]).toBe("arquivar:a:false");
  });
});
