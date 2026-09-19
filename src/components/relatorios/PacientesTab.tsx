import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { differenceInWeeks, differenceInDays, differenceInYears } from "date-fns";
import { Trophy, TrendingUp, AlertCircle } from "lucide-react";

interface Props {
  pacientes: any[];
  consultas: any[];
  acompanhamentos: any[];
  checklists: any[];
  periodoInicio: Date;
  periodoFim: Date;
}

const OBJETIVO_LABELS: Record<string, string> = {
  emagrecimento: "Emagrecimento",
  ganho_massa: "Ganho de massa",
  saude_intestinal: "Saúde intestinal",
  ansiedade_alimentar: "Ansiedade alimentar",
  performance: "Performance",
  equilibrio_hormonal: "Equilíbrio hormonal",
  outro: "Outro",
};

const FASE_LABELS: Record<string, string> = {
  rotina: "Rotina",
  estrategia: "Estratégia",
  autonomia: "Autonomia",
  liberdade: "Liberdade",
};

const COLORS = ["#004AAD", "#3B7BD6", "#93A8D8", "#F59E0B", "#22C55E", "#EF4444", "#6B7080"];

export function PacientesTab({ pacientes, consultas, acompanhamentos, checklists, periodoInicio, periodoFim }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroFase, setFiltroFase] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const objetivoData = useMemo(() => {
    const map: Record<string, number> = {};
    pacientes.filter(p => p.ativo !== false).forEach(p => {
      const obj = p.objetivo || "outro";
      map[obj] = (map[obj] || 0) + 1;
    });
    return Object.entries(map).map(([k, v]) => ({ name: OBJETIVO_LABELS[k] || k, value: v })).sort((a, b) => b.value - a.value);
  }, [pacientes]);

  const faseData = useMemo(() => {
    const ativos = pacientes.filter(p => p.ativo !== false);
    return ["rotina", "estrategia", "autonomia", "liberdade"].map(f => ({
      name: FASE_LABELS[f],
      value: ativos.filter(p => p.fase_real === f).length,
    }));
  }, [pacientes]);

  const sexoData = useMemo(() => {
    const ativos = pacientes.filter(p => p.ativo !== false);
    const m = ativos.filter(p => p.sexo === "masculino").length;
    const f = ativos.filter(p => p.sexo === "feminino").length;
    const o = ativos.length - m - f;
    return [
      { name: "Masculino", value: m },
      { name: "Feminino", value: f },
      ...(o > 0 ? [{ name: "Outro", value: o }] : []),
    ].filter(d => d.value > 0);
  }, [pacientes]);

  const idadeData = useMemo(() => {
    const faixas = [
      { label: "18-25", min: 18, max: 25 },
      { label: "26-35", min: 26, max: 35 },
      { label: "36-45", min: 36, max: 45 },
      { label: "46-55", min: 46, max: 55 },
      { label: "55+", min: 56, max: 200 },
    ];
    return faixas.map(f => ({
      name: f.label,
      value: pacientes.filter(p => {
        if (!p.data_nascimento) return false;
        const age = differenceInYears(new Date(), new Date(p.data_nascimento));
        return age >= f.min && age <= f.max;
      }).length,
    }));
  }, [pacientes]);

  const ultimaConsulta = useMemo(() => {
    const map = new Map<string, string>();
    consultas.forEach(c => {
      const prev = map.get(c.paciente_id);
      if (!prev || c.data_hora > prev) map.set(c.paciente_id, c.data_hora);
    });
    return map;
  }, [consultas]);

  const filteredPacientes = useMemo(() => {
    return pacientes.filter(p => {
      if (busca && !p.nome_completo.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroFase !== "todos" && p.fase_real !== filtroFase) return false;
      if (filtroStatus === "ativo" && p.ativo === false) return false;
      if (filtroStatus === "inativo" && p.ativo !== false) return false;
      return true;
    });
  }, [pacientes, busca, filtroFase, filtroStatus]);

  const destaques = useMemo(() => {
    const agora = new Date();

    // Maior evolução (perda de peso no período)
    const evolucao = pacientes.filter(p => p.ativo !== false).map(p => {
      const acomp = acompanhamentos.filter(a => a.paciente_id === p.id).sort((a: any, b: any) => new Date(a.data_registro).getTime() - new Date(b.data_registro).getTime());
      if (acomp.length < 2) return null;
      const primeiro = acomp[0].peso;
      const ultimo = acomp[acomp.length - 1].peso;
      if (!primeiro || !ultimo) return null;
      return { nome: p.nome_completo, variacao: ultimo - primeiro };
    }).filter(Boolean).sort((a: any, b: any) => a.variacao - b.variacao).slice(0, 5);

    // Maior aderência
    const aderencia = pacientes.filter(p => p.ativo !== false).map(p => {
      const checks = checklists.filter((c: any) => c.paciente_id === p.id && c.respondido && c.aderencia_plano != null);
      if (checks.length === 0) return null;
      const media = checks.reduce((sum: number, c: any) => sum + c.aderencia_plano, 0) / checks.length;
      return { nome: p.nome_completo, media: Math.round(media) };
    }).filter(Boolean).sort((a: any, b: any) => b.media - a.media).slice(0, 5);

    // Mais tempo sem contato
    const semContato = pacientes.filter(p => p.ativo !== false).map(p => {
      const last = ultimaConsulta.get(p.id);
      const dias = last ? differenceInDays(agora, new Date(last)) : 999;
      return { nome: p.nome_completo, dias };
    }).sort((a, b) => b.dias - a.dias).slice(0, 5);

    return { evolucao, aderencia, semContato };
  }, [pacientes, acompanhamentos, checklists, ultimaConsulta]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição por Objetivo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={objetivoData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#004AAD" name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição por Sexo</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sexoData} cx="50%" cy="45%" outerRadius={70} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {sexoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Faixa Etária</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={idadeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B7BD6" name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Fase R.E.A.L.</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {faseData.map((f, i) => (
                <div key={f.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ["#004AAD", "#7C3AED", "#F59E0B", "#22C55E"][i] }} />
                    <span className="text-sm">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{f.value}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pacientes.filter(p => p.ativo !== false).length > 0 ? Math.round((f.value / pacientes.filter(p => p.ativo !== false).length) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filterable Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de Pacientes</CardTitle>
          <div className="flex gap-2 flex-wrap mt-2">
            <Input placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-[200px] h-8 text-sm" />
            <Select value={filtroFase} onValueChange={setFiltroFase}>
              <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas fases</SelectItem>
                <SelectItem value="rotina">Rotina</SelectItem>
                <SelectItem value="estrategia">Estratégia</SelectItem>
                <SelectItem value="autonomia">Autonomia</SelectItem>
                <SelectItem value="liberdade">Liberdade</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-semibold">Nome</th>
                  <th className="text-left p-2 font-semibold">Fase</th>
                  <th className="text-left p-2 font-semibold">Objetivo</th>
                  <th className="text-left p-2 font-semibold">Tempo</th>
                  <th className="text-left p-2 font-semibold">Última Consulta</th>
                  <th className="text-left p-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPacientes.slice(0, 50).map(p => {
                  const semanas = differenceInWeeks(new Date(), new Date(p.created_at));
                  const last = ultimaConsulta.get(p.id);
                  return (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{p.nome_completo}</td>
                      <td className="p-2">{FASE_LABELS[p.fase_real] || "—"}</td>
                      <td className="p-2">{OBJETIVO_LABELS[p.objetivo] || p.objetivo || "—"}</td>
                      <td className="p-2">{semanas} sem</td>
                      <td className="p-2">{last ? new Date(last).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="p-2">
                        <Badge variant={p.ativo !== false ? "default" : "secondary"}>
                          {p.ativo !== false ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Destaques */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Maior Evolução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {destaques.evolucao.length === 0 && <p className="text-xs text-muted-foreground">Sem dados suficientes</p>}
              {destaques.evolucao.map((d: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{d.nome}</span>
                  <span className={d.variacao < 0 ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                    {d.variacao > 0 ? "+" : ""}{d.variacao.toFixed(1)}kg
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-600" /> Maior Aderência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {destaques.aderencia.length === 0 && <p className="text-xs text-muted-foreground">Sem dados suficientes</p>}
              {destaques.aderencia.map((d: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{d.nome}</span>
                  <span className="font-semibold text-[hsl(var(--primary))]">{d.media}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Sem Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {destaques.semContato.map((d: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{d.nome}</span>
                  <span className="text-destructive font-semibold">{d.dias === 999 ? "Nunca" : `${d.dias}d`}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
