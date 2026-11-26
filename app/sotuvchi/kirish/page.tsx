import React from "react";
import Link from "next/link";
import { getAuthProviderStatus } from "@/lib/config";
import { NomaLogo } from "@/components/shared/noma-logo";
import { OAuthButtons } from "@/components/shared/auth-oauth-buttons";

export const dynamic = "force-dynamic";

export default function SotuvchiKirishPage() {
  const authStatus = getAuthProviderStatus();

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Link href="/xaridor" className="inline-block">
            <NomaLogo subtitle="Sotuvchi Kabineti" />
          </Link>
          <h1 className="text-2xl font-black text-primary">Sotuvchi sifatida kirish</h1>
          <p className="text-xs text-muted-foreground">
            Do&apos;koningizni boshqarish yoki yangi do&apos;kon ochishga ariza yuborish uchun Google (Gmail) yoki Apple ID orqali kiring.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-5">
          <OAuthButtons
            nextPath="/sotuvchi"
            googleEnabled={authStatus.google}
            appleEnabled={authStatus.apple}
            supabaseReady={authStatus.supabaseReady}
          />

          <div className="p-3.5 rounded-2xl bg-muted/60 border border-border text-xs text-muted-foreground leading-relaxed">
            <strong className="text-primary block mb-1">Yangi sotuvchilar uchun tartib:</strong>
            1. Google/Apple bilan kiring. <br />
            2. &quot;Ariza yuborish&quot; tugmasini bosing. <br />
            3. Administrator Telegram orqali bergan bir martalik taklif kodini tasdiqlang.
          </div>
        </div>
      </div>
    </div>
  );
}
