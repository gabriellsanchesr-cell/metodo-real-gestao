import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { montarAvaliacaoHtml, type AvaliacaoLinha, type FotoAvaliacao } from "@/lib/avaliacaoHtml";
import { baixarAvaliacaoHtml, carregarFotosDaAvaliacao } from "@/lib/avaliacaoArquivo";
import { formatarData } from "@/lib/vencimento";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paciente: any;
  avaliacoes: AvaliacaoLinha[];
  avaliacaoId: string;
  onVoltar: () => void;
}

/**
 * Avaliação física no visual do feedback físico, em tela cheia. Usada no
 * portal (paciente) e na ficha (nutri, para ver como a paciente vê).
 * No topo: qual avaliação ver e com qual anterior comparar (padrão: a primeira).
 */
export function AvaliacaoVisual({ paciente, avaliacoes, avaliacaoId, onVoltar }: Props) {
  const [fotos, setFotos] = useState<FotoAvaliacao[] | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [atualId, setAtualId] = useState(avaliacaoId);
  const [comparacaoId, setComparacaoId] = useState<string | null>(null);

  const ordenadas = useMemo(
    () => [...avaliacoes].filter((a) => a.id).sort((a, b) => b.data_avaliacao.localeCompare(a.data_avaliacao)),
    [avaliacoes],
  );
  const atual = ordenadas.find((a) => a.id === atualId) ?? ordenadas[0];
  const anteriores = ordenadas.filter((a) => atual && a.data_avaliacao < atual.data_avaliacao);
  // Comparação escolhida só vale se for anterior à avaliação vista; senão, a primeira.
  const base = anteriores.find((a) => a.id === comparacaoId) ?? anteriores[anteriores.length - 1] ?? null;

  useEffect(() => {
    let cancelado = false;
    if (!atual) return;
    setFotos(null);
    carregarFotosDaAvaliacao(paciente.id, atual.data_avaliacao.slice(0, 10))
      .then((f) => { if (!cancelado) setFotos(f); })
      .catch(() => { if (!cancelado) setFotos([]); });
    return () => { cancelado = true; };
  }, [paciente.id, atual]);

  const html = useMemo(
    () => (fotos && atual ? montarAvaliacaoHtml({ paciente, avaliacoes, avaliacaoId: atual.id, comparacaoId: base?.id ?? null, fotos }) : null),
    [paciente, avaliacoes, atual, base, fotos],
  );

  const baixar = async () => {
    if (!atual?.id) return;
    setBaixando(true);
    try { await baixarAvaliacaoHtml(paciente, avaliacoes, atual.id, base?.id ?? null); } finally { setBaixando(false); }
  };

  const rotulo = (a: AvaliacaoLinha) => formatarData(a.data_avaliacao);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f3f5fa]">
      <div className="border-b bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onVoltar}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={baixar} disabled={baixando || !html}>
            {baixando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} Baixar
          </Button>
        </div>
        {ordenadas.length > 1 && (
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avaliação</span>
              <Select value={atual?.id} onValueChange={(v) => { setAtualId(v); setComparacaoId(null); }}>
                <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ordenadas.map((a, i) => <SelectItem key={a.id} value={a.id!}>{rotulo(a)}{i === 0 ? " (mais recente)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Comparar com</span>
              <Select value={base?.id ?? "nenhuma"} onValueChange={setComparacaoId} disabled={anteriores.length === 0}>
                <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue placeholder="Sem anterior" /></SelectTrigger>
                <SelectContent>
                  {anteriores.length === 0 && <SelectItem value="nenhuma">Sem avaliação anterior</SelectItem>}
                  {anteriores.map((a, i) => (
                    <SelectItem key={a.id} value={a.id!}>
                      {rotulo(a)}{i === anteriores.length - 1 ? " (primeira)" : i === 0 ? " (anterior)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        )}
      </div>
      {html ? (
        <iframe key={`${atual?.id}-${base?.id}`} title="Avaliação física" srcDoc={html} className="w-full flex-1 border-0" sandbox="allow-scripts allow-modals allow-popups" />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Montando a avaliação...</div>
      )}
    </div>
  );
}
