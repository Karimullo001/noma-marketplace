"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, AlertCircle, ShieldCheck } from "lucide-react";

export function VerifyCodeClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sotuvchi/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kod noto'g'ri.");
        return;
      }
      router.push(data.redirectTo || "/sotuvchi/dokon-yaratish");
      router.refresh();
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-5">
      <div className="p-3.5 rounded-2xl bg-accent-50 border border-accent-200 text-xs text-accent-700 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Administrator sizga bergan bir martalik taklif kodini kiriting. Kod faqat sizning hisobingiz uchun va cheklangan vaqtga amal qiladi.
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-primary block mb-1">Maxsus taklif kodi *</label>
        <div className="relative">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="NOMA-XXXX-XXXX"
            className="w-full h-11 rounded-xl border border-border pl-10 pr-4 text-sm font-mono tracking-wider bg-background uppercase"
          />
          <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs font-bold transition disabled:opacity-50"
      >
        {loading ? "Tekshirilmoqda..." : "Kodni tasdiqlash"}
      </button>

      <div className="text-center">
        <Link href="/sotuvchi/ariza" className="text-xs text-muted-foreground hover:underline">
          Hali ariza yubormadingizmi? Ortga qaytish
        </Link>
      </div>
    </form>
  );
}
