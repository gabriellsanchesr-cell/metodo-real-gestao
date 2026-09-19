import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, Ruler, Target } from "lucide-react";

interface Props {
  pacientes: any[];
  avaliacoes: any[];
  acompanhamentos: any[];
  checklists: any[];
  periodoInicio: Date;
  periodoFim: Date;
}

export function EvolucaoClinicaTab({ pacientes, avaliacoes, acompanhamentos, checklists, periodoInicio, periodoFim }: Props) {
  const stats = useMemo(() => {
    const ativos = pacientes.filter(p => p.ativo !== false);

    // Variação média de peso
    const variacoesPeso = ativos.map(p => {
      const avals = avaliacoes.filter((a: any) => a.paciente_id === p.id && a.peso).sort((a: any, b: any) => new Date(a.data_avaliacao).getTime() - new Date(b.data_avaliacao).getTime());
      if (avals.length < 2) return null;
      return avals[avals.length - 1].peso - avals[0].peso;
    }).filter((v): v is number => v !== null);

    const mediaPeso = variacoesPeso.length > 0
      ? Math.round((variacoesPeso.reduce((a, b) => a + b, 0) / variacoesPeso.length) * 10) / 10
      : 0;

    // Variação média circ abdominal
    const variacoesAbd = ativos.map(p => {
      const avals = avaliacoes.filter((a: any) => a.paciente_id === p.id && a.circ_abdomen).sort((a: any, b: any) => new Date(a.data_avaliacao).getTime() - new Date(b.data_avaliacao).getTime());
      if (avals.length < 2) return null;
      return avals[avals.length - 1].circ_abdomen - avals[0].circ_abdomen;
    }).filter((v): v is number => v !== null);

    const mediaAbd = variacoesAbd.length > 0
      ? Math.round((variacoesAbd.reduce((a, b) => a + b, 0) / variacoesAbd.length) * 10) / 10
      : 0;

    return { mediaPeso, mediaAbd, totalComAval: variacoesPeso.length };
  }, [pacientes, avaliacoes]);

  // Histograma de variação de peso
  const histogramData = useMemo(() => {
    const ativos = pacientes.filter(p => p.ativo !== false);
    const faixas = [
      { label: "< -4kg", min: -Infinity, max: -4 },
      { label: "-4 a -2kg", min: -4, max: -2 },
      { label: "-2 a 0kg", min: -2, max: 0 },
      { label: "0 a +2kg", min: 0, max: 2 },
      { label: "> +2kg", min: 2, max: Infinity },
    ];
    const variacoes = ativos.map(p => {
      const avals = avaliacoes.filter((a: any) => a.paciente_id === p.id && a.peso).sort((a: any, b: any) => new Date(a.data_avaliacao).getTime() - new Date(b.data_avaliacao).getTime());
      if (avals.length < 2) return null;
      return avals[avals.length - 1].peso - avals[0].peso;
    }).filter((v): v is number => v !== null);

    return faixas.map(f => ({
      name: f.label,
      pacientes: variacoes.filter(v => v >= f.min && v < f.max).length,
    }));
  }, [pacientes, avaliacoes]);

  // Evolução média mensal
  const evolucaoMensalData = useMemo(() => {
    const months: { month: string; pesoMedio: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const pesos = acompanhamentos.filter((a: any) => {
        const dt = new Date(a.data_registro);
        return dt >= start && dt <= end && a.peso;
      }).map((a: any) => a.peso);
      months.push({
        month: format(d, "MMM/yy", { locale: ptBR }),
        pesoMedio: pesos.length > 0 ? Math.round((pesos.reduce((a: number, b: number) => a + b, 0) / pesos.length) * 10) / 10 : 0,
      });
    }
    return months.filter(m => m.pesoMedio > 0);
  }, [acompanhamentos]);

  // Aderência média por semana (últimas 12 semanas)
  const aderenciaData = useMemo(() => {
    const now = new Date();
    const weeks: { semana: string; media: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 86400000);
      const end = new Date(now.getTime() - i * 7 * 86400000);
      const checks = checklists.filter((c: any) => {
        const d = new Date(c.created_at);
        return d >= start && d < end && c.respondido && c.aderencia_plano != null;
      });
      const media = checks.length > 0
        ? Math.round(checks.reduce((s: number, c: any) => s + c.aderencia_plano, 0) / checks.length)
        : 0;
      weeks.push({ semana: `S${12 - i}`, media });
    }
    return weeks;
  }, [checklists]);

  // Individual evolution table
  const tabelaEvolucao = useMemo(() => {
    return pacientes.filter(p => p.ativo !== false).map(p => {
      const avals = avaliacoes.filter((a: any) => a.paciente_id === p.id && a.peso).sort((a: any, b: any) => new Date(a.data_avaliacao).getTime() - new Date(b.data_avaliacao).getTime());
      if (avals.length < 2) return null;
      const primeiro = avals[0];
      const ultimo = avals[avals.length - 1];
      return {
        nome: p.nome_completo,
        pesoInicial: primeiro.peso,
        pesoAtual: ultimo.peso,
        varPeso: Math.round((ultimo.peso - primeiro.peso) * 10) / 10,
        abdInicial: primeiro.circ_abdomen || primeiro.circ_cintura,
        abdAtual: ultimo.circ_abdomen || ultimo.circ_cintura,
        varAbd: (primeiro.circ_abdomen && ultimo.circ_abdomen)
          ? Math.round((ultimo.circ_abdomen - primeiro.circ_abdomen) * 10) / 10
          : null,
      };
    }).filter(Boolean);
  }, [pacientes, avaliacoes]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Variação Média Peso</p>
                <p className={`text-3xl font-extrabold mt-1 ${stats.mediaPeso <= 0 ? "text-green-600" : "text-destructive"}`}>
                  {stats.mediaPeso > 0 ? "+" : ""}{stats.mediaPeso}kg
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stats.totalComAval} pacientes com ≥2 avaliações</p>
              </div>
              <TrendingDown className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Variação Média Abd.</p>
                <p className={`text-3xl font-extrabold mt-1 ${stats.mediaAbd <= 0 ? "text-green-600" : "text-destructive"}`}>
                  {stats.mediaAbd > 0 ? "+" : ""}{stats.mediaAbd}cm
                </p>
              </div>
              <Ruler className="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Com Evolução</p>
                <p className="text-3xl font-extrabold mt-1">{stats.totalComAval}</p>
                <p className="text-xs text-muted-foreground mt-1">pacientes avaliados</p>
              </div>
              <Target className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição de Variação de Peso</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="pacientes" fill="#004AAD" name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Evolução Média Mensal (Peso)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolucaoMensalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="pesoMedio" stroke="#004AAD" strokeWidth={2} name="Peso médio (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Aderência Média por Semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={aderenciaData}>
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

      {/* Tabela individual */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Evolução Individual</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-semibold">Paciente</th>
                  <th className="text-right p-2 font-semibold">Peso Inicial</th>
                  <th className="text-right p-2 font-semibold">Peso Atual</th>
                  <th className="text-right p-2 font-semibold">Variação</th>
                  <th className="text-right p-2 font-semibold">Abd. Inicial</th>
                  <th className="text-right p-2 font-semibold">Abd. Atual</th>
                  <th className="text-right p-2 font-semibold">Var. Abd.</th>
                </tr>
              </thead>
              <tbody>
                {tabelaEvolucao.map((row: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-medium">{row.nome}</td>
                    <td className="p-2 text-right">{row.pesoInicial}kg</td>
                    <td className="p-2 text-right">{row.pesoAtual}kg</td>
                    <td className={`p-2 text-right font-semibold ${row.varPeso <= 0 ? "text-green-600" : "text-destructive"}`}>
                      {row.varPeso > 0 ? "+" : ""}{row.varPeso}kg
                    </td>
                    <td className="p-2 text-right">{row.abdInicial ? `${row.abdInicial}cm` : "—"}</td>
                    <td className="p-2 text-right">{row.abdAtual ? `${row.abdAtual}cm` : "—"}</td>
                    <td className={`p-2 text-right font-semibold ${row.varAbd != null && row.varAbd <= 0 ? "text-green-600" : row.varAbd != null ? "text-destructive" : ""}`}>
                      {row.varAbd != null ? `${row.varAbd > 0 ? "+" : ""}${row.varAbd}cm` : "—"}
                    </td>
                  </tr>
                ))}
                {tabelaEvolucao.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Sem dados suficientes para exibir evolução</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
