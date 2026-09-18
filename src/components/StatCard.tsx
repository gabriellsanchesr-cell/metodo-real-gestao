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
        "border-border/60 shadow-sm transition-all duration-200",
        clicavel && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30",
      )}
    >
      <CardContent className="flex items-start gap-4 p-5">
        {Icon && (
          <div className={cn("shrink-0 rounded-xl p-2.5", cores.fundo)}>
            <Icon className={cn("h-5 w-5", cores.icone)} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold leading-tight text-foreground">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Grade padrão para uma linha de indicadores. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
