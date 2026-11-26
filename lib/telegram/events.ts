import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enqueueTelegramNotification } from "./outbox";
import { TELEGRAM_CONFIG } from "./config";
import { formatPrice, ORDER_STATUS_UZ } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

/**
 * Triggered after checkout_cart creates orders.
 * Notifies the store owner (seller bot) and customer (customer bot),
 * and checks if any variants have dropped to low stock (<= 3).
 */
export async function notifyOrderCreated(orderId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  try {
    const { data: order, error } = await admin
      .from("orders")
      .select(`
        id,
        order_number,
        subtotal,
        delivery_fee,
        total_amount,
        status,
        customer_name,
        customer_phone,
        delivery_city,
        delivery_address,
        delivery_notes,
        customer_id,
        store_id,
        store:stores (
          id,
          name,
          seller_id,
          seller:profiles!stores_seller_id_fkey (
            id,
            telegram_chat_id
          )
        ),
        customer:profiles!orders_customer_id_fkey (
          id,
          telegram_chat_id
        ),
        items:order_items (
          id,
          product_name,
          variant_size,
          variant_color,
          quantity,
          unit_price,
          total_price,
          variant_id
        )
      `)
      .eq("id", orderId)
      .single();

    if (error || !order) {
      console.error("[Telegram Events] Failed to fetch order for notification:", error);
      return;
    }

    const store = order.store as unknown as {
      id: string;
      name: string;
      seller_id: string;
      seller?: { id: string; telegram_chat_id?: string | null };
    };

    const customer = order.customer as unknown as {
      id: string;
      telegram_chat_id?: string | null;
    } | null;

    const items = (order.items || []) as Array<{
      id: string;
      product_name: string;
      variant_size: string;
      variant_color: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      variant_id: string;
    }>;

    const sellerChatId = store?.seller?.telegram_chat_id;

    // 1. Notify Seller Bot if seller has linked their Telegram
    if (sellerChatId) {
      const itemsList = items
        .map(
          (it, idx) =>
            `${idx + 1}. <b>${it.product_name}</b>\n   O'lcham: ${it.variant_size} | Rang: ${it.variant_color}\n   ${it.quantity} dona x ${formatPrice(it.unit_price)} = ${formatPrice(it.total_price)}`
        )
        .join("\n\n");

      const totalSum = order.total_amount || order.subtotal;
      const notes = order.delivery_notes ? `\n📝 <b>Izoh:</b> ${order.delivery_notes}` : "";

      const sellerText =
        `🔔 <b>YANGI BUYURTMA #${order.order_number}</b>\n\n` +
        `🏪 <b>Do'kon:</b> ${store.name}\n\n` +
        `📦 <b>Mahsulotlar:</b>\n${itemsList}\n\n` +
        `💰 <b>Jami summa:</b> ${formatPrice(totalSum)}\n\n` +
        `👤 <b>Xaridor:</b> ${order.customer_name}\n` +
        `📞 <b>Telefon:</b> ${order.customer_phone}\n` +
        `📍 <b>Manzil:</b> ${order.delivery_city}, ${order.delivery_address}${notes}\n\n` +
        `<i>Iltimos, buyurtmani qabul qiling yoki rad eting:</i>`;

      await enqueueTelegramNotification({
        botType: "seller",
        chatId: sellerChatId,
        payload: {
          text: sellerText,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Qabul qilish",
                  callback_data: `order_status:${order.id}:accepted`,
                },
                {
                  text: "❌ Rad etish",
                  callback_data: `order_status:${order.id}:cancelled`,
                },
              ],
            ],
          },
        },
      });

      // Check low stock for ordered items
      for (const it of items) {
        if (it.variant_id) {
          const { data: variant } = await admin
            .from("product_variants")
            .select("id, stock_quantity, size, color, product:products(name)")
            .eq("id", it.variant_id)
            .single();

          if (variant && variant.stock_quantity <= 3) {
            const prodName = (variant.product as unknown as { name: string })?.name || it.product_name;
            const stockAlertText =
              `⚠️ <b>Kam qolgan tovar ogohlantirishi!</b>\n\n` +
              `📦 <b>Mahsulot:</b> ${prodName}\n` +
              `📏 <b>O'lcham:</b> ${variant.size} | <b>Rang:</b> ${variant.color}\n` +
              `🔢 <b>Qolgan zaxira:</b> ${variant.stock_quantity} dona\n\n` +
              `Omborni tekshirish uchun /ombor buyrug'ini yuboring.`;

            await enqueueTelegramNotification({
              botType: "seller",
              chatId: sellerChatId,
              payload: { text: stockAlertText },
              delaySeconds: 2, // Slight delay so main order alert arrives first
            });
          }
        }
      }
    }

    // 2. Notify Customer Bot if customer is linked
    const customerChatId = customer?.telegram_chat_id;
    if (customerChatId) {
      const customerText =
        `🛍 <b>Buyurtmangiz qabul qilindi!</b>\n\n` +
        `Buyurtma raqami: <b>#${order.order_number}</b>\n` +
        `Do'kon: <b>${store.name}</b>\n` +
        `Jami summa: <b>${formatPrice(order.total_amount || order.subtotal)}</b>\n` +
        `Holat: <b>Kutilmoqda ⏳</b>\n\n` +
        `Sotuvchi buyurtmangizni ko'rib chiqqach, bu yerda xabar olasiz. Buyurtmalaringizni ko'rish uchun /buyurtmalar buyrug'ini yuboring.`;

      await enqueueTelegramNotification({
        botType: "customer",
        chatId: customerChatId,
        payload: { text: customerText },
      });
    }
  } catch (err) {
    console.error("[Telegram Events] Error in notifyOrderCreated:", err);
  }
}

