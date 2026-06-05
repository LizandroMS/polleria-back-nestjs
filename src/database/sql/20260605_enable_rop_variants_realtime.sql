-- Activa Realtime para cambios de stock en variantes de ropa.
-- Nota para mí: el cliente usa esta tabla para refrescar tallas/stock sin recargar la página.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rop_product_variants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rop_product_variants;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rop_product_variants_stock_active
ON public.rop_product_variants(product_id, is_active, stock);
