"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Store as StoreIcon,
  Package,
  PlusCircle,
  ShoppingBag,
  Boxes,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { NomaLogo } from "@/components/shared/noma-logo";
import { createClient } from "@/lib/supabase/client";
import type { Store } from "@/types/database";

const NAV_ITEMS = [
  { label: "Boshqaruv", href: "/sotuvchi", icon: LayoutDashboard },
  { label: "Do'konim", href: "/sotuvchi/dokonim", icon: StoreIcon },
  { label: "Mahsulotlar", href: "/sotuvchi/mahsulotlar", icon: Package },
  { label: "Mahsulot qo'shish", href: "/sotuvchi/mahsulot-qoshish", icon: PlusCircle },
  { label: "Buyurtmalar", href: "/sotuvchi/buyurtmalar", icon: ShoppingBag },
  { label: "Ombor", href: "/sotuvchi/ombor", icon: Boxes },
  { label: "Sharhlar", href: "/sotuvchi/sharhlar", icon: MessageSquare },
  { label: "Tahlil", href: "/sotuvchi/tahlil", icon: BarChart3 },
  { label: "Sozlamalar", href: "/sotuvchi/sozlamalar", icon: Settings },
];

export function SellerSidebar({ store }: { store: Store }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/sotuvchi/kirish");
    router.refresh();
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="h-18 px-5 py-4 border-b border-border">
          <NomaLogo subtitle="Sotuvchi" />
        </div>

        <div className="m-4 p-3 rounded-2xl bg-muted/60 border border-border">
          <div className="text-xs font-bold text-primary truncate">{store.name}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-muted-foreground">{store.city}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                store.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {store.status === "active" ? "Faol" : "To'xtatilgan"}
            </span>
          </div>
        </div>

        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/sotuvchi"
                ? pathname === "/sotuvchi"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  active
                    ? "bg-accent text-white shadow-sm"
                    : "text-primary hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border space-y-2">
        <Link
          href={`/xaridor/dokon/${store.slug}`}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-muted"
        >
          <ExternalLink className="w-4 h-4 text-accent" />
          <span>Do&apos;konni bozorda ko&apos;rish</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Chiqish</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="w-64 bg-white border-r border-border hidden lg:block shrink-0">
        {navContent}
      </aside>

      {/* Mobile topbar + drawer */}
      <div className="lg:hidden bg-white border-b border-border px-4 h-14 flex items-center justify-between sticky top-0 z-30">
        <NomaLogo subtitle="Sotuvchi" />
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-muted"
          aria-label="Menyu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex">
          <div className="w-72 bg-white h-full overflow-y-auto">{navContent}</div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
