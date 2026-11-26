-- ============================================================================
-- NOMA FASHION MARKETPLACE - RLS POLICIES & ATOMIC POSTGRES FUNCTIONS
-- ============================================================================

-- Helper functions for RLS (SECURITY DEFINER avoids infinite recursion on profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_suspended = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'seller' AND is_suspended = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.current_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.stores WHERE seller_id = auth.uid() LIMIT 1;
$$;

-- Trigger: Automatically create profile when a new user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, NEW.phone, 'Foydalanuvchi'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON EVERY TABLE
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users update own basic profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND is_suspended = (SELECT is_suspended FROM public.profiles WHERE id = auth.uid())
  );

-- STORES
CREATE POLICY "Public read active stores" ON public.stores
  FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR public.is_admin());
CREATE POLICY "Seller insert own store" ON public.stores
  FOR INSERT WITH CHECK (seller_id = auth.uid() AND public.is_seller());
CREATE POLICY "Seller update own store" ON public.stores
  FOR UPDATE USING (seller_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    (seller_id = auth.uid() AND status = (SELECT status FROM public.stores WHERE id = stores.id))
    OR public.is_admin()
  );

-- SELLER APPLICATIONS & CODES (strictly applicant-read / server-side write)
CREATE POLICY "Applicant reads own application" ON public.seller_applications
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Server only writes applications" ON public.seller_applications
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admin views invitation code metadata" ON public.seller_invitation_codes
  FOR SELECT USING (public.is_admin());

-- CATEGORIES & BRANDS
CREATE POLICY "Public reads active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Admin manages categories" ON public.categories
  FOR ALL USING (public.is_admin());

CREATE POLICY "Public reads brands" ON public.brands
  FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated sellers/admin insert brands" ON public.brands
  FOR INSERT WITH CHECK (public.is_seller() OR public.is_admin());

-- PRODUCTS (disappear from marketplace if store suspended or archived/inactive)
CREATE POLICY "Public reads live products from active stores" ON public.products
  FOR SELECT USING (
    (
      is_active = TRUE
      AND is_archived = FALSE
      AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.status = 'active')
    )
    OR store_id = public.current_store_id()
    OR public.is_admin()
  );
CREATE POLICY "Seller inserts own store products" ON public.products
  FOR INSERT WITH CHECK (
    store_id = public.current_store_id()
    AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.status = 'active')
  );
CREATE POLICY "Seller updates own store products" ON public.products
  FOR UPDATE USING (store_id = public.current_store_id() OR public.is_admin());
CREATE POLICY "Seller deletes own store products" ON public.products
  FOR DELETE USING (store_id = public.current_store_id() OR public.is_admin());

-- PRODUCT VARIANTS
CREATE POLICY "Public reads variants of visible products" ON public.product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_variants.product_id
      AND ((p.is_active = TRUE AND p.is_archived = FALSE AND s.status = 'active') OR s.seller_id = auth.uid() OR public.is_admin())
    )
  );
CREATE POLICY "Seller manages own variants" ON public.product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND p.store_id = public.current_store_id()
    ) OR public.is_admin()
  );

-- CARTS & CART ITEMS
CREATE POLICY "Customer manages own cart" ON public.carts
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Customer manages own cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid())
  );

-- ORDERS & ORDER ITEMS
CREATE POLICY "Customer or store seller reads order" ON public.orders
  FOR SELECT USING (
    customer_id = auth.uid()
    OR store_id = public.current_store_id()
    OR public.is_admin()
  );
CREATE POLICY "Order items follow order visibility" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (o.customer_id = auth.uid() OR o.store_id = public.current_store_id() OR public.is_admin())
    )
  );

-- DELIVERIES
CREATE POLICY "Deliveries follow order visibility" ON public.deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deliveries.order_id
      AND (o.customer_id = auth.uid() OR o.store_id = public.current_store_id() OR public.is_admin())
    )
  );

-- REVIEWS
CREATE POLICY "Public reads reviews" ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "Customer creates review on delivered order" ON public.reviews
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.id = reviews.order_id
      AND o.customer_id = auth.uid()
      AND o.status = 'delivered'
      AND oi.product_id = reviews.product_id
    )
  );

