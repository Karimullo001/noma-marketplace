import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { uzPhoneSchema } from "@/lib/validation/schemas";

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Uy"),
  city: z.string().trim().min(2).max(50).default("Namangan"),
  street_address: z.string().trim().min(5).max(200),
  landmark: z.string().trim().max(120).optional(),
  phone: uzPhoneSchema,
});

export async function GET() {
  const guard = await requireRole(["customer"]);
  if (!guard.ok) return guard.response;

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase!
    .from("addresses")
    .select("*")
    .eq("user_id", guard.ctx.userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireRole(["customer"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Manzil noto'g'ri" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase!
    .from("addresses")
    .insert({
      user_id: guard.ctx.userId,
      ...parsed.data,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ address: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireRole(["customer"]);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID kerak" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  await supabase!.from("addresses").delete().eq("id", id).eq("user_id", guard.ctx.userId);
  return NextResponse.json({ success: true });
}
