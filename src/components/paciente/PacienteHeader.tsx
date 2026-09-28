import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Pencil, MoreVertical } from "lucide-react";
import { AcessoPortalControle } from "./AcessoPortalControle";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const faseLabels: Record<string, { label: string; color: string }> = {
  rotina: { label: "Rotina", color: "bg-primary/10 text-primary border-primary/20" },
  estrategia: { label: "Estratégia", color: "bg-warning/10 text-warning border-warning/20" },
  autonomia: { label: "Autonomia", color: "bg-success/10 text-success border-success/20" },
  liberdade: { label: "Liberdade", color: "bg-accent text-accent-foreground border-accent" },
};

// Selo do CADASTRO (arquivada ou não). O acesso ao portal tem controle
// próprio ao lado; antes os dois diziam "Ativo/Inativo" e se confundiam.
const statusLabels: Record<string, { label: string; color: string }> = {
  ativo: { label: "Em acompanhamento", color: "bg-success/10 text-success border-success/20" },
  arquivada: { label: "Arquivada", color: "bg-muted text-muted-foreground border-border" },
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

interface PacienteHeaderProps {
  paciente: any;
  activeSection: string;
  sectionLabel: string;
  onCreateAccess: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  actionLoading: boolean;
}

export function PacienteHeader({
  paciente, activeSection, sectionLabel,
  onCreateAccess, onDeactivate, onReactivate, onDelete, onEdit,
  actionLoading,
}: PacienteHeaderProps) {
  const navigate = useNavigate();
  const status = paciente.account_status || "sem_conta";
  const fase = paciente.fase_real || "rotina";
  const age = useMemo(() => calcAge(paciente.data_nascimento), [paciente.data_nascimento]);
  const faseCfg = faseLabels[fase] || faseLabels.rotina;
  const isAtivo = paciente.ativo !== false;
  const statusCfg = isAtivo ? statusLabels.ativo : statusLabels.arquivada;

  return (
    <div className="bg-gradient-to-r from-card to-card/80 border-b border-border">
      <div className="px-4 md:px-6 pt-3 md:pt-4 pb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); navigate("/pacientes"); }}>
                Pacientes
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem className="hidden sm:flex">
              <BreadcrumbLink href="#" onClick={(e) => e.preventDefault()} className="max-w-[200px] truncate">
                {paciente.nome_completo}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[140px] sm:max-w-none">{sectionLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="px-4 md:px-6 pb-3 md:pb-4 flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pacientes")} className="shrink-0 h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-base md:text-lg shrink-0 shadow-md">
          {getInitials(paciente.nome_completo)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base md:text-xl font-bold text-foreground truncate">{paciente.nome_completo}</h1>
            {age !== null && <span className="text-xs md:text-sm text-muted-foreground shrink-0">{age} anos</span>}
            {/* Acesso ao portal colado ao nome, em qualquer tela. */}
            <AcessoPortalControle
              compacto
              nome={paciente.nome_completo}
              status={status}
              carregando={actionLoading}
              onCriar={onCreateAccess}
              onLiberar={onReactivate}
              onBloquear={onDeactivate}
            />
          </div>
          <div className="flex gap-1.5 mt-1 md:mt-1.5 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2 md:px-2.5 py-0.5 text-[10px] md:text-xs font-semibold transition-colors ${faseCfg.color}`}>
              {faseCfg.label}
            </span>
            <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 md:px-2.5 py-0.5 text-[10px] md:text-xs font-semibold ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex gap-2 flex-wrap shrink-0">
          <Button size="sm" variant="outline" onClick={onEdit} className="rounded-lg">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete} className="rounded-lg">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
          </Button>
        </div>

        {/* Mobile actions: dropdown */}
        <div className="md:hidden shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
