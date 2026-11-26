import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductFormClient } from "@/components/sotuvchi/product-form-client";
import type { Category } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MahsulotQoshishPage() {
  const supabase = (await createServerSupabaseClient())!;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary">Yangi mahsulot qo&apos;shish</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Har bir o&apos;lcham va rang uchun aniq qoldiqni kiriting
        </p>
      </div>
      <ProductFormClient userId={user!.id} categories={(categories as Category[]) || []} />
    </div>
  );
}
