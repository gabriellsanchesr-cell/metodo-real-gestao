import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Utensils, ChevronDown, ChevronUp, Pencil, Copy, Power, Trash2, Send, FileDown, Paperclip, Download, ExternalLink,
} from "lucide-react";
import { PlanoAlimentarEditor } from "./PlanoAlimentarEditor";
import { ExportPdfModal } from "@/components/pdf/ExportPdfModal";
import { ImportarPlanoPdfModal } from "./ImportarPlanoPdfModal";
import { AnexarPlanoPdfModal } from "./AnexarPlanoPdfModal";
import { PdfViewer } from "./PdfViewer";
import { FileUp } from "lucide-react";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const tipoRefeicaoLabels: Record<string, string> = {
  cafe_da_manha: "Café da Manhã", lanche_da_manha: "Lanche da Manhã", almoco: "Almoço",
  lanche_da_tarde: "Lanche da Tarde", jantar: "Jantar", ceia: "Ceia",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  inativo: { label: "Inativo", variant: "secondary" },
  rascunho: { label: "Rascunho", variant: "outline" },
};

interface Props {
  paciente: any;
}

export function PlanoAlimentarSection({ paciente }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refeicoes, setRefeicoes] = useState<Record<string, any[]>>({});
  const [editingPlanoId, setEditingPlanoId] = useState<string | null | "new">(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ativando, setAtivando] = useState<any | null>(null);
  const [avisarAtivacao, setAvisarAtivacao] = useState(true);
  const [exportPlano, setExportPlano] = useState<any>(null);
  const [exportType, setExportType] = useState<"plano_alimentar" | "plano_simplificado">("plano_alimentar");
  const [importOpen, setImportOpen] = useState(false);
  const [importedDraft, setImportedDraft] = useState<any>(null);
  const [anexarOpen, setAnexarOpen] = useState(false);
  const [anexarEditando, setAnexarEditando] = useState<any>(null);
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});

  useEffect(() => { loadPlanos(); }, [paciente.id]);

  const [anexoTotais, setAnexoTotais] = useState<Record<string, { kcal: number; p: number; c: number; g: number; f: number }>>({});

  const loadPlanos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("planos_alimentares")
      .select("*")
      .eq("paciente_id", paciente.id)
      .eq("is_template", false)
      .order("created_at", { ascending: false });
    setPlanos(data || []);

    // Carrega totais dos planos anexados (vindos da "refeição resumo")
    const anexoIds = (data || []).filter((p: any) => p.tipo === "anexo").map((p: any) => p.id);
    if (anexoIds.length) {
      const { data: refs } = await supabase
        .from("refeicoes")
        .select("plano_id, alimentos_plano(energia_kcal, proteina_g, carboidrato_g, lipidio_g, fibra_g, opcao)")
        .in("plano_id", anexoIds);
      const map: Record<string, any> = {};
      (refs || []).forEach((r: any) => {
        const acc = map[r.plano_id] || { kcal: 0, p: 0, c: 0, g: 0, f: 0 };
        (r.alimentos_plano || []).forEach((a: any) => {
          if (a.opcao && a.opcao !== "A") return;
          acc.kcal += a.energia_kcal || 0;
          acc.p += a.proteina_g || 0;
          acc.c += a.carboidrato_g || 0;
          acc.g += a.lipidio_g || 0;
          acc.f += a.fibra_g || 0;
        });
        map[r.plano_id] = acc;
      });
      setAnexoTotais(map);
    } else {
      setAnexoTotais({});
    }

    setLoading(false);
  };

  const toggleExpand = async (plano: any) => {
    const planoId = plano.id;
    if (expanded === planoId) { setExpanded(null); return; }
    setExpanded(planoId);
    if (plano.tipo === "anexo") {
      if (!pdfUrls[planoId] && plano.pdf_path) {
        const { data } = await supabase.storage.from("documentos-pdf").createSignedUrl(plano.pdf_path, 3600);
        if (data?.signedUrl) setPdfUrls(prev => ({ ...prev, [planoId]: data.signedUrl }));
      }
      return;
    }
    if (!refeicoes[planoId]) {
      const { data: refs } = await supabase
        .from("refeicoes")
        .select("*, alimentos_plano(*)")
        .eq("plano_id", planoId)
        .order("ordem", { ascending: true });
      setRefeicoes(prev => ({ ...prev, [planoId]: refs || [] }));
    }
  };

  const openPdfNewTab = async (plano: any) => {
    if (!plano.pdf_path) return;
    const { data } = await supabase.storage.from("documentos-pdf").createSignedUrl(plano.pdf_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const downloadPdf = async (plano: any) => {
    if (!plano.pdf_path) return;
    const { data } = await supabase.storage.from("documentos-pdf").createSignedUrl(plano.pdf_path, 3600, { download: plano.pdf_nome || "plano.pdf" });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const duplicatePlano = async (plano: any) => {
    if (!user) return;
    try {
      // Plano do tipo anexo: copia o arquivo e cria registro
      if (plano.tipo === "anexo") {
        let newPath: string | null = null;
        if (plano.pdf_path) {
          const { data: file } = await supabase.storage.from("documentos-pdf").download(plano.pdf_path);
          if (file) {
            newPath = `planos/${paciente.id}/${Date.now()}_copia_${(plano.pdf_nome || "plano.pdf").replace(/[^\w.\-]+/g, "_")}`;
            await supabase.storage.from("documentos-pdf").upload(newPath, file, { contentType: "application/pdf", upsert: false });
          }
        }
        const { error } = await supabase.from("planos_alimentares").insert({
          user_id: user.id, paciente_id: paciente.id,
          nome: `${plano.nome} (cópia)`, observacoes: plano.observacoes,
          status: "rascunho", is_template: false,
          tipo: "anexo", pdf_path: newPath, pdf_nome: plano.pdf_nome,
        } as any);
        if (error) throw error;
        toast({ title: "Plano duplicado!" });
        loadPlanos();
        return;
      }

      const { data: newPlano, error } = await supabase.from("planos_alimentares").insert({
        user_id: user.id, paciente_id: paciente.id,
        nome: `${plano.nome} (cópia)`, observacoes: plano.observacoes,
        status: "rascunho", is_template: false,
      }).select("id").single();
      if (error) throw error;

      const { data: refs } = await supabase.from("refeicoes")
        .select("*, alimentos_plano(*)").eq("plano_id", plano.id);
      if (refs) {
        for (const ref of refs) {
          const { data: newRef } = await supabase.from("refeicoes").insert({
            plano_id: newPlano.id, tipo: ref.tipo, ordem: ref.ordem,
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
      toast({ title: "Plano duplicado!" });
      loadPlanos();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleStatus = async (plano: any, avisar = false) => {
    const newStatus = plano.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("planos_alimentares").update({ status: newStatus } as any).eq("id", plano.id);
    if (error) {
      toast({ title: "Não consegui alterar o plano", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Plano ${newStatus === "ativo" ? "ativado" : "desativado"}!` });
    if (newStatus === "ativo" && avisar) avisarPaciente(paciente.id, "plano_novo", { titulo: plano.nome });
    loadPlanos();
  };

  // Desativar é imediato. Ativar pergunta antes, porque é o momento em que o
  // plano aparece para a paciente e em que faz sentido avisá-la.
  const pedirToggle = (plano: Parameters<typeof toggleStatus>[0]) => {
    if (plano.status === "ativo") { toggleStatus(plano); return; }
    setAvisarAtivacao(true);
    setAtivando(plano);
  };

  const deletePlano = async () => {
    if (!deleteId) return;
    const plano = planos.find(p => p.id === deleteId);
    if (plano?.tipo === "anexo" && plano.pdf_path) {
      await supabase.storage.from("documentos-pdf").remove([plano.pdf_path]);
    }
    await supabase.from("planos_alimentares").delete().eq("id", deleteId);
    setDeleteId(null);
    toast({ title: "Plano excluído." });
    loadPlanos();
  };

  if (editingPlanoId !== null) {
    return (
      <PlanoAlimentarEditor
        pacienteId={paciente.id}
        planoId={editingPlanoId === "new" ? undefined : editingPlanoId}
        onBack={() => { setEditingPlanoId(null); setImportedDraft(null); loadPlanos(); }}
        paciente={paciente}
        initialData={importedDraft}
      />
    );
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando planos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-foreground">Planos Alimentares</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="h-3.5 w-3.5 mr-1" /> Importar PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setAnexarEditando(null); setAnexarOpen(true); }}>
            <Paperclip className="h-3.5 w-3.5 mr-1" /> Anexar PDF
          </Button>
          <Button size="sm" onClick={() => { setImportedDraft(null); setEditingPlanoId("new"); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Plano
          </Button>
        </div>
      </div>

      {planos.length === 0 ? (
        <Card className="border-border rounded-xl">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum plano alimentar cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        planos.map(plano => {
          const st = statusLabels[(plano as any).status] || statusLabels.rascunho;
          const isAnexo = plano.tipo === "anexo";
          return (
            <Card key={plano.id} className="border-border rounded-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <CardTitle className="text-base truncate">{plano.nome}</CardTitle>
                    <Badge variant={st.variant} className="text-xs shrink-0">{st.label}</Badge>
                    {isAnexo && (
                      <Badge variant="outline" className="text-xs shrink-0 gap-1">
                        <Paperclip className="h-3 w-3" /> PDF anexado
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {new Date(plano.created_at).toLocaleDateString("pt-BR")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar"
                      onClick={() => {
                        if (isAnexo) { setAnexarEditando(plano); setAnexarOpen(true); }
                        else setEditingPlanoId(plano.id);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicar" onClick={() => duplicatePlano(plano)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {isAnexo ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir em nova aba" onClick={() => openPdfNewTab(plano)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar PDF" onClick={() => downloadPdf(plano)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportar PDF" onClick={() => { setExportPlano(plano); setExportType("plano_alimentar"); }}>
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title={plano.status === "ativo" ? "Desativar" : "Ativar"} onClick={() => pedirToggle(plano)}>
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir" onClick={() => setDeleteId(plano.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {plano.observacoes && <p className="text-xs text-muted-foreground mt-1">{plano.observacoes}</p>}
                {isAnexo && anexoTotais[plano.id] && (anexoTotais[plano.id].kcal > 0 || anexoTotais[plano.id].p > 0) && (
                  <div className="flex gap-3 flex-wrap mt-2 text-xs">
                    <span className="font-medium text-primary">{Math.round(anexoTotais[plano.id].kcal)} kcal</span>
                    <span className="text-blue-500">P {Math.round(anexoTotais[plano.id].p)}g</span>
                    <span className="text-orange-500">C {Math.round(anexoTotais[plano.id].c)}g</span>
                    <span className="text-yellow-500">G {Math.round(anexoTotais[plano.id].g)}g</span>
                    <span className="text-green-500">F {Math.round(anexoTotais[plano.id].f)}g</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleExpand(plano)}>
                  {expanded === plano.id ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {expanded === plano.id ? "Recolher" : (isAnexo ? "Ver PDF" : "Ver refeições")}
                </Button>
                {expanded === plano.id && isAnexo && (
                  <div className="mt-3 h-[700px] border border-border rounded-lg overflow-hidden">
                    {pdfUrls[plano.id] ? (
                      <PdfViewer url={pdfUrls[plano.id]} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        {plano.pdf_path ? "Carregando PDF..." : "Nenhum PDF anexado."}
                      </div>
                    )}
                  </div>
                )}
                {expanded === plano.id && !isAnexo && refeicoes[plano.id] && (
                  <div className="mt-3 space-y-3">
                    {refeicoes[plano.id].map((ref: any) => {
                      const allAlimentos = ref.alimentos_plano || [];
                      const hasOpcoes = allAlimentos.some((a: any) => a.opcao && a.opcao !== "A");
                      const alimentos = allAlimentos.filter((a: any) => !a.opcao || a.opcao === "A");
                      const totalKcal = alimentos.reduce((a: number, al: any) => a + (al.energia_kcal || 0), 0);
                      return (
                        <div key={ref.id} className="border border-border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">
                              {ref.nome_customizado || tipoRefeicaoLabels[ref.tipo] || ref.tipo}
                              {hasOpcoes && <span className="ml-2 text-[10px] text-muted-foreground font-normal">(opção A)</span>}
                            </span>
                            <span className="text-xs text-muted-foreground">{Math.round(totalKcal)} kcal</span>
                          </div>
                          {alimentos.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sem alimentos cadastrados.</p>
                          ) : (
                            <div className="space-y-1">
                              {alimentos.map((al: any) => (
                                <div key={al.id} className="flex justify-between text-xs">
                                  <span>{al.nome_alimento} — {al.quantidade}g ({al.medida_caseira})</span>
                                  <span className="text-muted-foreground">{Math.round(al.energia_kcal || 0)} kcal</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano alimentar?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todas as refeições e alimentos deste plano serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletePlano} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {exportPlano && (
        <ExportPdfModal
          open={!!exportPlano}
          onOpenChange={(open) => { if (!open) setExportPlano(null); }}
          type={exportType}
          paciente={paciente}
          planoData={exportPlano}
        />
      )}

      <ImportarPlanoPdfModal
        open={importOpen}
        onOpenChange={setImportOpen}
        pacienteId={paciente.id}
        onImported={(draft) => {
          setImportedDraft(draft);
          setEditingPlanoId("new");
        }}
      />

      <AnexarPlanoPdfModal
        open={anexarOpen}
        onOpenChange={(open) => { setAnexarOpen(open); if (!open) setAnexarEditando(null); }}
        pacienteId={paciente.id}
        planoExistente={anexarEditando}
        onSaved={() => {
          setAnexarOpen(false);
          setAnexarEditando(null);
          loadPlanos();
        }}
      />
      <Dialog open={!!ativando} onOpenChange={(o) => !o && setAtivando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ativar este plano?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{ativando?.nome}</strong> passa a aparecer no portal de{" "}
            {paciente.nome_completo}.
          </p>
          <AvisarPacienteToggle checked={avisarAtivacao} onCheckedChange={setAvisarAtivacao} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtivando(null)}>Cancelar</Button>
            <Button onClick={() => { const p = ativando; setAtivando(null); if (p) toggleStatus(p, avisarAtivacao); }}>
              Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
