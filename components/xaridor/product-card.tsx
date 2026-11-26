"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, Star, Store as StoreIcon, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/database";

interface ProductCardProps {
  product: Product;
  initialFavorited?: boolean;
}

export function ProductCard({ product, initialFavorited = false }: ProductCardProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [favPending, setFavPending] = useState(false);

  const activePrice = product.discount_price ?? product.base_price;
  const hasDiscount = Boolean(
    product.discount_price && product.discount_price < product.base_price
  );
  const discountPct = hasDiscount
    ? Math.round(((product.base_price - product.discount_price!) / product.base_price) * 100)
    : 0;

  const inStockVariants = (product.variants || []).filter((v) => v.stock_quantity > 0);
  const availableSizes = Array.from(new Set(inStockVariants.map((v) => v.size)));
  const totalStock = inStockVariants.reduce((sum, v) => sum + v.stock_quantity, 0);
  const coverImage = product.images?.[0];

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favPending) return;
    setFavPending(true);
    try {
      const res = await fetch("/api/xaridor/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      });
      if (res.status === 401) {
        window.location.href = "/xaridor/kirish";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFavorited(Boolean(data.favorited));
      }
    } finally {
      setFavPending(false);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary-200 transition-all flex flex-col h-full">
      <Link
        href={`/xaridor/mahsulot/${product.slug}`}
        className="relative aspect-[3/4] w-full bg-muted overflow-hidden block"
      >
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <ShoppingBag className="w-8 h-8 opacity-40" />
            <span className="text-xs">Rasm mavjud emas</span>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="bg-accent text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              -{discountPct}%
            </span>
          )}
          {totalStock === 0 && (
            <span className="bg-primary/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
              Tugagan
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggleFavorite}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition ${
            favorited
              ? "bg-rose-50 text-rose-600"
              : "bg-white/90 text-primary hover:text-rose-600"
          }`}
          aria-label="Saralanganlarga qo'shish"
        >
          <Heart className={`w-4 h-4 ${favorited ? "fill-rose-600" : ""}`} />
        </button>
      </Link>

      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
              <StoreIcon className="w-3 h-3 text-accent shrink-0" />
              <span className="truncate">{product.store?.name || "Do'kon"}</span>
            </span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {Number(product.rating || 0).toFixed(1)}
            </span>
          </div>

          <Link href={`/xaridor/mahsulot/${product.slug}`}>
            <h3 className="text-xs sm:text-sm font-semibold text-primary group-hover:text-accent transition line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {availableSizes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {availableSizes.slice(0, 4).map((size) => (
                <span
                  key={size}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-primary border border-border"
                >
                  {size}
                </span>
              ))}
              {availableSizes.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{availableSizes.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border/60 flex items-end justify-between gap-2">
          <div>
            <div className="text-sm sm:text-base font-bold text-primary leading-tight">
              {formatPrice(activePrice)}
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-muted-foreground line-through">
                {formatPrice(product.base_price)}
              </div>
            )}
          </div>

          <Link
            href={`/xaridor/mahsulot/${product.slug}`}
            className="px-2.5 py-1.5 rounded-lg bg-accent-50 hover:bg-accent text-accent hover:text-white text-[11px] font-semibold transition shrink-0"
          >
            Tanlash
          </Link>
        </div>
      </div>
    </div>
  );
}
