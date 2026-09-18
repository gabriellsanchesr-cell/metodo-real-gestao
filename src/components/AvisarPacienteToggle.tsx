import { useId } from "react";
import { Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  /** Texto opcional; o padrão serve para quase todos os casos. */
  label?: string;
  className?: string;
}

/**
 * Caixa "Avisar a paciente por e-mail", colocada junto do botão de salvar
 * das ações que a paciente precisa saber. Vem marcada por padrão; desmarcar
 * serve para ajustes pequenos que não merecem e-mail.
 */
export function AvisarPacienteToggle({ checked, onCheckedChange, label, className }: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
        className,
      )}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-foreground">{label ?? "Avisar a paciente por e-mail"}</span>
    </label>
  );
}
