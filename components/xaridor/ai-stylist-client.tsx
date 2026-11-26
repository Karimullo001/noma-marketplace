"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Wand2,
  AlertCircle,
  Check,
  CreditCard,
  Copy,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface MatchedProduct {
  id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  description?: string;
  store?: { name: string } | null;
}

interface LookResult {
  title: string;
  description: string;
  stylingTips: string[];
  totalPrice: number;
  products: MatchedProduct[];
}

const PRESET_STYLES = [
  { label: "🤵 Klassik / To'y", prompt: "To'y va tantanali marosimlar uchun klassik zamonaviy erkaklar libosi" },
  { label: "🌸 Bahorgi Elegant", prompt: "Bahor mavsumiga mos nafis, yengil ayollar kiyimlari to'plami" },
  { label: "☕ Kundalik Casual", prompt: "Shahar bo'ylab sayr va uchrashuvlar uchun qulay, zamonaviy casual look" },
  { label: "👟 Sport / Qulay", prompt: "Faol harakat va mashg'ulotlar uchun erkin va sifatli sport kiyimlari" },
];

export function AiStylistClient() {
  const [prompt, setPrompt] = useState("");
  const [gender, setGender] = useState<string>("Barchasi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [look, setLook] = useState<LookResult | null>(null);
  const [remainingTrials, setRemainingTrials] = useState<number>(5);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [guestId, setGuestId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem("noma_ai_guest_id");
    if (!id) {
      id = "gst_" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("noma_ai_guest_id", id);
    }
    setGuestId(id);
  }, []);

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = (customPrompt || prompt).trim();
    if (!textToUse) {
      setError("Iltimos, o'zingiz xohlagan stil haqida yozing yoki quyidagi tayyor namunalardan tanlang.");
      return;
    }

    setError(null);
    setLoading(true);
    setLook(null);

    try {
      const res = await fetch("/api/xaridor/ai-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToUse,
          gender: gender === "Barchasi" ? undefined : gender,
          guestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.requiresPayment) {
          setShowPaymentModal(true);
        } else {
          setError(data.error || "Obraz yaratishda xatolik yuz berdi.");
        }
        return;
      }

      setLook(data.look);
      if (typeof data.remainingTrials === "number") {
        setRemainingTrials(data.remainingTrials);
      }
    } catch {
      setError("Tarmoq xatoligi yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCard = () => {
    navigator.clipboard.writeText("5614 6803 0152 3011");
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-accent-950 p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-500/20 border border-accent-400/30 text-accent-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NOMA Sun&apos;iy Intellekt Stilisti</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Sizning shaxsiy didingizga mos kiyimlar to&apos;plami (Look)
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            Qanday tadbirga yoki uslubda kiyinmoqchi ekanligingizni ayting. NOMA AI butun Namangan bozori katalogidan eng mos tovarlarni tanlab, mukammal obraz yaratib beradi.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>5 ta bepul imkoniyat mavjud • Hozirda qoldi: <strong className="text-emerald-400 font-bold">{remainingTrials} ta</strong></span>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Input Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-6">
        <div>
          <label className="text-sm font-bold text-primary block mb-2">
            Qanday stillda kiyinmoqchisiz?
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Masalan: 'Ertaga do'stimning to'yiga bormoqchiman, zamonaviy lekin ortiqcha yaltiroq bo'lmagan qora/to'q ko'k tusdagi kostyum-shim va poyabzal tavsiya qil'..."
              className="w-full px-4 py-3 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
            />
          </div>
        </div>

        {/* Gender / Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Moslik:</span>
          {["Barchasi", "Erkaklar", "Ayollar"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                gender === g
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Presets */}
        <div>
          <span className="text-xs font-semibold text-muted-foreground block mb-2">
            Tezkor namunalar:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_STYLES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPrompt(preset.prompt);
                  handleGenerate(preset.prompt);
                }}
                className="px-3.5 py-2 rounded-xl border border-border/80 bg-zinc-50 hover:bg-zinc-100 text-xs font-medium text-primary transition active:scale-95 text-left"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleGenerate()}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-sm transition shadow-md shadow-accent-600/20 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>NOMA AI Look yaratmoqda...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Look yaratish (AI Stilist)</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Look Result */}
      {look && (
        <div className="bg-white rounded-3xl border border-border shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 p-6 sm:p-8">
          <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-50 text-accent-700 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>NOMA AI Tavsiyasi</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-primary">{look.title}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                {look.description}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <span className="text-xs text-muted-foreground block">Taxminiy to&apos;plam narxi:</span>
              <strong className="text-xl sm:text-2xl font-black text-primary">
                {formatPrice(look.totalPrice)}
              </strong>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-3">To&apos;plamga kiritilgan tovarlar:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {look.products.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border/80 p-3.5 flex flex-col justify-between hover:shadow-sm transition bg-zinc-50/50"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted">
                      {item.images?.[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          Rasm yo&apos;q
                        </div>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-semibold backdrop-blur-sm">
                        {item.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-primary line-clamp-1">{item.title}</h4>
                      {item.store?.name && (
                        <p className="text-[11px] text-muted-foreground">Do&apos;kon: {item.store.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs font-black text-primary">
                      {formatPrice(item.price)}
                    </span>
                    <Link
                      href={`/xaridor/mahsulot/${item.id}`}
                      className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition inline-flex items-center gap-1"
                    >
                      <span>Ko&apos;rish</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Styling Tips */}
          {look.stylingTips && look.stylingTips.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-900">
                <Lightbulb className="w-4 h-4 text-amber-700" />
                <span>Stilist maslahatlari:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-900/90 leading-relaxed pl-1">
                {look.stylingTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Payment Required Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 border border-border shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-primary">Bepul imkoniyatlar yakunlandi</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Siz 5 ta bepul AI Look imkoniyatidan to&apos;liq foydalandingiz. Keyingi professional obrazlar uchun to&apos;lov: <strong>5,000 so&apos;m</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-border space-y-2 text-center">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                To&apos;lov uchun karta:
              </span>
              <div className="flex items-center justify-center gap-2">
                <code className="text-base sm:text-lg font-black tracking-wider text-primary">
                  5614 6803 0152 3011
                </code>
                <button
                  type="button"
                  onClick={handleCopyCard}
                  className="p-1.5 rounded-lg border border-border hover:bg-white text-muted-foreground transition"
                  title="Nusxa olish"
                >
                  {copiedCard ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copiedCard && (
                <span className="text-[11px] text-emerald-600 font-semibold block animate-in fade-in">
                  Karta raqami nusxalandi!
                </span>
              )}
              <span className="text-[11px] text-zinc-500 block">NOMA Market • Uzcard / Humo</span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  alert("To'lovingiz qabul qilingandan so'ng, qo'shimcha imkoniyatlar ochiladi. Chekni admin botimizga yuborishingiz mumkin.");
                }}
                className="w-full py-3.5 rounded-2xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs transition"
              >
                To&apos;lov qildim (Tasdiqlash)
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted/60 text-xs font-semibold transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
