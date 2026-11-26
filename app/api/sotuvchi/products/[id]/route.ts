import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productFormSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;
  if (!guard.ctx.store) return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });

  const { data: existing } = await supabase
    .from("products")
    .select("id, store_id")
    .eq("id", params.id)
    .eq("store_id", guard.ctx.store.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  // Quick archive / restore toggle
  if (typeof body.is_archived === "boolean" && Object.keys(body).length <= 2) {
    const { data, error } = await supabase
      .from("products")
      .update({
        is_archived: body.is_archived,
        is_active: !body.is_archived,
      })
      .eq("id", params.id)
      .eq("store_id", guard.ctx.store.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ product: data });
  }

  const parsed = productFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" },
      { status: 400 }
    );
  }

  let brandId: string | null = null;
  if (parsed.data.brand_name?.trim()) {
    const brandSlug = slugify(parsed.data.brand_name);
    const { data: foundBrand } = await supabase.from("brands").select("id").eq("slug", brandSlug).maybeSingle();
    if (foundBrand) {
      brandId = foundBrand.id;
    } else {
      const { data: createdBrand } = await supabase
        .from("brands")
        .insert({ name: parsed.data.brand_name.trim(), slug: brandSlug })
        .select("id")
        .single();
      brandId = createdBrand?.id ?? null;
    }
  }

  const { data: updated, error: updErr } = await supabase
    .from("products")
    .update({
      category_id: parsed.data.category_id,
      brand_id: brandId,
      name: parsed.data.name,
      description: parsed.data.description,
      gender: parsed.data.gender,
      material: parsed.data.material || null,
      condition: parsed.data.condition,
      base_price: parsed.data.base_price,
      discount_price: parsed.data.discount_price ?? null,
      images: parsed.data.images,
    })
    .eq("id", params.id)
    .eq("store_id", guard.ctx.store.id)
    .select("*")
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  // Sync variants
  for (const v of parsed.data.variants) {
    if (v.id) {
      await supabase
        .from("product_variants")
        .update({
          size: v.size,
          color: v.color,
          color_hex: v.color_hex || null,
          sku: v.sku || null,
          stock_quantity: v.stock_quantity,
        })
        .eq("id", v.id)
        .eq("product_id", params.id);
    } else {
      await supabase.from("product_variants").upsert(
        {
          product_id: params.id,
          size: v.size,
          color: v.color,
          color_hex: v.color_hex || null,
          sku: v.sku || null,
          stock_quantity: v.stock_quantity,
        },
        { onConflict: "product_id,size,color" }
      );
    }
  }

  return NextResponse.json({ product: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;
  if (!guard.ctx.store) return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase!
    .from("products")
    .update({ is_archived: true, is_active: false })
    .eq("id", params.id)
    .eq("store_id", guard.ctx.store.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
