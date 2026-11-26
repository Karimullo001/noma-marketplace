"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OAuthButtonsProps {
  nextPath: string;
  googleEnabled: boolean;
  appleEnabled: boolean;
  supabaseReady: boolean;
  allowApple?: boolean;
}

export function OAuthButtons({
  nextPath,
  googleEnabled,
  appleEnabled,
  supabaseReady,
  allowApple = true,
}: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);
    if (!supabaseReady) {
      setError(
        "Supabase ulanmagan. .env.local faylida NEXT_PUBLIC_SUPABASE_URL va NEXT_PUBLIC_SUPABASE_ANON_KEY sozlanmagan."
      );
      return;
    }

    if (provider === "google" && !googleEnabled) {
      setError(
        "Google OAuth provayderi hali sozlanmagan. Supabase Dashboard -> Authentication -> Providers -> Google bo'limini yoqing va NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true qilib belgilang."
      );
      return;
    }

    if (provider === "apple" && !appleEnabled) {
      setError(
        "Apple ID provayderi hali sozlanmagan. Supabase Dashboard -> Authentication -> Providers -> Apple bo'limini yoqing va NEXT_PUBLIC_AUTH_APPLE_ENABLED=true qilib belgilang."
      );
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase mijozi ishga tushmadi.");
      return;
    }

    setLoadingProvider(provider);
    try {
      const origin = window.location.origin;
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (oauthErr) {
        setError(
          oauthErr.message.toLowerCase().includes("not enabled") ||
            oauthErr.message.toLowerCase().includes("unsupported")
            ? `${provider === "google" ? "Google" : "Apple"} provayderi Supabase loyihasida yoqilmagan.`
            : `Kirishda xatolik: ${oauthErr.message}`
        );
        setLoadingProvider(null);
      }
    } catch {
      setError("Tarmoq xatoligi yuz berdi.");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => handleOAuth("google")}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-xl text-sm font-semibold text-primary bg-white hover:bg-muted/60 transition shadow-sm disabled:opacity-50"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>
          {loadingProvider === "google" ? "Yo'naltirilmoqda..." : "Google (Gmail) orqali kirish"}
        </span>
      </button>

      {allowApple && (
        <button
          type="button"
          disabled={loadingProvider !== null}
          onClick={() => handleOAuth("apple")}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-primary rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-800 transition shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 0.6-2.65 1.36-.58.67-.99 1.74-.85 2.76 1.01.08 2.06-.52 2.58-1.27z" />
          </svg>
          <span>
            {loadingProvider === "apple" ? "Yo'naltirilmoqda..." : "Apple ID orqali kirish"}
          </span>
        </button>
      )}
    </div>
  );
}
