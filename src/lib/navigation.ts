import {
  LayoutDashboard, Users, Utensils, Activity, Calendar, BookOpen, FileText,
  MessageSquare, Settings, Sparkles, Pill, BarChart3, UserPlus, DollarSign, BookMarked, CalendarClock,
  type LucideIcon,
} from "lucide-react";

export type GrupoNav = "atendimento" | "nutricao" | "metodo" | "gestao";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  grupo?: GrupoNav;
}

/** Grupos da sidebar, na ordem em que aparecem. */
export const GRUPOS_NAV: { id: GrupoNav; rotulo: string }[] = [
  { id: "atendimento", rotulo: "Atendimento" },
  { id: "nutricao", rotulo: "Nutrição" },
  { id: "metodo", rotulo: "Método" },
  { id: "gestao", rotulo: "Gestão" },
];

/** Itens do menu principal. A ordem vale dentro de cada grupo. */
export const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, grupo: "atendimento" },
  { title: "Pacientes", url: "/pacientes", icon: Users, grupo: "atendimento" },
  { title: "Agenda", url: "/agenda", icon: Calendar, grupo: "atendimento" },
  { title: "Vencimentos", url: "/vencimentos", icon: CalendarClock, grupo: "atendimento" },
  { title: "Chat", url: "/chat", icon: MessageSquare, grupo: "atendimento" },
  { title: "Planos Alimentares", url: "/planos", icon: Utensils, grupo: "nutricao" },
  { title: "Acompanhamento", url: "/acompanhamento", icon: Activity, grupo: "nutricao" },
  { title: "Diários Alimentares", url: "/diarios", icon: BookMarked, grupo: "nutricao" },
  { title: "Biblioteca", url: "/biblioteca", icon: BookOpen, grupo: "nutricao" },
  { title: "Suplementos", url: "/suplementos", icon: Pill, grupo: "nutricao" },
  { title: "Templates", url: "/templates", icon: FileText, grupo: "nutricao" },
  { title: "Conteúdo R.E.A.L.", url: "/conteudo-real", icon: Sparkles, grupo: "metodo" },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, grupo: "gestao" },
  { title: "Leads", url: "/leads", icon: UserPlus, grupo: "gestao" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, grupo: "gestao" },
];

export const CONFIG_NAV: NavItem[] = [
  { title: "Geral", url: "/configuracoes/geral", icon: Settings },
  { title: "Usuários", url: "/configuracoes/usuarios", icon: Users },
];

/**
 * Rotas que não aparecem no menu mas precisam de nome na barra superior.
 * A chave é o caminho; o casamento é por prefixo mais longo, então
 * "/pacientes/novo" vence "/pacientes".
 */
const EXTRA_TITLES: Record<string, string> = {
  "/pacientes/novo": "Novo Paciente",
  "/configuracoes/geral": "Configurações da Clínica",
  "/configuracoes/usuarios": "Gestão de Usuários",
};

const TITLES: Record<string, string> = {
  ...Object.fromEntries(MAIN_NAV.map((i) => [i.url, i.title])),
  ...EXTRA_TITLES,
};

/**
 * Nome da tela atual. Casa pelo prefixo mais longo, de modo que rotas
 * com parâmetro (/pacientes/:id) herdem o nome da seção.
 */
export function getPageTitle(pathname: string): string {
  if (pathname === "/") return TITLES["/"];

  const match = Object.keys(TITLES)
    .filter((url) => url !== "/" && (pathname === url || pathname.startsWith(`${url}/`)))
    .sort((a, b) => b.length - a.length)[0];

  return match ? TITLES[match] : "";
}
