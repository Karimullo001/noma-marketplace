"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, AlertCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types/database";

interface VariantRow {
  id?: string;
  size: string;
  color: string;
  color_hex: string;
  stock_quantity: number;
}

export function ProductFormClient({
  userId,
  categories,
  existingProduct,
}: {
  userId: string;
  categories: Category[];
  existingProduct?: Product | null;
}) {
  const router = useRouter();

  const [name, setName] = useState(existingProduct?.name || "");
  const [description, setDescription] = useState(existingProduct?.description || "");
  const [categoryId, setCategoryId] = useState(
    existingProduct?.category_id || categories[0]?.id || ""
  );
  const [brandName, setBrandName] = useState(existingProduct?.brand?.name || "");
  const [gender, setGender] = useState<Product["gender"]>(existingProduct?.gender || "men");
  const [material, setMaterial] = useState(existingProduct?.material || "");
  const [condition, setCondition] = useState<"new" | "like_new">(
    existingProduct?.condition || "new"
  );
  const [basePrice, setBasePrice] = useState<string>(
    existingProduct ? String(existingProduct.base_price) : ""
  );
  const [discountPrice, setDiscountPrice] = useState<string>(
    existingProduct?.discount_price ? String(existingProduct.discount_price) : ""
  );
  const [images, setImages] = useState<string[]>(existingProduct?.images || []);
  const [variants, setVariants] = useState<VariantRow[]>(
    existingProduct?.variants && existingProduct.variants.length > 0
      ? existingProduct.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          color_hex: v.color_hex || "#141312",
          stock_quantity: v.stock_quantity,
        }))
      : [{ size: "M", color: "Qora", color_hex: "#141312", stock_quantity: 5 }]
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase Storage ulanmagan.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${userId}/prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(filePath, file, { upsert: false });

        if (upErr) {
          setError(`Rasm yuklashda xatolik: ${upErr.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(filePath);
        uploadedUrls.push(pub.publicUrl);
      }
      setImages((prev) => [...prev, ...uploadedUrls].slice(0, 8));
    } finally {
      setUploading(false);
    }
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { size: "L", color: "Oq", color_hex: "#FFFFFF", stock_quantity: 1 },
    ]);
  };

  const removeVariant = (idx: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (images.length === 0) {
      setError("Kamida 1 ta mahsulot rasmini yuklang.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        category_id: categoryId,
        brand_name: brandName || undefined,
        gender,
        material: material || undefined,
        condition,
        base_price: Number(basePrice),
        discount_price: discountPrice ? Number(discountPrice) : null,
        images,
        variants: variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          color_hex: v.color_hex || null,
          stock_quantity: Number(v.stock_quantity),
        })),
      };

      const url = existingProduct
        ? `/api/sotuvchi/products/${existingProduct.id}`
        : "/api/sotuvchi/products";
      const method = existingProduct ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Mahsulot saqlanmadi.");
        return;
      }

      router.push("/sotuvchi/mahsulotlar");
      router.refresh();
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-border space-y-4">
        <h2 className="text-sm font-bold text-primary">1. Asosiy ma&apos;lumotlar</h2>
        <div>
          <label className="text-xs font-semibold text-primary block mb-1">Mahsulot nomi *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Erkaklar klassik paxta ko'ylagi"
            className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Bo&apos;lim *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? `— ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Brend (ixtiyoriy)</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Masalan: Namangan Tekstil"
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Jinsi / Yo&apos;nalish *</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Product["gender"])}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
            >
              <option value="men">Erkaklar</option>
              <option value="women">Ayollar</option>
              <option value="children">Bolalar</option>
              <option value="sport">Sport</option>
              <option value="accessories">Aksessuarlar</option>
              <option value="unisex">Uniseks</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-primary block mb-1">Tavsif *</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mahsulot haqida batafsil..."
            className="w-full rounded-xl border border-border p-3 text-sm bg-background"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Mato tarkibi</label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="100% Paxta"
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Holati</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as "new" | "like_new")}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
            >
              <option value="new">Yangi</option>
              <option value="like_new">Yangi kabi</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-border space-y-4">
        <h2 className="text-sm font-bold text-primary">2. Narx (UZS) va Rasmlar (Supabase Storage)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Asosiy narx (so&apos;m) *</label>
            <input
              type="number"
              required
              min={1000}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="250000"
              className="w-full h-10 rounded-xl border border-border px-3 text-sm font-bold bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-primary block mb-1">
              Chegirma narxi (ixtiyoriy)
            </label>
            <input
              type="number"
              min={1000}
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              placeholder="199000"
              className="w-full h-10 rounded-xl border border-border px-3 text-sm font-bold text-accent bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-primary block">Mahsulot rasmlari *</label>
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative w-20 h-24 rounded-xl overflow-hidden border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-20 h-24 rounded-xl border-2 border-dashed border-border hover:border-accent flex flex-col items-center justify-center text-xs text-muted-foreground cursor-pointer">
              <Upload className="w-5 h-5 mb-1" />
              <span>{uploading ? "..." : "Yuklash"}</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">3. O&apos;lcham, rang va ombor qoldig&apos;i *</h2>
          <button
            type="button"
            onClick={addVariant}
            className="px-3 py-1.5 rounded-xl bg-muted hover:bg-primary-100 text-xs font-bold inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Variant qo&apos;shish
          </button>
        </div>

        <div className="space-y-2.5">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-muted/40 border border-border">
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-muted-foreground block">O&apos;lcham</label>
                <input
                  type="text"
                  required
                  value={v.size}
                  onChange={(e) => {
                    const next = [...variants];
                    next[i].size = e.target.value;
                    setVariants(next);
                  }}
                  placeholder="M, L, 42"
                  className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-white font-bold"
                />
              </div>
              <div className="col-span-4">
                <label className="text-[10px] font-bold text-muted-foreground block">Rang</label>
                <input
                  type="text"
                  required
                  value={v.color}
                  onChange={(e) => {
                    const next = [...variants];
                    next[i].color = e.target.value;
                    setVariants(next);
                  }}
                  placeholder="Qora, Oq"
                  className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-white"
                />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Kod</label>
                <input
                  type="color"
                  value={v.color_hex}
                  onChange={(e) => {
                    const next = [...variants];
                    next[i].color_hex = e.target.value;
                    setVariants(next);
                  }}
                  className="w-full h-9 rounded-lg border border-border bg-white cursor-pointer"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-muted-foreground block">Soni</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={v.stock_quantity}
                  onChange={(e) => {
                    const next = [...variants];
                    next[i].stock_quantity = Number(e.target.value);
                    setVariants(next);
                  }}
                  className="w-full h-9 rounded-lg border border-border px-2.5 text-xs bg-white font-bold"
                />
              </div>
              <div className="col-span-1 text-right pt-4">
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  className="text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || uploading}
        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-accent hover:bg-accent-700 text-white text-sm font-bold transition disabled:opacity-50"
      >
        {saving ? "Saqlanmoqda..." : existingProduct ? "O'zgarishlarni saqlash" : "Mahsulotni joylash"}
      </button>
    </form>
  );
}