/**
 * Triggered when an order status changes (e.g. accepted, preparing, shipped, delivered, cancelled).
 * Notifies the customer via Customer Bot.
 */
export async function notifyOrderStatusChanged(
  orderId: string,
  newStatus: string,
  details?: {
    deliveryFee?: number | null;
    estimatedTime?: string | null;
    courierContact?: string | null;
    trackingNote?: string | null;
  }
): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  try {
    const { data: order, error } = await admin
      .from("orders")
      .select(`
        id,
        order_number,
        total_amount,
        subtotal,
        delivery_fee,
        status,
        customer_id,
        store:stores (
          name
        ),
        customer:profiles!orders_customer_id_fkey (
          id,
          telegram_chat_id
        )
      `)
      .eq("id", orderId)
      .single();

    if (error || !order) return;

    const customer = order.customer as unknown as {
      id: string;
      telegram_chat_id?: string | null;
    } | null;

    if (!customer?.telegram_chat_id) return;

    const storeName = (order.store as unknown as { name: string })?.name || "Do'kon";
    const statusLabel = ORDER_STATUS_UZ[newStatus as OrderStatus] || newStatus;

    let icon = "ℹ️";
    if (newStatus === "accepted") icon = "✅";
    else if (newStatus === "preparing") icon = "📦";
    else if (newStatus === "shipped") icon = "🚚";
    else if (newStatus === "delivered") icon = "🎉";
    else if (newStatus === "cancelled") icon = "❌";

    let text =
      `${icon} <b>Buyurtma holati o'zgardi!</b>\n\n` +
      `Buyurtma raqami: <b>#${order.order_number}</b>\n` +
      `Do'kon: <b>${storeName}</b>\n` +
      `Yangi holat: <b>${statusLabel}</b>\n`;

    if (details?.estimatedTime) {
      text += `⏱ Yetkazish vaqti: <b>${details.estimatedTime}</b>\n`;
    }
    if (details?.courierContact) {
      text += `📞 Kuryer: <b>${details.courierContact}</b>\n`;
    }
    if (details?.trackingNote) {
      text += `📝 Izoh: <i>${details.trackingNote}</i>\n`;
    }

    if (newStatus === "shipped") {
      text += `\nDo'kon kuryeri buyurtmangizni yo'lga chiqardi. Tez orada yetib boradi!`;
    } else if (newStatus === "delivered") {
      text += `\nBuyurtma yetkazildi. Xaridingiz uchun rahmat!`;
    } else if (newStatus === "cancelled") {
      text += `\nAfsuski, ushbu buyurtma bekor qilindi.`;
    }

    await enqueueTelegramNotification({
      botType: "customer",
      chatId: customer.telegram_chat_id,
      payload: { text },
    });
  } catch (err) {
    console.error("[Telegram Events] Error in notifyOrderStatusChanged:", err);
  }
}

