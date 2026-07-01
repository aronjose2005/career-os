import test from "node:test";
import assert from "node:assert/strict";
import { uid, todayISO, daysBetween, extractJSON } from "../src/engine.js";

test("uid returns a short base36 string", () => {
  const id = uid();
  assert.equal(typeof id, "string");
  assert.match(id, /^[a-z0-9]{1,7}$/);
});

test("uid is practically unique across many calls", () => {
  const seen = new Set(Array.from({ length: 500 }, () => uid()));
  assert.ok(seen.size > 490, `expected mostly-unique ids, got ${seen.size}/500`);
});

test("todayISO is a YYYY-MM-DD string for today", () => {
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(todayISO(), new Date().toISOString().slice(0, 10));
});

test("daysBetween counts whole days, signed by direction", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-11"), 10);
  assert.equal(daysBetween("2026-01-11", "2026-01-01"), -10);
  assert.equal(daysBetween("2026-01-01", "2026-01-01"), 0);
});

test("extractJSON strips code fences and parses the object", () => {
  assert.deepEqual(extractJSON('```json\n{"x":1}\n```', "{", "}"), { x: 1 });
});

test("extractJSON finds JSON embedded in surrounding prose", () => {
  assert.deepEqual(extractJSON('here you go: {"a":[1,2]} thanks', "{", "}"), { a: [1, 2] });
});

test("extractJSON throws when no JSON delimiters are present", () => {
  assert.throws(() => extractJSON("no json here", "{", "}"), /no JSON in response/);
});
