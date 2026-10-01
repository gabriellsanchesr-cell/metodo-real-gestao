-- =====================================================================
-- Peso lançado pela paciente no portal + lembrete semanal por e-mail.
--
-- 1) A paciente com portal liberado pode registrar o próprio peso
--    (acompanhamentos). Antes só o nutri gravava, e o card "Sem peso na
--    semana" do painel contava quase todas.
-- 2) Liga/desliga do lembrete em configuracoes_clinica (vem ligado).
-- 3) Agendamento: todo sábado às 12:00 UTC (9h em Brasília) chama a Edge
--    Function lembrete-peso-semanal. Usa a chave pública do projeto (a
--    mesma que já vai no site); a função só faz a rodada no sábado e manda
--    no máximo um lembrete a cada 6 dias por paciente.
--
-- Pode ser aplicada mais de uma vez.
-- =====================================================================

ALTER TABLE public.acompanhamentos
  ADD COLUMN IF NOT EXISTS registrado_pela_paciente boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Paciente lanca o proprio peso" ON public.acompanhamentos;
CREATE POLICY "Paciente lanca o proprio peso"
  ON public.acompanhamentos FOR INSERT TO authenticated
  WITH CHECK (
    registrado_pela_paciente = true
    AND EXISTS (
      SELECT 1 FROM public.pacientes p
      WHERE p.id = acompanhamentos.paciente_id
        AND p.auth_user_id = auth.uid()
        AND p.user_id = acompanhamentos.user_id
        AND p.account_status = 'ativo'
    )
  );

ALTER TABLE public.configuracoes_clinica
  ADD COLUMN IF NOT EXISTS lembrete_peso_semanal boolean NOT NULL DEFAULT true;

-- Agendamento isolado: se o ambiente não permitir pg_cron/pg_net, o resto
-- desta migration vale e fica só um aviso.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'lembrete-peso-sabado';

  PERFORM cron.schedule(
    'lembrete-peso-sabado',
    '0 12 * * 6',
    $cmd$
    SELECT net.http_post(
      url := 'https://lnsngzjunuafggrwemsm.supabase.co/functions/v1/lembrete-peso-semanal',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuc25nemp1bnVhZmdncndlbXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQyMDQsImV4cCI6MjA4ODU0MDIwNH0.IISHdYkrdJDZZhV7Ighy-yl6xpc4LV_UnlxkDKcvO6g',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuc25nemp1bnVhZmdncndlbXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQyMDQsImV4cCI6MjA4ODU0MDIwNH0.IISHdYkrdJDZZhV7Ighy-yl6xpc4LV_UnlxkDKcvO6g'
      ),
      body := '{}'::jsonb
    );
    $cmd$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Agendamento do lembrete de peso não foi criado: %', SQLERRM;
END
$$;
