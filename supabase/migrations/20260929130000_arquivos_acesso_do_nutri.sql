-- =====================================================================
-- Nutri dono da paciente volta a acessar os arquivos dela.
--
-- A migration 20260625165943 refez as regras dos buckets de arquivos com
--   p.auth_user_id = auth.uid() OR public.can_access_nutri_data(p.user_id)
-- mas can_access_nutri_data só devolve true para MEMBRO DA EQUIPE, nunca
-- para o próprio nutri. Resultado: desde junho o nutri não abre nenhuma
-- foto do diário (conferido em 29/09/2026: 245 fotos, nenhuma assinável),
-- e não consegue ler, enviar nem apagar fotos de evolução e exames.
--
-- Aqui entram regras só para o dono (pacientes.user_id = auth.uid()).
-- As regras da paciente e da equipe continuam como estão.
-- Pode ser aplicada mais de uma vez.
-- =====================================================================

-- ---------- diario-fotos: a paciente envia, o nutri vê e apaga ----------
DROP POLICY IF EXISTS "Nutri dono le diario fotos" ON storage.objects;
CREATE POLICY "Nutri dono le diario fotos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'diario-fotos'
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Nutri dono apaga diario fotos" ON storage.objects;
CREATE POLICY "Nutri dono apaga diario fotos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'diario-fotos'
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

-- ---------- evolucao-fotos e exames-laboratoriais: o nutri faz tudo ----------
DROP POLICY IF EXISTS "Nutri dono le evolucao e exames" ON storage.objects;
CREATE POLICY "Nutri dono le evolucao e exames"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('evolucao-fotos', 'exames-laboratoriais')
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Nutri dono envia evolucao e exames" ON storage.objects;
CREATE POLICY "Nutri dono envia evolucao e exames"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('evolucao-fotos', 'exames-laboratoriais')
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Nutri dono apaga evolucao e exames" ON storage.objects;
CREATE POLICY "Nutri dono apaga evolucao e exames"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('evolucao-fotos', 'exames-laboratoriais')
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

-- ---------- documentos-pdf (materiais e avaliações importadas) ----------
-- Leitura já funcionava por regra antiga; envio e exclusão de materiais
-- dependiam da mesma função. Mesmo formato de pasta: '{tipo}/{paciente.id}/...'.
DROP POLICY IF EXISTS "Nutri dono gerencia documentos paciente" ON storage.objects;
CREATE POLICY "Nutri dono gerencia documentos paciente"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'documentos-pdf'
  AND (storage.foldername(name))[1] IN ('materiais', 'avaliacoes-importadas')
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'documentos-pdf'
  AND (storage.foldername(name))[1] IN ('materiais', 'avaliacoes-importadas')
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND p.user_id = auth.uid()
  )
);
