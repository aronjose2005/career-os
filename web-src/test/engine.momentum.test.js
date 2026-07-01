import test from "node:test";
import assert from "node:assert/strict";
import { momentum, timeToOffer, calibration } from "../src/engine.js";

const base = () => ({
  profile: { name: "", experience: "", focus: "" },
  targets: [], activeTargetId: null,
  skills: [], evidence: [], mocks: [], pursuits: [], learning: [], events: [],
});
const aiTarget = { id: "t1", track: "AI Engineer", label: "AI Engineer" };
const now = () => new Date().toISOString();

test("momentum is 0 with no events and carries token count", () => {
  const c = base();
  c.momentumTokens = 3;
  const m = momentum(c);
  assert.equal(m.score, 0);
  assert.equal(m.tokens, 3);
  assert.equal(m.days.length, 14);
});

test("momentum weights a fresh event by its type and lands it on today", () => {
  const c = base();
  c.events = [{ type: "mock", ts: now() }];   // weight 5, age ~0 -> ~full weight
  const m = momentum(c);
  assert.equal(m.score, 5);
  assert.equal(m.days[13], 5);
});

test("momentum ignores events older than 14 days", () => {
  const c = base();
  const old = new Date(Date.now() - 20 * 864e5).toISOString();
  c.events = [{ type: "mock", ts: old }];
  assert.equal(momentum(c).score, 0);
});

test("timeToOffer is null without a target", () => {
  assert.equal(timeToOffer(base(), null), null);
});

test("timeToOffer passes readiness through and estimates whole weeks", () => {
  const c = base();
  c.profile = { name: "AJ", experience: "0-1", focus: "AI" };  // readiness 15, momentum 0
  const tt = timeToOffer(c, aiTarget);
  assert.equal(tt.readiness, 15);
  // remaining 85, velocity max(0.4, 0) = 0.4 -> round(85 / (0.4*2.2)) = 97
  assert.equal(tt.weeks, 97);
});

test("calibration is null until a mock has confidence + scores", () => {
  const c = base();
  c.mocks = [{ scores: { a: 5 } }];  // no confidence -> excluded
  assert.equal(calibration(c), null);
});

test("calibration flags over-confidence when self-rating exceeds scores", () => {
  const c = base();
  c.mocks = [{ confidence: 9, scores: { a: 6, b: 6 } }];  // gap +3
  const cal = calibration(c);
  assert.equal(cal.n, 1);
  assert.equal(cal.avg, 3);
  assert.equal(cal.over, true);
  assert.equal(cal.under, false);
});

test("calibration flags under-confidence when scores exceed self-rating", () => {
  const c = base();
  c.mocks = [{ confidence: 4, scores: { a: 8, b: 8 } }];  // gap -4
  const cal = calibration(c);
  assert.equal(cal.under, true);
  assert.equal(cal.over, false);
});
