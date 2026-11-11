import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pill, FlaskConical, Trash2, FileDown } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  createDoc, addHeader, addFooter, sectionTitle, bodyText, autoTable, MARGINS, loadPdfConfig, addCoverPage,
} from "@/lib/pdf/pdfBrand";

const categoriaLabels: Record<string, string> = {
  proteinas_aminoacidos: "Proteínas", vitaminas_minerais: "Vitaminas",
  omega_gorduras: "Ômega", probioticos_fibras: "Probióticos",
  performance_energia: "Performance", fitoterapicos: "Fitoterápicos",
  colageno_pele: "Colágeno", emagrecimento: "Emagrecimento",
  ganho_massa: "Ganho Massa", saude_intestinal: "Intestinal",
  hormonal: "Hormonal", sono_ansiedade: "Sono", imunidade: "Imunidade", outro: "Outro",
};

const categoriaCores: Record<string, string> = {
  proteinas_aminoacidos: "bg-blue-100 text-blue-700 border-l-blue-500",
  vitaminas_minerais: "bg-orange-100 text-orange-700 border-l-orange-500",
  omega_gorduras: "bg-yellow-100 text-yellow-700 border-l-yellow-500",
  probioticos_fibras: "bg-green-100 text-green-700 border-l-green-500",
  performance_energia: "bg-red-100 text-red-700 border-l-red-500",
  fitoterapicos: "bg-emerald-100 text-emerald-700 border-l-emerald-500",
  colageno_pele: "bg-pink-100 text-pink-700 border-l-pink-500",
  emagrecimento: "bg-cyan-100 text-cyan-700 border-l-cyan-500",
  ganho_massa: "bg-indigo-100 text-indigo-700 border-l-indigo-500",
  saude_intestinal: "bg-lime-100 text-lime-700 border-l-lime-500",
  hormonal: "bg-fuchsia-100 text-fuchsia-700 border-l-fuchsia-500",
  sono_ansiedade: "bg-violet-100 text-violet-700 border-l-violet-500",
  imunidade: "bg-teal-100 text-teal-700 border-l-teal-500",
  outro: "bg-gray-100 text-gray-700 border-l-gray-500",
};

const frequenciaOpts = ["1x ao dia", "2x ao dia", "3x ao dia", "Dias alternados", "Somente dias de treino", "Personalizado"];
const momentoOpts = ["Em jejum", "Antes do café", "Com refeições", "Antes do treino", "Após o treino", "Antes de dormir", "Personalizado"];
const duracaoOpts = ["15 dias", "30 dias", "60 dias", "90 dias", "Contínuo", "Até reavaliação", "Personalizado"];

