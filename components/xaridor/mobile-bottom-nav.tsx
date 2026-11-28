"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Sparkles, ShoppingBag, User } from "lucide-react";

export function MobileBottomNav({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();

  const items = [
    { href: "/xaridor", label: "Asosiy", icon: Home, match: (p: string) => p === "/xaridor" },
    { href: "/xaridor/katalog", label: "Katalog", icon: LayoutGrid, match: (p: string) => p.startsWith("/xaridor/katalog") },
    { href: "/xaridor/ai-stilist", label: "AI Stilist", icon: Sparkles, match: (p: string) => p.startsWith("/xaridor/ai-stilist") },
    { href: "/xaridor/savat", label: "Savat", icon: ShoppingBag, badge: cartCount, match: (p: string) => p.startsWith("/xaridor/savat") },
    { href: "/xaridor/profil", label: "Profil", icon: User, match: (p: string) => p.startsWith("/xaridor/profil") || p.startsWith("/xaridor/buyurtmalar") },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname || "");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition ${
              active ? "text-accent-600" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-accent-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
