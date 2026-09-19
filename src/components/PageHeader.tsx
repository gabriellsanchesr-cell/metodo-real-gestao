import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  /** Nome da tela. Fica em text-2xl em toda a aplicação. */
  title: string;
  /** Linha de apoio abaixo do título. Serve bem para contagem ("22 pacientes"). */
  description?: string;
  icon?: LucideIcon;
  /** Botões de ação da tela, alinhados à direita. */
  children?: ReactNode;
}

/**
 * Cabeçalho padrão de página. Antes cada tela escrevia o próprio <h1>, o que
 * deixava o título mudando de tamanho e de cor conforme a aba.
 */
export function PageHeader({ title, description, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-3 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <span className="truncate">{title}</span>
        </h1>
        {description && (
          <p className={Icon ? "mt-1 pl-[52px] text-sm text-muted-foreground" : "mt-1 text-sm text-muted-foreground"}>{description}</p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}
