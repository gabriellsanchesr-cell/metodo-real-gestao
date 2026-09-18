import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Loader2 } from "lucide-react";
import { conferirCoerenciaMacros } from "@/lib/antropometria";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string;
  planoExistente?: { id: string; nome: string; observacoes?: string | null; status?: string; pdf_path?: string | null } | null;
  onSaved: () => void;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

/**
 * Cria/atualiza a "refeição resumo" do plano anexado para que o sistema
 * contabilize kcal/macros no portal e no painel do nutricionista sem precisar
 * criar colunas novas.
 */
async function upsertResumoRefeicao(planoId: string, totals: any) {
  // Remove resumos antigos do plano
  const { data: refsExist } = await supabase
    .from("refeicoes").select("id").eq("plano_id", planoId);
  if (refsExist?.length) {
    await supabase.from("refeicoes").delete().eq("plano_id", planoId);
  }
  if (!totals || (totals.kcal == null && totals.proteina_g == null && totals.carboidrato_g == null && totals.gordura_g == null)) {
    return false;
  }
  const { data: ref, error: refErr } = await supabase.from("refeicoes").insert({
    plano_id: planoId,
    tipo: "cafe_da_manha" as any,
    nome_customizado: "Resumo do PDF",
    ordem: 0,
    horario_sugerido: null,
    totais_opcao: { A: {
      kcal: totals.kcal ?? 0,
      proteina_g: totals.proteina_g ?? 0,
      carboidrato_g: totals.carboidrato_g ?? 0,
      lipidio_g: totals.gordura_g ?? 0,
      fibra_g: totals.fibra_g ?? 0,
    } } as any,
  } as any).select("id").single();
  if (refErr) throw refErr;
  await supabase.from("alimentos_plano").insert({
    refeicao_id: ref.id,
    nome_alimento: "Resumo nutricional do PDF",
    quantidade: 1,
    medida_caseira: "plano/dia",
    energia_kcal: totals.kcal ?? 0,
    proteina_g: totals.proteina_g ?? 0,
    carboidrato_g: totals.carboidrato_g ?? 0,
    lipidio_g: totals.gordura_g ?? 0,
    fibra_g: totals.fibra_g ?? 0,
    opcao: "A",
    ordem: 0,
  } as any);
  return true;
}

