"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Store as StoreIcon,
  KeyRound,
  Package,
  ShoppingBag,
  Users,
  Layers,
  TrendingUp,
  LogOut,
  RefreshCw,
  Ban,
  CheckCircle2,
  Trash2,
  Plus,
  FileText,
  AlertCircle,
} from "lucide-react";
import { NomaLogo } from "@/components/shared/noma-logo";
import { createClient } from "@/lib/supabase/client";
import { formatDateTashkent, formatPrice, ORDER_STATUS_UZ, slugify } from "@/lib/utils";
import type { Category, Order, Product, Profile, SellerApplication, SellerInvitationCode, Store } from "@/types/database";

interface AuditLogRow {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

interface AdminDashboardProps {
  adminEmail: string;
  applications: (SellerApplication & { codes?: SellerInvitationCode[] })[];
  stores: Store[];
  products: Product[];
  customers: Profile[];
  orders: Order[];
  categories: Category[];
  auditLogs: AuditLogRow[];
}

export function AdminDashboardClient({
  adminEmail,
  applications,
  stores,
  products,
  customers,
  orders,
  categories,
  auditLogs,
}: AdminDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "analytics" | "applications" | "stores" | "products" | "customers" | "orders" | "categories" | "logs"
  >("analytics");

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Order filters
  const [orderStoreFilter, setOrderStoreFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderCustomerFilter, setOrderCustomerFilter] = useState("");

  // Category creation
  const [catName, setCatName] = useState("");
  const [catParentId, setCatParentId] = useState("");

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/admin/kirish");
    router.refresh();
  };

