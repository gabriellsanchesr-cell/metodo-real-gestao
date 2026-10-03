/**
 * "Ver como paciente": o nutri abre o portal de uma paciente sem trocar de
 * login. Em modo visualização o portal mostra tudo e não grava nada: não
 * marca mensagem como lida, não zera contador, não registra diário, peso,
 * meta nem visualização de conteúdo, e não mexe no armazenamento local da
 * paciente. Cada componente que escreve pergunta aqui antes.
 */
import { createContext, useContext, type ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

interface PortalModo {
  modoVisualizacao: boolean;
}

const Ctx = createContext<PortalModo>({ modoVisualizacao: false });

export function PortalModoProvider({ modoVisualizacao, children }: PortalModo & { children: ReactNode }) {
  return <Ctx.Provider value={{ modoVisualizacao }}>{children}</Ctx.Provider>;
}

export function usePortalModo(): PortalModo {
  return useContext(Ctx);
}

/** Para ações que a paciente faria (enviar, salvar): avisa e devolve true quando deve parar. */
export function bloqueadoNaVisualizacao(modoVisualizacao: boolean): boolean {
  if (!modoVisualizacao) return false;
  toast({
    title: "Modo visualização",
    description: "Aqui você vê o portal como a paciente vê. Nada é salvo.",
  });
  return true;
}
