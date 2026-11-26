"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Store as StoreIcon, Truck, Phone, Star, CheckCircle2 } from "lucide-react";
import { formatDateTashkent, formatPrice, ORDER_STATUS_UZ } from "@/lib/utils";
import type { Order } from "@/types/database";

export function OrdersClient({
  orders,
  reviewedPairs,
}: {
  orders: Order[];
  reviewedPairs: string[]; // `${order_id}:${product_id}`
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ orderId: string; productId: string; productName: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOrderAction = async (orderId: string, action: "confirm_delivered" | "cancel") => {
    setBusyId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/xaridor/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Amalni bajarib bo'lmadi");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setError(null);
    const res = await fetch("/api/xaridor/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: reviewTarget.orderId,
        product_id: reviewTarget.productId,
        rating,
        comment,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Sharh yuborilmadi");
      return;
    }
    setReviewTarget(null);
    setComment("");
    router.refresh();
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-2">
        <Package className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
        <h2 className="text-base font-bold text-primary">Hozircha buyurtmalar yo&apos;q</h2>
        <p className="text-xs text-muted-foreground">Xarid qilganingizdan so&apos;ng buyurtmalaringiz shu yerda ko&apos;rinadi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {reviewTarget && (
        <form onSubmit={handleReviewSubmit} className="bg-white rounded-2xl border-2 border-accent p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">
              Sharh qoldirish: {reviewTarget.productName}
            </h3>
            <button type="button" onClick={() => setReviewTarget(null)} className="text-xs text-muted-foreground">
              Yopish
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>Baho:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`p-1 ${n <= rating ? "text-amber-500" : "text-gray-300"}`}
              >
                <Star className="w-5 h-5 fill-current" />
              </button>
            ))}
          </div>
          <textarea
            required
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Mahsulot sifati va o'lchami haqida fikringiz..."
            className="w-full rounded-xl border border-border p-3 text-xs bg-background"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold"
          >
            Sharhni yuborish
          </button>
        </form>
      )}

      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="p-4 sm:p-5 bg-muted/50 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono font-bold text-primary">{order.order_number}</span>
                <span className="text-xs text-muted-foreground">• {formatDateTashkent(order.created_at)}</span>
              </div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <StoreIcon className="w-3.5 h-3.5 text-accent" />
                <span>{order.store?.name}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent-50 text-accent border border-accent-200">
                {ORDER_STATUS_UZ[order.status]}
              </span>
              {order.status === "shipped" && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => handleOrderAction(order.id, "confirm_delivered")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Qabul qildim
                </button>
              )}
              {(order.status === "pending" || order.status === "accepted") && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => handleOrderAction(order.id, "cancel")}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold"
                >
                  Bekor qilish
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 divide-y divide-border">
            {(order.items || []).map((item) => {
              const alreadyReviewed = reviewedPairs.includes(`${order.id}:${item.product_id}`);
              return (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.product_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-12 h-14 rounded-lg object-cover border border-border shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-primary truncate">{item.product_name}</div>
                      <div className="text-muted-foreground">
                        {item.size} • {item.color} • {item.quantity} dona
                      </div>
                      {order.status === "delivered" && !alreadyReviewed && (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewTarget({
                              orderId: order.id,
                              productId: item.product_id,
                              productName: item.product_name,
                            })
                          }
                          className="text-accent font-semibold hover:underline mt-1 inline-block"
                        >
                          Sharh qoldirish &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-primary shrink-0">{formatPrice(item.total_price)}</div>
                </div>
              );
            })}
          </div>

          <div className="p-4 sm:p-5 bg-muted/30 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 text-muted-foreground">
              <div className="font-bold text-primary inline-flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-accent" /> Yetkazib berish
              </div>
              <div>Manzil: {order.delivery_city}, {order.delivery_address}</div>
              {order.delivery?.delivery_method && <div>Usul: {order.delivery.delivery_method}</div>}
              {order.delivery?.estimated_time && <div>Taxminiy vaqt: {order.delivery.estimated_time}</div>}
              {order.delivery?.courier_contact && (
                <div className="text-primary font-semibold inline-flex items-center gap-1">
                  <Phone className="w-3 h-3 text-accent" /> Kuryer: {order.delivery.courier_contact}
                </div>
              )}
              {order.delivery?.tracking_note && <div>Izoh: {order.delivery.tracking_note}</div>}
            </div>

            <div className="md:text-right space-y-1">
              <div className="text-muted-foreground">
                Mahsulotlar: {formatPrice(order.subtotal)} + Yetkazish: {formatPrice(order.delivery_fee)}
              </div>
              <div className="text-base font-black text-primary">
                Jami: {formatPrice(order.total_amount)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                To&apos;lov: Yetkazib berilganda ({order.payment_status === "paid" ? "To'langan" : "To'lanmagan"})
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
