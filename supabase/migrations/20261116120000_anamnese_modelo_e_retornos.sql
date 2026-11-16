-- =====================================================================
-- Anamnese no modelo do Gabriel (o mesmo do Word) e retornos.
--
-- 1) anamneses.respostas (jsonb) e anamneses.modelo: respostas campo a campo.
--    Os campos de texto antigos continuam, só para leitura do histórico.
-- 2) submit_anamnese_respostas: a paciente envia pelo link, sem login.
-- 3) retornos: cada consulta de acompanhamento com data, horário e o
--    roteiro clínico preenchido (respostas jsonb).
--
-- Pode ser aplicada mais de uma vez.
-- =====================================================================

alter table public.anamneses add column if not exists respostas jsonb;
alter table public.anamneses add column if not exists modelo text;

create or replace function public.submit_anamnese_respostas(p_token text, p_respostas jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.anamneses
     set respostas = p_respostas,
         modelo = coalesce(modelo, 'real_v1'),
         respondido = true,
         updated_at = now()
   where token = p_token
     and respondido = false;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

grant execute on function public.submit_anamnese_respostas(text, jsonb) to anon, authenticated;

create table if not exists public.retornos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  user_id uuid not null,
  data_hora timestamptz not null,
  consulta_id uuid references public.consultas(id) on delete set null,
  respostas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists retornos_paciente on public.retornos (paciente_id, data_hora desc);

alter table public.retornos enable row level security;

drop policy if exists "Nutri gerencia retornos" on public.retornos;
create policy "Nutri gerencia retornos" on public.retornos
  for all to authenticated
  using (auth.uid() = user_id or public.can_access_nutri_data(user_id))
  with check (auth.uid() = user_id or public.can_access_nutri_data(user_id));
