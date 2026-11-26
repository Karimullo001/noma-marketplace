"use client";

import React, { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import {
  BarChart3,
  PlusCircle,
  Package,
  Store as StoreIcon,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Zap,
  AlertCircle,
  MessageSquareWarning,
  RefreshCw,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

type TabType = "stats" | "add" | "orders" | "store" | "support";

interface StoreData {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  category: string;
  phone: string;
  logo_url: string | null;
  social_links?: {
    banner_url?: string;
    working_hours?: string;
    telegram?: string;
    instagram?: string;
  };
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface OrderItem {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  notes?: string;
  created_at: string;
  items?: Array<{
    id: string;
    product_name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price: number;
  }>;
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "38", "39", "40", "41", "42", "43"];
const COLORS = [
  { name: "Qora", hex: "#111827" },
  { name: "Oq", hex: "#F9FAFB" },
  { name: "Ko'k", hex: "#1D4ED8" },
  { name: "Kulrang", hex: "#6B7280" },
  { name: "Jigarrang", hex: "#78350F" },
  { name: "Qizil", hex: "#DC2626" },
];

export default function SellerMiniAppPage() {
  const [authStatus, setAuthStatus] = useState<"loading" | "ready" | "error">("loading");
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("stats");

  const [store, setStore] = useState<StoreData | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    activeProducts: 0,
    lowStockCount: 0,
  });

  // Fast 1-min product form
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCat, setProdCat] = useState("");
  const [prodGender, setProdGender] = useState<"men" | "women" | "children" | "sport" | "accessories" | "unisex">("unisex");
  const [prodImage, setProdImage] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M", "L"]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [stockPerSize, setStockPerSize] = useState("10");
  const [prodSaving, setProdSaving] = useState(false);
  const [prodNotice, setProdNotice] = useState<string | null>(null);

  // Store settings form
  const [stName, setStName] = useState("");
  const [stPhone, setStPhone] = useState("");
  const [stAddress, setStAddress] = useState("");
  const [stHours, setStHours] = useState("09:00 - 21:00");
  const [stLogo, setStLogo] = useState("");
  const [stBanner, setStBanner] = useState("");
  const [stDesc, setStDesc] = useState("");
  const [stCategory, setStCategory] = useState("Kiyim-kechak");
  const [stSaving, setStSaving] = useState(false);
  const [stNotice, setStNotice] = useState<string | null>(null);

  // Complaint form
  const [compSubject, setCompSubject] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [compSaving, setCompSaving] = useState(false);
  const [compNotice, setCompNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/sotuvchi/mini-app");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAuthError("Sotuvchi kabinetiga kirish uchun avval tizimga kiring.");
          setAuthStatus("error");
          return;
        }
        throw new Error("Ma'lumot yuklanmadi");
      }
      const data = await res.json();
      setStore(data.store);
      setCategories(data.categories || []);
      if (data.categories?.[0] && !prodCat) {
        setProdCat(data.categories[0].id);
      }
      setOrders(data.orders || []);
      if (data.stats) setStats(data.stats);

      if (data.store) {
        setStName(data.store.name || "");
        setStPhone(data.store.phone || "");
        setStAddress(data.store.address || "");
        setStHours(data.store.social_links?.working_hours || "09:00 - 21:00");
        setStLogo(data.store.logo_url || "");
        setStBanner(data.store.social_links?.banner_url || "");
        setStDesc(data.store.description || "");
        setStCategory(data.store.category || "Kiyim-kechak");
      }
      setAuthStatus("ready");
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      setAuthStatus("error");
    }
  }, [prodCat]);

  const initTelegram = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
    if (tg && tg.initData) {
      try {
        tg.ready();
        tg.expand();
        const authRes = await fetch("/api/auth/telegram-seller-webapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        });
        const authData = await authRes.json();
        if (!authRes.ok || !authData.ok) {
          setAuthError(authData.error || "Telegram orqali kirish tasdiqlanmadi.");
          setAuthStatus("error");
          return;
        }
      } catch {
        // Fallback to existing browser session check
      }
    }
    await loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      initTelegram();
    }, 300);
    return () => clearTimeout(timer);
  }, [initTelegram]);

  const toggleSize = (sz: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  };

  const handleQuickProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdNotice(null);
    if (!prodName.trim() || !prodPrice || !prodCat || selectedSizes.length === 0) {
      setProdNotice("❌ Barcha majburiy maydonlarni va kamida 1 ta o'lchamni tanlang.");
      return;
    }

    setProdSaving(true);
    try {
      const qty = Math.max(0, parseInt(stockPerSize, 10) || 1);
      const variants = selectedSizes.map((size) => ({
        size,
        color: selectedColor.name,
        color_hex: selectedColor.hex,
        stock_quantity: qty,
      }));

      const res = await fetch("/api/sotuvchi/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName.trim(),
          description: prodDesc.trim() || `${prodName.trim()} — sifatli moda mahsuloti`,
          category_id: prodCat,
          gender: prodGender,
          condition: "new",
          base_price: Number(prodPrice),
          images: [prodImage.trim() || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800"],
          variants,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProdNotice(`❌ ${data.error || "Saqlashda xatolik"}`);
        return;
      }

      setProdNotice("✅ Mahsulot 1 daqiqada muvaffaqiyatli joylandi!");
      setProdName("");
      setProdPrice("");
      setProdImage("");
      setProdDesc("");
      await loadData();
    } catch {
      setProdNotice("❌ Tarmoq xatoligi.");
    } finally {
      setProdSaving(false);
    }
  };

  const handleStoreUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStNotice(null);
    setStSaving(true);
    try {
      const res = await fetch("/api/sotuvchi/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stName,
          description: stDesc || `${stName} — NOMA ishonchli do'koni`,
          address: stAddress,
          city: "Namangan",
          category: stCategory,
          phone: stPhone,
          logo_url: stLogo || null,
          banner_url: stBanner || null,
          working_hours: stHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStNotice(`❌ ${data.error || "Saqlanmadi"}`);
        return;
      }
      setStNotice("✅ Do'kon ma'lumotlari yangilandi!");
      await loadData();
    } catch {
      setStNotice("❌ Server xatoligi.");
    } finally {
      setStSaving(false);
    }
  };

  const handleOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/sotuvchi/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // ignore
    }
  };

  const handleSendComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompNotice(null);
    setCompSaving(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: compSubject,
          description: compDesc,
          target_type: "platform",
          phone: stPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompNotice(`❌ ${data.error || "Yuborilmadi"}`);
        return;
      }
      setCompNotice("✅ Murojaatingiz Admin Mini App va botiga yuborildi!");
      setCompSubject("");
      setCompDesc("");
    } catch {
      setCompNotice("❌ Tarmoq xatoligi.");
    } finally {
      setCompSaving(false);
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
        <p className="text-sm font-bold text-primary">Sotuvchi Mini App yuklanmoqda...</p>
      </div>
    );
  }

  if (authStatus === "error") {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-primary">Kirish tasdiqlanmadi</h2>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{authError}</p>
        <a
          href="/sotuvchi/kirish"
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold"
        >
          Veb orqali kirish
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />

      {/* Top Mini App Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-600 block">
            NOMA Sotuvchi Mini App
          </span>
          <h1 className="text-sm font-black text-primary truncate max-w-[210px]">
            {store?.name || "Yangi Do'kon"}
          </h1>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-primary transition"
          title="Yangilash"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* TAB 1: STATISTIKA */}
        {tab === "stats" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <span className="text-[11px] text-muted-foreground block">Umumiy tushum</span>
                <strong className="text-lg font-black text-primary mt-1 block">
                  {formatPrice(stats.totalRevenue)}
                </strong>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <span className="text-[11px] text-muted-foreground block">Yangi buyurtmalar</span>
                <strong className="text-lg font-black text-accent-600 mt-1 block">
                  {stats.pendingOrders} ta
                </strong>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <span className="text-[11px] text-muted-foreground block">Faol mahsulotlar</span>
                <strong className="text-lg font-black text-primary mt-1 block">
                  {stats.activeProducts} ta
                </strong>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <span className="text-[11px] text-muted-foreground block">Kam qoldiq</span>
                <strong className={`text-lg font-black mt-1 block ${stats.lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {stats.lowStockCount} ta
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTab("add")}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-primary to-accent-900 text-white flex items-center justify-between shadow-lg"
            >
              <div className="text-left">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Tezkor rejim
                </span>
                <strong className="text-sm font-black block mt-0.5">
                  1 daqiqada yangi tovar joylash
                </strong>
              </div>
              <PlusCircle className="w-6 h-6 text-white shrink-0" />
            </button>
          </div>
        )}

        {/* TAB 2: 1-DAQIQADA MAHSULOT JOYLASH */}
        {tab === "add" && (
          <form onSubmit={handleQuickProductSubmit} className="bg-white p-4 rounded-2xl border border-border space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Zap className="w-5 h-5 text-accent-600" />
              <div>
                <h2 className="text-sm font-black text-primary">1-Daqiqada Mahsulot Joylash</h2>
                <p className="text-[11px] text-muted-foreground">Tezkor formani to&apos;ldiring va darhol sotuvga chiqaring</p>
              </div>
            </div>

            {prodNotice && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${prodNotice.startsWith("✅") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                {prodNotice}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Mahsulot nomi *</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Masalan: Erkaklar klassik ko'ylagi"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-primary block mb-1">Narxi (so&apos;m) *</label>
                <input
                  type="number"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  placeholder="185000"
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-primary block mb-1">Bo&apos;lim *</label>
                <select
                  value={prodCat}
                  onChange={(e) => setProdCat(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-xs bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-primary block mb-1">Kimlar uchun</label>
                <select
                  value={prodGender}
                  onChange={(e) => setProdGender(e.target.value as typeof prodGender)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-xs bg-white"
                >
                  <option value="unisex">Barchaga</option>
                  <option value="men">Erkaklar</option>
                  <option value="women">Ayollar</option>
                  <option value="children">Bolalar</option>
                  <option value="sport">Sport</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-primary block mb-1">Har bir razmer soni</label>
                <input
                  type="number"
                  min={1}
                  value={stockPerSize}
                  onChange={(e) => setStockPerSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1.5">O&apos;lchamlar (Tanlang) *</label>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      selectedSizes.includes(sz)
                        ? "bg-primary text-white border-primary"
                        : "bg-zinc-50 text-muted-foreground border-border"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1.5">Rang</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                      selectedColor.name === col.name
                        ? "border-accent-600 bg-accent-50 text-accent-800"
                        : "border-border bg-white"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: col.hex }} />
                    <span>{col.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Rasm havolasi (URL)</label>
              <input
                type="url"
                value={prodImage}
                onChange={(e) => setProdImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Qisqa tavsif</label>
              <textarea
                rows={2}
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="Mato turi, o'lchamga mosligi haqida..."
                className="w-full px-3.5 py-2 border border-border rounded-xl text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={prodSaving}
              className="w-full py-3.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs transition disabled:opacity-50"
            >
              {prodSaving ? "Saqlanmoqda..." : "🚀 Darhol Sotuvga Chiqarish"}
            </button>
          </form>
        )}

        {/* TAB 3: BUYURTMALAR */}
        {tab === "orders" && (
          <div className="space-y-3 animate-in fade-in">
            <h2 className="text-sm font-black text-primary px-1">So&apos;nggi buyurtmalar ({orders.length})</h2>
            {orders.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
                Hozircha buyurtmalar yo&apos;q.
              </div>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="bg-white p-4 rounded-2xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary">#{ord.order_number}</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 text-primary uppercase">
                      {ord.status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p><strong className="text-primary">{ord.customer_name}</strong> • {ord.customer_phone}</p>
                    <p>{ord.delivery_address}</p>
                    <p className="font-bold text-primary pt-1">Jami: {formatPrice(ord.total_amount)}</p>
                  </div>
                  {(ord.status === "new" || ord.status === "pending") && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(ord.id, "accepted")}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        ✅ Qabul qilish
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(ord.id, "rejected")}
                        className="flex-1 py-2 rounded-xl bg-rose-100 text-rose-700 text-xs font-bold"
                      >
                        ❌ Rad etish
                      </button>
                    </div>
                  )}
                  {ord.status === "accepted" && (
                    <button
                      type="button"
                      onClick={() => handleOrderStatus(ord.id, "shipped")}
                      className="w-full py-2 rounded-xl bg-accent-600 text-white text-xs font-bold"
                    >
                      🚚 Yetkazishga chiqarish
                    </button>
                  )}
                  {ord.status === "shipped" && (
                    <button
                      type="button"
                      onClick={() => handleOrderStatus(ord.id, "delivered")}
                      className="w-full py-2 rounded-xl bg-primary text-white text-xs font-bold"
                    >
                      🎉 Yetkazildi deb belgilash
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: DO'KON PROFILI */}
        {tab === "store" && (
          <form onSubmit={handleStoreUpdate} className="bg-white p-4 rounded-2xl border border-border space-y-4 animate-in fade-in">
            <h2 className="text-sm font-black text-primary border-b border-border pb-3">
              Do&apos;kon ko&apos;rinishi va ma&apos;lumotlari
            </h2>

            {stNotice && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${stNotice.startsWith("✅") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                {stNotice}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Do&apos;kon nomi *</label>
              <input
                type="text"
                required
                value={stName}
                onChange={(e) => setStName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-primary block mb-1">
                  <Phone className="w-3 h-3 inline mr-1" /> Aloqa raqami *
                </label>
                <input
                  type="tel"
                  required
                  value={stPhone}
                  onChange={(e) => setStPhone(e.target.value)}
                  placeholder="+998901234567"
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-primary block mb-1">
                  <Clock className="w-3 h-3 inline mr-1" /> Ish vaqti
                </label>
                <input
                  type="text"
                  value={stHours}
                  onChange={(e) => setStHours(e.target.value)}
                  placeholder="09:00 - 21:00"
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1">
                <MapPin className="w-3 h-3 inline mr-1" /> Manzil *
              </label>
              <input
                type="text"
                required
                value={stAddress}
                onChange={(e) => setStAddress(e.target.value)}
                placeholder="Namangan sh., Chorsu..."
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Profil / Logo rasmi URL</label>
              <input
                type="url"
                value={stLogo}
                onChange={(e) => setStLogo(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Banner rasmi URL</label>
              <input
                type="url"
                value={stBanner}
                onChange={(e) => setStBanner(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Do&apos;kon haqida</label>
              <textarea
                rows={2}
                value={stDesc}
                onChange={(e) => setStDesc(e.target.value)}
                className="w-full px-3.5 py-2 border border-border rounded-xl text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={stSaving}
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition disabled:opacity-50"
            >
              {stSaving ? "Saqlanmoqda..." : "💾 O'zgarishlarni saqlash"}
            </button>
          </form>
        )}

        {/* TAB 5: MUROJAAT / SHIKOYAT */}
        {tab === "support" && (
          <form onSubmit={handleSendComplaint} className="bg-white p-4 rounded-2xl border border-border space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <MessageSquareWarning className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-black text-primary">Ma&apos;muriyatga murojaat / Shikoyat</h2>
                <p className="text-[11px] text-muted-foreground">Murojaat to&apos;g&apos;ridan-to&apos;g&apos;ri Admin Mini Appga tushadi</p>
              </div>
            </div>

            {compNotice && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${compNotice.startsWith("✅") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                {compNotice}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Mavzu *</label>
              <input
                type="text"
                required
                value={compSubject}
                onChange={(e) => setCompSubject(e.target.value)}
                placeholder="Masalan: To'lov yoki buyurtma bo'yicha savol"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-primary block mb-1">Batafsil matn *</label>
              <textarea
                rows={4}
                required
                value={compDesc}
                onChange={(e) => setCompDesc(e.target.value)}
                placeholder="Muammoni batafsil yozing..."
                className="w-full px-3.5 py-2 border border-border rounded-xl text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={compSaving}
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition disabled:opacity-50"
            >
              {compSaving ? "Yuborilmoqda..." : "📤 Admin Panelga Yuborish"}
            </button>
          </form>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border px-2 py-2 flex items-center justify-around">
        {[
          { id: "stats", icon: BarChart3, label: "Statistika" },
          { id: "add", icon: PlusCircle, label: "1-Daq Tovar" },
          { id: "orders", icon: Package, label: "Buyurtma" },
          { id: "store", icon: StoreIcon, label: "Do'kon" },
          { id: "support", icon: AlertTriangle, label: "Shikoyat" },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as TabType)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition ${
                active ? "text-accent-600" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
