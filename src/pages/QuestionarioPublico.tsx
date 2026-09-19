import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  checkin_semanal: "Check-in Semanal",
  qualidade_vida: "Qualidade de Vida",
  comportamento_alimentar: "Comportamento Alimentar",
  sintomas_intestinais: "Sintomas Intestinais",
  anamnese: "Anamnese",
};

const QUESTIONS: Record<string, { key: string; label: string; type: "text" | "number" | "slider" }[]> = {
  checkin_semanal: [
    { key: "peso", label: "Peso atual (kg)", type: "number" },
    { key: "nivel_energia", label: "Nível de energia (1-5)", type: "slider" },
    { key: "qualidade_sono", label: "Qualidade do sono (1-5)", type: "slider" },
    { key: "aderencia_plano", label: "Aderência ao plano (%)", type: "number" },
    { key: "observacoes", label: "Observações", type: "text" },
  ],
  qualidade_vida: [
    { key: "satisfacao_geral", label: "Satisfação geral com a saúde", type: "text" },
    { key: "energia_disposicao", label: "Energia e disposição no dia a dia", type: "text" },
    { key: "relacao_comida", label: "Como está sua relação com a comida?", type: "text" },
    { key: "humor", label: "Como está seu humor?", type: "text" },
    { key: "observacoes", label: "Observações adicionais", type: "text" },
  ],
  comportamento_alimentar: [
    { key: "compulsao", label: "Tem tido episódios de compulsão alimentar?", type: "text" },
    { key: "restricao", label: "Tem se restringido muito?", type: "text" },
    { key: "emocional", label: "Come por questões emocionais?", type: "text" },
    { key: "saciedade", label: "Como está a sensação de saciedade?", type: "text" },
    { key: "observacoes", label: "Observações adicionais", type: "text" },
  ],
  sintomas_intestinais: [
    { key: "frequencia", label: "Frequência de evacuação", type: "text" },
    { key: "consistencia", label: "Consistência das fezes", type: "text" },
    { key: "inchaço", label: "Sente inchaço abdominal?", type: "text" },
    { key: "gases", label: "Excesso de gases?", type: "text" },
    { key: "dor_abdominal", label: "Dores abdominais?", type: "text" },
    { key: "observacoes", label: "Observações adicionais", type: "text" },
  ],
};

export default function QuestionarioPublico() {
  const { token } = useParams();
  const [questionario, setQuestionario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => { if (token) load(); }, [token]);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_questionario_by_token", { p_token: token as string });
    const row: any = Array.isArray(data) ? data[0] : data;
    if (error || !row) { setNotFound(true); }
    else if (row.status === "respondido") { setSaved(true); setQuestionario(row); }
    else { setQuestionario(row); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!questionario) return;
    setSaving(true);
    await supabase.rpc("respond_questionario_by_token", { p_token: token as string, p_respostas: answers });
    setSaving(false);
    setSaved(true);
  };

  const questions = questionario ? QUESTIONS[questionario.tipo] || [] : [];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F4F5FA]"><Loader2 className="h-8 w-8 animate-spin text-[#004AAD]" /></div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center bg-[#F4F5FA]"><Card className="max-w-md rounded-xl border-[#E2E5F0]"><CardContent className="py-12 text-center"><p className="text-lg font-medium text-[#0E1E35]">Link inválido ou expirado.</p></CardContent></Card></div>;
  if (saved) return <div className="min-h-screen flex items-center justify-center bg-[#F4F5FA]"><Card className="max-w-md rounded-xl border-[#E2E5F0]"><CardContent className="py-12 text-center space-y-3"><CheckCircle className="h-12 w-12 text-green-500 mx-auto" /><p className="text-lg font-medium text-[#0E1E35]">Questionário respondido!</p><p className="text-sm text-muted-foreground">Obrigado por preencher.</p></CardContent></Card></div>;

  return (
    <div className="min-h-screen bg-[#F4F5FA] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="Logo" className="h-10 mx-auto" />
          <h1 className="text-2xl font-bold text-[#0E1E35]">{TIPO_LABELS[questionario.tipo] || "Questionário"}</h1>
          <p className="text-muted-foreground">Responda as perguntas abaixo.</p>
        </div>

        {questions.map(q => (
          <Card key={q.key} className="rounded-xl border-[#E2E5F0]">
            <CardHeader className="pb-2"><CardTitle className="text-base text-[#0E1E35]">{q.label}</CardTitle></CardHeader>
            <CardContent>
              {q.type === "text" && (
                <Textarea value={answers[q.key] || ""} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} rows={3} />
              )}
              {q.type === "number" && (
                <Input type="number" value={answers[q.key] || ""} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} />
              )}
              {q.type === "slider" && (
                <div className="flex items-center gap-4">
                  <Slider min={1} max={5} step={1} value={[answers[q.key] || 3]} onValueChange={v => setAnswers({ ...answers, [q.key]: v[0] })} className="flex-1" />
                  <span className="text-sm font-medium w-6 text-center">{answers[q.key] || 3}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button onClick={handleSubmit} disabled={saving} className="w-full bg-[#004AAD] hover:bg-[#004AAD]/90 h-12 text-base">
          {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
          Enviar Respostas
        </Button>
      </div>
    </div>
  );
}
