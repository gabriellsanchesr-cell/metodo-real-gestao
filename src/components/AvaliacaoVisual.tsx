import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { montarAvaliacaoHtml, type AvaliacaoLinha, type FotoAvaliacao } from "@/lib/avaliacaoHtml";
import { baixarAvaliacaoHtml, carregarFotosDaAvaliacao } from "@/lib/avaliacaoArquivo";

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
 */
export function AvaliacaoVisual({ paciente, avaliacoes, avaliacaoId, onVoltar }: Props) {
  const [fotos, setFotos] = useState<FotoAvaliacao[] | null>(null);
  const [baixando, setBaixando] = useState(false);
  const atual = avaliacoes.find((a) => a.id === avaliacaoId);

  useEffect(() => {
    let cancelado = false;
    if (!atual) return;
    carregarFotosDaAvaliacao(paciente.id, atual.data_avaliacao.slice(0, 10))
      .then((f) => { if (!cancelado) setFotos(f); })
      .catch(() => { if (!cancelado) setFotos([]); });
    return () => { cancelado = true; };
  }, [paciente.id, atual]);

  const html = useMemo(
    () => (fotos ? montarAvaliacaoHtml({ paciente, avaliacoes, avaliacaoId, fotos }) : null),
    [paciente, avaliacoes, avaliacaoId, fotos],
  );

  const baixar = async () => {
    setBaixando(true);
    try { await baixarAvaliacaoHtml(paciente, avaliacoes, avaliacaoId); } finally { setBaixando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f3f5fa]">
      <div className="flex items-center justify-between gap-2 border-b bg-white px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onVoltar}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={baixar} disabled={baixando || !html}>
          {baixando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} Baixar
        </Button>
      </div>
      {html ? (
        <iframe title="Avaliação física" srcDoc={html} className="w-full flex-1 border-0" sandbox="allow-scripts allow-modals allow-popups" />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Montando a sua avaliação...</div>
      )}
    </div>
  );
}
