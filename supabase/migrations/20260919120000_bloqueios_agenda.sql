-- =====================================================================
-- Bloqueios de horário da agenda em tabela própria.
--
-- Antes, cada bloqueio era gravado como uma CONSULTA cancelada presa à
-- primeira paciente da lista (paciente_id "placeholder"), com a anotação
-- "🚫 BLOQUEIO: motivo". O resto do sistema (ficha, portal, Dashboard,
-- Relatórios) enxergava isso como consulta real daquela paciente, e as
-- visões de mês e semana da Agenda mostravam o nome dela no bloqueio.
--
-- Pode ser aplicada mais de uma vez sem efeito colateral.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.bloqueios_agenda (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inicio      timestamptz NOT NULL,
  fim         timestamptz NOT NULL,
  motivo      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bloqueio_fim_depois_do_inicio CHECK (fim > inicio)
);

CREATE INDEX IF NOT EXISTS bloqueios_agenda_periodo_idx
  ON public.bloqueios_agenda (user_id, inicio);

ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nutri gerencia bloqueios" ON public.bloqueios_agenda;
CREATE POLICY "Nutri gerencia bloqueios"
  ON public.bloqueios_agenda FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Equipe gerencia bloqueios" ON public.bloqueios_agenda;
CREATE POLICY "Equipe gerencia bloqueios"
  ON public.bloqueios_agenda FOR ALL TO authenticated
  USING (public.can_access_nutri_data(user_id))
  WITH CHECK (public.can_access_nutri_data(user_id));


-- ---------------------------------------------------------------------
-- Legado: move os bloqueios que ainda estão disfarçados de consulta.
-- Um bloco só, para copiar e remover acontecerem juntos ou não acontecerem.
-- O formato antigo não guardava o fim; assume uma hora de duração.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.bloqueios_agenda (user_id, inicio, fim, motivo, created_at)
  SELECT c.user_id,
         c.data_hora,
         c.data_hora + interval '1 hour',
         NULLIF(btrim(replace(c.anotacoes, '🚫 BLOQUEIO:', '')), ''),
         c.created_at
    FROM public.consultas c
   WHERE c.status = 'cancelado'
     AND c.anotacoes LIKE '🚫 BLOQUEIO:%';

  DELETE FROM public.consultas c
   WHERE c.status = 'cancelado'
     AND c.anotacoes LIKE '🚫 BLOQUEIO:%';
END $$;
