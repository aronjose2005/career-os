import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyDraft, importFromCareer, validateDraft, buildPrompt, draftToFacts, parseResumeResponse, normalizeResume,
  atsChecks, unsupportedNumbers, unsupportedSkills, serializeDraft, restoreDraft, hasContent,
  blankEducation, blankExperience, blankProject, SKILL_CATEGORIES,
} from "../src/resumeModel.js";

const filled = () => {
  const d = emptyDraft();
  d.basics.name = "Test User"; d.basics.email = "t@example.com"; d.basics.city = "Trichy"; d.basics.region = "Tamil Nadu";
  d.experience.push({ ...blankExperience(), title: "AI Trainee", company: "Acme", start: "Sep 2026", present: true, responsibilities: "built a recommender, accuracy up about 10%", technologies: "Python, scikit-learn" });
  d.projects.push({ ...blankProject(), name: "RecSys", technologies: "Python", results: "10% accuracy gain" });
  d.skills[0].items = "Python, SQL";
  d.target.role = "AI Engineer";
  return d;
};
const good = { title: "AI Engineer", summary: "Builds ML systems.", skills: [{ category: "Programming Languages", items: ["Python", "SQL"] }], experience: [{ title: "AI Trainee", company: "Acme", dates: "Sep 2026 – Present", bullets: ["Built a recommender in Python, improving accuracy by ~10%."] }], projects: [{ name: "RecSys", bullets: ["Built a recommender with Python."] }] };

test("initialization: empty draft has all skill categories and no entries", () => {
  const d = emptyDraft();
  assert.equal(d.skills.length, SKILL_CATEGORIES.length);
  assert.equal(d.education.length + d.experience.length + d.projects.length, 0);
  assert.equal(hasContent(d), false);
});

test("add/remove entries for education, experience, projects", () => {
  let d = emptyDraft();
  d = { ...d, education: [...d.education, blankEducation()], experience: [...d.experience, blankExperience()], projects: [...d.projects, blankProject()] };
  assert.equal(d.education.length, 1); assert.equal(d.experience.length, 1); assert.equal(d.projects.length, 1);
  d = { ...d, education: d.education.filter((e) => e.id !== d.education[0].id), projects: [] };
  assert.equal(d.education.length, 0); assert.equal(d.projects.length, 0);
  assert.notEqual(blankEducation().id, blankEducation().id);
});

test("validation requires name and a valid email only", () => {
  const d = emptyDraft();
  assert.equal(validateDraft(d).length, 2);
  d.basics.name = "A"; d.basics.email = "nope";
  assert.deepEqual(validateDraft(d), ["Email looks invalid"]);
  d.basics.email = "a@b.co";
  assert.deepEqual(validateDraft(d), []);
});

test("skills: blank categories are dropped from the facts sent to the model", () => {
  const f = draftToFacts(filled());
  assert.deepEqual(f.skills, [{ category: "Programming Languages", items: ["Python", "SQL"] }]);
});

test("CareerOS import maps profile, target, project evidence and skills", () => {
  const c = { profile: { name: "Aron", track: "AI Engineer", experience: "0–1 yrs", focus: "GenAI", resume: "base" }, evidence: [{ title: "RAG bot", type: "Project", skills: ["Python", "RAG"] }, { title: "Passed mock", type: "Mock pass", skills: [] }], skills: [] };
  const d = importFromCareer(c, { label: "AI Engineer at Livewire" });
  assert.equal(d.basics.name, "Aron");
  assert.equal(d.target.role, "AI Engineer at Livewire");
  assert.equal(d.projects.length, 1);
  assert.equal(d.projects[0].name, "RAG bot");
  assert.match(d.skills.find((s) => s.category === "Other").items, /Python, RAG/);
  assert.doesNotThrow(() => importFromCareer({}, null));
});

test("prompt forbids invention and embeds only user facts", () => {
  const p = buildPrompt(filled());
  assert.match(p, /NEVER invent/);
  assert.match(p, /Test User/);
});

test("AI response parsing: valid JSON, fenced JSON, preamble", () => {
  const d = filled();
  const json = JSON.stringify(good);
  assert.equal(parseResumeResponse(json, d).summary, "Builds ML systems.");
  assert.equal(parseResumeResponse("```json\n" + json + "\n```", d).experience.length, 1);
  assert.equal(parseResumeResponse("Here you go: " + json, d).name, "Test User");
});

test("identity and contact always come from user input, not the model", () => {
  const d = filled();
  const r = parseResumeResponse(JSON.stringify({ ...good, name: "Hacker", contact: { email: "evil@x.com" } }), d);
  assert.equal(r.name, "Test User");
  assert.equal(r.contact.email, "t@example.com");
});

test("malformed / empty / error responses throw clear errors", () => {
  const d = filled();
  assert.throws(() => parseResumeResponse("", d), /Empty response/);
  assert.throws(() => parseResumeResponse("not json at all", d), /malformed/);
  assert.throws(() => parseResumeResponse("{ broken", d), /malformed/);
  assert.throws(() => parseResumeResponse("{}", d), /empty resume/);
  assert.throws(() => parseResumeResponse("[1,2]", d), /malformed|invalid/);
  assert.throws(() => parseResumeResponse("⚠️ Gemini error: quota\n\nFix", d), /Gemini error: quota/);
});

test("missing fields are normalized; empty sections are removed", () => {
  const r = normalizeResume({ summary: "x", experience: [{ title: "", company: "" }], projects: null, skills: [{ category: "A", items: [] }], education: [{}], certifications: [{ name: " " }] }, filled());
  assert.deepEqual([r.experience, r.projects, r.skills, r.education, r.certifications, r.publications, r.achievements].map((a) => a.length), [0, 0, 0, 0, 0, 0, 0]);
});

test("ATS: flags invented numbers and invented skills", () => {
  const d = filled();
  const r = normalizeResume({ ...good, experience: [{ title: "AI Trainee", company: "Acme", bullets: ["Grew revenue by 35%.", "Used Kubernetes."] }], skills: [{ category: "Cloud", items: ["Kubernetes"] }] }, d);
  assert.ok(unsupportedNumbers(r, d).length >= 1);
  assert.deepEqual(unsupportedSkills(r, d), ["Kubernetes"]);
  const checks = atsChecks(r, d);
  assert.equal(checks.filter((x) => !x.ok).length, 2);
});

test("ATS: supplied numbers pass; placeholder text fails", () => {
  const d = filled();
  const ok = normalizeResume(good, d);
  assert.equal(atsChecks(ok, d).every((x) => x.ok), true);
  const bad = normalizeResume({ ...good, summary: "Lorem ipsum" }, d);
  assert.equal(atsChecks(bad, d).find((x) => x.label === "No placeholder text").ok, false);
});

test("draft persistence round-trips and rejects junk", () => {
  const d = filled();
  const s = restoreDraft(serializeDraft({ draft: d, step: 4, resume: null, phase: "steps" }));
  assert.equal(s.step, 4); assert.equal(s.draft.basics.name, "Test User");
  assert.equal(restoreDraft("garbage"), null);
  assert.equal(restoreDraft(JSON.stringify({ v: 2 })), null);
});
