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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Search, Pill, FlaskConical, Pencil, Copy, Trash2, X } from "lucide-react";

const categoriaLabels: Record<string, string> = {
  proteinas_aminoacidos: "Proteínas e Aminoácidos",
  vitaminas_minerais: "Vitaminas e Minerais",
  omega_gorduras: "Ômega e Gorduras",
  probioticos_fibras: "Probióticos e Fibras",
  performance_energia: "Performance e Energia",
  fitoterapicos: "Fitoterápicos",
  colageno_pele: "Colágeno e Pele",
  emagrecimento: "Emagrecimento",
  ganho_massa: "Ganho de Massa",
  saude_intestinal: "Saúde Intestinal",
  hormonal: "Hormonal",
  sono_ansiedade: "Sono e Ansiedade",
  imunidade: "Imunidade",
  outro: "Outro",
};

const categoriaCores: Record<string, string> = {
  proteinas_aminoacidos: "bg-blue-100 text-blue-700",
  vitaminas_minerais: "bg-orange-100 text-orange-700",
  omega_gorduras: "bg-yellow-100 text-yellow-700",
  probioticos_fibras: "bg-green-100 text-green-700",
  performance_energia: "bg-red-100 text-red-700",
  fitoterapicos: "bg-emerald-100 text-emerald-700",
  colageno_pele: "bg-pink-100 text-pink-700",
  emagrecimento: "bg-cyan-100 text-cyan-700",
  ganho_massa: "bg-indigo-100 text-indigo-700",
  saude_intestinal: "bg-lime-100 text-lime-700",
  hormonal: "bg-fuchsia-100 text-fuchsia-700",
  sono_ansiedade: "bg-violet-100 text-violet-700",
  imunidade: "bg-teal-100 text-teal-700",
  outro: "bg-gray-100 text-gray-700",
};

interface Ativo { id?: string; nome_ativo: string; dose: number | null; unidade: string; }

const emptyForm = {
  nome: "", tipo: "suplemento" as "suplemento" | "manipulado",
  categoria: "outro", apresentacao: "cápsula", unidade_medida: "mg",
  dose_padrao: "", marca_referencia: "", finalidade: "", observacoes: "", ativo: true,
};

