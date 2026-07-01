import test from "node:test";
import assert from "node:assert/strict";
import { activeTarget, evidencedSkillNames, recentMockAvg, computeReadiness, computeGap } from "../src/engine.js";

const base = () => ({
  profile: { name: "", experience: "", focus: "" },
  targets: [], activeTargetId: null,
  skills: [], evidence: [], mocks: [], pursuits: [], learning: [], events: [],
});
const aiTarget = { id: "t1", track: "AI Engineer", label: "AI Engineer" };

test("activeTarget resolves by id, falls back to first, else null", () => {
  const c = base();
  c.targets = [{ id: "a" }, { id: "b" }];
  c.activeTargetId = "b";
  assert.equal(activeTarget(c).id, "b");
  c.activeTargetId = "missing";
  assert.equal(activeTarget(c).id, "a");
  assert.equal(activeTarget(base()), null);
});

test("evidencedSkillNames unions evidence skills and level>=2 skills", () => {
  const c = base();
  c.evidence = [{ skills: ["Python", "SQL"] }, { skills: ["Python"] }, {}];
  c.skills = [{ name: "DSA", level: 2 }, { name: "Go", level: 1 }];
  const ev = evidencedSkillNames(c);
  assert.ok(ev instanceof Set);
  assert.ok(ev.has("Python") && ev.has("SQL") && ev.has("DSA"));
  assert.ok(!ev.has("Go"), "level<2 skills are not evidenced");
});

test("recentMockAvg is null with no mocks, else averages last 3 for the target", () => {
  const c = base();
  assert.equal(recentMockAvg(c, aiTarget), null);
  c.mocks = [
    { targetId: "t1", scores: { a: 8, b: 6 } },   // mean 7
    { targetId: "t2", scores: { a: 2 } },          // other target, ignored
  ];
  assert.equal(recentMockAvg(c, aiTarget), 7);
});

test("recentMockAvg only uses the last three mocks", () => {
  const c = base();
  c.mocks = [2, 4, 6, 8].map((n) => ({ targetId: "t1", scores: { s: n } }));
  // last three means: 4,6,8 -> avg 6
  assert.equal(recentMockAvg(c, aiTarget), 6);
});

test("computeReadiness is 0 without a target", () => {
  assert.deepEqual(computeReadiness(base(), null), { pct: 0, parts: {} });
});

test("computeReadiness weights profile-only state to 15%", () => {
  const c = base();
  c.profile = { name: "AJ", experience: "0-1", focus: "AI" };
  assert.equal(computeReadiness(c, aiTarget).pct, 15);
});

test("computeReadiness combines skill coverage, evidence depth, mocks, profile", () => {
  const c = base();
  c.profile = { name: "AJ", experience: "0-1", focus: "AI" };   // prof 1 -> .15
  c.evidence = [{ skills: ["Python"] }, { skills: ["DSA"] }];    // covered 2/8 -> .25*.40=.10; depth 2/6 -> .3333*.15=.05
  // no mocks -> 0 ; total .30 -> 30
  assert.equal(computeReadiness(c, aiTarget).pct, 30);
});

test("computeReadiness clamps a maxed-out state to 100", () => {
  const c = base();
  c.profile = { name: "AJ", experience: "5+", focus: "AI" };
  c.evidence = Array.from({ length: 6 }, () => ({
    skills: ["Python", "Deep Learning", "Transformers/NLP", "LLM apps (RAG)", "PyTorch", "MLOps", "System design", "DSA"],
  }));
  c.mocks = [{ targetId: "t1", scores: { a: 10, b: 10 } }];
  assert.equal(computeReadiness(c, aiTarget).pct, 100);
});

test("computeGap is empty without a target", () => {
  assert.deepEqual(computeGap(base(), null), []);
});

test("computeGap marks have / flagged / unproven per skill", () => {
  const c = base();
  c.evidence = [{ skills: ["Python"] }];
  c.mocks = [{ targetId: "t1", weaknesses: ["DSA"] }];
  const gap = computeGap(c, aiTarget);
  const byName = Object.fromEntries(gap.map((g) => [g.skill, g]));
  assert.equal(byName["Python"].have, true);
  assert.equal(byName["Python"].fix, "Backed by evidence");
  assert.equal(byName["DSA"].have, false);
  assert.equal(byName["DSA"].flagged, true);
  assert.match(byName["MLOps"].fix, /Add a project/);
  assert.equal(byName["MLOps"].flagged, false);
});
