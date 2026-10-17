/**
 * Notificação no celular (Web Push), sem biblioteca e sem provedor pago.
 *
 * Implementa o que o padrão pede: assinatura VAPID (RFC 8292, JWT ES256) e
 * criptografia da mensagem aes128gcm (RFC 8291), só com WebCrypto. Roda no
 * Deno (Edge Functions) e no Node (testes).
 *
 * Esta pasta tem o original. notificar-paciente e lembrete-peso-semanal têm
 * cópias idênticas (o empacotador do Lovable não aceita import de outra
 * pasta); src/test/webpush.test.ts falha se elas divergirem.
 *
 * Segredos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (base64url) e, opcional,
 * VAPID_SUBJECT (mailto:...).
 */

export interface Inscricao {
  endpoint: string;
  p256dh: string; // base64url, chave pública do aparelho (65 bytes)
  auth: string; // base64url, segredo do aparelho (16 bytes)
}

export interface AvisoPush {
  titulo: string;
  corpo: string;
  /** Caminho no app, ex. "/portal?aba=checkin". */
  url?: string;
  /** Avisos com a mesma tag se substituem no celular. */
  tag?: string;
}

const enc = new TextEncoder();

export function b64urlParaBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function bytesParaB64url(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function juntar(...partes: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) { out.set(p, i); i += p.length; }
  return out;
}

async function hmac(chave: Uint8Array, dados: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", chave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, dados));
}

/** HKDF com uma rodada de expansão (até 32 bytes), como o RFC 8291 usa. */
export async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, tamanho: number): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, juntar(info, new Uint8Array([1])))).slice(0, tamanho);
}

/**
 * Criptografa a mensagem para um aparelho (aes128gcm). `chaveLocal` e `salt`
 * só são passados nos testes; no uso normal são aleatórios a cada envio.
 */
export async function criptografar(
  inscricao: Inscricao,
  mensagem: Uint8Array,
  teste?: { chaveLocal: CryptoKeyPair; salt: Uint8Array },
): Promise<Uint8Array> {
  const uaPublica = b64urlParaBytes(inscricao.p256dh);
  const segredo = b64urlParaBytes(inscricao.auth);
  const local = teste?.chaveLocal ?? await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPublica = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaChave = await crypto.subtle.importKey("raw", uaPublica, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartilhado = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaChave }, local.privateKey, 256));

  const ikm = await hkdf(segredo, compartilhado, juntar(enc.encode("WebPush: info\0"), uaPublica, asPublica), 32);
  const salt = teste?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const chave = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, chave, juntar(mensagem, new Uint8Array([2]))));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return juntar(salt, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

/** Cabeçalho Authorization do VAPID (JWT ES256 assinado com a chave privada do servidor). */
export async function cabecalhoVapid(endpoint: string, publica: string, privada: string, assunto: string): Promise<string> {
  const pub = b64urlParaBytes(publica);
  const jwk: JsonWebKey = {
    kty: "EC", crv: "P-256", d: privada,
    x: bytesParaB64url(pub.slice(1, 33)), y: bytesParaB64url(pub.slice(33, 65)), ext: true,
  };
  const chave = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const cab = bytesParaB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corpo = bytesParaB64url(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: assunto,
  })));
  const assinatura = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, enc.encode(`${cab}.${corpo}`)));
  return `vapid t=${cab}.${corpo}.${bytesParaB64url(assinatura)}, k=${publica}`;
}

export interface ChavesVapid { publica: string; privada: string; assunto: string }

/** Lê as chaves dos segredos da função. Null quando ainda não foram cadastradas. */
export function chavesVapidDoAmbiente(env: { get(k: string): string | undefined }): ChavesVapid | null {
  const publica = env.get("VAPID_PUBLIC_KEY"), privada = env.get("VAPID_PRIVATE_KEY");
  if (!publica || !privada) return null;
  return { publica, privada, assunto: env.get("VAPID_SUBJECT") || "mailto:gabriellsanchesr@gmail.com" };
}

/** Envia para um aparelho. Devolve o status HTTP (404/410 = inscrição morta). */
export async function enviarPush(inscricao: Inscricao, aviso: AvisoPush, chaves: ChavesVapid): Promise<number> {
  const corpo = await criptografar(inscricao, enc.encode(JSON.stringify(aviso)));
  const res = await fetch(inscricao.endpoint, {
    method: "POST",
    headers: {
      Authorization: await cabecalhoVapid(inscricao.endpoint, chaves.publica, chaves.privada, chaves.assunto),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(24 * 60 * 60),
      Urgency: "normal",
    },
    body: corpo,
  });
  return res.status;
}

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClienteAdmin = any;

/**
 * Manda o aviso para todos os aparelhos da paciente (tabela push_inscricoes)
 * e apaga as inscrições que o serviço do celular diz que não existem mais.
 * Nunca lança erro: push é complemento do e-mail, não pode derrubar o envio.
 */
export async function enviarPushParaPaciente(admin: ClienteAdmin, pacienteId: string, aviso: AvisoPush, chaves: ChavesVapid | null): Promise<number> {
  if (!chaves) return 0;
  try {
    const { data } = await admin.from("push_inscricoes").select("id, endpoint, p256dh, auth").eq("paciente_id", pacienteId);
    let enviados = 0;
    for (const i of (data || []) as (Inscricao & { id: string })[]) {
      try {
        const status = await enviarPush(i, aviso, chaves);
        if (status === 404 || status === 410) await admin.from("push_inscricoes").delete().eq("id", i.id);
        else if (status < 300) enviados++;
      } catch (e) {
        console.error("push falhou", e);
      }
    }
    return enviados;
  } catch (e) {
    console.error("push indisponível", e);
    return 0;
  }
}
