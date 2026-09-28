import { useEffect, useId, useState } from "react";
import { Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PacienteArquivavel { id: string; nome_completo: string; account_status?: string | null }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pacientes: PacienteArquivavel[];
  /** bloquear: também bloquear o acesso ao portal de quem está liberada. */
  onConfirmar: (bloquear: boolean) => void;
}

/**
 * Confirmação de arquivar, com a opção de bloquear o portal junto. Arquivar
 * sozinho só tira da lista: quem tinha login continuava entrando no portal
 * (caso da Mayara e da amanda carvalho). A caixa vem desmarcada, como todas
 * as ações que afetam a paciente.
 */
export function ArquivarPacientesDialog({ open, onOpenChange, pacientes, onConfirmar }: Props) {
  const [bloquear, setBloquear] = useState(false);
  const id = useId();
  useEffect(() => { if (open) setBloquear(false); }, [open]);

  const comAcesso = pacientes.filter((p) => p.account_status === "ativo");
  const n = pacientes.length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar {n} paciente{n !== 1 ? "s" : ""}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                {pacientes.slice(0, 5).map((p) => p.nome_completo.trim()).join(", ")}
                {n > 5 ? ` e mais ${n - 5}.` : "."}
              </p>
              <p>
                Saem da lista e passam a aparecer só no filtro "Arquivados". Nada é apagado, e dá para
                reativar depois.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {comAcesso.length > 0 && (
          <label
            htmlFor={id}
            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
          >
            <Checkbox id={id} checked={bloquear} onCheckedChange={(v) => setBloquear(v === true)} className="mt-0.5" />
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="block font-medium text-foreground">Bloquear também o acesso ao portal</span>
              <span className="block text-xs text-muted-foreground">
                {comAcesso.length === 1
                  ? `${comAcesso[0].nome_completo.trim()} ainda consegue entrar no portal.`
                  : `${comAcesso.length} delas ainda conseguem entrar no portal.`}
                {" "}Sem marcar, o login continua funcionando.
              </span>
            </span>
          </label>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onOpenChange(false); onConfirmar(bloquear); }}>
            {bloquear ? "Arquivar e bloquear" : "Arquivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
