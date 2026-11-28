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

      {/* Compact Uzum-inspired Promo Banner */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-accent-900 text-white p-5 sm:p-8 shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-accent-200 text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {APP_CONFIG.defaultCity} Moda Marketi
              </span>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-snug">
                Namangan do&apos;konlari endi bitta ilovada
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Real ombor qoldiqlari, aniq o&apos;lchamlar va eshikgacha yetkazib berish.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Link
                href="/xaridor/ai-stilist"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black transition shadow-sm active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Stilist</span>
              </Link>
              <Link
                href="/xaridor/katalog"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-xs font-bold transition shadow-sm active:scale-95"
              >
                <span>Katalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-accent-500/20 rounded-full blur-2xl pointer-events-none" />
        </div>
      </section>

      {/* Uzum-style Horizontal Quick Category Strip */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {[
            { label: "✨ AI Stilist", href: "/xaridor/ai-stilist", highlight: true },
            { label: "👔 Erkaklar", href: "/xaridor/katalog?gender=men" },
            { label: "👗 Ayollar", href: "/xaridor/katalog?gender=women" },
            { label: "👟 Oyoq kiyim", href: "/xaridor/katalog?category=poyabzal" },
            { label: "🏃 Sport", href: "/xaridor/katalog?gender=sport" },
            { label: "🏷️ Chegirmalar", href: "/xaridor/katalog?discount=1" },
            ...categories.map((c) => ({
              label: c.name,
              href: `/xaridor/katalog?category=${encodeURIComponent(c.slug)}`,
              highlight: false,
            })),
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap ${
                item.highlight
                  ? "bg-accent-50 border-accent-200 text-accent-800 hover:bg-accent-100"
                  : "bg-white border-border text-primary hover:border-accent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
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
