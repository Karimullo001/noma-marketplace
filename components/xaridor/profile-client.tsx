"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Trash2, Check } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";
import type { Address, Profile } from "@/types/database";

export function ProfileClient({
  profile,
  addresses,
}: {
  profile: Profile;
  addresses: Address[];
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [label, setLabel] = useState("Uy");
  const [street, setStreet] = useState("");
  const [addrPhone, setAddrPhone] = useState(profile.phone || "+998");

  const [compSubject, setCompSubject] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [compStatus, setCompStatus] = useState<string | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(null);
    setErrMsg(null);
    const res = await fetch("/api/xaridor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrMsg(data.error || "Saqlanmadi");
      return;
    }
    setSavedMsg("Profil yangilandi");
    router.refresh();
  };

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    const res = await fetch("/api/xaridor/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        city: APP_CONFIG.defaultCity,
        street_address: street,
        phone: addrPhone,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrMsg(data.error || "Manzil qo'shilmadi");
      return;
    }
    setStreet("");
    router.refresh();
  };

  const deleteAddress = async (id: string) => {
    await fetch(`/api/xaridor/addresses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <h2 className="text-base font-bold text-primary">Shaxsiy ma&apos;lumotlar</h2>
        {savedMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" /> {savedMsg}
          </div>
        )}
        {errMsg && <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs">{errMsg}</div>}
        <div>
          <label className="text-xs font-semibold block mb-1">Ism familiya</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-10 rounded-xl border border-border px-3 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Telefon raqami</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998901234567"
            className="w-full h-10 rounded-xl border border-border px-3 text-sm font-mono bg-background"
          />
        </div>
        {profile.email && (
          <div className="text-xs text-muted-foreground">Email: {profile.email}</div>
        )}
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold">
          Saqlash
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <h2 className="text-base font-bold text-primary">Saqlangan manzillar</h2>
        <div className="space-y-2">
          {addresses.length === 0 ? (
            <p className="text-xs text-muted-foreground">Saqlangan manzil yo&apos;q.</p>
          ) : (
            addresses.map((a) => (
              <div key={a.id} className="p-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-primary inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-accent" /> {a.label} ({a.city})
                  </span>
                  <div className="text-muted-foreground">{a.street_address} • {a.phone}</div>
                </div>
                <button type="button" onClick={() => deleteAddress(a.id)} className="text-muted-foreground hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={addAddress} className="pt-3 border-t border-border space-y-3">
          <h3 className="text-xs font-bold text-primary">Yangi manzil qo&apos;shish</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Uy / Ishxona"
              className="h-9 rounded-lg border border-border px-3 text-xs bg-background"
            />
            <input
              type="tel"
              required
              value={addrPhone}
              onChange={(e) => setAddrPhone(e.target.value)}
              placeholder="+998901234567"
              className="h-9 rounded-lg border border-border px-3 text-xs font-mono bg-background"
            />
          </div>
          <input
            type="text"
            required
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Namangan sh., ko'cha va uy raqami"
            className="w-full h-9 rounded-lg border border-border px-3 text-xs bg-background"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold">
            Manzil qo&apos;shish
          </button>
        </form>
      </div>

      {/* Shikoyat / Murojaat */}
      <div className="bg-white p-6 rounded-2xl border border-border space-y-4">
        <div>
          <h3 className="text-sm font-bold text-primary">Shikoyat yoki murojaat yuborish</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Do&apos;kon, buyurtma yoki xizmat sifatidan norozi bo&apos;lsangiz, to&apos;g&apos;ridan-to&apos;g&apos;ri ma&apos;muriyatga yozing.
          </p>
        </div>
        {compStatus && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {compStatus}
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setCompStatus(null);
            const res = await fetch("/api/complaints", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subject: compSubject,
                description: compDesc,
                target_type: "platform",
                phone: phone || addrPhone,
              }),
            });
            if (res.ok) {
              setCompStatus("✅ Murojaatingiz Admin panelga yuborildi!");
              setCompSubject("");
              setCompDesc("");
            } else {
              const d = await res.json();
              setErrMsg(d.error || "Xatolik");
            }
          }}
          className="space-y-3"
        >
          <input
            type="text"
            required
            value={compSubject}
            onChange={(e) => setCompSubject(e.target.value)}
            placeholder="Mavzu (masalan: Buyurtma kechikdi)"
            className="w-full h-9 rounded-lg border border-border px-3 text-xs bg-background"
          />
          <textarea
            rows={3}
            required
            value={compDesc}
            onChange={(e) => setCompDesc(e.target.value)}
            placeholder="Batafsil izoh yozing..."
            className="w-full rounded-lg border border-border p-3 text-xs bg-background resize-none"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">
            Adminga yuborish
          </button>
        </form>
      </div>
    </div>
  );
}
