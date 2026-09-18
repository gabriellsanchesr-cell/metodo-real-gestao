import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Calendar, Target, Key, Heart, Edit, Trash2, Copy, Eye, EyeOff, Sparkles,
  Video, FileText, Type, Headphones, ExternalLink, Users, BarChart3,
} from "lucide-react";

const FASES = [
  { id: "rotina", label: "Rotina", cor: "#3B82F6", icon: Calendar, desc: "Construindo hábitos e constância" },
  { id: "estrategia", label: "Estratégia", cor: "#8B5CF6", icon: Target, desc: "Escolhas inteligentes e adaptação" },
  { id: "autonomia", label: "Autonomia", cor: "#F59E0B", icon: Key, desc: "Independência e decisões próprias" },
  { id: "liberdade", label: "Liberdade", cor: "#22C55E", icon: Heart, desc: "Equilíbrio e manutenção" },
];

const TIPOS = [
  { id: "video", label: "Vídeo", icon: Video },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "texto", label: "Texto", icon: Type },
  { id: "audio", label: "Áudio", icon: Headphones },
  { id: "link", label: "Link Externo", icon: ExternalLink },
];

const CATEGORIAS: Record<string, string> = {
  alimentacao: "Alimentação e nutrição",
  comportamento: "Comportamento alimentar",
  rotina: "Rotina e organização",
  exercicio: "Exercício e movimento",
  sono: "Sono e descanso",
  saude_intestinal: "Saúde intestinal",
  ansiedade: "Ansiedade alimentar",
  motivacao: "Motivação e mindset",
  receitas: "Receitas práticas",
  outro: "Outro",
};

type Conteudo = {
  id: string; titulo: string; fase: string; tipo: string; categoria: string;
  status: string; descricao: string | null; conteudo_texto: string | null;
  url_midia: string | null; arquivo_path: string | null; thumbnail_url: string | null;
  duracao_estimada: string | null; tags: string[]; ordem: number; obrigatorio: boolean;
  created_at: string; views?: number;
};

const emptyForm = {
  titulo: "", fase: "rotina", tipo: "texto" as string, categoria: "outro" as string,
  status: "rascunho" as string, descricao: "", conteudo_texto: "", url_midia: "",
  arquivo_path: "", thumbnail_url: "", duracao_estimada: "", tags: "",
  ordem: 0, obrigatorio: false,
};

