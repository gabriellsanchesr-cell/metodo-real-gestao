import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, MoreVertical, Share, SquarePlus, Smartphone, X } from "lucide-react";
import { usePortalModo } from "@/contexts/PortalModoContext";
import { abrirInstalacao, aoMudarInstalacao, ehIphone, podeInstalarDireto, rodandoComoApp } from "@/lib/instalarApp";

const CHAVE_ADIADO = "instalarAppAdiado";
const QUATORZE_DIAS = 14 * 24 * 60 * 60 * 1000;

function adiadoRecentemente(): boolean {
  try {
    const t = Number(localStorage.getItem(CHAVE_ADIADO));
    return t > 0 && Date.now() - t < QUATORZE_DIAS;
  } catch {
    return false;
  }
}

/**
 * Convite para instalar o portal como app. No Android abre a instalação do
 * Chrome; no iPhone mostra o passo a passo (o Safari não tem botão
 * automático). Some quando já está instalado.
 *
 * variante "card": aviso na Início, com "Agora não" (volta em 14 dias).
 * variante "item": botão fixo, para o menu ou o perfil.
 */
export function InstalarApp({ variante = "card" }: { variante?: "card" | "item" }) {
  const { modoVisualizacao } = usePortalModo();
  const [, forcar] = useState(0);
  const [adiado, setAdiado] = useState(adiadoRecentemente);
  const [passoAPasso, setPassoAPasso] = useState(false);

  useEffect(() => aoMudarInstalacao(() => forcar((n) => n + 1)), []);

  if (modoVisualizacao || rodandoComoApp()) return null;
  const direto = podeInstalarDireto();
  const celular = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  if (variante === "card" && (adiado || (!direto && !celular))) return null;

  const instalar = async () => {
    if (direto) {
      await abrirInstalacao();
      forcar((n) => n + 1);
      return;
    }
    setPassoAPasso(true);
  };

  const agoraNao = () => {
    try { localStorage.setItem(CHAVE_ADIADO, String(Date.now())); } catch { /* opcional */ }
    setAdiado(true);
  };

  const iphone = ehIphone();

  return (
    <>
      {variante === "card" ? (
        <Card className="rounded-2xl border-primary/20">
          <CardContent className="flex items-center gap-3 p-4">
            <img src="/app/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl border" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug text-foreground">Tenha o portal como app</p>
              <p className="text-xs text-muted-foreground">Um ícone na tela do celular, sem precisar procurar o link.</p>
            </div>
            <Button size="sm" className="shrink-0 rounded-xl" onClick={instalar}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Instalar
            </Button>
            <button type="button" onClick={agoraNao} aria-label="Agora não" className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full justify-start rounded-xl" onClick={instalar}>
          <Smartphone className="mr-2 h-4 w-4" /> Instalar o app no celular
        </Button>
      )}

      <Dialog open={passoAPasso} onOpenChange={setPassoAPasso}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <img src="/app/icon-192.png" alt="" className="mx-auto mb-2 h-14 w-14 rounded-2xl border" />
            <DialogTitle className="text-center">Instalar o app</DialogTitle>
            <DialogDescription className="text-center">
              {iphone ? "No iPhone, pelo Safari, são dois toques:" : "No navegador do celular:"}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            {iphone ? (
              <>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Share className="h-4 w-4 text-primary" /></span>
                  <span>Toque em <strong>Compartilhar</strong>, o quadrado com a seta para cima, na barra do Safari.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><SquarePlus className="h-4 w-4 text-primary" /></span>
                  <span>Role e toque em <strong>Adicionar à Tela de Início</strong>, depois em <strong>Adicionar</strong>.</span>
                </li>
                <li className="text-xs text-muted-foreground">Se abriu pelo Instagram ou WhatsApp, abra antes no Safari: toque nos três pontinhos e em "Abrir no navegador".</li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><MoreVertical className="h-4 w-4 text-primary" /></span>
                  <span>Toque no menu do navegador, os <strong>três pontinhos</strong> no canto de cima.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><SquarePlus className="h-4 w-4 text-primary" /></span>
                  <span>Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</span>
                </li>
              </>
            )}
          </ol>
          <Button className="w-full rounded-xl" onClick={() => setPassoAPasso(false)}>Entendi</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
