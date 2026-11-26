import React from "react";
import Link from "next/link";
import { getAuthProviderStatus } from "@/lib/config";
import { NomaLogo } from "@/components/shared/noma-logo";
import { OAuthButtons } from "@/components/shared/auth-oauth-buttons";
import { SmsOtpForm } from "@/components/xaridor/sms-otp-form";

export const dynamic = "force-dynamic";

export default function XaridorKirishPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const authStatus = getAuthProviderStatus();
  const nextPath = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/xaridor";

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <Link href="/xaridor" className="inline-block">
          <NomaLogo subtitle="Xaridor kirishi" />
        </Link>
        <h1 className="text-2xl font-black text-primary">Hisobingizga kiring</h1>
        <p className="text-xs text-muted-foreground">
          Buyurtma berish va saralanganlarni saqlash uchun telefon raqamingiz, Google yoki Apple ID orqali kiring.
        </p>
      </div>

      {searchParams.error === "suspended" && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          Sizning hisobingiz ma&apos;muriyat tomonidan vaqtincha bloklangan.
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-6">
        <SmsOtpForm smsEnabled={authStatus.sms} supabaseReady={authStatus.supabaseReady} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-muted-foreground font-semibold">yoki</span>
          </div>
        </div>

        <OAuthButtons
          nextPath={nextPath}
          googleEnabled={authStatus.google}
          appleEnabled={authStatus.apple}
          supabaseReady={authStatus.supabaseReady}
        />
      </div>
    </div>
  );
}
