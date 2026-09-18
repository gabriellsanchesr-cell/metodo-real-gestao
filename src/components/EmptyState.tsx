import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Uma frase curta dizendo o que não existe ainda. */
  title: string;
  /** Opcional: o que fazer a respeito. */
  description?: string;
  /** Botão de ação, quando houver um passo óbvio. */
  action?: ReactNode;
  className?: string;
  /** Para caber dentro de um card pequeno, sem dominar a tela. */
  compact?: boolean;
}

/**
 * Estado vazio padrão. Antes cada tela resolvia isso do seu jeito: umas
 * mostravam ícone e frase, outras deixavam a área em branco.
 */
export function EmptyState({
  icon: Icon, title, description, action, className, compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/70",
            compact ? "h-10 w-10 mb-3" : "h-14 w-14 mb-4",
          )}
        >
          <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
        </div>
      )}
      <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
