"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/lib/config";
import type { Store } from "@/types/database";

export function StoreFormClient({
  userId,
  existingStore,
  redirectToAfterSave = "/sotuvchi",
}: {
  userId: string;
  existingStore: Store | null;
  redirectToAfterSave?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(existingStore?.name || "");
  const [description, setDescription] = useState(existingStore?.description || "");
  const [address, setAddress] = useState(existingStore?.address || "");
  const [city, setCity] = useState(existingStore?.city || APP_CONFIG.defaultCity);
  const [category, setCategory] = useState(existingStore?.category || "Erkaklar va ayollar kiyimlari");
  const [phone, setPhone] = useState(existingStore?.phone || "+998");
  const [logoUrl, setLogoUrl] = useState(existingStore?.logo_url || "");
  const [telegram, setTelegram] = useState(existingStore?.social_links?.telegram || "");
  const [instagram, setInstagram] = useState(existingStore?.social_links?.instagram || "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase Storage ulanmagan.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("store-logos")
        .upload(filePath, file, { upsert: true });

      if (upErr) {
        setError(`Rasm yuklashda xatolik: ${upErr.message}`);
        return;
      }

      const { data: pub } = supabase.storage.from("store-logos").getPublicUrl(filePath);
      setLogoUrl(pub.publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/sotuvchi/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          address,
          city,
          category,
          phone,
          logo_url: logoUrl || null,
          telegram: telegram || undefined,
          instagram: instagram || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Do'kon ma'lumotlari saqlanmadi.");
        return;
      }
      setSaved(true);
      router.push(redirectToAfterSave);
      router.refresh();
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" /> Saqlandi!
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-primary block">Do&apos;kon logotipi</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLogoUpload}
            disabled={uploading}
            className="text-xs"
          />
          {uploading && <span className="text-[11px] text-accent block">Yuklanmoqda...</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-primary block mb-1">Do&apos;kon nomi *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Chorsu Moda"
            className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-primary block mb-1">Telefon raqami *</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998901234567"
            className="w-full h-10 rounded-xl border border-border px-3 text-sm font-mono bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-primary block mb-1">Yo&apos;nalishi *</label>
          <input
            type="text"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Erkaklar, ayollar, poyabzal..."
            className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-primary block mb-1">Shahar *</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
          >
            {APP_CONFIG.supportedCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-primary block mb-1">Do&apos;kon manzili *</label>
        <input
          type="text"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Namangan sh., Boburshoh ko'chasi, ..."
          className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-primary block mb-1">Do&apos;kon haqida qisqacha *</label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Do'koningizdagi kiyimlar va yetkazib berish shartlari haqida..."
          className="w-full rounded-xl border border-border p-3 text-sm bg-background"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-primary block mb-1">Telegram (ixtiyoriy)</label>
          <input
            type="text"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="@username"
            className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-primary block mb-1">Instagram (ixtiyoriy)</label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="instagram_nomi"
            className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-700 text-white text-sm font-bold transition disabled:opacity-50"
      >
        {saving ? "Saqlanmoqda..." : existingStore ? "O'zgarishlarni saqlash" : "Do'konni ishga tushirish"}
      </button>
    </form>
  );
}
