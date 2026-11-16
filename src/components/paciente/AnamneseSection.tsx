import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCopy, FileText, Edit, User, Stethoscope, Loader2, Save, X } from "lucide-react";
import { FormularioClinicoEdicao, FormularioClinicoLeitura } from "@/components/FormularioClinico";
import { ANAMNESE_MODELO, ANAMNESE_SECOES } from "@/lib/anamneseModelo";
import { progresso, type Respostas } from "@/lib/formularios";

/** Campos de texto da anamnese antiga (antes do modelo do Word). Só leitura. */
const SECOES_ANTIGAS = [
  { key: "objetivos_motivacoes", label: "Objetivos e Motivações" },
  { key: "historico_treino", label: "Histórico de Treino e Rotina" },
  { key: "historico_alimentar", label: "Histórico Alimentar" },
  { key: "saude_intestinal", label: "Saúde Intestinal" },
  { key: "sono_estresse", label: "Sono e Estresse" },
  { key: "historico_medico", label: "Histórico Médico" },
  { key: "espaco_livre", label: "Espaço Livre" },
] as const;

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paciente: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Anamnese clínica e nutricional no modelo do Gabriel (o mesmo do Word).
 * O nutri preenche aqui ou manda o link para a paciente preencher. As
 * respostas ficam em anamneses.respostas (migration 20261116120000).
 */
export function AnamneseSection({ paciente }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [anamnese, setAnamnese] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [valores, setValores] = useState<Respostas>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("anamneses")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setAnamnese(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValores(((data as any)?.respostas as Respostas) ?? {});
    setLoading(false);
  }, [paciente.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirEdicao = () => {
    // Peso e altura do cadastro entram como ponto de partida.
    setValores((v) => ({
      ...v,
      peso: v.peso ?? paciente.peso_inicial ?? "",
      altura: v.altura ?? (paciente.altura ? Math.round(Number(paciente.altura) * (Number(paciente.altura) < 3 ? 100 : 1)) : ""),
    }));
    setEditando(true);
  };

  const salvar = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const campos = { respostas: valores, modelo: ANAMNESE_MODELO, respondido: true, updated_at: new Date().toISOString() };
      const { error } = anamnese
        ? await db.from("anamneses").update(campos).eq("id", anamnese.id)
        : await db.from("anamneses").insert({ ...campos, paciente_id: paciente.id, user_id: session.user.id, preenchido_por: "nutricionista" });
      if (error) {
        const falta = /respostas|modelo/.test(error.message ?? "");
        throw new Error(falta ? "Falta aplicar no banco o SQL da anamnese nova (20261116120000)." : error.message);
      }
      toast({ title: "Anamnese salva" });
      setEditando(false);
      carregar();
    } catch (err) {
      toast({ title: "Não consegui salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copiarLink = async () => {
    if (!session?.user?.id) return;
    try {
      let token = anamnese?.token;
      if (!token) {
        const { data, error } = await db.from("anamneses").insert({
          paciente_id: paciente.id, user_id: session.user.id, preenchido_por: "paciente", respondido: false, modelo: ANAMNESE_MODELO,
        }).select("token").single();
        if (error) throw error;
        token = data.token;
        carregar();
      }
      await navigator.clipboard.writeText(`${window.location.origin}/anamnese/${token}`);
      toast({ title: "Link copiado", description: "Envie para a paciente preencher pelo celular." });
    } catch (err) {
      toast({ title: "Não consegui gerar o link", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const temRespostas = anamnese?.respostas && Object.keys(anamnese.respostas).length > 0;
  const temTextoAntigo = anamnese && SECOES_ANTIGAS.some(({ key }) => anamnese[key]);
  const { feitos, total } = progresso(ANAMNESE_SECOES, valores);

  if (editando) {
    return (
      <div className="space-y-4">
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-background/95 px-1 py-2 backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Anamnese clínica e nutricional</h2>
            <p className="text-xs text-muted-foreground">{feitos} de {total} campos preenchidos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditando(false); carregar(); }} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar</Button>
          </div>
        </div>
        <FormularioClinicoEdicao secoes={ANAMNESE_SECOES} valores={valores} onChange={(id, v) => setValores((s) => ({ ...s, [id]: v }))} />
        <div className="flex justify-end">
          <Button onClick={salvar} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar anamnese</Button>
        </div>
      </div>
    );
  }

  if (!anamnese || (!anamnese.respondido && !temRespostas)) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Anamnese</h2>
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-center text-muted-foreground">
              {anamnese ? "O link foi gerado e a paciente ainda não respondeu." : "Nenhuma anamnese preenchida para esta paciente."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={copiarLink} variant="outline"><ClipboardCopy className="h-4 w-4 mr-2" /> {anamnese ? "Copiar o link de novo" : "Enviar link à paciente"}</Button>
              <Button onClick={abrirEdicao}><Edit className="h-4 w-4 mr-2" /> Preencher na consulta</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Anamnese</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            {anamnese.preenchido_por === "paciente" ? <><User className="h-3 w-3" /> Paciente</> : <><Stethoscope className="h-3 w-3" /> Nutricionista</>}
          </Badge>
          <span className="text-xs text-muted-foreground">{new Date(anamnese.updated_at || anamnese.created_at).toLocaleDateString("pt-BR")}</span>
          <Button size="sm" variant="outline" onClick={abrirEdicao}><Edit className="h-4 w-4 mr-1" /> {temRespostas ? "Editar" : "Preencher no modelo novo"}</Button>
        </div>
      </div>

      {temRespostas && <FormularioClinicoLeitura secoes={ANAMNESE_SECOES} valores={anamnese.respostas} />}

      {/* Anamnese antiga, em texto: continua visível para não perder o histórico. */}
      {temTextoAntigo && (
        <div className="space-y-3">
          {temRespostas && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anamnese anterior (modelo antigo)</p>}
          {SECOES_ANTIGAS.filter(({ key }) => anamnese[key]).map(({ key, label }) => (
            <Card key={key} className="rounded-xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm text-foreground">{anamnese[key]}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
