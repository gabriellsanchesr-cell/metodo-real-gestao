import { supabase } from "@/integrations/supabase/client";
import { BUCKET_CONTEUDOS } from "@/lib/fases";

/**
 * Abre o PDF da biblioteca numa aba nova, por URL assinada de 1 hora.
 * A aba é aberta antes da chamada: no iPhone, abrir depois de um await é
 * bloqueado como pop-up.
 */
export async function abrirArquivoConteudo(path: string): Promise<boolean> {
  const aba = window.open("", "_blank");
  const { data, error } = await supabase.storage.from(BUCKET_CONTEUDOS).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    aba?.close();
    return false;
  }
  if (aba) aba.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
  return true;
}
