import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Target, CheckCircle2, Pause, Circle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { bloqueadoNaVisualizacao, usePortalModo } from "@/contexts/PortalModoContext";

export function PortalMetas({ paciente }: { paciente: any }) {
  const { modoVisualizacao } = usePortalModo();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, [paciente.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("metas_paciente").select("*").eq("paciente_id", paciente.id)
      .order("status", { ascending: true }).order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const concluir = async (id: string) => {
    if (bloqueadoNaVisualizacao(modoVisualizacao)) return;
    await (supabase as any).from("metas_paciente").update({
      status: "concluida", concluida_em: new Date().toISOString(),
    }).eq("id", id);
    toast({ title: "Meta concluída. Parabéns!" });
    load();
  };

  const reabrir = async (id: string) => {
    if (bloqueadoNaVisualizacao(modoVisualizacao)) return;
    await (supabase as any).from("metas_paciente").update({
      status: "em_andamento", concluida_em: null,
    }).eq("id", id);
    load();
  };

  const atualizarValor = async (id: string) => {
    if (bloqueadoNaVisualizacao(modoVisualizacao)) return;
    const val = editing[id];
    if (val === undefined || val === "") return;
    await (supabase as any).from("metas_paciente").update({ valor_atual: Number(val) }).eq("id", id);
    toast({ title: "Progresso atualizado" });
    setEditing(e => { const c = { ...e }; delete c[id]; return c; });
    load();
  };

  if (loading) {
    return <Card className="rounded-2xl"><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  }

  if (items.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">Nenhuma meta ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Suas metas aparecerão aqui quando seu nutricionista configurá-las.</p>
        </CardContent>
      </Card>
    );
  }

  const ativas = items.filter(m => m.status === "em_andamento");
  const concluidas = items.filter(m => m.status === "concluida");
  const pausadas = items.filter(m => m.status === "pausada");

  const renderMeta = (m: any) => {
    const isNum = m.tipo === "numerica" && m.valor_alvo;
    const pct = isNum ? Math.min(100, Math.max(0, (Number(m.valor_atual || 0) / Number(m.valor_alvo)) * 100)) : null;
    const done = m.status === "concluida";

    return (
      <Card key={m.id} className={`rounded-2xl ${done ? "opacity-70" : ""}`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h4 className={`font-semibold text-foreground ${done ? "line-through" : ""}`}>{m.titulo}</h4>
                {m.prioridade === "alta" && <Badge variant="outline" className="text-xs text-amber-700 border-amber-200">Alta</Badge>}
              </div>
              {m.descricao && <p className="text-sm text-muted-foreground">{m.descricao}</p>}
            </div>
            {!done ? (
              <Button size="icon" variant="ghost" onClick={() => concluir(m.id)} title="Concluir">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" onClick={() => reabrir(m.id)} title="Reabrir">
                <Circle className="h-5 w-5" />
              </Button>
            )}
          </div>
          {pct !== null && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{m.valor_atual || 0} / {m.valor_alvo} {m.unidade || ""}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} className="h-2" />
              {!done && (
                <div className="flex gap-2 mt-2">
                  <Input
                    type="number"
                    placeholder="Atualizar valor"
                    value={editing[m.id] ?? ""}
                    onChange={e => setEditing(s => ({ ...s, [m.id]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={() => atualizarValor(m.id)}>OK</Button>
                </div>
              )}
            </div>
          )}
          {m.prazo && (
            <p className="text-xs text-muted-foreground">
              Prazo: {format(new Date(m.prazo + "T00:00:00"), "dd/MM/yyyy")}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {ativas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Circle className="h-4 w-4" /> Em andamento</h3>
          <div className="space-y-2">{ativas.map(renderMeta)}</div>
        </div>
      )}
      {pausadas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Pause className="h-4 w-4" /> Pausadas</h3>
          <div className="space-y-2">{pausadas.map(renderMeta)}</div>
        </div>
      )}
      {concluidas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Concluídas</h3>
          <div className="space-y-2">{concluidas.map(renderMeta)}</div>
        </div>
      )}
    </div>
  );
}
