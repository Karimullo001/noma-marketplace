import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { uzPhoneSchema } from "@/lib/validation/schemas";

const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: uzPhoneSchema.optional().or(z.literal("")),
});

export async function PATCH(request: Request) {
  const guard = await requireRole(["customer"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Profil ma'lumotlari noto'g'ri" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase!
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
    })
    .eq("id", guard.ctx.userId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
