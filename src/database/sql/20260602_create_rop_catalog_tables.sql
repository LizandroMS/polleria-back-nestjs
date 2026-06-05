-- ================================================================
-- Proyecto ROP - Catálogo de tienda de ropa
-- ================================================================
-- Nota para mí:
-- Uso el prefijo rop_ para separar las tablas de ropa de las tablas ya creadas
-- para pollería. Así el backend puede compartir autenticación, pero mantener
-- dominios de negocio independientes.

CREATE TABLE IF NOT EXISTS public.rop_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.rop_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  brand character varying,
  fit character varying,
  material character varying,
  care_instructions text,
  base_price numeric NOT NULL CHECK (base_price >= 0::numeric),
  sale_price numeric CHECK (sale_price >= 0::numeric),
  main_image_url text,
  main_image_storage_path text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_products_pkey PRIMARY KEY (id),
  CONSTRAINT rop_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.rop_categories(id)
);

CREATE TABLE IF NOT EXISTS public.rop_product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sku character varying UNIQUE,
  size character varying NOT NULL,
  color_name character varying NOT NULL,
  color_hex character varying,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  additional_price numeric NOT NULL DEFAULT 0 CHECK (additional_price >= 0::numeric),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT rop_product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.rop_products(id) ON DELETE CASCADE,
  CONSTRAINT rop_product_variants_unique_size_color UNIQUE (product_id, size, color_name)
);

CREATE TABLE IF NOT EXISTS public.rop_product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  image_url text NOT NULL,
  storage_path text,
  mime_type character varying,
  size_bytes integer,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_product_images_pkey PRIMARY KEY (id),
  CONSTRAINT rop_product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.rop_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rop_products_category_id ON public.rop_products(category_id);
CREATE INDEX IF NOT EXISTS idx_rop_products_is_active ON public.rop_products(is_active);
CREATE INDEX IF NOT EXISTS idx_rop_products_is_featured ON public.rop_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_rop_product_variants_product_id ON public.rop_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_rop_product_variants_size ON public.rop_product_variants(size);
CREATE INDEX IF NOT EXISTS idx_rop_product_variants_color_name ON public.rop_product_variants(color_name);
CREATE INDEX IF NOT EXISTS idx_rop_product_images_product_id ON public.rop_product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_rop_products_main_image_storage_path ON public.rop_products(main_image_storage_path);
CREATE INDEX IF NOT EXISTS idx_rop_product_images_storage_path ON public.rop_product_images(storage_path);

-- Datos base para empezar a registrar productos desde el admin.
INSERT INTO public.rop_categories (name, slug, description, sort_order, is_active)
VALUES
  ('Polos', 'polos', 'Polos urbanos, básicos y oversize.', 1, true),
  ('Casacas', 'casacas', 'Casacas urbanas y prendas exteriores.', 2, true),
  ('Pantalones', 'pantalones', 'Pantalones, joggers y cargos.', 3, true),
  ('Camisas', 'camisas', 'Camisas casuales para outfits diarios.', 4, true)
ON CONFLICT (slug) DO NOTHING;
