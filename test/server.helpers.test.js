"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { toGeminiContents, extractText, asText } = require("../careeros-server.js");

test("toGeminiContents maps assistant -> model and user -> user", () => {
  const out = toGeminiContents([
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
  ]);
  assert.deepEqual(out, [
    { role: "user", parts: [{ text: "hi" }] },
    { role: "model", parts: [{ text: "hello" }] },
  ]);
});

test("toGeminiContents coerces null/undefined content to an empty string", () => {
  const out = toGeminiContents([{ role: "user", content: null }, { role: "user" }]);
  assert.equal(out[0].parts[0].text, "");
  assert.equal(out[1].parts[0].text, "");
});

test("toGeminiContents stringifies non-string content", () => {
  assert.equal(toGeminiContents([{ role: "user", content: 42 }])[0].parts[0].text, "42");
});

test("toGeminiContents tolerates missing input", () => {
  assert.deepEqual(toGeminiContents(), []);
  assert.deepEqual(toGeminiContents(null), []);
});

test("extractText joins candidate parts on success", () => {
  const data = { candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }] };
  assert.equal(extractText(data, true, 200), "ab");
});

test("extractText falls back to (empty response) for empty parts", () => {
  assert.equal(extractText({ candidates: [{ content: { parts: [] } }] }, true, 200), "(empty response)");
});

test("extractText throws the API error message when not ok", () => {
  assert.throws(() => extractText({ error: { message: "bad key" } }, false, 400), /bad key/);
});

test("extractText throws HTTP <status> when no error message is present", () => {
  assert.throws(() => extractText({}, false, 503), /HTTP 503/);
});

test("extractText reports a safety block reason", () => {
  assert.throws(
    () => extractText({ promptFeedback: { blockReason: "SAFETY" } }, true, 200),
    /content blocked \(SAFETY\)/
  );
});

test("extractText reports an empty response when there are no candidates", () => {
  assert.throws(() => extractText({}, true, 200), /empty response from Gemini/);
});

test("asText wraps text in the app's expected content shape", () => {
  assert.deepEqual(asText("hi"), { content: [{ type: "text", text: "hi" }] });
});
