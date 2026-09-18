import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";
import {
  Plus, Trash2, Edit, Send, ArrowLeft, Clock, Users, Search,
  UtensilsCrossed, X, ChevronDown, ChevronUp, Eye,
} from "lucide-react";

interface Ingrediente {
  nome: string;
  quantidade: string;
  unidade: string;
}

interface Receita {
  id: string;
  titulo: string;
  descricao: string;
  modo_preparo: string;
  tempo_preparo_min: number | null;
  porcoes: number;
  ingredientes: Ingrediente[];
  calorias_total: number;
  proteina_total: number;
  carboidrato_total: number;
  gordura_total: number;
  fibra_total: number;
  tags: string[];
  foto_url: string | null;
  created_at: string;
}

const TAG_OPTIONS = [
  "Low Carb", "High Protein", "Vegano", "Vegetariano", "Sem Glúten",
  "Sem Lactose", "Keto", "Fit", "Rápida", "Econômica", "Doce", "Salgada",
];

const emptyReceita: Omit<Receita, "id" | "created_at"> = {
  titulo: "", descricao: "", modo_preparo: "", tempo_preparo_min: null, porcoes: 1,
  ingredientes: [{ nome: "", quantidade: "", unidade: "g" }],
  calorias_total: 0, proteina_total: 0, carboidrato_total: 0, gordura_total: 0, fibra_total: 0,
  tags: [], foto_url: null,
};

