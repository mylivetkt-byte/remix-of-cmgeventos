CREATE TABLE public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app_secrets"
  ON public.app_secrets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert app_secrets"
  ON public.app_secrets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update app_secrets"
  ON public.app_secrets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);