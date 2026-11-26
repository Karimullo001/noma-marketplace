-- ============================================================================
-- NOMA FASHION MARKETPLACE - TELEGRAM INTEGRATION MIGRATION
-- Supports Customer Mini App, Seller Bot linking, Admin Bot notifications,
-- and reliable notifications_outbox with exponential backoff & RLS.
-- ============================================================================

-- 1. PROFILES: Add Telegram identifier columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_telegram_id
  ON public.profiles(telegram_id)
  WHERE telegram_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id
  ON public.profiles(telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- 2. TELEGRAM LINK CODES (Temporary 10-minute hashed codes for linking accounts)
CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'seller', 'admin')),
  code_hash TEXT NOT NULL UNIQUE,
  code_prefix TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

CREATE INDEX IF NOT EXISTS idx_tg_link_code_hash ON public.telegram_link_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_tg_link_user_id ON public.telegram_link_codes(user_id);

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own telegram link codes" ON public.telegram_link_codes
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- 3. NOTIFICATIONS OUTBOX (Reliable queue for Telegram messages)
CREATE TABLE IF NOT EXISTS public.notifications_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_type TEXT NOT NULL CHECK (bot_type IN ('customer', 'seller', 'admin')),
  chat_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Tashkent', NOW())
);

CREATE INDEX IF NOT EXISTS idx_outbox_queue ON public.notifications_outbox(status, next_attempt_at);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_outbox_updated_at') THEN
    CREATE TRIGGER trg_outbox_updated_at
      BEFORE UPDATE ON public.notifications_outbox
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.notifications_outbox ENABLE ROW LEVEL SECURITY;

-- Outbox is strictly internal and accessible only by service_role
CREATE POLICY "Service role only outbox access" ON public.notifications_outbox
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 4. ATOMIC RPC: REDEEM TELEGRAM LINK CODE
CREATE OR REPLACE FUNCTION public.redeem_telegram_link_code(
  p_code_hash TEXT,
  p_chat_id TEXT,
  p_telegram_id TEXT,
  p_telegram_username TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_profile RECORD;
  v_store RECORD;
BEGIN
  -- Find link code atomically
  SELECT * INTO v_link
  FROM public.telegram_link_codes
  WHERE code_hash = p_code_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bog''lanish kodi noto''g''ri.');
  END IF;

  IF v_link.is_used THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ushbu kod allaqachon ishlatilgan.');
  END IF;

  IF v_link.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kodning amal qilish muddati tugagan (10 daqiqa).');
  END IF;

  -- Verify user profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_link.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Foydalanuvchi profili topilmadi.');
  END IF;

  IF v_profile.is_suspended THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hisob ma''muriyat tomonidan to''xtatilgan.');
  END IF;

  -- For seller role, must be active seller with store
  IF v_link.role = 'seller' THEN
    IF v_profile.role <> 'seller' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Faqat tasdiqlangan sotuvchilar do''kon botini ulay oladi.');
    END IF;

    SELECT * INTO v_store
    FROM public.stores
    WHERE seller_id = v_profile.id AND status = 'active';

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Sizda faol do''kon mavjud emas.');
    END IF;
  END IF;

  -- Mark code as used
  UPDATE public.telegram_link_codes
  SET is_used = TRUE, used_at = TIMEZONE('Asia/Tashkent', NOW())
  WHERE id = v_link.id;

  -- Link telegram identifiers to profile
  UPDATE public.profiles
  SET
    telegram_id = COALESCE(p_telegram_id, telegram_id),
    telegram_chat_id = p_chat_id,
    telegram_username = COALESCE(p_telegram_username, telegram_username),
    updated_at = TIMEZONE('Asia/Tashkent', NOW())
  WHERE id = v_profile.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_profile.id,
    'role', v_profile.role,
    'full_name', v_profile.full_name,
    'store_id', v_store.id,
    'store_name', v_store.name
  );
END;
$$;

-- Secure the RPC function: callable only by authenticated / service_role
REVOKE EXECUTE ON FUNCTION public.redeem_telegram_link_code(TEXT, TEXT, TEXT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.redeem_telegram_link_code(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
