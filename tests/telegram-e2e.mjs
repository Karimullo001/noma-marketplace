/**
 * NOMA Telegram Integration E2E Test Suite
 * Tests live webhooks, HMAC validation, route protection, and admin chat guard.
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function runTests() {
  console.log(`\n🧪 Testing Telegram Bots on ${BASE_URL}...\n`);
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Customer Bot Webhook GET
  await test("Customer Bot Webhook GET returns active status", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/customer/webhook`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.bot !== "customer" || data.status !== "active") {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  // 2. Seller Bot Webhook GET
  await test("Seller Bot Webhook GET returns active status", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/seller/webhook`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.bot !== "seller" || data.status !== "active") {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  // 3. Admin Bot Webhook GET
  await test("Admin Bot Webhook GET returns active status", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/admin/webhook`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.bot !== "admin" || data.status !== "active") {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  // 4. Admin Bot Webhook POST Unauthorized Chat Guard
  await test("Admin Bot Webhook POST silences unauthorized chat ID", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/admin/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        update_id: 999999,
        message: {
          message_id: 1,
          chat: { id: 987654321, type: "private" },
          text: "/statistika",
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ignored) {
      throw new Error(`Expected ignored: true for unauthorized chat, got: ${JSON.stringify(data)}`);
    }
  });

  // 5. Telegram WebApp Auth Endpoint Rejects Invalid Signature
  await test("Telegram WebApp Auth endpoint rejects invalid / forged HMAC", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/telegram-webapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: "user=%7B%22id%22%3A123%7D&auth_date=1600000000&hash=fakehash123",
      }),
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for forged HMAC, got ${res.status}`);
    }
    const data = await res.json();
    if (!data.error) {
      throw new Error(`Expected error message, got: ${JSON.stringify(data)}`);
    }
  });

  // 6. Seller Telegram Linking requires seller session
  await test("Seller Telegram Link endpoint rejects unauthenticated access", async () => {
    const res = await fetch(`${BASE_URL}/api/sotuvchi/telegram-link`);
    if (res.status !== 401) {
      throw new Error(`Expected 401, got ${res.status}`);
    }
  });

  // 7. Customer Mini App Entrypoint Page (/xaridor/tg)
  await test("Customer Mini App bridge page (/xaridor/tg) is rendered", async () => {
    const res = await fetch(`${BASE_URL}/xaridor/tg`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes("telegram-web-app.js") && !html.includes("Yuklanmoqda")) {
      throw new Error("Missing telegram-web-app script or loading state in /xaridor/tg");
    }
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal error during tests:", err);
  process.exit(1);
});
