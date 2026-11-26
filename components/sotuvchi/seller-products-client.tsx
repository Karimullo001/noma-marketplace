"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Edit, Eye, RotateCcw } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/database";

export function SellerProductsClient({ products }: { products: Product[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleArchive = async (product: Product) => {
    setBusyId(product.id);
    try {
      await fetch(`/api/sotuvchi/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !product.is_archived }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border p-12 text-center space-y-3">
        <p className="text-sm font-bold text-primary">Hozircha mahsulotlaringiz yo&apos;q</p>
        <Link
          href="/sotuvchi/mahsulot-qoshish"
          className="inline-block px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold"
        >
          Birinchi mahsulotni qo&apos;shish
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Mahsulot</th>
              <th className="py-3 px-4">Narx</th>
              <th className="py-3 px-4">Qoldiq</th>
              <th className="py-3 px-4">Holat</th>
              <th className="py-3 px-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => {
              const totalStock = (p.variants || []).reduce((s, v) => s + v.stock_quantity, 0);
              return (
                <tr key={p.id}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-11 h-14 rounded-lg object-cover border border-border shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-bold text-primary">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">{p.category?.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-primary">
                    {formatPrice(p.discount_price ?? p.base_price)}
                  </td>
                  <td className="py-3 px-4 font-semibold">{totalStock} dona</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.is_archived
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {p.is_archived ? "Arxivda" : "Sotuvda"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/xaridor/mahsulot/${p.slug}`}
                        className="p-1.5 text-muted-foreground hover:text-accent"
                        title="Ko'rish"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/sotuvchi/mahsulotlar/${p.id}`}
                        className="p-1.5 text-muted-foreground hover:text-primary"
                        title="Tahrirlash"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => toggleArchive(p)}
                        className="p-1.5 text-muted-foreground hover:text-accent"
                        title={p.is_archived ? "Tiklash" : "Arxivlash"}
                      >
                        {p.is_archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
