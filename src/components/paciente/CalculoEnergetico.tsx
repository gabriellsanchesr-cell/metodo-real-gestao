import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Save, Download, Clock, FileText, Calculator, Import, Flame, Info, Trash2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  calcIdade, calcTMB, calcMacros, normalizarSexo, type FormulaTMB,
} from "@/lib/antropometria";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { paciente: any; }

// ─── Formula definitions ────────────────────────────────────────────
const FORMULAS: Record<string, { label: string; needsMLG?: boolean }> = {
  harris_benedict: { label: "Harris-Benedict (1919)" },
  harris_revisada: { label: "Harris-Benedict Revisada (Roza & Shizgal, 1984)" },
  mifflin: { label: "Mifflin-St Jeor (1990)" },
  fao_oms: { label: "FAO/OMS (1985)" },
  cunningham: { label: "Cunningham (massa magra)", needsMLG: true },
  owen: { label: "Owen" },
  tinsley: { label: "Tinsley (atletas)" },
};

const ACTIVITY_FACTORS = [
  { value: "1.2", label: "Sedentário", desc: "Pouca ou nenhuma atividade" },
  { value: "1.375", label: "Levemente ativo", desc: "Exercício leve 1-3 dias/sem" },
  { value: "1.55", label: "Moderadamente ativo", desc: "Exercício moderado 3-5 dias/sem" },
  { value: "1.725", label: "Muito ativo", desc: "Exercício intenso 6-7 dias/sem" },
  { value: "1.9", label: "Extremamente ativo", desc: "Atleta ou trabalho físico intenso" },
];

const INJURY_FACTORS = [
  { value: "1.0", label: "Nenhum (x1.0)" },
  { value: "1.05", label: "Cirurgia eletiva (x1.0–1.1)" },
  { value: "1.15", label: "Trauma leve (x1.1–1.2)" },
  { value: "1.3", label: "Trauma moderado (x1.2–1.4)" },
  { value: "1.5", label: "Trauma grave (x1.4–1.6)" },
  { value: "1.75", label: "Queimado (x1.5–2.0)" },
  { value: "1.4", label: "Sepse (x1.2–1.6)" },
];

const REFERENCES: Record<string, string> = {
  harris_benedict: "Harris JA, Benedict FG. A Biometric Study of Human Basal Metabolism. Proc Natl Acad Sci. 1918;4(12):370-373.",
  harris_revisada: "Roza AM, Shizgal HM. The Harris Benedict equation reevaluated. Am J Clin Nutr. 1984;40(1):168-182.",
  mifflin: "Mifflin MD et al. A new predictive equation for resting energy expenditure. Am J Clin Nutr. 1990;51(2):241-247.",
  fao_oms: "FAO/WHO/UNU. Energy and Protein Requirements. WHO Technical Report Series 724, Geneva, 1985.",
  cunningham: "Cunningham JJ. Body composition as a determinant of energy expenditure. Am J Clin Nutr. 1991;54(6):963-969.",
  owen: "Owen OE et al. A reappraisal of caloric requirements in healthy women. Am J Clin Nutr. 1986;44(1):1-19.",
  tinsley: "Tinsley GM et al. Fat-free mass in athletes: predictive equations. JISSN. 2019;16(1):21.",
};

const GESTANTE_ADD = [85, 285, 475]; // trimestres 1, 2, 3

const DEFAULT_MEALS: Record<string, { label: string; pct: number }> = {
  cafe_da_manha: { label: "Café da manhã", pct: 25 },
  lanche_manha: { label: "Lanche manhã", pct: 10 },
  almoco: { label: "Almoço", pct: 30 },
  lanche_tarde: { label: "Lanche tarde", pct: 10 },
  jantar: { label: "Jantar", pct: 20 },
  ceia: { label: "Ceia", pct: 5 },
};

