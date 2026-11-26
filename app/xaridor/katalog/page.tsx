import React from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/xaridor/product-card";
import type { Brand, Category, Product, Store } from "@/types/database";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  category?: string;
  gender?: string;
  store?: string;
  brand?: string;
  size?: string;
  color?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  inStock?: string;
  discount?: string;
  sort?: string;
}

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerSupabaseClient();

  let products: Product[] = [];
  let categories: Category[] = [];
  let stores: Store[] = [];
  let brands: Brand[] = [];
  let favoriteIds = new Set<string>();

  if (supabase) {
    const [catRes, storeRes, brandRes, prodRes, userRes] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
      supabase.from("stores").select("*").eq("status", "active").order("name"),
      supabase.from("brands").select("*").order("name"),
      supabase
        .from("products")
        .select("*, store:stores!inner(*), category:categories(*), brand:brands(*), variants:product_variants(*)")
        .eq("is_active", true)
        .eq("is_archived", false)
        .eq("store.status", "active"),
      supabase.auth.getUser(),
    ]);

    categories = (catRes.data as Category[]) || [];
    stores = (storeRes.data as Store[]) || [];
    brands = (brandRes.data as Brand[]) || [];
    let rows = (prodRes.data as Product[]) || [];

    if (userRes.data?.user) {
      const { data: favs } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", userRes.data.user.id);
      favoriteIds = new Set((favs || []).map((f) => f.product_id));
    }

    // Apply comprehensive filters cleanly
    const q = searchParams.q?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.brand?.name.toLowerCase().includes(q) ||
          p.store?.name.toLowerCase().includes(q)
      );
    }

    if (searchParams.category) {
      const targetCat = categories.find((c) => c.slug === searchParams.category);
      if (targetCat) {
        const childIds = categories.filter((c) => c.parent_id === targetCat.id).map((c) => c.id);
        const validIds = new Set([targetCat.id, ...childIds]);
        rows = rows.filter((p) => validIds.has(p.category_id));
      }
    }

    if (searchParams.gender) {
      rows = rows.filter((p) => p.gender === searchParams.gender || p.gender === "unisex");
    }

    if (searchParams.store) {
      rows = rows.filter((p) => p.store_id === searchParams.store);
    }

    if (searchParams.brand) {
      rows = rows.filter((p) => p.brand_id === searchParams.brand);
    }

    if (searchParams.size) {
      const s = searchParams.size.toLowerCase();
      rows = rows.filter((p) =>
        (p.variants || []).some((v) => v.size.toLowerCase() === s && v.stock_quantity > 0)
      );
    }

    if (searchParams.color) {
      const c = searchParams.color.toLowerCase();
      rows = rows.filter((p) =>
        (p.variants || []).some((v) => v.color.toLowerCase().includes(c) && v.stock_quantity > 0)
      );
    }

    if (searchParams.minPrice) {
      const min = Number(searchParams.minPrice);
      if (!Number.isNaN(min)) {
        rows = rows.filter((p) => (p.discount_price ?? p.base_price) >= min);
      }
    }

    if (searchParams.maxPrice) {
      const max = Number(searchParams.maxPrice);
      if (!Number.isNaN(max)) {
        rows = rows.filter((p) => (p.discount_price ?? p.base_price) <= max);
      }
    }

    if (searchParams.minRating) {
      const r = Number(searchParams.minRating);
      if (!Number.isNaN(r)) rows = rows.filter((p) => Number(p.rating) >= r);
    }

    if (searchParams.inStock === "1") {
      rows = rows.filter((p) => (p.variants || []).some((v) => v.stock_quantity > 0));
    }

    if (searchParams.discount === "1") {
      rows = rows.filter((p) => p.discount_price != null && p.discount_price < p.base_price);
    }

    // Sorting
    const sort = searchParams.sort || "recommended";
    if (sort === "price_asc") {
      rows.sort((a, b) => (a.discount_price ?? a.base_price) - (b.discount_price ?? b.base_price));
    } else if (sort === "price_desc") {
      rows.sort((a, b) => (b.discount_price ?? b.base_price) - (a.discount_price ?? a.base_price));
    } else if (sort === "newest") {
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "popular") {
      rows.sort((a, b) => b.sales_count - a.sales_count);
    } else if (sort === "rating") {
      rows.sort((a, b) => Number(b.rating) - Number(a.rating));
    }

    products = rows;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-primary">Katalog</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Topilgan mahsulotlar soni: <strong className="text-primary">{products.length} ta</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Server-driven GET Filter Form (instant, zero JS hydration errors, bookmarkable URLs) */}
        <form
          method="GET"
          action="/xaridor/katalog"
          className="bg-white p-5 rounded-2xl border border-border space-y-4 lg:sticky lg:top-32"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-sm font-bold text-primary inline-flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-accent" />
              Filtrlar
            </span>
            <Link href="/xaridor/katalog" className="text-xs text-accent hover:underline font-medium">
              Tozalash
            </Link>
          </div>

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Qidiruv</label>
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q || ""}
              placeholder="Nom, brend, do'kon..."
              className="w-full h-9 rounded-lg border border-border px-3 text-xs bg-background"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Saralash</label>
            <select
              name="sort"
              defaultValue={searchParams.sort || "recommended"}
              className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
            >
              <option value="recommended">Tavsiya etilgan</option>
              <option value="price_asc">Avval arzonlari</option>
              <option value="price_desc">Avval qimmatlari</option>
              <option value="newest">Eng yangilari</option>
              <option value="popular">Eng ommaboplari</option>
              <option value="rating">Yuqori reyting</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Bo&apos;lim</label>
            <select
              name="category"
              defaultValue={searchParams.category || ""}
              className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
            >
              <option value="">Barcha bo&apos;limlar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.parent_id ? `— ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Jinsi / Yo&apos;nalish</label>
            <select
              name="gender"
              defaultValue={searchParams.gender || ""}
              className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
            >
              <option value="">Barchasi</option>
              <option value="men">Erkaklar</option>
              <option value="women">Ayollar</option>
              <option value="children">Bolalar</option>
              <option value="sport">Sport</option>
              <option value="accessories">Aksessuarlar</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Narx (so&apos;m)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                name="minPrice"
                defaultValue={searchParams.minPrice || ""}
                placeholder="Dan"
                className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
              />
              <input
                type="number"
                name="maxPrice"
                defaultValue={searchParams.maxPrice || ""}
                placeholder="Gacha"
                className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-primary block mb-1">O&apos;lcham</label>
              <input
                type="text"
                name="size"
                defaultValue={searchParams.size || ""}
                placeholder="M, L, 42..."
                className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Rang</label>
              <input
                type="text"
                name="color"
                defaultValue={searchParams.color || ""}
                placeholder="Qora, Oq..."
                className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Do&apos;kon</label>
            <select
              name="store"
              defaultValue={searchParams.store || ""}
              className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
            >
              <option value="">Barcha do&apos;konlar</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {brands.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Brend</label>
              <select
                name="brand"
                defaultValue={searchParams.brand || ""}
                className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
              >
                <option value="">Barcha brendlar</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Minimal reyting</label>
            <select
              name="minRating"
              defaultValue={searchParams.minRating || ""}
              className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-background"
            >
              <option value="">Farqi yo&apos;q</option>
              <option value="4">4.0 ★ va yuqori</option>
              <option value="4.5">4.5 ★ va yuqori</option>
            </select>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="inStock" value="1" defaultChecked={searchParams.inStock === "1"} />
              <span>Faqat omborda mavjudlari</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="discount" value="1" defaultChecked={searchParams.discount === "1"} />
              <span>Faqat chegirmadagi tovarlar</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs font-bold transition"
          >
            Filtrlarni qo&apos;llash
          </button>
        </form>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {products.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-border text-center space-y-3">
              <Search className="w-10 h-10 text-muted-foreground mx-auto opacity-60" />
              <h3 className="text-base font-bold text-primary">Mos mahsulot topilmadi</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Qidiruv so&apos;rovingiz yoki filtrlaringiz bo&apos;yicha hozircha mahsulot yo&apos;q.
              </p>
              <Link
                href="/xaridor/katalog"
                className="inline-block px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold"
              >
                Filtrlarni tozalash
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} initialFavorited={favoriteIds.has(p.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