export function AnexarPlanoPdfModal({ open, onOpenChange, pacienteId, planoExistente, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!planoExistente;
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState("Plano (PDF anexado)");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<"ativo" | "rascunho">("ativo");
  const [avisar, setAvisar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => {
    if (open) {
      setFile(null);
      setNome(planoExistente?.nome || "Plano (PDF anexado)");
      setObservacoes(planoExistente?.observacoes || "");
      setStatus((planoExistente?.status as any) || "ativo");
      setAvisar(true);
      setSaving(false);
      setProgress("");
    }
  }, [open, planoExistente]);

  const handleSave = async () => {
    if (!user) return;
    if (!isEdit && !file) {
      toast({ title: "Selecione um PDF", variant: "destructive" });
      return;
    }
    if (file && file.type !== "application/pdf") {
      toast({ title: "Arquivo deve ser PDF", variant: "destructive" });
      return;
    }
    if (file && file.size > 25 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande (máx 25 MB)", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let pdf_path = planoExistente?.pdf_path || null;
      let pdf_nome: string | null = null;
      let totals: any = null;

      if (file) {
        setProgress("Enviando PDF...");
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `planos/${pacienteId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("documentos-pdf")
          .upload(path, file, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;

        if (isEdit && planoExistente?.pdf_path && planoExistente.pdf_path !== path) {
          await supabase.storage.from("documentos-pdf").remove([planoExistente.pdf_path]);
        }
        pdf_path = path;
        pdf_nome = file.name;

        // Leitura mínima dos totais nutricionais via IA
        try {
          setProgress("Lendo totais nutricionais...");
          const b64 = await fileToBase64(file);
          const { data, error } = await supabase.functions.invoke("parse-plano-pdf-totais", {
            body: { fileBase64: b64, mimeType: "application/pdf" },
          });
          if (error) console.warn("parse-plano-pdf-totais falhou", error);
          else totals = data;
        } catch (e) {
          console.warn("Falha ao ler totais do PDF", e);
        }
      }

      let planoId = planoExistente?.id;

      if (isEdit) {
        const update: any = { nome: nome.trim(), observacoes, status };
        if (file) {
          update.pdf_path = pdf_path;
          update.pdf_nome = pdf_nome;
        }
        const { error } = await supabase.from("planos_alimentares").update(update).eq("id", planoExistente!.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("planos_alimentares").insert({
          user_id: user.id,
          paciente_id: pacienteId,
          nome: nome.trim() || "Plano (PDF anexado)",
          observacoes,
          status,
          is_template: false,
          tipo: "anexo",
          pdf_path,
          pdf_nome,
        } as any).select("id").single();
        if (error) throw error;
        planoId = inserted!.id;
      }

      if (planoId && file) {
        setProgress("Atualizando resumo...");
        const ok = await upsertResumoRefeicao(planoId, totals);
        if (ok) {
          // Os totais vêm de leitura por IA do PDF. Antes de dar por bom,
          // confere se a caloria declarada fecha com os macros.
          const coerencia = conferirCoerenciaMacros({
            kcal: totals?.kcal ?? null,
            proteina_g: totals?.proteina_g ?? null,
            carboidrato_g: totals?.carboidrato_g ?? null,
            gordura_g: totals?.gordura_g ?? null,
          });
          const lidos = `Totais lidos: ${totals?.kcal ? Math.round(totals.kcal) + " kcal" : "—"} • P ${totals?.proteina_g ?? "—"}g • C ${totals?.carboidrato_g ?? "—"}g • G ${totals?.gordura_g ?? "—"}g`;
          toast({
            title: coerencia.coerente
              ? (isEdit ? "Plano atualizado!" : "PDF anexado!")
              : "Confira os totais deste plano",
            description: coerencia.coerente ? lidos : `${lidos}. ${coerencia.mensagem}`,
            variant: coerencia.coerente ? undefined : "destructive",
          });
        } else {
          toast({
            title: isEdit ? "Plano atualizado" : "PDF anexado",
            description: "Não consegui identificar os totais no PDF — você pode editar o plano manualmente para preenchê-los.",
          });
        }
      } else {
        toast({ title: isEdit ? "Plano atualizado!" : "PDF anexado!" });
      }

      // A paciente só vê plano ativo. Editar só o nome ou a observação de um
      // plano que já estava ativo não é novidade para ela; trocar o PDF é.
      if (avisar && status === "ativo") {
        const jaEraAtivo = isEdit && planoExistente?.status === "ativo";
        if (!jaEraAtivo) avisarPaciente(pacienteId, "plano_novo", { titulo: nome.trim() });
        else if (file) avisarPaciente(pacienteId, "plano_atualizado", { titulo: nome.trim() });
      }

      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar plano anexado" : "Anexar PDF do plano alimentar"}</DialogTitle>
          <DialogDescription>
            O PDF é exibido exatamente como foi enviado. O sistema lê apenas os totais nutricionais (kcal e macros) para exibir no resumo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nome do plano</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={saving} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo (visível para o paciente)</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={saving} />
          </div>
          <div className="space-y-1.5">
            <Label>{isEdit ? "Substituir PDF (opcional)" : "Arquivo PDF (até 25 MB)"}</Label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={saving}
            />
            {file && <p className="text-xs text-muted-foreground">{file.name} • {(file.size / 1024).toFixed(0)} KB</p>}
          </div>
          {saving && progress && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> {progress}
            </p>
          )}
        </div>

        {status === "ativo" && (
          <AvisarPacienteToggle checked={avisar} onCheckedChange={setAvisar} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || (!isEdit && !file)}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Paperclip className="h-4 w-4 mr-1" />}
            {isEdit ? "Salvar" : "Anexar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
