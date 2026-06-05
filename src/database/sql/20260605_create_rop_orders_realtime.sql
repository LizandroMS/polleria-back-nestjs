-- Crea las tablas de pedidos del proyecto ROP y las deja listas para Supabase Realtime.
-- Nota para mí: estas tablas usan prefijo rop_ para no mezclarse con pollería.

CREATE TABLE IF NOT EXISTS public.rop_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_code character varying NOT NULL UNIQUE,
  customer_id uuid NOT NULL,
  customer_full_name character varying NOT NULL,
  customer_phone character varying NOT NULL,
  customer_email character varying NOT NULL,
  customer_document_number character varying,
  contact_preference character varying NOT NULL CHECK (contact_preference IN ('WHATSAPP', 'EMAIL', 'PHONE')),
  payment_method character varying NOT NULL CHECK (payment_method IN ('YAPE', 'PLIN', 'BANK_TRANSFER')),
  payment_status character varying NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  payment_notes text,
  paid_at timestamp with time zone,
  delivery_address_line text NOT NULL,
  delivery_reference text,
  delivery_district character varying,
  delivery_latitude numeric,
  delivery_longitude numeric,
  delivery_google_place_id text,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_total numeric NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  coupon_code character varying,
  coupon_name character varying,
  coupon_discount_percentage numeric,
  coupon_discount_amount numeric,
  status character varying NOT NULL DEFAULT 'PENDING_CONTACT' CHECK (status IN (
    'PENDING_CONTACT',
    'CONTACTED',
    'PAYMENT_PENDING',
    'PAYMENT_CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
  )),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_orders_pkey PRIMARY KEY (id),
  CONSTRAINT rop_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.rop_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid,
  variant_id uuid,
  sku character varying,
  product_name_snapshot character varying NOT NULL,
  image_url_snapshot text,
  size_snapshot character varying,
  color_name_snapshot character varying,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_snapshot numeric NOT NULL DEFAULT 0 CHECK (unit_price_snapshot >= 0),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT rop_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.rop_orders(id) ON DELETE CASCADE,
  CONSTRAINT rop_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.rop_products(id),
  CONSTRAINT rop_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.rop_product_variants(id)
);

CREATE TABLE IF NOT EXISTS public.rop_order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status character varying NOT NULL,
  payment_status character varying,
  changed_by uuid,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rop_order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT rop_order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.rop_orders(id) ON DELETE CASCADE,
  CONSTRAINT rop_order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_rop_orders_customer_id ON public.rop_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_rop_orders_status ON public.rop_orders(status);
CREATE INDEX IF NOT EXISTS idx_rop_orders_payment_status ON public.rop_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_rop_orders_created_at ON public.rop_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rop_order_items_order_id ON public.rop_order_items(order_id);

-- Realtime para que ventas/trabajador vea nuevos pedidos automáticamente
-- y el cliente vea cambios de estado sin recargar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rop_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rop_orders;
  END IF;
END $$;
