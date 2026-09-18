import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, X, CheckCheck, MessageSquare, ClipboardCheck, TrendingUp, AlertTriangle, Calendar, FileText, Eye, CalendarClock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useVencimentos } from "@/hooks/useVencimentos";
import { formatarData as formatarDataVenc, rotuloPrazo } from "@/lib/vencimento";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  cor: string;
  lida: boolean;
  link: string | null;
  created_at: string;
}

const ICON_MAP: Record<string, any> = {
  check_in: ClipboardCheck,
  evolucao: TrendingUp,
  sem_checkin: AlertTriangle,
  retorno_pendente: Calendar,
  mensagem: MessageSquare,
  questionario: FileText,
  plano_visualizado: Eye,
  consulta_hoje: Calendar,
};

const COR_MAP: Record<string, string> = {
  azul: "border-l-blue-500 bg-blue-50/50",
  verde: "border-l-emerald-500 bg-emerald-50/50",
  vermelho: "border-l-red-500 bg-red-50/50",
  amarelo: "border-l-amber-500 bg-amber-50/50",
};

const COR_ICON: Record<string, string> = {
  azul: "text-blue-500",
  verde: "text-emerald-500",
  vermelho: "text-red-500",
  amarelo: "text-amber-500",
};

type FilterType = "todas" | "nao_lidas" | "checkins" | "mensagens" | "alertas";

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<FilterType>("todas");
  const [open, setOpen] = useState(false);
  const venc = useVencimentos();
  const vencimentosUrgentes = venc.urgentes;
  const totalBadge = unreadCount + vencimentosUrgentes.length;

  const loadNotificacoes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const notifs = (data as Notificacao[]) || [];
    setNotificacoes(notifs);
    setUnreadCount(notifs.filter(n => !n.lida).length);
  };

  useEffect(() => { loadNotificacoes(); }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notificacoes-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notificacoes",
        filter: `user_id=eq.${user.id}`,
      }, () => { loadNotificacoes(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
    loadNotificacoes();
  };

  const handleClick = async (notif: Notificacao) => {
    if (!notif.lida) {
      await supabase.from("notificacoes").update({ lida: true }).eq("id", notif.id);
      loadNotificacoes();
    }
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  const filtered = notificacoes.filter(n => {
    if (filter === "nao_lidas") return !n.lida;
    if (filter === "checkins") return n.tipo === "check_in" || n.tipo === "sem_checkin";
    if (filter === "mensagens") return n.tipo === "mensagem";
    if (filter === "alertas") return n.cor === "vermelho" || n.cor === "amarelo";
    return true;
  });

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) venc.recarregar(); }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 sm:w-[380px] sm:max-w-[380px]">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm">Notificações</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={markAllRead}>
                <CheckCheck className="h-3 w-3 mr-1" /> Marcar todas como lidas
              </Button>
            )}
          </div>
          <div className="flex gap-1 mt-2">
            {(["todas", "nao_lidas", "checkins", "mensagens", "alertas"] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {f === "todas" ? "Todas" : f === "nao_lidas" ? "Não lidas" : f === "checkins" ? "Check-ins" : f === "mensagens" ? "Mensagens" : "Alertas"}
              </button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {(filter === "todas" || filter === "alertas") && vencimentosUrgentes.length > 0 && (
            <div className="border-b border-border bg-amber-50/40 dark:bg-amber-500/5">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Planos vencendo
                </p>
                <button
                  className="text-[11px] font-medium text-primary hover:underline"
                  onClick={() => { navigate("/vencimentos"); setOpen(false); }}
                >
                  Ver todos
                </button>
              </div>
              {vencimentosUrgentes.slice(0, 8).map((v) => (
                <button
                  key={v.contrato.id}
                  onClick={() => { navigate(`/pacientes/${v.pacienteId}?secao=contrato`); setOpen(false); }}
                  className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
                >
                  <CalendarClock className={`h-4 w-4 mt-0.5 shrink-0 ${v.dias < 0 ? "text-red-500" : "text-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{v.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {rotuloPrazo(v.dias)} · {formatarDataVenc(v.contrato.data_vencimento)}
                    </p>
                  </div>
                </button>
              ))}
              <p className="px-4 pb-2.5 text-[10px] text-muted-foreground">Saem daqui quando o plano é renovado ou encerrado.</p>
            </div>
          )}
          {filtered.length === 0 && vencimentosUrgentes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma notificação</p>
            </div>
          ) : filtered.length === 0 ? null : (
            filtered.map(notif => {
              const Icon = ICON_MAP[notif.tipo] || Bell;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 border-l-[3px] transition-colors hover:bg-muted/30 ${
                    COR_MAP[notif.cor] || ""
                  } ${!notif.lida ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${COR_ICON[notif.cor] || "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${!notif.lida ? "font-semibold" : "font-medium"} text-foreground`}>{notif.titulo}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.descricao}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {format(new Date(notif.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {!notif.lida && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
