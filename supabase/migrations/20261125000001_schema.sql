-- ============================================================================
-- NOMA FASHION MARKETPLACE - PRODUCTION POSTGRES SCHEMA
-- City: Namangan, Uzbekistan | Currency: UZS | Timezone: Asia/Tashkent
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('Asia/Tashkent', NOW());
  RETURN NEW;
END;
$$;

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin')),
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 2. STORES
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  logo_url TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Namangan',
  category TEXT NOT NULL,
  phone TEXT NOT NULL,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 3. SELLER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.seller_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 4. SELLER INVITATION CODES (HASH ONLY, NEVER PLAINTEXT)
CREATE TABLE IF NOT EXISTS public.seller_invitation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES public.seller_applications(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  code_prefix TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 6. BRANDS
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 7. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('men', 'women', 'children', 'sport', 'accessories', 'unisex')),
  material TEXT,
  condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'like_new')),
  base_price NUMERIC(14,2) NOT NULL CHECK (base_price > 0),
  discount_price NUMERIC(14,2) CHECK (discount_price IS NULL OR (discount_price > 0 AND discount_price < base_price)),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  review_count INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 8. PRODUCT VARIANTS (SIZE + COLOR + STOCK)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  color_hex TEXT,
  sku TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  UNIQUE(product_id, size, color)
);

-- 9. CARTS
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 10. CART ITEMS
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  UNIQUE(cart_id, variant_id)
);

-- 11. ORDERS (ONE PER STORE PER CHECKOUT)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  checkout_group_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled')
  ),
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery' CHECK (payment_method IN ('cash_on_delivery', 'click', 'payme')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_city TEXT NOT NULL DEFAULT 'Namangan',
  delivery_address TEXT NOT NULL,
  delivery_notes TEXT,
  customer_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 12. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price NUMERIC(14,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 13. DELIVERIES (MODULAR SELLER-ARRANGED DELIVERY)
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_fee NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  estimated_time TEXT,
  delivery_method TEXT,
  courier_contact TEXT,
  tracking_note TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 14. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  UNIQUE(order_id, product_id, customer_id)
);

-- 15. FAVORITES
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  UNIQUE(user_id, product_id)
);

-- 16. ADDRESSES
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Uy',
  city TEXT NOT NULL DEFAULT 'Namangan',
  street_address TEXT NOT NULL,
  landmark TEXT,
  phone TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 17. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 18. PAYMENT RECORDS (MODULAR FOR FUTURE CLICK / PAYME)
CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'cash_on_delivery' CHECK (provider IN ('cash_on_delivery', 'click', 'payme')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'UZS',
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  provider_tx_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 19. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

-- 20. DB-BACKED RATE LIMITER FOR SERVERLESS BRUTE-FORCE PROTECTION
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ
);

-- 21. RECENTLY VIEWED (PER USER)
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  UNIQUE(user_id, product_id)
);

-- UPDATED_AT TRIGGERS
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_seller_apps_updated_at BEFORE UPDATE ON public.seller_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payment_records_updated_at BEFORE UPDATE ON public.payment_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_stores_seller ON public.stores(seller_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_city ON public.stores(city);
CREATE INDEX IF NOT EXISTS idx_seller_apps_user ON public.seller_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_applicant ON public.seller_invitation_codes(applicant_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_gender ON public.products(gender);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active, is_archived);
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_group ON public.orders(checkout_group_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
