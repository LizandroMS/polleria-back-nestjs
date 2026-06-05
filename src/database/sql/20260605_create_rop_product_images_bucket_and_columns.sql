-- ================================================================
-- Proyecto ROP - Soporte de imágenes en Supabase Storage
-- ================================================================
-- Nota para mí:
-- Las imágenes de ropa se subirán desde el backend a Supabase Storage.
-- Estas columnas guardan la URL pública y también el path interno del bucket.
-- El path interno sirve para poder eliminar o reemplazar imágenes sin dejar
-- archivos huérfanos en Supabase.

ALTER TABLE public.rop_products
  ADD COLUMN IF NOT EXISTS main_image_storage_path text;

ALTER TABLE public.rop_product_images
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type character varying,
  ADD COLUMN IF NOT EXISTS size_bytes integer;

CREATE INDEX IF NOT EXISTS idx_rop_products_main_image_storage_path
ON public.rop_products(main_image_storage_path);

CREATE INDEX IF NOT EXISTS idx_rop_product_images_storage_path
ON public.rop_product_images(storage_path);

-- Bucket público para imágenes de productos de ropa.
-- Si ya existe, se actualiza para mantenerlo público y con validaciones básicas.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'rop-product-images',
  'rop-product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Permitir lectura pública de imágenes del bucket.
-- La escritura seguirá haciéndose desde backend con SUPABASE_SERVICE_ROLE_KEY.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read rop product images'
  ) THEN
    CREATE POLICY "Public read rop product images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'rop-product-images');
  END IF;
END $$;
