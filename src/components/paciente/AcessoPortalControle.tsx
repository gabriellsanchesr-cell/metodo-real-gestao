import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Props {
  nome: string;
  /** account_status: "ativo" | "desativado" | "sem_conta" (ou null). */
  status: string | null;
  carregando: boolean;
  onCriar: () => void;
  onLiberar: () => void;
  onBloquear: () => void;
  /** Versão menor, para a linha da lista de pacientes. */
  compacto?: boolean;
}

/**
 * Liga e desliga o acesso da paciente ao portal. É separado de arquivar:
 * arquivar tira a paciente da lista, mas não impede o login; é aqui que o
 * login é bloqueado. Bloquear pede confirmação; liberar não.
 */
export function AcessoPortalControle({ nome, status, carregando, onCriar, onLiberar, onBloquear, compacto = false }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const primeiro = nome.trim().split(/\s+/)[0];

  if (!status || status === "sem_conta") {
    return (
      <Button
        size="sm"
        variant={compacto ? "outline" : "default"}
        onClick={onCriar}
        className={cn("rounded-lg", compacto ? "h-7 px-2 text-[11px]" : "h-9")}
        title="A paciente ainda não tem login no portal"
      >
        <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Criar acesso
      </Button>
    );
  }

  const liberado = status === "ativo";

  return (
    <>
      <label
        className={cn(
          "inline-flex cursor-pointer select-none items-center gap-2 rounded-lg border font-medium transition-colors",
          compacto ? "h-7 px-2 text-[11px]" : "h-9 px-2.5 text-xs",
          liberado ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive",
        )}
        title={liberado ? `${primeiro} consegue entrar no portal` : `${primeiro} não consegue entrar no portal`}
      >
        {carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        <span className="whitespace-nowrap">
          {compacto ? (liberado ? "Liberado" : "Bloqueado") : `Portal ${liberado ? "liberado" : "bloqueado"}`}
        </span>
        <Switch
          checked={liberado}
          disabled={carregando}
          aria-label="Acesso ao portal"
          className={compacto ? "scale-90" : undefined}
          onCheckedChange={(v) => (v ? onLiberar() : setConfirmando(true))}
        />
      </label>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear o acesso de {primeiro} ao portal?</AlertDialogTitle>
            <AlertDialogDescription>
              {primeiro} deixa de conseguir entrar no portal na hora. Nada é apagado: plano, diário,
              avaliações e mensagens continuam guardados, e dá para liberar de novo por este mesmo botão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmando(false); onBloquear(); }}>Bloquear acesso</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
