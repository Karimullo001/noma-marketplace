"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export function SellerApplyClient({
  defaultName,
  email,
  hasPendingApplication,
}: {
  defaultName: string;
  email: string;
  hasPendingApplication: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaultName);
  const [submitted, setSubmitted] = useState(hasPendingApplication);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sotuvchi/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Arizani yuborib bo'lmadi.");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-5">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Arizangiz qabul qilindi!
            </div>
            <p>
              Bir martalik maxsus taklif kodi administratorning shaxsiy Telegram botiga yuborildi.
              Administrator siz bilan bog&apos;lanib kodni berganidan so&apos;ng, tasdiqlash sahifasiga o&apos;ting.
            </p>
          </div>
          <Link
            href="/sotuvchi/tasdiqlash"
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <span>Taklif kodini kiritish</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Email manzilingiz</label>
            <input
              type="text"
              disabled
              value={email}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-muted text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">
              Ism va familiyangiz (yoki do&apos;kon egasi) *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ism Familiya"
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? "Yuborilmoqda..." : "Ariza yuborish"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
