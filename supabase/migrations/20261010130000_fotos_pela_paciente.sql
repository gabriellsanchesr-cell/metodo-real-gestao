-- =====================================================================
-- Fotos de evolução enviadas pela própria paciente no portal.
--
-- Antes só o nutri subia as fotos. Agora a paciente com portal liberado
-- envia as dela (frente, lateral, costas), vê o histórico e pode apagar
-- uma foto que ela mesma mandou. As fotos do nutri ela só vê.
--
-- Arquivos: bucket privado evolucao-fotos, pasta <id da paciente>/...
-- A leitura pela paciente já existia (migration 20260625165943).
--
-- Pode ser aplicada mais de uma vez.
-- =====================================================================

alter table public.evolucao_fotos
  add column if not exists enviada_pela_paciente boolean not null default false;

drop policy if exists "Paciente ve as proprias fotos" on public.evolucao_fotos;
create policy "Paciente ve as proprias fotos" on public.evolucao_fotos
  for select to authenticated
  using (exists (select 1 from public.pacientes p where p.id = evolucao_fotos.paciente_id and p.auth_user_id = auth.uid()));

drop policy if exists "Paciente envia as proprias fotos" on public.evolucao_fotos;
create policy "Paciente envia as proprias fotos" on public.evolucao_fotos
  for insert to authenticated
  with check (
    enviada_pela_paciente = true
    and exists (
      select 1 from public.pacientes p
      where p.id = evolucao_fotos.paciente_id
        and p.auth_user_id = auth.uid()
        and p.user_id = evolucao_fotos.user_id
        and p.account_status = 'ativo'
    )
  );

drop policy if exists "Paciente apaga a foto que enviou" on public.evolucao_fotos;
create policy "Paciente apaga a foto que enviou" on public.evolucao_fotos
  for delete to authenticated
  using (
    enviada_pela_paciente = true
    and exists (select 1 from public.pacientes p where p.id = evolucao_fotos.paciente_id and p.auth_user_id = auth.uid())
  );

-- Arquivos: a paciente grava e apaga só na subpasta <id>/paciente/ da própria
-- pasta, para não conseguir apagar um arquivo enviado pelo nutri.
drop policy if exists "Paciente envia evolucao fotos" on storage.objects;
create policy "Paciente envia evolucao fotos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evolucao-fotos'
    and (storage.foldername(name))[2] = 'paciente'
    and exists (
      select 1 from public.pacientes p
      where p.id::text = (storage.foldername(name))[1]
        and p.auth_user_id = auth.uid()
        and p.account_status = 'ativo'
    )
  );

drop policy if exists "Paciente apaga evolucao fotos" on storage.objects;
create policy "Paciente apaga evolucao fotos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'evolucao-fotos'
    and (storage.foldername(name))[2] = 'paciente'
    and exists (
      select 1 from public.pacientes p
      where p.id::text = (storage.foldername(name))[1]
        and p.auth_user_id = auth.uid()
    )
  );
