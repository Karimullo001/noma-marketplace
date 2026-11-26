import React from "react";
import Link from "next/link";
import { NomaLogo } from "@/components/shared/noma-logo";
import { APP_CONFIG } from "@/lib/config";

export function XaridorFooter() {
  return (
    <footer className="bg-primary text-primary-200 border-t border-primary-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <NomaLogo subtitle={`${APP_CONFIG.defaultCity} Moda`} dark />
          <p className="text-xs text-primary-200/80 leading-relaxed">
            {APP_CONFIG.defaultCity} shahridagi kiyim-kechak, poyabzal va aksessuar do&apos;konlaridagi
            mavjud o&apos;lchamlarni ko&apos;ring va uyingizdan chiqmasdan buyurtma bering.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Xaridorlarga
          </h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/xaridor/katalog" className="hover:text-white transition">Barcha mahsulotlar</Link></li>
            <li><Link href="/xaridor/savat" className="hover:text-white transition">Savat</Link></li>
            <li><Link href="/xaridor/buyurtmalar" className="hover:text-white transition">Buyurtmalarim</Link></li>
            <li><Link href="/xaridor/sevimlilar" className="hover:text-white transition">Saralanganlar</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Hamkor do&apos;konlar
          </h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/sotuvchi/kirish" className="hover:text-white transition">Sotuvchi sifatida kirish</Link></li>
            <li><Link href="/sotuvchi/ariza" className="hover:text-white transition">Do&apos;kon ochishga ariza</Link></li>
            <li><Link href="/sotuvchi" className="hover:text-white transition">Sotuvchi kabineti</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            To&apos;lov va yetkazish
          </h4>
          <p className="text-xs text-primary-200/80 leading-relaxed">
            Yetkazib berish har bir do&apos;kon tomonidan mustaqil tashkil etiladi.
            To&apos;lov buyurtmani qabul qilib olganingizda naqd yoki karta orqali amalga oshiriladi.
          </p>
        </div>
      </div>

      <div className="border-t border-primary-800 py-5 text-center text-xs text-primary-200/60">
        © {new Date().getFullYear()} {APP_CONFIG.brandName} — {APP_CONFIG.defaultCity}. Barcha huquqlar himoyalangan.
      </div>
    </footer>
  );
}
