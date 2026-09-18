import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { BarChart3 } from "lucide-react";
import { VisaoGeralTab } from "@/components/relatorios/VisaoGeralTab";
import { PacientesTab } from "@/components/relatorios/PacientesTab";
import { EvolucaoClinicaTab } from "@/components/relatorios/EvolucaoClinicaTab";
import { EngajamentoTab } from "@/components/relatorios/EngajamentoTab";
import { ExportacoesTab } from "@/components/relatorios/ExportacoesTab";
import { PageHeader } from "@/components/PageHeader";

type PeriodoKey = "mes" | "mes_anterior" | "3meses" | "6meses" | "ano";

function getPeriodo(key: PeriodoKey) {
  const now = new Date();
  switch (key) {
    case "mes": return { inicio: startOfMonth(now), fim: now };
    case "mes_anterior": {
      const m = subMonths(now, 1);
      return { inicio: startOfMonth(m), fim: endOfMonth(m) };
    }
    case "3meses": return { inicio: subMonths(now, 3), fim: now };
    case "6meses": return { inicio: subMonths(now, 6), fim: now };
    case "ano": return { inicio: new Date(now.getFullYear(), 0, 1), fim: now };
  }
}

function getPeriodoAnterior(key: PeriodoKey) {
  const now = new Date();
  switch (key) {
    case "mes": {
      const m = subMonths(now, 1);
      return { inicio: startOfMonth(m), fim: endOfMonth(m) };
    }
    case "mes_anterior": {
      const m = subMonths(now, 2);
      return { inicio: startOfMonth(m), fim: endOfMonth(m) };
    }
    case "3meses": return { inicio: subMonths(now, 6), fim: subMonths(now, 3) };
    case "6meses": return { inicio: subMonths(now, 12), fim: subMonths(now, 6) };
    case "ano": return { inicio: new Date(now.getFullYear() - 1, 0, 1), fim: new Date(now.getFullYear() - 1, 11, 31) };
  }
}

export default function Relatorios() {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState<PeriodoKey>("mes");
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [diarioRegistros, setDiarioRegistros] = useState<any[]>([]);
  const [conteudoVis, setConteudoVis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [pRes, cRes, aRes, acRes, chRes, dRes, cvRes] = await Promise.all([
        supabase.from("pacientes").select("*").eq("user_id", user.id),
        supabase.from("consultas").select("*").eq("user_id", user.id),
        supabase.from("avaliacoes_fisicas").select("*").eq("user_id", user.id),
        supabase.from("acompanhamentos").select("*").eq("user_id", user.id),
        supabase.from("checklist_respostas").select("*"),
        supabase.from("diario_registros").select("*"),
        supabase.from("conteudo_visualizacoes").select("*"),
      ]);
      setPacientes(pRes.data || []);
      setConsultas(cRes.data || []);
      setAvaliacoes(aRes.data || []);
      setAcompanhamentos(acRes.data || []);
      setChecklists(chRes.data || []);
      setDiarioRegistros(dRes.data || []);
      setConteudoVis(cvRes.data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const { inicio, fim } = useMemo(() => getPeriodo(periodo), [periodo]);
  const { inicio: inicioAnt, fim: fimAnt } = useMemo(() => getPeriodoAnterior(periodo), [periodo]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios e Indicadores" icon={BarChart3}>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Este mês</SelectItem>
            <SelectItem value="mes_anterior">Mês anterior</SelectItem>
            <SelectItem value="3meses">Últimos 3 meses</SelectItem>
            <SelectItem value="6meses">Últimos 6 meses</SelectItem>
            <SelectItem value="ano">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução Clínica</TabsTrigger>
          <TabsTrigger value="engajamento">Engajamento</TabsTrigger>
          <TabsTrigger value="exportacoes">Exportações</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <VisaoGeralTab
            pacientes={pacientes}
            consultas={consultas}
            checklists={checklists}
            periodoInicio={inicio}
            periodoFim={fim}
            periodoAnteriorInicio={inicioAnt}
            periodoAnteriorFim={fimAnt}
          />
        </TabsContent>

        <TabsContent value="pacientes">
          <PacientesTab
            pacientes={pacientes}
            consultas={consultas}
            acompanhamentos={acompanhamentos}
            checklists={checklists}
            periodoInicio={inicio}
            periodoFim={fim}
          />
        </TabsContent>

        <TabsContent value="evolucao">
          <EvolucaoClinicaTab
            pacientes={pacientes}
            avaliacoes={avaliacoes}
            acompanhamentos={acompanhamentos}
            checklists={checklists}
            periodoInicio={inicio}
            periodoFim={fim}
          />
        </TabsContent>

        <TabsContent value="engajamento">
          <EngajamentoTab
            pacientes={pacientes}
            checklists={checklists}
            diarioRegistros={diarioRegistros}
            conteudoVis={conteudoVis}
          />
        </TabsContent>

        <TabsContent value="exportacoes">
          <ExportacoesTab
            pacientes={pacientes}
            consultas={consultas}
            avaliacoes={avaliacoes}
            acompanhamentos={acompanhamentos}
            checklists={checklists}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
