-- =====================================================================
-- Avisos por e-mail para pacientes + controle de vencimento do
-- acompanhamento.
--
-- Os avisos são disparados pela Edge Function `notificar-paciente`, que
-- grava cada tentativa em `notificacoes_email`. O vencimento é só
-- informativo dentro do sistema: nenhum e-mail é enviado por causa dele.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Contratos de acompanhamento (vencimento)
-- ---------------------------------------------------------------------
-- Um registro por período contratado. Renovar cria um registro novo em
-- vez de sobrescrever, para o histórico de renovações ficar preservado.
CREATE TABLE IF NOT EXISTS public.contratos_acompanhamento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id     uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  modalidade      text NOT NULL DEFAULT 'mensal'
                  CHECK (modalidade IN ('mensal', 'bimestral', 'trimestral', 'personalizado')),
  data_inicio     date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  valor           numeric(10,2),
  status          text NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo', 'renovado', 'encerrado')),
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vencimento_depois_do_inicio CHECK (data_vencimento >= data_inicio)
);

CREATE INDEX IF NOT EXISTS contratos_acompanhamento_paciente_idx
  ON public.contratos_acompanhamento (paciente_id, data_vencimento DESC);
CREATE INDEX IF NOT EXISTS contratos_acompanhamento_vencimento_idx
  ON public.contratos_acompanhamento (user_id, status, data_vencimento);

ALTER TABLE public.contratos_acompanhamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nutri gerencia contratos" ON public.contratos_acompanhamento;
CREATE POLICY "Nutri gerencia contratos"
  ON public.contratos_acompanhamento FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Equipe gerencia contratos" ON public.contratos_acompanhamento;
CREATE POLICY "Equipe gerencia contratos"
  ON public.contratos_acompanhamento FOR ALL TO authenticated
  USING (public.can_access_nutri_data(user_id))
  WITH CHECK (public.can_access_nutri_data(user_id));

CREATE OR REPLACE FUNCTION public.contratos_acompanhamento_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contratos_acompanhamento_touch ON public.contratos_acompanhamento;
CREATE TRIGGER contratos_acompanhamento_touch
  BEFORE UPDATE ON public.contratos_acompanhamento
  FOR EACH ROW EXECUTE FUNCTION public.contratos_acompanhamento_touch();


-- ---------------------------------------------------------------------
-- 2. Histórico de e-mails enviados às pacientes
-- ---------------------------------------------------------------------
-- Toda tentativa fica registrada, inclusive as que falharam ou que só
-- foram simuladas por falta de provedor configurado.
CREATE TABLE IF NOT EXISTS public.notificacoes_email (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id  uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  enviado_por  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo         text NOT NULL,
  assunto      text NOT NULL,
  destinatario text NOT NULL,
  status       text NOT NULL DEFAULT 'pendente'
               CHECK (status IN ('pendente', 'enviado', 'falhou', 'simulado', 'ignorado')),
  erro         text,
  provider_id  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notificacoes_email_paciente_idx
  ON public.notificacoes_email (paciente_id, created_at DESC);

ALTER TABLE public.notificacoes_email ENABLE ROW LEVEL SECURITY;

-- Só leitura pelo app. Quem grava é a Edge Function, com a chave de serviço.
DROP POLICY IF EXISTS "Nutri le historico de emails" ON public.notificacoes_email;
CREATE POLICY "Nutri le historico de emails"
  ON public.notificacoes_email FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_access_nutri_data(user_id));


-- ---------------------------------------------------------------------
-- 3. Preferências
-- ---------------------------------------------------------------------
-- Por paciente: permite desligar os avisos de alguém específico sem
-- desligar para todas.
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS receber_emails boolean NOT NULL DEFAULT true;

-- Da clínica: endereço para onde as respostas das pacientes vão, e com
-- quantos dias de antecedência o sistema começa a destacar um vencimento.
ALTER TABLE public.configuracoes_clinica
  ADD COLUMN IF NOT EXISTS email_resposta text,
  ADD COLUMN IF NOT EXISTS dias_alerta_vencimento integer NOT NULL DEFAULT 7
    CHECK (dias_alerta_vencimento BETWEEN 1 AND 60);
