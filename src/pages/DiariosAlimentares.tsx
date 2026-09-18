import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { BookMarked, Search, MessageSquare, Clock, Eye, Send, Image as ImageIcon } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";

const tipoLabels: Record<string, string> = {
  cafe_da_manha: "Café da Manhã",
  lanche_da_manha: "Lanche da Manhã",
  almoco: "Almoço",
  lanche_da_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
  outro: "Outro",
};

type Registro = {
  id: string;
  paciente_id: string;
  data_registro: string;
  tipo_refeicao: string;
  horario: string | null;
  descricao: string;
  foto_path: string | null;
  sentimento: string | null;
  feedback_nutri: string | null;
  feedback_data: string | null;
  visto_nutri: boolean;
  created_at: string;
  pacientes?: { id: string; nome_completo: string } | null;
};

export default function DiariosAlimentares() {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filterPaciente, setFilterPaciente] = useState<string>("todos");
  const [filterRefeicao, setFilterRefeicao] = useState<string>("todas");
  const [filterPeriodo, setFilterPeriodo] = useState<string>("7");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<Registro | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [avisar, setAvisar] = useState(true);
  const [savingFb, setSavingFb] = useState(false);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("nutri-diarios")
      .on("postgres_changes", { event: "*", schema: "public", table: "diario_registros" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const { data, error } = await supabase
        .from("diario_registros")
        .select("*, pacientes(id, nome_completo)")
        .order("data_registro", { ascending: false })
        .order("horario", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setRegistros((data as any) || []);
    } catch (err: any) {
      console.error("[DiariosAlimentares] load error:", err);
      toast({ title: "Erro ao carregar diários", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const gen = async () => {
      const paths = registros.map(r => r.foto_path).filter(Boolean) as string[];
      if (paths.length === 0) return;
      try {
        const { data } = await supabase.storage.from("diario-fotos").createSignedUrls(paths, 3600);
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(it => { if (it.signedUrl && it.path) map[it.path] = it.signedUrl; });
          setSignedUrls(map);
        }
      } catch (e) { console.error(e); }
    };
    gen();
  }, [registros]);

  const pacientesUnicos = useMemo(() => {
    const m = new Map<string, string>();
    registros.forEach(r => { if (r.pacientes) m.set(r.pacientes.id, r.pacientes.nome_completo); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [registros]);

  const filtered = useMemo(() => {
    const dias = parseInt(filterPeriodo, 10);
    const cutoff = isFinite(dias) ? subDays(new Date(), dias) : null;
    const q = search.trim().toLowerCase();
    return registros.filter(r => {
      if (filterPaciente !== "todos" && r.paciente_id !== filterPaciente) return false;
      if (filterRefeicao !== "todas" && r.tipo_refeicao !== filterRefeicao) return false;
      if (cutoff && parseISO(r.data_registro) < cutoff) return false;
      if (filterStatus === "sem_feedback" && r.feedback_nutri) return false;
      if (filterStatus === "nao_vistos" && r.visto_nutri) return false;
      if (q) {
        const hay = `${r.descricao} ${r.sentimento || ""} ${r.pacientes?.nome_completo || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [registros, filterPaciente, filterRefeicao, filterPeriodo, filterStatus, search]);

  const grouped = useMemo(() => {
    const g: Record<string, Registro[]> = {};
    filtered.forEach(r => {
      const k = r.data_registro;
      if (!g[k]) g[k] = [];
      g[k].push(r);
    });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const stats = useMemo(() => {
    const semFb = filtered.filter(r => !r.feedback_nutri).length;
    const naoVistos = filtered.filter(r => !r.visto_nutri).length;
    return { total: filtered.length, semFb, naoVistos };
  }, [filtered]);

  const marcarVisto = async (r: Registro) => {
    if (r.visto_nutri) return;
    await supabase.from("diario_registros").update({ visto_nutri: true }).eq("id", r.id);
    setRegistros(prev => prev.map(x => x.id === r.id ? { ...x, visto_nutri: true } : x));
  };

  const abrirFeedback = (r: Registro) => {
    setFeedbackTarget(r);
    setFeedbackText(r.feedback_nutri || "");
    setFeedbackOpen(true);
  };

  const salvarFeedback = async () => {
    if (!feedbackTarget) return;
    setSavingFb(true);
    try {
      const { error } = await supabase
        .from("diario_registros")
        .update({
          feedback_nutri: feedbackText.trim() || null,
          feedback_data: feedbackText.trim() ? new Date().toISOString() : null,
          visto_nutri: true,
        })
        .eq("id", feedbackTarget.id);
      if (error) throw error;
      toast({ title: "Feedback enviado" });
      if (avisar && feedbackText.trim()) {
        avisarPaciente(feedbackTarget.paciente_id, "feedback_diario", {}, { silencioso: true });
      }
      setRegistros(prev => prev.map(x => x.id === feedbackTarget.id
        ? { ...x, feedback_nutri: feedbackText.trim() || null, feedback_data: new Date().toISOString(), visto_nutri: true }
        : x));
      setFeedbackOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSavingFb(false); }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Diários Alimentares"
        description="Visão consolidada de todos os registros das pacientes."
        icon={BookMarked}
      >
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">{stats.total} registros</Badge>
          {stats.naoVistos > 0 && <Badge className="bg-warning text-warning-foreground">{stats.naoVistos} novos</Badge>}
          {stats.semFb > 0 && <Badge className="bg-primary/10 text-primary border-primary/20">{stats.semFb} sem feedback</Badge>}
        </div>
      </PageHeader>

      <Card className="rounded-xl">
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={filterPaciente} onValueChange={setFilterPaciente}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as pacientes</SelectItem>
              {pacientesUnicos.map(([id, nome]) => (
                <SelectItem key={id} value={id}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRefeicao} onValueChange={setFilterRefeicao}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as refeições</SelectItem>
              {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="9999">Todo período</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="nao_vistos">Não vistos</SelectItem>
              <SelectItem value="sem_feedback">Sem feedback</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookMarked className="h-10 w-10 mx-auto mb-2 opacity-30" />
          Nenhum registro encontrado com os filtros selecionados.
        </div>
      ) : (
        grouped.map(([date, regs]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
              {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })} · {regs.length} registro{regs.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {regs.map(reg => (
                <Card
                  key={reg.id}
                  className={`rounded-xl border transition-all ${!reg.visto_nutri ? "border-primary/40 bg-primary/[0.02]" : "border-border"}`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/pacientes/${reg.paciente_id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary truncate block"
                        >
                          {reg.pacientes?.nome_completo || "Paciente"}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {tipoLabels[reg.tipo_refeicao] || reg.tipo_refeicao}
                          </Badge>
                          {reg.horario && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {reg.horario.slice(0, 5)}
                            </span>
                          )}
                          {!reg.visto_nutri && <Badge className="text-[10px] h-5 bg-primary text-primary-foreground">Novo</Badge>}
                        </div>
                      </div>
                    </div>

                    {reg.foto_path && signedUrls[reg.foto_path] ? (
                      <img
                        src={signedUrls[reg.foto_path]}
                        alt="Refeição"
                        className="rounded-lg w-full h-44 object-cover cursor-pointer"
                        onClick={() => marcarVisto(reg)}
                      />
                    ) : reg.foto_path ? (
                      <div className="rounded-lg w-full h-44 bg-muted flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    ) : null}

                    <p className="text-sm text-foreground line-clamp-3">{reg.descricao}</p>
                    {reg.sentimento && (
                      <p className="text-xs text-muted-foreground">💭 {reg.sentimento}</p>
                    )}

                    {reg.feedback_nutri && (
                      <div className="bg-primary/5 rounded-lg p-2 border border-primary/10">
                        <p className="text-[11px] font-medium text-primary flex items-center gap-1 mb-0.5">
                          <MessageSquare className="h-3 w-3" /> Seu feedback
                        </p>
                        <p className="text-xs text-foreground line-clamp-2">{reg.feedback_nutri}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {!reg.visto_nutri && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => marcarVisto(reg)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Marcar visto
                        </Button>
                      )}
                      <Button size="sm" variant={reg.feedback_nutri ? "outline" : "default"} className="h-7 text-xs flex-1" onClick={() => abrirFeedback(reg)}>
                        <Send className="h-3.5 w-3.5 mr-1" /> {reg.feedback_nutri ? "Editar feedback" : "Enviar feedback"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback ao paciente</DialogTitle>
          </DialogHeader>
          {feedbackTarget && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{feedbackTarget.pacientes?.nome_completo}</span> ·{" "}
                {tipoLabels[feedbackTarget.tipo_refeicao]} ·{" "}
                {format(parseISO(feedbackTarget.data_registro), "dd/MM", { locale: ptBR })}
              </div>
              <p className="text-sm bg-muted/40 rounded-lg p-2 text-foreground line-clamp-3">{feedbackTarget.descricao}</p>
              <Textarea
                placeholder="Escreva uma orientação curta, elogio ou ajuste..."
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                rows={5}
                autoFocus
              />
            </div>
          )}
          <AvisarPacienteToggle checked={avisar} onCheckedChange={setAvisar} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancelar</Button>
            <Button onClick={salvarFeedback} disabled={savingFb}>
              {savingFb ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
