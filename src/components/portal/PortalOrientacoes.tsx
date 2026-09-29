import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIAS: Record<string, string> = {
  alimentacao: "Alimentação",
  hidratacao: "Hidratação",
  sono: "Sono",
  treino: "Treino",
  intestino: "Intestino",
  comportamento: "Comportamento",
  outro: "Outro",
};

interface Orientacao {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string | null;
  data_envio: string | null;
  created_at: string;
}

/**
 * Orientações que o nutri liberou (enviada = true). Antes elas eram
 * cadastradas na ficha, mas não apareciam em lugar nenhum do portal.
 */
export function PortalOrientacoes({ paciente }: { paciente: { id: string } }) {
  const [itens, setItens] = useState<Orientacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    supabase
      .from("orientacoes")
      .select("id, titulo, conteudo, categoria, data_envio, created_at")
      .eq("paciente_id", paciente.id)
      .eq("enviada", true)
      .order("data_envio", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (cancelado) return;
        const lista = (data as Orientacao[]) || [];
        setItens(lista);
        // A mais recente já abre: quem chega pelo e-mail quer ler a nova.
        setAberta(lista[0]?.id ?? null);
        setCarregando(false);
      });
    return () => { cancelado = true; };
  }, [paciente.id]);

  if (carregando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Orientações</h2>
        <p className="text-sm text-muted-foreground">O que combinamos para o seu dia a dia, fora do plano.</p>
      </div>

      {itens.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Nenhuma orientação por aqui ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {itens.map((o) => {
            const aberto = aberta === o.id;
            return (
              <Card key={o.id} className="overflow-hidden rounded-2xl">
                <button
                  onClick={() => setAberta(aberto ? null : o.id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  aria-expanded={aberto}
                >
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug text-foreground">{o.titulo}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      {o.categoria && (
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                          {CATEGORIAS[o.categoria] ?? o.categoria}
                        </Badge>
                      )}
                      <span>{format(new Date(o.data_envio ?? o.created_at), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                  {aberto
                    ? <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>
                {aberto && (
                  <CardContent className="border-t border-border px-4 pb-4 pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{o.conteudo}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
