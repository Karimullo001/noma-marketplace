"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Store as StoreIcon, Trash2, ArrowRight, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CartItem, Store } from "@/types/database";

export function SavatClient({ initialItems }: { initialItems: CartItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const updateQty = async (itemId: string, quantity: number) => {
    setBusyId(itemId);
    setError(null);
    try {
      const res = await fetch("/api/xaridor/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Miqdorni yangilab bo'lmadi");
        return;
      }
      if (quantity === 0) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } else {
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
        <h2 className="text-lg font-bold text-primary">Savatingiz bo&apos;sh</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Katalogdan o&apos;zingizga yoqqan mahsulotlarni tanlab savatga qo&apos;shing.
        </p>
        <Link
          href="/xaridor/katalog"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold"
        >
          Katalogga o&apos;tish <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Group items by store
  const storeGroups = new Map<string, { store: Store; items: CartItem[]; subtotal: number }>();
  for (const item of items) {
    const store = item.product.store;
    if (!store) continue;
    const price = item.product.discount_price ?? item.product.base_price;
    const lineTotal = price * item.quantity;
    if (!storeGroups.has(store.id)) {
      storeGroups.set(store.id, { store, items: [item], subtotal: lineTotal });
    } else {
      const g = storeGroups.get(store.id)!;
      g.items.push(item);
      g.subtotal += lineTotal;
    }
  }

  const groups = Array.from(storeGroups.values());
  const grandSubtotal = groups.reduce((s, g) => s + g.subtotal, 0);

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-5">
          {groups.map((g) => (
            <div key={g.store.id} className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-3 bg-muted/60 border-b border-border flex items-center justify-between text-xs">
                <span className="font-bold text-primary inline-flex items-center gap-1.5">
                  <StoreIcon className="w-4 h-4 text-accent" />
                  {g.store.name}
                </span>
                <span className="text-muted-foreground">
                  Yetkazishni sotuvchi belgilaydi
                </span>
              </div>

              <div className="divide-y divide-border p-4 sm:p-5 space-y-4">
                {g.items.map((item) => {
                  const unitPrice = item.product.discount_price ?? item.product.base_price;
                  const img = item.product.images?.[0];
                  return (
                    <div key={item.id} className="flex items-center gap-4 pt-3 first:pt-0">
                      <div className="w-16 h-20 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/xaridor/mahsulot/${item.product.slug}`}
                          className="text-sm font-bold text-primary hover:text-accent truncate block"
                        >
                          {item.product.name}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          O&apos;lcham: <strong>{item.variant.size}</strong> • Rang: <strong>{item.variant.color}</strong>
                        </div>
                        <div className="text-xs font-bold text-primary mt-1">
                          {formatPrice(unitPrice)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center border border-border rounded-lg bg-background">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="p-1.5"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            disabled={busyId === item.id || item.quantity >= item.variant.stock_quantity}
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="p-1.5 disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => updateQty(item.id, 0)}
                          className="p-1.5 text-muted-foreground hover:text-rose-600"
                          aria-label="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-border p-6 space-y-4 sticky top-32">
          <h2 className="text-base font-bold text-primary pb-3 border-b border-border">
            Savat xulosasi
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Do&apos;konlar soni:</span>
              <span className="font-bold">{groups.length} ta</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mahsulotlar qiymati:</span>
              <span className="font-bold text-base text-primary">{formatPrice(grandSubtotal)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Har bir do&apos;kon uchun alohida buyurtma rasmiylashtiriladi. Yetkazib berish narxini sotuvchi buyurtmani qabul qilganda tasdiqlaydi.
            </p>
          </div>
          <Link
            href="/xaridor/buyurtma"
            className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            Buyurtma berish <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