-- FAVORITES, ADDRESSES, NOTIFICATIONS, RECENTLY VIEWED
CREATE POLICY "Customer manages own favorites" ON public.favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Customer manages own addresses" ON public.addresses FOR ALL USING (user_id = auth.uid());
CREATE POLICY "User reads/updates own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Customer manages recently viewed" ON public.recently_viewed FOR ALL USING (user_id = auth.uid());

-- PAYMENT RECORDS & AUDIT LOGS
CREATE POLICY "Customer/seller/admin read payment records" ON public.payment_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payment_records.order_id
      AND (o.customer_id = auth.uid() OR o.store_id = public.current_store_id() OR public.is_admin())
    )
  );
CREATE POLICY "Admin reads audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());

-- ============================================================================
-- ATOMIC SERVER-SIDE FUNCTIONS (RPC)
-- ============================================================================

-- 1. ATOMIC INVITATION CODE REDEMPTION (never grants admin, single-use, bound to applicant)
CREATE OR REPLACE FUNCTION public.redeem_seller_invitation_code(
  p_applicant_id UUID,
  p_code_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code RECORD;
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_applicant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Foydalanuvchi profili topilmadi.');
  END IF;
  IF v_profile.is_suspended THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sizning hisobingiz bloklangan.');
  END IF;

  SELECT * INTO v_code
  FROM public.seller_invitation_codes
  WHERE code_hash = p_code_hash AND applicant_id = p_applicant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Taklif kodi noto''g''ri yoki sizning arizangizga tegishli emas.');
  END IF;

  IF v_code.is_revoked THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ushbu taklif kodi administrator tomonidan bekor qilingan.');
  END IF;

  IF v_code.is_used THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ushbu taklif kodi allaqachon ishlatilgan.');
  END IF;

  IF v_code.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Taklif kodining amal qilish muddati tugagan. Yangi kod so''rang.');
  END IF;

  UPDATE public.seller_invitation_codes
  SET is_used = TRUE, used_at = NOW()
  WHERE id = v_code.id;

  IF v_code.application_id IS NOT NULL THEN
    UPDATE public.seller_applications
    SET status = 'approved', updated_at = TIMEZONE('Asia/Tashkent', NOW())
    WHERE id = v_code.application_id;
  END IF;

  -- Explicitly only promote customer -> seller, never downgrade or touch admin
  IF v_profile.role = 'customer' THEN
    UPDATE public.profiles
    SET role = 'seller', updated_at = TIMEZONE('Asia/Tashkent', NOW())
    WHERE id = p_applicant_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Taklif kodi tasdiqlandi! Endi do''koningiz ma''lumotlarini kiriting.');
END;
$$;

-- 2. ATOMIC MULTI-VENDOR CART CHECKOUT WITH ROW-LEVEL STOCK RESERVATION
CREATE OR REPLACE FUNCTION public.checkout_cart(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_city TEXT,
  p_delivery_address TEXT,
  p_delivery_notes TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash_on_delivery'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id UUID;
  v_checkout_group_id UUID := uuid_generate_v4();
  v_store_rec RECORD;
  v_item RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC(14,2);
  v_unit_price NUMERIC(14,2);
  v_created_orders JSONB := '[]'::jsonb;
  v_item_count INTEGER := 0;
BEGIN
  IF p_payment_method <> 'cash_on_delivery' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hozircha faqat yetkazib berilganda naqd/karta orqali to''lov mavjud.');
  END IF;

  SELECT id INTO v_cart_id FROM public.carts WHERE user_id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Savat topilmadi.');
  END IF;

  SELECT COUNT(*) INTO v_item_count FROM public.cart_items WHERE cart_id = v_cart_id;
  IF v_item_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Savatingiz bo''sh.');
  END IF;

  -- Lock all cart variants in deterministic order to prevent race-condition overselling / deadlocks
  FOR v_item IN
    SELECT
      ci.id AS cart_item_id,
      ci.quantity,
      pv.id AS variant_id,
      pv.stock_quantity,
      pv.size,
      pv.color,
      p.id AS product_id,
      p.name AS product_name,
      p.is_active,
      p.is_archived,
      s.id AS store_id,
      s.name AS store_name,
      s.status AS store_status
    FROM public.cart_items ci
    JOIN public.product_variants pv ON pv.id = ci.variant_id
    JOIN public.products p ON p.id = ci.product_id
    JOIN public.stores s ON s.id = p.store_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY pv.id
    FOR UPDATE OF pv
  LOOP
    IF v_item.store_status <> 'active' OR v_item.is_active = FALSE OR v_item.is_archived = TRUE THEN
      RAISE EXCEPTION 'Mahsulot (%) hozirda sotuvda mavjud emas.', v_item.product_name;
    END IF;
    IF v_item.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Mahsulot "%" (% / %) omborda yetarli emas. Mavjud: % dona.',
        v_item.product_name, v_item.size, v_item.color, v_item.stock_quantity;
    END IF;
  END LOOP;

  -- Group by store and create ONE order per store
  FOR v_store_rec IN
    SELECT DISTINCT s.id AS store_id, s.seller_id, s.name AS store_name
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    JOIN public.stores s ON s.id = p.store_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY s.id
  LOOP
    v_subtotal := 0;
    v_order_number := 'NOM-' || UPPER(SUBSTRING(REPLACE(uuid_generate_v4()::text, '-', ''), 1, 8));

    INSERT INTO public.orders (
      order_number, checkout_group_id, customer_id, store_id, status,
      subtotal, delivery_fee, total_amount, payment_method, payment_status,
      customer_name, customer_phone, delivery_city, delivery_address, delivery_notes
    ) VALUES (
      v_order_number, v_checkout_group_id, p_customer_id, v_store_rec.store_id, 'pending',
      0, 0, 0, p_payment_method, 'unpaid',
      p_customer_name, p_customer_phone, p_delivery_city, p_delivery_address, p_delivery_notes
    ) RETURNING id INTO v_order_id;

    FOR v_item IN
      SELECT
        ci.quantity,
        pv.id AS variant_id,
        pv.size,
        pv.color,
        p.id AS product_id,
        p.name AS product_name,
        p.base_price,
        p.discount_price,
        p.images
      FROM public.cart_items ci
      JOIN public.product_variants pv ON pv.id = ci.variant_id
      JOIN public.products p ON p.id = ci.product_id
      WHERE ci.cart_id = v_cart_id AND p.store_id = v_store_rec.store_id
    LOOP
      v_unit_price := COALESCE(v_item.discount_price, v_item.base_price);
      v_subtotal := v_subtotal + (v_unit_price * v_item.quantity);

      -- Reserve / decrement variant stock atomically
      UPDATE public.product_variants
      SET stock_quantity = stock_quantity - v_item.quantity
      WHERE id = v_item.variant_id;

      UPDATE public.products
      SET sales_count = sales_count + v_item.quantity
      WHERE id = v_item.product_id;

      INSERT INTO public.order_items (
        order_id, product_id, variant_id, product_name, product_image,
        size, color, unit_price, quantity, total_price
      ) VALUES (
        v_order_id,
        v_item.product_id,
        v_item.variant_id,
        v_item.product_name,
        CASE WHEN jsonb_array_length(v_item.images) > 0 THEN v_item.images->>0 ELSE NULL END,
        v_item.size,
        v_item.color,
        v_unit_price,
        v_item.quantity,
        v_unit_price * v_item.quantity
      );
    END LOOP;

    UPDATE public.orders
    SET subtotal = v_subtotal, total_amount = v_subtotal
    WHERE id = v_order_id;

    INSERT INTO public.deliveries (order_id, delivery_fee)
    VALUES (v_order_id, 0);

    INSERT INTO public.payment_records (order_id, provider, amount, currency, status)
    VALUES (v_order_id, p_payment_method, v_subtotal, 'UZS', 'unpaid');

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_store_rec.seller_id,
      'Yangi buyurtma: ' || v_order_number,
      p_customer_name || ' sizning do''koningizdan yangi buyurtma berdi.',
      'order',
      '/sotuvchi/buyurtmalar'
    );

    v_created_orders := v_created_orders || jsonb_build_object(
      'id', v_order_id,
      'order_number', v_order_number,
      'store_id', v_store_rec.store_id,
      'store_name', v_store_rec.store_name,
      'subtotal', v_subtotal
    );
  END LOOP;

  -- Clear user's cart inside the same transaction
  DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

  RETURN jsonb_build_object(
    'success', true,
    'checkout_group_id', v_checkout_group_id,
    'orders', v_created_orders
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. ATOMIC ORDER STATUS TRANSITION + STOCK RESTORATION ON REJECT/CANCEL
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id UUID,
  p_actor_id UUID,
  p_new_status TEXT,
  p_delivery_fee NUMERIC DEFAULT NULL,
  p_estimated_time TEXT DEFAULT NULL,
  p_delivery_method TEXT DEFAULT NULL,
  p_courier_contact TEXT DEFAULT NULL,
  p_tracking_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_store RECORD;
  v_actor RECORD;
  v_item RECORD;
  v_is_allowed BOOLEAN := FALSE;
  v_new_fee NUMERIC(14,2);
BEGIN
  SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Foydalanuvchi topilmadi.');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Buyurtma topilmadi.');
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE id = v_order.store_id;

  -- Authorization check
  IF v_actor.role = 'admin' THEN
    v_is_allowed := TRUE;
  ELSIF v_store.seller_id = p_actor_id THEN
    -- Seller allowed transitions
    IF (v_order.status = 'pending' AND p_new_status IN ('accepted', 'rejected'))
       OR (v_order.status = 'accepted' AND p_new_status IN ('preparing', 'cancelled'))
       OR (v_order.status = 'preparing' AND p_new_status IN ('ready', 'cancelled'))
       OR (v_order.status = 'ready' AND p_new_status IN ('shipped', 'cancelled'))
       OR (v_order.status = 'shipped' AND p_new_status IN ('delivered'))
       OR (v_order.status = p_new_status) THEN
      v_is_allowed := TRUE;
    END IF;
  ELSIF v_order.customer_id = p_actor_id THEN
    -- Customer can cancel pending/accepted orders, or confirm receipt on shipped
    IF (v_order.status IN ('pending', 'accepted') AND p_new_status = 'cancelled')
       OR (v_order.status = 'shipped' AND p_new_status = 'delivered') THEN
      v_is_allowed := TRUE;
    END IF;
  END IF;

  IF NOT v_is_allowed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ushbu holatga o''tishga ruxsat yo''q.');
  END IF;

  -- Restore reserved stock when transitioning into rejected or cancelled from a non-restored state
  IF p_new_status IN ('rejected', 'cancelled') AND v_order.status NOT IN ('rejected', 'cancelled', 'delivered') THEN
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order.id LOOP
      UPDATE public.product_variants
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.variant_id;

      UPDATE public.products
      SET sales_count = GREATEST(0, sales_count - v_item.quantity)
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  v_new_fee := COALESCE(p_delivery_fee, v_order.delivery_fee);

  UPDATE public.orders
  SET
    status = p_new_status,
    delivery_fee = v_new_fee,
    total_amount = v_order.subtotal + v_new_fee,
    customer_confirmed_at = CASE WHEN v_order.customer_id = p_actor_id AND p_new_status = 'delivered' THEN TIMEZONE('Asia/Tashkent', NOW()) ELSE customer_confirmed_at END
  WHERE id = v_order.id;

  UPDATE public.deliveries
  SET
    delivery_fee = v_new_fee,
    estimated_time = COALESCE(p_estimated_time, estimated_time),
    delivery_method = COALESCE(p_delivery_method, delivery_method),
    courier_contact = COALESCE(p_courier_contact, courier_contact),
    tracking_note = COALESCE(p_tracking_note, tracking_note),
    shipped_at = CASE WHEN p_new_status = 'shipped' AND shipped_at IS NULL THEN TIMEZONE('Asia/Tashkent', NOW()) ELSE shipped_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' AND delivered_at IS NULL THEN TIMEZONE('Asia/Tashkent', NOW()) ELSE delivered_at END
  WHERE order_id = v_order.id;

  -- Notify customer when seller updates order
  IF v_store.seller_id = p_actor_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_order.customer_id,
      'Buyurtma holati yangilandi: ' || v_order.order_number,
      v_store.name || ' buyurtmangiz holatini "' || p_new_status || '" ga o''zgartirdi.',
      'order',
      '/xaridor/buyurtmalar'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$;

-- 4. ATOMIC RATING RECALCULATION TRIGGER ON REVIEW INSERT
CREATE OR REPLACE FUNCTION public.recalculate_ratings_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE product_id = NEW.product_id), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;

  UPDATE public.stores
  SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE store_id = NEW.store_id), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE store_id = NEW.store_id)
  WHERE id = NEW.store_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_recalc ON public.reviews;
CREATE TRIGGER trg_review_recalc
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_ratings_on_review();
