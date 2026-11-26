"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Store as StoreIcon, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/config";
import { getAvailablePaymentMethods } from "@/lib/payments/provider";
import type { Address, CartItem, Profile, Store } from "@/types/database";

interface CreatedOrderSummary {
  id: string;
  order_number: string;
  store_name: string;
  subtotal: number;
}

export function CheckoutClient({
  profile,
  items,
  addresses,
}: {
  profile: Profile;
  items: CartItem[];
  addresses: Address[];
}) {
  const router = useRouter();
  const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];

  const [customerName, setCustomerName] = useState(profile.full_name || "");
  const [customerPhone, setCustomerPhone] = useState(defaultAddr?.phone || profile.phone || "+998");
  const [city, setCity] = useState(defaultAddr?.city || APP_CONFIG.defaultCity);
  const [address, setAddress] = useState(defaultAddr?.street_address || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrders, setCreatedOrders] = useState<CreatedOrderSummary[] | null>(null);

  const paymentMethods = getAvailablePaymentMethods();

  // Group items by store
  const storeMap = new Map<string, { store: Store; items: CartItem[]; subtotal: number }>();
  for (const item of items) {
    const s = item.product.store;
    if (!s) continue;
    const price = item.product.discount_price ?? item.product.base_price;
    if (!storeMap.has(s.id)) {
      storeMap.set(s.id, { store: s, items: [item], subtotal: price * item.quantity });
    } else {
      const g = storeMap.get(s.id)!;
      g.items.push(item);
      g.subtotal += price * item.quantity;
    }
  }
  const groups = Array.from(storeMap.values());
  const grandSubtotal = groups.reduce((s, g) => s + g.subtotal, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/xaridor/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_city: city,
          delivery_address: address,
          delivery_notes: notes || undefined,
          payment_method: "cash_on_delivery",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Buyurtma rasmiylashtirishda xatolik");
        return;
      }
      setCreatedOrders(data.orders || []);
      router.refresh();
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setSubmitting(false);
    }
  };

  if (createdOrders) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-border p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-primary">Buyurtmalaringiz qabul qilindi!</h2>
          <p className="text-xs text-muted-foreground">
            Har bir do&apos;kon uchun alohida buyurtma yaratildi va mahsulot qoldiqlari band qilindi.
          </p>
        </div>
        <div className="space-y-2 text-left">
          {createdOrders.map((o) => (
            <div key={o.id} className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-primary block">{o.order_number}</span>
                <span className="text-muted-foreground">{o.store_name}</span>
              </div>
              <span className="font-bold text-primary">{formatPrice(o.subtotal)}</span>
            </div>
          ))}
        </div>
        <Link
          href="/xaridor/buyurtmalar"
          className="inline-block px-6 py-3 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs font-bold"
        >
          Buyurtmalarni kuzatish
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-7 space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-base font-bold text-primary">1. Qabul qiluvchi va manzil</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Ism familiya *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Telefon raqami *</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+998901234567"
                className="w-full h-10 rounded-xl border border-border px-3 text-sm font-mono bg-background"
              />
            </div>
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

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">
              Yetkazib berish manzili (mahalla, ko&apos;cha, uy) *
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Masalan: Boburshoh ko'chasi, 14-uy, 2-xonadon"
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-primary block mb-1">Kuryer uchun izoh</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mo'ljal yoki qulay vaqt..."
              className="w-full rounded-xl border border-border p-3 text-sm bg-background"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-primary">2. To&apos;lov usuli</h2>
          {paymentMethods.map((pm) => (
            <label
              key={pm.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${
                pm.enabled
                  ? "border-accent bg-accent-50/40 cursor-pointer"
                  : "border-border bg-muted/40 opacity-60 cursor-not-allowed"
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                checked={pm.id === "cash_on_delivery"}
                disabled={!pm.enabled}
                readOnly
                className="mt-0.5"
              />
              <div>
                <div className="font-bold text-primary">{pm.name}</div>
                <div className="text-muted-foreground">{pm.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="lg:col-span-5 bg-white rounded-2xl border border-border p-6 space-y-4 sticky top-32">
        <h2 className="text-base font-bold text-primary pb-2 border-b border-border">
          Do&apos;konlar kesimida buyurtmalar ({groups.length} ta)
        </h2>
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.store.id} className="p-3 rounded-xl bg-muted/50 border border-border space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-primary">
                <span className="inline-flex items-center gap-1">
                  <StoreIcon className="w-3.5 h-3.5 text-accent" />
                  {g.store.name}
                </span>
                <span>{formatPrice(g.subtotal)}</span>
              </div>
              {g.items.map((item) => (
                <div key={item.id} className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[200px]">
                    {item.product.name} ({item.variant.size}, {item.variant.color}) × {item.quantity}
                  </span>
                  <span>
                    {formatPrice((item.product.discount_price ?? item.product.base_price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border flex justify-between items-baseline">
          <span className="text-sm font-bold text-primary">Mahsulotlar jami:</span>
          <span className="text-xl font-black text-accent">{formatPrice(grandSubtotal)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Yetkazib berish haqini har bir sotuvchi buyurtmani qabul qilganda belgilaydi.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-bold transition"
        >
          {submitting ? "Buyurtma yaratilmoqda..." : "Buyurtmani tasdiqlash"}
        </button>
      </div>
    </form>
  );
}
