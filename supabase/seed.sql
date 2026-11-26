-- ============================================================================
-- NOMA FASHION MARKETPLACE - SEED DATA (CATEGORIES ONLY — NO FAKE USERS/PRODUCTS)
-- ============================================================================

INSERT INTO public.categories (id, name, slug, parent_id, icon, display_order) VALUES
('11111111-0000-0000-0000-000000000001', 'Erkaklar', 'erkaklar', NULL, 'Shirt', 1),
('11111111-0000-0000-0000-000000000002', 'Ayollar', 'ayollar', NULL, 'Sparkles', 2),
('11111111-0000-0000-0000-000000000003', 'Bolalar', 'bolalar', NULL, 'Smile', 3),
('11111111-0000-0000-0000-000000000004', 'Sport', 'sport', NULL, 'Activity', 4),
('11111111-0000-0000-0000-000000000005', 'Aksessuarlar', 'aksessuarlar', NULL, 'Watch', 5)
ON CONFLICT (slug) DO NOTHING;

-- Erkaklar subcategories
INSERT INTO public.categories (id, name, slug, parent_id, icon, display_order) VALUES
('11111111-0001-0000-0000-000000000001', 'Futbolkalar', 'erkaklar-futbolkalar', '11111111-0000-0000-0000-000000000001', 'Shirt', 1),
('11111111-0001-0000-0000-000000000002', 'Ko''ylaklar', 'erkaklar-koylaklar', '11111111-0000-0000-0000-000000000001', 'Shirt', 2),
('11111111-0001-0000-0000-000000000003', 'Shimlar', 'erkaklar-shimlar', '11111111-0000-0000-0000-000000000001', 'Scissors', 3),
('11111111-0001-0000-0000-000000000004', 'Jinsilar', 'erkaklar-jinsilar', '11111111-0000-0000-0000-000000000001', 'Scissors', 4),
('11111111-0001-0000-0000-000000000005', 'Kurtkalar', 'erkaklar-kurtkalar', '11111111-0000-0000-0000-000000000001', 'Layers', 5),
('11111111-0001-0000-0000-000000000006', 'Kostyumlar', 'erkaklar-kostyumlar', '11111111-0000-0000-0000-000000000001', 'Briefcase', 6),
('11111111-0001-0000-0000-000000000007', 'Poyabzallar', 'erkaklar-poyabzallar', '11111111-0000-0000-0000-000000000001', 'Footprints', 7)
ON CONFLICT (slug) DO NOTHING;

-- Ayollar subcategories
INSERT INTO public.categories (id, name, slug, parent_id, icon, display_order) VALUES
('11111111-0002-0000-0000-000000000001', 'Ko''ylaklar va Liboslar', 'ayollar-liboslar', '11111111-0000-0000-0000-000000000002', 'Sparkles', 1),
('11111111-0002-0000-0000-000000000002', 'Toplar va Bluzkalar', 'ayollar-toplar', '11111111-0000-0000-0000-000000000002', 'Shirt', 2),
('11111111-0002-0000-0000-000000000003', 'Shimlar', 'ayollar-shimlar', '11111111-0000-0000-0000-000000000002', 'Scissors', 3),
('11111111-0002-0000-0000-000000000004', 'Jinsilar', 'ayollar-jinsilar', '11111111-0000-0000-0000-000000000002', 'Scissors', 4),
('11111111-0002-0000-0000-000000000005', 'Yubkalar', 'ayollar-yubkalar', '11111111-0000-0000-0000-000000000002', 'Sparkles', 5),
('11111111-0002-0000-0000-000000000006', 'Ustki kiyimlar', 'ayollar-ustki-kiyimlar', '11111111-0000-0000-0000-000000000002', 'Layers', 6),
('11111111-0002-0000-0000-000000000007', 'Poyabzallar', 'ayollar-poyabzallar', '11111111-0000-0000-0000-000000000002', 'Footprints', 7),
('11111111-0002-0000-0000-000000000008', 'Sumkalar', 'ayollar-sumkalar', '11111111-0000-0000-0000-000000000002', 'ShoppingBag', 8)
ON CONFLICT (slug) DO NOTHING;

-- Bolalar subcategories
INSERT INTO public.categories (id, name, slug, parent_id, icon, display_order) VALUES
('11111111-0003-0000-0000-000000000001', 'O''g''il bolalar kiyimi', 'bolalar-ogil', '11111111-0000-0000-0000-000000000003', 'Shirt', 1),
('11111111-0003-0000-0000-000000000002', 'Qiz bolalar kiyimi', 'bolalar-qiz', '11111111-0000-0000-0000-000000000003', 'Sparkles', 2),
('11111111-0003-0000-0000-000000000003', 'Chaqaloqlar kiyimi', 'bolalar-chaqaloq', '11111111-0000-0000-0000-000000000003', 'Smile', 3),
('11111111-0003-0000-0000-000000000004', 'Bolalar poyabzali', 'bolalar-poyabzal', '11111111-0000-0000-0000-000000000003', 'Footprints', 4)
ON CONFLICT (slug) DO NOTHING;

-- Sport subcategories
INSERT INTO public.categories (id, name, slug, parent_id, icon, display_order) VALUES
('11111111-0004-0000-0000-000000000001', 'Sport kiyimlari', 'sport-kiyimlari', '11111111-0000-0000-0000-000000000004', 'Activity', 1),
('11111111-0004-0000-0000-000000000002', 'Krossovkalar', 'sport-krossovkalar', '11111111-0000-0000-0000-000000000004', 'Footprints', 2),
('11111111-0004-0000-0000-000000000003', 'Mashg''ulot aksessuarlari', 'sport-aksessuarlar', '11111111-0000-0000-0000-000000000004', 'Tag', 3)
ON CONFLICT (slug) DO NOTHING;

-- Aksessuarlar subcategories
INSERT INTO public.categories (id, name, slug, parent_id, icon, display_order) VALUES
('11111111-0005-0000-0000-000000000001', 'Soatlar', 'aksessuarlar-soatlar', '11111111-0000-0000-0000-000000000005', 'Watch', 1),
('11111111-0005-0000-0000-000000000002', 'Kamarlar', 'aksessuarlar-kamarlar', '11111111-0000-0000-0000-000000000005', 'Tag', 2),
('11111111-0005-0000-0000-000000000003', 'Ko''zoynaklar', 'aksessuarlar-kozoynaklar', '11111111-0000-0000-0000-000000000005', 'Glasses', 3),
('11111111-0005-0000-0000-000000000004', 'Sumkalar', 'aksessuarlar-sumkalar', '11111111-0000-0000-0000-000000000005', 'ShoppingBag', 4)
ON CONFLICT (slug) DO NOTHING;
