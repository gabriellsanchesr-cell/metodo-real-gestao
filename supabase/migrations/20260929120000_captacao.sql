-- =====================================================================
-- Captação: fila diária de "quem tocar hoje".
--
-- Os leads deixam de ser só um Kanban e passam a ter cadência (último e
-- próximo toque), origem rastreável (parceiro, paciente que indicou) e
-- vínculo com o paciente quando convertem. Cada toque fica registrado em
-- `captacao_toques`, que é a fonte do placar e evita repetir a mesma
-- mensagem para a mesma pessoa.
--
-- Nada aqui envia mensagem: o sistema só prepara o texto, quem envia é o
-- nutricionista pelo WhatsApp.
--
-- Pode ser aplicada mais de uma vez.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Parceiros (personal, academia, estúdio)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parceiros (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  tipo        text NOT NULL DEFAULT 'personal'
              CHECK (tipo IN ('personal', 'academia', 'estudio', 'clinica', 'outro')),
  telefone    text,
  slug        text,
  ativo       boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS parceiros_slug_idx
  ON public.parceiros (user_id, slug) WHERE slug IS NOT NULL;

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nutri gerencia parceiros" ON public.parceiros;
CREATE POLICY "Nutri gerencia parceiros"
  ON public.parceiros FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Equipe gerencia parceiros" ON public.parceiros;
CREATE POLICY "Equipe gerencia parceiros"
  ON public.parceiros FOR ALL TO authenticated
  USING (public.can_access_nutri_data(user_id) AND public.equipe_has_permission(user_id, 'pacientes', 'ver'))
  WITH CHECK (public.can_access_nutri_data(user_id) AND public.equipe_has_permission(user_id, 'pacientes', 'editar'));

DROP TRIGGER IF EXISTS parceiros_touch ON public.parceiros;
CREATE TRIGGER parceiros_touch
  BEFORE UPDATE ON public.parceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------
-- 2. Leads com cadência e origem
-- ---------------------------------------------------------------------
-- tentativas: toques seguidos sem resposta. Zera quando a pessoa responde.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ultimo_toque             timestamptz,
  ADD COLUMN IF NOT EXISTS proximo_toque            date,
  ADD COLUMN IF NOT EXISTS tentativas               integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parceiro_id              uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS indicado_por_paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paciente_id              uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_perda             text;

CREATE INDEX IF NOT EXISTS leads_fila_idx
  ON public.leads (user_id, status, proximo_toque);


-- ---------------------------------------------------------------------
-- 3. Origem do paciente
-- ---------------------------------------------------------------------
-- Diz de qual canal veio cada paciente pagante. É o número que decide
-- onde investir tempo.
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS origem  text,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------
-- 4. Registro de toques
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.captacao_toques (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id     uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE,
  parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE CASCADE,
  gatilho     text NOT NULL,
  resultado   text NOT NULL DEFAULT 'enviado'
              CHECK (resultado IN ('enviado', 'respondeu', 'adiado', 'perdido', 'converteu')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT toque_tem_alvo CHECK (
    lead_id IS NOT NULL OR paciente_id IS NOT NULL OR parceiro_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS captacao_toques_data_idx
  ON public.captacao_toques (user_id, created_at DESC);

ALTER TABLE public.captacao_toques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nutri gerencia toques" ON public.captacao_toques;
CREATE POLICY "Nutri gerencia toques"
  ON public.captacao_toques FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Equipe gerencia toques" ON public.captacao_toques;
CREATE POLICY "Equipe gerencia toques"
  ON public.captacao_toques FOR ALL TO authenticated
  USING (public.can_access_nutri_data(user_id) AND public.equipe_has_permission(user_id, 'pacientes', 'ver'))
  WITH CHECK (public.can_access_nutri_data(user_id) AND public.equipe_has_permission(user_id, 'pacientes', 'editar'));
