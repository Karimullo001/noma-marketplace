import React from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { getAuthProviderStatus } from "@/lib/config";
import { NomaLogo } from "@/components/shared/noma-logo";
import { OAuthButtons } from "@/components/shared/auth-oauth-buttons";
import { SmsOtpForm } from "@/components/xaridor/sms-otp-form";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, { title: string; desc: string }> = {
  pkce_verifier_missing: {
    title: "Xavfsizlik kaliti (PKCE cookie) topilmadi",
    desc: "Google orqali kirish boshqa brauzer oynasida boshlangan yoki cookie o'chirilgan. Iltimos, bitta oynada qaytadan kiring yoki brauzer keshini tozalab (Incognito rejimida) urinib ko'ring.",
  },
  code_expired: {
    title: "Kirish kodi eskirgan",
    desc: "Google taqdim etgan tasdiq kodi muddati tugagan. Iltimos, qaytadan Google orqali kiring.",
  },
  oauth_denied: {
    title: "Google ruxsati tasdiqlanmadi",
    desc: "Google akkauntiga kirish bekor qilindi yoki ruxsat berilmadi.",
  },
  missing_code: {
    title: "Tasdiq kodi yetib kelmadi",
    desc: "Google tizimidan avtorizatsiya kodi qaytmadi. Qaytadan urinib ko'ring.",
  },
  exchange_failed: {
    title: "Sessiyani tasdiqlashda xatolik",
    desc: "Google sessiyasi tasdiqlanmadi. Bu PKCE cookie muddati tugaganligi yoki Supabase kalitlari noto'g'riligi sababli bo'lishi mumkin. Iltimos, Incognito rejimida qaytadan kiring.",
  },
  auth_failed: {
    title: "Avtorizatsiya amalga oshmadi",
    desc: "Tizimga kirishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
  },
  suspended: {
    title: "Hisob bloklangan",
    desc: "Sizning hisobingiz ma'muriyat tomonidan vaqtincha bloklangan.",
  },
  supabase_not_configured: {
    title: "Tizim sozlanmagan",
    desc: "Server ma'lumotlar bazasi ulanmagan.",
  },
};

export default function XaridorKirishPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; desc?: string };
}) {
  const authStatus = getAuthProviderStatus();
  const nextPath = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/xaridor";
  const errorInfo = searchParams.error ? ERROR_MESSAGES[searchParams.error] : null;

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <Link href="/xaridor" className="inline-block">
          <NomaLogo subtitle="Xaridor kirishi" />
        </Link>
        <h1 className="text-2xl font-black text-primary">Hisobingizga kiring</h1>
        <p className="text-xs text-muted-foreground">
          Buyurtma berish, saralanganlarni saqlash va AI Stilistdan foydalanish uchun Google hisobingiz orqali kiring.
        </p>
      </div>

      {errorInfo && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold block text-sm text-rose-950">{errorInfo.title}</strong>
            <p className="leading-relaxed text-rose-800">{searchParams.desc || errorInfo.desc}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-6">
        <OAuthButtons
          nextPath={nextPath}
          googleEnabled={authStatus.google}
          appleEnabled={false}
          supabaseReady={authStatus.supabaseReady}
          allowApple={false}
        />

        <div className="pt-2 text-center">
          <p className="text-[11px] text-muted-foreground">
            Kirgandan so&apos;ng, buyurtmalarni yetkazib berish uchun aloqa telefon raqamingiz so&apos;raladi.
          </p>
        </div>
      </div>
    </div>
  );
}
