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
