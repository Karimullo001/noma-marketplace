"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  MapPin,
  LogOut,
  Package,
  Store as StoreIcon,
} from "lucide-react";
import { NomaLogo } from "@/components/shared/noma-logo";
import { createClient } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/lib/config";
import type { Category, Profile } from "@/types/database";

interface XaridorHeaderProps {
  categories: Category[];
  profile: Profile | null;
  cartCount: number;
  favoritesCount: number;
}

export function XaridorHeader({
  categories,
  profile,
  cartCount,
  favoritesCount,
}: XaridorHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [city, setCity] = useState<string>(APP_CONFIG.defaultCity);

  const mainCategories = categories.filter((c) => !c.parent_id);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/xaridor/katalog?q=${encodeURIComponent(q)}` : "/xaridor/katalog");
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/xaridor");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      {/* Top utility bar */}
      <div className="bg-primary text-primary-foreground text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-accent-400" />
            <span className="text-primary-200">Shahar:</span>
            <select
              aria-label="Shahar tanlash"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer"
            >
              {APP_CONFIG.supportedCities.map((c) => (
                <option key={c} value={c} className="text-primary">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sotuvchi"
              className="hover:text-accent-200 transition inline-flex items-center gap-1 font-medium"
            >
              <StoreIcon className="w-3.5 h-3.5 text-accent-400" />
              <span>Sotuvchi kabineti</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-18 py-3 flex items-center justify-between gap-4">
          <Link href="/xaridor" className="shrink-0">
            <NomaLogo subtitle={city} />
          </Link>

          {/* Search bar (Desktop) */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kiyim, poyabzal, brend yoki do'kon nomini qidiring..."
                className="w-full h-11 bg-white border border-border rounded-xl pl-11 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-accent hover:bg-accent-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Qidirish
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <Link
              href="/xaridor/sevimlilar"
              className="relative p-2.5 rounded-xl text-primary hover:bg-muted transition"
              title="Saralanganlar"
            >
              <Heart className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </Link>

            <Link
              href="/xaridor/savat"
              className="relative p-2.5 rounded-xl text-primary hover:bg-muted transition"
              title="Savat"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {profile ? (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link
                  href="/xaridor/buyurtmalar"
                  className="px-3 py-2 rounded-xl bg-white border border-border hover:bg-muted text-xs font-semibold text-primary inline-flex items-center gap-1.5 transition"
                >
                  <Package className="w-3.5 h-3.5 text-accent" />
                  <span>Buyurtmalar</span>
                </Link>
                <Link
                  href="/xaridor/profil"
                  className="px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary-800 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">{profile.full_name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Chiqish"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/xaridor/kirish"
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
              >
                <User className="w-4 h-4" />
                <span>Kirish</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl text-primary hover:bg-muted"
              aria-label="Menyu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Category chips bar (Desktop) */}
        <nav className="hidden md:flex items-center gap-2 pb-3 overflow-x-auto text-xs font-medium">
          <Link
            href="/xaridor/katalog"
            className="px-3.5 py-1.5 rounded-full bg-primary text-white whitespace-nowrap hover:bg-primary-800 transition"
          >
            Barcha mahsulotlar
          </Link>
          {mainCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/xaridor/katalog?category=${encodeURIComponent(cat.slug)}`}
              className="px-3.5 py-1.5 rounded-full bg-white border border-border text-primary hover:border-accent hover:text-accent whitespace-nowrap transition"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-border space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kiyim, do'kon, brend..."
                className="w-full h-10 bg-white border border-border rounded-xl pl-10 pr-20 text-sm"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                Izlash
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/xaridor/katalog"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold"
              >
                Katalog
              </Link>
              {mainCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/xaridor/katalog?category=${encodeURIComponent(cat.slug)}`}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-1.5 rounded-full bg-white border border-border text-xs font-medium"
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            {profile && (
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <div className="flex gap-3">
                  <Link href="/xaridor/buyurtmalar" onClick={() => setMobileOpen(false)} className="font-semibold text-accent">
                    Buyurtmalarim
                  </Link>
                  <Link href="/xaridor/profil" onClick={() => setMobileOpen(false)} className="font-semibold text-primary">
                    Profil
                  </Link>
                </div>
                <button onClick={handleLogout} className="text-rose-600 font-semibold">
                  Chiqish
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
