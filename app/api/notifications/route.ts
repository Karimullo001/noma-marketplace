import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  let body: { id?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.id) {
    await supabase!
      .from("notifications")
      .update({ is_read: true })
      .eq("id", body.id)
      .eq("user_id", ctx.userId);
  } else {
    await supabase!
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", ctx.userId)
      .eq("is_read", false);
  }

  return NextResponse.json({ success: true });
}
