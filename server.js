const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, "config.json");
const ORDERS_PATH = path.join(__dirname, "orders.json");

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function readConfig() {
  const cfg = loadConfig();
  const key = cfg.api_key || process.env.GEMINI_API_KEY || "";
  const businessName = cfg.business_name || process.env.BUSINESS_NAME || "Biziň firmamyz";
  return {
    api_key: key,
    model: cfg.model || process.env.MODEL || "gemini-3.1-flash-lite",
    business_name: businessName,
    business_info: cfg.business_info || process.env.BUSINESS_INFO || "",
    admin_password: cfg.admin_password || process.env.ADMIN_PASSWORD || "birde2026",
    welcome_message:
      cfg.welcome_message ||
      process.env.WELCOME_MESSAGE ||
      `Salam! Men ${businessName}nyň AI kömekçisi. Biznes barada soraglaryňyza jogap berýärin. Näme bilmek isleýärsiňiz?`,
  };
}

/* ---------- order storage ---------- */

function loadOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2), "utf-8");
}

function safe(text, max) {
  return String(text || "").replace(/[<>&"']/g, "").trim().slice(0, max || 60);
}

/* ---------- design generator ---------- */

const INDUSTRIES = {
  "Telekeçilik": "TELEKEÇILIK WE KONSULTING",
  "Senagat": "SENAGAT HYZYMATLARY",
  "Logistika": "LOGISTIKA WE ULAŞDYRYŞ",
  "Saglyk": "SAGLYGY GORAÝYŞ",
  "Iýmit": "AŞHANAZ WE IÝMIT",
  "Gurluşyk": "GURLUŞYK WE DIZAÝN",
  "Beýleki": "SANLY HYMATLAR",
};

const PALETTES = {
  "Fiolet": { a: "#7c5cff", b: "#ff5c8a" },
  "Mawi": { a: "#3b82f6", b: "#38bdf8" },
  "Gök": { a: "#06b6d4", b: "#3b82f6" },
  "Gyzyl": { a: "#ef4444", b: "#f97316" },
  "Ýaşyl": { a: "#10b981", b: "#84cc16" },
  "Gara-ak": { a: "#1f2937", b: "#9ca3af" },
};

function escapeXml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function makeLogo(name, industry, color) {
  const pal = PALETTES[color] || PALETTES["Fiolet"];
  const init = escapeXml(name.trim().slice(0, 2).toUpperCase());
  const subtitle = escapeXml(INDUSTRIES[industry] || "SANLY HYMATLAR");
  const gname = escapeXml(name).slice(0, 18);
  const grad =
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${pal.a}"/><stop offset="1" stop-color="${pal.b}"/></linearGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="800" height="320">
  <defs>${grad}</defs>
  <rect x="8" y="24" width="112" height="112" rx="26" fill="url(#g)"/>
  <text x="64" y="108" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="58" fill="#ffffff" text-anchor="middle">${init}</text>
  <text x="140" y="95" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="44" fill="#0b0d12">${gname}</text>
  <rect x="140" y="106" width="26" height="5" rx="2.5" fill="url(#g)"/>
  <text x="140" y="130" font-family="Arial, sans-serif" font-weight="500" font-size="15" fill="#8a93a8" letter-spacing="2">${subtitle}</text>
</svg>`;
}

function makeCard(name, industry, color, contact) {
  const pal = PALETTES[color] || PALETTES["Fiolet"];
  const init = escapeXml(name.trim().slice(0, 1).toUpperCase());
  const subtitle = escapeXml(INDUSTRIES[industry] || "SANLY HYMATLAR");
  const gname = escapeXml(name).slice(0, 24);
  const gcontact = escapeXml(contact).slice(0, 40);
  const grad =
    `<linearGradient id="c" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${pal.a}"/><stop offset="1" stop-color="${pal.b}"/></linearGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85 55" width="850" height="550">
  <defs>${grad}</defs>
  <rect width="85" height="55" fill="#0b0d12"/>
  <rect x="0" y="0" width="2.4" height="55" fill="url(#c)"/>
  <rect x="5" y="5" width="9" height="9" rx="2.5" fill="url(#c)"/>
  <text x="9.5" y="12.5" font-family="Arial, sans-serif" font-weight="900" font-size="7" fill="#ffffff" text-anchor="middle">${init}</text>
  <text x="5" y="30" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="12" fill="#ffffff">${gname}</text>
  <text x="5" y="35.5" font-family="Arial, sans-serif" font-weight="500" font-size="2.4" fill="#9aa5bb" letter-spacing="0.5">${subtitle}</text>
  <line x1="5" y1="40" x2="80" y2="40" stroke="#262e40" stroke-width="0.3"/>
  <text x="5" y="46" font-family="Arial, sans-serif" font-size="3" fill="#eef1f8">${gcontact}</text>
  <text x="80" y="9.5" font-family="Arial, sans-serif" font-size="1.8" fill="#9aa5bb" text-anchor="end">BIRDE. ORDER</text>
</svg>`;
}

/* ---------- Gemini ---------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function buildSystemPrompt(cfg) {
  return `Sen "${cfg.business_name}" atly firmanyň AI kömekçisi.

${cfg.business_info ? "Firma barada maglumat:\n" + cfg.business_info : ""}

Düzgünleriň:
- Jogap türkmen dilinde, arassa we ýönekeý bolsun.
- Jogaby doly we jikme-jik düşündirişli ýaz — gysga ýa-da bir sözli jogap berme. Nusgalar, salgylanmalar, ädimme-ädim düşündiriş ber.
- Diňe "${cfg.business_name}" firmasy we onuň hyzmatlary bilen bagly soraglara jogap ber.
- Umumy biznes soraglaryna (başka firma, umumy maslahat we ş.m.) jogap berme — "Men diňe ${cfg.business_name} hyzmatlary barada jogap berýärin" diý.
- Sorag biznes bilen bagly bolmasa, sypaýyçylyk bilen "Men diňe biznes soraglaryna jogap berýärin" diý.
- Bilemeýän soragyňa gysgaça: "Bu barada anyk maglumatym ýok, administrator bilen habarlaşyň" diýip jogap ber.
- Jogaby 2000 belgiden uzyn etme.`;
}

const MODEL_FALLBACK = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

function isRetriableError(msg) {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("high demand") ||
    m.includes("no longer available") ||
    m.includes("rate limit") ||
    m.includes("resource exhausted") ||
    m.includes("quota") ||
    m.includes("retry in") ||
    m.includes("429") ||
    m.includes("500") ||
    m.includes("temporarily")
  );
}

async function tryModel(cfg, model, messages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.api_key)}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: buildSystemPrompt(cfg) }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) {
    const msg =
      data.error && data.error.message
        ? data.error.message
        : `Serwer ýalňyşy (HTTP ${resp.status})`;
    throw new Error(msg);
  }

  const text =
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0].text;
  if (!text) throw new Error("Gemini boş jogap gaýtarypdyr.");
  return text;
}

async function callGemini(cfg, messages) {
  const candidates = [];
  const preferred = cfg.model || process.env.MODEL || "";
  if (preferred) candidates.push(preferred);
  for (const m of MODEL_FALLBACK) {
    if (!candidates.includes(m)) candidates.push(m);
  }

  let lastErr = null;
  for (const model of candidates) {
    try {
      return await tryModel(cfg, model, messages);
    } catch (err) {
      lastErr = err;
      if (!isRetriableError(err.message)) break;
    }
  }
  throw new Error(`Gemini ýalňyşy: ${lastErr ? lastErr.message : "Näbelli ýalňyş"}`);
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="tk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BIRDE. — Zakazlar</title>
<style>
body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#0b0d12;color:#eef1f8;margin:0;padding:24px}
.wrap{max-width:1000px;margin:0 auto}
h1{font-size:20px} a{color:#7c5cff}
form{margin:16px 0} input{padding:9px 12px;border-radius:8px;border:1px solid #262e40;background:#151924;color:#fff}
button{padding:9px 16px;border-radius:8px;border:none;background:#7c5cff;color:#fff;cursor:pointer}
table{width:100%;border-collapse:collapse;margin-top:16px;background:#151924;border-radius:10px;overflow:hidden}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #262e40;font-size:13px;vertical-align:top}
th{color:#9aa5bb;font-size:11px;text-transform:uppercase;letter-spacing:1px}
.badge{display:inline-block;background:#2bd68a22;color:#2bd68a;border:1px solid #2bd68a55;border-radius:999px;padding:2px 10px;font-size:11px}
img{max-width:280px;display:block;margin-top:4px}
</style></head><body><div class="wrap">
<h1>BIRDE. — Zakazlar</h1>
<form id="f"><input type="password" id="p" placeholder="Administrator paroly">
<button type="submit">Gör</button></form>
<div id="out" style="color:#ef4444"></div>
<table style="display:none" id="t"><thead><tr>
<th>Zakaz #</th><th>Firma</th><th>Ugur</th><th>Reňk</th><th>Kontakt</th><th>Hyzmat</th><th>Bellik</th><th>Sene</th><th>Loga</th><th>Wizitka</th></tr></thead><tbody id="rows"></tbody></table>
</div>
<script>
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = document.getElementById('p').value;
  const out = document.getElementById('out');
  const t = document.getElementById('t');
  const r = await fetch('/api/orders?p=' + encodeURIComponent(p));
  const data = await r.json();
  if (!r.ok || !Array.isArray(data)) { out.textContent = data.error || 'Ýalňyşlyk'; t.style.display='none'; return; }
  out.textContent = '';
  t.style.display='table';
  document.getElementById('rows').innerHTML = data.map((o,i) => {
    const d = new Date(o.created).toLocaleString('tk');
    return '<tr><td>#'+(i+1)+'</td><td>'+o.business_name+'</td><td>'+o.industry+'</td><td>'+o.color+'</td>'+
      '<td>'+o.contact+'</td><td>'+o.service+'</td><td>'+(o.notes||'')+'</td><td>'+d+'</td>'+
      '<td><a href="/api/design/'+o.id+'/logo" target="_blank">Gör</a></td>'+
      '<td><a href="/api/design/'+o.id+'/card" target="_blank">Gör</a></td></tr>';
  }).join('');
});
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/chat" && req.method === "POST") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      sendJson(res, 400, { error: "Nädogry isleg" });
      return;
    }

    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-12) : [];
    if (!messages.length) {
      sendJson(res, 400, { error: "Sorag ýok" });
      return;
    }

    const cfg = readConfig();
    if (!cfg.api_key) {
      sendJson(res, 500, { error: "API açar düzülmedi. config.json faýlynda öz Gemini açaryňyzy goýuň." });
      return;
    }

    try {
      const text = await callGemini(cfg, messages);
      sendJson(res, 200, { reply: text });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/api/info") {
    const cfg = readConfig();
    sendJson(res, 200, { business_name: cfg.business_name, welcome_message: cfg.welcome_message });
    return;
  }

  if (url.pathname === "/api/order" && req.method === "POST") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      sendJson(res, 400, { error: "Nädogry isleg" });
      return;
    }

    const business_name = safe(payload.business_name, 40);
    if (!business_name) {
      sendJson(res, 400, { error: "Firma ady hökman gerek" });
      return;
    }
    const industry = safe(payload.industry, 30) || "Beýleki";
    const color = safe(payload.color, 30) || "Fiolet";
    const contact = safe(payload.contact, 60);
    const service = safe(payload.service, 40) || "Logo + Wizitka";
    const notes = safe(payload.notes, 200);

    const id = crypto.randomBytes(3).toString("hex");
    const order = {
      id,
      created: new Date().toISOString(),
      business_name,
      industry,
      color,
      contact,
      service,
      notes,
      logo_svg: makeLogo(business_name, industry, color),
      card_svg: makeCard(business_name, industry, color, contact),
    };

    const orders = loadOrders();
    orders.push(order);
    saveOrders(orders);

    sendJson(res, 200, {
      id: order.id,
      logo_url: `/api/design/${order.id}/logo`,
      card_url: `/api/design/${order.id}/card`,
    });
    return;
  }

  const designMatch = url.pathname.match(/^\/api\/design\/([a-f0-9]{6})\/(logo|card)$/);
  if (designMatch) {
    const orders = loadOrders();
    const order = orders.find((o) => o.id === designMatch[1]);
    if (!order) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Tapylmady");
      return;
    }
    const svg = designMatch[2] === "logo" ? order.logo_svg : order.card_svg;
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    res.end(svg);
    return;
  }

  if (url.pathname === "/api/orders") {
    const cfg = readConfig();
    if (url.searchParams.get("p") !== cfg.admin_password) {
      sendJson(res, 401, { error: "Nädogry parol" });
      return;
    }
    const orders = loadOrders().map((o) => ({
      id: o.id,
      created: o.created,
      business_name: o.business_name,
      industry: o.industry,
      color: o.color,
      contact: o.contact,
      service: o.service,
      notes: o.notes,
    }));
    sendJson(res, 200, orders);
    return;
  }

  if (url.pathname === "/admin") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(ADMIN_HTML);
    return;
  }

  if (url.pathname === "/") {
    sendFile(res, path.join(__dirname, "public", "index.html"));
    return;
  }

  const filePath = path.join(__dirname, "public", url.pathname);
  if (filePath.startsWith(path.join(__dirname, "public"))) {
    sendFile(res, filePath);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`AI Business Bot: http://localhost:${PORT}`);
});