  const runAction = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Amal bajarilmadi.");
        return;
      }
      if (data.message) setFeedback(data.message);
      router.refresh();
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
    } finally {
      setBusy(false);
    }
  };

  // Real analytics calculations
  const gmv = orders
    .filter((o) => !["cancelled", "rejected"].includes(o.status))
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled" || o.status === "rejected").length;
  const activeStores = stores.filter((s) => s.status === "active").length;

  const filteredOrders = orders.filter((o) => {
    if (orderStoreFilter && o.store_id !== orderStoreFilter) return false;
    if (orderStatusFilter && o.status !== orderStatusFilter) return false;
    if (
      orderCustomerFilter &&
      !o.customer_name.toLowerCase().includes(orderCustomerFilter.toLowerCase()) &&
      !o.customer_phone.includes(orderCustomerFilter)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white border-b border-primary-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NomaLogo subtitle="Admin" dark />
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px]">
              <Shield className="w-3 h-3 text-accent-400" /> {adminEmail}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/xaridor" className="text-xs text-primary-200 hover:text-white">
              Bozorga o&apos;tish
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Chiqish
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-5 overflow-x-auto text-xs font-semibold border-t border-primary-800">
          {[
            { id: "analytics", label: "Tahlil", icon: TrendingUp },
            { id: "applications", label: `Arizalar (${applications.length})`, icon: KeyRound },
            { id: "stores", label: `Do'konlar (${stores.length})`, icon: StoreIcon },
            { id: "products", label: `Mahsulotlar (${products.length})`, icon: Package },
            { id: "customers", label: `Xaridorlar (${customers.length})`, icon: Users },
            { id: "orders", label: `Buyurtmalar (${orders.length})`, icon: ShoppingBag },
            { id: "categories", label: `Bo'limlar (${categories.length})`, icon: Layers },
            { id: "logs", label: "Audit log", icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={`py-3 border-b-2 inline-flex items-center gap-1.5 whitespace-nowrap transition ${
                  tab === t.id
                    ? "border-accent text-white"
                    : "border-transparent text-primary-200 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tab === "analytics" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Jami GMV" value={formatPrice(gmv)} />
            <MetricCard label="Faol / Jami do'konlar" value={`${activeStores} / ${stores.length}`} />
            <MetricCard label="Xaridorlar" value={`${customers.length} ta`} />
            <MetricCard label="Mahsulotlar" value={`${products.length} ta`} />
            <MetricCard label="Jami buyurtmalar" value={`${orders.length} ta`} />
            <MetricCard label="Yetkazilgan" value={`${completedOrders} ta`} />
            <MetricCard label="Bekor / Rad etilgan" value={`${cancelledOrders} ta`} />
            <MetricCard label="Sotuvchi arizalari" value={`${applications.length} ta`} />
          </div>
        )}

        {tab === "applications" && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ariza beruvchi</th>
                    <th className="py-3 px-4">Sana</th>
                    <th className="py-3 px-4">Kod prefiksi & holat</th>
                    <th className="py-3 px-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map((app) => {
                    const latestCode = app.codes?.[0];
                    return (
                      <tr key={app.id}>
                        <td className="py-3 px-4">
                          <div className="font-bold text-primary">{app.full_name}</div>
                          <div className="text-muted-foreground">{app.email}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDateTashkent(app.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          {latestCode ? (
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold">{latestCode.code_prefix}</span>
                              <div className="text-[11px] text-muted-foreground">
                                {latestCode.is_used
                                  ? "Ishlatilgan"
                                  : latestCode.is_revoked
                                  ? "Bekor qilingan"
                                  : `Muddati: ${formatDateTashkent(latestCode.expires_at)}`}
                              </div>
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              runAction("/api/admin/applications", "POST", {
                                action: "regenerate_code",
                                application_id: app.id,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-accent text-white font-semibold inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Qayta yaratish (Telegram)
                          </button>
                          {latestCode && !latestCode.is_used && !latestCode.is_revoked && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                runAction("/api/admin/applications", "POST", {
                                  action: "revoke_code",
                                  application_id: app.id,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                            >
                              Bekor qilish
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "stores" && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Do&apos;kon</th>
                  <th className="py-3 px-4">Manzil / Telefon</th>
                  <th className="py-3 px-4">Holat</th>
                  <th className="py-3 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stores.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-4 font-bold text-primary">{s.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {s.city}, {s.address} • {s.phone}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {s.status === "active" ? "Faol" : "To'xtatilgan"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction("/api/admin/stores", "PATCH", {
                            store_id: s.id,
                            status: s.status === "active" ? "suspended" : "active",
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg font-bold ${
                          s.status === "active"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {s.status === "active" ? "To'xtatish" : "Qayta faollashtirish"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "products" && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Mahsulot</th>
                  <th className="py-3 px-4">Do&apos;kon</th>
                  <th className="py-3 px-4">Narx</th>
                  <th className="py-3 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-bold text-primary">{p.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{p.store?.name}</td>
                    <td className="py-3 px-4 font-bold">{formatPrice(p.discount_price ?? p.base_price)}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction("/api/admin/products", "PATCH", {
                            product_id: p.id,
                            action: p.is_active ? "deactivate" : "activate",
                          })
                        }
                        className="px-2.5 py-1 rounded-lg border border-border font-semibold"
                      >
                        {p.is_active ? "Yashirish" : "Ko'rsatish"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction("/api/admin/products", "PATCH", {
                            product_id: p.id,
                            action: "delete",
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold"
                      >
                        O&apos;chirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "customers" && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Foydalanuvchi</th>
                  <th className="py-3 px-4">Aloqa</th>
                  <th className="py-3 px-4">Holat</th>
                  <th className="py-3 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-bold text-primary">{c.full_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{c.phone || c.email}</td>
                    <td className="py-3 px-4">
                      {c.is_suspended ? (
                        <span className="text-rose-600 font-bold">Bloklangan</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Faol</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction("/api/admin/customers", "PATCH", {
                            user_id: c.id,
                            is_suspended: !c.is_suspended,
                          })
                        }
                        className="px-3 py-1 rounded-lg border border-border font-semibold inline-flex items-center gap-1"
                      >
                        <Ban className="w-3 h-3" />
                        {c.is_suspended ? "Blokdan chiqarish" : "Bloklash"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <select
                value={orderStoreFilter}
                onChange={(e) => setOrderStoreFilter(e.target.value)}
                className="h-9 rounded-lg border border-border px-2.5 bg-background"
              >
                <option value="">Barcha do&apos;konlar</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-border px-2.5 bg-background"
              >
                <option value="">Barcha holatlar</option>
                {Object.entries(ORDER_STATUS_UZ).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                type="text"
                value={orderCustomerFilter}
                onChange={(e) => setOrderCustomerFilter(e.target.value)}
                placeholder="Xaridor ismi yoki telefoni..."
                className="h-9 rounded-lg border border-border px-3 bg-background"
              />
            </div>

            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">№</th>
                    <th className="py-3 px-4">Do&apos;kon</th>
                    <th className="py-3 px-4">Xaridor</th>
                    <th className="py-3 px-4">Summa</th>
                    <th className="py-3 px-4">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 px-4 font-mono font-bold text-primary">{o.order_number}</td>
                      <td className="py-3 px-4">{o.store?.name}</td>
                      <td className="py-3 px-4">{o.customer_name} ({o.customer_phone})</td>
                      <td className="py-3 px-4 font-bold">{formatPrice(o.total_amount)}</td>
                      <td className="py-3 px-4 font-semibold text-accent">{ORDER_STATUS_UZ[o.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction("/api/admin/categories", "POST", {
                  name: catName,
                  slug: `${slugify(catName)}-${Date.now().toString(36).slice(-3)}`,
                  parent_id: catParentId || null,
                });
                setCatName("");
              }}
              className="bg-white p-4 rounded-2xl border border-border flex flex-wrap gap-3 items-end text-xs"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="font-bold block mb-1">Bo&apos;lim nomi</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Masalan: Qishki kurtkalar"
                  className="w-full h-9 rounded-lg border border-border px-3 bg-background"
                />
              </div>
              <div className="min-w-[180px]">
                <label className="font-bold block mb-1">Ota bo&apos;lim (ixtiyoriy)</label>
                <select
                  value={catParentId}
                  onChange={(e) => setCatParentId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border px-2.5 bg-background"
                >
                  <option value="">Asosiy bo&apos;lim</option>
                  {categories.filter((c) => !c.parent_id).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="h-9 px-4 rounded-lg bg-accent text-white font-bold inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Qo&apos;shish
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-border divide-y divide-border text-xs">
              {categories.map((c) => (
                <div key={c.id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-primary">
                      {c.parent_id ? `↳ ${c.name}` : c.name}
                    </span>
                    <span className="text-muted-foreground ml-2 font-mono">/{c.slug}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => runAction(`/api/admin/categories?id=${c.id}`, "DELETE")}
                    className="text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Vaqt</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Harakat</th>
                  <th className="py-3 px-4">Obyekt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 px-4 text-muted-foreground">{formatDateTashkent(log.created_at)}</td>
                    <td className="py-2.5 px-4">{log.actor_email || "—"}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-primary">{log.action}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{log.entity_type} ({log.entity_id})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-border">
      <span className="text-xs text-muted-foreground font-semibold block">{label}</span>
      <span className="text-lg sm:text-xl font-black text-primary mt-1 block">{value}</span>
    </div>
  );
}
