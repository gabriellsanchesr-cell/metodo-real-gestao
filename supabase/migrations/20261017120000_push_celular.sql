-- =====================================================================
-- Avisos no celular (Web Push) para quem ativou no app do portal.
--
-- 1) push_inscricoes: um registro por aparelho da paciente (endereço do
--    serviço de push do celular e as chaves dele). A paciente cria e apaga
--    os dela; as funções de envio leem com a chave de serviço.
-- 2) notificacoes_email aceita o status 'push', para o lembrete de sábado
--    enviado só no celular entrar no histórico e na regra de 6 dias.
--
-- Pode ser aplicada mais de uma vez.
-- =====================================================================

create table if not exists public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,
  created_at timestamptz not null default now()
);

create index if not exists push_inscricoes_paciente on public.push_inscricoes (paciente_id);

alter table public.push_inscricoes enable row level security;

drop policy if exists "Paciente gerencia os proprios aparelhos" on public.push_inscricoes;
create policy "Paciente gerencia os proprios aparelhos" on public.push_inscricoes
  for all to authenticated
  using (exists (select 1 from public.pacientes p where p.id = push_inscricoes.paciente_id and p.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.pacientes p where p.id = push_inscricoes.paciente_id and p.auth_user_id = auth.uid()));

drop policy if exists "Nutri ve aparelhos das pacientes" on public.push_inscricoes;
create policy "Nutri ve aparelhos das pacientes" on public.push_inscricoes
  for select to authenticated
  using (exists (select 1 from public.pacientes p where p.id = push_inscricoes.paciente_id and (p.user_id = auth.uid() or public.can_access_nutri_data(p.user_id))));

alter table public.notificacoes_email drop constraint if exists notificacoes_email_status_check;
alter table public.notificacoes_email add constraint notificacoes_email_status_check
  check (status in ('pendente', 'enviado', 'falhou', 'simulado', 'ignorado', 'push'));
