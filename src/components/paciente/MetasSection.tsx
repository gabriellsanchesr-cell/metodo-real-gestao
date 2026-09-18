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
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Target, CheckCircle2, Pause, Play, Circle } from "lucide-react";
import { format } from "date-fns";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";

const PRIORIDADES = [
  { value: "baixa", label: "Baixa", color: "bg-muted text-muted-foreground" },
  { value: "media", label: "Média", color: "bg-blue-100 text-blue-700" },
  { value: "alta", label: "Alta", color: "bg-amber-100 text-amber-700" },
];

type FormState = {
  titulo: string;
  descricao: string;
  tipo: "checklist" | "numerica";
  valor_alvo: string;
  valor_atual: string;
  unidade: string;
  prazo: string;
  prioridade: string;
};

const empty: FormState = {
  titulo: "", descricao: "", tipo: "checklist", valor_alvo: "", valor_atual: "0",
  unidade: "", prazo: "", prioridade: "media",
};

export function MetasSection({ paciente }: { paciente: any }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [avisar, setAvisar] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => { load(); }, [paciente.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("metas_paciente")
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
      tipo: m.tipo || "checklist",
      valor_alvo: m.valor_alvo?.toString() || "",
      valor_atual: m.valor_atual?.toString() || "0",
      unidade: m.unidade || "",
      prazo: m.prazo || "",
      prioridade: m.prioridade || "media",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Erro", description: "Informe o título da meta.", variant: "destructive" });
      return;
    }
    if (form.tipo === "numerica" && !form.valor_alvo) {
      toast({ title: "Erro", description: "Informe o valor alvo para meta numérica.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        tipo: form.tipo,
        valor_alvo: form.tipo === "numerica" ? Number(form.valor_alvo) : null,
        valor_atual: form.tipo === "numerica" ? Number(form.valor_atual || 0) : null,
        unidade: form.tipo === "numerica" ? (form.unidade || null) : null,
        prazo: form.prazo || null,
        prioridade: form.prioridade,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("metas_paciente").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Meta atualizada" });
      } else {
        const { error } = await (supabase as any).from("metas_paciente").insert({
          ...payload,
          paciente_id: paciente.id,
          user_id: session!.user.id,
          status: "em_andamento",
        });
        if (error) throw error;
        toast({ title: "Meta criada" });
        if (avisar) avisarPaciente(paciente.id, "meta_nova", { titulo: form.titulo.trim() });
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const setStatus = async (id: string, status: string) => {
    const payload: any = { status };
    if (status === "concluida") payload.concluida_em = new Date().toISOString();
    if (status === "em_andamento") payload.concluida_em = null;
    await (supabase as any).from("metas_paciente").update(payload).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta meta?")) return;
    await (supabase as any).from("metas_paciente").delete().eq("id", id);
    toast({ title: "Meta excluída" });
    load();
  };

  const progress = (m: any) => {
    if (m.tipo !== "numerica" || !m.valor_alvo) return null;
    return Math.min(100, Math.max(0, (Number(m.valor_atual || 0) / Number(m.valor_alvo)) * 100));
  };

  const groups = [
    { key: "em_andamento", label: "Em andamento", icon: Circle },
    { key: "concluida", label: "Concluídas", icon: CheckCircle2 },
    { key: "pausada", label: "Pausadas", icon: Pause },
  ];

  const renderCard = (m: any) => {
    const p = progress(m);
    const prio = PRIORIDADES.find(x => x.value === m.prioridade);
    return (
      <Card key={m.id} className="rounded-xl">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-semibold text-foreground">{m.titulo}</h4>
                {prio && <Badge className={`text-xs ${prio.color}`} variant="secondary">{prio.label}</Badge>}
                <Badge variant="outline" className="text-xs">
                  {m.tipo === "numerica" ? "Numérica" : "Checklist"}
                </Badge>
              </div>
              {m.descricao && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.descricao}</p>}
              {p !== null && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{m.valor_atual || 0} / {m.valor_alvo} {m.unidade || ""}</span>
                    <span>{Math.round(p)}%</span>
                  </div>
                  <Progress value={p} className="h-2" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {m.prazo && `Prazo: ${format(new Date(m.prazo + "T00:00:00"), "dd/MM/yyyy")} • `}
                Criada em {format(new Date(m.created_at), "dd/MM/yyyy")}
                {m.concluida_em && ` • Concluída em ${format(new Date(m.concluida_em), "dd/MM/yyyy")}`}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              {m.status !== "concluida" && (
                <Button variant="ghost" size="icon" title="Marcar como concluída" onClick={() => setStatus(m.id, "concluida")}>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </Button>
              )}
              {m.status === "em_andamento" && (
                <Button variant="ghost" size="icon" title="Pausar" onClick={() => setStatus(m.id, "pausada")}>
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              {m.status === "pausada" && (
                <Button variant="ghost" size="icon" title="Retomar" onClick={() => setStatus(m.id, "em_andamento")}>
                  <Play className="h-4 w-4" />
                </Button>
              )}
              {m.status === "concluida" && (
                <Button variant="ghost" size="icon" title="Reabrir" onClick={() => setStatus(m.id, "em_andamento")}>
                  <Circle className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => openEdit(m)} title="Editar">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} title="Excluir" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Metas do paciente</h3>
          <p className="text-sm text-muted-foreground">Defina metas qualitativas (checklist) ou numéricas com progresso.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova meta</Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma meta cadastrada.</p>
            <Button variant="outline" className="mt-3" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Criar primeira meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(g => {
            const list = items.filter(i => i.status === g.key);
            if (list.length === 0) return null;
            const Icon = g.icon;
            return (
              <div key={g.key} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Icon className="h-4 w-4" /> {g.label} ({list.length})
                </div>
                <div className="grid gap-3">{list.map(renderCard)}</div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar meta" : "Nova meta"}</DialogTitle>
            <DialogDescription>Defina o objetivo, prazo e como medir o progresso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Beber 2L de água por dia" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhe a meta, como executar, etc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checklist">Checklist (concluir/não concluir)</SelectItem>
                    <SelectItem value="numerica">Numérica (com progresso)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.tipo === "numerica" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Valor atual</Label>
                  <Input type="number" value={form.valor_atual} onChange={e => setForm(f => ({ ...f, valor_atual: e.target.value }))} />
                </div>
                <div>
                  <Label>Valor alvo *</Label>
                  <Input type="number" value={form.valor_alvo} onChange={e => setForm(f => ({ ...f, valor_alvo: e.target.value }))} />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Input value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} placeholder="kg, L, min..." />
                </div>
              </div>
            )}
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            {!editingId && <AvisarPacienteToggle checked={avisar} onCheckedChange={setAvisar} className="mr-auto" />}
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
