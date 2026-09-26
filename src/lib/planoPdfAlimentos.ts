/**
 * Alimentos do PDF anexado, lidos para a calculadora de substituições do
 * portal. O PDF continua sendo o que a paciente vê; esta lista só serve para
 * a calculadora já mostrar os alimentos do plano.
 */
import { supabase } from "@/integrations/supabase/client";
import { LISTA_ALIMENTOS, type AlimentoReferenciaPdf } from "@/lib/substituicoes";
import { faltaMigration } from "@/lib/contratosApi";

export async function blobParaBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binario = "";
  const bloco = 0x8000;
  for (let i = 0; i < bytes.length; i += bloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloco));
  }
  return btoa(binario);
}

/** Nomes da lista da calculadora, que a leitura do PDF usa para casar os alimentos. */
export function catalogoSubstituicoes(): string[] {
  return [...new Set(LISTA_ALIMENTOS.map((a) => a.nome))];
}

export type ResultadoSalvar = "ok" | "sem_migration";

/** Grava a lista no plano. Sem a coluna no banco, avisa em vez de quebrar o anexo. */
export async function salvarAlimentosReferencia(
  planoId: string,
  alimentos: AlimentoReferenciaPdf[],
): Promise<ResultadoSalvar> {
  const { error } = await supabase
    .from("planos_alimentares")
    .update({ alimentos_referencia: alimentos } as never)
    .eq("id", planoId);
  if (!error) return "ok";
  if (faltaMigration(error)) return "sem_migration";
  throw error;
}

/**
 * Relê um PDF já anexado (planos enviados antes desta função existir) e
 * grava os alimentos. Não mexe nos totais, que o nutri pode ter conferido.
 */
export async function lerAlimentosDoPdfAnexado(
  planoId: string,
  pdfPath: string,
): Promise<{ resultado: ResultadoSalvar; total: number; comPar: number }> {
  const { data: arquivo, error: dlErr } = await supabase.storage.from("documentos-pdf").download(pdfPath);
  if (dlErr || !arquivo) throw dlErr ?? new Error("Não consegui baixar o PDF.");

  const { data, error } = await supabase.functions.invoke("parse-plano-pdf-totais", {
    body: { fileBase64: await blobParaBase64(arquivo), mimeType: "application/pdf", catalogo: catalogoSubstituicoes() },
  });
  if (error) throw error;
  // A versão antiga da função devolve só os totais. Gravar [] marcaria o
  // plano como "lido, sem alimentos", então é melhor parar e avisar.
  if (!data || !("alimentos" in data)) {
    throw new Error("A função parse-plano-pdf-totais publicada ainda é a versão antiga. Republique pelo Lovable e tente de novo.");
  }

  const alimentos: AlimentoReferenciaPdf[] = Array.isArray(data?.alimentos) ? data.alimentos : [];
  const resultado = await salvarAlimentosReferencia(planoId, alimentos);
  return { resultado, total: alimentos.length, comPar: alimentos.filter((a) => a.correspondente).length };
}
