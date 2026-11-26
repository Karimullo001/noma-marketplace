import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Store as StoreIcon, Tag, Clock, ShoppingBag, Database } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { APP_CONFIG, isSupabaseConfigured } from "@/lib/config";
import { ProductCard } from "@/components/xaridor/product-card";
import type { Category, Product, Store } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function XaridorHomePage() {
  const supabaseReady = isSupabaseConfigured();
  const supabase = await createServerSupabaseClient();

  let categories: Category[] = [];
  let newArrivals: Product[] = [];
  let popularProducts: Product[] = [];
  let discountProducts: Product[] = [];
  let stores: Store[] = [];
  let recentlyViewed: Product[] = [];
  let favoriteIds = new Set<string>();

  if (supabase) {
    const [catRes, newRes, popRes, discRes, storeRes, userRes] = await Promise.all([
      supabase.from("categories").select("*").is("parent_id", null).eq("is_active", true).order("display_order"),
      supabase
        .from("products")
        .select("*, store:stores!inner(*), brand:brands(*), variants:product_variants(*)")
        .eq("is_active", true)
        .eq("is_archived", false)
        .eq("store.status", "active")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select("*, store:stores!inner(*), brand:brands(*), variants:product_variants(*)")
        .eq("is_active", true)
        .eq("is_archived", false)
        .eq("store.status", "active")
        .order("sales_count", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select("*, store:stores!inner(*), brand:brands(*), variants:product_variants(*)")
        .eq("is_active", true)
        .eq("is_archived", false)
        .eq("store.status", "active")
        .not("discount_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("stores").select("*").eq("status", "active").order("rating", { ascending: false }).limit(6),
      supabase.auth.getUser(),
    ]);

    categories = (catRes.data as Category[]) || [];
    newArrivals = (newRes.data as Product[]) || [];
    popularProducts = (popRes.data as Product[]) || [];
    discountProducts = (discRes.data as Product[]) || [];
    stores = (storeRes.data as Store[]) || [];

    const user = userRes.data?.user;
    if (user) {
      const [favRes, rvRes] = await Promise.all([
        supabase.from("favorites").select("product_id").eq("user_id", user.id),
        supabase
          .from("recently_viewed")
          .select("product:products(*, store:stores(*), brand:brands(*), variants:product_variants(*))")
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(4),
      ]);
      favoriteIds = new Set((favRes.data || []).map((f) => f.product_id));
      recentlyViewed = (rvRes.data || [])
        .map((r) => r.product as unknown as Product)
        .filter((p) => p && p.is_active && !p.is_archived);
    }
  }

  return (
    <div className="space-y-12 pb-16">
      {/* Configuration notice only when Supabase env is not yet provided */}
      {!supabaseReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 text-xs text-amber-900">
            <Database className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Ma&apos;lumotlar bazasi ulanmagan:</strong> Haqiqiy mahsulotlar va autentifikatsiya ishlashi uchun{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">.env.local</code> da Supabase kalitlarini kiriting va migratsiyalarni ishga tushiring.
            </span>
          </div>
        </div>
      )}

      {/* Hero Banner with Canva Visual & Violet Luxury Theme */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="rounded-3xl bg-primary text-primary-foreground relative overflow-hidden border border-border shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 space-y-5 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent-100 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                {APP_CONFIG.defaultCity} shahri moda bozori
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
                Namangan do&apos;konlari endi bitta platformada
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed max-w-xl">
                Shahringizdagi do&apos;konlarning real ombor qoldiqlari, o&apos;lchamlari va narxlari. 
                Buyurtma bering, kuryer eshigingizgacha yetkazganda to&apos;lang.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/xaridor/katalog"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs sm:text-sm font-semibold transition shadow-md active:scale-95"
                >
                  <span>Katalogni ochish</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/sotuvchi"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold border border-white/15 transition active:scale-95"
                >
                  <StoreIcon className="w-4 h-4 text-accent-300" />
                  <span>Do&apos;koningizni ulang</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative h-56 sm:h-72 lg:h-full min-h-[260px] overflow-hidden bg-primary-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/banners/hero-banner.png"
                alt="NOMA Namangan Moda To'plami"
                className="w-full h-full object-cover object-center opacity-90 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-primary via-transparent to-transparent opacity-80" />
            </div>
          </div>
        </div>
      </section>

      {/* 3 Canva Category Banners Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/xaridor/katalog?category=erkaklar"
            className="group relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-border shadow-sm block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/banners/cat-erkaklar.png"
              alt="Erkaklar To'plami"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
              <span className="text-xs font-semibold text-accent-300 uppercase tracking-wider">Kolleksiya</span>
              <span className="text-base sm:text-lg font-bold text-white">Erkaklar Kiyimlari &rarr;</span>
            </div>
          </Link>

          <Link
            href="/xaridor/katalog?category=ayollar"
            className="group relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-border shadow-sm block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/banners/cat-ayollar.png"
              alt="Ayollar Liboslari"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
              <span className="text-xs font-semibold text-accent-300 uppercase tracking-wider">Kolleksiya</span>
              <span className="text-base sm:text-lg font-bold text-white">Ayollar Liboslari &rarr;</span>
            </div>
          </Link>

          <Link
            href="/xaridor/katalog?category=aksessuarlar"
            className="group relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-border shadow-sm block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/banners/cat-aksessuarlar.png"
              alt="Poyabzal va Aksessuarlar"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
              <span className="text-xs font-semibold text-accent-300 uppercase tracking-wider">Kolleksiya</span>
              <span className="text-base sm:text-lg font-bold text-white">Poyabzal & Aksessuarlar &rarr;</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Bo&apos;limlar</h2>
          <Link href="/xaridor/katalog" className="text-xs font-semibold text-accent hover:underline">
            Barchasi &rarr;
          </Link>
        </div>
        {categories.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-border text-xs text-muted-foreground">
            Hozircha bo&apos;limlar bazaga kiritilmagan (seed.sql migratsiyasini ishga tushiring).
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/xaridor/katalog?category=${encodeURIComponent(cat.slug)}`}
                className="p-4 rounded-2xl bg-white border border-border hover:border-accent hover:shadow-sm transition flex flex-col gap-1"
              >
                <span className="text-sm font-bold text-primary">{cat.name}</span>
                <span className="text-xs text-muted-foreground">Tovarlarni ko&apos;rish &rarr;</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Yangi kelganlar</h2>
          <Link href="/xaridor/katalog?sort=newest" className="text-xs font-semibold text-accent hover:underline">
            Barchasini ko&apos;rish &rarr;
          </Link>
        </div>

        {newArrivals.length === 0 ? (
          <EmptySectionState
            title="Hozircha mahsulotlar joylanmagan"
            description="Do'konlar o'z mahsulotlarini qo'shganda bu yerda avtomatik paydo bo'ladi."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} initialFavorited={favoriteIds.has(p.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Discounts */}
      {discountProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-primary inline-flex items-center gap-2">
              <Tag className="w-5 h-5 text-accent" />
              Chegirmadagi liboslar
            </h2>
            <Link href="/xaridor/katalog?discount=1" className="text-xs font-semibold text-accent hover:underline">
              Barcha chegirmalar &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {discountProducts.map((p) => (
              <ProductCard key={p.id} product={p} initialFavorited={favoriteIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Popular Products */}
      {popularProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-primary">Ommabop mahsulotlar</h2>
            <Link href="/xaridor/katalog?sort=popular" className="text-xs font-semibold text-accent hover:underline">
              Barchasi &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {popularProducts.map((p) => (
              <ProductCard key={p.id} product={p} initialFavorited={favoriteIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Active Stores */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">
            {APP_CONFIG.defaultCity} do&apos;konlari
          </h2>
        </div>

        {stores.length === 0 ? (
          <EmptySectionState
            title="Hozircha faol do'konlar yo'q"
            description="Sotuvchilar taklif kodi orqali ro'yxatdan o'tgach, ularning do'konlari shu yerda ko'rinadi."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/xaridor/dokon/${store.slug}`}
                className="p-5 rounded-2xl bg-white border border-border hover:border-accent transition flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border">
                  {store.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <StoreIcon className="w-6 h-6 text-accent" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-primary truncate">{store.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{store.address}</p>
                  <span className="text-[11px] font-semibold text-accent mt-1 inline-block">
                    {store.category} • ★ {Number(store.rating || 0).toFixed(1)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <h2 className="text-xl font-bold text-primary inline-flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Yaqinda ko&apos;rilganlar
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentlyViewed.map((p) => (
              <ProductCard key={p.id} product={p} initialFavorited={favoriteIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptySectionState({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-10 rounded-2xl bg-white border border-border text-center space-y-2">
      <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
        <ShoppingBag className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-primary">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{description}</p>
    </div>
  );
}
