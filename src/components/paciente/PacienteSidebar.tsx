import { cn } from "@/lib/utils";
import {
  LayoutDashboard, User, ClipboardList, TrendingUp, Camera, Utensils,
  Calculator, CalendarDays, FileQuestion, TestTube, BookOpen, FileText, KeyRound,
  ChevronDown, Ruler, BookMarked, Target, FolderOpen, UtensilsCrossed, Pill, DollarSign,
  CalendarClock, Mail,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const sections = [
  { id: "visao-geral", label: "Visão Geral", icon: LayoutDashboard, group: "geral" },
  { id: "dados", label: "Dados do Paciente", icon: User, group: "geral" },
  { id: "contrato", label: "Plano contratado", icon: CalendarClock, group: "geral" },
  { id: "anamnese", label: "Anamnese", icon: ClipboardList, group: "clinico" },
  { id: "avaliacoes", label: "Avaliações Físicas", icon: Ruler, group: "clinico" },
  { id: "acompanhamento", label: "Acompanhamento Semanal", icon: TrendingUp, group: "clinico" },
  { id: "fotos", label: "Evolução Fotográfica", icon: Camera, group: "clinico" },
  { id: "diario", label: "Diário Alimentar", icon: BookMarked, group: "nutricao" },
  { id: "plano", label: "Plano Alimentar", icon: Utensils, group: "nutricao" },
  { id: "receituario", label: "Receituário", icon: UtensilsCrossed, group: "nutricao" },
  { id: "metas", label: "Metas", icon: Target, group: "nutricao" },
  { id: "materiais", label: "Materiais Extras", icon: FolderOpen, group: "nutricao" },
  { id: "suplementos", label: "Suplementos", icon: Pill, group: "nutricao" },
  { id: "calculo", label: "Cálculo Energético", icon: Calculator, group: "nutricao" },
  { id: "consultas", label: "Consultas", icon: CalendarDays, group: "outros" },
  { id: "questionarios", label: "Questionários", icon: FileQuestion, group: "outros" },
  { id: "exames", label: "Exames Laboratoriais", icon: TestTube, group: "outros" },
  { id: "orientacoes", label: "Orientações", icon: BookOpen, group: "outros" },
  { id: "prontuario", label: "Prontuário", icon: FileText, group: "outros" },
  { id: "financeiro", label: "Financeiro", icon: DollarSign, group: "outros" },
  { id: "emails", label: "E-mails enviados", icon: Mail, group: "outros" },
  { id: "acesso", label: "Acesso do Paciente", icon: KeyRound, group: "outros" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

interface PacienteSidebarProps {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}

export function PacienteSidebar({ active, onSelect }: PacienteSidebarProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeLabel = sections.find(s => s.id === active)?.label || "";

  if (isMobile) {
    return (
      <div className="bg-card border-b border-border px-4 py-2">
        <Button
          variant="outline"
          className="w-full justify-between rounded-xl"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span className="truncate">{activeLabel}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", mobileOpen && "rotate-180")} />
        </Button>
        {mobileOpen && (
          <div className="mt-2 space-y-0.5 pb-2 max-h-[60vh] overflow-y-auto animate-fade-in">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => { onSelect(s.id); setMobileOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-left",
                    active === s.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const groups = [
    { key: "geral", label: null },
    { key: "clinico", label: "Clínico" },
    { key: "nutricao", label: "Nutrição" },
    { key: "outros", label: "Outros" },
  ];

  return (
    <nav className="w-56 shrink-0 bg-card border-r border-border overflow-y-auto">
      <div className="py-3 px-2 space-y-1">
        {groups.map((group, gi) => (
          <div key={group.key}>
            {group.label && (
              <div className="px-3 pt-3 pb-1">
                <Separator className="mb-2" />
                <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
            )}
            {sections.filter(s => s.group === group.key).map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium border-l-[3px] border-primary pl-[9px]"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-[3px] border-transparent pl-[9px]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
