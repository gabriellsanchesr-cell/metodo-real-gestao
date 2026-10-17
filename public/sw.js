/*
 * Service worker do app Método R.E.A.L. Existe para o portal poder ser
 * instalado como aplicativo. Não guarda nada: sempre busca na rede, para o
 * paciente nunca ver plano ou dado velho depois de uma publicação. Sem
 * internet, as páginas mostram um aviso simples.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const SEM_CONEXAO = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Montserrat,Arial,sans-serif;background:#f2f4f8;color:#06101f;text-align:center;padding:24px">
<div><img src="/app/icon-192.png" width="72" height="72" alt="" style="border-radius:16px"><h1 style="font-size:20px">Sem conexão com a internet</h1>
<p style="color:#5b6273">Confira o Wi-Fi ou os dados móveis e tente de novo.</p>
<button onclick="location.reload()" style="background:#004AAD;color:#fff;border:0;border-radius:999px;padding:12px 24px;font-size:15px;font-weight:bold">Tentar de novo</button></div></body></html>`;

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // só páginas; o resto segue direto para a rede
  e.respondWith(fetch(e.request).catch(() => new Response(SEM_CONEXAO, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});

/* Avisos no celular (Web Push). A mensagem vem cifrada do servidor; o
 * navegador decifra e entrega aqui como JSON { titulo, corpo, url, tag }. */
self.addEventListener("push", (e) => {
  let aviso = {};
  try { aviso = e.data ? e.data.json() : {}; } catch (_) { aviso = { corpo: e.data && e.data.text() }; }
  const titulo = aviso.titulo || "Método R.E.A.L";
  e.waitUntil(self.registration.showNotification(titulo, {
    body: aviso.corpo || "",
    icon: "/app/icon-192.png",
    badge: "/app/icon-192.png",
    tag: aviso.tag || undefined,
    data: { url: aviso.url || "/portal" },
  }));
});

/* Tocar no aviso abre o app (ou a aba já aberta) na tela certa. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || "/portal", self.location.origin).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.startsWith(self.location.origin) && "focus" in c) {
        await c.focus();
        if ("navigate" in c) await c.navigate(destino);
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
