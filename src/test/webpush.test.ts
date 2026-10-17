import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  b64urlParaBytes, bytesParaB64url, cabecalhoVapid, criptografar, hkdf,
} from "../../supabase/functions/enviar-push/webpush";

const enc = new TextEncoder();

async function parDeChaves() {
  const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  return { par, pub };
}

/** O que o celular faz ao receber (RFC 8291), para conferir a ida. */
async function decifrar(corpo: Uint8Array, uaPar: CryptoKeyPair, uaPub: Uint8Array, auth: Uint8Array): Promise<string> {
  const salt = corpo.slice(0, 16);
  const idlen = corpo[20];
  const asPub = corpo.slice(21, 21 + idlen);
  const cifrado = corpo.slice(21 + idlen);
  const asChave = await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asChave }, uaPar.privateKey, 256));
  const info = new Uint8Array([...enc.encode("WebPush: info\0"), ...uaPub, ...asPub]);
  const ikm = await hkdf(auth, shared, info, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const claro = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, k, cifrado));
  expect(claro[claro.length - 1]).toBe(2); // delimitador do último registro
  return new TextDecoder().decode(claro.slice(0, -1));
}

describe("web push", () => {
  it("base64url ida e volta", () => {
    const b = crypto.getRandomValues(new Uint8Array(65));
    expect(b64urlParaBytes(bytesParaB64url(b))).toEqual(b);
  });

  it("criptografa de um jeito que o aparelho consegue abrir", async () => {
    const { par, pub } = await parDeChaves();
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const msg = JSON.stringify({ titulo: "Seu check-in da semana", corpo: "Leva 3 minutos.", url: "/portal?aba=checkin" });
    const corpo = await criptografar({ endpoint: "https://x", p256dh: bytesParaB64url(pub), auth: bytesParaB64url(auth) }, enc.encode(msg));
    expect(new DataView(corpo.buffer, corpo.byteOffset).getUint32(16)).toBe(4096);
    expect(await decifrar(corpo, par, pub, auth)).toBe(msg);
  });

  it("assina o VAPID com ES256 que confere com a chave pública", async () => {
    const vapid = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey("jwk", vapid.privateKey);
    const pub = bytesParaB64url(new Uint8Array(await crypto.subtle.exportKey("raw", vapid.publicKey)));
    const cab = await cabecalhoVapid("https://fcm.googleapis.com/fcm/send/abc", pub, jwk.d!, "mailto:teste@exemplo.com");
    const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/.exec(cab)!;
    expect(k).toBe(pub);
    const [h, c, s] = jwt.split(".");
    expect(JSON.parse(new TextDecoder().decode(b64urlParaBytes(c))).aud).toBe("https://fcm.googleapis.com");
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, vapid.publicKey, b64urlParaBytes(s), enc.encode(`${h}.${c}`));
    expect(ok).toBe(true);
  });

  it("as cópias nas outras funções são idênticas", () => {
    const original = readFileSync("supabase/functions/enviar-push/webpush.ts", "utf8");
    for (const f of ["notificar-paciente", "lembrete-peso-semanal"]) {
      expect(readFileSync(`supabase/functions/${f}/webpush.ts`, "utf8")).toBe(original);
    }
  });
});
