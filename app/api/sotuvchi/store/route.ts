import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { storeCreateSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils";

export async function GET() {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;
  return NextResponse.json({ store: guard.ctx.store ?? null });
}

export async function POST(request: Request) {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = storeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Do'kon ma'lumotlari noto'g'ri" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });

  const socialLinks: Record<string, string> = {};
  if (parsed.data.telegram) socialLinks.telegram = parsed.data.telegram;
  if (parsed.data.instagram) socialLinks.instagram = parsed.data.instagram;
  if (parsed.data.banner_url) socialLinks.banner_url = parsed.data.banner_url;
  if (parsed.data.working_hours) socialLinks.working_hours = parsed.data.working_hours;

  if (guard.ctx.store) {
    const { data, error } = await supabase
      .from("stores")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        address: parsed.data.address,
        city: parsed.data.city,
        category: parsed.data.category,
        phone: parsed.data.phone,
        logo_url: parsed.data.logo_url ?? guard.ctx.store.logo_url,
        social_links: socialLinks,
      })
      .eq("id", guard.ctx.store.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ store: data });
  }

  const uniqueSlug = `${slugify(parsed.data.name)}-${Date.now().toString(36).slice(-4)}`;

  const { data, error } = await supabase
    .from("stores")
    .insert({
      seller_id: guard.ctx.userId,
      name: parsed.data.name,
      slug: uniqueSlug,
      description: parsed.data.description,
      address: parsed.data.address,
      city: parsed.data.city,
      category: parsed.data.category,
      phone: parsed.data.phone,
      logo_url: parsed.data.logo_url ?? null,
      social_links: socialLinks,
      status: "active", // Store goes live in the marketplace immediately
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Notify admin bot on new store creation
  import("@/lib/telegram/events").then(({ notifyAdminNewStore }) => {
    notifyAdminNewStore(data.id).catch((err) => {
      console.error("[Store API] Failed to notify admin bot of new store:", err);
    });
  });

  return NextResponse.json({ store: data }, { status: 201 });
}