export function SuplementosSection({ paciente }: { paciente: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [banco, setBanco] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    suplemento_id: "", dose_prescrita: "", unidade_dose: "mg",
    frequencia: "1x ao dia", momento_uso: "Com refeições", duracao: "30 dias",
    data_inicio: format(new Date(), "yyyy-MM-dd"), data_fim: "",
    farmacia: "", qtd_capsulas: "", instrucoes_farmacia: "",
    observacoes_paciente: "", observacoes_internas: "",
  });

  useEffect(() => { if (user) load(); }, [user, paciente.id]);

  const load = async () => {
    const sb = supabase as any;
    const [{ data: presc }, { data: bancoData }] = await Promise.all([
      sb.from("prescricoes_suplementos")
        .select("*, suplementos_banco(*, manipulado_ativos(*))")
        .eq("paciente_id", paciente.id)
        .order("created_at", { ascending: false }),
      sb.from("suplementos_banco")
        .select("*")
        .eq("user_id", user!.id)
        .eq("ativo", true)
        .order("nome"),
    ]);
    setPrescricoes(presc || []);
    setBanco(bancoData || []);
    setLoading(false);
  };

  const ativas = prescricoes.filter(p => p.ativa);
  const historico = prescricoes.filter(p => !p.ativa);

  const openNew = () => {
    setEditId(null);
    setForm({
      suplemento_id: "", dose_prescrita: "", unidade_dose: "mg",
      frequencia: "1x ao dia", momento_uso: "Com refeições", duracao: "30 dias",
      data_inicio: format(new Date(), "yyyy-MM-dd"), data_fim: "",
      farmacia: "", qtd_capsulas: "", instrucoes_farmacia: "",
      observacoes_paciente: "", observacoes_internas: "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.suplemento_id) { toast({ title: "Selecione um suplemento", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user!.id, paciente_id: paciente.id,
        suplemento_id: form.suplemento_id,
        dose_prescrita: form.dose_prescrita || null,
        unidade_dose: form.unidade_dose || null,
        frequencia: form.frequencia, momento_uso: form.momento_uso,
        duracao: form.duracao, data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        farmacia: form.farmacia || null,
        qtd_capsulas: form.qtd_capsulas ? parseInt(form.qtd_capsulas) : null,
        instrucoes_farmacia: form.instrucoes_farmacia || null,
        observacoes_paciente: form.observacoes_paciente || null,
        observacoes_internas: form.observacoes_internas || null,
        ativa: true,
      };
      const sb = supabase as any;
      if (editId) {
        await sb.from("prescricoes_suplementos").update(payload).eq("id", editId);
      } else {
        await sb.from("prescricoes_suplementos").insert(payload);
      }
      toast({ title: editId ? "Atualizado!" : "Prescrito!" });
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleAtiva = async (id: string, ativa: boolean) => {
    await (supabase as any).from("prescricoes_suplementos").update({ ativa }).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("prescricoes_suplementos").delete().eq("id", id);
    toast({ title: "Removido!" });
    load();
  };

  const exportPdf = async () => {
    const config = await loadPdfConfig(user!.id);
    const doc = createDoc();
    addCoverPage(doc, "Prescrição de Suplementos", paciente.nome_completo, config);
    addHeader(doc, "Prescrição de Suplementos", config);

    let y = MARGINS.top + 12;

    // Patient info
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.setTextColor(107, 112, 128);
    doc.text(`Paciente: ${paciente.nome_completo}`, MARGINS.left, y); y += 5;
    doc.text(`Data: ${format(new Date(), "dd/MM/yyyy")}`, MARGINS.left, y); y += 10;

    // Suplementos
    const sups = ativas.filter(p => p.suplementos_banco?.tipo === "suplemento");
    const manips = ativas.filter(p => p.suplementos_banco?.tipo === "manipulado");

    if (sups.length > 0) {
      y = sectionTitle(doc, y, "Suplementos");
      y = autoTable(doc, y,
        [["Nome", "Dose", "Frequência", "Horário", "Duração"]],
        sups.map(p => [
          p.suplementos_banco?.nome || "—",
          `${p.dose_prescrita || "—"} ${p.unidade_dose || ""}`,
          p.frequencia || "—",
          p.momento_uso || "—",
          p.duracao || "—",
        ])
      );
      // Observações
      sups.forEach(p => {
        if (p.observacoes_paciente) {
          y = bodyText(doc, y, `${p.suplementos_banco?.nome}: ${p.observacoes_paciente}`);
        }
      });
    }

    if (manips.length > 0) {
      y = sectionTitle(doc, y, "Fórmulas Manipuladas");
      manips.forEach(p => {
        const sup = p.suplementos_banco;
        y = bodyText(doc, y, `${sup?.nome || "Fórmula"} — ${p.frequencia}, ${p.momento_uso}`);
        if (sup?.manipulado_ativos?.length) {
          y = autoTable(doc, y,
            [["Ativo", "Dose"]],
            sup.manipulado_ativos.map((a: any) => [a.nome_ativo, `${a.dose || "—"} ${a.unidade || ""}`])
          );
        }
        if (p.farmacia) y = bodyText(doc, y, `Farmácia: ${p.farmacia}`);
        if (p.instrucoes_farmacia) y = bodyText(doc, y, `Instruções: ${p.instrucoes_farmacia}`);
      });
    }

    // Disclaimer
    y += 10;
    doc.setFontSize(8); doc.setTextColor(107, 112, 128);
    doc.text("Este documento não substitui prescrição médica.", MARGINS.left, y);

    addFooter(doc, config);
    doc.save(`prescricao_suplementos_${paciente.nome_completo.replace(/\s+/g, "_")}.pdf`);
  };

  const selectedSup = banco.find(b => b.id === form.suplemento_id);

  const renderCard = (p: any, showActions = true) => {
    const sup = p.suplementos_banco;
    const cat = sup?.categoria || "outro";
    const borderColor = categoriaCores[cat]?.split(" ").find((c: string) => c.startsWith("border-l-")) || "border-l-gray-500";

    let remainingText = "";
    if (p.data_fim) {
      const remaining = differenceInDays(parseISO(p.data_fim), new Date());
      remainingText = remaining > 0 ? `${remaining} dias restantes` : "Encerrada";
    } else if (p.duracao === "Contínuo") {
      remainingText = "Contínuo";
    }

    return (
      <Card key={p.id} className={`border-l-4 ${borderColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                {sup?.tipo === "manipulado" ? <FlaskConical className="h-4 w-4 text-violet-500" /> : <Pill className="h-4 w-4 text-blue-500" />}
                <span className="font-semibold text-foreground">{sup?.nome || "—"}</span>
                <Badge className={categoriaCores[cat]?.split(" ").slice(0, 2).join(" ") || ""}>{categoriaLabels[cat] || cat}</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">{p.dose_prescrita} {p.unidade_dose} — {p.frequencia}</p>
                <p>{p.momento_uso} • {p.duracao}</p>
                {remainingText && <p className="text-xs">{remainingText}</p>}
                {p.observacoes_paciente && <p className="text-xs italic mt-1">{p.observacoes_paciente}</p>}
              </div>
              <p className="text-xs text-muted-foreground">Desde {format(parseISO(p.data_inicio), "dd/MM/yyyy")}</p>
            </div>
            {showActions && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => toggleAtiva(p.id, false)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="ativa">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="ativa">Prescrição Ativa ({ativas.length})</TabsTrigger>
            <TabsTrigger value="historico">Histórico ({historico.length})</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={ativas.length === 0}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Prescrever</Button>
          </div>
        </div>

        <TabsContent value="ativa">
          {ativas.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum suplemento prescrito. Clique em "Prescrever" para iniciar.</CardContent></Card>
          ) : (
            <div className="space-y-3">{ativas.map(p => renderCard(p))}</div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          {historico.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma prescrição anterior.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {historico.map(p => (
                <Card key={p.id} className="opacity-70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{p.suplementos_banco?.nome}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(p.data_inicio), "dd/MM/yyyy")} — {p.data_fim ? format(parseISO(p.data_fim), "dd/MM/yyyy") : "sem data fim"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleAtiva(p.id, true)}>Reativar</Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Prescribe Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Prescrever Suplemento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Suplemento *</Label>
              <Select value={form.suplemento_id} onValueChange={v => setForm(f => ({ ...f, suplemento_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione do banco" /></SelectTrigger>
                <SelectContent>
                  {banco.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.tipo === "manipulado" ? "🧪" : "💊"} {b.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dose prescrita</Label>
                <Input value={form.dose_prescrita} onChange={e => setForm(f => ({ ...f, dose_prescrita: e.target.value }))} placeholder="Ex: 500" />
              </div>
              <div>
                <Label>Unidade</Label>
                <Select value={form.unidade_dose} onValueChange={v => setForm(f => ({ ...f, unidade_dose: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["g", "mg", "mcg", "ml", "UI", "UFC", "cápsula(s)"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frequência</Label>
                <Select value={form.frequencia} onValueChange={v => setForm(f => ({ ...f, frequencia: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{frequenciaOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Momento de uso</Label>
                <Select value={form.momento_uso} onValueChange={v => setForm(f => ({ ...f, momento_uso: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{momentoOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duração</Label>
                <Select value={form.duracao} onValueChange={v => setForm(f => ({ ...f, duracao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{duracaoOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de início</Label>
                <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Data de término (opcional)</Label>
              <Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
            </div>

            {selectedSup?.tipo === "manipulado" && (
              <>
                <div>
                  <Label>Farmácia manipuladora</Label>
                  <Input value={form.farmacia} onChange={e => setForm(f => ({ ...f, farmacia: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Qtd cápsulas/sachês</Label>
                    <Input type="number" value={form.qtd_capsulas} onChange={e => setForm(f => ({ ...f, qtd_capsulas: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Instruções para farmácia</Label>
                  <Textarea value={form.instrucoes_farmacia} onChange={e => setForm(f => ({ ...f, instrucoes_farmacia: e.target.value }))} rows={2} />
                </div>
              </>
            )}

            <div>
              <Label>Observações para o paciente</Label>
              <Textarea value={form.observacoes_paciente} onChange={e => setForm(f => ({ ...f, observacoes_paciente: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Observações internas</Label>
              <Textarea value={form.observacoes_internas} onChange={e => setForm(f => ({ ...f, observacoes_internas: e.target.value }))} rows={2} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Prescrever"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
