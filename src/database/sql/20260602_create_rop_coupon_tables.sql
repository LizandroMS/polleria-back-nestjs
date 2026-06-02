-- Cupones para el proyecto de ropa.
-- Uso prefijo rop_ para no mezclar tablas con el negocio de pollería.

CREATE TABLE IF NOT EXISTS public.rop_coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  discount_percentage numeric NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  max_uses_total integer CHECK (max_uses_total IS NULL OR max_uses_total > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_coupons_pkey PRIMARY KEY (id),
  CONSTRAINT rop_coupons_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.rop_coupon_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_coupon_products_pkey PRIMARY KEY (id),
  CONSTRAINT rop_coupon_products_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.rop_coupons(id) ON DELETE CASCADE,
  CONSTRAINT rop_coupon_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.rop_products(id) ON DELETE CASCADE,
  CONSTRAINT rop_coupon_products_coupon_product_unique UNIQUE (coupon_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.rop_coupon_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_reference character varying,
  discount_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_coupon_redemptions_pkey PRIMARY KEY (id),
  CONSTRAINT rop_coupon_redemptions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.rop_coupons(id) ON DELETE CASCADE,
  CONSTRAINT rop_coupon_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT rop_coupon_redemptions_coupon_user_unique UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rop_coupon_products_product_id
ON public.rop_coupon_products(product_id);

CREATE INDEX IF NOT EXISTS idx_rop_coupon_redemptions_user_id
ON public.rop_coupon_redemptions(user_id);
