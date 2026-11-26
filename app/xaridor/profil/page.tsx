import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileClient } from "@/components/xaridor/profile-client";
import type { Address, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function XaridorProfilPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/xaridor/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/xaridor/kirish?next=/xaridor/profil");

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-black text-primary">Shaxsiy kabinet</h1>
      <ProfileClient profile={profile as Profile} addresses={(addresses as Address[]) || []} />
    </div>
  );
}
