import crypto from "crypto";
import type { TelegramUser } from "./types";

/**
 * Validates Telegram Mini App WebApp initData string using HMAC-SHA256.
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = 86400 // Default: 24 hours freshness
): {
  valid: boolean;
  user?: TelegramUser;
  authDate?: number;
  queryId?: string;
  error?: string;
} {
  if (!initData || !botToken) {
    return { valid: false, error: "Missing initData or botToken" };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      return { valid: false, error: "Missing hash parameter" };
    }

    // Build data_check_string by sorting all keys alphabetically except 'hash'
    const pairs: string[] = [];
    params.forEach((value, key) => {
      if (key !== "hash") {
        pairs.push(`${key}=${value}`);
      }
    });
    pairs.sort();
    const dataCheckString = pairs.join("\n");

    // Secret key = HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Calculated hash = HMAC_SHA256(secretKey, dataCheckString)
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    const hashBuffer = Buffer.from(hash, "utf-8");
    const calcBuffer = Buffer.from(calculatedHash, "utf-8");

    if (hashBuffer.length !== calcBuffer.length || !crypto.timingSafeEqual(hashBuffer, calcBuffer)) {
      return { valid: false, error: "Invalid cryptographic signature" };
    }

    // Check auth_date freshness
    const authDateStr = params.get("auth_date");
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    const now = Math.floor(Date.now() / 1000);

    if (!authDate || now - authDate > maxAgeSeconds) {
      return { valid: false, error: "Authentication data expired" };
    }

    // Parse user object
    let user: TelegramUser | undefined;
    const userStr = params.get("user");
    if (userStr) {
      user = JSON.parse(userStr);
    }

    return {
      valid: true,
      user,
      authDate,
      queryId: params.get("query_id") || undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Validation exception";
    return { valid: false, error: message };
  }
}

/**
 * Generates a one-time 10-minute linking code for connecting a Telegram account.
 * Plaintext code is shown to the user once; only HMAC-SHA256 hash is saved.
 */
export function generateTelegramLinkCode(): {
  plaintextCode: string;
  codeHash: string;
  codePrefix: string;
  expiresAt: Date;
} {
  const bytes = crypto.randomBytes(8);
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Base32 unambiguous
  let codePart = "";
  for (let i = 0; i < bytes.length; i++) {
    codePart += alphabet[bytes[i] % alphabet.length];
  }
  const plaintextCode = `LINK-${codePart.slice(0, 4)}-${codePart.slice(4, 8)}`;

  const pepper =
    process.env.CODE_HASH_PEPPER ||
    process.env.INVITATION_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "noma-telegram-link-pepper";

  const codeHash = crypto
    .createHmac("sha256", pepper)
    .update(plaintextCode.trim().toUpperCase())
    .digest("hex");

  const codePrefix = `${plaintextCode.slice(0, 9)}****`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return {
    plaintextCode,
    codeHash,
    codePrefix,
    expiresAt,
  };
}

export function hashTelegramLinkCode(plaintextCode: string): string {
  const pepper =
    process.env.CODE_HASH_PEPPER ||
    process.env.INVITATION_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "noma-telegram-link-pepper";

  return crypto
    .createHmac("sha256", pepper)
    .update(plaintextCode.trim().toUpperCase())
    .digest("hex");
}

export function getTelegramLinkPrefix(code: string): string {
  const clean = code.trim().toUpperCase();
  return `${clean.slice(0, Math.max(0, clean.length - 4))}****`;
}
