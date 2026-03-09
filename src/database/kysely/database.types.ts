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


export interface Database {
  users: UsersTable;
  carts: CartsTable;
  cart_items: CartItemsTable;
  branches: BranchesTable;
  categories: CategoriesTable;
  products: ProductsTable;
  product_branch_prices: ProductBranchPricesTable;
  promotions: PromotionsTable;
  promotion_products: PromotionProductsTable;
  carousel_items: CarouselItemsTable;
}