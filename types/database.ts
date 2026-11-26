export type UserRole = 'customer' | 'seller' | 'admin';
export type StoreStatus = 'active' | 'suspended';
export type ApplicationStatus = 'pending' | 'approved' | 'revoked';
export type ProductGender = 'men' | 'women' | 'children' | 'sport' | 'accessories' | 'unisex';
export type ProductCondition = 'new' | 'like_new';
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_suspended: boolean;
  telegram_id?: string | null;
  telegram_chat_id?: string | null;
  telegram_username?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  seller_id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  address: string;
  city: string;
  category: string;
  phone: string;
  social_links: Record<string, string>;
  status: StoreStatus;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface SellerApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface SellerInvitationCode {
  id: string;
  application_id: string | null;
  applicant_id: string;
  code_prefix: string;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  is_revoked: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  color_hex: string | null;
  sku: string | null;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  brand_id: string | null;
  name: string;
  slug: string;
  description: string;
  gender: ProductGender;
  material: string | null;
  condition: ProductCondition;
  base_price: number;
  discount_price: number | null;
  images: string[];
  is_active: boolean;
  is_archived: boolean;
  rating: number;
  review_count: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
  store?: Store;
  category?: Category;
  brand?: Brand | null;
  variants?: ProductVariant[];
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  product: Product;
  variant: ProductVariant;
}

export interface Delivery {
  id: string;
  order_id: string;
  delivery_fee: number;
  estimated_time: string | null;
  delivery_method: string | null;
  courier_contact: string | null;
  tracking_note: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  product_image: string | null;
  size: string;
  color: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  checkout_group_id: string;
  customer_id: string;
  store_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  customer_phone: string;
  delivery_city: string;
  delivery_address: string;
  delivery_notes: string | null;
  customer_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  store?: Store;
  items?: OrderItem[];
  delivery?: Delivery | null;
}

export interface Review {
  id: string;
  product_id: string;
  store_id: string;
  order_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  customer?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  city: string;
  street_address: string;
  landmark: string | null;
  phone: string;
  is_default: boolean;
}
