import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserMinus, ShieldCheck, ClipboardCheck, CalendarCheck, Clock, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, differenceInWeeks, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  pacientes: any[];
  consultas: any[];
  checklists: any[];
  periodoInicio: Date;
  periodoFim: Date;
  periodoAnteriorInicio: Date;
  periodoAnteriorFim: Date;
}

const COLORS_FASE = ["#2B3990", "#7C3AED", "#F59E0B", "#22C55E"];
const FASE_LABELS: Record<string, string> = {
  rotina: "Rotina",
  estrategia: "Estratégia",
  autonomia: "Autonomia",
  liberdade: "Liberdade",
};

export function VisaoGeralTab({ pacientes, consultas, checklists, periodoInicio, periodoFim, periodoAnteriorInicio, periodoAnteriorFim }: Props) {
  const stats = useMemo(() => {
    const ativos = pacientes.filter(p => p.ativo !== false);
    const inativos = pacientes.filter(p => p.ativo === false);

    const novosNoPeriodo = pacientes.filter(p => {
      const d = new Date(p.created_at);
      return d >= periodoInicio && d <= periodoFim;
    });
    const novosAnterior = pacientes.filter(p => {
      const d = new Date(p.created_at);
      return d >= periodoAnteriorInicio && d <= periodoAnteriorFim;
    });

    const consultasPeriodo = consultas.filter(c => {
      const d = new Date(c.data_hora);
      return d >= periodoInicio && d <= periodoFim && c.status === "realizado";
    });
    const consultasAnterior = consultas.filter(c => {
      const d = new Date(c.data_hora);
      return d >= periodoAnteriorInicio && d <= periodoAnteriorFim && c.status === "realizado";
    });

    const checkinsUltimaSemana = checklists.filter(c => {
      const d = new Date(c.created_at);
      return differenceInDays(new Date(), d) <= 7 && c.respondido;
    });
    // Conta PACIENTES distintos, não registros: dois check-ins da mesma
    // paciente são uma pessoa. Contando registros a taxa passava de 100%.
    const pacientesComCheckin = new Set(checkinsUltimaSemana.map(c => c.paciente_id)).size;
    const taxaCheckin = ativos.length > 0 ? Math.round((pacientesComCheckin / ativos.length) * 100) : 0;

    const semanasPeriodo = Math.max(1, differenceInWeeks(periodoFim, periodoInicio));
    const mediaConsultasSemana = Math.round((consultasPeriodo.length / semanasPeriodo) * 10) / 10;

    const temposAcomp = ativos.map(p => differenceInWeeks(new Date(), new Date(p.created_at)));
    const mediaAcomp = temposAcomp.length > 0 ? Math.round(temposAcomp.reduce((a, b) => a + b, 0) / temposAcomp.length) : 0;

    const ultimaConsulta = new Map<string, Date>();
    consultas.forEach(c => {
      const d = new Date(c.data_hora);
      const prev = ultimaConsulta.get(c.paciente_id);
      if (!prev || d > prev) ultimaConsulta.set(c.paciente_id, d);
    });
    const retornosPendentes = ativos.filter(p => {
      const last = ultimaConsulta.get(p.id);
      return !last || differenceInDays(new Date(), last) > 30;
    }).length;

    const taxaRetencao = pacientes.length > 0
      ? Math.round((ativos.length / pacientes.length) * 100)
      : 0;

    return {
      totalAtivos: ativos.length,
      totalInativos: inativos.length,
      novos: novosNoPeriodo.length,
      novosAnterior: novosAnterior.length,
      consultasPeriodo: consultasPeriodo.length,
      consultasAnterior: consultasAnterior.length,
      taxaCheckin,
      mediaConsultasSemana,
      mediaAcomp,
      retornosPendentes,
      taxaRetencao,
    };
  }, [pacientes, consultas, checklists, periodoInicio, periodoFim, periodoAnteriorInicio, periodoAnteriorFim]);

  const growthData = useMemo(() => {
    const months: { month: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const end = endOfMonth(d);
      const count = pacientes.filter(p => new Date(p.created_at) <= end && p.ativo !== false).length;
      months.push({ month: format(d, "MMM/yy", { locale: ptBR }), total: count });
    }
    return months;
  }, [pacientes]);

  const consultasMesData = useMemo(() => {
    const months: { month: string; primeira: number; retorno: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const mesConsultas = consultas.filter(c => {
        const dt = new Date(c.data_hora);
        return dt >= start && dt <= end && c.status === "realizado";
      });
      months.push({
        month: format(d, "MMM/yy", { locale: ptBR }),
        primeira: mesConsultas.filter(c => c.tipo === "primeira_consulta").length,
        retorno: mesConsultas.filter(c => c.tipo !== "primeira_consulta").length,
      });
    }
    return months;
  }, [consultas]);

  const faseData = useMemo(() => {
    const ativos = pacientes.filter(p => p.ativo !== false);
    const fases = ["rotina", "estrategia", "autonomia", "liberdade"];
    return fases.map(f => ({
      name: FASE_LABELS[f] || f,
      value: ativos.filter(p => p.fase_real === f).length,
    })).filter(f => f.value > 0);
  }, [pacientes]);

  function variacao(atual: number, anterior: number) {
    if (anterior === 0) return atual > 0 ? "+100%" : "—";
    const pct = Math.round(((atual - anterior) / anterior) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }

  const cards = [
    { title: "Pacientes Ativos", value: stats.totalAtivos, icon: Users, sub: `${variacao(stats.totalAtivos, stats.totalAtivos - stats.novos + stats.novosAnterior)} vs período anterior`, color: "text-[hsl(var(--primary))]" },
    { title: "Novos no Período", value: stats.novos, icon: UserPlus, sub: `${variacao(stats.novos, stats.novosAnterior)} vs anterior`, color: "text-green-600" },
    { title: "Inativos", value: stats.totalInativos, icon: UserMinus, sub: `Churn: ${pacientes.length > 0 ? Math.round((stats.totalInativos / pacientes.length) * 100) : 0}%`, color: "text-destructive" },
    { title: "Taxa de Retenção", value: `${stats.taxaRetencao}%`, icon: ShieldCheck, sub: "Pacientes ativos / total", color: "text-[hsl(var(--primary))]" },
    { title: "Taxa de Check-in", value: `${stats.taxaCheckin}%`, icon: ClipboardCheck, sub: "Última semana", color: "text-amber-600" },
    { title: "Consultas Realizadas", value: stats.consultasPeriodo, icon: CalendarCheck, sub: `${stats.mediaConsultasSemana}/semana`, color: "text-[hsl(var(--primary))]" },
    { title: "Tempo Médio Acomp.", value: `${stats.mediaAcomp} sem`, icon: Clock, sub: "Pacientes ativos", color: "text-muted-foreground" },
    { title: "Retornos Pendentes", value: stats.retornosPendentes, icon: AlertTriangle, sub: "> 30 dias sem consulta", color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.title}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{c.title}</p>
                  <p className="text-3xl font-extrabold mt-1">{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                </div>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Crescimento da Carteira</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2B3990" strokeWidth={2} dot={{ r: 3 }} name="Pacientes ativos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Consultas por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={consultasMesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="primeira" stackId="a" fill="#2B3990" name="Primeira consulta" />
                <Bar dataKey="retorno" stackId="a" fill="#5B6EC7" name="Retorno" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Distribuição por Fase R.E.A.L.</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={faseData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {faseData.map((_, i) => (
                    <Cell key={i} fill={COLORS_FASE[i % COLORS_FASE.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
