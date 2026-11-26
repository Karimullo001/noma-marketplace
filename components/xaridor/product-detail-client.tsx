"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Heart,
  MapPin,
  Star,
  Store as StoreIcon,
  Truck,
  Check,
  AlertCircle,
} from "lucide-react";
import { formatPrice, formatDateTashkent } from "@/lib/utils";
import type { Product, ProductVariant, Review } from "@/types/database";

interface ProductDetailClientProps {
  product: Product;
  reviews: Review[];
  initialFavorited: boolean;
}

export function ProductDetailClient({
  product,
  reviews,
  initialFavorited,
}: ProductDetailClientProps) {
  const router = useRouter();
  const variants = product.variants || [];
  const inStockVariants = variants.filter((v) => v.stock_quantity > 0);
  const uniqueSizes = Array.from(new Set(variants.map((v) => v.size)));

  const [selectedImage, setSelectedImage] = useState(product.images?.[0] || "");
  const [selectedSize, setSelectedSize] = useState<string>(inStockVariants[0]?.size || uniqueSizes[0] || "");
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    inStockVariants[0] || null
  );
  const [quantity, setQuantity] = useState(1);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/xaridor/recently-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.id }),
    }).catch(() => {});
  }, [product.id]);

  // Colors available for selected size
  const variantsForSize = variants.filter((v) => v.size === selectedSize);

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    const matchingInStock = variants.find((v) => v.size === size && v.stock_quantity > 0);
    setSelectedVariant(matchingInStock || null);
    setQuantity(1);
    setFeedback(null);
  };

  const handleColorSelect = (variant: ProductVariant) => {
    if (variant.stock_quantity <= 0) return;
    setSelectedVariant(variant);
    setQuantity(1);
    setFeedback(null);
  };

  const activePrice = product.discount_price ?? product.base_price;
  const hasDiscount = Boolean(
    product.discount_price && product.discount_price < product.base_price
  );
  const discountPct = hasDiscount
    ? Math.round(((product.base_price - product.discount_price!) / product.base_price) * 100)
    : 0;

  const addItemToCart = async (redirectCheckout: boolean) => {
    if (!selectedVariant || selectedVariant.stock_quantity <= 0) {
      setFeedback({ ok: false, text: "Iltimos, omborda mavjud bo'lgan o'lcham va rangni tanlang." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/xaridor/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          variant_id: selectedVariant.id,
          quantity,
        }),
      });

      if (res.status === 401) {
        router.push(`/xaridor/kirish?next=${encodeURIComponent(`/xaridor/mahsulot/${product.slug}`)}`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, text: data.error || "Savatga qo'shib bo'lmadi." });
        return;
      }

      router.refresh();
      if (redirectCheckout) {
        router.push("/xaridor/buyurtma");
      } else {
        setFeedback({ ok: true, text: "Mahsulot savatingizga qo'shildi!" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = async () => {
    const res = await fetch("/api/xaridor/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.id }),
    });
    if (res.status === 401) {
      router.push("/xaridor/kirish");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setFavorited(Boolean(data.favorited));
      router.refresh();
    }
  };

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Gallery */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          {product.images.length > 1 && (
            <div className="flex sm:flex-col gap-3 overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-20 rounded-xl overflow-hidden border-2 shrink-0 ${
                    selectedImage === img ? "border-accent" : "border-border opacity-75"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 aspect-[3/4] rounded-3xl overflow-hidden bg-muted border border-border">
            {selectedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ShoppingBag className="w-12 h-12 opacity-40" />
              </div>
            )}

            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                -{discountPct}% Chegirma
              </span>
            )}

            <button
              type="button"
              onClick={toggleFavorite}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow"
              aria-label="Saralash"
            >
              <Heart className={`w-5 h-5 ${favorited ? "fill-rose-600 text-rose-600" : "text-primary"}`} />
            </button>
          </div>
        </div>

        {/* Info & Variant Picker */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-bold uppercase tracking-wider text-accent">
                {product.brand?.name || product.category?.name || "Moda"}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {Number(product.rating || 0).toFixed(1)} ({product.review_count} sharh)
              </span>
            </div>
            <h1 className="text-2xl font-black text-primary leading-tight">{product.name}</h1>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-border space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-primary">
                {formatPrice(activePrice)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.base_price)}
                </span>
              )}
            </div>
            <p className="text-xs text-accent font-medium">
              To&apos;lov buyurtma yetkazib berilganda (naqd yoki karta)
            </p>
          </div>

          {/* Size Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-primary">O&apos;lchamni tanlang:</span>
              <span className="text-muted-foreground">{selectedSize || "Tanlanmagan"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueSizes.map((size) => {
                const hasStock = variants.some((v) => v.size === size && v.stock_quantity > 0);
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!hasStock}
                    onClick={() => handleSizeSelect(size)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      !hasStock
                        ? "bg-muted text-muted-foreground/50 border-border line-through cursor-not-allowed"
                        : isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-primary border-border hover:border-accent"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          {variantsForSize.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-primary block">Rang va ombor qoldig&apos;i:</span>
              <div className="flex flex-wrap gap-2">
                {variantsForSize.map((v) => {
                  const outOfStock = v.stock_quantity <= 0;
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => handleColorSelect(v)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                        outOfStock
                          ? "bg-muted text-muted-foreground/60 border-border cursor-not-allowed line-through"
                          : isSelected
                          ? "border-accent bg-accent-50 text-accent font-bold"
                          : "bg-white border-border text-primary hover:border-accent"
                      }`}
                    >
                      {v.color_hex && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: v.color_hex }}
                        />
                      )}
                      <span>{v.color}</span>
                      <span className="text-[11px] opacity-75">
                        ({outOfStock ? "Tugagan" : `${v.stock_quantity} dona`})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-primary">Miqdor:</span>
            <div className="inline-flex items-center border border-border rounded-xl bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 font-bold text-primary"
              >
                -
              </button>
              <span className="w-10 text-center text-xs font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.min(selectedVariant?.stock_quantity || 1, q + 1))
                }
                className="w-9 h-9 font-bold text-primary"
              >
                +
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                feedback.ok
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {feedback.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={submitting || !selectedVariant || selectedVariant.stock_quantity <= 0}
              onClick={() => addItemToCart(false)}
              className="py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition"
            >
              Savatga qo&apos;shish
            </button>
            <button
              type="button"
              disabled={submitting || !selectedVariant || selectedVariant.stock_quantity <= 0}
              onClick={() => addItemToCart(true)}
              className="py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition"
            >
              Hozir sotib olish
            </button>
          </div>

          {/* Store & Delivery Info */}
          {product.store && (
            <div className="p-4 rounded-2xl bg-white border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <StoreIcon className="w-4 h-4 text-accent" />
                  <div>
                    <div className="text-xs font-bold text-primary">{product.store.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {product.store.address}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/xaridor/dokon/${product.store.slug}`}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Do&apos;kon &rarr;
                </Link>
              </div>
              <div className="pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Yetkazib berish do&apos;kon tomonidan mustaqil tashkil etiladi.</span>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
            <h2 className="text-sm font-bold text-primary">Mahsulot haqida</h2>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
            {product.material && (
              <p className="text-xs text-primary">
                <strong>Mato tarkibi:</strong> {product.material}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="pt-8 border-t border-border space-y-4">
        <h2 className="text-lg font-bold text-primary">Xaridorlar sharhlari ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground">Hozircha sharhlar qoldirilmagan.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-white border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">{r.customer?.full_name || "Xaridor"}</span>
                  <span className="text-muted-foreground">{formatDateTashkent(r.created_at)}</span>
                </div>
                <div className="text-amber-500 text-xs font-bold">
                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </div>
                <p className="text-xs text-foreground">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
