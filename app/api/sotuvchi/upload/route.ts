import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const guard = await requireRole(["seller", "admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Fayl ma'lumotlari noto'g'ri" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Rasm fayli tanlanmadi" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Faqat JPG, PNG yoki WEBP formatdagi rasmlar ruxsat etiladi" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Rasm hajmi 5 MB dan oshmasligi kerak" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const filePath = `${guard.ctx.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ensure bucket exists (idempotent)
  await admin.storage.createBucket("product-images", {
    public: true,
    fileSizeLimit: MAX_SIZE_BYTES,
  }).catch(() => null);

  const { error: uploadError } = await admin.storage
    .from("product-images")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Rasmni yuklashda xatolik: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: publicData } = admin.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return NextResponse.json({
    ok: true,
    url: publicData.publicUrl,
  });
}
