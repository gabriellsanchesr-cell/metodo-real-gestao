/**
 * Avisos no celular (Web Push) do lado do app: pedir permissão, inscrever o
 * aparelho e guardar em push_inscricoes (migration 20261017120000).
 *
 * No iPhone só funciona com o portal instalado na tela de início (iOS 16.4+).
 * No Android funciona também pelo Chrome, sem instalar.
 */
import { supabase } from "@/integrations/supabase/client";
import { ehIphone, rodandoComoApp } from "@/lib/instalarApp";

/** Chave pública VAPID (pode ficar no código; a privada é segredo das funções). */
export const VAPID_PUBLICA = "BOyWKs6Cd8Uev7Sg0kq5oqEY8fRj_Ip-v7WgUYkGIj4VxeYQdbo_P6EYJ66nx8ctYUbE9SulYEgBYeEH6mkQM4Q";

export type EstadoPush = "indisponivel" | "precisa-instalar" | "bloqueado" | "desligado" | "ligado";

function suportado(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function chaveParaBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function registro(): Promise<ServiceWorkerRegistration | null> {
  if (!suportado()) return null;
  return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js"));
}

export async function estadoDosAvisos(): Promise<EstadoPush> {
  if (!suportado()) return ehIphone() && !rodandoComoApp() ? "precisa-instalar" : "indisponivel";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await registro();
  const inscricao = await reg?.pushManager.getSubscription();
  return inscricao && Notification.permission === "granted" ? "ligado" : "desligado";
}

/** Pede permissão, inscreve o aparelho e grava. Precisa vir de um toque do usuário. */
export async function ativarAvisos(pacienteId: string): Promise<EstadoPush> {
  if (!suportado()) return estadoDosAvisos();
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "desligado";
  const reg = await registro();
  if (!reg) return "indisponivel";
  await navigator.serviceWorker.ready;
  const inscricao = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(VAPID_PUBLICA) }));
  const j = inscricao.toJSON();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("push_inscricoes").upsert({
    paciente_id: pacienteId,
    endpoint: inscricao.endpoint,
    p256dh: j.keys?.p256dh,
    auth: j.keys?.auth,
    aparelho: navigator.userAgent.slice(0, 200),
  }, { onConflict: "endpoint" });
  if (error) throw error;
  return "ligado";
}

export async function desativarAvisos(): Promise<void> {
  const reg = await registro();
  const inscricao = await reg?.pushManager.getSubscription();
  if (!inscricao) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("push_inscricoes").delete().eq("endpoint", inscricao.endpoint);
  await inscricao.unsubscribe();
}

/** Nutri: avisa no celular da paciente (usado pelo chat). Falha em silêncio. */
export function avisarNoCelular(pacienteId: string, titulo: string, corpo: string, url = "/portal"): void {
  supabase.functions.invoke("enviar-push", { body: { paciente_id: pacienteId, titulo, corpo, url, tag: "chat" } }).catch(() => {});
}
