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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Send, Eye, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { AvisarAgoraButton } from "@/components/AvisarAgoraButton";

const CATEGORIAS = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "hidratacao", label: "Hidratação" },
  { value: "sono", label: "Sono" },
  { value: "treino", label: "Treino" },
  { value: "intestino", label: "Intestino" },
  { value: "comportamento", label: "Comportamento" },
  { value: "outro", label: "Outro" },
] as const;

type CategoriaValue = typeof CATEGORIAS[number]["value"];

interface Props {
  paciente: any;
}

export function OrientacoesSection({ paciente }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [form, setForm] = useState({ titulo: "", conteudo: "", categoria: "outro" as CategoriaValue });

  useEffect(() => { load(); }, [paciente.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orientacoes")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ titulo: "", conteudo: "", categoria: "outro" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ titulo: item.titulo, conteudo: item.conteudo, categoria: item.categoria });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo || !form.conteudo) {
      toast({ title: "Erro", description: "Preencha título e conteúdo.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("orientacoes").update({
          titulo: form.titulo, conteudo: form.conteudo, categoria: form.categoria,
        }).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Orientação atualizada" });
      } else {
        const { error } = await supabase.from("orientacoes").insert({
          paciente_id: paciente.id,
          user_id: session!.user.id,
          titulo: form.titulo,
          conteudo: form.conteudo,
          categoria: form.categoria,
        });
        if (error) throw error;
        toast({ title: "Orientação criada" });
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleMarkSent = async (id: string) => {
    await supabase.from("orientacoes").update({ enviada: true, data_envio: new Date().toISOString() }).eq("id", id);
    toast({ title: "Liberada no portal da paciente", description: "Para avisar por e-mail, use o envelope ao lado." });
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("orientacoes").delete().eq("id", id);
    toast({ title: "Orientação removida" });
    load();
  };

  const catLabel = (val: string) => CATEGORIAS.find(c => c.value === val)?.label || val;

  const filtered = filterCat === "all" ? items : items.filter(i => i.categoria === filterCat);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Adicionar Orientação</Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma orientação cadastrada.</p>
            <Button variant="outline" className="mt-3" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Criar primeira orientação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(item => (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-foreground">{item.titulo}</h4>
                      <Badge variant="secondary" className="text-xs">{catLabel(item.categoria)}</Badge>
                      {item.enviada && <Badge className="text-xs bg-success text-success-foreground">No portal</Badge>}
                      {item.visualizada && <Badge variant="outline" className="text-xs"><Eye className="h-3 w-3 mr-1" />Visualizada</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{item.conteudo}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Criada em {format(new Date(item.created_at), "dd/MM/yyyy")}
                      {item.data_envio && ` • Enviada em ${format(new Date(item.data_envio), "dd/MM/yyyy")}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!item.enviada ? (
                      <Button variant="ghost" size="icon" onClick={() => handleMarkSent(item.id)} title="Liberar no portal da paciente">
                        <Send className="h-4 w-4" />
                      </Button>
                    ) : (
                      <AvisarAgoraButton
                        className="h-10 w-10"
                        pacienteId={paciente.id}
                        oQue={`a orientação "${item.titulo}"`}
                        dados={{ titulo: item.titulo }}
                        opcoes={[{ tipo: "orientacao_nova", rotulo: "Orientação nova" }]}
                      />
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Editar">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Excluir" className="text-destructive hover:text-destructive">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Orientação" : "Nova Orientação"}</DialogTitle>
            <DialogDescription>A paciente só vê depois que você liberar no portal (botão de enviar na lista).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Orientações de hidratação" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v: CategoriaValue) => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea
                value={form.conteudo}
                onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                placeholder="Escreva as orientações aqui..."
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
