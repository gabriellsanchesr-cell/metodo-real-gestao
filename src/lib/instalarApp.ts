/**
 * Instalação do portal como app (PWA). O Chrome no Android avisa com o evento
 * beforeinstallprompt, que precisa ser guardado logo no carregamento; o
 * Safari do iPhone não tem botão automático, só o passo a passo manual.
 */
export interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let eventoGuardado: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoGuardado = e as EventoInstalar;
    ouvintes.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    eventoGuardado = null;
    ouvintes.forEach((f) => f());
  });
}

export const podeInstalarDireto = () => eventoGuardado !== null;

export function aoMudarInstalacao(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export async function abrirInstalacao(): Promise<boolean> {
  if (!eventoGuardado) return false;
  await eventoGuardado.prompt();
  const { outcome } = await eventoGuardado.userChoice;
  eventoGuardado = null;
  return outcome === "accepted";
}

/** Já está aberto como app instalado? */
export function rodandoComoApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function ehIphone(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
