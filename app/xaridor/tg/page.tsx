"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { NomaLogo } from "@/components/shared/noma-logo";

export default function TelegramMiniAppBridgePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticating" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initTelegramAuth = async () => {
    // Check if Telegram WebApp script is loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;

    if (!tg) {
      // Not opened inside Telegram: redirect directly to customer marketplace
      router.replace("/xaridor");
      return;
    }

    try {
      tg.ready();
      tg.expand();

      const initData = tg.initData;

      if (!initData) {
        // Fallback for browser testing or no initData
        router.replace("/xaridor");
        return;
      }

      setStatus("authenticating");

      const res = await fetch("/api/auth/telegram-webapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setStatus("ready");
        router.replace("/xaridor");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Autentifikatsiyada xatolik yuz berdi");
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  };

  useEffect(() => {
    // Small timeout to give Telegram script a chance to initialize
    const timer = setTimeout(() => {
      initTelegramAuth();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onLoad={initTelegramAuth}
      />

      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-sm w-full space-y-6">
          <div className="flex justify-center">
            <NomaLogo subtitle="Telegram Mini App" />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-border shadow-sm space-y-4">
            {status === "loading" && (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                <p className="text-sm font-bold text-primary">NOMA do&apos;koni ochilmoqda...</p>
                <p className="text-xs text-muted-foreground">Telegram ilovasi sozlanmoqda</p>
              </div>
            )}

            {status === "authenticating" && (
              <div className="space-y-3">
                <Sparkles className="w-8 h-8 text-accent animate-pulse mx-auto" />
                <p className="text-sm font-bold text-primary">Mijoz hisobi tasdiqlanmoqda...</p>
                <p className="text-xs text-muted-foreground">Namangan do&apos;konlariga ulanish</p>
              </div>
            )}

            {status === "ready" && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-emerald-600">Muvaffaqiyatli!</p>
                <p className="text-xs text-muted-foreground">Katalog ochilmoqda...</p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3 text-rose-600">
                <AlertCircle className="w-8 h-8 mx-auto" />
                <p className="text-sm font-bold">Xatolik</p>
                <p className="text-xs text-muted-foreground">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => router.replace("/xaridor")}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold"
                >
                  Do&apos;konga o&apos;tish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