/**
 * Triggered when a new store is created or submitted for approval.
 * Notifies the platform administrator via Admin Bot.
 */
export async function notifyAdminNewStore(storeId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  const adminChatIds = TELEGRAM_CONFIG.adminChatIds;
  if (!adminChatIds || adminChatIds.length === 0) return;

  try {
    const { data: store, error } = await admin
      .from("stores")
      .select("id, name, city, phone, category, status, seller:profiles!stores_seller_id_fkey(full_name, email)")
      .eq("id", storeId)
      .single();

    if (error || !store) return;

    const seller = store.seller as unknown as { full_name?: string; email?: string } | null;
    const sellerInfo = seller?.full_name ? `${seller.full_name} (${seller.email || ""})` : "Sotuvchi";

    const text =
      `🏪 <b>YANGI DO'KON YARATILDI</b>\n\n` +
      `📌 <b>Nomi:</b> ${store.name}\n` +
      `📍 <b>Shahar:</b> ${store.city}\n` +
      `📞 <b>Telefon:</b> ${store.phone}\n` +
      `🏷 <b>Kategoriya:</b> ${store.category}\n` +
      `👤 <b>Egasi:</b> ${sellerInfo}\n` +
      `Holat: <b>${store.status}</b>`;

    for (const chatId of adminChatIds) {
      await enqueueTelegramNotification({
        botType: "admin",
        chatId: chatId,
        payload: {
          text,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "❌ Do'konni to'xtatish",
                  callback_data: `suspend_store:${store.id}`,
                },
                {
                  text: "📊 Statistika",
                  callback_data: "admin_stats",
                },
              ],
            ],
          },
        },
      });
    }
  } catch (err) {
    console.error("[Telegram Events] Error in notifyAdminNewStore:", err);
  }
}

/**
 * Checks variant stock quantity and sends low stock alert to seller if <= 3.
 */
export async function notifySellerLowStock(variantId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  try {
    const { data: variant, error } = await admin
      .from("product_variants")
      .select(`
        id,
        stock_quantity,
        size,
        color,
        product:products (
          id,
          name,
          store:stores (
            id,
            name,
            seller:profiles!stores_seller_id_fkey (
              id,
              telegram_chat_id
            )
          )
        )
      `)
      .eq("id", variantId)
      .single();

    if (error || !variant) return;

    if (variant.stock_quantity > 3) return;

    const product = variant.product as unknown as {
      id: string;
      name: string;
      store?: {
        id: string;
        name: string;
        seller?: { id: string; telegram_chat_id?: string | null };
      };
    };

    const sellerChatId = product?.store?.seller?.telegram_chat_id;
    if (!sellerChatId) return;

    const text =
      `⚠️ <b>Kam qolgan tovar ogohlantirishi!</b>\n\n` +
      `📦 <b>Mahsulot:</b> ${product.name}\n` +
      `📏 <b>O'lcham:</b> ${variant.size} | <b>Rang:</b> ${variant.color}\n` +
      `🔢 <b>Qolgan zaxira:</b> ${variant.stock_quantity} dona\n\n` +
      `Omborni tekshirish uchun /ombor buyrug'ini yuboring.`;

    await enqueueTelegramNotification({
      botType: "seller",
      chatId: sellerChatId,
      payload: { text },
    });
  } catch (err) {
    console.error("[Telegram Events] Error in notifySellerLowStock:", err);
  }
}
