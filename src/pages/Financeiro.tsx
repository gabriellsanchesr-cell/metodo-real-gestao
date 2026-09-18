import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/format";
import { StatCard, StatGrid } from "@/components/StatCard";
import { toast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp, Clock, Users, Pencil, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Receita = {
  id: string;
  user_id: string;
  paciente_id: string | null;
  descricao: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  status: string;
  categoria: string;
  observacoes: string | null;
  created_at: string;
};

const FORMAS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
];

const CATEGORIAS = [
  { value: "consulta", label: "Consulta" },
  { value: "pacote", label: "Pacote" },
  { value: "retorno", label: "Retorno" },
  { value: "outro", label: "Outro" },
];

const STATUS_LIST = [
  { value: "pago", label: "Pago", variant: "default" as const },
  { value: "pendente", label: "Pendente", variant: "secondary" as const },
  { value: "cancelado", label: "Cancelado", variant: "destructive" as const },
];

const emptyForm = { descricao: "", valor: "", data_pagamento: format(new Date(), "yyyy-MM-dd"), forma_pagamento: "pix", status: "pago", categoria: "consulta", observacoes: "", paciente_id: "" };

export default function Financeiro() {
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [pacientes, setPacientes] = useState<{ id: string; nome_completo: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Receita | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const fetchData = async () => {
    if (!user) return;
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("financeiro_receitas").select("*").eq("user_id", user.id).order("data_pagamento", { ascending: false }),
      supabase.from("pacientes").select("id, nome_completo").eq("user_id", user.id).order("nome_completo"),
    ]);
    setReceitas(r || []);
    setPacientes(p || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (r: Receita) => {
    setEditing(r);
    setForm({
      descricao: r.descricao,
      valor: r.valor.toString(),
      data_pagamento: r.data_pagamento,
      forma_pagamento: r.forma_pagamento,
      status: r.status,
      categoria: r.categoria,
      observacoes: r.observacoes || "",
      paciente_id: r.paciente_id || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.descricao.trim() || !form.valor) {
      toast({ title: "Descrição e valor são obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      user_id: user.id,
      descricao: form.descricao.trim(),
      valor: parseFloat(form.valor),
      data_pagamento: form.data_pagamento,
      forma_pagamento: form.forma_pagamento,
      status: form.status,
      categoria: form.categoria,
      observacoes: form.observacoes || null,
      paciente_id: form.paciente_id || null,
    };
    if (editing) {
      const { error } = await supabase.from("financeiro_receitas").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao atualizar", variant: "destructive" }); return; }
      toast({ title: "Receita atualizada!" });
    } else {
      const { error } = await supabase.from("financeiro_receitas").insert(payload);
      if (error) { toast({ title: "Erro ao criar receita", variant: "destructive" }); return; }
      toast({ title: "Receita registrada!" });
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("financeiro_receitas").delete().eq("id", id);
    if (!error) { toast({ title: "Receita removida" }); fetchData(); }
  };

  const now = new Date();
  const mesAtual = receitas.filter(r => {
    const d = parseISO(r.data_pagamento);
    return d >= startOfMonth(now) && d <= endOfMonth(now);
  });

  const faturamentoMes = mesAtual.filter(r => r.status === "pago").reduce((s, r) => s + Number(r.valor), 0);
  const totalRecebido = receitas.filter(r => r.status === "pago").reduce((s, r) => s + Number(r.valor), 0);
  const pendentes = receitas.filter(r => r.status === "pendente").reduce((s, r) => s + Number(r.valor), 0);
  const pagosCount = receitas.filter(r => r.status === "pago").length;
  const ticketMedio = pagosCount > 0 ? totalRecebido / pagosCount : 0;

  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const total = receitas
        .filter(r => r.status === "pago" && parseISO(r.data_pagamento) >= start && parseISO(r.data_pagamento) <= end)
        .reduce((s, r) => s + Number(r.valor), 0);
      months.push({ mes: format(m, "MMM", { locale: ptBR }), total });
    }
    return months;
  }, [receitas]);

  const filteredReceitas = receitas.filter(r => filtroStatus === "todos" || r.status === filtroStatus);

  const fmt = formatBRL;

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Controle de receitas e faturamento" icon={DollarSign} />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <StatGrid>
            <StatCard label="Faturamento do Mês" value={fmt(faturamentoMes)} icon={DollarSign} tone="primary" hint="Recebido neste mês" />
            <StatCard label="Total Recebido" value={fmt(totalRecebido)} icon={TrendingUp} tone="success" hint="Todo o período" />
            <StatCard label="Pendentes" value={fmt(pendentes)} icon={Clock} tone="warning" hint="A receber" />
            <StatCard label="Ticket Médio" value={fmt(ticketMedio)} icon={Users} tone="neutral" hint={`${pagosCount} recebimento${pagosCount !== 1 ? "s" : ""}`} />
          </StatGrid>

          <Card>
            <CardHeader><CardTitle className="text-base">Faturamento — Últimos 6 meses</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [fmt(v), "Total"]} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receitas" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS_LIST.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nova Receita</Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceitas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma receita encontrada</TableCell></TableRow>
                ) : filteredReceitas.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(parseISO(r.data_pagamento), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pacientes.find(p => p.id === r.paciente_id)?.nome_completo || "—"}
                    </TableCell>
                    <TableCell><Badge variant="outline">{CATEGORIAS.find(c => c.value === r.categoria)?.label}</Badge></TableCell>
                    <TableCell className="text-sm">{FORMAS.find(f => f.value === r.forma_pagamento)?.label}</TableCell>
                    <TableCell className="font-medium">{fmt(Number(r.valor))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_LIST.find(s => s.value === r.status)?.variant || "default"}>
                        {STATUS_LIST.find(s => s.value === r.status)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Receita" : "Nova Receita"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
              </div>
              <div>
                <Label>Data Pagamento</Label>
                <Input type="date" value={form.data_pagamento} onChange={e => setForm(p => ({ ...p, data_pagamento: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm(p => ({ ...p, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Paciente</Label>
                <Select value={form.paciente_id || "nenhum"} onValueChange={v => setForm(p => ({ ...p, paciente_id: v === "nenhum" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {pacientes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Registrar Receita"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