export function ReceitaSection({ paciente }: { paciente: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [enviadas, setEnviadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyReceita);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<Receita | null>(null);
  const [sendModal, setSendModal] = useState(false);
  const [avisar, setAvisar] = useState(true);
  const [sendReceitaId, setSendReceitaId] = useState<string | null>(null);

  useEffect(() => { loadReceitas(); }, []);

  const loadReceitas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("receitas")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setReceitas((data as any) || []);

    const { data: rp } = await supabase
      .from("receitas_pacientes")
      .select("receita_id")
      .eq("paciente_id", paciente.id);
    setEnviadas((rp || []).map((r: any) => r.receita_id));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Erro", description: "Título é obrigatório.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      ingredientes: JSON.parse(JSON.stringify(form.ingredientes.filter(i => i.nome.trim()))),
      user_id: user!.id,
    };

    if (editingId) {
      const { error } = await supabase.from("receitas").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Receita atualizada!" }); }
    } else {
      const { error } = await supabase.from("receitas").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Receita criada!" }); }
    }
    setSaving(false);
    setView("list");
    setEditingId(null);
    setForm(emptyReceita);
    loadReceitas();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("receitas").delete().eq("id", id);
    toast({ title: "Receita excluída." });
    loadReceitas();
  };

  const handleSend = async () => {
    if (!sendReceitaId) return;
    const { error } = await supabase.from("receitas_pacientes").insert({
      receita_id: sendReceitaId,
      paciente_id: paciente.id,
      user_id: user!.id,
    });
    if (error?.code === "23505") {
      toast({ title: "Já enviada", description: "Esta receita já foi enviada para este paciente." });
    } else if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Receita enviada!" });
      if (avisar) {
        const titulo = receitas.find((x) => x.id === sendReceitaId)?.titulo;
        avisarPaciente(paciente.id, "receita_nova", { titulo });
      }
      loadReceitas();
    }
    setSendModal(false);
    setSendReceitaId(null);
  };

  const handleRemoveSend = async (receitaId: string) => {
    await supabase.from("receitas_pacientes").delete()
      .eq("receita_id", receitaId).eq("paciente_id", paciente.id);
    toast({ title: "Envio removido." });
    loadReceitas();
  };

  const openEdit = (r: Receita) => {
    setForm({
      titulo: r.titulo, descricao: r.descricao, modo_preparo: r.modo_preparo,
      tempo_preparo_min: r.tempo_preparo_min, porcoes: r.porcoes,
      ingredientes: (r.ingredientes as any)?.length ? r.ingredientes : [{ nome: "", quantidade: "", unidade: "g" }],
      calorias_total: r.calorias_total, proteina_total: r.proteina_total,
      carboidrato_total: r.carboidrato_total, gordura_total: r.gordura_total,
      fibra_total: r.fibra_total, tags: r.tags || [], foto_url: r.foto_url,
    });
    setEditingId(r.id);
    setView("form");
  };

  const openNew = () => {
    setForm(emptyReceita);
    setEditingId(null);
    setView("form");
  };

  const addIngredient = () => {
    setForm(f => ({ ...f, ingredientes: [...f.ingredientes, { nome: "", quantidade: "", unidade: "g" }] }));
  };

  const removeIngredient = (idx: number) => {
    setForm(f => ({ ...f, ingredientes: f.ingredientes.filter((_, i) => i !== idx) }));
  };

  const updateIngredient = (idx: number, field: keyof Ingrediente, value: string) => {
    setForm(f => ({
      ...f,
      ingredientes: f.ingredientes.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing),
    }));
  };

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  const filtered = receitas.filter(r =>
    r.titulo.toLowerCase().includes(search.toLowerCase()) ||
    r.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  if (view === "detail" && selectedDetail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedDetail(null); }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <ReceitaDetailCard receita={selectedDetail} />
      </div>
    );
  }

  if (view === "form") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setEditingId(null); setForm(emptyReceita); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h2 className="text-lg font-bold" style={{ color: "#1A1F3C" }}>
            {editingId ? "Editar Receita" : "Nova Receita"}
          </h2>
          <div />
        </div>

        {/* Título + Descrição */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium" style={{ color: "#1A1F3C" }}>Título *</Label>
              <Input
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Frango grelhado com legumes"
                className="mt-1 h-11 rounded-lg"
                style={{ backgroundColor: "#F4F5FA" }}
              />
            </div>
            <div>
              <Label className="text-sm font-medium" style={{ color: "#1A1F3C" }}>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Uma breve descrição da receita..."
                className="mt-1 rounded-lg"
                style={{ backgroundColor: "#F4F5FA" }}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium" style={{ color: "#1A1F3C" }}>Tempo de preparo (min)</Label>
                <Input
                  type="number"
                  value={form.tempo_preparo_min ?? ""}
                  onChange={e => setForm(f => ({ ...f, tempo_preparo_min: e.target.value ? Number(e.target.value) : null }))}
                  className="mt-1 h-11 rounded-lg"
                  style={{ backgroundColor: "#F4F5FA" }}
                />
              </div>
              <div>
                <Label className="text-sm font-medium" style={{ color: "#1A1F3C" }}>Porções</Label>
                <Input
                  type="number"
                  value={form.porcoes}
                  onChange={e => setForm(f => ({ ...f, porcoes: Number(e.target.value) || 1 }))}
                  className="mt-1 h-11 rounded-lg"
                  style={{ backgroundColor: "#F4F5FA" }}
                  min={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredientes */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ color: "#1A1F3C" }}>Ingredientes</CardTitle>
              <Button size="sm" variant="outline" onClick={addIngredient} className="h-8 text-xs rounded-lg">
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            {form.ingredientes.map((ing, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  placeholder="Ingrediente"
                  value={ing.nome}
                  onChange={e => updateIngredient(idx, "nome", e.target.value)}
                  className="flex-1 h-10 rounded-lg text-sm"
                  style={{ backgroundColor: "#F4F5FA" }}
                />
                <Input
                  placeholder="Qtd"
                  value={ing.quantidade}
                  onChange={e => updateIngredient(idx, "quantidade", e.target.value)}
                  className="w-20 h-10 rounded-lg text-sm"
                  style={{ backgroundColor: "#F4F5FA" }}
                />
                <Input
                  placeholder="Un."
                  value={ing.unidade}
                  onChange={e => updateIngredient(idx, "unidade", e.target.value)}
                  className="w-16 h-10 rounded-lg text-sm"
                  style={{ backgroundColor: "#F4F5FA" }}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeIngredient(idx)}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Modo de Preparo */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-5">
            <Label className="text-sm font-medium" style={{ color: "#1A1F3C" }}>Modo de Preparo</Label>
            <Textarea
              value={form.modo_preparo}
              onChange={e => setForm(f => ({ ...f, modo_preparo: e.target.value }))}
              placeholder="Descreva o passo a passo..."
              className="mt-1 rounded-lg"
              style={{ backgroundColor: "#F4F5FA" }}
              rows={5}
            />
          </CardContent>
        </Card>

        {/* Info Nutricional */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: "#1A1F3C" }}>Informações Nutricionais (total da receita)</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="grid grid-cols-5 gap-3">
              {[
                { key: "calorias_total", label: "Kcal", color: "#2B3990" },
                { key: "proteina_total", label: "Prot (g)", color: "#2B3990" },
                { key: "carboidrato_total", label: "Carb (g)", color: "#F59E0B" },
                { key: "gordura_total", label: "Gord (g)", color: "#FCD34D" },
                { key: "fibra_total", label: "Fibra (g)", color: "#22C55E" },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <Label className="text-xs" style={{ color: "#6B7080" }}>{label}</Label>
                  <Input
                    type="number"
                    value={(form as any)[key] || ""}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) || 0 }))}
                    className="h-10 rounded-lg text-sm mt-1"
                    style={{ backgroundColor: "#F4F5FA", borderColor: color + "40" }}
                    min={0}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-5">
            <Label className="text-sm font-medium" style={{ color: "#1A1F3C" }}>Tags dietéticas</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TAG_OPTIONS.map(tag => (
                <Badge
                  key={tag}
                  variant={form.tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer text-xs rounded-full px-3 py-1 transition-colors"
                  style={form.tags.includes(tag) ? { backgroundColor: "#2B3990", color: "#fff" } : {}}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-[52px] rounded-xl text-base font-semibold"
          style={{ backgroundColor: "#2B3990" }}
        >
          {saving ? "Salvando..." : editingId ? "Atualizar Receita" : "Salvar Receita"}
        </Button>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: "#1A1F3C" }}>Receituário</h2>
        <Button onClick={openNew} className="rounded-lg h-9 text-sm" style={{ backgroundColor: "#2B3990" }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Receita
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar receita ou tag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-11 rounded-lg"
          style={{ backgroundColor: "#F4F5FA" }}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "#6B7080" }} />
            <p className="font-medium" style={{ color: "#1A1F3C" }}>Nenhuma receita encontrada</p>
            <p className="text-sm mt-1" style={{ color: "#6B7080" }}>Crie sua primeira receita clicando no botão acima.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => {
            const isSent = enviadas.includes(r.id);
            return (
              <Card key={r.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0" onClick={() => { setSelectedDetail(r); setView("detail"); }} role="button">
                      <h3 className="font-semibold text-sm truncate" style={{ color: "#1A1F3C" }}>{r.titulo}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#6B7080" }}>
                        {r.tempo_preparo_min && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.tempo_preparo_min} min</span>
                        )}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.porcoes} porç.</span>
                        <span>{r.calorias_total} kcal</span>
                      </div>
                      {r.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.tags.slice(0, 4).map(t => (
                            <Badge key={t} variant="outline" className="text-[10px] rounded-full px-2 py-0">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isSent ? (
                        <Button
                          variant="outline" size="sm"
                          className="h-8 text-xs rounded-lg border-emerald-200 text-emerald-700 bg-emerald-50"
                          onClick={() => handleRemoveSend(r.id)}
                        >
                          ✓ Enviada
                        </Button>
                      ) : (
                        <Button
                          variant="outline" size="sm"
                          className="h-8 text-xs rounded-lg"
                          onClick={() => { setSendReceitaId(r.id); setAvisar(true); setSendModal(true); }}
                        >
                          <Send className="h-3 w-3 mr-1" /> Enviar
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                        <Edit className="h-3.5 w-3.5" style={{ color: "#6B7080" }} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Send confirmation modal */}
      <Dialog open={sendModal} onOpenChange={setSendModal}>
        <DialogContent className="rounded-xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar receita</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enviar esta receita para <strong>{paciente.nome_completo}</strong>?
          </p>
          <AvisarPacienteToggle checked={avisar} onCheckedChange={setAvisar} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendModal(false)}>Cancelar</Button>
            <Button onClick={handleSend} style={{ backgroundColor: "#2B3990" }}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceitaDetailCard({ receita: r }: { receita: Receita }) {
  const [showPreparo, setShowPreparo] = useState(true);
  const ingredientes = (r.ingredientes as any as Ingrediente[]) || [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "#1A1F3C" }}>{r.titulo}</h2>
        {r.descricao && <p className="text-sm mt-1" style={{ color: "#6B7080" }}>{r.descricao}</p>}
        <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: "#6B7080" }}>
          {r.tempo_preparo_min && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {r.tempo_preparo_min} min</span>}
          <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {r.porcoes} porção(ões)</span>
        </div>
        {r.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {r.tags.map(t => (
              <Badge key={t} variant="outline" className="text-xs rounded-full px-3">{t}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { v: r.calorias_total, l: "Kcal", c: "#2B3990" },
          { v: r.proteina_total, l: "Prot", c: "#2B3990" },
          { v: r.carboidrato_total, l: "Carb", c: "#F59E0B" },
          { v: r.gordura_total, l: "Gord", c: "#FCD34D" },
          { v: r.fibra_total, l: "Fibra", c: "#22C55E" },
        ].map(({ v, l, c }) => (
          <Card key={l} className="rounded-xl text-center">
            <CardContent className="p-3">
              <p className="text-lg font-bold" style={{ color: c }}>{v || 0}</p>
              <p className="text-[10px]" style={{ color: "#6B7080" }}>{l}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ingredientes */}
      {ingredientes.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm" style={{ color: "#1A1F3C" }}>Ingredientes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ul className="space-y-1.5">
              {ingredientes.map((ing, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#1A1F3C" }}>
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "#2B3990" }} />
                  {ing.quantidade && <span className="font-medium">{ing.quantidade}{ing.unidade}</span>}
                  <span>{ing.nome}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Modo de Preparo */}
      {r.modo_preparo && (
        <Card className="rounded-xl">
          <button
            className="w-full flex items-center justify-between p-4"
            onClick={() => setShowPreparo(!showPreparo)}
          >
            <span className="text-sm font-semibold" style={{ color: "#1A1F3C" }}>Modo de Preparo</span>
            {showPreparo ? <ChevronUp className="h-4 w-4" style={{ color: "#6B7080" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#6B7080" }} />}
          </button>
          {showPreparo && (
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-sm whitespace-pre-wrap" style={{ color: "#1A1F3C" }}>{r.modo_preparo}</p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
