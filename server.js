const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, "config.json");

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
    welcome_message:
      cfg.welcome_message ||
      process.env.WELCOME_MESSAGE ||
      `Salam! Men ${businessName}nyň AI kömekçisi. Biznes barada soraglaryňyza jogap berýärin. Näme bilmek isleýärsiňiz?`,
  };
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
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
- Umumy biznes soraglaryna (başga firma, umumy maslahat we ş.m.) jogap berme — "Men diňe ${cfg.business_name} hyzmatlary barada jogap berýärin" diý.
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/chat" && req.method === "POST") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Nädogry isleg" }));
      return;
    }

    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-12) : [];
    if (!messages.length) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Sorag ýok" }));
      return;
    }

    const cfg = readConfig();
    if (!cfg.api_key) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "API açar düzülmedi. config.json faýlynda öz Gemini açaryňyzy goýuň.",
        })
      );
      return;
    }

    try {
      const text = await callGemini(cfg, messages);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ reply: text }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname === "/api/info") {
    const cfg = readConfig();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ business_name: cfg.business_name, welcome_message: cfg.welcome_message }));
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
