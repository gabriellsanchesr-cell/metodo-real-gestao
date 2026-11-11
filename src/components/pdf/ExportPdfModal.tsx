import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { loadPdfConfig } from "@/lib/pdf/pdfBrand";
import { generatePlanoAlimentarPdf, generatePlanoSimplificadoPdf, type PlanoExportOptions } from "@/lib/pdf/planoAlimentarPdf";
import { generateAvaliacaoPdf, type AvaliacaoExportOptions } from "@/lib/pdf/avaliacaoPdf";
import { generateRelatorioMensalPdf } from "@/lib/pdf/relatorioMensalPdf";

type ExportType = "plano_alimentar" | "plano_simplificado" | "avaliacao" | "relatorio_mensal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ExportType;
  paciente: any;
  /** For plano: plano object with refeicoes+alimentos loaded */
  planoData?: any;
  /** For avaliacao: current assessment */
  avaliacaoData?: any;
  /** For avaliacao: all patient assessments (asc by date), used for historical comparison */
  historicoAvaliacoes?: any[];

  /** For relatorio: acompanhamentos array */
  acompanhamentos?: any[];
  /** For relatorio: consultas array */
  consultas?: any[];
  /** For relatorio: plano ativo */
  planoAtivo?: any;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function ExportPdfModal({ open, onOpenChange, type, paciente, planoData, avaliacaoData, historicoAvaliacoes, acompanhamentos, consultas, planoAtivo }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Plano options
  const [planoOpts, setPlanoOpts] = useState<PlanoExportOptions>({
    incluirMacros: true,
    incluirCaloriasAlimento: false,
    incluirSubstituicoes: true,
    incluirObsRefeicao: true,
    incluirObsGerais: true,
    incluirTotaisDiarios: true,
    incluirOrientacoes: false,
    incluirCapa: true,
  });

  // Avaliacao options
  const [avOpts, setAvOpts] = useState<AvaliacaoExportOptions>({
    incluirDobras: true,
    incluirCircunferencias: true,
    incluirBioimpedancia: true,
    incluirComparativo: true,
    incluirGraficos: true,
    incluirFotos: false,
    incluirDiametros: true,
    incluirLegendas: true,
    incluirCapa: true,
  });

  // Relatorio options
  const now = new Date();
  const [relMes, setRelMes] = useState(now.getMonth());
  const [relAno, setRelAno] = useState(now.getFullYear());
  const [relCheckins, setRelCheckins] = useState(true);
  const [relAnotacoes, setRelAnotacoes] = useState(false);
  const [relPlano, setRelPlano] = useState(true);
  const [relConquistas, setRelConquistas] = useState("");

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const config = await loadPdfConfig(user.id);

      let doc: any;
      let fileName: string;

      switch (type) {
        case "plano_alimentar": {
          const data = await loadPlanoData();
          doc = generatePlanoAlimentarPdf(data, paciente, config, planoOpts);
          fileName = `Plano_Alimentar_${paciente.nome_completo.replace(/\s+/g, "_")}.pdf`;
          break;
        }
        case "plano_simplificado": {
          const data = await loadPlanoData();
          doc = generatePlanoSimplificadoPdf(data, paciente, config);
          fileName = `Plano_Simplificado_${paciente.nome_completo.replace(/\s+/g, "_")}.pdf`;
          break;
        }
        case "avaliacao": {
          doc = generateAvaliacaoPdf(avaliacaoData, historicoAvaliacoes || null, paciente, config, avOpts);
          fileName = `Avaliacao_${paciente.nome_completo.replace(/\s+/g, "_")}.pdf`;
          break;
        }
        case "relatorio_mensal": {
          doc = generateRelatorioMensalPdf(
            acompanhamentos || [],
            consultas || [],
            relPlano ? planoAtivo : null,
            paciente,
            config,
            { mes: relMes, ano: relAno, incluirGraficos: false, incluirCheckins: relCheckins, incluirAnotacoes: relAnotacoes, incluirPlano: relPlano, conquistasTexto: relConquistas },
          );
          fileName = `Relatorio_${MESES[relMes]}_${relAno}_${paciente.nome_completo.replace(/\s+/g, "_")}.pdf`;
          break;
        }
        default:
          throw new Error("Tipo desconhecido");
      }

      doc.save(fileName);

      // Track in documentos_gerados
      await supabase.from("documentos_gerados").insert({
        paciente_id: paciente.id,
        user_id: user.id,
        tipo: type,
        nome: fileName,
      } as any);

      toast({ title: "PDF gerado!", description: fileName });
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadPlanoData = async () => {
    if (planoData?.refeicoes) {
      // Already loaded with refeicoes containing alimentos
      const refeicoes = (planoData.refeicoes || [])
        .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
        .map((r: any) => ({
          tipo: r.tipo,
          horario_sugerido: r.horario_sugerido || "",
          observacoes: r.observacoes || "",
          substituicoes_sugeridas: r.substituicoes_sugeridas || "",
          alimentos: (r.alimentos_plano || r.alimentos || [])
            .filter((a: any) => !a.opcao || a.opcao === "A")
            .map((a: any) => ({
              nome_alimento: a.nome_alimento,
              quantidade: a.quantidade || 0,
              medida_caseira: a.medida_caseira || "",
              energia_kcal: a.energia_kcal || 0,
              proteina_g: a.proteina_g || 0,
              carboidrato_g: a.carboidrato_g || 0,
              lipidio_g: a.lipidio_g || 0,
            })),
        }));
      return { nome: planoData.nome, observacoes: planoData.observacoes, data_inicio: planoData.data_inicio, data_fim: planoData.data_fim, refeicoes };
    }

    // Load from DB
    const planoId = planoData?.id;
    if (!planoId) throw new Error("Plano não encontrado");
    const { data: refs } = await supabase
      .from("refeicoes")
      .select("*, alimentos_plano(*)")
      .eq("plano_id", planoId)
      .order("ordem", { ascending: true });

    const refeicoes = (refs || []).map((r: any) => ({
      tipo: r.tipo,
      horario_sugerido: r.horario_sugerido || "",
      observacoes: r.observacoes || "",
      substituicoes_sugeridas: r.substituicoes_sugeridas || "",
      alimentos: (r.alimentos_plano || [])
        .filter((a: any) => !a.opcao || a.opcao === "A")
        .map((a: any) => ({
          nome_alimento: a.nome_alimento,
          quantidade: a.quantidade || 0,
          medida_caseira: a.medida_caseira || "",
          energia_kcal: a.energia_kcal || 0,
          proteina_g: a.proteina_g || 0,
          carboidrato_g: a.carboidrato_g || 0,
          lipidio_g: a.lipidio_g || 0,
        })),
    }));

    return { nome: planoData.nome, observacoes: planoData.observacoes, data_inicio: planoData.data_inicio, data_fim: planoData.data_fim, refeicoes };
  };

  const toggleSwitch = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center justify-between py-1.5">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            {type === "plano_alimentar" && "Exportar Plano Alimentar"}
            {type === "plano_simplificado" && "Exportar Plano Simplificado"}
            {type === "avaliacao" && "Exportar Avaliação Antropométrica"}
            {type === "relatorio_mensal" && "Gerar Relatório Mensal"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
          {(type === "plano_alimentar") && (
            <>
              {toggleSwitch("Incluir macronutrientes", planoOpts.incluirMacros, v => setPlanoOpts(p => ({ ...p, incluirMacros: v })))}
              {toggleSwitch("Incluir calorias por alimento", planoOpts.incluirCaloriasAlimento, v => setPlanoOpts(p => ({ ...p, incluirCaloriasAlimento: v })))}
              {toggleSwitch("Incluir substituições", planoOpts.incluirSubstituicoes, v => setPlanoOpts(p => ({ ...p, incluirSubstituicoes: v })))}
              {toggleSwitch("Incluir observações por refeição", planoOpts.incluirObsRefeicao, v => setPlanoOpts(p => ({ ...p, incluirObsRefeicao: v })))}
              {toggleSwitch("Incluir observações gerais", planoOpts.incluirObsGerais, v => setPlanoOpts(p => ({ ...p, incluirObsGerais: v })))}
              {toggleSwitch("Incluir totais diários de macros", planoOpts.incluirTotaisDiarios, v => setPlanoOpts(p => ({ ...p, incluirTotaisDiarios: v })))}
              {toggleSwitch("Incluir capa", planoOpts.incluirCapa, v => setPlanoOpts(p => ({ ...p, incluirCapa: v })))}
            </>
          )}

          {type === "avaliacao" && (
            <>
              {toggleSwitch("Incluir dobras cutâneas", avOpts.incluirDobras, v => setAvOpts(p => ({ ...p, incluirDobras: v })))}
              {toggleSwitch("Incluir circunferências", avOpts.incluirCircunferencias, v => setAvOpts(p => ({ ...p, incluirCircunferencias: v })))}
              {toggleSwitch("Incluir bioimpedância", avOpts.incluirBioimpedancia, v => setAvOpts(p => ({ ...p, incluirBioimpedancia: v })))}
              {toggleSwitch("Incluir diâmetros e medidas complementares", avOpts.incluirDiametros !== false, v => setAvOpts(p => ({ ...p, incluirDiametros: v })))}
              {toggleSwitch("Histórico completo de avaliações", avOpts.incluirComparativo, v => setAvOpts(p => ({ ...p, incluirComparativo: v })))}
              {toggleSwitch("Gráficos de evolução", avOpts.incluirGraficos, v => setAvOpts(p => ({ ...p, incluirGraficos: v })))}
              {toggleSwitch("Legendas de referência", avOpts.incluirLegendas !== false, v => setAvOpts(p => ({ ...p, incluirLegendas: v })))}
              {toggleSwitch("Incluir capa", avOpts.incluirCapa, v => setAvOpts(p => ({ ...p, incluirCapa: v })))}
            </>
          )}

          {type === "relatorio_mensal" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Mês</Label>
                  <Select value={String(relMes)} onValueChange={v => setRelMes(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Ano</Label>
                  <Input type="number" value={relAno} onChange={e => setRelAno(Number(e.target.value))} />
                </div>
              </div>
              {toggleSwitch("Incluir check-ins detalhados", relCheckins, setRelCheckins)}
              {toggleSwitch("Incluir anotações clínicas (privado)", relAnotacoes, setRelAnotacoes)}
              {toggleSwitch("Incluir plano ativo do período", relPlano, setRelPlano)}
              <div>
                <Label className="text-sm">Conquistas e observações (texto livre)</Label>
                <Textarea
                  value={relConquistas}
                  onChange={e => setRelConquistas(e.target.value)}
                  rows={3}
                  placeholder="Destaque conquistas, pontos de atenção e próximos objetivos..."
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
