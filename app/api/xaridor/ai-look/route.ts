import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isOpenAIConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

const PAYMENT_CARD = "5614 6803 0152 3011";
const LOOK_PRICE_UZS = 5000;
const FREE_TRIALS_LIMIT = 5;

export async function POST(req: NextRequest) {
  try {
    let body: {
      prompt: string;
      gender?: string;
      guestId?: string;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "So'rov ma'lumotlari noto'g'ri" }, { status: 400 });
    }

    const { prompt, gender, guestId } = body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: "Iltimos, kiyinish uslubi yoki tadbir haqida batafsilroq yozing." },
        { status: 400 }
      );
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { ok: false, error: "AI xizmati vaqtincha sozlanmagan. Iltimos, keyinroq urinib ko'ring." },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    let userId: string | null = null;
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          requireAuth: true,
          error: "AI Stilistdan foydalanish uchun avval Google (Gmail) orqali hisobingizga kiring.",
        },
        { status: 401 }
      );
    }

    const trackerId = `user:${userId}`;

    // Count previous AI look generations
    let usedCount = 0;
    if (admin) {
      const { count } = await admin
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "ai_look_generated")
        .eq("payload->>tracker_id", trackerId);

      usedCount = count || 0;
    }

    // Check free trial limit
    if (usedCount >= FREE_TRIALS_LIMIT) {
      return NextResponse.json({
        ok: false,
        requiresPayment: true,
        usedCount,
        freeLimit: FREE_TRIALS_LIMIT,
        price: LOOK_PRICE_UZS,
        paymentCard: PAYMENT_CARD,
        error: `Siz 5 ta bepul imkoniyatdan foydalandingiz. Cheksiz AI Stilist oylik obunasi: oyiga 5,000 so'm. To'lov kartasi: ${PAYMENT_CARD}`,
      });
    }

    // Fetch active products from catalog
    let products: Array<{
      id: string;
      title: string;
      price: number;
      category: string;
      images: string[];
      description?: string;
      store?: { name: string } | null;
    }> = [];

    if (admin) {
      const { data: dbProducts } = await admin
        .from("products")
        .select("id, name, base_price, discount_price, images, description, category:categories(name), store:stores(name)")
        .eq("is_active", true)
        .eq("is_archived", false)
        .limit(25);

      if (dbProducts && dbProducts.length > 0) {
        products = dbProducts.map((p) => {
          const catObj = Array.isArray(p.category) ? p.category[0] : p.category;
          const storeObj = Array.isArray(p.store) ? p.store[0] : p.store;
          return {
            id: p.id,
            title: p.name,
            price: Number(p.discount_price ?? p.base_price) || 0,
            category: (catObj as { name?: string } | null)?.name || "Kiyim",
            images: Array.isArray(p.images) ? p.images : [],
            description: p.description,
            store: storeObj as { name: string } | null,
          };
        });
      }
    }

    // Call OpenAI Chat Completions API
    const apiKey = process.env.OPENAI_API_KEY!;
    const systemPrompt = `You are NOMA AI Stilist, an elite fashion consultant for NOMA Marketplace in Namangan, Uzbekistan.
Your job is to read the user's style query in Uzbek/Russian and curate a complete, stylish, coordinated outfit/look matching real products from the catalog.
Always respond in fluent, elegant Uzbek (Latin script).
You must return a valid JSON object only with this structure:
{
  "look_title": "O'zbekcha jarangdor obraz nomi (masalan: 'Klassik Bahor To'plami' yoki 'Yengil Shahar Look')",
  "description": "Nima uchun bu kiyimlar tanlanganligi, ranglar mutanosibligi va uslub haqida batafsil tushuntirish (2-3 jumla).",
  "styling_tips": ["Maslahat 1 (poyabzal, soch, aksessuar haqida)", "Maslahat 2 (ob-havo yoki tadbirga mosligi)"],
  "selected_product_ids": ["uuid_1", "uuid_2"]
}
Only pick IDs that exist in the provided catalog. If catalog is small, pick the 2 to 4 most relevant items.`;

    const userMessage = `Foydalanuvchi talabi: "${prompt}".
Jinsi / Qo'shimcha: "${gender || "Har qanday"}".

Mavjud tovarlar katalogi:
${JSON.stringify(
  products.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    price: p.price,
    store: p.store?.name,
  }))
)}`;

    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      console.error("[AI Look] OpenAI error:", openAiRes.status, errText);
      return NextResponse.json(
        { ok: false, error: "AI modelidan javob olishda xatolik yuz berdi." },
        { status: 502 }
      );
    }

    const openAiData = await openAiRes.json();
    const content = openAiData.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ ok: false, error: "AI javob qaytarmadi" }, { status: 500 });
    }

    let parsedAi: {
      look_title: string;
      description: string;
      styling_tips: string[];
      selected_product_ids: string[];
    };

    try {
      parsedAi = JSON.parse(content);
    } catch {
      return NextResponse.json({ ok: false, error: "AI javobi formatlanmadi" }, { status: 500 });
    }

    // Match selected products with full catalog details
    const selectedIds = Array.isArray(parsedAi.selected_product_ids)
      ? parsedAi.selected_product_ids
      : [];
    let matchedProducts = products.filter((p) => selectedIds.includes(p.id));

    // Fallback if AI selected non-existent IDs: pick up to 3 catalog products
    if (matchedProducts.length === 0 && products.length > 0) {
      matchedProducts = products.slice(0, 3);
    }

    const totalEstimatedPrice = matchedProducts.reduce((sum, p) => sum + (p.price || 0), 0);

    // Record usage in audit_logs
    if (admin) {
      try {
        await admin.from("audit_logs").insert({
          actor_id: userId,
          actor_role: userId ? "customer" : "guest",
          action: "ai_look_generated",
          target_type: "ai_look",
          payload: {
            tracker_id: trackerId,
            prompt,
            gender,
            look_title: parsedAi.look_title,
            selected_ids: matchedProducts.map((p) => p.id),
          },
        });
      } catch (logErr) {
        console.error("[AI Look] Failed to log usage:", logErr);
      }
    }

    const remainingTrials = Math.max(0, FREE_TRIALS_LIMIT - (usedCount + 1));

    return NextResponse.json({
      ok: true,
      look: {
        title: parsedAi.look_title || "NOMA Tanlangan Obraz",
        description: parsedAi.description || "Ushbu to'plam sizning didingizga mos ravishda saralandi.",
        stylingTips: parsedAi.styling_tips || [],
        totalPrice: totalEstimatedPrice,
        products: matchedProducts,
      },
      usedCount: usedCount + 1,
      freeLimit: FREE_TRIALS_LIMIT,
      remainingTrials,
      paymentCard: PAYMENT_CARD,
      paidPrice: LOOK_PRICE_UZS,
    });
  } catch (err: unknown) {
    console.error("[AI Look] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Kutilmagan server xatoligi" },
      { status: 500 }
    );
  }
}
