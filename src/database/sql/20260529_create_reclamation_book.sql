-- Tabla para registrar el Libro de Reclamaciones Virtual.
-- Yo debo ejecutar este script en Supabase SQL Editor antes de desplegar el backend con el nuevo módulo.
CREATE TABLE IF NOT EXISTS public.reclamation_book (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  claim_code character varying NOT NULL UNIQUE,
  consumer_full_name character varying NOT NULL,
  consumer_document_type character varying NOT NULL CHECK (consumer_document_type::text = ANY (ARRAY['DNI'::character varying, 'CE'::character varying, 'PASSPORT'::character varying, 'RUC'::character varying]::text[])),
  consumer_document_number character varying NOT NULL,
  consumer_email character varying NOT NULL,
  consumer_phone character varying,
  consumer_address text,
  is_minor boolean NOT NULL DEFAULT false,
  guardian_full_name character varying,
  guardian_document_number character varying,
  branch_id uuid,
  branch_name_snapshot character varying,
  order_number character varying,
  good_type character varying NOT NULL CHECK (good_type::text = ANY (ARRAY['PRODUCT'::character varying, 'SERVICE'::character varying]::text[])),
  amount numeric CHECK (amount IS NULL OR amount >= 0::numeric),
  description text NOT NULL,
  claim_type character varying NOT NULL CHECK (claim_type::text = ANY (ARRAY['RECLAMO'::character varying, 'QUEJA'::character varying]::text[])),
  detail text NOT NULL,
  requested_solution text NOT NULL,
  status character varying NOT NULL DEFAULT 'RECEIVED'::character varying CHECK (status::text = ANY (ARRAY['RECEIVED'::character varying, 'IN_REVIEW'::character varying, 'ANSWERED'::character varying, 'CLOSED'::character varying]::text[])),
  consumer_accepts_terms boolean NOT NULL DEFAULT true,
  ip_address character varying,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reclamation_book_pkey PRIMARY KEY (id),
  CONSTRAINT reclamation_book_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);

CREATE INDEX IF NOT EXISTS idx_reclamation_book_claim_code
ON public.reclamation_book(claim_code);

CREATE INDEX IF NOT EXISTS idx_reclamation_book_created_at
ON public.reclamation_book(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reclamation_book_status
ON public.reclamation_book(status);
