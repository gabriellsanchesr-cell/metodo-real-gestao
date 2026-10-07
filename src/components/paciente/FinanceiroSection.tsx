import { isoLocal } from "@/lib/datas";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, DollarSign, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

interface FinanceiroSectionProps {
  paciente: any;
}

const STATUS_OPTIONS = [
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelado", label: "Cancelado" },
];

const CATEGORIA_OPTIONS = [
  { value: "consulta", label: "Consulta" },
  { value: "pacote", label: "Pacote" },
  { value: "retorno", label: "Retorno" },
  { value: "outro", label: "Outro" },
];

const FORMA_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
];

const statusBadge = (status: string) => {
  switch (status) {
    case "pago": return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/25">Pago</Badge>;
    case "pendente": return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/25">Pendente</Badge>;
    case "cancelado": return <Badge className="bg-red-500/15 text-red-700 border-red-200 hover:bg-red-500/25">Cancelado</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const emptyForm = {
  descricao: "",
  valor: "",
  data_pagamento: isoLocal(),
  forma_pagamento: "pix",
  status: "pendente",
  categoria: "consulta",
  observacoes: "",
};

export function FinanceiroSection({ paciente }: FinanceiroSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receitas, setReceitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("financeiro_receitas")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("data_pagamento", { ascending: false });
    setReceitas(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [paciente.id]);

  const totalPago = receitas.filter(r => r.status === "pago").reduce((s, r) => s + Number(r.valor), 0);
  const totalPendente = receitas.filter(r => r.status === "pendente").reduce((s, r) => s + Number(r.valor), 0);

  const openNew = () => { setEditId(null); setForm(emptyForm); setModal(true); };
  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      descricao: r.descricao,
      valor: String(r.valor),
      data_pagamento: r.data_pagamento,
      forma_pagamento: r.forma_pagamento,
      status: r.status,
      categoria: r.categoria,
      observacoes: r.observacoes || "",
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.descricao || !form.valor) return;
    setSaving(true);
    const payload = {
      descricao: form.descricao,
      valor: Number(form.valor),
      data_pagamento: form.data_pagamento,
      forma_pagamento: form.forma_pagamento,
      status: form.status,
      categoria: form.categoria,
      observacoes: form.observacoes || null,
      paciente_id: paciente.id,
      user_id: user!.id,
    };
    if (editId) {
      const { error } = await supabase.from("financeiro_receitas").update(payload).eq("id", editId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Atualizado com sucesso" });
    } else {
      const { error } = await supabase.from("financeiro_receitas").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Cobrança criada" });
    }
    setSaving(false);
    setModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("financeiro_receitas").delete().eq("id", id);
    toast({ title: "Excluído" });
    load();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("financeiro_receitas").update({ status }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Financeiro</h2>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Cobrança</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Total Pago</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">R$ {totalPago.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Pendente</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">R$ {totalPendente.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><XCircle className="h-4 w-4" /> Registros</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{receitas.length}</p></CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : receitas.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum registro financeiro para este paciente.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitas.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.descricao}</TableCell>
                  <TableCell>R$ {Number(r.valor).toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(r.data_pagamento + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="capitalize">{r.forma_pagamento}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs">{statusBadge(r.status)}</SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="capitalize">{r.categoria}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Cobrança" : "Nova Cobrança"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
              <div><Label>Data</Label><Input type="date" value={form.data_pagamento} onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Forma</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm(f => ({ ...f, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.descricao || !form.valor}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
