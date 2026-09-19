import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatGrid, type StatTone } from "@/components/StatCard";
import { StatsSkeleton } from "@/components/Loading";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ESTILO_SITUACAO } from "@/components/paciente/estiloVencimento";
import { useVencimentos } from "@/hooks/useVencimentos";
import { formatarData as formatarDataVenc, rotuloPrazo } from "@/lib/vencimento";
import { Users, AlertTriangle, Scale, Calendar, Utensils, TrendingUp, CalendarClock, UserPlus } from "lucide-react";
import { format, subDays, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardData {
  totalPacientes: number;
  retornoPendente: number;
  semPesoSemana: number;
  proximasConsultas: Array<{ id: string; paciente_nome: string; data_hora: string; tipo: string }>;
  ultimosAcompanhamentos: Array<{ id: string; paciente_nome: string; data_registro: string; peso: number | null }>;
}

/** Data curta a partir de "2026-09-17", sem passar por fuso. */
function formatarData(dateStr: string) {
  const [ano, mes, dia] = dateStr.split("-");
  return dia && mes ? `${dia}/${mes}/${ano}` : dateStr;
}

function formatRelativeDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return `Hoje, ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Amanhã, ${format(d, "HH:mm")}`;
  return format(d, "dd/MM HH:mm", { locale: ptBR });
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const venc = useVencimentos();
  const [carregando, setCarregando] = useState(true);
  const [diariosSemRetorno, setDiariosSemRetorno] = useState(0);
  const [data, setData] = useState<DashboardData>({
    totalPacientes: 0,
    retornoPendente: 0,
    semPesoSemana: 0,
    proximasConsultas: [],
    ultimosAcompanhamentos: [],
  });

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    // Registros do diário não vistos, só da última semana. Há centenas de
    // registros antigos nunca marcados como vistos; contá-los aqui daria um
    // número que não diz nada sobre o dia de hoje.
    supabase
      .from("diario_registros")
      .select("id", { count: "exact", head: true })
      .eq("visto_nutri", false)
      .gte("data_registro", format(subDays(new Date(), 7), "yyyy-MM-dd"))
      .then(({ count }) => setDiariosSemRetorno(count ?? 0));

    const [pacientesRes, consultasRes, acompRes] = await Promise.all([
      supabase.from("pacientes").select("id, nome_completo").eq("ativo", true),
      supabase.from("consultas").select("id, data_hora, tipo, paciente_id, pacientes(nome_completo)").gte("data_hora", new Date().toISOString()).eq("status", "agendado").order("data_hora").limit(5),
      supabase.from("acompanhamentos").select("id, data_registro, peso, paciente_id, pacientes(nome_completo)").order("created_at", { ascending: false }).limit(5),
    ]);

    const pacientes = pacientesRes.data || [];
    const consultas = consultasRes.data || [];
    const acompanhamentos = acompRes.data || [];

    const trintaDias = subDays(new Date(), 30).toISOString();
    const { data: consultasRecentes } = await supabase
      .from("consultas")
      .select("paciente_id")
      .gte("data_hora", trintaDias)
      .eq("status", "realizado");

    const idsComConsulta = new Set((consultasRecentes || []).map((c: any) => c.paciente_id));
    const retornoPendente = pacientes.filter((p) => !idsComConsulta.has(p.id)).length;

    // format() usa a data local. toISOString() usaria UTC e, depois das 21h
    // no horário de Brasília, encurtaria a janela para 6 dias.
    const inicioSemana = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const { data: pesosRecentes } = await supabase
      .from("acompanhamentos")
      .select("paciente_id")
      .gte("data_registro", inicioSemana);
    const idsComPeso = new Set((pesosRecentes || []).map((a: any) => a.paciente_id));
    const semPesoSemana = pacientes.filter((p) => !idsComPeso.has(p.id)).length;

    setData({
      totalPacientes: pacientes.length,
      retornoPendente,
      semPesoSemana,
      proximasConsultas: consultas.map((c: any) => ({
        id: c.id,
        paciente_nome: c.pacientes?.nome_completo || "—",
        data_hora: c.data_hora,
        tipo: c.tipo,
      })),
      ultimosAcompanhamentos: acompanhamentos.map((a: any) => ({
        id: a.id,
        paciente_nome: a.pacientes?.nome_completo || "—",
        data_registro: a.data_registro,
        peso: a.peso,
      })),
    });
    setCarregando(false);
  };

  const cards: { label: string; value: number; icon: typeof Users; tone: StatTone }[] = [
    { label: "Pacientes Ativos", value: data.totalPacientes, icon: Users, tone: "primary" },
    { label: "Retorno Pendente", value: data.retornoPendente, icon: AlertTriangle, tone: "warning" },
    { label: "Sem Peso na Semana", value: data.semPesoSemana, icon: Scale, tone: "destructive" },
    { label: "Próximas Consultas", value: data.proximasConsultas.length, icon: Calendar, tone: "success" },
  ];

  const consultasHoje = data.proximasConsultas.filter((c) => isToday(new Date(c.data_hora))).length;
  const urgentesVenc = venc.semTabela ? 0 : venc.urgentes.length;

  /** Uma frase com o que pede atenção hoje, ou um respiro quando nada pede. */
  const resumoDoDia = carregando ? "Carregando o seu dia." : (() => {
    const partes: string[] = [];
    if (consultasHoje) partes.push(`${consultasHoje} consulta${consultasHoje > 1 ? "s" : ""} hoje`);
    if (diariosSemRetorno) partes.push(`${diariosSemRetorno} registro${diariosSemRetorno > 1 ? "s" : ""} de diário da semana para ver`);
    if (urgentesVenc) partes.push(`${urgentesVenc} plano${urgentesVenc > 1 ? "s" : ""} vencendo`);
    if (partes.length === 0) return "Nada urgente por aqui. Um bom dia para olhar a evolução das pacientes com calma.";
    const ultima = partes.pop();
    return `Hoje: ${partes.length ? `${partes.join(", ")} e ${ultima}` : ultima}.`;
  })();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <div className="space-y-6">
      <section className="bg-marca relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg shadow-primary/20 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-4 top-10 h-40 w-40 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="mt-2 text-3xl font-light tracking-tight sm:text-4xl">{greeting}.</h1>
            <p className="mt-2 max-w-md text-sm text-white/75">
              {resumoDoDia}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate("/pacientes/novo")}
              className="rounded-full bg-white text-primary shadow-none hover:bg-white/90"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Nova paciente
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/agenda")}
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Calendar className="mr-2 h-4 w-4" /> Agenda
            </Button>
          </div>
        </div>
      </section>

      {carregando ? (
        <StatsSkeleton />
      ) : (
        <StatGrid>
          {cards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
              onClick={() => navigate(card.label === "Próximas Consultas" ? "/agenda" : "/pacientes")}
            />
          ))}
        </StatGrid>
      )}

      {!venc.semTabela && (venc.urgentes.length > 0 || venc.semPlano.length > 0) && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Vencimentos</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/vencimentos")}>Ver todos</Button>
          </CardHeader>
          <CardContent className="pt-0">
            {venc.urgentes.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Nenhum plano vencendo nos próximos {venc.diasAlerta} dias.
                {venc.semPlano.length > 0 && ` ${venc.semPlano.length} paciente${venc.semPlano.length !== 1 ? "s" : ""} sem plano registrado.`}
              </p>
            ) : (
              <div className="space-y-1">
                {venc.urgentes.slice(0, 6).map((l) => (
                  <button
                    key={l.contrato.id}
                    onClick={() => navigate(`/pacientes/${l.pacienteId}?secao=contrato`)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{l.nome}</p>
                      <p className="text-xs text-muted-foreground">Vence em {formatarDataVenc(l.contrato.data_vencimento)}</p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 rounded-full ${ESTILO_SITUACAO[l.situacao].badge}`}>
                      {rotuloPrazo(l.dias)}
                    </Badge>
                  </button>
                ))}
                {venc.urgentes.length > 6 && (
                  <p className="px-3 pt-1 text-xs text-muted-foreground">e mais {venc.urgentes.length - 6}.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Próximas Consultas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.proximasConsultas.length === 0 ? (
              <EmptyState
                compact
                icon={Calendar}
                title="Nenhuma consulta agendada"
                description="As próximas consultas aparecem aqui assim que você agendar."
              />
            ) : (
              <div className="space-y-1">
                {data.proximasConsultas.map((c) => (
                  <div key={c.id} className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-foreground">{c.paciente_nome}</p>
                      <p className="text-xs text-muted-foreground capitalize">{c.tipo.replace("_", " ")}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                      {formatRelativeDate(c.data_hora)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Últimos Acompanhamentos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.ultimosAcompanhamentos.length === 0 ? (
              <EmptyState
                compact
                icon={TrendingUp}
                title="Nenhum acompanhamento registrado"
                description="Pesos e medidas registrados pelas pacientes aparecem aqui."
              />
            ) : (
              <div className="space-y-1">
                {data.ultimosAcompanhamentos.map((a) => (
                  <div key={a.id} className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-foreground">{a.paciente_nome}</p>
                      <p className="text-xs text-muted-foreground">{formatarData(a.data_registro)}</p>
                    </div>
                    {a.peso && (
                      <span className="text-sm font-semibold text-foreground bg-primary/10 px-2 py-1 rounded-md">
                        {a.peso} kg
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
