import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, ArrowLeft, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";
import { usePortalModo } from "@/contexts/PortalModoContext";

interface Ingrediente { nome: string; quantidade: string; unidade: string; }
interface Receita {
  id: string; titulo: string; descricao: string; modo_preparo: string;
  tempo_preparo_min: number | null; porcoes: number; ingredientes: Ingrediente[];
  calorias_total: number; proteina_total: number; carboidrato_total: number;
  gordura_total: number; fibra_total: number; tags: string[];
}

export function PortalReceitas({ paciente }: { paciente: any }) {
  const { modoVisualizacao } = usePortalModo();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Receita | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: rp } = await supabase
      .from("receitas_pacientes")
      .select("receita_id, visualizada")
      .eq("paciente_id", paciente.id);

    if (!rp?.length) { setLoading(false); return; }

    const ids = rp.map((r: any) => r.receita_id);
    const { data } = await supabase.from("receitas").select("*").in("id", ids);
    setReceitas((data as any) || []);

    // Mark all as visualizada
    const unread = rp.filter((r: any) => !r.visualizada).map((r: any) => r.receita_id);
    if (unread.length && !modoVisualizacao) {
      for (const rid of unread) {
        await supabase.from("receitas_pacientes")
          .update({ visualizada: true })
          .eq("receita_id", rid)
          .eq("paciente_id", paciente.id);
      }
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  if (selected) {
    const r = selected;
    const ingredientes = (r.ingredientes as any as Ingrediente[]) || [];
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-lg font-bold text-foreground">{r.titulo}</h2>
        {r.descricao && <p className="text-sm text-muted-foreground">{r.descricao}</p>}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {r.tempo_preparo_min && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.tempo_preparo_min} min</span>}
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.porcoes} porç.</span>
        </div>
        {r.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.tags.map(t => <Badge key={t} variant="outline" className="text-[10px] rounded-full px-2">{t}</Badge>)}
          </div>
        )}

        <div className="grid grid-cols-5 gap-2">
          {[
            { v: r.calorias_total, l: "Kcal" },
            { v: r.proteina_total, l: "Prot" },
            { v: r.carboidrato_total, l: "Carb" },
            { v: r.gordura_total, l: "Gord" },
            { v: r.fibra_total, l: "Fibra" },
          ].map(({ v, l }) => (
            <Card key={l} className="rounded-2xl text-center">
              <CardContent className="p-2">
                <p className="text-base font-bold text-primary">{v || 0}</p>
                <p className="text-[9px] text-muted-foreground">{l}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {ingredientes.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-1"><CardTitle className="text-sm">Ingredientes</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="space-y-1">
                {ingredientes.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {ing.quantidade && <span className="font-medium">{ing.quantidade}{ing.unidade}</span>}
                    <span>{ing.nome}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {r.modo_preparo && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-1"><CardTitle className="text-sm">Modo de Preparo</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-foreground whitespace-pre-wrap">{r.modo_preparo}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (receitas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="font-medium">Nenhuma receita recebida</p>
        <p className="text-sm mt-1">Suas receitas aparecerão aqui quando o nutricionista enviá-las.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Minhas Receitas</h2>
      {receitas.map(r => (
        <Card key={r.id} className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(r)}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{r.titulo}</p>
              <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                {r.tempo_preparo_min && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.tempo_preparo_min} min</span>}
                <span>{r.calorias_total} kcal</span>
                <span>{r.porcoes} porç.</span>
              </div>
              {r.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {r.tags.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[9px] rounded-full px-1.5 py-0">{t}</Badge>)}
                </div>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg] shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
