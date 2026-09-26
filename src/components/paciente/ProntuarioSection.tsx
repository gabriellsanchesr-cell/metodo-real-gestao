import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, ClipboardList, Utensils, Activity, FileText, BookOpen,
  Camera, MessageSquare, ScrollText, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  paciente: any;
}

type EventType = "consulta" | "acompanhamento" | "plano" | "anamnese" | "exame" | "orientacao" | "foto" | "questionario";

interface TimelineEvent {
  id: string;
  date: Date;
  type: EventType;
  title: string;
  description?: string;
}

const TYPE_CONFIG: Record<EventType, { label: string; icon: any; color: string }> = {
  consulta: { label: "Consulta", icon: Calendar, color: "bg-primary text-primary-foreground" },
  acompanhamento: { label: "Acompanhamento", icon: Activity, color: "bg-success text-success-foreground" },
  plano: { label: "Plano Alimentar", icon: Utensils, color: "bg-warning text-white" },
  anamnese: { label: "Anamnese", icon: ClipboardList, color: "bg-accent text-accent-foreground" },
  exame: { label: "Exame", icon: FileText, color: "bg-destructive text-destructive-foreground" },
  orientacao: { label: "Orientação", icon: BookOpen, color: "bg-secondary text-secondary-foreground" },
  foto: { label: "Foto", icon: Camera, color: "bg-muted text-muted-foreground" },
  questionario: { label: "Questionário", icon: MessageSquare, color: "bg-primary/70 text-primary-foreground" },
};

export function ProntuarioSection({ paciente }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => { loadAll(); }, [paciente.id]);

  const loadAll = async () => {
    setLoading(true);
    const pid = paciente.id;

    const [consultas, acompanhamentos, planos, anamneses, exames, orientacoes, fotos, questionarios] = await Promise.all([
      supabase.from("consultas").select("id, data_hora, tipo, status, anotacoes").eq("paciente_id", pid),
      supabase.from("acompanhamentos").select("id, data_registro, peso, observacoes_nutricionista").eq("paciente_id", pid),
      supabase.from("planos_alimentares").select("id, created_at, nome").eq("paciente_id", pid).eq("is_template", false),
      supabase.from("anamneses").select("id, created_at, preenchido_por, respondido").eq("paciente_id", pid),
      supabase.from("exames_laboratoriais").select("id, data_coleta, nome_exame").eq("paciente_id", pid),
      supabase.from("orientacoes").select("id, created_at, titulo, categoria").eq("paciente_id", pid),
      supabase.from("evolucao_fotos").select("id, data_registro, angulo").eq("paciente_id", pid),
      supabase.from("questionarios").select("id, created_at, tipo, status").eq("paciente_id", pid),
    ]);

    const all: TimelineEvent[] = [];

    (consultas.data || []).forEach(c => all.push({
      id: c.id, date: new Date(c.data_hora), type: "consulta",
      title: `Consulta ${c.tipo || ""}`.trim(),
      description: c.status === "cancelado" ? "Cancelada" : c.status === "faltou" ? "Faltou" : c.anotacoes?.substring(0, 80) || undefined,
    }));

    (acompanhamentos.data || []).forEach(a => all.push({
      id: a.id, date: new Date(a.data_registro + "T12:00:00"), type: "acompanhamento",
      title: `Registro de acompanhamento`,
      description: a.peso ? `Peso: ${a.peso}kg` : undefined,
    }));

    (planos.data || []).forEach(p => all.push({
      id: p.id, date: new Date(p.created_at), type: "plano",
      title: p.nome,
    }));

    (anamneses.data || []).forEach(a => all.push({
      id: a.id, date: new Date(a.created_at), type: "anamnese",
      title: "Anamnese",
      description: a.respondido ? `Preenchida pelo ${a.preenchido_por}` : "Pendente",
    }));

    (exames.data || []).forEach(e => all.push({
      id: e.id, date: new Date(e.data_coleta + "T12:00:00"), type: "exame",
      title: e.nome_exame,
    }));

    (orientacoes.data || []).forEach(o => all.push({
      id: o.id, date: new Date(o.created_at), type: "orientacao",
      title: o.titulo,
      description: o.categoria,
    }));

    (fotos.data || []).forEach(f => all.push({
      id: f.id, date: new Date(f.data_registro + "T12:00:00"), type: "foto",
      title: `Foto ${f.angulo}`,
    }));

    (questionarios.data || []).forEach(q => all.push({
      id: q.id, date: new Date(q.created_at), type: "questionario",
      title: `Questionário ${q.tipo}`,
      description: `Status: ${q.status}`,
    }));

    all.sort((a, b) => b.date.getTime() - a.date.getTime());
    setEvents(all);
    setLoading(false);
  };

  const filtered = events.filter(e => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (dateFrom && e.date < new Date(dateFrom + "T00:00:00")) return false;
    if (dateTo && e.date > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando prontuário...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-9" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-9" />
            </div>
            {(filterType !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterType("all"); setDateFrom(""); setDateTo(""); }}>
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ScrollText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum evento encontrado no prontuário.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative pl-8">
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
          {filtered.map((event, i) => {
            const cfg = TYPE_CONFIG[event.type];
            const Icon = cfg.icon;
            return (
              <div key={event.id} className="relative mb-4 last:mb-0">
                <div className={`absolute -left-8 top-1 h-7 w-7 rounded-full flex items-center justify-center ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <Card>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(event.date, "dd MMM yyyy, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
