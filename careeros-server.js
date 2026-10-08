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
const MODEL   = process.env.GEMINI_MODEL  || "gemini-3.8-flash"; // free tier. If you get a model error, try "gemini-2.0-flash".
const PORT    = process.env.PORT          || 3000;               // MUST match the proxy target in vite.config.js

const ENDPOINT = (m) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

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

// Optional per-request tuning (used by the Resume Builder for long structured JSON).
// Gemini 3.x models (incl. 3.8 Flash and the fallback) deprecate the sampling
// parameters temperature / top_p / top_k and reject candidate_count, so none of
// them are ever sent. A client-supplied `temperature` is accepted by the route
// for backward compatibility but ignored here. Output length is clamped.
function buildGenConfig({ maxOutputTokens, json } = {}) {
  const cfg = { maxOutputTokens: 2048 };
  if (Number.isFinite(maxOutputTokens)) cfg.maxOutputTokens = Math.max(256, Math.min(8192, Math.floor(maxOutputTokens)));
  if (json === true) cfg.responseMimeType = "application/json";
  return cfg;
}

// ---- Availability handling -------------------------------------------------
// Primary model is MODEL (GEMINI_MODEL). On a *temporary* failure we retry it a
// few times with a short backoff, then fall back to FALLBACK_MODEL
// (GEMINI_FALLBACK_MODEL, default gemini-3.5-flash-lite). Non-temporary errors
// (bad key, bad request, safety block) are NOT retried and surface immediately.
// Default: gemini-3.5-flash-lite — a GA (stable) Gemini 3.x Flash-Lite model aimed at
// low-latency, structured/JSON-style tasks, and a lighter model than the primary.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
const PRIMARY_ATTEMPTS = 3;                 // 1 try + 2 retries
const FALLBACK_ATTEMPTS = 2;
const RETRY_BASE_MS = 800;                  // ~0.8s, ~1.6s (+ jitter)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Temporary = rate limit / overload / service unavailable. Pure: easy to test.
function isTemporaryError(status, data) {
  if (status === 429 || status === 503) return true;
  const e = data && data.error;
  const code = e && e.status;
  if (code === "RESOURCE_EXHAUSTED" || code === "UNAVAILABLE") return true;
  return !!(e && /high demand|overloaded|try again later/i.test(e.message || ""));
}

// One model, with retries on temporary errors. Returns the reply text, or throws
// an Error carrying `.temporary` so the caller knows whether a fallback is worthwhile.
async function callModelWithRetry(model, body, attempts, { fetchFn = fetch, sleepFn = sleep } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetchFn(ENDPOINT(model), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) return extractText(data, r.ok, r.status);
      lastErr = new Error((data && data.error && data.error.message) || ("HTTP " + r.status));
      lastErr.temporary = isTemporaryError(r.status, data);
    } catch (e) {
      // Network-level failure (DNS, reset, timeout) is treated as temporary.
      lastErr = e;
      lastErr.temporary = e.temporary === undefined ? true : e.temporary;
      if (e.message && /blocked|empty response/i.test(e.message)) lastErr.temporary = false;
    }
    if (!lastErr.temporary) throw lastErr;
    if (i < attempts - 1) await sleepFn(RETRY_BASE_MS * 2 ** i + Math.floor(Math.random() * 250));
  }
  throw lastErr;
}

async function callGemini(messages, opts, deps) {
  const body = { contents: toGeminiContents(messages), generationConfig: buildGenConfig(opts) };
  try {
    return await callModelWithRetry(MODEL, body, PRIMARY_ATTEMPTS, deps);
  } catch (primaryErr) {
    if (!primaryErr.temporary || !FALLBACK_MODEL || FALLBACK_MODEL === MODEL) throw primaryErr;
    console.warn(`⚠️  ${MODEL} unavailable (${primaryErr.message}); falling back to ${FALLBACK_MODEL}`);
    try {
      return await callModelWithRetry(FALLBACK_MODEL, body, FALLBACK_ATTEMPTS, deps);
    } catch (fallbackErr) {
      // If the fallback itself is misconfigured, report the primary's (real) problem.
      if (!fallbackErr.temporary) console.warn(`⚠️  fallback ${FALLBACK_MODEL} rejected: ${fallbackErr.message}`);
      throw fallbackErr.temporary ? fallbackErr : primaryErr;
    }
  }
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
          const { messages, maxOutputTokens, temperature, json } = JSON.parse(raw || "{}");
          const text = await callModel(messages, { maxOutputTokens, temperature, json });
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

module.exports = { createHandler, buildGenConfig, isTemporaryError, callModelWithRetry, callGemini, toGeminiContents, extractText, asText, MODEL, FALLBACK_MODEL };

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
