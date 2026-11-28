"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Store as StoreIcon,
  AlertCircle,
  MapPin,
  Banknote,
  CreditCard,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/config";
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash_on_delivery" | "card_on_delivery">("cash_on_delivery");
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrders, setCreatedOrders] = useState<CreatedOrderSummary[] | null>(null);

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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Brauzeringiz joylashuvni aniqlashni qo'llab-quvvatlamaydi.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        if (!address.trim()) {
          setAddress(`Namangan (${lat}, ${lng})`);
        }
        setLocating(false);
      },
      () => {
        setError("Joylashuvga ruxsat berilmadi. Manzilni qo'lda kiriting.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!offerAccepted) {
      setError("Buyurtma berish uchun ommaviy oferta shartlariga rozilik bildiring.");
      return;
    }

    setSubmitting(true);
    try {
      const fullAddress = coords
        ? `${address.trim()} [Xarita: ${coords.lat}, ${coords.lng}]`
        : address.trim();

      const res = await fetch("/api/xaridor/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_city: city,
          delivery_address: fullAddress,
          delivery_notes: notes || undefined,
          payment_method: paymentMethod,
          offer_accepted: true,
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
          <h2 className="text-2xl font-black text-primary">Buyurtmalaringiz yuborildi!</h2>
          <p className="text-xs text-muted-foreground">
            Buyurtmangiz sotuvchiga yuborildi. Sotuvchi tasdiqlaganidan so&apos;ng sizga xabar beriladi.
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-primary">
                Yetkazib berish manzili (qo&apos;lda yoki xaritadan) *
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-50 text-accent-700 hover:bg-accent-100 text-[11px] font-bold transition"
              >
                {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                <span>{locating ? "Aniqlanmoqda..." : "Xaritadan belgilash"}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Masalan: Boburshoh ko'chasi, 14-uy, 2-xonadon"
              className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
            />
            {coords && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
                <span>📍 Xarita nuqtasi belgilandi: {coords.lat}, {coords.lng}</span>
                <a
                  href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline"
                >
                  Xaritada ko&apos;rish
                </a>
              </div>
            )}
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

          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition ${
              paymentMethod === "cash_on_delivery"
                ? "border-accent bg-accent-50/40"
                : "border-border bg-white hover:bg-muted/30"
            }`}
          >
            <input
              type="radio"
              name="payment_method"
              checked={paymentMethod === "cash_on_delivery"}
              onChange={() => setPaymentMethod("cash_on_delivery")}
              className="mt-0.5"
            />
            <Banknote className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-primary">Naqd pul (yetkazib berilganda)</div>
              <div className="text-muted-foreground">Buyurtmani ko&apos;rib, tekshirgandan so&apos;ng kuryerga naqd to&apos;lang.</div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition ${
              paymentMethod === "card_on_delivery"
                ? "border-accent bg-accent-50/40"
                : "border-border bg-white hover:bg-muted/30"
            }`}
          >
            <input
              type="radio"
              name="payment_method"
              checked={paymentMethod === "card_on_delivery"}
              onChange={() => setPaymentMethod("card_on_delivery")}
              className="mt-0.5"
            />
            <CreditCard className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-primary">Karta orqali (Uzcard / Humo)</div>
              <div className="text-muted-foreground">Yetkazib berishda terminal yoki karta o&apos;tkazmasi orqali to&apos;lang.</div>
            </div>
          </label>
        </div>

        {/* Ommaviy oferta */}
        <div className="bg-amber-50/80 rounded-2xl border border-amber-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Ommaviy Oferta Shartlari</span>
          </div>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            Buyurtma tasdiqlangandan so&apos;ng kuryer mahsulotni manzilingizga yetkazadi. Agar xaridor buyurtmani yetkazib berilganda sababsiz rad etsa yoki qabul qilmasa, yetkazib berish (kuryer) xarajatini to&apos;lab berishi shart.
          </p>
          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={offerAccepted}
              onChange={(e) => setOfferAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-amber-400 text-accent-600 focus:ring-accent-500"
            />
            <span className="text-xs font-bold text-amber-950">
              Ommaviy oferta shartlari bilan tanishdim va roziman
            </span>
          </label>
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
          disabled={submitting || !offerAccepted}
          className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-bold transition"
        >
          {submitting ? "Buyurtma yaratilmoqda..." : "Buyurtmani tasdiqlash"}
        </button>
      </div>
    </form>
  );
}
