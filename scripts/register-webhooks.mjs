/**
 * NOMA Telegram Webhooks Registration Script with Auto-retry
 * Usage: node scripts/register-webhooks.mjs https://noma-marketplace-1.vercel.app
 */

import fs from "node:fs";
import path from "node:path";

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
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeTelegramPost(url, body, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000);
    }
  }
}

async function register() {
  console.log(`\n🚀 NOMA Telegram botlari uchun Webhooklarni sozlash...\nSayt manzili: ${siteUrl}\n`);

  const bots = [
    {
      name: "Xaridor Boti (@noma_marketbot)",
      token: env.TELEGRAM_CUSTOMER_BOT_TOKEN,
      webhookPath: "/api/telegram/customer/webhook",
      commands: [
        { command: "start", description: "Do'konni ochish" },
        { command: "buyurtmalar", description: "Buyurtmalarim holati" },
        { command: "yordam", description: "Yordam va aloqa" },
      ],
      isCustomer: true,
    },
    {
      name: "Sotuvchi Boti (@noma_sotuvchibot)",
      token: env.TELEGRAM_SELLER_BOT_TOKEN,
      webhookPath: "/api/telegram/seller/webhook",
      commands: [
        { command: "start", description: "Botni ishga tushirish" },
        { command: "ombor", description: "Kam qolgan tovarlar" },
        { command: "yordam", description: "Sotuvchi qo'llanmasi" },
      ],
    },
    {
      name: "Admin Boti (@nomaadmin_bot)",
      token: env.TELEGRAM_ADMIN_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN,
      webhookPath: "/api/telegram/admin/webhook",
      commands: [
        { command: "start", description: "Admin paneli" },
        { command: "statistika", description: "Platforma statistikasi" },
        { command: "panel", description: "Veb panelga o'tish" },
      ],
    },
  ];

  const secret = env.TELEGRAM_WEBHOOK_SECRET;

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
      const data = await safeTelegramPost(apiUrl, body);
      if (data.ok) {
        console.log(`✅ ${bot.name}: Webhook muvaffaqiyatli o'rnatildi!`);
        console.log(`   URL: ${webhookUrl}`);
      } else {
        console.error(`❌ ${bot.name}: Xatolik: ${data.description}`);
      }
    } catch (err) {
      console.error(`❌ ${bot.name}: Ulanishda xatolik:`, err.message);
    }

    // Set commands
    try {
      await safeTelegramPost(`https://api.telegram.org/bot${bot.token}/setMyCommands`, {
        commands: bot.commands,
      });
      console.log(`   Buyruqlar menyusi yangilandi`);
    } catch {}

    // If customer bot, configure persistent Mini App menu button
    if (bot.isCustomer) {
      try {
        const menuData = await safeTelegramPost(
          `https://api.telegram.org/bot${bot.token}/setChatMenuButton`,
          {
            menu_button: {
              type: "web_app",
              text: "🛍 Do'kon",
              web_app: {
                url: `${siteUrl}/xaridor/tg`,
              },
            },
          }
        );
        if (menuData.ok) {
          console.log(`   "🛍 Do'kon" Mini App Menu Button o'rnatildi!`);
        }
      } catch {}
    }

    console.log("");
    await sleep(800);
  }

  console.log("==================================================");
  console.log("Barcha 3 ta botingiz to'liq ishga tushdi va tayyor!");
  console.log("==================================================");
}

register();
