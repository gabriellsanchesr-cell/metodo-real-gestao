import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ContratoSection } from "@/components/paciente/ContratoSection";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, CalendarDays, Utensils, Activity, AlertTriangle, Minus } from "lucide-react";
import type { SectionId } from "./PacienteSidebar";

interface Props {
  paciente: any;
  onNavigate: (section: SectionId) => void;
}

export function VisaoGeral({ paciente, onNavigate }: Props) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [paciente.id]);

  const loadStats = async () => {
    setLoading(true);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const [acomp, consultas, planos, checklists] = await Promise.all([
      supabase.from("acompanhamentos").select("*").eq("paciente_id", paciente.id).order("data_registro", { ascending: false }).limit(10),
      supabase.from("consultas").select("*").eq("paciente_id", paciente.id).order("data_hora", { ascending: false }).limit(5),
      supabase.from("planos_alimentares").select("id").eq("paciente_id", paciente.id).limit(1),
      supabase.from("checklist_respostas").select("*").eq("paciente_id", paciente.id).gte("semana", fourWeeksAgo.toISOString().split("T")[0]).order("semana", { ascending: false }),
    ]);

    const records = acomp.data || [];
    const lastRecord = records[0];
    const prevRecord = records[1];
    const weightChange = lastRecord?.peso && prevRecord?.peso ? lastRecord.peso - prevRecord.peso : null;

    const allConsultas = consultas.data || [];
    const pastConsultas = allConsultas.filter(c => new Date(c.data_hora) <= new Date());
    const futureConsultas = allConsultas.filter(c => new Date(c.data_hora) > new Date());

    const recentCheckins = (checklists.data || []).filter(c => c.respondido);
    const avgAderencia = recentCheckins.length > 0
      ? Math.round(recentCheckins.reduce((a, c) => a + (c.aderencia_plano || 0), 0) / recentCheckins.length)
      : null;

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const hasRecentCheckin = recentCheckins.some(c => new Date(c.semana) >= lastWeek);

    setStats({
      lastWeight: lastRecord?.peso || null,
      weightChange,
      lastConsulta: pastConsultas[0] || null,
      nextConsulta: futureConsultas[futureConsultas.length - 1] || null,
      hasPlano: (planos.data || []).length > 0,
      avgAderencia,
      hasRecentCheckin,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border rounded-xl">
            <CardContent className="p-5">
              <div className="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const faseLabels: Record<string, string> = {
    rotina: "Rotina", estrategia: "Estratégia", autonomia: "Autonomia", liberdade: "Liberdade",
  };

  return (
    <div className="space-y-6">
      <ContratoSection paciente={paciente} compacto onAbrir={() => onNavigate("contrato")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Último Peso</span>
              {stats.weightChange !== null && (
                stats.weightChange > 0
                  ? <TrendingUp className="h-4 w-4 text-destructive" />
                  : stats.weightChange < 0
                    ? <TrendingDown className="h-4 w-4 text-success" />
                    : <Minus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {stats.lastWeight ? `${stats.lastWeight} kg` : "—"}
            </p>
            {stats.weightChange !== null && (
              <p className={`text-xs mt-1 ${stats.weightChange > 0 ? "text-destructive" : stats.weightChange < 0 ? "text-success" : "text-muted-foreground"}`}>
                {stats.weightChange > 0 ? "+" : ""}{stats.weightChange.toFixed(1)} kg
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border rounded-xl">
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Última Consulta</span>
            <p className="text-lg font-semibold text-foreground mt-1">
              {stats.lastConsulta
                ? new Date(stats.lastConsulta.data_hora).toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Próxima Consulta</span>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground mt-1">
              {stats.nextConsulta
                ? new Date(stats.nextConsulta.data_hora).toLocaleDateString("pt-BR")
                : "Nenhuma"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plano Alimentar</span>
              <Utensils className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground mt-1">
              {stats.hasPlano ? "Ativo" : "Nenhum"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aderência (4 sem.)</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {stats.avgAderencia !== null ? `${stats.avgAderencia}%` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border rounded-xl">
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fase R.E.A.L.</span>
            <p className="text-lg font-semibold text-primary mt-1">
              {faseLabels[paciente.fase_real] || paciente.fase_real}
            </p>
          </CardContent>
        </Card>
      </div>

      {!stats.hasRecentCheckin && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Paciente não enviou check-in na última semana.</span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Button size="sm" onClick={() => onNavigate("consultas")}>Registrar Consulta</Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("plano")}>Ver Plano</Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("acompanhamento")}>Ver Evolução</Button>
      </div>
    </div>
  );
}
