import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { MAIN_NAV, CONFIG_NAV } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 bg-gradient-to-b from-sidebar-accent/30 to-transparent">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Método R.E.A.L" className="h-10 w-10 rounded-lg object-contain" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-primary-foreground">Método R.E.A.L</span>
              <span className="text-xs text-sidebar-foreground/60">Área de membros</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold border-l-[3px] border-sidebar-primary ml-0"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {!collapsed && item.url === "/chat" && unreadChat > 0 && (
                        <Badge className="h-4 min-w-[16px] text-[9px] px-1 bg-destructive text-destructive-foreground">
                          {unreadChat > 99 ? "99+" : unreadChat}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && configItems.length > 0 && (
                <>
                  {!collapsed && (
                    <div className="px-3 py-2">
                      <Separator className="bg-sidebar-border mb-2" />
                      <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                        Configurações
                      </div>
                    </div>
                  )}
                  {configItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold border-l-[3px] border-sidebar-primary ml-0"
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!collapsed && <span className="flex-1">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          {!collapsed && (
            <div className="px-3 py-2 flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary text-xs font-bold shrink-0">
                {userInitial}
              </div>
              <span className="text-xs text-sidebar-foreground/70 truncate">{userEmail}</span>
            </div>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sair"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
