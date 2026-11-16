import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { FormularioClinicoEdicao } from "@/components/FormularioClinico";
import { ANAMNESE_SECOES } from "@/lib/anamneseModelo";
import { progresso, type Respostas } from "@/lib/formularios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const CHAVE_RASCUNHO = (token: string) => `anamneseRascunho:${token}`;

/**
 * Link que a paciente recebe para preencher a anamnese (modelo do Gabriel).
 * Sem login: lê e grava pelas funções seguras get_anamnese_by_token e
 * submit_anamnese_respostas. O que ela digita fica salvo no celular até
 * enviar, para não perder se fechar a página.
 */
export default function AnamnesePublica() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [valores, setValores] = useState<Respostas>(() => {
    try { return token ? JSON.parse(localStorage.getItem(CHAVE_RASCUNHO(token)) || "{}") : {}; } catch { return {}; }
  });

  useEffect(() => {
    if (!token) return;
    supabase.rpc("get_anamnese_by_token", { p_token: token }).then(({ data, error }) => {
      if (error || !data || data.length === 0) setNotFound(true);
      else if (data[0].respondido) setSaved(true);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    try { localStorage.setItem(CHAVE_RASCUNHO(token), JSON.stringify(valores)); } catch { /* opcional */ }
  }, [token, valores]);

  const enviar = async () => {
    if (!token) return;
    setSaving(true);
    setErro(null);
    const { data, error } = await db.rpc("submit_anamnese_respostas", { p_token: token, p_respostas: valores });
    setSaving(false);
    if (error || !data) {
      setErro("Não consegui enviar agora. Suas respostas continuam aqui; tente de novo em instantes.");
      return;
    }
    try { localStorage.removeItem(CHAVE_RASCUNHO(token)); } catch { /* opcional */ }
    setSaved(true);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F4F5FA]"><Loader2 className="h-8 w-8 animate-spin text-[#004AAD]" /></div>;
  }

  if (notFound || saved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5FA] px-4">
        <Card className="max-w-md rounded-xl">
          <CardContent className="space-y-3 py-12 text-center">
            {saved && <CheckCircle className="mx-auto h-12 w-12 text-green-500" />}
            <p className="text-lg font-medium text-[#0E1E35]">{saved ? "Anamnese enviada!" : "Link inválido ou expirado."}</p>
            {saved && <p className="text-sm text-muted-foreground">Obrigado por preencher com calma. Vou ler tudo antes da nossa consulta.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { feitos, total } = progresso(ANAMNESE_SECOES, valores);

  return (
    <div className="min-h-screen bg-[#F4F5FA] px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <img src="/logo.png" alt="Gabriel Sanches Nutrição" className="mx-auto h-10" />
          <h1 className="text-2xl font-bold text-[#0E1E35]">Anamnese clínica e nutricional</h1>
          <p className="text-muted-foreground">Responda com calma. O que você digitar fica salvo neste celular até enviar.</p>
          <p className="text-xs text-muted-foreground">{feitos} de {total} respondidos</p>
        </div>
        <FormularioClinicoEdicao secoes={ANAMNESE_SECOES} valores={valores} onChange={(id, v) => setValores((s) => ({ ...s, [id]: v }))} />
        {erro && <p className="text-center text-sm text-destructive">{erro}</p>}
        <Button onClick={enviar} disabled={saving} className="h-12 w-full bg-[#004AAD] text-base hover:bg-[#004AAD]/90">
          {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />} Enviar anamnese
        </Button>
      </div>
    </div>
  );
}
