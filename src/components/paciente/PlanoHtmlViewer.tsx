import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Maximize2 } from "lucide-react";

interface Props {
  /** Caminho do .html no bucket documentos-pdf. */
  path: string;
  titulo?: string;
  /** Distância do topo da tela que a página deve respeitar ao rolar (cabeçalho fixo). */
  offsetTopo?: number;
}

/**
 * Mostra o plano HTML da engine dentro do portal.
 *
 * Segurança: o arquivo roda num iframe com sandbox="allow-scripts" e sem
 * allow-same-origin. As animações funcionam, mas o script do plano não
 * enxerga a sessão, o localStorage nem o banco do portal.
 *
 * Altura: o próprio plano avisa a altura por postMessage
 * ({ tipo: "plano-real:altura" }) e o iframe cresce junto, então a página
 * do portal rola uma vez só, sem barra de rolagem dentro de barra de rolagem.
 */
export function PlanoHtmlViewer({ path, titulo = "Plano alimentar", offsetTopo = 72 }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [altura, setAltura] = useState(900);
  const [telaCheia, setTelaCheia] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let vivo = true;
    setHtml(null);
    setErro(false);
    supabase.storage.from("documentos-pdf").download(path).then(async ({ data, error }) => {
      if (!vivo) return;
      if (error || !data) { setErro(true); return; }
      setHtml(await data.text());
    });
    return () => { vivo = false; };
  }, [path]);

  useEffect(() => {
    const ouvir = (e: MessageEvent) => {
      // Só aceita mensagem do iframe deste plano.
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const msg = e.data as { tipo?: string; altura?: number; y?: number };
      if (msg?.tipo === "plano-real:altura" && typeof msg.altura === "number" && msg.altura > 0) {
        setAltura(Math.min(Math.ceil(msg.altura), 60000));
      } else if (msg?.tipo === "plano-real:rolar" && typeof msg.y === "number") {
        const topo = frame.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: topo + msg.y - offsetTopo, behavior: "smooth" });
      }
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [offsetTopo]);

  if (erro) {
    return <div className="py-10 text-center text-sm text-destructive">Não consegui abrir o plano.</div>;
  }
  if (!html) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando plano...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setTelaCheia(true)}
          className="flex items-center gap-1 text-xs text-primary underline"
        >
          <Maximize2 className="h-3 w-3" /> Tela cheia
        </button>
      </div>
      <iframe
        ref={frame}
        title={titulo}
        srcDoc={html}
        sandbox="allow-scripts"
        className="block w-full rounded-2xl border-0 bg-transparent"
        style={{ height: altura }}
      />
      <Dialog open={telaCheia} onOpenChange={setTelaCheia}>
        <DialogContent className="h-[100dvh] max-w-none w-screen p-0 sm:rounded-none border-0 overflow-hidden">
          <DialogTitle className="sr-only">{titulo}</DialogTitle>
          {/* Em tela cheia o plano rola por dentro: o menu do dia fica fixo no topo. */}
          <iframe title={titulo} srcDoc={html} sandbox="allow-scripts" className="h-full w-full border-0" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
