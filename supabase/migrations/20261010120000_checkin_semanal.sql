-- =====================================================================
-- Check-in semanal respondido pela paciente no portal.
--
-- 1) checkins_semanais: uma resposta por paciente por semana (a semana é
--    o sábado de referência). Notas de 1 a 5, comentário livre por
--    pergunta, peso, dificuldades, conquista e medidas (a cada 15 dias,
--    só para quem o nutri habilitar).
-- 2) pacientes.checkin_medidas: o nutri liga para os pacientes on-line.
-- 3) A paciente pode corrigir o peso que ela mesma lançou (o check-in
--    também grava em acompanhamentos, para o gráfico de peso seguir igual).
--
-- Pode ser aplicada mais de uma vez.
-- =====================================================================

create table if not exists public.checkins_semanais (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  user_id uuid not null,
  semana date not null,
  peso numeric(5,2),
  fome smallint check (fome between 1 and 5),
  disposicao smallint check (disposicao between 1 and 5),
  intestino smallint check (intestino between 1 and 5),
  sono smallint check (sono between 1 and 5),
  treino smallint check (treino between 1 and 5),
  alimentacao smallint check (alimentacao between 1 and 5),
  seguiu_plano smallint check (seguiu_plano between 1 and 5),
  vontade_doce smallint check (vontade_doce between 1 and 5),
  agua smallint check (agua between 1 and 5),
  comentarios jsonb not null default '{}'::jsonb,
  dificuldades text,
  conquista text,
  medidas jsonb,
  visto_nutri boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (paciente_id, semana)
);

create index if not exists checkins_semanais_user_semana on public.checkins_semanais (user_id, semana desc);

alter table public.checkins_semanais enable row level security;

-- Paciente: lê, cria e corrige o próprio check-in.
drop policy if exists "Paciente le o proprio checkin" on public.checkins_semanais;
create policy "Paciente le o proprio checkin" on public.checkins_semanais
  for select to authenticated
  using (exists (select 1 from public.pacientes p where p.id = checkins_semanais.paciente_id and p.auth_user_id = auth.uid()));

drop policy if exists "Paciente cria o proprio checkin" on public.checkins_semanais;
create policy "Paciente cria o proprio checkin" on public.checkins_semanais
  for insert to authenticated
  with check (exists (
    select 1 from public.pacientes p
    where p.id = checkins_semanais.paciente_id
      and p.auth_user_id = auth.uid()
      and p.user_id = checkins_semanais.user_id
      and p.account_status = 'ativo'
  ));

drop policy if exists "Paciente corrige o proprio checkin" on public.checkins_semanais;
create policy "Paciente corrige o proprio checkin" on public.checkins_semanais
  for update to authenticated
  using (exists (select 1 from public.pacientes p where p.id = checkins_semanais.paciente_id and p.auth_user_id = auth.uid()))
  with check (exists (
    select 1 from public.pacientes p
    where p.id = checkins_semanais.paciente_id and p.auth_user_id = auth.uid() and p.user_id = checkins_semanais.user_id
  ));

-- Nutri dono e equipe: leem, marcam como visto e podem apagar.
drop policy if exists "Nutri gerencia checkins" on public.checkins_semanais;
create policy "Nutri gerencia checkins" on public.checkins_semanais
  for all to authenticated
  using (auth.uid() = user_id or public.can_access_nutri_data(user_id))
  with check (auth.uid() = user_id or public.can_access_nutri_data(user_id));

alter table public.pacientes
  add column if not exists checkin_medidas boolean not null default false;

-- A paciente pode corrigir o acompanhamento que ela mesma lançou (peso do
-- check-in editado na mesma semana). Só os dela, e continuam marcados.
drop policy if exists "Paciente corrige o proprio peso" on public.acompanhamentos;
create policy "Paciente corrige o proprio peso" on public.acompanhamentos
  for update to authenticated
  using (
    registrado_pela_paciente = true
    and exists (select 1 from public.pacientes p where p.id = acompanhamentos.paciente_id and p.auth_user_id = auth.uid())
  )
  with check (
    registrado_pela_paciente = true
    and exists (
      select 1 from public.pacientes p
      where p.id = acompanhamentos.paciente_id and p.auth_user_id = auth.uid() and p.user_id = acompanhamentos.user_id
    )
  );
