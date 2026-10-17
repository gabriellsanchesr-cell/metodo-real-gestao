/**
 * Fotos e arquivo .html da avaliação no visual do feedback físico
 * (montarAvaliacaoHtml). Usado pelo portal e pela ficha do nutri.
 */
import { supabase } from "@/integrations/supabase/client";
import { montarAvaliacaoHtml, type AvaliacaoLinha, type FotoAvaliacao } from "@/lib/avaliacaoHtml";

const BUCKET = "evolucao-fotos";

/** Fotos de evolução até a data da avaliação. `embutir` troca as URLs por data: (arquivo que abre offline). */
export async function carregarFotosDaAvaliacao(pacienteId: string, ate: string, embutir = false): Promise<FotoAvaliacao[]> {
  const { data } = await supabase
    .from("evolucao_fotos")
    .select("angulo, data_registro, foto_path")
    .eq("paciente_id", pacienteId)
    .lte("data_registro", ate)
    .order("data_registro");
  const lista = (data || []).filter((f) => f.foto_path);
  if (!lista.length) return [];
  const { data: assinadas } = await supabase.storage.from(BUCKET).createSignedUrls(lista.map((f) => f.foto_path), 3600);
  const url = new Map((assinadas || []).map((a) => [a.path, a.signedUrl]));
  const fotos: FotoAvaliacao[] = [];
  for (const f of lista) {
    let u = url.get(f.foto_path);
    if (!u) continue;
    if (embutir) {
      try {
        const blob = await (await fetch(u)).blob();
        u = await new Promise<string>((ok, erro) => {
          const r = new FileReader();
          r.onload = () => ok(String(r.result));
          r.onerror = erro;
          r.readAsDataURL(blob);
        });
      } catch { continue; }
    }
    fotos.push({ angulo: f.angulo, data: String(f.data_registro).slice(0, 10), url: u });
  }
  return fotos;
}

/** Baixa o material da avaliação como .html (com fotos embutidas e botão "Salvar em PDF"). */
export async function baixarAvaliacaoHtml(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paciente: any, avaliacoes: AvaliacaoLinha[], avaliacaoId: string,
): Promise<void> {
  const atual = avaliacoes.find((a) => a.id === avaliacaoId);
  const fotos = atual ? await carregarFotosDaAvaliacao(paciente.id, atual.data_avaliacao.slice(0, 10), true) : [];
  const html = montarAvaliacaoHtml({ paciente, avaliacoes, avaliacaoId, fotos, comBotaoPdf: true });
  const nome = String(paciente.nome_completo || "paciente").trim().replace(/\s+/g, "-");
  const data = atual?.data_avaliacao.slice(0, 10) ?? "";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  a.download = `Avaliacao-Fisica-${nome}-${data}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

