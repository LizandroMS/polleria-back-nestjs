-- Nota para mí:
-- Este script prepara el login para compartir el backend entre proyectos.
-- POL = Pollería actual.
-- ROP = Tienda de ropa online futura.
-- Debo ejecutarlo en Supabase antes de desplegar el backend que valida projectCode.

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_project_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['ADMIN'::character varying, 'WORKER'::character varying, 'CUSTOMER'::character varying]::text[])),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_project_access_pkey PRIMARY KEY (id),
  CONSTRAINT user_project_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_project_access_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT uq_user_project_access_user_project UNIQUE (user_id, project_id)
);

INSERT INTO public.projects (code, name, is_active)
VALUES
  ('POL', 'Pollería', true),
  ('ROP', 'Tienda de ropa online', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Asocio todos los usuarios actuales al proyecto POL para que el sistema productivo
-- siga funcionando sin cambiar la forma en que hoy inician sesión.
INSERT INTO public.user_project_access (user_id, project_id, role, is_active)
SELECT
  u.id,
  p.id,
  u.role,
  true
FROM public.users u
CROSS JOIN public.projects p
WHERE p.code = 'POL'
ON CONFLICT (user_id, project_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = true,
  updated_at = now();

CREATE INDEX IF NOT EXISTS idx_user_project_access_user_id
ON public.user_project_access(user_id);

CREATE INDEX IF NOT EXISTS idx_user_project_access_project_id
ON public.user_project_access(project_id);
