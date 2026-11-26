"use client";

import React, { useState, useEffect } from "react";
import { Phone, Check, AlertCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PhonePromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("+998");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function checkPhone() {
      // Don't show if user dismissed recently in this session
      if (sessionStorage.getItem("noma_phone_dismissed")) return;

      const supabase = createClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && profile.role === "customer" && !profile.phone) {
        setIsOpen(true);
      }
    }

    checkPhone();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (!/^\+998\d{9}$/.test(cleanPhone)) {
      setError("Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/xaridor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: "Xaridor",
          phone: cleanPhone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Raqamni saqlashda xatolik.");
        return;
      }

      setSaved(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    } catch {
      setError("Tarmoq xatoligi yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("noma_phone_dismissed", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full mx-auto p-4 sm:p-0">
      <div className="bg-white rounded-2xl border border-border shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-primary">Telefon raqamingiz</h4>
              <p className="text-[11px] text-muted-foreground">
                Buyurtmalarni tez yetkazib berishimiz uchun kerak
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-primary transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {saved ? (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Raqamingiz muvaffaqiyatli saqlandi!</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                {loading ? "Saqlanmoqda..." : "Saqlash"}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2 px-3 border border-border text-muted-foreground hover:bg-muted text-xs font-medium rounded-xl transition"
              >
                Keyinroq
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
