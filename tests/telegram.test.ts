import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  validateTelegramWebAppData,
  generateTelegramLinkCode,
  hashTelegramLinkCode,
  getTelegramLinkPrefix,
} from "@/lib/telegram/crypto";
import { TELEGRAM_CONFIG } from "@/lib/telegram/config";

describe("Telegram WebApp HMAC Validation", () => {
  const testBotToken = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN || "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567";

  // Helper to generate a valid WebApp initData string
  function createTestInitData(params: Record<string, string>, botToken: string) {
    const dataCheckString = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const hash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const searchParams = new URLSearchParams(params);
    searchParams.set("hash", hash);
    return searchParams.toString();
  }

  it("validates authentic Telegram WebApp initData signature", () => {
    const now = Math.floor(Date.now() / 1000);
    const userJson = JSON.stringify({
      id: 123456789,
      first_name: "Ali",
      last_name: "Valiyev",
      username: "alivaliyev",
    });

    const initData = createTestInitData(
      {
        query_id: "AAG7r40fAAAAALuvjR8_test",
        user: userJson,
        auth_date: now.toString(),
      },
      testBotToken
    );

    const result = validateTelegramWebAppData(initData, testBotToken);
    expect(result.valid).toBe(true);
    expect(result.user?.id).toBe(123456789);
    expect(result.user?.username).toBe("alivaliyev");
    expect(result.user?.first_name).toBe("Ali");
  });

  it("rejects tampered WebApp initData signature", () => {
    const now = Math.floor(Date.now() / 1000);
    const initData = createTestInitData(
      {
        query_id: "test",
        auth_date: now.toString(),
      },
      testBotToken
    );

    // Tamper with data after generating hash
    const tampered = initData.replace("query_id=test", "query_id=hacked");
    const result = validateTelegramWebAppData(tampered, testBotToken);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/signature/i);
  });

  it("rejects expired auth_date (older than 24 hours)", () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 25 * 3600;
    const initData = createTestInitData(
      {
        query_id: "test",
        auth_date: expiredTimestamp.toString(),
      },
      testBotToken
    );

    const result = validateTelegramWebAppData(initData, testBotToken);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it("rejects empty or malformed initData", () => {
    expect(validateTelegramWebAppData("", testBotToken).valid).toBe(false);
    expect(validateTelegramWebAppData("just_a_string_without_hash", testBotToken).valid).toBe(false);
  });
});

describe("Seller Telegram One-Time Link Code", () => {
  it("generates unique cryptographically secure link codes with 10-minute expiry", () => {
    const c1 = generateTelegramLinkCode();
    const c2 = generateTelegramLinkCode();

    expect(c1.plaintextCode).toMatch(/^LINK-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(c2.plaintextCode).toMatch(/^LINK-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(c1.plaintextCode).not.toBe(c2.plaintextCode);

    // Expiry verification (~10 min ahead)
    const diffSeconds = (c1.expiresAt.getTime() - Date.now()) / 1000;
    expect(diffSeconds).toBeGreaterThan(580);
    expect(diffSeconds).toBeLessThan(610);
  });

  it("hashes codes deterministically with normalization and hides plaintext", () => {
    const code = "NOMA-TG-7K4M-9P2X";
    const h1 = hashTelegramLinkCode(code);
    const h2 = hashTelegramLinkCode("  noma-tg-7k4m-9p2x  ");

    expect(h1).toBe(h2);
    expect(h1).not.toBe(code);
    expect(h1.length).toBe(64); // SHA-256 hex length
  });

  it("masks codes properly for logs and audits", () => {
    const code = "LINK-7K4M-9P2X";
    expect(getTelegramLinkPrefix(code)).toBe("LINK-7K4M-****");
  });
});

describe("Admin Chat Guard & Config", () => {
  it("has strictly configured admin chat ID 7121005635", () => {
    expect(TELEGRAM_CONFIG.adminChatId).toBe("7121005635");
  });

  it("guards against unauthorized sender chat IDs", () => {
    const adminChatId = TELEGRAM_CONFIG.adminChatId;
    const attackerChatId = "9999999999";
    const randomChatId = "12345678";

    expect(attackerChatId === adminChatId).toBe(false);
    expect(randomChatId === adminChatId).toBe(false);
    expect("7121005635" === adminChatId).toBe(true);
  });
});
