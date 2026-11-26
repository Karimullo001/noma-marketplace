import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productFormSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils";

export async function GET() {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;
  if (!guard.ctx.store) return NextResponse.json({ products: [] });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase!
    .from("products")
    .select("*, category:categories(*), brand:brands(*), variants:product_variants(*)")
    .eq("store_id", guard.ctx.store.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;
  if (!guard.ctx.store) {
    return NextResponse.json({ error: "Avval do'koningizni yarating." }, { status: 400 });
  }
  if (guard.ctx.store.status !== "active") {
    return NextResponse.json({ error: "Do'koningiz to'xtatilgan. Yangi mahsulot qo'shib bo'lmaydi." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = productFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Mahsulot ma'lumotlari noto'g'ri" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });

  let brandId: string | null = null;
  if (parsed.data.brand_name?.trim()) {
    const brandSlug = slugify(parsed.data.brand_name);
    const { data: existingBrand } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", brandSlug)
      .maybeSingle();

    if (existingBrand) {
      brandId = existingBrand.id;
    } else {
      const { data: newBrand } = await supabase
        .from("brands")
        .insert({ name: parsed.data.brand_name.trim(), slug: brandSlug })
        .select("id")
        .single();
      brandId = newBrand?.id ?? null;
    }
  }

  const productSlug = `${slugify(parsed.data.name)}-${Date.now().toString(36).slice(-5)}`;

  const { data: product, error: prodErr } = await supabase
    .from("products")
    .insert({
      store_id: guard.ctx.store.id,
      category_id: parsed.data.category_id,
      brand_id: brandId,
      name: parsed.data.name,
      slug: productSlug,
      description: parsed.data.description,
      gender: parsed.data.gender,
      material: parsed.data.material || null,
      condition: parsed.data.condition,
      base_price: parsed.data.base_price,
      discount_price: parsed.data.discount_price ?? null,
      images: parsed.data.images,
      is_active: true,
      is_archived: false,
    })
    .select("*")
    .single();

  if (prodErr || !product) {
    return NextResponse.json({ error: prodErr?.message || "Mahsulot saqlanmadi" }, { status: 400 });
  }

  const variantsPayload = parsed.data.variants.map((v) => ({
    product_id: product.id,
    size: v.size,
    color: v.color,
    color_hex: v.color_hex || null,
    sku: v.sku || null,
    stock_quantity: v.stock_quantity,
  }));

  const { error: varErr } = await supabase.from("product_variants").insert(variantsPayload);
  if (varErr) {
    await supabase.from("products").delete().eq("id", product.id);
    return NextResponse.json({ error: `Variant xatoligi: ${varErr.message}` }, { status: 400 });
  }

  return NextResponse.json({ product }, { status: 201 });
}
