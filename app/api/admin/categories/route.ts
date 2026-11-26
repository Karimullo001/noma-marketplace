import { NextResponse } from "next/server";
import { requireRole, writeAuditLog } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { categorySchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return NextResponse.json({ error: "Server bazasi sozlanmagan" }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Noto'g'ri kategoriya" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("categories")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      parent_id: parsed.data.parent_id ?? null,
      icon: parsed.data.icon ?? null,
      display_order: parsed.data.display_order,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: "CREATE_CATEGORY",
    entityType: "category",
    entityId: data.id,
    details: { name: data.name, slug: data.slug },
  });

  return NextResponse.json({ category: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return NextResponse.json({ error: "Server bazasi sozlanmagan" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID kerak" }, { status: 400 });

  const { error } = await adminClient.from("categories").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Ushbu bo'limga bog'langan mahsulotlar mavjud bo'lishi mumkin." },
      { status: 400 }
    );
  }

  await writeAuditLog({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: "DELETE_CATEGORY",
    entityType: "category",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
