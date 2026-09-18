import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Save, ArrowLeft, Plus, Trash2, Search, Clock, ChevronDown, ChevronUp, FileDown, ArrowRightLeft, X, AlertTriangle,
} from "lucide-react";
import { ExportPdfModal } from "@/components/pdf/ExportPdfModal";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";

const REFEICAO_TIPOS = [
  { value: "cafe_da_manha", label: "Café da Manhã", ordem: 1 },
  { value: "lanche_da_manha", label: "Lanche da Manhã", ordem: 2 },
  { value: "almoco", label: "Almoço", ordem: 3 },
  { value: "lanche_da_tarde", label: "Lanche da Tarde", ordem: 4 },
  { value: "jantar", label: "Jantar", ordem: 5 },
  { value: "ceia", label: "Ceia", ordem: 6 },
] as const;

interface SubItem {
  id?: string;
  nome: string;
  quantidade: number;
  medida_caseira: string;
  alimento_taco_id: number | null;
}

interface Alimento {
  id?: string;
  nome_alimento: string;
  quantidade: number;
  medida_caseira: string;
  energia_kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  lipidio_g: number;
  fibra_g: number;
  alimento_taco_id: number | null;
  grupo?: string | null;
  precisa_revisao?: boolean;
  base_energia_kcal?: number;
  base_proteina_g?: number;
  base_carboidrato_g?: number;
  base_lipidio_g?: number;
  base_fibra_g?: number;
  substituicoes: SubItem[];
}

interface Opcao {
  letra: string;
  alimentos: Alimento[];
  kcal_opcao?: number;
  prot_opcao_g?: number;
  carb_opcao_g?: number;
  gord_opcao_g?: number;
}

interface Refeicao {
  id?: string;
  tipo: string;
  nome_customizado: string;
  ordem: number;
  horario_sugerido: string;
  observacoes: string;
  substituicoes_sugeridas: string;
  opcoes: Opcao[];
  opcaoAtiva: string;
  expanded: boolean;
}

interface PlanoData {
  id?: string;
  nome: string;
  observacoes: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  objetivo_template: string;
}

interface InitialDraft {
  nome?: string;
  observacoes?: string;
  refeicoes?: Array<{
    nome?: string;
    horario?: string;
    tipo: string;
    ordem?: number;
    observacoes?: string;
    opcoes: Array<{
      letra: string;
      kcal_opcao?: number;
      prot_opcao_g?: number;
      carb_opcao_g?: number;
      gord_opcao_g?: number;
      alimentos: Array<{
        nome_alimento: string;
        quantidade: number;
        medida_caseira: string;
        energia_kcal: number;
        proteina_g: number;
        carboidrato_g: number;
        lipidio_g: number;
        fibra_g: number;
        alimento_taco_id: number | null;
        precisa_revisao?: boolean;
        substituicoes?: Array<{
          nome: string;
          quantidade: number;
          medida_caseira: string;
          alimento_taco_id: number | null;
        }>;
      }>;
    }>;
  }>;
}

interface Props {
  pacienteId?: string;
  planoId?: string;
  onBack: () => void;
  paciente?: any;
  initialData?: InitialDraft | null;
  isTemplate?: boolean;
}

const baseRatios = (a: { energia_kcal: number; proteina_g: number; carboidrato_g: number; lipidio_g: number; fibra_g: number; quantidade: number; alimento_taco_id: number | null }) => {
  if (!a.alimento_taco_id || !a.quantidade) return {};
  const r = 100 / a.quantidade;
  return {
    base_energia_kcal: a.energia_kcal * r,
    base_proteina_g: a.proteina_g * r,
    base_carboidrato_g: a.carboidrato_g * r,
    base_lipidio_g: a.lipidio_g * r,
    base_fibra_g: a.fibra_g * r,
  };
};

const mapAlimento = (a: any): Alimento => ({
  id: a.id,
  nome_alimento: a.nome_alimento,
  quantidade: a.quantidade ?? 100,
  medida_caseira: a.medida_caseira || "1 porção",
  energia_kcal: a.energia_kcal || 0,
  proteina_g: a.proteina_g || 0,
  carboidrato_g: a.carboidrato_g || 0,
  lipidio_g: a.lipidio_g || 0,
  fibra_g: a.fibra_g || 0,
  alimento_taco_id: a.alimento_taco_id ?? null,
  precisa_revisao: !!a.precisa_revisao,
  substituicoes: (a.substituicoes || []).map((s: any) => ({
    id: s.id,
    nome: s.nome,
    quantidade: s.quantidade ?? 100,
    medida_caseira: s.medida_caseira || "1 porção",
    alimento_taco_id: s.alimento_taco_id ?? null,
  })),
  ...baseRatios({
    energia_kcal: a.energia_kcal || 0,
    proteina_g: a.proteina_g || 0,
    carboidrato_g: a.carboidrato_g || 0,
    lipidio_g: a.lipidio_g || 0,
    fibra_g: a.fibra_g || 0,
    quantidade: a.quantidade || 100,
    alimento_taco_id: a.alimento_taco_id ?? null,
  }),
});

