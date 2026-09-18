import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookMarked, ChevronLeft, ChevronRight, Send, Eye, EyeOff, Settings2,
  Image as ImageIcon, MessageSquare, Calendar, Clock, Filter,
} from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";

const tipoLabels: Record<string, string> = {
  cafe_da_manha: "Café da Manhã",
  lanche_da_manha: "Lanche da Manhã",
  almoco: "Almoço",
  lanche_da_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
  outro: "Outro Momento",
};

type DiarioRegistro = {
  id: string;
  paciente_id: string;
  paciente_user_id: string;
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
};

type DiarioConfig = {
  id: string;
  paciente_id: string;
  user_id: string;
  ativo: boolean;
  refeicoes_habilitadas: string[];
  frequencia: string;
};

export function DiarioAlimentarSection({ paciente }: { paciente: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registros, setRegistros] = useState<DiarioRegistro[]>([]);
  const [config, setConfig] = useState<DiarioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("registros");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [refeicaoFilter, setRefeicaoFilter] = useState<string>("todas");
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [avisar, setAvisar] = useState(true);
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [paciente.id]);

  const loadData = async () => {
    const [{ data: regs }, { data: cfg }] = await Promise.all([
      supabase.from("diario_registros").select("*")
        .eq("paciente_id", paciente.id)
        .order("data_registro", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("diario_config").select("*")
        .eq("paciente_id", paciente.id)
        .single(),
    ]);
    setRegistros((regs as any) || []);
    setConfig((cfg as any) || null);
    setLoading(false);
  };

  const filteredRegistros = registros.filter(r => {
    if (dateFilter && r.data_registro !== dateFilter) return false;
    if (refeicaoFilter !== "todas" && r.tipo_refeicao !== refeicaoFilter) return false;
    return true;
  });

  const newCount = registros.filter(r => !r.visto_nutri).length;

  // Group by date
  const grouped = filteredRegistros.reduce<Record<string, DiarioRegistro[]>>((acc, r) => {
    if (!acc[r.data_registro]) acc[r.data_registro] = [];
    acc[r.data_registro].push(r);
    return acc;
  }, {});

  const markAsRead = async (id: string) => {
    await supabase.from("diario_registros").update({ visto_nutri: true } as any).eq("id", id);
    setRegistros(prev => prev.map(r => r.id === id ? { ...r, visto_nutri: true } : r));
  };

  const sendFeedback = async (registro: DiarioRegistro) => {
    const text = feedbackText[registro.id];
    if (!text?.trim()) return;
    setSendingFeedback(registro.id);
    try {
      const { error } = await supabase.from("diario_registros").update({
        feedback_nutri: text.trim(),
        feedback_data: new Date().toISOString(),
        visto_nutri: true,
      } as any).eq("id", registro.id);
      if (error) throw error;
      toast({ title: "Feedback enviado!" });
      // Várias respostas seguidas viram um aviso só (janela de 60 min na função).
      if (avisar) avisarPaciente(paciente.id, "feedback_diario", {}, { silencioso: true });
      setFeedbackText(prev => ({ ...prev, [registro.id]: "" }));
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSendingFeedback(null); }
  };

  const [signedPhotoUrls, setSignedPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const generateUrls = async () => {
      const paths = registros.map((r: any) => r.foto_path).filter(Boolean);
      if (paths.length === 0) return;
      const { data } = await supabase.storage.from("diario-fotos").createSignedUrls(paths, 3600);
      if (data) {
        const urlMap: Record<string, string> = {};
        data.forEach((item) => { if (item.signedUrl) urlMap[item.path!] = item.signedUrl; });
        setSignedPhotoUrls(urlMap);
      }
    };
    generateUrls();
  }, [registros]);

  const getPhotoUrl = (path: string) => {
    return signedPhotoUrls[path] || '';
  };

  // Config handlers
  const saveConfig = async (patch: Partial<DiarioConfig>) => {
    try {
      if (config) {
        const { error } = await supabase.from("diario_config").update(patch as any).eq("id", config.id);
        if (error) throw error;
        setConfig(prev => prev ? { ...prev, ...patch } : prev);
      } else {
        const payload = {
          paciente_id: paciente.id,
          user_id: user!.id,
          ativo: true,
          refeicoes_habilitadas: ["cafe_da_manha", "almoco", "lanche_da_tarde", "jantar"],
          frequencia: "diario",
          ...patch,
        };
        const { data, error } = await supabase.from("diario_config").insert(payload as any).select().single();
        if (error) throw error;
        setConfig(data as any);
      }
      toast({ title: "Configuração salva!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleRefeicao = (tipo: string) => {
    const current = config?.refeicoes_habilitadas || ["cafe_da_manha", "almoco", "lanche_da_tarde", "jantar"];
    const next = current.includes(tipo) ? current.filter(t => t !== tipo) : [...current, tipo];
    saveConfig({ refeicoes_habilitadas: next });
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Diário Alimentar</h3>
          {newCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs">{newCount} novo{newCount > 1 ? "s" : ""}</Badge>
          )}
        </div>
        <AvisarPacienteToggle
          checked={avisar}
          onCheckedChange={setAvisar}
          label="Avisar por e-mail quando eu responder"
          className="py-1.5"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="registros" className="text-xs gap-1">
            <BookMarked className="h-3.5 w-3.5" /> Registros
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs gap-1">
            <Settings2 className="h-3.5 w-3.5" /> Configuração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="h-8 w-40 text-xs"
              placeholder="Filtrar data"
            />
            <Select value={refeicaoFilter} onValueChange={setRefeicaoFilter}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as refeições</SelectItem>
                {Object.entries(tipoLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dateFilter && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDateFilter("")}>Limpar filtro</Button>
            )}
          </div>

          {Object.keys(grouped).length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhum registro encontrado</p>
                <p className="text-sm mt-1">
                  {registros.length === 0
                    ? "O paciente ainda não registrou refeições no diário."
                    : "Nenhum registro corresponde aos filtros selecionados."}
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(grouped).map(([date, regs]) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">
                    {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h4>
                  <Badge variant="outline" className="text-xs">{regs.length} registro{regs.length > 1 ? "s" : ""}</Badge>
                </div>

                {regs.map(reg => (
                  <Card key={reg.id} className={`rounded-xl ${!reg.visto_nutri ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{tipoLabels[reg.tipo_refeicao] || reg.tipo_refeicao}</Badge>
                          {reg.horario && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {reg.horario.slice(0, 5)}
                            </span>
                          )}
                          {!reg.visto_nutri && <Badge className="bg-primary text-primary-foreground text-[10px]">Novo</Badge>}
                        </div>
                        {!reg.visto_nutri && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAsRead(reg.id)}>
                            <Eye className="h-3 w-3 mr-1" /> Marcar como visto
                          </Button>
                        )}
                      </div>

                      {reg.foto_path && (
                        <div className="rounded-lg overflow-hidden max-w-xs">
                          <img src={getPhotoUrl(reg.foto_path)} alt="Refeição" className="w-full h-auto rounded-lg" />
                        </div>
                      )}

                      <p className="text-sm text-foreground">{reg.descricao || <span className="text-muted-foreground italic">Sem descrição</span>}</p>

                      {reg.sentimento && (
                        <p className="text-xs text-muted-foreground">💭 {reg.sentimento}</p>
                      )}

                      {/* Existing feedback */}
                      {reg.feedback_nutri && (
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Seu feedback
                          </p>
                          <p className="text-sm text-foreground">{reg.feedback_nutri}</p>
                          {reg.feedback_data && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(reg.feedback_data), "dd/MM 'às' HH:mm")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Feedback input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escreva um feedback..."
                          value={feedbackText[reg.id] || ""}
                          onChange={e => setFeedbackText(prev => ({ ...prev, [reg.id]: e.target.value }))}
                          className="h-8 text-xs flex-1"
                          onKeyDown={e => e.key === "Enter" && sendFeedback(reg)}
                        />
                        <Button
                          size="sm"
                          className="h-8 rounded-lg"
                          disabled={!feedbackText[reg.id]?.trim() || sendingFeedback === reg.id}
                          onClick={() => sendFeedback(reg)}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Configuração do Diário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Diário Ativo</p>
                  <p className="text-xs text-muted-foreground">Habilitar o diário alimentar para este paciente</p>
                </div>
                <Switch
                  checked={config?.ativo ?? false}
                  onCheckedChange={v => saveConfig({ ativo: v })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Refeições que o paciente deve registrar</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(tipoLabels).filter(([k]) => k !== "outro").map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={(config?.refeicoes_habilitadas || []).includes(k)}
                        onCheckedChange={() => toggleRefeicao(k)}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Frequência</Label>
                <Select
                  value={config?.frequencia || "diario"}
                  onValueChange={v => saveConfig({ frequencia: v })}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="dias_uteis">Dias úteis</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
