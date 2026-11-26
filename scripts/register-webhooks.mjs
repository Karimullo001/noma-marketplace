/**
 * NOMA Telegram Webhooks Registration Script
 * Usage: node scripts/register-webhooks.mjs <DEPLOYED_URL>
 * Example: node scripts/register-webhooks.mjs https://noma-marketplace.vercel.app
 */

import fs from "node:fs";
import path from "node:path";

// Read .env.local for bot tokens
const envPath = path.resolve(process.cwd(), ".env.local");
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim();
      let v = trimmed.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  }
}

const siteUrl = (process.argv[2] || env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");

if (!siteUrl || !siteUrl.startsWith("http")) {
  console.error("Xatolik: Ommaviy sayt domenini (URL) ko'rsating!");
  console.error("Misol: node scripts/register-webhooks.mjs https://noma-marketplace.vercel.app");
  process.exit(1);
}

const bots = [
  {
    name: "Xaridor Boti (@noma_marketbot)",
    token: env.TELEGRAM_CUSTOMER_BOT_TOKEN,
    webhookPath: "/api/telegram/customer/webhook",
  },
  {
    name: "Sotuvchi Boti (@noma_sotuvchibot)",
    token: env.TELEGRAM_SELLER_BOT_TOKEN,
    webhookPath: "/api/telegram/seller/webhook",
  },
  {
    name: "Admin Boti (@nomaadmin_bot)",
    token: env.TELEGRAM_ADMIN_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN,
    webhookPath: "/api/telegram/admin/webhook",
  },
];

const secret = env.TELEGRAM_WEBHOOK_SECRET;

async function register() {
  console.log(`\n🚀 NOMA Telegram botlari uchun Webhooklarni sozlash...\nSayt manzili: ${siteUrl}\n`);

  for (const bot of bots) {
    if (!bot.token) {
      console.warn(`⚠️ ${bot.name} tokeni topilmadi (.env.local ni tekshiring)`);
      continue;
    }

    const webhookUrl = `${siteUrl}${bot.webhookPath}`;
    const apiUrl = `https://api.telegram.org/bot${bot.token}/setWebhook`;

    const body = {
      url: webhookUrl,
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
    };
    if (secret) {
      body.secret_token = secret;
    }

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`✅ ${bot.name}: Webhook muvaffaqiyatli o'rnatildi!`);
        console.log(`   URL: ${webhookUrl}\n`);
      } else {
        console.error(`❌ ${bot.name}: Xatolik yuz berdi: ${data.description}`);
      }
    } catch (err) {
      console.error(`❌ ${bot.name}: Ulanishda xatolik:`, err.message);
    }
  }

  console.log("Tayyor! Endi barcha 3 ta botingiz jonli rejimda ishlamoqda.");
}

register();
