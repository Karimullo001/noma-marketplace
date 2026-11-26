"use client";

import React, { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import {
  BarChart3,
  AlertTriangle,
  Store as StoreIcon,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Ban,
  Users,
  ShoppingBag,
  Package,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

type AdminTab = "stats" | "complaints" | "stores" | "apps";

interface StoreItem {
  id: string;
  name: string;
  city: string;
  phone: string;
  category: string;
  status: "active" | "suspended";
  created_at: string;
}

interface ComplaintItem {
  id: string;
  reporter_role: string;
  reporter_name: string;
  reporter_phone: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

interface ApplicationItem {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
}

export default function AdminMiniAppPage() {
  const [authStatus, setAuthStatus] = useState<"loading" | "ready" | "error">("loading");
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>("stats");

  const [stats, setStats] = useState({
    usersCount: 0,
    activeStores: 0,
    suspendedStores: 0,
    productsCount: 0,
    ordersCount: 0,
    gmv: 0,
    pendingComplaints: 0,
  });
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mini-app");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAuthError("Faqat NOMA platformasi administratorlari kira oladi.");
          setAuthStatus("error");
          return;
        }
        throw new Error("Ma'lumot yuklanmadi");
      }
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      setStores(data.stores || []);
      setComplaints(data.complaints || []);
      setApplications(data.applications || []);
      setAuthStatus("ready");
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      setAuthStatus("error");
    }
  }, []);

  const initTelegram = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
    if (tg && tg.initData) {
      try {
        tg.ready();
        tg.expand();
        const authRes = await fetch("/api/auth/telegram-admin-webapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        });
        const authData = await authRes.json();
        if (!authRes.ok || !authData.ok) {
          setAuthError(authData.error || "Administrator tasdiqlanmadi.");
          setAuthStatus("error");
          return;
        }
      } catch {
        // Fallback to browser session
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

  const handleComplaintStatus = async (id: string, status: string) => {
    await fetch("/api/complaints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await loadData();
  };

  const handleToggleStore = async (storeId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    await fetch("/api/admin/stores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, status: nextStatus }),
    });
    await loadData();
  };

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
        <p className="text-sm font-bold text-primary">Admin Mini App yuklanmoqda...</p>
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
        <h2 className="text-lg font-black text-primary">Kirish taqiqlangan</h2>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{authError}</p>
        <a href="/admin/kirish" className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold">
          Veb Admin Panel
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />

      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-300 block">
            NOMA Platforma Boshqaruvi
          </span>
          <h1 className="text-sm font-black">🛡️ Admin Mini App</h1>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* TAB 1: STATISTIKA */}
        {tab === "stats" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-gradient-to-br from-primary to-accent-950 text-white p-5 rounded-2xl shadow-md">
              <span className="text-xs text-zinc-300">Umumiy savdo aylanmasi (GMV)</span>
              <strong className="text-2xl font-black block mt-1">{formatPrice(stats.gmv)}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Users className="w-4 h-4 text-accent-600" />
                  <span>Foydalanuvchilar</span>
                </div>
                <strong className="text-xl font-black text-primary">{stats.usersCount}</strong>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <StoreIcon className="w-4 h-4 text-emerald-600" />
                  <span>Faol do&apos;konlar</span>
                </div>
                <strong className="text-xl font-black text-primary">{stats.activeStores}</strong>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Tovarlar soni</span>
                </div>
                <strong className="text-xl font-black text-primary">{stats.productsCount}</strong>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span>Buyurtmalar</span>
                </div>
                <strong className="text-xl font-black text-primary">{stats.ordersCount}</strong>
              </div>
            </div>

            {stats.pendingComplaints > 0 && (
              <button
                type="button"
                onClick={() => setTab("complaints")}
                className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-900"
              >
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>{stats.pendingComplaints} ta yangi shikoyat (jaloba) kutmoqda!</span>
                </div>
                <span className="text-xs font-black underline">Ko&apos;rish</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 2: JALOBALAR */}
        {tab === "complaints" && (
          <div className="space-y-3 animate-in fade-in">
            <h2 className="text-sm font-black text-primary px-1">
              Shikoyat va murojaatlar ({complaints.length})
            </h2>
            {complaints.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
                Hozircha hech qanday shikoyat tushmagan.
              </div>
            ) : (
              complaints.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded-2xl border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary">{c.subject}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === "resolved"
                          ? "bg-emerald-100 text-emerald-700"
                          : c.status === "investigating"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed">{c.description}</p>
                  <div className="text-[11px] text-muted-foreground">
                    <strong>{c.reporter_name}</strong> ({c.reporter_role}) • {c.reporter_phone || "Tel yo'q"}
                  </div>
                  {c.status !== "resolved" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleComplaintStatus(c.id, "investigating")}
                        className="flex-1 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold"
                      >
                        🔍 Ko&apos;rib chiqish
                      </button>
                      <button
                        type="button"
                        onClick={() => handleComplaintStatus(c.id, "resolved")}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        ✅ Hal qilindi
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: DO'KONLAR */}
        {tab === "stores" && (
          <div className="space-y-3 animate-in fade-in">
            <h2 className="text-sm font-black text-primary px-1">Barcha do&apos;konlar ({stores.length})</h2>
            {stores.map((st) => (
              <div key={st.id} className="bg-white p-4 rounded-2xl border border-border flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-primary">{st.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {st.category} • {st.phone}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      st.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {st.status === "active" ? "Faol" : "To'xtatilgan"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleStore(st.id, st.status)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ${
                    st.status === "active"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {st.status === "active" ? (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>To&apos;xtatish</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Yoqish</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: ARIZALAR */}
        {tab === "apps" && (
          <div className="space-y-3 animate-in fade-in">
            <h2 className="text-sm font-black text-primary px-1">Sotuvchi arizalari ({applications.length})</h2>
            {applications.map((app) => (
              <div key={app.id} className="bg-white p-4 rounded-2xl border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-primary">{app.full_name}</strong>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-100">
                    {app.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{app.email}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border px-2 py-2 flex items-center justify-around">
        {[
          { id: "stats", icon: BarChart3, label: "Statistika" },
          { id: "complaints", icon: AlertTriangle, label: "Jalobalar" },
          { id: "stores", icon: StoreIcon, label: "Do'konlar" },
          { id: "apps", icon: FileText, label: "Arizalar" },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as AdminTab)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
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
