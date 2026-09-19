import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { MAIN_NAV, CONFIG_NAV, GRUPOS_NAV } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarGroupLabel, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user, isAdmin, hasPermission } = useAuth();
  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      const { data } = await supabase
        .from("conversas")
        .select("nao_lidas_nutri")
        .eq("nutri_id", user.id);
      const total = (data || []).reduce((sum, c) => sum + (c.nao_lidas_nutri || 0), 0);
      setUnreadChat(total);
    };
    loadUnread();
    const channel = supabase
      .channel("sidebar-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas", filter: `nutri_id=eq.${user.id}` }, () => loadUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Quem enxerga cada item. As rotas, os titulos e os icones vem de
  // @/lib/navigation, para a sidebar e a barra superior nao divergirem.
  const canSee: Record<string, boolean> = {
    "/": true,
    "/pacientes": hasPermission("pacientes", "ver"),
    "/chat": hasPermission("comunicacao", "ver_chat"),
    "/planos": hasPermission("planos", "ver"),
    "/acompanhamento": hasPermission("avaliacoes", "ver_acompanhamento"),
    "/diarios": hasPermission("avaliacoes", "ver_acompanhamento"),
    "/agenda": hasPermission("consultas", "ver_agenda"),
    "/vencimentos": isAdmin || hasPermission("financeiro", "ver"),
    "/biblioteca": true,
    "/conteudo-real": isAdmin || hasPermission("planos", "ver"),
    "/suplementos": isAdmin || hasPermission("planos", "ver"),
    "/relatorios": isAdmin,
    "/templates": isAdmin || hasPermission("planos", "criar"),
    "/leads": isAdmin,
    "/financeiro": isAdmin || hasPermission("financeiro", "ver"),
  };

  const menuItems = MAIN_NAV.filter((item) => canSee[item.url]);
  const configItems = isAdmin ? CONFIG_NAV : [];

  const userEmail = user?.email || "";
  const userInitial = (userEmail[0] || "N").toUpperCase();

  const linkClasse =
    "group/link relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-white";
  // Item ativo: fundo claro e um traço dourado à esquerda, como marcador de página.
  const ativoClasse =
    "bg-sidebar-accent !text-white font-semibold before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary";

  const renderItem = (item: (typeof MAIN_NAV)[number], end = false) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild tooltip={item.title} className="h-auto p-0 hover:bg-transparent data-[active=true]:bg-transparent">
        <NavLink to={item.url} end={end} className={linkClasse} activeClassName={ativoClasse}>
          <item.icon className="h-[18px] w-[18px] shrink-0 opacity-80 group-hover/link:opacity-100" />
          {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
          {!collapsed && item.url === "/chat" && unreadChat > 0 && (
            <Badge className="h-[18px] min-w-[18px] justify-center rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground hover:bg-sidebar-primary">
              {unreadChat > 99 ? "99+" : unreadChat}
            </Badge>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const grupos = GRUPOS_NAV
    .map((g) => ({ ...g, itens: menuItems.filter((i) => i.grupo === g.id) }))
    .filter((g) => g.itens.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
            <img src="/logo.png" alt="Método R.E.A.L" className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold tracking-wide text-white">Método R.E.A.L</p>
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-primary">
                Área de membros
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2">
        {grupos.map((g) => (
          <SidebarGroup key={g.id} className="px-0 py-1.5">
            {!collapsed && (
              <SidebarGroupLabel className="h-6 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
                {g.rotulo}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">{g.itens.map((i) => renderItem(i, i.url === "/"))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {configItems.length > 0 && (
          <SidebarGroup className="px-0 py-1.5">
            {!collapsed && (
              <SidebarGroupLabel className="h-6 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
                Configurações
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">{configItems.map((i) => renderItem(i))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 rounded-xl px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {userInitial}
            </div>
            <span className="truncate text-xs text-sidebar-foreground/80">{userEmail}</span>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sair"
              className="rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="text-[13px]">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
