import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { differenceInDays } from "date-fns";
import { ClipboardCheck, Smartphone, BookOpen, UtensilsCrossed, Star, AlertTriangle } from "lucide-react";

interface Props {
  pacientes: any[];
  checklists: any[];
  diarioRegistros: any[];
  conteudoVis: any[];
}

export function EngajamentoTab({ pacientes, checklists, diarioRegistros, conteudoVis }: Props) {
  const ativos = useMemo(() => pacientes.filter(p => p.ativo !== false), [pacientes]);

  const checkinStats = useMemo(() => {
    const now = new Date();
    const semana = checklists.filter(c => differenceInDays(now, new Date(c.created_at)) <= 7 && c.respondido);
    const mes = checklists.filter(c => differenceInDays(now, new Date(c.created_at)) <= 28 && c.respondido);
    const trimestre = checklists.filter(c => differenceInDays(now, new Date(c.created_at)) <= 90 && c.respondido);

    const uniqueSemana = new Set(semana.map(c => c.paciente_id)).size;
    const uniqueMes = new Set(mes.map(c => c.paciente_id)).size;

    return {
      taxaSemana: ativos.length > 0 ? Math.round((uniqueSemana / ativos.length) * 100) : 0,
      taxaMes: ativos.length > 0 ? Math.round((uniqueMes / ativos.length) * 100) : 0,
      totalTrimestre: trimestre.length,
    };
  }, [checklists, ativos]);

  const portalStats = useMemo(() => {
    const comAcesso = pacientes.filter(p => p.auth_user_id).length;
    return { comAcesso, total: pacientes.length };
  }, [pacientes]);

  const diarioStats = useMemo(() => {
    const now = new Date();
    const semana = diarioRegistros.filter(r => differenceInDays(now, new Date(r.data_registro)) <= 7);
    const uniquePacientes = new Set(semana.map(r => r.paciente_id)).size;
    return {
      pacientesSemana: uniquePacientes,
      registrosSemana: semana.length,
    };
  }, [diarioRegistros]);

  const conteudoStats = useMemo(() => {
    const vistos = conteudoVis.filter(v => v.visto);
    const uniquePacientes = new Set(vistos.map(v => v.paciente_id)).size;
    return { pacientesEngajados: uniquePacientes, totalVis: vistos.length };
  }, [conteudoVis]);

  // Weekly check-in chart (12 weeks)
  const checkinWeekly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const weekStart = new Date(now.getTime() - (12 - i) * 7 * 86400000);
      const weekEnd = new Date(now.getTime() - (11 - i) * 7 * 86400000);
      const checks = checklists.filter(c => {
        const d = new Date(c.created_at);
        return d >= weekStart && d < weekEnd && c.respondido;
      });
      const unique = new Set(checks.map(c => c.paciente_id)).size;
      return {
        semana: `S${i + 1}`,
        taxa: ativos.length > 0 ? Math.round((unique / ativos.length) * 100) : 0,
      };
    });
  }, [checklists, ativos]);

  // Weekly adherence
  const aderenciaWeekly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const weekStart = new Date(now.getTime() - (12 - i) * 7 * 86400000);
      const weekEnd = new Date(now.getTime() - (11 - i) * 7 * 86400000);
      const checks = checklists.filter(c => {
        const d = new Date(c.created_at);
        return d >= weekStart && d < weekEnd && c.respondido && c.aderencia_plano != null;
      });
      const media = checks.length > 0
        ? Math.round(checks.reduce((s: number, c: any) => s + c.aderencia_plano, 0) / checks.length)
        : 0;
      return { semana: `S${i + 1}`, media };
    });
  }, [checklists]);

  // Low engagement patients
  const lowEngagement = useMemo(() => {
    const now = new Date();
    return ativos.filter(p => {
      const lastCheck = checklists.filter(c => c.paciente_id === p.id && c.respondido).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const daysSince = lastCheck ? differenceInDays(now, new Date(lastCheck.created_at)) : 999;
      return daysSince > 14;
    }).map(p => {
      const lastCheck = checklists.filter(c => c.paciente_id === p.id && c.respondido).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      return {
        nome: p.nome_completo,
        dias: lastCheck ? differenceInDays(now, new Date(lastCheck.created_at)) : 999,
      };
    }).sort((a, b) => b.dias - a.dias).slice(0, 10);
  }, [ativos, checklists]);

  const cards = [
    { title: "Check-in Semanal", value: `${checkinStats.taxaSemana}%`, icon: ClipboardCheck, sub: `Mensal: ${checkinStats.taxaMes}%`, color: "text-[hsl(var(--primary))]" },
    { title: "Acesso ao Portal", value: portalStats.comAcesso, icon: Smartphone, sub: `de ${portalStats.total} pacientes`, color: "text-[hsl(var(--primary))]" },
    { title: "Conteúdo R.E.A.L.", value: conteudoStats.pacientesEngajados, icon: BookOpen, sub: `${conteudoStats.totalVis} visualizações`, color: "text-amber-600" },
    { title: "Diário Alimentar", value: diarioStats.pacientesSemana, icon: UtensilsCrossed, sub: `${diarioStats.registrosSemana} registros/sem`, color: "text-green-600" },
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
          <CardHeader><CardTitle className="text-sm">Taxa de Check-in por Semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={checkinWeekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="taxa" stroke="#004AAD" strokeWidth={2} name="Taxa (%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Aderência Média Semanal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={aderenciaWeekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="media" stroke="#22C55E" strokeWidth={2} name="Aderência (%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Low engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Pacientes com Baixo Engajamento
          </CardTitle>
          <p className="text-xs text-muted-foreground">Sem check-in há mais de 14 dias</p>
        </CardHeader>
        <CardContent>
          {lowEngagement.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> Todos os pacientes estão engajados!
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-2">
              {lowEngagement.map((p, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                  <span className="text-sm">{p.nome}</span>
                  <span className="text-xs text-destructive font-semibold">{p.dias === 999 ? "Nunca" : `${p.dias} dias`}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
