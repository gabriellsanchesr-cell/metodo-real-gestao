import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, GripVertical, Pencil, Trash2, UserPlus } from "lucide-react";

type Lead = {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: string;
  status: string;
  valor_estimado: number | null;
  anotacoes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_COLUMNS = [
  { key: "novo", label: "Novo", color: "bg-blue-500" },
  { key: "em_contato", label: "Em Contato", color: "bg-yellow-500" },
  { key: "agendou", label: "Agendou", color: "bg-purple-500" },
  { key: "converteu", label: "Converteu", color: "bg-green-500" },
  { key: "perdido", label: "Perdido", color: "bg-red-500" },
];

const ORIGENS = [
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

const emptyLead = { nome: "", email: "", telefone: "", origem: "indicacao", valor_estimado: "", anotacoes: "" };

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyLead);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const openCreate = () => {
    setEditingLead(null);
    setForm(emptyLead);
    setModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      nome: lead.nome,
      email: lead.email || "",
      telefone: lead.telefone || "",
      origem: lead.origem,
      valor_estimado: lead.valor_estimado?.toString() || "",
      anotacoes: lead.anotacoes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      user_id: user.id,
      nome: form.nome.trim(),
      email: form.email || null,
      telefone: form.telefone || null,
      origem: form.origem,
      valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
      anotacoes: form.anotacoes || null,
    };

    if (editingLead) {
      const { error } = await supabase.from("leads").update(payload).eq("id", editingLead.id);
      if (error) { toast({ title: "Erro ao atualizar", variant: "destructive" }); return; }
      toast({ title: "Lead atualizado!" });
    } else {
      const { error } = await supabase.from("leads").insert(payload);
      if (error) { toast({ title: "Erro ao criar lead", variant: "destructive" }); return; }
      toast({ title: "Lead criado!" });
    }
    setModalOpen(false);
    fetchLeads();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (!error) { toast({ title: "Lead removido" }); fetchLeads(); }
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedId) return;
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", draggedId);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === draggedId ? { ...l, status: newStatus } : l));
    }
    setDraggedId(null);
  };

  const filtered = leads.filter(l => {
    const matchSearch = l.nome.toLowerCase().includes(search.toLowerCase());
    const matchOrigem = filtroOrigem === "todas" || l.origem === filtroOrigem;
    return matchSearch && matchOrigem;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Gestão de Leads" description="Pipeline de captação de pacientes" icon={UserPlus}>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Lead</Button>
      </PageHeader>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas origens</SelectItem>
            {ORIGENS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex md:grid md:grid-cols-5 gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
          {STATUS_COLUMNS.map(col => {
            const colLeads = filtered.filter(l => l.status === col.key);
            return (
              <div
                key={col.key}
                className="w-[260px] shrink-0 snap-start md:w-auto md:min-w-0 md:shrink"
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.key)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <span className="font-semibold text-sm text-foreground">{col.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">{colLeads.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
                  {colLeads.map(lead => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedId(lead.id)}
                      className="cursor-grab active:cursor-grabbing border shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-sm">{lead.nome}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(lead)} className="text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDelete(lead.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {lead.telefone && <p className="text-xs text-muted-foreground">{lead.telefone}</p>}
                        {lead.valor_estimado && (
                          <p className="text-xs font-medium text-primary">
                            {formatBRL(lead.valor_estimado)}
                          </p>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {ORIGENS.find(o => o.value === lead.origem)?.label || lead.origem}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem</Label>
                <Select value={form.origem} onValueChange={v => setForm(p => ({ ...p, origem: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORIGENS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Estimado (R$)</Label>
                <Input type="number" value={form.valor_estimado} onChange={e => setForm(p => ({ ...p, valor_estimado: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Anotações</Label>
              <Textarea value={form.anotacoes} onChange={e => setForm(p => ({ ...p, anotacoes: e.target.value }))} rows={3} />
            </div>
            <Button onClick={handleSave} className="w-full">{editingLead ? "Salvar" : "Criar Lead"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
