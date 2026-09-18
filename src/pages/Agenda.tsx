import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Calendar as CalIcon, Clock, Ban, AlertTriangle, ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  startOfWeek, endOfWeek, addDays, isToday, addMonths, subMonths,
  addWeeks, subWeeks, differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  agendado: "bg-primary/10 text-primary",
  realizado: "bg-emerald-500/10 text-emerald-600",
  cancelado: "bg-destructive/10 text-destructive",
  bloqueio: "bg-muted text-muted-foreground",
};

const tipoLabels: Record<string, string> = {
  primeira_consulta: "1ª Consulta",
  retorno: "Retorno",
  online: "Online",
  presencial: "Presencial",
};

type ViewType = "month" | "week" | "day";

interface ConsultaForm {
  paciente_id: string;
  data: string;
  hora: string;
  tipo: string;
  anotacoes: string;
  link_reuniao: string;
  is_bloqueio: boolean;
  bloqueio_motivo: string;
}

const defaultForm: ConsultaForm = {
  paciente_id: "", data: "", hora: "", tipo: "retorno", anotacoes: "",
  link_reuniao: "", is_bloqueio: false, bloqueio_motivo: "",
};

export default function Agenda() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [consultas, setConsultas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bloqueioDialogOpen, setBloqueioDialogOpen] = useState(false);
  const [view, setView] = useState<ViewType>("month");
  const [form, setForm] = useState<ConsultaForm>(defaultForm);
  const [avisar, setAvisar] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cancelando, setCancelando] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [retornosPendentes, setRetornosPendentes] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadConsultas();
      loadPacientes();
      loadRetornosPendentes();
    }
  }, [user, currentDate]);

  const loadConsultas = async () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const { data } = await supabase
      .from("consultas")
      .select("*, pacientes(nome_completo)")
      .gte("data_hora", start.toISOString())
      .lte("data_hora", end.toISOString())
      .order("data_hora");
    setConsultas(data || []);
  };

  const loadPacientes = async () => {
    const { data } = await supabase.from("pacientes").select("id, nome_completo").eq("ativo", true).order("nome_completo");
    setPacientes(data || []);
  };

  const loadRetornosPendentes = async () => {
    // Buscar consultas realizadas nos últimos 60 dias onde o paciente não tem consulta futura
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const now = new Date();

    const { data: realizadas } = await supabase
      .from("consultas")
      .select("*, pacientes(nome_completo)")
      .eq("status", "realizado")
      .gte("data_hora", sixtyDaysAgo.toISOString())
      .lte("data_hora", now.toISOString())
      .order("data_hora", { ascending: false });

    if (!realizadas) return;

    // Buscar consultas futuras agendadas
    const { data: futuras } = await supabase
      .from("consultas")
      .select("paciente_id")
      .eq("status", "agendado")
      .gte("data_hora", now.toISOString());

    const pacientesComFutura = new Set((futuras || []).map(f => f.paciente_id));

    // Filtrar: pacientes sem consulta futura, pegar última consulta de cada
    const seen = new Set<string>();
    const pendentes = realizadas.filter(c => {
      if (pacientesComFutura.has(c.paciente_id)) return false;
      if (seen.has(c.paciente_id)) return false;
      seen.add(c.paciente_id);
      return true;
    });

    setRetornosPendentes(pendentes);
  };

  const createConsulta = async () => {
    if (!user || !form.paciente_id || !form.data || !form.hora) return;
    // O horário digitado é de Brasília. Sem converter, o banco (timestamptz,
    // sessão em UTC) guardava 14h como 14h UTC, e a consulta aparecia às 11h.
    const data_hora = new Date(`${form.data}T${form.hora}:00`).toISOString();
    const { error } = await supabase.from("consultas").insert({
      user_id: user.id,
      paciente_id: form.paciente_id,
      data_hora,
      tipo: form.tipo as any,
      anotacoes: form.link_reuniao
        ? `${form.anotacoes || ""}\n🔗 Link: ${form.link_reuniao}`.trim()
        : form.anotacoes || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Consulta agendada!" });
      if (avisar) avisarPaciente(form.paciente_id, "consulta_agendada", { data: data_hora });
      setDialogOpen(false);
      setForm(defaultForm);
      setAvisar(true);
      loadConsultas();
      loadRetornosPendentes();
    }
  };

  const createBloqueio = async () => {
    if (!user || !form.data || !form.hora) return;
    // Usar o primeiro paciente como placeholder (bloqueio é do nutri, não do paciente)
    // Na verdade, para bloqueios precisamos tratar diferente
    const data_hora = new Date(`${form.data}T${form.hora}:00`).toISOString();
    const { error } = await supabase.from("consultas").insert({
      user_id: user.id,
      paciente_id: pacientes[0]?.id, // placeholder
      data_hora,
      tipo: "presencial" as any,
      status: "cancelado" as any, // Usamos cancelado para bloqueios por agora
      anotacoes: `🚫 BLOQUEIO: ${form.bloqueio_motivo || "Horário bloqueado"}`,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Horário bloqueado!" });
      setBloqueioDialogOpen(false);
      setForm(defaultForm);
      loadConsultas();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("consultas").update({ status: status as any }).eq("id", id);
    loadConsultas();
    loadRetornosPendentes();
  };

  const confirmarCancelamento = async (avisarPaciente_: boolean) => {
    const c = cancelando;
    setCancelando(null);
    if (!c) return;
    await updateStatus(c.id, "cancelado");
    toast({ title: "Consulta cancelada" });
    if (avisarPaciente_) avisarPaciente(c.paciente_id, "consulta_cancelada", { data: c.data_hora });
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const navigate = (dir: number) => {
    if (view === "month") setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else if (view === "week") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => addDays(d, dir));
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (view === "week") return `${format(weekStart, "dd MMM", { locale: ptBR })} — ${format(addDays(weekStart, 6), "dd MMM yyyy", { locale: ptBR })}`;
    return format(currentDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR });
  }, [currentDate, view, weekStart]);

  const dayConsultas = (day: Date) => consultas.filter(c => isSameDay(new Date(c.data_hora), day));

  // Hours for day view
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7h to 18h

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Agenda" description="Consultas, bloqueios e retornos" icon={CalIcon}>
        <div className="flex flex-wrap gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            {(["month", "week", "day"] as ViewType[]).map(v => (
              <Button
                key={v}
                variant={view === v ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setView(v)}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </Button>
            ))}
          </div>

          <Dialog open={bloqueioDialogOpen} onOpenChange={setBloqueioDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Ban className="h-4 w-4 mr-2" /> Bloqueio</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Bloquear Horário</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora *</Label>
                    <Input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input
                    value={form.bloqueio_motivo}
                    onChange={e => setForm(f => ({ ...f, bloqueio_motivo: e.target.value }))}
                    placeholder="Almoço, folga, reunião..."
                  />
                </div>
                <Button onClick={createBloqueio} className="w-full">Bloquear</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Consulta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agendar Consulta</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={form.paciente_id} onValueChange={v => setForm(f => ({ ...f, paciente_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {pacientes.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora *</Label>
                    <Input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primeira_consulta">1ª Consulta</SelectItem>
                      <SelectItem value="retorno">Retorno</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(form.tipo === "online") && (
                  <div className="space-y-2">
                    <Label>Link da Reunião</Label>
                    <Input
                      value={form.link_reuniao}
                      onChange={e => setForm(f => ({ ...f, link_reuniao: e.target.value }))}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Anotações</Label>
                  <Textarea value={form.anotacoes} onChange={e => setForm(f => ({ ...f, anotacoes: e.target.value }))} />
                </div>
                <AvisarPacienteToggle checked={avisar} onCheckedChange={setAvisar} />
                <Button onClick={createConsulta} className="w-full">Agendar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold capitalize">{headerLabel}</h2>
          <Button variant="outline" size="sm" className="rounded-full px-3" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(1)}>
          Próximo <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar area */}
        <div className="lg:col-span-3">
          {/* Month View */}
          {view === "month" && (
            <div className="grid grid-cols-7 gap-0.5 md:gap-1">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                <div key={d} className="text-center text-[10px] md:text-xs font-medium text-muted-foreground py-1.5 md:py-2">
                  <span className="md:hidden">{d.charAt(0)}</span>
                  <span className="hidden md:inline">{d}</span>
                </div>
              ))}
              {monthDays.map(day => {
                const dc = dayConsultas(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[56px] md:min-h-[80px] p-0.5 md:p-1 border rounded-md cursor-pointer hover:bg-accent/50 transition-colors ${isCurrentMonth ? "bg-card" : "bg-muted/30"} ${today ? "ring-2 ring-primary" : ""}`}
                    onClick={() => { setSelectedDay(day); setView("day"); setCurrentDate(day); }}
                  >
                    <p className={`text-[10px] md:text-xs font-medium mb-0.5 md:mb-1 ${today ? "text-primary font-bold" : isCurrentMonth ? "" : "text-muted-foreground"}`}>{day.getDate()}</p>
                    {dc.slice(0, 2).map(c => (
                      <div key={c.id} className={`text-[9px] md:text-xs truncate mb-0.5 px-1 rounded ${c.anotacoes?.startsWith("🚫") ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                        <span className="hidden md:inline">{format(new Date(c.data_hora), "HH:mm")} </span>{c.pacientes?.nome_completo?.split(" ")[0]}
                      </div>
                    ))}
                    {dc.length > 2 && <p className="text-[9px] md:text-xs text-muted-foreground">+{dc.length - 2}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Week View */}
          {view === "week" && (
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => {
                  const dc = dayConsultas(day);
                  const today = isToday(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[200px] p-2 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${today ? "ring-2 ring-primary" : ""}`}
                      onClick={() => { setView("day"); setCurrentDate(day); }}
                    >
                      <p className={`text-xs font-medium mb-2 ${today ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {format(day, "EEE dd", { locale: ptBR })}
                      </p>
                      {dc.map(c => (
                        <div key={c.id} className={`text-xs mb-1 p-1.5 rounded ${statusColors[c.status] || "bg-muted"}`}>
                          <p className="font-medium">{format(new Date(c.data_hora), "HH:mm")}</p>
                          <p className="truncate">{c.pacientes?.nome_completo?.split(" ")[0]}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day View */}
          {view === "day" && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1">
                  {hours.map(h => {
                    const hourConsultas = consultas.filter(c => {
                      const d = new Date(c.data_hora);
                      return isSameDay(d, currentDate) && d.getHours() === h;
                    });
                    return (
                      <div key={h} className="flex border-b last:border-0 min-h-[56px]">
                        <div className="w-16 py-2 text-xs text-muted-foreground font-medium shrink-0">
                          {String(h).padStart(2, "0")}:00
                        </div>
                        <div className="flex-1 py-1 space-y-1">
                          {hourConsultas.length === 0 && (
                            <div className="h-full min-h-[40px]" />
                          )}
                          {hourConsultas.map(c => {
                            const isBloqueio = c.anotacoes?.startsWith("🚫");
                            return (
                              <div
                                key={c.id}
                                className={`p-2 rounded-lg text-sm flex items-center justify-between ${isBloqueio ? "bg-muted" : statusColors[c.status] || "bg-primary/10 text-primary"}`}
                              >
                                <div>
                                  <p className="font-medium">
                                    {format(new Date(c.data_hora), "HH:mm")} — {isBloqueio ? "Bloqueio" : c.pacientes?.nome_completo}
                                  </p>
                                  <p className="text-xs opacity-70">
                                    {isBloqueio ? c.anotacoes?.replace("🚫 BLOQUEIO: ", "") : tipoLabels[c.tipo] || c.tipo}
                                    {c.anotacoes?.includes("🔗 Link:") && (
                                      <span className="ml-2 inline-flex items-center gap-0.5">
                                        <Link2 className="h-3 w-3" /> Online
                                      </span>
                                    )}
                                  </p>
                                </div>
                                {!isBloqueio && c.status === "agendado" && (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(c.id, "realizado")} aria-label="Marcar como realizada">✓</Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCancelando(c)} aria-label="Cancelar consulta">✗</Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Retornos Pendentes */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Retornos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {retornosPendentes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum retorno pendente</p>
              ) : (
                <div className="space-y-2">
                  {retornosPendentes.slice(0, 10).map(c => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{c.pacientes?.nome_completo?.split(" ")[0]}</p>
                        <p className="text-xs text-muted-foreground">
                          Última: {format(new Date(c.data_hora), "dd/MM")} ({differenceInDays(new Date(), new Date(c.data_hora))}d atrás)
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setForm({ ...defaultForm, paciente_id: c.paciente_id, tipo: "retorno" });
                          setDialogOpen(true);
                        }}
                      >
                        Agendar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consultas do dia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Hoje ({format(new Date(), "dd/MM")})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const todayConsultas = consultas.filter(c => isSameDay(new Date(c.data_hora), new Date()));
                if (todayConsultas.length === 0) return <p className="text-xs text-muted-foreground">Sem consultas hoje</p>;
                return (
                  <div className="space-y-2">
                    {todayConsultas.map(c => (
                      <div key={c.id} className="flex items-center gap-2 py-1 border-b last:border-0">
                        <Badge variant="secondary" className={`text-xs ${statusColors[c.status] || ""}`}>
                          {format(new Date(c.data_hora), "HH:mm")}
                        </Badge>
                        <span className="text-sm truncate">{c.pacientes?.nome_completo?.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
      <AlertDialog open={!!cancelando} onOpenChange={(o) => !o && setCancelando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelando?.pacientes?.nome_completo ? `${cancelando.pacientes.nome_completo}, ` : ""}
              {cancelando ? format(new Date(cancelando.data_hora), "dd/MM 'às' HH:mm") : ""}.
              Quer avisar a paciente por e-mail?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <Button variant="outline" onClick={() => confirmarCancelamento(false)}>Cancelar sem avisar</Button>
            <AlertDialogAction onClick={() => confirmarCancelamento(true)}>Cancelar e avisar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}