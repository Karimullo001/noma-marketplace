import React from "react";
import Link from "next/link";
import { Shield, AlertCircle } from "lucide-react";
import { getAuthProviderStatus } from "@/lib/config";
import { NomaLogo } from "@/components/shared/noma-logo";
import { OAuthButtons } from "@/components/shared/auth-oauth-buttons";

export const dynamic = "force-dynamic";

export default function AdminKirishPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const authStatus = getAuthProviderStatus();

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Link href="/xaridor" className="inline-block">
            <NomaLogo subtitle="Admin Boshqaruvi" dark />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-terracotta/20 text-terracotta-100 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" /> Faqat Administratorlar Uchun
          </div>
          <h1 className="text-2xl font-black text-white">NOMA Admin Kirishi</h1>
          <p className="text-xs text-primary-200">
            Admin huquqi server tomonidan <code className="text-white">ADMIN_EMAILS</code> orqali tekshiriladi. Faqat Google orqali kirish ruxsat etilgan.
          </p>
        </div>

        {(searchParams.error === "not_admin" || searchParams.error === "forbidden") && (
          <div className="p-3.5 rounded-2xl bg-rose-950 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              Sizning Google hisobingiz <code className="text-white">ADMIN_EMAILS</code> ro&apos;yxatiga kiritilmagan. Kirish rad etildi.
            </span>
          </div>
        )}

        <div className="bg-white text-primary p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
          <OAuthButtons
            nextPath="/admin"
            googleEnabled={authStatus.google}
            appleEnabled={false}
            supabaseReady={authStatus.supabaseReady}
            allowApple={false}
          />
        </div>
      </div>
    </div>
  );
}
