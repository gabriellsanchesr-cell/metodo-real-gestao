import type { Situacao } from "@/lib/vencimento";

/**
 * Cores de cada situação de vencimento. Fica fora dos componentes para o
 * Dashboard, a página de Vencimentos e a ficha usarem exatamente o mesmo
 * código de cor (e para o fast refresh do Vite continuar funcionando nos
 * arquivos de componente).
 */
export const ESTILO_SITUACAO: Record<Situacao, { badge: string; barra: string; rotulo: string }> = {
  vencido: { badge: "bg-destructive/10 text-destructive border-destructive/30", barra: "[&>div]:bg-destructive", rotulo: "Vencido" },
  vence_hoje: { badge: "bg-destructive/10 text-destructive border-destructive/30", barra: "[&>div]:bg-destructive", rotulo: "Vence hoje" },
  vencendo: { badge: "bg-warning/10 text-warning border-warning/30", barra: "[&>div]:bg-warning", rotulo: "Vencendo" },
  em_dia: { badge: "bg-success/10 text-success border-success/30", barra: "[&>div]:bg-success", rotulo: "Em dia" },
};