export default function ConteudoReal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState("gerenciar");
  const [faseAtiva, setFaseAtiva] = useState("rotina");
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [visualizacoes, setVisualizacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: v }] = await Promise.all([
      supabase.from("conteudos_real").select("*").order("ordem"),
      supabase.from("pacientes").select("id, nome_completo, fase_real, ativo").eq("ativo", true),
      supabase.from("conteudo_visualizacoes").select("*"),
    ]);
    setConteudos((c as any) || []);
    setPacientes(p || []);
    setVisualizacoes((v as any) || []);
    setLoading(false);
  };

  const conteudosPorFase = conteudos.filter(c => c.fase === faseAtiva);
  const faseInfo = FASES.find(f => f.id === faseAtiva)!;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, fase: faseAtiva });
    setDialogOpen(true);
  };

  const openEdit = (c: Conteudo) => {
    setEditingId(c.id);
    setForm({
      titulo: c.titulo, fase: c.fase, tipo: c.tipo, categoria: c.categoria,
      status: c.status, descricao: c.descricao || "", conteudo_texto: c.conteudo_texto || "",
      url_midia: c.url_midia || "", arquivo_path: c.arquivo_path || "",
      thumbnail_url: c.thumbnail_url || "", duracao_estimada: c.duracao_estimada || "",
      tags: (c.tags || []).join(", "), ordem: c.ordem, obrigatorio: c.obrigatorio,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user || !form.titulo.trim()) return;
    const payload = {
      user_id: user.id, titulo: form.titulo, fase: form.fase,
      tipo: form.tipo as any, categoria: form.categoria as any,
      status: form.status as any, descricao: form.descricao || null,
      conteudo_texto: form.conteudo_texto || null, url_midia: form.url_midia || null,
      arquivo_path: form.arquivo_path || null, thumbnail_url: form.thumbnail_url || null,
      duracao_estimada: form.duracao_estimada || null,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      ordem: form.ordem, obrigatorio: form.obrigatorio,
    };

    const { error } = editingId
      ? await supabase.from("conteudos_real").update(payload).eq("id", editingId)
      : await supabase.from("conteudos_real").insert(payload);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Conteúdo atualizado!" : "Conteúdo criado!" });
      setDialogOpen(false);
      loadAll();
    }
  };

  const deleteContent = async (id: string) => {
    await supabase.from("conteudos_real").delete().eq("id", id);
    loadAll();
  };

  const duplicateContent = async (c: Conteudo, targetFase: string) => {
    if (!user) return;
    await supabase.from("conteudos_real").insert({
      user_id: user.id, titulo: c.titulo + " (cópia)", fase: targetFase,
      tipo: c.tipo as any, categoria: c.categoria as any, status: "rascunho" as any,
      descricao: c.descricao, conteudo_texto: c.conteudo_texto,
      url_midia: c.url_midia, arquivo_path: c.arquivo_path,
      thumbnail_url: c.thumbnail_url, duracao_estimada: c.duracao_estimada,
      tags: c.tags, ordem: 0, obrigatorio: c.obrigatorio,
    });
    toast({ title: "Conteúdo duplicado!" });
    loadAll();
  };

  const togglePublish = async (c: Conteudo) => {
    const newStatus = c.status === "publicado" ? "rascunho" : "publicado";
    await supabase.from("conteudos_real").update({ status: newStatus as any }).eq("id", c.id);
    loadAll();
  };

  const promoverPaciente = async (pacienteId: string, faseAtualIdx: number) => {
    if (faseAtualIdx >= FASES.length - 1) return;
    const novaFase = FASES[faseAtualIdx + 1].id;
    await supabase.from("pacientes").update({ fase_real: novaFase as any }).eq("id", pacienteId);
    toast({ title: "Paciente promovido!", description: `Nova fase: ${FASES[faseAtualIdx + 1].label}` });
    loadAll();
  };

  const getTipoIcon = (tipo: string) => {
    const t = TIPOS.find(tt => tt.id === tipo);
    return t ? t.icon : FileText;
  };

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case "video": return "bg-blue-100 text-blue-700";
      case "pdf": return "bg-red-100 text-red-700";
      case "texto": return "bg-emerald-100 text-emerald-700";
      case "audio": return "bg-purple-100 text-purple-700";
      case "link": return "bg-gray-100 text-gray-700";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getViewCount = (conteudoId: string) =>
    visualizacoes.filter(v => v.conteudo_id === conteudoId && v.visto).length;

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Conteúdo R.E.A.L." description="Gerencie a biblioteca de conteúdo por fase do método" icon={Sparkles} />

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="gerenciar" className="gap-1.5"><FileText className="h-4 w-4" /> Gerenciar</TabsTrigger>
          <TabsTrigger value="distribuicao" className="gap-1.5"><Users className="h-4 w-4" /> Distribuição</TabsTrigger>
        </TabsList>

        <TabsContent value="gerenciar" className="space-y-4">
          {/* Phase tabs */}
          <div className="flex gap-2 flex-wrap">
            {FASES.map(f => (
              <button
                key={f.id}
                onClick={() => setFaseAtiva(f.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                  faseAtiva === f.id
                    ? "border-transparent text-white shadow-md"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
                style={faseAtiva === f.id ? { backgroundColor: f.cor } : {}}
              >
                <f.icon className="h-4 w-4" />
                {f.label}
                <Badge variant="secondary" className="ml-1 text-[10px] h-5">
                  {conteudos.filter(c => c.fase === f.id).length}
                </Badge>
              </button>
            ))}
          </div>

          {/* Phase header */}
          <Card className="rounded-xl" style={{ borderLeft: `4px solid ${faseInfo.cor}` }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: faseInfo.cor + "20" }}>
                  <faseInfo.icon className="h-5 w-5" style={{ color: faseInfo.cor }} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{faseInfo.label}</h3>
                  <p className="text-xs text-muted-foreground">{faseInfo.desc}</p>
                </div>
              </div>
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </CardContent>
          </Card>

          {/* Content list */}
          {conteudosPorFase.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum conteúdo nesta fase ainda.</p>
              <Button variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Criar primeiro conteúdo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {conteudosPorFase.map(c => {
                const TipoIcon = getTipoIcon(c.tipo);
                return (
                  <Card key={c.id} className="rounded-xl">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: faseInfo.cor + "15" }}>
                        <TipoIcon className="h-5 w-5" style={{ color: faseInfo.cor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground truncate">{c.titulo}</h4>
                          {c.obrigatorio && <Badge variant="outline" className="text-[10px] shrink-0">Obrigatório</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[10px] ${getTipoBadgeClass(c.tipo)}`}>
                            {TIPOS.find(t => t.id === c.tipo)?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{CATEGORIAS[c.categoria]}</span>
                          {c.duracao_estimada && <span className="text-xs text-muted-foreground">• {c.duracao_estimada}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={c.status === "publicado" ? "default" : "secondary"} className="text-[10px]">
                          {c.status === "publicado" ? "Publicado" : "Rascunho"}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          <Eye className="h-3 w-3 inline mr-0.5" />{getViewCount(c.id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(c)}>
                          {c.status === "publicado" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Select onValueChange={(fase) => duplicateContent(c, fase)}>
                          <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent">
                            <Copy className="h-3.5 w-3.5" />
                          </SelectTrigger>
                          <SelectContent>
                            {FASES.map(f => (
                              <SelectItem key={f.id} value={f.id}>Duplicar → {f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteContent(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="distribuicao" className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Distribuição por Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Fase Atual</TableHead>
                    <TableHead>Conteúdos Disponíveis</TableHead>
                    <TableHead>Visualizados</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacientes.map(p => {
                    const faseIdx = FASES.findIndex(f => f.id === (p.fase_real || "rotina"));
                    const fasesAcessiveis = FASES.slice(0, faseIdx + 1).map(f => f.id);
                    const disponiveis = conteudos.filter(c => fasesAcessiveis.includes(c.fase) && c.status === "publicado");
                    const vistos = visualizacoes.filter(v => v.paciente_id === p.id && v.visto);
                    const pct = disponiveis.length > 0 ? Math.round((vistos.length / disponiveis.length) * 100) : 0;
                    const faseData = FASES[faseIdx] || FASES[0];

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome_completo}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: faseData.cor + "20", color: faseData.cor }} className="border-0">
                            {faseData.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{disponiveis.length}</TableCell>
                        <TableCell>{vistos.length}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 w-20" />
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {faseIdx < FASES.length - 1 && (
                            <Button size="sm" variant="outline" className="text-xs h-7"
                              onClick={() => promoverPaciente(p.id, faseIdx)}>
                              Promover → {FASES[faseIdx + 1]?.label}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {pacientes.length === 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">Nenhum paciente ativo</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do conteúdo" />
              </div>
              <div className="space-y-2">
                <Label>Fase</Label>
                <Select value={form.fase} onValueChange={v => setForm(f => ({ ...f, fase: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FASES.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conteúdo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição curta</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Aparece abaixo do título no portal" />
            </div>

            {(form.tipo === "video" || form.tipo === "audio" || form.tipo === "link") && (
              <div className="space-y-2">
                <Label>{form.tipo === "video" ? "Link do YouTube/Vimeo" : form.tipo === "audio" ? "Link do áudio" : "URL do link externo"}</Label>
                <Input value={form.url_midia} onChange={e => setForm(f => ({ ...f, url_midia: e.target.value }))} placeholder="https://..." />
                {form.tipo === "video" && form.url_midia && form.url_midia.includes("youtu") && (
                  <div className="rounded-lg overflow-hidden bg-black aspect-video mt-2">
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYoutubeId(form.url_midia)}`}
                      className="w-full h-full" allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}

            {form.tipo === "texto" && (
              <div className="space-y-2">
                <Label>Conteúdo em texto</Label>
                <Textarea value={form.conteudo_texto} onChange={e => setForm(f => ({ ...f, conteudo_texto: e.target.value }))}
                  placeholder="Escreva o conteúdo aqui... (suporta markdown)" rows={12} className="font-mono text-sm" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração estimada</Label>
                <Input value={form.duracao_estimada} onChange={e => setForm(f => ({ ...f, duracao_estimada: e.target.value }))} placeholder="Ex: 5 min" />
              </div>
              <div className="space-y-2">
                <Label>Ordem de exibição</Label>
                <Input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="nutrição, hábitos, rotina" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Switch checked={form.obrigatorio} onCheckedChange={v => setForm(f => ({ ...f, obrigatorio: v }))} />
              <div>
                <p className="text-sm font-medium text-foreground">Conteúdo obrigatório</p>
                <p className="text-xs text-muted-foreground">Paciente precisa visualizar antes de avançar de fase</p>
              </div>
            </div>

            <Button onClick={save} className="w-full">{editingId ? "Salvar alterações" : "Criar conteúdo"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function extractYoutubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match?.[1] || "";
}
