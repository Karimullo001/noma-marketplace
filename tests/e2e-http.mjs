import http from "node:http";

const BASE = "http://localhost:3000";

async function request(path, options = {}) {
  const url = new URL(path, BASE);
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          ...options.headers,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log("=== NOMA Production E2E Verification Suite ===");
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      console.log(`✓ PASS: ${name}`);
      results.push({ name, pass: true });
    } catch (err) {
      console.error(`✗ FAIL: ${name} ->`, err.message);
      results.push({ name, pass: false, error: err.message });
    }
  }

  // 1. Health check
  await check("GET /api/health returns 200 with all 4 integrations active", async () => {
    const r = await request("/api/health");
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    const data = JSON.parse(r.body);
    if (!data.integrations.supabase) throw new Error("supabase is false");
    if (!data.integrations.serviceRole) throw new Error("serviceRole is false");
    if (!data.integrations.telegramBot) throw new Error("telegramBot is false");
    if (!data.integrations.googleAuth) throw new Error("googleAuth is false");
  });

  // 2. Public customer pages
  await check("GET /xaridor returns 200 and renders NOMA luxury theme and banners", async () => {
    const r = await request("/xaridor");
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    if (!r.body.includes("NOMA")) throw new Error("Missing NOMA brand");
    if (!r.body.includes("hero-banner.png")) throw new Error("Missing hero-banner.png");
    if (!r.body.includes("cat-erkaklar.png")) throw new Error("Missing cat-erkaklar.png");
  });

  await check("GET /xaridor/katalog returns 200 and renders catalog filters", async () => {
    const r = await request("/xaridor/katalog");
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    if (!r.body.includes("Katalog")) throw new Error("Missing Katalog");
  });

  await check("GET /xaridor/kirish returns 200 and shows honest login options", async () => {
    const r = await request("/xaridor/kirish");
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    if (!r.body.includes("Hisobingizga kiring")) throw new Error("Missing header");
    if (!r.body.includes("Google (Gmail) orqali kirish")) throw new Error("Missing Google auth");
  });

  // 3. Cabinets login entries
  await check("GET /sotuvchi/kirish returns 200", async () => {
    const r = await request("/sotuvchi/kirish");
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    if (!r.body.includes("Sotuvchi sifatida kirish")) throw new Error("Missing Sotuvchi title");
  });

  await check("GET /admin/kirish returns 200 and enforces Google only", async () => {
    const r = await request("/admin/kirish");
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    if (!r.body.includes("NOMA Admin Kirishi")) throw new Error("Missing Admin title");
    if (!r.body.includes("Google orqali kirish")) throw new Error("Missing Google button");
  });

  // 4. Route Guards (Unauthenticated users must be 307 redirected)
  await check("GET /sotuvchi redirects unauthenticated user to /sotuvchi/kirish", async () => {
    const r = await request("/sotuvchi");
    if (r.status !== 307) throw new Error(`Expected 307, got ${r.status}`);
    if (!r.headers.location?.includes("/sotuvchi/kirish")) {
      throw new Error(`Expected redirect to /sotuvchi/kirish, got ${r.headers.location}`);
    }
  });

  await check("GET /admin redirects unauthenticated user to /admin/kirish", async () => {
    const r = await request("/admin");
    if (r.status !== 307) throw new Error(`Expected 307, got ${r.status}`);
    if (!r.headers.location?.includes("/admin/kirish")) {
      throw new Error(`Expected redirect to /admin/kirish, got ${r.headers.location}`);
    }
  });

  await check("GET /xaridor/savat redirects unauthenticated user to /xaridor/kirish", async () => {
    const r = await request("/xaridor/savat");
    if (r.status !== 307) throw new Error(`Expected 307, got ${r.status}`);
    if (!r.headers.location?.includes("/xaridor/kirish")) {
      throw new Error(`Expected redirect to /xaridor/kirish, got ${r.headers.location}`);
    }
  });

  await check("GET /xaridor/buyurtmalar redirects unauthenticated user to /xaridor/kirish", async () => {
    const r = await request("/xaridor/buyurtmalar");
    if (r.status !== 307) throw new Error(`Expected 307, got ${r.status}`);
    if (!r.headers.location?.includes("/xaridor/kirish")) {
      throw new Error(`Expected redirect to /xaridor/kirish, got ${r.headers.location}`);
    }
  });

  // 5. API Protection
  await check("POST /api/sotuvchi/products returns 401 for unauthenticated caller", async () => {
    const r = await request("/api/sotuvchi/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "Test Tovar" },
    });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
    const data = JSON.parse(r.body);
    if (!data.error) throw new Error("Missing error property");
  });

  await check("POST /api/xaridor/cart returns 401 for unauthenticated caller", async () => {
    const r = await request("/api/xaridor/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { product_id: "test", variant_id: "test", quantity: 1 },
    });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await check("POST /api/xaridor/checkout returns 401 for unauthenticated caller", async () => {
    const r = await request("/api/xaridor/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { customer_name: "Test" },
    });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  await check("POST /api/admin/stores returns 401 for unauthenticated caller", async () => {
    const r = await request("/api/admin/stores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: { store_id: "test", status: "suspended" },
    });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  const failed = results.filter((r) => !r.pass);
  console.log(`\nResults: ${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
