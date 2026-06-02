import { Generated } from 'kysely';
export interface UsersTable {

  id: Generated<string>;
  role: 'ADMIN' | 'WORKER' | 'CUSTOMER';
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  password_hash: string;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}


export interface ProjectsTable {
  id: Generated<string>;
  code: 'POL' | 'ROP';
  name: string;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface UserProjectAccessTable {
  id: Generated<string>;
  user_id: string;
  project_id: string;
  role: 'ADMIN' | 'WORKER' | 'CUSTOMER';
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CartsTable {
  id: Generated<string>;
  user_id: string | null;
  session_id: string | null;
  status: 'ACTIVE' | 'CONVERTED' | 'ABANDONED';
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CartItemsTable {
  id: Generated<string>;
  cart_id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  promotion_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
export interface BranchesTable {
  id: Generated<string>;
  name: string;
  address: string;
  phone: string | null;
  district: string | null;
  reference: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CategoriesTable {
  id: Generated<string>;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ProductsTable {
  id: Generated<string>;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  base_price: string;
  promo_price: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ProductBranchPricesTable {
  id: Generated<string>;
  product_id: string;
  branch_id: string;
  price: string;
  is_available: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PromotionsTable {
  id: Generated<string>;
  title: string;
  description: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED' | 'SPECIAL_PRICE';
  discount_value: string;
  starts_at: Date | null;
  ends_at: Date | null;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  image_url: string | null;
}

export interface PromotionProductsTable {
  id: Generated<string>;
  promotion_id: string;
  product_id: string;
}

export interface CarouselItemsTable {
  id: Generated<string>;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_type: 'NONE' | 'PRODUCT' | 'PROMOTION' | 'CATEGORY' | 'EXTERNAL';
  link_value: string | null;
  sort_order: number;
  starts_at: Date | null;
  ends_at: Date | null;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CustomerAddressesTable {
  id: Generated<string>;
  user_id: string;
  label: string | null;
  address_line: string;
  district: string | null;
  reference: string | null;
  latitude: string | null;
  longitude: string | null;
  is_default: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface OrdersTable {
  id: Generated<string>;
  order_number: string;
  customer_id: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  branch_id: string;
  address_id: string | null;
  order_type: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  status:
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';
  payment_method: 'CASH' | 'YAPE' | 'PLIN' | 'CARD';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  invoice_type: 'NONE' | 'BOLETA_SIMPLE' | 'FACTURA';
  invoice_emission_status: 'NOT_REQUIRED' | 'PENDING' | 'PROCESSING' | 'ISSUED' | 'FAILED';
  customer_name_snapshot: string;
  customer_phone_snapshot: string | null;
  customer_email_snapshot: string | null;
  customer_document_type_snapshot: string | null;
  customer_document_number_snapshot: string | null;
  customer_address_snapshot: string | null;
  customer_business_name_snapshot: string | null;
  subtotal: string;
  discount_total: string;
  delivery_fee: string;
  total: string;
  notes: string | null;
  delivered_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface OrderItemsTable {
  id: Generated<string>;
  order_id: string;
  product_id: string | null;
  promotion_id: string | null;
  product_name_snapshot: string;
  product_description_snapshot: string | null;
  unit_of_measure: string;
  quantity: number;
  unit_price_snapshot: string;
  igv_percentage: string;
  discount_amount: string;
  subtotal: string;
  notes: string | null;
  created_at: Generated<Date>;
}

export interface OrderStatusHistoryTable {
  id: Generated<string>;
  order_id: string;
  status: string;
  changed_by: string | null;
  comment: string | null;
  created_at: Generated<Date>;
}

export interface WorkerBranchesTable {
  id: Generated<string>;
  user_id: string;
  branch_id: string;
  created_at: Generated<Date>;
}


export interface DocumentSeriesTable {
  id: Generated<string>;
  branch_id: string;
  document_type: 'BOLETA_SIMPLE' | 'FACTURA';
  series: string;
  current_number: number;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ElectronicDocumentsTable {
  id: Generated<string>;
  order_id: string;
  document_type: 'BOLETA_SIMPLE' | 'FACTURA';
  series: string;
  correlative: number;
  external_status: string;
  sunat_status: string | null;
  hash: string | null;
  xml_url: string | null;
  cdr_url: string | null;
  pdf_url: string | null;
  api_response: any | null;
  error_message: string | null;
  emitted_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PasswordResetTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Generated<Date>;
  created_at: Date |null;
}


export interface RopCategoriesTable {
  id: Generated<string>;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface RopProductsTable {
  id: Generated<string>;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  fit: string | null;
  material: string | null;
  care_instructions: string | null;
  base_price: string;
  sale_price: string | null;
  main_image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface RopProductVariantsTable {
  id: Generated<string>;
  product_id: string;
  sku: string | null;
  size: string;
  color_name: string;
  color_hex: string | null;
  stock: number;
  additional_price: string;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface RopProductImagesTable {
  id: Generated<string>;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}


export interface RopCouponsTable {
  id: Generated<string>;
  code: string;
  name: string;
  description: string | null;
  discount_percentage: string;
  starts_at: Date | null;
  ends_at: Date | null;
  max_uses_total: number | null;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface RopCouponProductsTable {
  id: Generated<string>;
  coupon_id: string;
  product_id: string;
  created_at: Generated<Date>;
}

export interface RopCouponRedemptionsTable {
  id: Generated<string>;
  coupon_id: string;
  user_id: string;
  order_reference: string | null;
  discount_amount: string;
  created_at: Generated<Date>;
}

export interface ReclamationBookTable {
  id: Generated<string>;
  claim_code: string;
  consumer_full_name: string;
  consumer_document_type: 'DNI' | 'CE' | 'PASSPORT' | 'RUC';
  consumer_document_number: string;
  consumer_email: string;
  consumer_phone: string | null;
  consumer_address: string | null;
  is_minor: boolean;
  guardian_full_name: string | null;
  guardian_document_number: string | null;
  branch_id: string | null;
  branch_name_snapshot: string | null;
  order_number: string | null;
  good_type: 'PRODUCT' | 'SERVICE';
  amount: string | null;
  description: string;
  claim_type: 'RECLAMO' | 'QUEJA';
  detail: string;
  requested_solution: string;
  status: 'RECEIVED' | 'IN_REVIEW' | 'ANSWERED' | 'CLOSED';
  consumer_accepts_terms: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  users: UsersTable;
  projects: ProjectsTable;
  user_project_access: UserProjectAccessTable;
  carts: CartsTable;
  cart_items: CartItemsTable;
  branches: BranchesTable;
  categories: CategoriesTable;
  products: ProductsTable;
  product_branch_prices: ProductBranchPricesTable;
  promotions: PromotionsTable;
  promotion_products: PromotionProductsTable;
  carousel_items: CarouselItemsTable;
  customer_addresses: CustomerAddressesTable;
  orders: OrdersTable;
  order_items: OrderItemsTable;
  order_status_history: OrderStatusHistoryTable;
  worker_branches: WorkerBranchesTable;
  document_series: DocumentSeriesTable;
  electronic_documents: ElectronicDocumentsTable;
  password_reset_tokens: PasswordResetTokensTable;
  rop_categories: RopCategoriesTable;
  rop_products: RopProductsTable;
  rop_product_variants: RopProductVariantsTable;
  rop_product_images: RopProductImagesTable;
  rop_coupons: RopCouponsTable;
  rop_coupon_products: RopCouponProductsTable;
  rop_coupon_redemptions: RopCouponRedemptionsTable;
  reclamation_book: ReclamationBookTable;
}

