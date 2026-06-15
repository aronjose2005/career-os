/* selfhost-adapter.js — import this FIRST in your self-hosted CareerOS.jsx.
   Inside claude.ai the artifact uses window.storage (claude.ai feature) and a
   key-less Anthropic endpoint (claude.ai handles auth). Neither exists on your
   own server, so this shim provides both:
     1. window.storage  -> browser localStorage (fine in YOUR app)
     2. window.CLAUDE_PROXY_URL -> your backend route that holds the API key   */

if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(key);
      if (v === null) throw new Error("key not found: " + key);
      return { key, value: v, shared: false };
    },
    async set(key, value) { localStorage.setItem(key, value); return { key, value, shared: false }; },
    async delete(key) { localStorage.removeItem(key); return { key, deleted: true, shared: false }; },
    async list(prefix = "") {
      return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)), prefix, shared: false };
    },
  };
}

// One-line change inside CareerOS.jsx's callClaude() for self-hosting:
//   BEFORE: fetch("https://api.anthropic.com/v1/messages", {...body: JSON.stringify(body)})
//   AFTER:  fetch("/api/claude", { method: "POST", headers: {"Content-Type":"application/json"},
//                                  body: JSON.stringify({ messages, useSearch }) })
// nginx (prod) and Vite proxy (dev) both route /api/* to the Node backend.
window.CLAUDE_PROXY_URL = "/api/claude";
