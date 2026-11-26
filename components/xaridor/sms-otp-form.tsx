"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Phone } from "lucide-react";

export function SmsOtpForm({
  smsEnabled,
  supabaseReady,
}: {
  smsEnabled: boolean;
  supabaseReady: boolean;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("+998");
  const [fullName, setFullName] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!supabaseReady || !smsEnabled) {
      setError(
        "SMS OTP provayderi hali sozlanmagan. Supabase Phone Auth yoki Eskiz.uz sozlamalarini kiriting."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "SMS yuborib bo'lmadi.");
        return;
      }
      setInfo(data.message);
      setStep("otp");
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          token: token.trim(),
          fullName: fullName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Tasdiqlash kodi noto'g'ri.");
        return;
      }
      router.push(data.redirectTo || "/xaridor");
      router.refresh();
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          {info}
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">
              Ismingiz (ixtiyoriy)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ism Familiya"
              className="w-full h-10 rounded-xl border border-border px-3.5 text-sm bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">
              Telefon raqami
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901234567"
                className="w-full h-10 rounded-xl border border-border pl-10 pr-3.5 text-sm font-mono bg-background"
              />
              <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs font-bold transition disabled:opacity-50"
          >
            {loading ? "Yuborilmoqda..." : "SMS kod olish"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">
              SMS orqali kelgan kod
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456"
                className="w-full h-10 rounded-xl border border-border pl-10 pr-3.5 text-sm font-mono tracking-widest bg-background"
              />
              <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-800 text-white text-xs font-bold transition disabled:opacity-50"
          >
            {loading ? "Tekshirilmoqda..." : "Tasdiqlash va kirish"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="w-full text-center text-xs text-muted-foreground hover:underline"
          >
            Telefon raqamini o&apos;zgartirish
          </button>
        </form>
      )}
    </div>
  );
}
