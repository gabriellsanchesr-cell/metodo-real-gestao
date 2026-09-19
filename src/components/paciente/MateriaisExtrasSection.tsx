import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, FolderOpen, FileText, Link as LinkIcon, ExternalLink, Download, Eye, Upload } from "lucide-react";
import { format } from "date-fns";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";

const CATEGORIAS = [
  { value: "ebook", label: "E-book" },
  { value: "video", label: "Vídeo" },
  { value: "receita", label: "Receita" },
  { value: "treino", label: "Treino" },
  { value: "lista_compras", label: "Lista de compras" },
  { value: "artigo", label: "Artigo" },
  { value: "outro", label: "Outro" },
];

type FormState = {
  titulo: string;
  descricao: string;
  categoria: string;
  tipo: "arquivo" | "link";
  url_externa: string;
  file: File | null;
};

const empty: FormState = {
  titulo: "", descricao: "", categoria: "outro", tipo: "arquivo", url_externa: "", file: null,
};

export function MateriaisExtrasSection({ paciente }: { paciente: any }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [avisar, setAvisar] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"all" | "arquivo" | "link">("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => { load(); }, [paciente.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("materiais_paciente")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const openNew = () => { setEditingId(null); setForm(empty); setAvisar(true); setDialogOpen(true); };

  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({
      titulo: m.titulo || "",
      descricao: m.descricao || "",
      categoria: m.categoria || "outro",
      tipo: m.tipo || "arquivo",
      url_externa: m.url_externa || "",
      file: null,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Erro", description: "Informe o título.", variant: "destructive" });
      return;
    }
    if (form.tipo === "link" && !form.url_externa.trim()) {
      toast({ title: "Erro", description: "Informe a URL.", variant: "destructive" });
      return;
    }
    if (form.tipo === "arquivo" && !editingId && !form.file) {
      toast({ title: "Erro", description: "Selecione um arquivo.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let arquivo_path: string | null = null;
      let arquivo_nome: string | null = null;
      let arquivo_mime: string | null = null;
      if (form.tipo === "arquivo" && form.file) {
        const path = `materiais/${paciente.id}/${Date.now()}-${form.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("documentos-pdf").upload(path, form.file);
        if (upErr) throw upErr;
        arquivo_path = path;
        arquivo_nome = form.file.name;
        arquivo_mime = form.file.type;
      }

      const payload: any = {
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        categoria: form.categoria,
        tipo: form.tipo,
        url_externa: form.tipo === "link" ? form.url_externa.trim() : null,
      };
      if (arquivo_path) {
        payload.arquivo_path = arquivo_path;
        payload.arquivo_nome = arquivo_nome;
        payload.arquivo_mime = arquivo_mime;
      }

      if (editingId) {
        const { error } = await (supabase as any).from("materiais_paciente").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Material atualizado" });
      } else {
        const { error } = await (supabase as any).from("materiais_paciente").insert({
          ...payload,
          paciente_id: paciente.id,
          user_id: session!.user.id,
        });
        if (error) throw error;
        toast({ title: "Material adicionado" });
        if (avisar) avisarPaciente(paciente.id, "material_novo", { titulo: form.titulo.trim() });
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (m: any) => {
    if (!confirm("Excluir este material?")) return;
    if (m.arquivo_path) {
      await supabase.storage.from("documentos-pdf").remove([m.arquivo_path]);
    }
    await (supabase as any).from("materiais_paciente").delete().eq("id", m.id);
    toast({ title: "Material removido" });
    load();
  };

  const handleOpen = async (m: any) => {
    if (m.tipo === "link" && m.url_externa) {
      window.open(m.url_externa, "_blank", "noopener");
      return;
    }
    if (m.arquivo_path) {
      const { data, error } = await supabase.storage.from("documentos-pdf").createSignedUrl(m.arquivo_path, 3600);
      if (error || !data) { toast({ title: "Erro ao abrir arquivo", variant: "destructive" }); return; }
      window.open(data.signedUrl, "_blank", "noopener");
    }
  };

  const catLabel = (val: string) => CATEGORIAS.find(c => c.value === val)?.label || val;

  const filtered = items.filter(i => {
    if (tab !== "all" && i.tipo !== tab) return false;
    if (filterCat !== "all" && i.categoria !== filterCat) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Materiais extras</h3>
          <p className="text-sm text-muted-foreground">Compartilhe arquivos e links exclusivos com o paciente.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Adicionar material</Button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="arquivo">Arquivos</TabsTrigger>
            <TabsTrigger value="link">Links</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum material cadastrado.</p>
            <Button variant="outline" className="mt-3" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar primeiro material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(m => (
            <Card key={m.id} className="rounded-xl">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${m.tipo === "link" ? "bg-blue-100" : "bg-primary/10"}`}>
                      {m.tipo === "link" ? <LinkIcon className="h-5 w-5 text-blue-600" /> : <FileText className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-foreground">{m.titulo}</h4>
                        <Badge variant="secondary" className="text-xs">{catLabel(m.categoria)}</Badge>
                        {m.visto_em && <Badge variant="outline" className="text-xs"><Eye className="h-3 w-3 mr-1" />Visto</Badge>}
                      </div>
                      {m.descricao && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.descricao}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {m.arquivo_nome && `${m.arquivo_nome} • `}
                        Adicionado em {format(new Date(m.created_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(m)} title={m.tipo === "link" ? "Abrir link" : "Baixar arquivo"}>
                      {m.tipo === "link" ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)} title="Editar"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(m)} title="Excluir" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar material" : "Novo material"}</DialogTitle>
            <DialogDescription>Adicione arquivos (PDF, imagem, vídeo) ou links externos para o paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm(f => ({ ...f, tipo: v }))} disabled={!!editingId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arquivo">Arquivo</SelectItem>
                    <SelectItem value="link">Link externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: E-book de receitas low carb" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Breve descrição do material" />
            </div>
            {form.tipo === "link" ? (
              <div>
                <Label>URL *</Label>
                <Input value={form.url_externa} onChange={e => setForm(f => ({ ...f, url_externa: e.target.value }))} placeholder="https://..." />
              </div>
            ) : (
              <div>
                <Label>{editingId ? "Substituir arquivo (opcional)" : "Arquivo *"}</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="application/pdf,image/*,video/*" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
                  {form.file && <Upload className="h-4 w-4 text-muted-foreground" />}
                </div>
                {form.file && <p className="text-xs text-muted-foreground mt-1">{form.file.name} ({(form.file.size / 1024).toFixed(0)} KB)</p>}
              </div>
            )}
          </div>
          {!editingId && <AvisarPacienteToggle checked={avisar} onCheckedChange={setAvisar} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
