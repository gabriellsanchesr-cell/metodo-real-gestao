/**
 * Reduz a foto antes de enviar: foto de celular tem de 3 a 8 MB, e para
 * comparar evolução 1600 px no lado maior sobram. Sai em JPEG.
 * Se o navegador não conseguir ler a imagem (HEIC em alguns Android),
 * devolve o arquivo original.
 */
export async function reduzirImagem(arquivo: File, ladoMaximo = 1600, qualidade = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
    return blob && blob.size < arquivo.size ? blob : arquivo;
  } catch {
    return arquivo;
  }
}
