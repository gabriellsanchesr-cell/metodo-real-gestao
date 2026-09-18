import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Copy, FileText, FileUp, Pencil, Trash2, FileDown } from "lucide-react";
import { ImportarPlanoPdfModal } from "@/components/paciente/ImportarPlanoPdfModal";
import { PlanoAlimentarEditor } from "@/components/paciente/PlanoAlimentarEditor";
import { ExportPdfModal } from "@/components/pdf/ExportPdfModal";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const objetivoLabels: Record<string, string> = {
  emagrecimento: "Emagrecimento",
  ganho_de_massa: "Ganho de Massa",
  saude_intestinal: "Saúde Intestinal",
  controle_ansiedade_alimentar: "Controle de Ansiedade",
  performance: "Performance",
  outro: "Outro",
};

export default function Templates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedPaciente, setSelectedPaciente] = useState("");
  const [form, setForm] = useState({ nome: "", objetivo_template: "emagrecimento", observacoes: "" });
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null | "new">(null);
  const [importedDraft, setImportedDraft] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportTemplate, setExportTemplate] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadTemplates();
      loadPacientes();
    }
  }, [user]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("planos_alimentares")
      .select("*")
      .eq("is_template", true)
      .order("created_at", { ascending: false });
    setTemplates(data || []);
  };

  const loadPacientes = async () => {
    const { data } = await supabase.from("pacientes").select("id, nome_completo").eq("ativo", true).order("nome_completo");
    setPacientes(data || []);
  };

  const createTemplate = async () => {
    if (!user) return;
    const { error } = await supabase.from("planos_alimentares").insert({
      user_id: user.id,
      nome: form.nome || "Template",
      is_template: true,
      objetivo_template: form.objetivo_template as any,
      observacoes: form.observacoes || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template criado!" });
      setDialogOpen(false);
      setForm({ nome: "", objetivo_template: "emagrecimento", observacoes: "" });
      loadTemplates();
    }
  };

  const duplicateForPaciente = async () => {
    if (!user || !selectedTemplate || !selectedPaciente) return;
    try {
      const { data: novo, error } = await supabase.from("planos_alimentares").insert({
        user_id: user.id,
        paciente_id: selectedPaciente,
        nome: selectedTemplate.nome,
        observacoes: selectedTemplate.observacoes,
        is_template: false,
        status: "rascunho",
      }).select("id").single();
      if (error) throw error;

      // copia refeições e alimentos
      const { data: refs } = await supabase.from("refeicoes")
        .select("*, alimentos_plano(*)").eq("plano_id", selectedTemplate.id);
      if (refs) {
        for (const ref of refs) {
          const { data: newRef } = await supabase.from("refeicoes").insert({
            plano_id: novo.id, tipo: ref.tipo, ordem: ref.ordem,
            observacoes: ref.observacoes, substituicoes_sugeridas: ref.substituicoes_sugeridas,
          }).select("id").single();
          if (newRef && ref.alimentos_plano?.length) {
            await supabase.from("alimentos_plano").insert(
              ref.alimentos_plano.map((a: any) => ({
                refeicao_id: newRef.id, nome_alimento: a.nome_alimento,
                quantidade: a.quantidade, medida_caseira: a.medida_caseira,
                energia_kcal: a.energia_kcal, proteina_g: a.proteina_g,
                carboidrato_g: a.carboidrato_g, lipidio_g: a.lipidio_g,
                fibra_g: a.fibra_g, alimento_taco_id: a.alimento_taco_id,
              }))
            );
          }
        }
      }
      toast({ title: "Plano duplicado para o paciente!" });
      setDuplicateDialogOpen(false);
      setSelectedPaciente("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const deleteTemplate = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("planos_alimentares").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template excluído." });
    }
    setDeleteId(null);
    loadTemplates();
  };

  const handleImported = async (draft: { nome: string; observacoes: string; refeicoes: any[] }) => {
    setImportedDraft(draft);
    setEditingId("new");
  };

  if (editingId !== null) {
    return (
      <PlanoAlimentarEditor
        planoId={editingId === "new" ? undefined : editingId}
        isTemplate
        initialData={importedDraft}
        onBack={() => { setEditingId(null); setImportedDraft(null); loadTemplates(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Templates de Plano" description={`${templates.length} template${templates.length !== 1 ? "s" : ""} disponíve${templates.length !== 1 ? "is" : "l"}`} icon={FileText}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" /> Importar PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Template</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select value={form.objetivo_template} onValueChange={(v) => setForm((f) => ({ ...f, objetivo_template: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(objetivoLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <Button onClick={createTemplate} className="w-full">Criar Template</Button>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Duplicar para Paciente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Template: <strong>{selectedTemplate?.nome}</strong></p>
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={selectedPaciente} onValueChange={setSelectedPaciente}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={duplicateForPaciente} className="w-full" disabled={!selectedPaciente}>Duplicar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{t.nome}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div className="flex items-center justify-between">
                <span className="capitalize">{objetivoLabels[t.objetivo_template] || "—"}</span>
                <span className="text-xs">{format(new Date(t.created_at), "dd/MM/yyyy")}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button variant="outline" size="sm" className="flex-1 min-w-[100px]" onClick={() => setEditingId(t.id)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="flex-1 min-w-[100px]" onClick={() => { setSelectedTemplate(t); setDuplicateDialogOpen(true); }}>
                  <Copy className="h-3 w-3 mr-1" /> Duplicar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExportTemplate(t)} title="Exportar PDF">
                  <FileDown className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)} title="Excluir">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">Nenhum template criado ainda</p>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todas as refeições e alimentos deste template serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTemplate} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {exportTemplate && (
        <ExportPdfModal
          open={!!exportTemplate}
          onOpenChange={(open) => { if (!open) setExportTemplate(null); }}
          type="plano_alimentar"
          paciente={{ nome_completo: "Template", id: "" }}
          planoData={exportTemplate}
        />
      )}

      <ImportarPlanoPdfModal
        open={importOpen}
        onOpenChange={setImportOpen}
        mode="template"
        onImported={handleImported}
      />
    </div>
  );
}