export default function Suplementos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterCategoria, setFilterCategoria] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("suplementos_banco")
      .select("*, manipulado_ativos(*)")
      .eq("user_id", user!.id)
      .order("nome");
    setItems(data || []);
    setLoading(false);
  };

  const openNew = (tipo: "suplemento" | "manipulado") => {
    setEditId(null);
    setForm({ ...emptyForm, tipo });
    setAtivos([]);
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      nome: item.nome, tipo: item.tipo, categoria: item.categoria,
      apresentacao: item.apresentacao || "", unidade_medida: item.unidade_medida || "",
      dose_padrao: item.dose_padrao?.toString() || "", marca_referencia: item.marca_referencia || "",
      finalidade: item.finalidade || "", observacoes: item.observacoes || "", ativo: item.ativo,
    });
    setAtivos((item.manipulado_ativos || []).map((a: any) => ({
      id: a.id, nome_ativo: a.nome_ativo, dose: a.dose, unidade: a.unidade || "mg",
    })));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: "Preencha o nome", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user!.id, nome: form.nome, tipo: form.tipo as any, categoria: form.categoria as any,
        apresentacao: form.apresentacao, unidade_medida: form.unidade_medida,
        dose_padrao: form.dose_padrao ? parseFloat(form.dose_padrao) : null,
        marca_referencia: form.marca_referencia || null,
        finalidade: form.finalidade || null, observacoes: form.observacoes || null, ativo: form.ativo,
      };

      let supId = editId;
      const sb = supabase as any;
      if (editId) {
        await sb.from("suplementos_banco").update(payload).eq("id", editId);
      } else {
        const { data } = await sb.from("suplementos_banco").insert(payload).select("id").single();
        supId = data!.id;
      }

      // Manage ativos for manipulados
      if (form.tipo === "manipulado" && supId) {
        await sb.from("manipulado_ativos").delete().eq("suplemento_id", supId);
        if (ativos.length > 0) {
          await sb.from("manipulado_ativos").insert(
            ativos.map(a => ({ suplemento_id: supId!, nome_ativo: a.nome_ativo, dose: a.dose, unidade: a.unidade }))
          );
        }
      }

      toast({ title: editId ? "Atualizado!" : "Cadastrado!" });
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDuplicate = async (item: any) => {
    const sb = supabase as any;
    const { id, manipulado_ativos, created_at, updated_at, ...rest } = item;
    const { data } = await sb.from("suplementos_banco").insert({ ...rest, nome: `${rest.nome} (cópia)` }).select("id").single();
    if (data && manipulado_ativos?.length) {
      await sb.from("manipulado_ativos").insert(
        manipulado_ativos.map((a: any) => ({ suplemento_id: data.id, nome_ativo: a.nome_ativo, dose: a.dose, unidade: a.unidade }))
      );
    }
    toast({ title: "Duplicado!" });
    load();
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("suplementos_banco").delete().eq("id", id);
    toast({ title: "Excluído!" });
    load();
  };

  const filtered = items.filter(i => {
    if (search && !i.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTipo !== "todos" && i.tipo !== filterTipo) return false;
    if (filterCategoria !== "todos" && i.categoria !== filterCategoria) return false;
    if (filterStatus === "ativo" && !i.ativo) return false;
    if (filterStatus === "inativo" && i.ativo) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Suplementos e Manipulados" description="Banco global de suplementos e fórmulas manipuladas" icon={Pill}>
        <div className="flex gap-2">
          <Button onClick={() => openNew("suplemento")}><Pill className="h-4 w-4 mr-1" /> Suplemento</Button>
          <Button variant="outline" onClick={() => openNew("manipulado")}><FlaskConical className="h-4 w-4 mr-1" /> Manipulado</Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos tipos</SelectItem>
                <SelectItem value="suplemento">Suplemento</SelectItem>
                <SelectItem value="manipulado">Manipulado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas categorias</SelectItem>
                {Object.entries(categoriaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Apresentação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum suplemento cadastrado.</TableCell></TableRow>
            ) : filtered.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {item.tipo === "suplemento" ? <Pill className="h-3 w-3 mr-1" /> : <FlaskConical className="h-3 w-3 mr-1" />}
                    {item.tipo}
                  </Badge>
                </TableCell>
                <TableCell><Badge className={categoriaCores[item.categoria] || categoriaCores.outro}>{categoriaLabels[item.categoria] || item.categoria}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{item.apresentacao}</TableCell>
                <TableCell>{item.ativo ? <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(item)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Novo"} {form.tipo === "manipulado" ? "Manipulado" : "Suplemento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(categoriaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Apresentação</Label>
                <Select value={form.apresentacao} onValueChange={v => setForm(f => ({ ...f, apresentacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pó", "Cápsula", "Comprimido", "Líquido", "Goma", "Sachê", "Creme", "Outro"].map(o => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidade de medida</Label>
                <Select value={form.unidade_medida} onValueChange={v => setForm(f => ({ ...f, unidade_medida: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["g", "mg", "mcg", "ml", "UI", "UFC", "outro"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dose padrão</Label>
                <Input type="number" value={form.dose_padrao} onChange={e => setForm(f => ({ ...f, dose_padrao: e.target.value }))} placeholder="Ex: 500" />
              </div>
            </div>
            {form.tipo === "suplemento" && (
              <div>
                <Label>Marca de referência</Label>
                <Input value={form.marca_referencia} onChange={e => setForm(f => ({ ...f, marca_referencia: e.target.value }))} />
              </div>
            )}
            {form.tipo === "manipulado" && (
              <>
                <div>
                  <Label>Finalidade</Label>
                  <Select value={form.finalidade || ""} onValueChange={v => setForm(f => ({ ...f, finalidade: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {["Emagrecimento", "Ganho de massa", "Saúde intestinal", "Hormonal", "Sono e ansiedade", "Imunidade", "Performance", "Outro"].map(f =>
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Composição (ativos)</Label>
                  <div className="space-y-2">
                    {ativos.map((a, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input placeholder="Nome do ativo" value={a.nome_ativo} onChange={e => { const n = [...ativos]; n[i].nome_ativo = e.target.value; setAtivos(n); }} className="flex-1" />
                        <Input type="number" placeholder="Dose" value={a.dose ?? ""} onChange={e => { const n = [...ativos]; n[i].dose = e.target.value ? parseFloat(e.target.value) : null; setAtivos(n); }} className="w-20" />
                        <Select value={a.unidade} onValueChange={v => { const n = [...ativos]; n[i].unidade = v; setAtivos(n); }}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>{["mg", "mcg", "g", "UI"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => setAtivos(ativos.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setAtivos([...ativos, { nome_ativo: "", dose: null, unidade: "mg" }])}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar ativo
                    </Button>
                  </div>
                </div>
              </>
            )}
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
