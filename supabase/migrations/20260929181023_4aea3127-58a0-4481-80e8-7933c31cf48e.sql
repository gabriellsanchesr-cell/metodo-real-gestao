DROP POLICY IF EXISTS "Anyone can read taco" ON public.alimentos_taco;

REVOKE ALL ON TABLE public.alimentos_taco FROM anon;
GRANT SELECT ON TABLE public.alimentos_taco TO authenticated;
GRANT ALL ON TABLE public.alimentos_taco TO service_role;

CREATE POLICY "Authenticated users can read taco"
ON public.alimentos_taco
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);