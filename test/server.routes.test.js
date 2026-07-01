"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createHandler } = require("../careeros-server.js");

function startServer(handler) {
  return new Promise((resolve) => {
    const srv = http.createServer(handler);
    srv.listen(0, "127.0.0.1", () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}

test("GET /api/health returns ok + model", async () => {
  const { srv, base } = await startServer(createHandler({ callModel: async () => "x" }));
  try {
    const res = await fetch(base + "/api/health");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(body.model);
  } finally { srv.close(); }
});

test("OPTIONS preflight returns 204 with permissive CORS", async () => {
  const { srv, base } = await startServer(createHandler({ callModel: async () => "x" }));
  try {
    const res = await fetch(base + "/api/claude", { method: "OPTIONS" });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), "*");
  } finally { srv.close(); }
});

test("POST /api/claude returns the model reply in content shape", async () => {
  const { srv, base } = await startServer(createHandler({ callModel: async () => "hello there" }));
  try {
    const res = await fetch(base + "/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { content: [{ type: "text", text: "hello there" }] });
  } finally { srv.close(); }
});

test("POST /api/claude surfaces model errors as a 200 message, not a 502", async () => {
  const handler = createHandler({ callModel: async () => { throw new Error("quota exceeded"); } });
  const { srv, base } = await startServer(handler);
  try {
    const res = await fetch(base + "/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });
    assert.equal(res.status, 200);
    assert.match((await res.json()).content[0].text, /Gemini error: quota exceeded/);
  } finally { srv.close(); }
});

test("an unknown route returns 404", async () => {
  const { srv, base } = await startServer(createHandler({ callModel: async () => "x" }));
  try {
    assert.equal((await fetch(base + "/nope")).status, 404);
  } finally { srv.close(); }
});
