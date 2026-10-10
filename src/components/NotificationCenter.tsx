import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, MessageSquare, BookMarked, CalendarClock, CalendarCheck, Scale, ClipboardCheck, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useVencimentos } from "@/hooks/useVencimentos";
import { formatarData as formatarDataVenc, rotuloPrazo } from "@/lib/vencimento";
import { consultasParaFechar } from "@/lib/painel";
import { pontosDeAtencao } from "@/lib/checkin";

/**
 * O que pede atenção agora, montado a partir dos dados que já existem.
 *
 * Antes o sino lia a tabela `notificacoes`, que nada no sistema preenchia:
 * o número dele era só vencimento, e as abas "check-ins" e "mensagens"
 * ficavam sempre vazias.
 */

interface Item {
  chave: string;
  titulo: string;
  detalhe: string;
  link: string;
}

interface Grupo {
  id: "mensagens" | "diario" | "checkins" | "agenda" | "pesos" | "vencimentos";
  rotulo: string;
  icone: LucideIcon;
  cor: string;
  /** Conta no número do sino. Pesos lançados são novidade, não pendência. */
  pendencia: boolean;
  itens: Item[];
  verTodos?: string;
}

type Filtro = "todas" | Grupo["id"];

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const venc = useVencimentos();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [open, setOpen] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) return;
    const agora = new Date();
    const semana = format(subDays(agora, 7), "yyyy-MM-dd");
    const [conv, diario, consultas, pesos, checkins] = await Promise.all([
      supabase.from("conversas").select("id, nao_lidas_nutri, pacientes(nome_completo)").gt("nao_lidas_nutri", 0),
      supabase.from("diario_registros").select("paciente_id, pacientes(nome_completo)").eq("visto_nutri", false).gte("data_registro", semana),
      supabase.from("consultas").select("id, data_hora, status, paciente_id, pacientes(nome_completo)").eq("status", "agendado").lt("data_hora", agora.toISOString()),
      // Coluna da migration de 30/09: antes dela a busca falha e o grupo some.
      supabase.from("acompanhamentos").select("id, paciente_id, peso, data_registro, pacientes(nome_completo)")
        .eq("registrado_pela_paciente", true).gte("data_registro", semana).order("data_registro", { ascending: false }),
      // Tabela da migration de 10/10: antes dela a busca falha e o grupo some.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("checkins_semanais").select("*, pacientes(nome_completo)")
        .eq("visto_nutri", false).gte("semana", format(subDays(agora, 14), "yyyy-MM-dd")).order("created_at", { ascending: false }),
    ]);

    const nome = (x: { pacientes?: { nome_completo?: string } | null }) => x.pacientes?.nome_completo?.trim() || "Paciente";

    const diarioPorPaciente = new Map<string, { nome: string; n: number }>();
    for (const r of diario.data || []) {
      const atual = diarioPorPaciente.get(r.paciente_id) ?? { nome: nome(r), n: 0 };
      atual.n++;
      diarioPorPaciente.set(r.paciente_id, atual);
    }

    setGrupos([
      {
        id: "mensagens", rotulo: "Mensagens", icone: MessageSquare, cor: "text-sky-600", pendencia: true, verTodos: "/chat",
        itens: (conv.data || []).map((c) => ({
          chave: c.id, titulo: nome(c), detalhe: plural(c.nao_lidas_nutri || 0, "mensagem nova", "mensagens novas"), link: "/chat",
        })),
      },
      {
        id: "diario", rotulo: "Diário", icone: BookMarked, cor: "text-violet-600", pendencia: true, verTodos: "/diarios",
        itens: [...diarioPorPaciente.entries()].map(([id, v]) => ({
          chave: id, titulo: v.nome, detalhe: `${plural(v.n, "registro", "registros")} para ver`, link: "/diarios",
        })),
      },
      {
        id: "checkins", rotulo: "Check-ins para ver", icone: ClipboardCheck, cor: "text-primary", pendencia: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itens: checkins.error ? [] : (checkins.data || []).map((c: any) => {
          const atencao = pontosDeAtencao(c).map((p) => p.rotulo.toLowerCase());
          return {
            chave: c.id, titulo: nome(c),
            detalhe: atencao.length ? `Atenção em: ${atencao.slice(0, 3).join(", ")}` : "Semana sem pontos de atenção",
            link: `/pacientes/${c.paciente_id}?secao=checkin`,
          };
        }),
      },
      {
        id: "agenda", rotulo: "Consultas para fechar", icone: CalendarCheck, cor: "text-amber-600", pendencia: true, verTodos: "/agenda",
        itens: consultasParaFechar(consultas.data || [], agora).map((c) => ({
          chave: c.id, titulo: nome(c),
          detalhe: `${format(new Date(c.data_hora), "dd/MM 'às' HH:mm")}: marcar realizada ou falta`, link: "/agenda",
        })),
      },
      {
        id: "pesos", rotulo: "Pesos lançados no portal", icone: Scale, cor: "text-emerald-600", pendencia: false,
        itens: pesos.error ? [] : (pesos.data || []).map((a) => ({
          chave: a.id, titulo: nome(a),
          detalhe: `${Number(a.peso).toLocaleString("pt-BR")} kg em ${a.data_registro.split("-").reverse().slice(0, 2).join("/")}`,
          link: `/pacientes/${a.paciente_id}?secao=acompanhamento`,
        })),
      },
    ]);
  }, [user]);

  useEffect(() => { carregar(); }, [carregar]);

  // Mensagem ou registro de diário novo atualiza o sino na hora.
  useEffect(() => {
    if (!user) return;
    const canal = supabase
      .channel("notificacoes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "diario_registros" }, () => carregar())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, () => carregar())
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins_semanais" }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [user, carregar]);

  const grupoVenc: Grupo = {
    id: "vencimentos", rotulo: "Planos vencendo", icone: CalendarClock, cor: "text-amber-600", pendencia: true, verTodos: "/vencimentos",
    itens: venc.urgentes.slice(0, 8).map((v) => ({
      chave: v.contrato.id, titulo: v.nome,
      detalhe: `${rotuloPrazo(v.dias)} · ${formatarDataVenc(v.contrato.data_vencimento)}`,
      link: `/pacientes/${v.pacienteId}?secao=contrato`,
    })),
  };
  const todos = [...grupos, grupoVenc].filter((g) => g.itens.length > 0);
  const total = todos.filter((g) => g.pendencia).reduce((a, g) => a + (g.id === "vencimentos" ? venc.urgentes.length : g.itens.length), 0);
  const visiveis = filtro === "todas" ? todos : todos.filter((g) => g.id === filtro);

  const ir = (link: string) => { navigate(link); setOpen(false); };

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) { carregar(); venc.recarregar(); } }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={total ? `Notificações, ${total} pendências` : "Notificações"}>
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 sm:w-[380px] sm:max-w-[380px]">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-sm">O que pede atenção</SheetTitle>
          {todos.length > 1 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {[{ id: "todas" as Filtro, rotulo: "Tudo" }, ...todos.map((g) => ({ id: g.id as Filtro, rotulo: g.rotulo }))].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filtro === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {f.rotulo}
                </button>
              ))}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-110px)]">
          {visiveis.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nada pendente agora.</p>
            </div>
          ) : visiveis.map((g) => (
            <div key={g.id} className="border-b border-border">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${g.cor}`}>
                  <g.icone className="h-3.5 w-3.5" /> {g.rotulo}
                </p>
                {g.verTodos && (
                  <button className="text-[11px] font-medium text-primary hover:underline" onClick={() => ir(g.verTodos!)}>
                    Abrir
                  </button>
                )}
              </div>
              {g.itens.map((i) => (
                <button
                  key={i.chave}
                  onClick={() => ir(i.link)}
                  className="flex w-full flex-col items-start px-4 py-2 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="truncate text-xs font-semibold text-foreground">{i.titulo}</span>
                  <span className="text-[11px] text-muted-foreground">{i.detalhe}</span>
                </button>
              ))}
              <div className="pb-2" />
            </div>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
