"use client";

import React, { useState, useEffect } from "react";
import { Send, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Copy, Check } from "lucide-react";

interface TelegramLinkStatus {
  linked: boolean;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  botUsername?: string;
}

export function SellerTelegramLink() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);
  const [linkData, setLinkData] = useState<{
    code: string;
    deepLink: string;
    botUsername: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/sotuvchi/telegram-link");
      if (!res.ok) throw new Error("Holatni yuklab bo'lmadi");
      const data = await res.json();
      setStatus(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleGenerateLink = async () => {
    try {
      setGenerating(true);
      setError(null);
      const res = await fetch("/api/sotuvchi/telegram-link", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Ulanish kodini yaratib bo'lmadi");
      }
      setLinkData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-6 shadow-sm animate-pulse space-y-3">
        <div className="h-5 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Telegram Bot orqali buyurtmalar</h2>
            <p className="text-xs text-muted-foreground">
              Mijozlar buyurtma bergan zahoti botga xabar keladi va botdan to&apos;g&apos;ridan-to&apos;g&apos;ri qabul qila olasiz
            </p>
          </div>
        </div>

        {status?.linked && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ulangan
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status?.linked ? (
        <div className="space-y-3 pt-2 border-t text-sm">
          <div className="bg-muted/50 p-3.5 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Ulangan profil:</span>
              <span className="font-semibold text-foreground">
                {status.telegramUsername ? `@${status.telegramUsername}` : `ID: ${status.telegramChatId}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Sotuvchi boti:</span>
              <a
                href={`https://t.me/${status.botUsername || "noma_sotuvchibot"}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 font-medium inline-flex items-center gap-1 hover:underline"
              >
                @{status.botUsername || "noma_sotuvchibot"}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Boshqa Telegram akkauntga ulamoqchimisiz?
            </p>
            <button
              onClick={handleGenerateLink}
              disabled={generating}
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
              Qayta ulash
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-2 border-t">
          {!linkData ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Botni ulash uchun tugmani bosing va 1 marta /start yuboring.
              </p>
              <button
                onClick={handleGenerateLink}
                disabled={generating}
                className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Kutilmoqda...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Telegramni ulash
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-900">
                  1 marta ishlatiladigan ulanish kodi:
                </span>
                <span className="text-[11px] text-muted-foreground">
                  10 daqiqa amal qiladi
                </span>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-sky-200 px-3 py-2 rounded-lg font-mono text-sm tracking-wider font-bold text-center text-foreground">
                  {linkData.code}
                </code>
                <button
                  onClick={() => copyToClipboard(linkData.code)}
                  className="px-3 py-2 bg-white border border-sky-200 rounded-lg text-xs font-medium hover:bg-muted text-foreground flex items-center gap-1.5"
                  title="Nusxalash"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Nusxalandi
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Nusxa
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={linkData.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Botda ochish va ulash
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={fetchStatus}
                  className="py-2.5 px-3 bg-white border border-sky-200 text-sky-900 font-medium text-xs rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tekshirish
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
