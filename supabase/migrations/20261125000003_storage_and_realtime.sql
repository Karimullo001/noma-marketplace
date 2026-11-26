-- ============================================================================
-- NOMA FASHION MARKETPLACE - SUPABASE STORAGE BUCKETS & REALTIME SETUP
-- ============================================================================

-- Create Storage buckets (public read for marketplace imagery, authenticated seller upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('store-logos', 'store-logos', TRUE, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public reads product images" ON storage.objects
  FOR SELECT USING (bucket_id IN ('product-images', 'store-logos'));

CREATE POLICY "Sellers upload own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('product-images', 'store-logos')
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Sellers delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('product-images', 'store-logos')
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Enable Supabase Realtime on required marketplace tables
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