export function PlanoAlimentarEditor({ pacienteId, planoId, onBack, paciente, initialData, isTemplate = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  // Status que está gravado no banco, para saber se salvar ativou o plano
  // agora (aviso de plano novo) ou se ele já estava ativo (aviso de ajuste).
  const [statusSalvo, setStatusSalvo] = useState<string | null>(null);
  const [avisar, setAvisar] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [importedBanner, setImportedBanner] = useState(!!initialData);
  const [plano, setPlano] = useState<PlanoData>({
    nome: initialData?.nome || "Plano Alimentar",
    observacoes: initialData?.observacoes || "",
    status: "rascunho",
    data_inicio: "", data_fim: "", objetivo_template: "",
  });

  const buildInitialRefeicoes = (): Refeicao[] => {
    if (initialData?.refeicoes?.length) {
      // Use imported structure as-is (preserve order & free names)
      return initialData.refeicoes.map((imp, i) => {
        const opcoes: Opcao[] = (imp.opcoes || []).map((op) => ({
          letra: op.letra || "A",
          kcal_opcao: op.kcal_opcao,
          prot_opcao_g: op.prot_opcao_g,
          carb_opcao_g: op.carb_opcao_g,
          gord_opcao_g: op.gord_opcao_g,
          alimentos: (op.alimentos || []).map((a) => ({
            nome_alimento: a.nome_alimento,
            quantidade: a.quantidade,
            medida_caseira: a.medida_caseira,
            energia_kcal: a.energia_kcal,
            proteina_g: a.proteina_g,
            carboidrato_g: a.carboidrato_g,
            lipidio_g: a.lipidio_g,
            fibra_g: a.fibra_g,
            alimento_taco_id: a.alimento_taco_id,
            precisa_revisao: !!a.precisa_revisao,
            substituicoes: (a.substituicoes || []).map((s) => ({
              nome: s.nome,
              quantidade: s.quantidade,
              medida_caseira: s.medida_caseira,
              alimento_taco_id: s.alimento_taco_id,
            })),
            ...baseRatios({
              energia_kcal: a.energia_kcal,
              proteina_g: a.proteina_g,
              carboidrato_g: a.carboidrato_g,
              lipidio_g: a.lipidio_g,
              fibra_g: a.fibra_g,
              quantidade: a.quantidade,
              alimento_taco_id: a.alimento_taco_id,
            }),
          })),
        }));
        if (opcoes.length === 0) opcoes.push({ letra: "A", alimentos: [] });
        return {
          tipo: imp.tipo,
          nome_customizado: imp.nome || "",
          ordem: imp.ordem || i + 1,
          horario_sugerido: (imp as any).horario || "",
          observacoes: imp.observacoes || "",
          substituicoes_sugeridas: "",
          opcoes,
          opcaoAtiva: opcoes[0].letra,
          expanded: true,
        };
      });
    }
    return REFEICAO_TIPOS.map(r => ({
      tipo: r.value, nome_customizado: "", ordem: r.ordem, horario_sugerido: "",
      observacoes: "", substituicoes_sugeridas: "",
      opcoes: [{ letra: "A", alimentos: [] }],
      opcaoAtiva: "A", expanded: true,
    }));
  };
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>(buildInitialRefeicoes);

  useEffect(() => { if (planoId) loadPlano(); }, [planoId]);

  const loadPlano = async () => {
    const { data: p } = await supabase
      .from("planos_alimentares").select("*").eq("id", planoId).single();
    if (p) {
      setPlano({
        id: p.id, nome: p.nome, observacoes: p.observacoes || "",
        status: (p as any).status || "rascunho",
        data_inicio: (p as any).data_inicio || "",
        data_fim: (p as any).data_fim || "",
        objetivo_template: p.objetivo_template || "",
      });
      setStatusSalvo((p as { status?: string | null }).status || "rascunho");
    }
    const { data: refs } = await (supabase as any)
      .from("refeicoes")
      .select("*, alimentos_plano(*, alimento_substituicoes(*))")
      .eq("plano_id", planoId!)
      .order("ordem", { ascending: true });
    if (refs && refs.length > 0) {
      setRefeicoes(refs.map((r: any) => {
        const alimentos = (r.alimentos_plano || []).map((a: any) => ({
          ...a,
          substituicoes: a.alimento_substituicoes || [],
        }));
        // Group by opcao
        const byOpcao = new Map<string, any[]>();
        for (const a of alimentos) {
          const letra = a.opcao || "A";
          if (!byOpcao.has(letra)) byOpcao.set(letra, []);
          byOpcao.get(letra)!.push(a);
        }
        if (byOpcao.size === 0) byOpcao.set("A", []);
        const totaisOpcao = (r.totais_opcao || {}) as Record<string, any>;
        const opcoes: Opcao[] = [...byOpcao.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([letra, items]) => {
            const t = totaisOpcao[letra] || {};
            return {
              letra,
              alimentos: items
                .sort((x, y) => (x.ordem || 0) - (y.ordem || 0))
                .map(mapAlimento),
              kcal_opcao: t.kcal != null ? Number(t.kcal) : undefined,
              prot_opcao_g: t.p != null ? Number(t.p) : undefined,
              carb_opcao_g: t.c != null ? Number(t.c) : undefined,
              gord_opcao_g: t.g != null ? Number(t.g) : undefined,
            };
          });
        return {
          id: r.id, tipo: r.tipo, nome_customizado: r.nome_customizado || "",
          ordem: r.ordem || 0,
          horario_sugerido: r.horario_sugerido || "",
          observacoes: r.observacoes || "",
          substituicoes_sugeridas: r.substituicoes_sugeridas || "",
          opcoes, opcaoAtiva: opcoes[0].letra, expanded: true,
        };
      }));
    }
  };

  // Totais somam a opção atualmente selecionada em cada refeição.
  // Quando a opção traz totais vindos do PDF (kcal_opcao/...), usamos esses valores
  // como autoritativos; caso contrário caímos para a soma calculada via TACO.
  const totals = useMemo(() => {
    let kcal = 0, prot = 0, carb = 0, lip = 0, fib = 0;
    refeicoes.forEach(r => {
      const op = r.opcoes.find(o => o.letra === r.opcaoAtiva) || r.opcoes[0];
      if (!op) return;
      if (op.kcal_opcao != null) {
        kcal += op.kcal_opcao;
        prot += op.prot_opcao_g || 0;
        carb += op.carb_opcao_g || 0;
        lip += op.gord_opcao_g || 0;
        op.alimentos.forEach(a => { fib += a.fibra_g; });
      } else {
        op.alimentos.forEach(a => {
          kcal += a.energia_kcal; prot += a.proteina_g;
          carb += a.carboidrato_g; lip += a.lipidio_g; fib += a.fibra_g;
        });
      }
    });
    return { kcal: Math.round(kcal), prot: Math.round(prot), carb: Math.round(carb), lip: Math.round(lip), fib: Math.round(fib) };
  }, [refeicoes]);

  const handleSave = async (overrideStatus?: string) => {
    if (!user) return;
    setSaving(true);
    try {
      let savedPlanoId = plano.id;
      const finalStatus = overrideStatus || plano.status;
      const planoPayload: any = {
        nome: plano.nome, observacoes: plano.observacoes || null,
        status: finalStatus,
        data_inicio: isTemplate ? null : (plano.data_inicio || null),
        data_fim: isTemplate ? null : (plano.data_fim || null),
        objetivo_template: plano.objetivo_template || null,
        paciente_id: isTemplate ? null : pacienteId,
        user_id: user.id,
        is_template: isTemplate,
      };
      if (savedPlanoId) {
        const { error } = await supabase.from("planos_alimentares").update(planoPayload).eq("id", savedPlanoId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("planos_alimentares").insert(planoPayload).select("id").single();
        if (error) throw error;
        savedPlanoId = data.id;
        setPlano(p => ({ ...p, id: savedPlanoId, status: finalStatus }));
      }

      if (planoId || savedPlanoId) {
        await supabase.from("refeicoes").delete().eq("plano_id", savedPlanoId!);
      }

      for (const ref of refeicoes) {
        const totaisOpcao: Record<string, any> = {};
        for (const op of ref.opcoes) {
          if (op.kcal_opcao != null) {
            totaisOpcao[op.letra] = {
              kcal: op.kcal_opcao,
              p: op.prot_opcao_g ?? null,
              c: op.carb_opcao_g ?? null,
              g: op.gord_opcao_g ?? null,
            };
          }
        }
        const { data: savedRef, error: refErr } = await (supabase as any).from("refeicoes").insert({
          plano_id: savedPlanoId!, tipo: ref.tipo as any, ordem: ref.ordem,
          nome_customizado: ref.nome_customizado || null,
          horario_sugerido: ref.horario_sugerido || null,
          observacoes: ref.observacoes || null,
          substituicoes_sugeridas: ref.substituicoes_sugeridas || null,
          totais_opcao: totaisOpcao,
        }).select("id").single();
        if (refErr) throw refErr;

        for (const op of ref.opcoes) {
          for (let i = 0; i < op.alimentos.length; i++) {
            const a = op.alimentos[i];
            const { data: savedAli, error: aliErr } = await (supabase as any).from("alimentos_plano").insert({
              refeicao_id: savedRef.id, nome_alimento: a.nome_alimento,
              quantidade: a.quantidade, medida_caseira: a.medida_caseira,
              energia_kcal: a.energia_kcal, proteina_g: a.proteina_g,
              carboidrato_g: a.carboidrato_g, lipidio_g: a.lipidio_g,
              fibra_g: a.fibra_g, alimento_taco_id: a.alimento_taco_id,
              opcao: op.letra, ordem: i, precisa_revisao: !!a.precisa_revisao,
            }).select("id").single();
            if (aliErr) throw aliErr;
            if (a.substituicoes?.length) {
              const { error: subErr } = await (supabase as any).from("alimento_substituicoes").insert(
                a.substituicoes.map((s, k) => ({
                  alimento_plano_id: savedAli.id,
                  nome: s.nome,
                  quantidade: s.quantidade,
                  medida_caseira: s.medida_caseira,
                  alimento_taco_id: s.alimento_taco_id,
                  ordem: k,
                }))
              );
              if (subErr) throw subErr;
            }
          }
        }
      }

      // A paciente só vê plano ativo, então só plano ativo gera aviso.
      if (!isTemplate && pacienteId && avisar && finalStatus === "ativo") {
        avisarPaciente(
          pacienteId,
          statusSalvo === "ativo" ? "plano_atualizado" : "plano_novo",
          { titulo: plano.nome },
        );
      }
      setStatusSalvo(finalStatus);

      if (overrideStatus === "ativo") {
        setPlano(p => ({ ...p, status: "ativo" }));
        setImportedBanner(false);
        toast({ title: "Plano ativado!", description: "O plano importado está ativo para o paciente." });
      } else {
        toast({ title: "Plano salvo com sucesso!" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const updateRefeicao = (idx: number, field: string, value: any) => {
    setRefeicoes(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const updateOpcao = (refIdx: number, letra: string, mut: (op: Opcao) => Opcao) => {
    setRefeicoes(prev => prev.map((r, i) => i !== refIdx ? r : {
      ...r, opcoes: r.opcoes.map(o => o.letra === letra ? mut(o) : o),
    }));
  };

  const addOpcao = (refIdx: number) => {
    setRefeicoes(prev => prev.map((r, i) => {
      if (i !== refIdx) return r;
      const used = new Set(r.opcoes.map(o => o.letra));
      let letra = "A";
      for (let c = 65; c <= 90; c++) {
        const L = String.fromCharCode(c);
        if (!used.has(L)) { letra = L; break; }
      }
      const nova: Opcao = { letra, alimentos: [] };
      return { ...r, opcoes: [...r.opcoes, nova], opcaoAtiva: letra };
    }));
  };

  const removeOpcao = (refIdx: number, letra: string) => {
    setRefeicoes(prev => prev.map((r, i) => {
      if (i !== refIdx) return r;
      if (r.opcoes.length <= 1) return r;
      const nova = r.opcoes.filter(o => o.letra !== letra);
      return { ...r, opcoes: nova, opcaoAtiva: r.opcaoAtiva === letra ? nova[0].letra : r.opcaoAtiva };
    }));
  };

  const addAlimento = (refIdx: number, letra: string, alimento: Alimento) => {
    updateOpcao(refIdx, letra, op => ({ ...op, alimentos: [...op.alimentos, alimento] }));
  };
  const removeAlimento = (refIdx: number, letra: string, aliIdx: number) => {
    updateOpcao(refIdx, letra, op => ({ ...op, alimentos: op.alimentos.filter((_, j) => j !== aliIdx) }));
  };
  const updateAlimento = (refIdx: number, letra: string, aliIdx: number, mut: (a: Alimento) => Alimento) => {
    updateOpcao(refIdx, letra, op => ({ ...op, alimentos: op.alimentos.map((a, j) => j === aliIdx ? mut(a) : a) }));
  };

  const macroTotalOpcao = (op: Opcao) => {
    if (op.kcal_opcao != null) {
      return {
        kcal: Math.round(op.kcal_opcao),
        p: Math.round(op.prot_opcao_g || 0),
        c: Math.round(op.carb_opcao_g || 0),
        l: Math.round(op.gord_opcao_g || 0),
        fromPdf: true,
      };
    }
    let kcal = 0, p = 0, c = 0, l = 0;
    op.alimentos.forEach(a => { kcal += a.energia_kcal; p += a.proteina_g; c += a.carboidrato_g; l += a.lipidio_g; });
    return { kcal: Math.round(kcal), p: Math.round(p), c: Math.round(c), l: Math.round(l), fromPdf: false };
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h3 className="font-semibold text-foreground">Editor de Plano Alimentar</h3>
          </div>
          <div className="flex items-center gap-2">
            {importedBanner && (
              <Button onClick={() => handleSave("ativo")} disabled={saving} size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-1" /> Ativar plano importado
              </Button>
            )}
            {!isTemplate && pacienteId && (plano.status === "ativo" || importedBanner) && (
              <AvisarPacienteToggle checked={avisar} onCheckedChange={setAvisar} className="py-1.5" />
            )}
            <Button onClick={() => handleSave()} disabled={saving} size="sm" variant={importedBanner ? "outline" : "default"}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : plano.status === "ativo" ? "Salvar" : "Salvar rascunho"}
            </Button>
            {planoId && (
              <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
                <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <MacroBox label="Calorias" value={`${totals.kcal}`} unit="kcal" color="bg-primary" />
          <MacroBox label="Proteína" value={`${totals.prot}`} unit="g" color="bg-blue-500" />
          <MacroBox label="Carboidrato" value={`${totals.carb}`} unit="g" color="bg-orange-500" />
          <MacroBox label="Gordura" value={`${totals.lip}`} unit="g" color="bg-yellow-500" />
          <MacroBox label="Fibra" value={`${totals.fib}`} unit="g" color="bg-green-500" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Totais calculados pela opção selecionada em cada refeição.</p>
      </div>

      {importedBanner && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-900 dark:text-amber-100 flex items-start justify-between gap-3">
          <div>
            <strong>Plano importado de PDF.</strong> Estrutura preservada: horários, opções (A/B/C) e substituições por alimento. Revise antes de ativar. Itens marcados com <AlertTriangle className="inline h-3 w-3 -mt-0.5" /> precisam de revisão (não encontrados na base TACO).
          </div>
          <Button variant="ghost" size="sm" onClick={() => setImportedBanner(false)}>Ok</Button>
        </div>
      )}

      <Card className="border-border rounded-xl">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Plano</Label>
              <Input value={plano.nome} onChange={e => setPlano(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Select value={plano.objetivo_template} onValueChange={v => setPlano(p => ({ ...p, objetivo_template: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar objetivo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                  <SelectItem value="ganho_de_massa">Ganho de Massa</SelectItem>
                  <SelectItem value="saude_intestinal">Saúde Intestinal</SelectItem>
                  <SelectItem value="controle_ansiedade_alimentar">Controle Ansiedade</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={plano.data_inicio} onChange={e => setPlano(p => ({ ...p, data_inicio: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim (opcional)</Label>
              <Input type="date" value={plano.data_fim} onChange={e => setPlano(p => ({ ...p, data_fim: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={plano.status} onValueChange={v => setPlano(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações Gerais</Label>
            <Textarea value={plano.observacoes} onChange={e => setPlano(p => ({ ...p, observacoes: e.target.value }))} rows={3} />
          </div>
        </CardContent>
      </Card>

      {refeicoes.map((ref, refIdx) => {
        const tipoLabel = REFEICAO_TIPOS.find(t => t.value === ref.tipo)?.label || ref.tipo;
        const displayName = ref.nome_customizado || tipoLabel;
        const activeOp = ref.opcoes.find(o => o.letra === ref.opcaoAtiva) || ref.opcoes[0];
        const mt = macroTotalOpcao(activeOp);
        return (
          <Card key={refIdx} className="border-border rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => updateRefeicao(refIdx, "expanded", !ref.expanded)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <CardTitle className="text-base">{displayName}</CardTitle>
                  <Badge variant="outline" className="text-xs font-normal" title={mt.fromPdf ? "Valores extraídos do PDF" : "Calculado pela base TACO"}>
                    Opção {activeOp.letra}: {mt.kcal} kcal • P {mt.p}g • C {mt.c}g • G {mt.l}g
                    {mt.fromPdf && <span className="ml-1 text-[9px] text-muted-foreground">(PDF)</span>}
                  </Badge>
                  {ref.opcoes.length > 1 && (
                    <Badge variant="secondary" className="text-xs">{ref.opcoes.length} opções</Badge>
                  )}
                </button>
                {ref.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {ref.expanded && (
              <CardContent className="pt-0 space-y-3">
                {/* Header: tipo, nome custom, horário */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Tipo</Label>
                    <Select value={ref.tipo} onValueChange={v => updateRefeicao(refIdx, "tipo", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REFEICAO_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Nome livre (opcional)</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder={tipoLabel}
                      value={ref.nome_customizado}
                      onChange={e => updateRefeicao(refIdx, "nome_customizado", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Horário</Label>
                    <Input
                      className="h-8 text-xs" type="time"
                      value={ref.horario_sugerido}
                      onChange={e => updateRefeicao(refIdx, "horario_sugerido", e.target.value)}
                    />
                  </div>
                </div>

                {/* Tabs por opção */}
                <Tabs value={ref.opcaoAtiva} onValueChange={v => updateRefeicao(refIdx, "opcaoAtiva", v)}>
                  <div className="flex items-center justify-between gap-2">
                    <TabsList className="h-9">
                      {ref.opcoes.map(op => (
                        <TabsTrigger key={op.letra} value={op.letra} className="text-xs px-3">
                          Opção {op.letra}
                          <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1">{op.alimentos.length}</Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addOpcao(refIdx)}>
                        <Plus className="h-3 w-3 mr-1" /> Opção
                      </Button>
                      {ref.opcoes.length > 1 && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removeOpcao(refIdx, ref.opcaoAtiva)}>
                          <X className="h-3 w-3 mr-1" /> Remover {ref.opcaoAtiva}
                        </Button>
                      )}
                    </div>
                  </div>

                  {ref.opcoes.map(op => (
                    <TabsContent key={op.letra} value={op.letra} className="mt-2 space-y-2">
                      {op.alimentos.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="grid grid-cols-[1fr,80px,110px,55px,45px,45px,45px,30px] gap-1 px-3 py-1.5 bg-muted/50 text-[10px] font-medium text-muted-foreground">
                            <span>Alimento</span><span>Qtd (g)</span><span>Medida</span>
                            <span className="text-center">Kcal</span><span className="text-center">P</span>
                            <span className="text-center">C</span><span className="text-center">G</span><span></span>
                          </div>
                          {op.alimentos.map((ali, aliIdx) => (
                            <div key={aliIdx} className="border-t">
                              <div className="grid grid-cols-[1fr,80px,110px,55px,45px,45px,45px,30px] gap-1 px-3 py-1.5 items-center text-sm">
                                <span className="truncate flex items-center gap-1" title={ali.nome_alimento}>
                                  {ali.precisa_revisao && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                                  {ali.nome_alimento}
                                </span>
                                <Input
                                  className="h-7 text-xs" type="number" value={ali.quantidade}
                                  onChange={e => {
                                    const qty = parseFloat(e.target.value) || 0;
                                    updateAlimento(refIdx, op.letra, aliIdx, a => {
                                      const out = { ...a, quantidade: qty };
                                      if (a.base_energia_kcal !== undefined) {
                                        const r = qty / 100;
                                        out.energia_kcal = a.base_energia_kcal * r;
                                        out.proteina_g = (a.base_proteina_g || 0) * r;
                                        out.carboidrato_g = (a.base_carboidrato_g || 0) * r;
                                        out.lipidio_g = (a.base_lipidio_g || 0) * r;
                                        out.fibra_g = (a.base_fibra_g || 0) * r;
                                      }
                                      return out;
                                    });
                                  }}
                                />
                                <Input
                                  className="h-7 text-xs" value={ali.medida_caseira}
                                  onChange={e => updateAlimento(refIdx, op.letra, aliIdx, a => ({ ...a, medida_caseira: e.target.value }))}
                                />
                                {(() => {
                                  const naoTemMacros = ali.alimento_taco_id == null && (ali.energia_kcal || 0) === 0;
                                  const fmt = (v: number) => naoTemMacros ? "—" : Math.round(v);
                                  return <>
                                    <span className="text-xs text-center">{fmt(ali.energia_kcal)}</span>
                                    <span className="text-xs text-center">{fmt(ali.proteina_g)}</span>
                                    <span className="text-xs text-center">{fmt(ali.carboidrato_g)}</span>
                                    <span className="text-xs text-center">{fmt(ali.lipidio_g)}</span>
                                  </>;
                                })()}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAlimento(refIdx, op.letra, aliIdx)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                              <StructuredSubs
                                alimento={ali}
                                onChange={(subs) => updateAlimento(refIdx, op.letra, aliIdx, a => ({ ...a, substituicoes: subs }))}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <AlimentoSearch onSelect={(ali) => addAlimento(refIdx, op.letra, ali)} />
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Observações da Refeição</Label>
                    <Textarea
                      className="text-xs min-h-[60px]"
                      value={ref.observacoes}
                      onChange={e => updateRefeicao(refIdx, "observacoes", e.target.value)}
                      placeholder="Dicas, orientações..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notas gerais sobre substituições</Label>
                    <Textarea
                      className="text-xs min-h-[60px]"
                      value={ref.substituicoes_sugeridas}
                      onChange={e => updateRefeicao(refIdx, "substituicoes_sugeridas", e.target.value)}
                      placeholder="Notas livres sobre como substituir esta refeição..."
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {showExport && paciente && (
        <ExportPdfModal
          open={showExport}
          onOpenChange={setShowExport}
          type="plano_alimentar"
          paciente={paciente}
          planoData={{
            ...plano, id: planoId,
            refeicoes: refeicoes.map(r => ({
              ...r,
              alimentos_plano: (r.opcoes.find(o => o.letra === r.opcaoAtiva) || r.opcoes[0])?.alimentos || [],
            })),
          }}
        />
      )}
    </div>
  );
}

function MacroBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
      <div className="w-full h-1 rounded-full bg-muted mt-1">
        <div className={`h-1 rounded-full ${color} opacity-70`} style={{ width: "50%" }} />
      </div>
    </div>
  );
}

const grupoLabelsSearch: Record<string, string> = {
  cereais: "Cereais", verduras: "Verduras", frutas: "Frutas", leguminosas: "Leguminosas",
  oleaginosas: "Oleag.", carnes: "Carnes", leites: "Leites", ovos: "Ovos",
  oleos: "Óleos", acucares: "Açúcares", outros: "Outros",
};
const grupoColors: Record<string, string> = {
  cereais: "bg-amber-100 text-amber-800", verduras: "bg-green-100 text-green-800",
  frutas: "bg-pink-100 text-pink-800", leguminosas: "bg-orange-100 text-orange-800",
  oleaginosas: "bg-yellow-100 text-yellow-800", carnes: "bg-red-100 text-red-800",
  leites: "bg-blue-100 text-blue-800", ovos: "bg-indigo-100 text-indigo-800",
  oleos: "bg-lime-100 text-lime-800", acucares: "bg-purple-100 text-purple-800",
  outros: "bg-gray-100 text-gray-800",
};

function AlimentoSearch({ onSelect }: { onSelect: (a: Alimento) => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const ql = q.toLowerCase();
    const [taco, perso] = await Promise.all([
      supabase.from("alimentos_taco").select("*")
        .or(`nome.ilike.%${q}%,palavras_chave.cs.{${ql}}`).limit(12),
      user ? supabase.from("alimentos_personalizados").select("*")
        .eq("user_id", user.id).ilike("nome", `%${q}%`).limit(8) : { data: [] },
    ]);
    const list: any[] = [];
    (perso.data || []).forEach((p: any) => list.push({ ...p, _origem: "personalizado" }));
    (taco.data || []).forEach((t: any) => list.push({ ...t, _origem: "taco" }));
    setResults(list);
    setSearching(false);
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  const selectItem = (item: any) => {
    const isTaco = item._origem === "taco";
    const ratio100 = 1;
    onSelect({
      nome_alimento: item.nome,
      quantidade: isTaco ? 100 : (item.quantidade_base || 100),
      medida_caseira: item.medida_caseira || "1 porção",
      energia_kcal: (item.energia_kcal || 0) * ratio100,
      proteina_g: (item.proteina_g || 0) * ratio100,
      carboidrato_g: (item.carboidrato_g || 0) * ratio100,
      lipidio_g: (item.lipidio_g || 0) * ratio100,
      fibra_g: (item.fibra_g || 0) * ratio100,
      alimento_taco_id: isTaco ? item.id : null,
      grupo: item.grupo || null,
      substituicoes: [],
      ...(isTaco ? {
        base_energia_kcal: item.energia_kcal, base_proteina_g: item.proteina_g,
        base_carboidrato_g: item.carboidrato_g, base_lipidio_g: item.lipidio_g, base_fibra_g: item.fibra_g,
      } : {
        base_energia_kcal: (item.energia_kcal || 0) * (100 / (item.quantidade_base || 100)),
        base_proteina_g: (item.proteina_g || 0) * (100 / (item.quantidade_base || 100)),
        base_carboidrato_g: (item.carboidrato_g || 0) * (100 / (item.quantidade_base || 100)),
        base_lipidio_g: (item.lipidio_g || 0) * (100 / (item.quantidade_base || 100)),
        base_fibra_g: (item.fibra_g || 0) * (100 / (item.quantidade_base || 100)),
      }),
    });
    setQuery(""); setResults([]);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-7 text-xs"
            placeholder="Buscar alimento (TACO + meus alimentos)..."
            value={query} onChange={e => setQuery(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowCustom(true)}>
          <Plus className="h-3 w-3 mr-1" /> Personalizado
        </Button>
      </div>
      {searching && <p className="text-[10px] text-muted-foreground mt-1">Buscando...</p>}
      {results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} type="button"
              onClick={() => selectItem(r)}
              className="w-full text-left px-3 py-2 hover:bg-muted text-xs flex items-center justify-between gap-2 border-b border-border/30 last:border-0"
            >
              <span className="truncate flex-1">{r.nome}</span>
              <Badge variant="outline" className={`text-[9px] ${grupoColors[r.grupo] || ""}`}>{grupoLabelsSearch[r.grupo] || r.grupo}</Badge>
              <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(r.energia_kcal || 0)} kcal/100g</span>
            </button>
          ))}
        </div>
      )}
      <AlimentoPersonalizadoModal
        open={showCustom}
        onOpenChange={setShowCustom}
        onConfirm={(a) => { onSelect(a); setShowCustom(false); }}
      />
    </div>
  );
}

function AlimentoPersonalizadoModal({ open, onOpenChange, onConfirm }: {
  open: boolean; onOpenChange: (b: boolean) => void; onConfirm: (a: Alimento) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const empty = {
    nome: "", grupo: "outros", quantidade: 100, medida_caseira: "1 porção",
    energia_kcal: 0, proteina_g: 0, carboidrato_g: 0, lipidio_g: 0, fibra_g: 0,
  };
  const [form, setForm] = useState(empty);
  const [salvar, setSalvar] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setForm(empty); setSalvar(false); } }, [open]);
  const handle = async () => {
    if (!form.nome.trim()) { toast({ title: "Informe o nome do alimento", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (salvar && user) {
        const { error } = await supabase.from("alimentos_personalizados").insert({
          user_id: user.id, nome: form.nome, grupo: form.grupo as any,
          quantidade_base: form.quantidade, medida_caseira: form.medida_caseira,
          energia_kcal: form.energia_kcal, proteina_g: form.proteina_g,
          carboidrato_g: form.carboidrato_g, lipidio_g: form.lipidio_g, fibra_g: form.fibra_g,
        });
        if (error) throw error;
        toast({ title: "Salvo na sua biblioteca!" });
      }
      const ratio = 100 / (form.quantidade || 100);
      onConfirm({
        nome_alimento: form.nome, quantidade: form.quantidade, medida_caseira: form.medida_caseira,
        energia_kcal: form.energia_kcal, proteina_g: form.proteina_g,
        carboidrato_g: form.carboidrato_g, lipidio_g: form.lipidio_g, fibra_g: form.fibra_g,
        alimento_taco_id: null, grupo: form.grupo,
        substituicoes: [],
        base_energia_kcal: form.energia_kcal * ratio,
        base_proteina_g: form.proteina_g * ratio,
        base_carboidrato_g: form.carboidrato_g * ratio,
        base_lipidio_g: form.lipidio_g * ratio,
        base_fibra_g: form.fibra_g * ratio,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };
  const num = (k: keyof typeof form) => (
    <Input type="number" className="h-8 text-xs" value={(form as any)[k]}
      onChange={e => setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }))} />
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Adicionar alimento personalizado</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Pão de queijo caseiro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Grupo</Label>
              <Select value={form.grupo} onValueChange={v => setForm(f => ({ ...f, grupo: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(grupoLabelsSearch).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Medida caseira</Label>
              <Input className="h-9" value={form.medida_caseira} onChange={e => setForm(f => ({ ...f, medida_caseira: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Quantidade (g)</Label>{num("quantidade")}</div>
            <div className="space-y-1"><Label className="text-xs">Kcal</Label>{num("energia_kcal")}</div>
            <div className="space-y-1"><Label className="text-xs">Proteína (g)</Label>{num("proteina_g")}</div>
            <div className="space-y-1"><Label className="text-xs">Carboidrato (g)</Label>{num("carboidrato_g")}</div>
            <div className="space-y-1"><Label className="text-xs">Gordura (g)</Label>{num("lipidio_g")}</div>
            <div className="space-y-1"><Label className="text-xs">Fibra (g)</Label>{num("fibra_g")}</div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={salvar} onCheckedChange={(c) => setSalvar(!!c)} />
            Salvar este alimento na minha biblioteca
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handle} disabled={saving}>{saving ? "Salvando..." : "Adicionar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StructuredSubs({ alimento, onChange }: {
  alimento: Alimento;
  onChange: (subs: SubItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const subs = alimento.substituicoes || [];

  const addEmpty = () => {
    onChange([...subs, { nome: "", quantidade: 100, medida_caseira: "1 porção", alimento_taco_id: null }]);
    setOpen(true);
  };
  const update = (i: number, patch: Partial<SubItem>) => {
    onChange(subs.map((s, j) => j === i ? { ...s, ...patch } : s));
  };
  const remove = (i: number) => onChange(subs.filter((_, j) => j !== i));

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="text-[11px] text-primary hover:underline flex items-center gap-1"
        >
          <ArrowRightLeft className="h-3 w-3" />
          {open ? "Ocultar" : "Substituições"} {subs.length > 0 && `(${subs.length})`}
        </button>
        <button
          type="button"
          onClick={addEmpty}
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
        >
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </div>
      {open && subs.length > 0 && (
        <div className="mt-2 ml-4 space-y-1">
          {subs.map((s, i) => (
            <div key={i} className="flex items-center gap-1 text-[11px]">
              <Input
                className="h-7 text-xs flex-1"
                placeholder="Nome do substituto"
                value={s.nome}
                onChange={e => update(i, { nome: e.target.value })}
              />
              <Input
                className="h-7 text-xs w-20"
                type="number"
                placeholder="Qtd"
                value={s.quantidade}
                onChange={e => update(i, { quantidade: parseFloat(e.target.value) || 0 })}
              />
              <Input
                className="h-7 text-xs w-32"
                placeholder="Medida"
                value={s.medida_caseira}
                onChange={e => update(i, { medida_caseira: e.target.value })}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
