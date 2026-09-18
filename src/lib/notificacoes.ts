/**
 * Avisos por e-mail para a paciente.
 *
 * Quem monta e envia o e-mail é a Edge Function `notificar-paciente`. Aqui
 * só se escolhe o tipo e se passa o mínimo de dados; o texto não sai daqui.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TipoAviso =
  | "plano_novo"
  | "plano_atualizado"
  | "consulta_agendada"
  | "consulta_remarcada"
  | "consulta_cancelada"
  | "orientacao_nova"
  | "material_novo"
  | "receita_nova"
  | "conteudo_liberado"
  | "meta_nova"
  | "feedback_diario"
  | "questionario_enviado"
  | "avaliacao_registrada"
  | "exame_registrado";

export const ROTULO_TIPO: Record<TipoAviso, string> = {
  plano_novo: "Plano novo",
  plano_atualizado: "Plano atualizado",
  consulta_agendada: "Consulta agendada",
  consulta_remarcada: "Consulta remarcada",
  consulta_cancelada: "Consulta cancelada",
  orientacao_nova: "Orientação",
  material_novo: "Material extra",
  receita_nova: "Receita",
  conteudo_liberado: "Conteúdo R.E.A.L.",
  meta_nova: "Meta",
  feedback_diario: "Retorno no diário",
  questionario_enviado: "Questionário",
  avaliacao_registrada: "Avaliação física",
  exame_registrado: "Exames",
};

export interface DadosAviso {
  titulo?: string | null;
  data?: string | null;
  token?: string | null;
}

export type ResultadoAviso = "enviado" | "simulado" | "ignorado" | "falhou";

const MENSAGENS: Record<ResultadoAviso, { titulo: string; descricao?: string; erro?: boolean }> = {
  enviado: { titulo: "Paciente avisada por e-mail" },
  simulado: {
    titulo: "Aviso registrado, mas não enviado",
    descricao: "O e-mail ainda não está configurado. O aviso ficou no histórico da paciente.",
  },
  ignorado: { titulo: "Aviso não enviado" },
  falhou: { titulo: "Não consegui avisar a paciente", erro: true },
};

const MOTIVOS: Record<string, string> = {
  desligado: "Os avisos por e-mail estão desligados para esta paciente.",
  duplicado: "Um aviso igual acabou de ser enviado.",
  sem_email: "A paciente não tem e-mail válido no cadastro.",
  provedor: "O serviço de e-mail recusou o envio. Veja o histórico da paciente.",
};

/**
 * Dispara o aviso. Nunca lança: a ação principal (salvar o plano, agendar a
 * consulta) já aconteceu, e uma falha no e-mail não pode parecer falha nela.
 */
export async function avisarPaciente(
  pacienteId: string,
  tipo: TipoAviso,
  dados: DadosAviso = {},
  opcoes: { silencioso?: boolean } = {},
): Promise<ResultadoAviso> {
  let resultado: ResultadoAviso = "falhou";
  let motivo: string | undefined;

  try {
    const { data, error } = await supabase.functions.invoke("notificar-paciente", {
      body: { paciente_id: pacienteId, tipo, dados },
    });
    if (error) throw error;
    resultado = (data?.status as ResultadoAviso) ?? "falhou";
    motivo = data?.motivo;
  } catch (e) {
    console.warn("avisarPaciente falhou", e);
    resultado = "falhou";
  }

  if (!opcoes.silencioso) {
    const m = MENSAGENS[resultado];
    toast({
      title: m.titulo,
      description: (motivo && MOTIVOS[motivo]) || m.descricao,
      variant: m.erro ? "destructive" : undefined,
    });
  }
  return resultado;
}

/** Se o provedor de e-mail está pronto para enviar de verdade. */
export async function statusEmail(): Promise<{ configurado: boolean } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("notificar-paciente", {
      body: { acao: "status" },
    });
    if (error) return null;
    return { configurado: Boolean(data?.configurado) };
  } catch {
    return null;
  }
}
