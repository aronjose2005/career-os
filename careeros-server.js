// careeros-server.js
// The minimal backend that makes CareerOS's AI work. ZERO npm installs.
// Needs: Node 18+ (you have it) and a FREE Gemini key (no credit card):
//        https://aistudio.google.com/apikey
//
// Run it (in a SECOND terminal, keep `npm run dev` going in the first):
//        GEMINI_API_KEY=your_key_here  node careeros-server.js
//   (or just paste your key into API_KEY on the next line and run: node careeros-server.js)

const http = require("http");

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL   = process.env.GEMINI_MODEL  || "gemini-2.5-flash"; // free tier. If you get a model error, try "gemini-2.0-flash".
const PORT    = process.env.PORT          || 3000;               // MUST match the proxy target in vite.config.js

const ENDPOINT = (m) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`;

function send(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  });
  res.end(JSON.stringify(obj));
}

// The app expects responses shaped like { content: [{ type: "text", text: "..." }] }
const asText = (t) => ({ content: [{ type: "text", text: t }] });

// Map CareerOS messages [{ role:"user"|"assistant", content }] to Gemini's
// "contents" shape (Gemini uses "model" where CareerOS says "assistant").
function toGeminiContents(messages) {
  return (messages || []).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content == null ? "" : m.content) }],
  }));
}

// Pull the reply text out of a Gemini response, throwing a clear reason on an
// API error, a safety block, or an empty result. Pure: takes the parsed body,
// whether the HTTP call was ok, and the status code.
function extractText(data, httpOk, status) {
  if (!httpOk) {
    const msg = (data && data.error && data.error.message) || ("HTTP " + status);
    throw new Error(msg);
  }
  const cand = data && data.candidates && data.candidates[0];
  if (!cand) {
    const block = data && data.promptFeedback && data.promptFeedback.blockReason;
    throw new Error(block ? "content blocked (" + block + ")" : "empty response from Gemini");
  }
  const text = ((cand.content && cand.content.parts) || []).map((p) => p.text || "").join("");
  return text || "(empty response)";
}

async function callGemini(messages) {
  const body = { contents: toGeminiContents(messages), generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } };

  const r = await fetch(ENDPOINT(MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return extractText(data, r.ok, r.status);
}

// Build the request handler. `callModel` is injectable so tests can exercise
// the routes without calling the real Gemini API.
function createHandler({ callModel = callGemini } = {}) {
  return function handler(req, res) {
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (req.method === "GET" && req.url === "/api/health") return send(res, 200, { ok: true, model: MODEL });

    if (req.method === "POST" && req.url === "/api/claude") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", async () => {
        try {
          const { messages } = JSON.parse(raw || "{}");
          const text = await callModel(messages);
          send(res, 200, asText(text));
        } catch (e) {
          console.error("⚠️  Gemini error:", e.message);
          // Surface the real reason INSIDE the app so you can see what's wrong (not an opaque 502).
          send(res, 200, asText("⚠️ Gemini error: " + e.message +
            "\n\nFix: check your API key and the MODEL name in careeros-server.js, then retry."));
        }
      });
      return;
    }
    send(res, 404, { error: "not found" });
  };
}

const server = http.createServer(createHandler());

module.exports = { createHandler, toGeminiContents, extractText, asText, callGemini, MODEL };

// Only start listening when run directly (node careeros-server.js), so the
// module can be imported by tests without binding a port.
if (require.main === module) {
  if (API_KEY === "PASTE_YOUR_GEMINI_KEY_HERE") {
    console.log("\n⚠️  No Gemini key set yet.");
    console.log("   1) Get a free key (no credit card): https://aistudio.google.com/apikey");
    console.log("   2) Paste it into API_KEY in this file, OR run:");
    console.log("      GEMINI_API_KEY=your_key node careeros-server.js\n");
  }
  server.listen(PORT, () =>
    console.log(
      `\n✅ CareerOS backend running on http://localhost:${PORT}  (model: ${MODEL})\n` +
      `   Leave this terminal open. In another terminal, start the app: npm run dev\n` +
      `   Then your mocks, Negotiation Dojo, Resume Compiler, and Role Immersion will work.\n`
    )
  );
}
