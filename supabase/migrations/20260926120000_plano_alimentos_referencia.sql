-- =====================================================================
-- Alimentos lidos do PDF anexado, para a calculadora de substituições do
-- portal mostrar os alimentos do plano sem a paciente precisar buscar.
--
-- Formato: [{ "nome": "pão francês", "quantidade_g": 50, "refeicao": "Café",
--             "correspondente": "<nome exato da lista da calculadora>" }]
--
-- Só é preenchida em planos do tipo "anexo". Planos montados ou importados
-- já têm os alimentos em alimentos_plano. Não mexe em nada existente e pode
-- ser aplicada mais de uma vez.
-- =====================================================================

ALTER TABLE public.planos_alimentares
  ADD COLUMN IF NOT EXISTS alimentos_referencia jsonb;
