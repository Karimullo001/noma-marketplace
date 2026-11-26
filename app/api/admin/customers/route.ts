import { NextResponse } from "next/server";
import { requireRole, writeAuditLog } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

const suspendUserSchema = z.object({
  user_id: z.string().uuid(),
  is_suspended: z.boolean(),
});

export async function PATCH(request: Request) {
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

  const parsed = suspendUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Parametrlar noto'g'ri" }, { status: 400 });

  if (parsed.data.user_id === guard.ctx.userId) {
    return NextResponse.json({ error: "O'zingizni bloklay olmaysiz" }, { status: 400 });
  }

  const { data: updated, error } = await adminClient
    .from("profiles")
    .update({ is_suspended: parsed.data.is_suspended })
    .eq("id", parsed.data.user_id)
    .neq("role", "admin")
    .select("*")
    .single();

  if (error || !updated) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

  await writeAuditLog({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: parsed.data.is_suspended ? "SUSPEND_USER" : "UNSUSPEND_USER",
    entityType: "profile",
    entityId: updated.id,
    details: { email: updated.email },
  });

  return NextResponse.json({ profile: updated });
}
