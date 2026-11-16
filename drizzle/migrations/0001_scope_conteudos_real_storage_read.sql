DROP POLICY IF EXISTS "Conteudos real: leitura logado" ON storage.objects;
CREATE POLICY "Conteudos real: leitura autorizada" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'conteudos-real' AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.conteudos_real c WHERE c.arquivo_path = objects.name AND (c.user_id = auth.uid() OR public.can_access_nutri_data(c.user_id)))
    OR EXISTS (SELECT 1 FROM public.conteudo_liberacoes lib JOIN public.conteudos_real c ON c.id = lib.conteudo_id JOIN public.pacientes p ON p.id = lib.paciente_id
               WHERE c.arquivo_path = objects.name AND p.auth_user_id = auth.uid() AND COALESCE(lib.liberado, true))
  )
);