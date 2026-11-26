"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Edit2, Truck } from "lucide-react";
import {
  formatDateTashkent,
  formatPrice,
  ORDER_STATUS_UZ,
  SELLER_NEXT_STATUSES,
} from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/database";

export function SellerOrdersClient({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>("accepted");
  const [deliveryFee, setDeliveryFee] = useState<string>("0");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("Do'kon kuryeri");
  const [courierContact, setCourierContact] = useState("");
  const [trackingNote, setTrackingNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEditor = (order: Order) => {
    const nextOptions = SELLER_NEXT_STATUSES[order.status] || [];
    setEditingId(order.id);
    setStatus(nextOptions[0] || order.status);
    setDeliveryFee(String(order.delivery_fee || 0));
    setEstimatedTime(order.delivery?.estimated_time || "");
    setDeliveryMethod(order.delivery?.delivery_method || "Do'kon kuryeri");
    setCourierContact(order.delivery?.courier_contact || "");
    setTrackingNote(order.delivery?.tracking_note || "");
    setError(null);
  };

  const handleSave = async (orderId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sotuvchi/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          delivery_fee: Number(deliveryFee || 0),
          estimated_time: estimatedTime || undefined,
          delivery_method: deliveryMethod || undefined,
          courier_contact: courierContact || undefined,
          tracking_note: trackingNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Buyurtma yangilanmadi.");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border p-12 text-center text-xs text-muted-foreground">
        Hozircha do&apos;koningizga buyurtmalar kelib tushmagan.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {orders.map((order) => {
        const nextAllowed = SELLER_NEXT_STATUSES[order.status] || [];
        const isEditing = editingId === order.id;

        return (
          <div key={order.id} className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="p-4 sm:p-5 bg-muted/50 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-primary">{order.order_number}</span>
                  <span className="text-xs text-muted-foreground">• {formatDateTashkent(order.created_at)}</span>
                </div>
                <div className="text-xs text-primary mt-0.5">
                  Xaridor: <strong>{order.customer_name}</strong> ({order.customer_phone})
                </div>
                <div className="text-xs text-muted-foreground">
                  Manzil: {order.delivery_city}, {order.delivery_address}
                  {order.delivery_notes ? ` • Izoh: "${order.delivery_notes}"` : ""}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent-50 text-accent border border-accent-200">
                  {ORDER_STATUS_UZ[order.status]}
                </span>
                {nextAllowed.length > 0 && !isEditing && (
                  <button
                    type="button"
                    onClick={() => openEditor(order)}
                    className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Boshqarish
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 divide-y divide-border text-xs">
              {(order.items || []).map((item) => (
                <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex justify-between">
                  <span>
                    <strong>{item.product_name}</strong> ({item.size}, {item.color}) × {item.quantity}
                  </span>
                  <span className="font-bold">{formatPrice(item.total_price)}</span>
                </div>
              ))}
              <div className="pt-2.5 flex justify-between font-bold text-sm text-primary">
                <span>Jami (yetkazish bilan):</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
            </div>

            {isEditing && (
              <div className="p-4 sm:p-5 bg-accent-50/40 border-t border-accent-200 space-y-3 text-xs">
                <div className="font-bold text-accent inline-flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> Holat va yetkazib berishni belgilash
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Keyingi holat</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as OrderStatus)}
                      className="w-full h-9 rounded-lg border border-border px-2.5 bg-white font-bold"
                    >
                      <option value={order.status}>{ORDER_STATUS_UZ[order.status]} (hozirgi)</option>
                      {nextAllowed.map((st) => (
                        <option key={st} value={st}>
                          {ORDER_STATUS_UZ[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Yetkazish narxi (so&apos;m)</label>
                    <input
                      type="number"
                      min={0}
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border px-2.5 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Taxminiy yetkazish vaqti</label>
                    <input
                      type="text"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="Bugun 18:00 gacha"
                      className="w-full h-9 rounded-lg border border-border px-2.5 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Yetkazish usuli</label>
                    <input
                      type="text"
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border px-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Kuryer aloqa raqami</label>
                    <input
                      type="text"
                      value={courierContact}
                      onChange={(e) => setCourierContact(e.target.value)}
                      placeholder="+99890..."
                      className="w-full h-9 rounded-lg border border-border px-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Izoh / Kuzatuv qaydi</label>
                    <input
                      type="text"
                      value={trackingNote}
                      onChange={(e) => setTrackingNote(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border px-2.5 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(order.id)}
                    className="px-4 py-2 rounded-xl bg-accent text-white font-bold"
                  >
                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-xl bg-white border border-border font-semibold"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
