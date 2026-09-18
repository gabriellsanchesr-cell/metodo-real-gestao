import {
  LayoutDashboard, Users, Utensils, Activity, Calendar, BookOpen, FileText,
  MessageSquare, Settings, Sparkles, Pill, BarChart3, UserPlus, DollarSign, BookMarked, CalendarClock,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

/** Itens do menu principal, na ordem em que aparecem na sidebar. */
export const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pacientes", url: "/pacientes", icon: Users },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Planos Alimentares", url: "/planos", icon: Utensils },
  { title: "Acompanhamento", url: "/acompanhamento", icon: Activity },
  { title: "Diários Alimentares", url: "/diarios", icon: BookMarked },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Vencimentos", url: "/vencimentos", icon: CalendarClock },
  { title: "Biblioteca", url: "/biblioteca", icon: BookOpen },
  { title: "Conteúdo R.E.A.L.", url: "/conteudo-real", icon: Sparkles },
  { title: "Suplementos", url: "/suplementos", icon: Pill },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Leads", url: "/leads", icon: UserPlus },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
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
