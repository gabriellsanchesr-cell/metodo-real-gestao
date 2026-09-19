import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "primary" | "success" | "warning" | "destructive" | "neutral";

const TONS: Record<StatTone, { fundo: string; icone: string }> = {
  primary: { fundo: "bg-primary/10", icone: "text-primary" },
  success: { fundo: "bg-success/10", icone: "text-success" },
  warning: { fundo: "bg-warning/10", icone: "text-warning" },
  destructive: { fundo: "bg-destructive/10", icone: "text-destructive" },
  neutral: { fundo: "bg-muted", icone: "text-muted-foreground" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: StatTone;
  /** Linha de apoio abaixo do número. */
  hint?: string;
  onClick?: () => void;
}

/**
 * Cartão de indicador. Existe para o Dashboard, o Financeiro e os Relatórios
 * pararem de desenhar o mesmo cartão de três jeitos diferentes.
 */
export function StatCard({ label, value, icon: Icon, tone = "primary", hint, onClick }: StatCardProps) {
  const cores = TONS[tone];
  const clicavel = typeof onClick === "function";

  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-all duration-200",
        clicavel && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="line-clamp-2 text-[11px] font-semibold uppercase leading-snug tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          {Icon && (
            // No celular o ícone some: o rótulo precisa da largura toda.
            <div className={cn("hidden shrink-0 rounded-lg p-2 sm:block", cores.fundo)}>
              <Icon className={cn("h-4 w-4", cores.icone)} />
            </div>
          )}
        </div>
        <p
          className={cn(
            "mt-3 whitespace-nowrap font-light leading-none tracking-tight text-foreground tabular-nums",
            // Valor longo (moeda) usa corpo menor, para não quebrar o número no meio.
            String(value).length >= 9 ? "text-[20px] sm:text-[28px]" : "text-[26px] sm:text-[32px]",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Grade padrão para uma linha de indicadores. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  // Quatro colunas só em tela larga: com a Montserrat os rótulos não cabem antes.
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{children}</div>;
}
