import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "./client";
import type { BotType } from "./config";
import type { OutboxPayload } from "./types";

export interface EnqueueOptions {
  botType: BotType;
  chatId: string | number;
  payload: OutboxPayload;
  delaySeconds?: number;
}

/**
 * Enqueues a Telegram notification in notifications_outbox and triggers immediate dispatch.
 */
export async function enqueueTelegramNotification({
  botType,
  chatId,
  payload,
  delaySeconds = 0,
}: EnqueueOptions): Promise<{ success: boolean; outboxId?: string; error?: string }> {
  const admin = createAdminSupabaseClient();
  const chatIdStr = String(chatId).trim();

  if (!chatIdStr) {
    return { success: false, error: "Empty chat_id" };
  }

  const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

  if (!admin) {
    // If Supabase admin is not configured, fall back to direct send
    const res = await sendTelegramMessage(botType, chatIdStr, payload);
    return { success: res.ok, error: res.description };
  }

  try {
    const { data, error } = await admin
      .from("notifications_outbox")
      .insert({
        bot_type: botType,
        chat_id: chatIdStr,
        payload,
        status: "pending",
        attempts: 0,
        max_attempts: 5,
        next_attempt_at: nextAttemptAt,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Outbox] Failed to enqueue notification:", error);
      // Fallback: try immediate direct send
      const directRes = await sendTelegramMessage(botType, chatIdStr, payload);
      return { success: directRes.ok, error: directRes.description };
    }

    const outboxId = data.id;

    // Trigger non-blocking asynchronous dispatch
    if (delaySeconds <= 0) {
      dispatchOutboxItem(outboxId).catch((err) => {
        console.error(`[Outbox] Background dispatch failed for ${outboxId}:`, err);
      });
    }

    return { success: true, outboxId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Enqueue error";
    return { success: false, error: message };
  }
}

/**
 * Dispatches a single outbox row with Telegram 429 and 403 handling.
 */
export async function dispatchOutboxItem(outboxId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  if (!admin) return false;

  const { data: item, error: fetchErr } = await admin
    .from("notifications_outbox")
    .select("*")
    .eq("id", outboxId)
    .single();

  if (fetchErr || !item || item.status === "sent" || item.status === "dead") {
    return false;
  }

  const attempts = (item.attempts || 0) + 1;
  const maxAttempts = item.max_attempts || 5;

  const res = await sendTelegramMessage(item.bot_type as BotType, item.chat_id, item.payload);

  if (res.ok) {
    await admin
      .from("notifications_outbox")
      .update({
        status: "sent",
        attempts,
        updated_at: new Date().toISOString(),
      })
      .eq("id", outboxId);
    return true;
  }

  // Handle Telegram 403 (User blocked bot) -> mark dead immediately
  const desc = res.description || "";
  const isBlocked =
    res.error_code === 403 ||
    desc.includes("bot was blocked by the user") ||
    desc.includes("user is deactivated");

  if (isBlocked) {
    await admin
      .from("notifications_outbox")
      .update({
        status: "dead",
        attempts,
        last_error: desc,
        updated_at: new Date().toISOString(),
      })
      .eq("id", outboxId);

    // Unlink invalid chat id from profile so we don't attempt in future
    await admin
      .from("profiles")
      .update({ telegram_chat_id: null })
      .eq("telegram_chat_id", item.chat_id);

    return false;
  }

  // Handle Telegram 429 (Too Many Requests / rate limit)
  let retryAfterSeconds = res.parameters?.retry_after;
  if (!retryAfterSeconds && res.error_code === 429) {
    retryAfterSeconds = 30; // default safe cooldown
  }

  // Calculate exponential backoff: 10s, 30s, 90s, 270s...
  const backoffSeconds = retryAfterSeconds || Math.min(3600, Math.pow(3, attempts) * 10);
  const nextAttempt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
  const nextStatus = attempts >= maxAttempts ? "dead" : "failed";

  await admin
    .from("notifications_outbox")
    .update({
      status: nextStatus,
      attempts,
      next_attempt_at: nextAttempt,
      last_error: desc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", outboxId);

  return false;
}
