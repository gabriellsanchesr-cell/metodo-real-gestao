import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { avisarPaciente, type DadosAviso, type TipoAviso } from "@/lib/notificacoes";
import { cn } from "@/lib/utils";

interface Opcao { tipo: TipoAviso; rotulo: string; detalhe?: string }

interface Props {
  pacienteId: string;
  /** Um tipo só, ou opções para escolher na hora (plano novo x ajustado). */
  opcoes: Opcao[];
  dados?: DadosAviso;
  /** O que vai ser avisado, para a pergunta de confirmação. */
  oQue: string;
  /** Quando não faz sentido avisar (ex.: plano inativo, a paciente não vê). */
  bloqueadoPor?: string | null;
  className?: string;
}

/**
 * Avisar a paciente depois, com um clique. Existe ao lado da caixa "Avisar a
 * paciente por e-mail" para quem prefere subir, conferir, refazer e só então
 * avisar. Pede confirmação porque o e-mail sai de verdade.
 */
export function AvisarAgoraButton({ pacienteId, opcoes, dados = {}, oQue, bloqueadoPor, className }: Props) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [tipo, setTipo] = useState<TipoAviso>(opcoes[0].tipo);

  const enviar = async () => {
    setEnviando(true);
    try {
      await avisarPaciente(pacienteId, tipo, dados);
    } finally {
      setEnviando(false);
      setAberto(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", className)}
        title={bloqueadoPor || "Avisar a paciente por e-mail agora"}
        aria-label="Avisar a paciente por e-mail"
        disabled={!!bloqueadoPor || enviando}
        onClick={() => { setTipo(opcoes[0].tipo); setAberto(true); }}
      >
        {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
      </Button>

      <AlertDialog open={aberto} onOpenChange={(o) => !enviando && setAberto(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avisar a paciente por e-mail?</AlertDialogTitle>
            <AlertDialogDescription>
              Vai sair agora um e-mail sobre {oQue}, com o link para o portal.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {opcoes.length > 1 && (
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoAviso)} className="gap-2">
              {opcoes.map((o) => (
                <Label
                  key={o.tipo}
                  htmlFor={`aviso-${o.tipo}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 font-normal has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem id={`aviso-${o.tipo}`} value={o.tipo} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{o.rotulo}</span>
                    {o.detalhe && <span className="block text-xs text-muted-foreground">{o.detalhe}</span>}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); enviar(); }} disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar aviso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
