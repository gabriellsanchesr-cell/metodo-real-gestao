-- Paciente inativa: parou o acompanhamento, mas o cadastro continua na
-- lista (diferente de arquivar). Sai do filtro "Ativos" e das métricas do
-- painel. Não mexe no acesso ao portal, que tem controle próprio.
alter table public.pacientes
  add column if not exists inativo boolean not null default false;