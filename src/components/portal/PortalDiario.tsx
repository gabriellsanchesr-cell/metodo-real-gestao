import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { bloqueadoNaVisualizacao, usePortalModo } from "@/contexts/PortalModoContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BookMarked, Plus, ArrowLeft, Camera, ChevronLeft, ChevronRight,
  Clock, MessageSquare, Image as ImageIcon, Send, X, AlertCircle,
} from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { hojeLocal } from "@/lib/portal";
import { ptBR } from "date-fns/locale";

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
  data_registro: string;
  tipo_refeicao: string;
  horario: string | null;
  descricao: string;
  foto_path: string | null;
  sentimento: string | null;
  feedback_nutri: string | null;
  feedback_data: string | null;
  created_at: string;
};

/**
 * refeicoesNoPlano: quantas refeições o plano ativo tem, para o resumo do dia
 * mostrar "2 de 5". Sem plano, mostra só quantas foram registradas.
 */
export function PortalDiario({ paciente, refeicoesNoPlano }: { paciente: any; refeicoesNoPlano?: number }) {
  const { user } = useAuth();
  const { modoVisualizacao } = usePortalModo();
  const { toast } = useToast();
  const [registros, setRegistros] = useState<DiarioRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"home" | "form" | "history">("home");
  const [selectedDate, setSelectedDate] = useState(hojeLocal());
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formTipo, setFormTipo] = useState("almoco");
  const [formHorario, setFormHorario] = useState(format(new Date(), "HH:mm"));
  const [formDescricao, setFormDescricao] = useState("");
  const [formSentimento, setFormSentimento] = useState("");
  const [formFoto, setFormFoto] = useState<File | null>(null);
  const [formFotoPreview, setFormFotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!paciente?.id) {
      setLoading(false);
      return;
    }
    loadRegistros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente?.id]);

  async function loadRegistros() {
    if (!paciente?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("diario_registros")
        .select("*")
        .eq("paciente_id", paciente.id)
        .order("data_registro", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRegistros((data as any) || []);
    } catch (err: any) {
      console.error("[PortalDiario] loadRegistros error:", err);
      toast({ title: "Não foi possível carregar o diário", description: err?.message || "Tente novamente.", variant: "destructive" });
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }

  const todayRegistros = registros.filter(r => r.data_registro === selectedDate);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (formFotoPreview) {
      try { URL.revokeObjectURL(formFotoPreview); } catch {}
    }
    setFormFoto(file);
    setFormFotoPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const resetForm = () => {
    setFormTipo("almoco");
    setFormHorario(format(new Date(), "HH:mm"));
    setFormDescricao("");
    setFormSentimento("");
    if (formFotoPreview) {
      try { URL.revokeObjectURL(formFotoPreview); } catch {}
    }
    setFormFoto(null);
    setFormFotoPreview(null);
  };

  const handleSave = async () => {
    if (bloqueadoNaVisualizacao(modoVisualizacao)) return;
    if (!formDescricao.trim()) {
      toast({ title: "Descreva o que você comeu", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let fotoPath: string | null = null;
      if (formFoto) {
        try {
          const rawExt = (formFoto.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
          const ext = rawExt && rawExt.length <= 5 ? rawExt : "jpg";
          const path = `${paciente.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("diario-fotos")
            .upload(path, formFoto, { contentType: formFoto.type || "image/jpeg", upsert: false });
          if (upErr) throw upErr;
          fotoPath = path;
        } catch (upErr: any) {
          console.error("[PortalDiario] upload error:", upErr);
          toast({
            title: "Não foi possível enviar a foto",
            description: "Vamos salvar o registro sem a imagem. Tente reenviar a foto depois.",
            variant: "destructive",
          });
        }
      }

      const { error } = await supabase.from("diario_registros").insert({
        paciente_id: paciente.id,
        paciente_user_id: user!.id,
        data_registro: selectedDate,
        tipo_refeicao: formTipo,
        horario: formHorario + ":00",
        descricao: formDescricao.trim(),
        foto_path: fotoPath,
        sentimento: formSentimento.trim() || null,
      } as any);
      if (error) throw error;

      toast({ title: "Refeição registrada" });
      resetForm();
      await loadRegistros();
      setView("home");
    } catch (err: any) {
      console.error("[PortalDiario] save error:", err);
      toast({ title: "Erro ao salvar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally { setSaving(false); }
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

  if (loading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  // ===== FORM VIEW =====
  if (view === "form") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { resetForm(); setView("home"); }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-lg font-bold text-foreground">Registrar Refeição</h2>

        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Qual refeição?</Label>
              <select
                value={formTipo}
                onChange={e => setFormTipo(e.target.value)}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {Object.entries(tipoLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Horário</Label>
              <Input type="time" value={formHorario} onChange={e => setFormHorario(e.target.value)} className="h-9" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">O que você comeu?</Label>
              <Textarea
                placeholder="Descreva com suas palavras..."
                value={formDescricao}
                onChange={e => setFormDescricao(e.target.value)}
                rows={3}
              />
            </div>

            {/* Photo */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Foto (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              {formFotoPreview ? (
                <div className="relative max-w-xs">
                  <img src={formFotoPreview} alt="Preview" className="rounded-xl w-full h-auto" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full"
                    onClick={() => { setFormFoto(null); setFormFotoPreview(null); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl h-20 border-dashed" onClick={() => cameraInputRef.current?.click()}>
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Tirar foto</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="rounded-xl h-20 border-dashed" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Galeria / Arquivos</span>
                    </div>
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Como você se sentiu depois? (opcional)</Label>
              <Input
                placeholder="Ex: satisfeito, com fome ainda, culpado..."
                value={formSentimento}
                onChange={e => setFormSentimento(e.target.value)}
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
          {saving ? "Salvando..." : "Salvar Registro"}
        </Button>
      </div>
    );
  }

  // ===== HISTORY VIEW =====
  if (view === "history") {
    const sortedDates = [...new Set(registros.map(r => r.data_registro))].sort().reverse();
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("home")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-lg font-bold text-foreground">Histórico</h2>

        {sortedDates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum registro ainda.</div>
        ) : (
          sortedDates.map(date => {
            const dayRegs = registros.filter(r => r.data_registro === date);
            return (
              <div key={date} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {format(parseISO(date), "EEEE, dd/MM", { locale: ptBR })}
                </p>
                {dayRegs.map(reg => (
                  <Card key={reg.id} className="rounded-2xl">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{tipoLabels[reg.tipo_refeicao] || reg.tipo_refeicao}</Badge>
                        {reg.horario && <span className="text-xs text-muted-foreground">{reg.horario.slice(0, 5)}</span>}
                      </div>
                      {reg.foto_path && (
                        <img src={getPhotoUrl(reg.foto_path)} alt="Refeição" loading="lazy" className="rounded-xl w-full max-w-xs h-auto" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <p className="text-sm text-foreground">{reg.descricao}</p>
                      {reg.sentimento && <p className="text-xs italic text-muted-foreground">{reg.sentimento}</p>}
                      {reg.feedback_nutri && (
                        <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                          <p className="text-xs font-medium text-primary flex items-center gap-1 mb-0.5">
                            <MessageSquare className="h-3 w-3" /> Feedback do nutricionista
                          </p>
                          <p className="text-sm text-foreground">{reg.feedback_nutri}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })
        )}
      </div>
    );
  }

  // ===== HOME VIEW =====
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Diário Alimentar</h2>

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(hojeLocal(subDays(parseISO(selectedDate), 1)))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold text-foreground">
          {format(parseISO(selectedDate), "EEEE, dd/MM", { locale: ptBR })}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(hojeLocal(addDays(parseISO(selectedDate), 1)))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Refeições do dia</p>
            <p className="text-xs text-muted-foreground">
              {refeicoesNoPlano
                ? `${todayRegistros.length} de ${refeicoesNoPlano} do seu plano`
                : `${todayRegistros.length} registrada${todayRegistros.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary tabular-nums">
              {todayRegistros.length}
              {refeicoesNoPlano ? <span className="text-sm font-medium text-muted-foreground">/{refeicoesNoPlano}</span> : null}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Register button */}
      <Button className="w-full rounded-xl h-12" onClick={() => setView("form")}>
        <Plus className="h-4 w-4 mr-2" /> Registrar Refeição
      </Button>

      {/* Today's records */}
      {todayRegistros.length > 0 ? (
        <div className="space-y-2">
          {todayRegistros.map(reg => (
            <Card key={reg.id} className="rounded-2xl">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{tipoLabels[reg.tipo_refeicao] || reg.tipo_refeicao}</Badge>
                  {reg.horario && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {reg.horario.slice(0, 5)}
                    </span>
                  )}
                </div>
                {reg.foto_path && (
                  <img src={getPhotoUrl(reg.foto_path)} alt="Refeição" loading="lazy" className="rounded-xl w-full max-w-xs h-auto" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                )}
                <p className="text-sm text-foreground">{reg.descricao}</p>
                {reg.sentimento && <p className="text-xs italic text-muted-foreground">{reg.sentimento}</p>}
                {reg.feedback_nutri && (
                  <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                    <p className="text-xs font-medium text-primary flex items-center gap-1 mb-0.5">
                      <MessageSquare className="h-3 w-3" /> Feedback do nutricionista
                    </p>
                    <p className="text-sm text-foreground">{reg.feedback_nutri}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <BookMarked className="h-6 w-6 mx-auto mb-2 opacity-40" />
          Nenhum registro para este dia.
        </div>
      )}

      {/* History link */}
      <Button variant="outline" className="w-full rounded-xl" onClick={() => setView("history")}>
        Ver histórico completo
      </Button>
    </div>
  );
}
