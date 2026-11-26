"use client";

import React, { useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import type { Product, ProductVariant } from "@/types/database";

export function FastStockClient({ products }: { products: Product[] }) {
  const [variantsMap, setVariantsMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const p of products) {
      for (const v of p.variants || []) {
        initial[v.id] = v.stock_quantity;
      }
    }
    return initial;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const updateStock = async (variant: ProductVariant, nextQty: number) => {
    const clamped = Math.max(0, nextQty);
    setVariantsMap((prev) => ({ ...prev, [variant.id]: clamped }));
    setSavingId(variant.id);
    try {
      const res = await fetch("/api/sotuvchi/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variant.id, stock_quantity: clamped }),
      });
      if (res.ok) {
        setSavedId(variant.id);
        setTimeout(() => setSavedId((curr) => (curr === variant.id ? null : curr)), 1500);
      }
    } finally {
      setSavingId(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border p-10 text-center text-xs text-muted-foreground">
        Omborda mahsulotlar mavjud emas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl border border-border p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="font-bold text-sm sm:text-base text-primary truncate">{p.name}</div>
            <div className="text-xs text-muted-foreground shrink-0">
              Jami: <span className="font-bold text-primary">{(p.variants || []).reduce((sum, v) => sum + (variantsMap[v.id] ?? v.stock_quantity), 0)} dona</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(p.variants || []).map((v) => {
              const qty = variantsMap[v.id] ?? v.stock_quantity;
              const isSaving = savingId === v.id;
              const isSaved = savedId === v.id;

              return (
                <div
                  key={v.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    qty === 0
                      ? "bg-rose-50/40 border-rose-200"
                      : qty <= 3
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-muted/30 border-border"
                  } ${isSaving ? "opacity-70 scale-[0.99]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-primary flex items-center gap-1.5">
                        <span>{v.size}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs font-medium text-muted-foreground">{v.color}</span>
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground">
                        {qty === 0 ? (
                          <span className="text-rose-600 font-bold">Tugagan (0 dona)</span>
                        ) : qty <= 3 ? (
                          <span className="text-amber-700 font-bold">Kam qolgan ({qty} dona)</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Mavjud ({qty} dona)</span>
                        )}
                      </div>
                    </div>

                    {/* Stepper with comfortable tap areas (min 44px on mobile) */}
                    <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-xl border border-border shadow-2xs">
                      <button
                        type="button"
                        disabled={isSaving || qty <= 0}
                        onClick={() => updateStock(v, qty - 1)}
                        className="w-10 h-10 rounded-lg bg-muted/60 hover:bg-muted active:scale-95 disabled:opacity-30 flex items-center justify-center font-bold text-primary transition"
                        aria-label="1 ta kamaytirish"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => updateStock(v, Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 h-10 border-0 bg-transparent text-center text-sm font-black text-primary focus:ring-0 p-0"
                      />
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => updateStock(v, qty + 1)}
                        className="w-10 h-10 rounded-lg bg-primary hover:bg-primary-800 active:scale-95 text-white flex items-center justify-center font-bold transition shadow-xs"
                        aria-label="1 ta qo'shish"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 1-Tap Quick Increment Chips for Mobile Phones */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-0.5">
                      Tezkor:
                    </span>
                    <button
                      type="button"
                      onClick={() => updateStock(v, qty + 1)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-border text-xs font-semibold text-primary hover:border-accent active:scale-95 transition"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStock(v, qty + 5)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-border text-xs font-semibold text-primary hover:border-accent active:scale-95 transition"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStock(v, qty + 10)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-border text-xs font-semibold text-primary hover:border-accent active:scale-95 transition"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      disabled={qty === 0}
                      onClick={() => updateStock(v, 0)}
                      className="ml-auto px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 active:scale-95 disabled:opacity-40 transition"
                    >
                      Tugadi (0)
                    </button>
                    {isSaved && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-bold animate-pulse">
                        <Check className="w-3.5 h-3.5" /> Saqlandi
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
