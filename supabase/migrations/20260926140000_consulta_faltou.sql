-- =====================================================================
-- Status "faltou" para consulta.
--
-- Antes, falta era marcada como "cancelado", o que misturava a paciente
-- que avisou com a que não apareceu. Relatórios e Dashboard contam só
-- "realizado", então nada muda nos números existentes.
--
-- Pode ser aplicada mais de uma vez.
-- =====================================================================

ALTER TYPE public.status_consulta ADD VALUE IF NOT EXISTS 'faltou';