// ─── Component ──────────────────────────────────────────────────────
export function CalculoEnergetico({ paciente }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Input state
  const [peso, setPeso] = useState(String(paciente.peso_inicial || ""));
  const [altura, setAltura] = useState(String(paciente.altura ? paciente.altura * 100 : ""));
  const [mlg, setMlg] = useState("");
  const [idade, setIdade] = useState(() => {
    const i = calcIdade(paciente.data_nascimento);
    return i === null ? "" : String(i);
  });
  // Sem sexo no cadastro o campo fica vazio de propósito: supor masculino
  // muda a TMB em 166 kcal no Mifflin sem ninguém perceber.
  const [sexo, setSexo] = useState<string>(() => normalizarSexo(paciente.sexo) ?? "");
  const [formula, setFormula] = useState("mifflin");
  const [fatorAtiv, setFatorAtiv] = useState("1.55");
  const [fatorInj, setFatorInj] = useState("1.0");
  const [adicMet, setAdicMet] = useState("0");
  const [gestante, setGestante] = useState(false);
  const [trimestre, setTrimestre] = useState(1);
  const [objetivo, setObjetivo] = useState<"deficit" | "manutencao" | "superavit">("manutencao");
  const [pctAjuste, setPctAjuste] = useState([0]);

  // Macros
  const [protMode, setProtMode] = useState<"gkg" | "pct">("gkg");
  const [protValue, setProtValue] = useState("1.8");
  const [carbPct, setCarbPct] = useState("50");
  const [fatPct, setFatPct] = useState("");

  // Meal distribution
  const [showMeals, setShowMeals] = useState(false);
  const [meals, setMeals] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    Object.entries(DEFAULT_MEALS).forEach(([k, v]) => (m[k] = v.pct));
    return m;
  });

  // Modals
  const [showHistory, setShowHistory] = useState(false);
  const [showRefs, setShowRefs] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // ─── Calculate results in real time ───────────────────────────────
  const results = useMemo(() => {
    const p = Number(peso), h = Number(altura), i = Number(idade), m = Number(mlg);
    const sexoNorm = normalizarSexo(sexo);
    if (!p || !h || !i || !sexoNorm) return null;

    const tmb = calcTMB({
      formula: formula as FormulaTMB,
      pesoKg: p, alturaCm: h, idade: i, sexo: sexoNorm, mlgKg: m || null,
    });
    if (tmb === null) return null;

    const fa = Number(fatorAtiv);
    const fi = Number(fatorInj);
    const get = tmb * fa * fi;

    let adicional = Number(adicMet) || 0;
    if (gestante && trimestre >= 1 && trimestre <= 3) adicional += GESTANTE_ADD[trimestre - 1];

    const ajustePct = pctAjuste[0] / 100;
    const meta = Math.round(get + adicional + get * ajustePct);

    const macros = calcMacros({
      metaKcal: meta,
      pesoKg: p,
      proteinaModo: protMode,
      proteinaValor: Number(protValue),
      carboidratoPct: Number(carbPct),
    });

    return {
      tmb: Math.round(tmb),
      get: Math.round(get),
      meta,
      protG: macros.proteina.g, protPct: macros.proteina.pct, protKcal: macros.proteina.kcal,
      carbG: macros.carboidrato.g, carbPct: macros.carboidrato.pct, carbKcal: macros.carboidrato.kcal,
      fatG: macros.gordura.g, fatPct: macros.gordura.pct, fatKcal: macros.gordura.kcal,
      macroValid: macros.valido,
      macroErro: macros.erro,
    };
  }, [peso, altura, idade, sexo, formula, fatorAtiv, fatorInj, adicMet, gestante, trimestre, pctAjuste, protMode, protValue, carbPct]);

  useEffect(() => {
    if (results) {
      setFatPct(String(results.fatPct));
    }
  }, [results]);

  // ─── Import from last anthropometric assessment ───────────────────
  const importFromAntropometria = async () => {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("peso, altura, massa_magra_kg")
      .eq("paciente_id", paciente.id)
      .order("data_avaliacao", { ascending: false })
      .limit(1)
      .single();
    if (data) {
      if (data.peso) setPeso(String(data.peso));
      if (data.altura) setAltura(String(data.altura));
      if (data.massa_magra_kg) setMlg(String(data.massa_magra_kg));
      toast({ title: "Dados importados da última avaliação" });
    } else {
      toast({ title: "Nenhuma avaliação encontrada", variant: "destructive" });
    }
  };

  // ─── Save calculation ─────────────────────────────────────────────
  const saveCalculo = async () => {
    if (!results || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("calculos_energeticos").insert({
        paciente_id: paciente.id,
        user_id: user.id,
        peso: Number(peso), altura: Number(altura), idade: Number(idade), sexo,
        massa_magra: Number(mlg) || null,
        formula, fator_atividade: Number(fatorAtiv), fator_injuria: Number(fatorInj),
        adicional_met: Number(adicMet) || 0,
        adicional_gestante: gestante, trimestre_gestante: gestante ? trimestre : null,
        objetivo, percentual_ajuste: pctAjuste[0],
        tmb: results.tmb, get: results.get, meta_calorica: results.meta,
        proteina_g: results.protG, proteina_pct: results.protPct,
        carboidrato_g: results.carbG, carboidrato_pct: results.carbPct,
        gordura_g: results.fatG, gordura_pct: results.fatPct,
        distribuicao_refeicoes: showMeals ? meals : null,
      } as any);
      if (error) throw error;
      toast({ title: "Cálculo salvo com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ─── Load history ─────────────────────────────────────────────────
  const loadHistory = async () => {
    const { data } = await supabase
      .from("calculos_energeticos")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false }) as any;
    setHistory(data || []);
    setShowHistory(true);
  };

  const deleteCalculo = async (id: string) => {
    await supabase.from("calculos_energeticos").delete().eq("id", id);
    setHistory(h => h.filter(c => c.id !== id));
    toast({ title: "Cálculo excluído" });
  };

  // ─── Donut chart data ─────────────────────────────────────────────
  const donutData = results ? [
    { name: "Proteína", value: results.protPct, color: "hsl(var(--primary))" },
    { name: "Carboidrato", value: results.carbPct, color: "hsl(var(--warning))" },
    { name: "Gordura", value: results.fatPct, color: "#FCD34D" },
  ] : [];

  const mealSum = Object.values(meals).reduce((a, b) => a + b, 0);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> Cálculo Energético
          </h2>
          <p className="text-sm text-muted-foreground">
            Paciente: {paciente.nome_completo}
            {calcIdade(paciente.data_nascimento) !== null
              ? `, ${calcIdade(paciente.data_nascimento)} anos`
              : " (sem data de nascimento no cadastro)"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={importFromAntropometria}>
            <Import className="h-4 w-4 mr-1" /> Importar dados
          </Button>
          <Button variant="outline" size="sm" onClick={loadHistory}>
            <Clock className="h-4 w-4 mr-1" /> Histórico
          </Button>
          <Button size="sm" onClick={saveCalculo} disabled={saving || !results}
            className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4 mr-1" /> Salvar cálculo
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT COLUMN — 60% */}
        <div className="lg:col-span-3 space-y-4">
          {/* Block 1 — Dados Antropométricos */}
          <Card className="border-border rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                Dados Antropométricos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FieldInput label="Peso (kg)" value={peso} onChange={setPeso} />
                <FieldInput label="Altura (cm)" value={altura} onChange={setAltura} />
                <FieldInput label="MLG (kg)" value={mlg} onChange={setMlg} hint="Opcional" />
                <FieldInput label="Idade" value={idade} onChange={setIdade} />
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Sexo</Label>
                  <Select value={sexo} onValueChange={setSexo}>
                    <SelectTrigger className="h-11 rounded-lg bg-muted/50 border-border mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Block 2 — Fórmulas Padronizadas */}
          <Card className="border-border rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                  Fórmulas Padronizadas
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowRefs(true)} className="text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mr-1" /> Referências
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Fórmula</Label>
                <Select value={formula} onValueChange={setFormula}>
                  <SelectTrigger className="h-11 rounded-lg bg-muted/50 border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMULAS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {FORMULAS[formula]?.needsMLG && !mlg && (
                  <p className="text-xs text-destructive mt-1">⚠ Esta fórmula requer Massa Livre de Gordura</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Fator de atividade</Label>
                  <Select value={fatorAtiv} onValueChange={setFatorAtiv}>
                    <SelectTrigger className="h-11 rounded-lg bg-muted/50 border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_FACTORS.map(f => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label} (x{f.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Fator de injúria</Label>
                  <Select value={fatorInj} onValueChange={setFatorInj}>
                    <SelectTrigger className="h-11 rounded-lg bg-muted/50 border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INJURY_FACTORS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Block 3 — Ajustes Refinados */}
          <Card className="border-border rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                Ajustes Refinados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldInput label="Adicional por MET (kcal/dia)" value={adicMet} onChange={setAdicMet} />

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium">Adicional gestante (OMS)</p>
                  <p className="text-xs text-muted-foreground">
                    {gestante ? `+${GESTANTE_ADD[trimestre - 1]} kcal (${trimestre}º trimestre)` : "Desativado"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {gestante && (
                    <Select value={String(trimestre)} onValueChange={v => setTrimestre(Number(v))}>
                      <SelectTrigger className="w-24 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1º Tri</SelectItem>
                        <SelectItem value="2">2º Tri</SelectItem>
                        <SelectItem value="3">3º Tri</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Switch checked={gestante} onCheckedChange={setGestante} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium text-muted-foreground">Ajuste calórico</Label>
                  <Badge variant={pctAjuste[0] < 0 ? "destructive" : pctAjuste[0] > 0 ? "default" : "secondary"} className="text-xs">
                    {pctAjuste[0] > 0 ? "+" : ""}{pctAjuste[0]}%
                    {results ? ` (${pctAjuste[0] > 0 ? "+" : ""}${Math.round(results.get * pctAjuste[0] / 100)} kcal)` : ""}
                  </Badge>
                </div>
                <Slider value={pctAjuste} onValueChange={setPctAjuste} min={-30} max={30} step={1} />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>-30% Déficit</span>
                  <span>Manutenção</span>
                  <span>+30% Superávit</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Block 4 — Macronutrientes */}
          <Card className="border-border rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                Distribuição de Macronutrientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>Proteína</Label>
                    <button onClick={() => setProtMode(m => m === "gkg" ? "pct" : "gkg")}
                      className="text-[10px] underline text-muted-foreground">
                      {protMode === "gkg" ? "Trocar p/ %" : "Trocar p/ g/kg"}
                    </button>
                  </div>
                  <Input type="number" value={protValue} onChange={e => setProtValue(e.target.value)}
                    className="h-11 rounded-lg bg-muted/50"
                    placeholder={protMode === "gkg" ? "g/kg" : "% VCT"} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {protMode === "gkg" ? `${results?.protPct ?? 0}% do VCT` : `${results?.protG ?? 0}g`}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium" style={{ color: "hsl(var(--warning))" }}>Carboidrato (% VCT)</Label>
                  <Input type="number" value={carbPct} onChange={e => setCarbPct(e.target.value)}
                    className="h-11 rounded-lg bg-muted/50 mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">{results?.carbG ?? 0}g</p>
                </div>
                <div>
                  <Label className="text-xs font-medium" style={{ color: "#FCD34D" }}>Gordura (% VCT)</Label>
                  <Input type="number" value={fatPct} readOnly
                    className="h-11 rounded-lg bg-muted/30 mt-1 opacity-70" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">{results?.fatG ?? 0}g (restante)</p>
                </div>
              </div>

              {results?.macroErro && (
                <div className={`p-2 rounded-lg border text-xs ${results.macroValid
                  ? "bg-warning/10 border-warning/30 text-warning"
                  : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
                  {results.macroErro}
                </div>
              )}

              {/* Visual bars */}
              {results && (
                <div className="flex h-3 rounded-full overflow-hidden">
                  <div style={{ width: `${Math.max(results.protPct, 0)}%`, background: "hsl(var(--primary))" }} />
                  <div style={{ width: `${Math.max(results.carbPct, 0)}%`, background: "hsl(var(--warning))" }} />
                  <div style={{ width: `${Math.max(results.fatPct, 0)}%`, background: "#FCD34D" }} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN — 40% */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4 space-y-4">
            {/* Section 1 — Results */}
            <Card className="border-border rounded-xl shadow-sm border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" /> Resultados Principais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <ResultRow label="TMB (Taxa Metabólica Basal)" value={results ? `${results.tmb} kcal` : "—"} />
                <ResultRow label="GET (Gasto Energético Total)" value={results ? `${results.get} kcal` : "—"} />
                <ResultRow label="Meta Calórica (com ajuste)" value={results ? `${results.meta} kcal` : "—"} highlight />
                <ResultRow label="Fórmula utilizada" value={FORMULAS[formula]?.label || formula} small />
                <ResultRow label="Fator de atividade" value={`x${fatorAtiv}`} small />
                {Number(fatorInj) > 1 && <ResultRow label="Fator de injúria" value={`x${fatorInj}`} small />}
              </CardContent>
            </Card>

            {/* Section 2 — Macros + Donut */}
            {results && (
              <Card className="border-border rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Macronutrientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-0">
                      <MacroRow label="Proteína" g={results.protG} pct={results.protPct} kcal={results.protKcal} color="hsl(var(--primary))" />
                      <MacroRow label="Carboidrato" g={results.carbG} pct={results.carbPct} kcal={results.carbKcal} color="hsl(var(--warning))" />
                      <MacroRow label="Gordura" g={results.fatG} pct={results.fatPct} kcal={results.fatKcal} color="#FCD34D" />
                      <div className="flex justify-between pt-2 border-t border-border text-xs font-semibold text-foreground">
                        <span>Total</span>
                        <span>{results.protKcal + results.carbKcal + results.fatKcal} kcal</span>
                      </div>
                    </div>
                    <div className="w-28 h-28 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={45} strokeWidth={0}>
                            {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section 3 — Meal Distribution */}
            <Card className="border-border rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Distribuição por Refeições</CardTitle>
                  <Switch checked={showMeals} onCheckedChange={setShowMeals} />
                </div>
              </CardHeader>
              {showMeals && results && (
                <CardContent className="space-y-2">
                  {Object.entries(DEFAULT_MEALS).map(([key, { label }]) => (
                    <div key={key} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">{label}</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" value={meals[key]} className="w-14 h-7 text-xs text-center p-0 rounded"
                          onChange={e => setMeals(m => ({ ...m, [key]: Number(e.target.value) }))} />
                        <span className="text-muted-foreground w-6 text-right">%</span>
                        <span className="font-medium w-16 text-right">{Math.round(results.meta * meals[key] / 100)} kcal</span>
                      </div>
                    </div>
                  ))}
                  <div className={`flex justify-between text-xs font-semibold pt-1 ${mealSum !== 100 ? "text-destructive" : "text-foreground"}`}>
                    <span>Total</span>
                    <span>{mealSum}%</span>
                  </div>
                  {mealSum !== 100 && (
                    <p className="text-[10px] text-destructive">⚠ Soma deve ser 100%</p>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* ─── History Modal ───────────────────────────────────────────── */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Cálculos</DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum cálculo salvo ainda.</p>
          ) : (
            <div className="space-y-3">
              {history.map((c: any) => (
                <div key={c.id} className="p-3 border border-border rounded-lg flex items-center justify-between hover:bg-accent/30 transition">
                  <div>
                    <p className="text-sm font-medium">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    <p className="text-xs text-muted-foreground">
                      {FORMULAS[c.formula]?.label || c.formula} · Meta: {c.meta_calorica} kcal ·
                      P{c.proteina_pct}% C{c.carboidrato_pct}% G{c.gordura_pct}%
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteCalculo(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── References Modal ────────────────────────────────────────── */}
      <Dialog open={showRefs} onOpenChange={setShowRefs}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Referências Bibliográficas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {Object.entries(REFERENCES).map(([k, ref]) => (
              <div key={k} className="p-2 rounded bg-muted/30">
                <p className="font-medium text-primary text-xs">{FORMULAS[k]?.label}</p>
                <p className="text-xs text-muted-foreground">{ref}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────
function FieldInput({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}{hint && <span className="ml-1 text-[10px] opacity-60">({hint})</span>}</Label>
      <Input type="number" value={value} onChange={e => onChange(e.target.value)}
        className="h-11 rounded-lg bg-muted/50 border-border mt-1" />
    </div>
  );
}

function ResultRow({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-border/40 last:border-0 hover:bg-accent/20 px-2 -mx-2 rounded transition">
      <span className={`${small ? "text-xs" : "text-sm"} text-muted-foreground`}>{label}</span>
      <span className={`font-semibold ${highlight ? "text-primary text-base" : small ? "text-xs text-foreground/70" : "text-sm text-foreground"}`}>{value}</span>
    </div>
  );
}

function MacroRow({ label, g, pct, kcal, color }: { label: string; g: number; pct: number; kcal: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="flex gap-3 text-right">
        <span className="w-10 font-medium">{g}g</span>
        <span className="w-8 text-muted-foreground">{pct}%</span>
        <span className="w-14 font-medium">{kcal} kcal</span>
      </div>
    </div>
  );
}
