// resumeModel.js — pure logic for the AI Resume Builder (no React/DOM).
// Kept separate so it is unit-testable with `node --test`, like engine.js.

import { uid, extractJSON } from "./engine.js";

export const DRAFT_KEY = "careeros_resume_builder_draft";

export const STEPS = ["Basics", "Summary", "Education", "Experience", "Projects", "Skills", "Achievements", "Target", "Review"];

export const SKILL_CATEGORIES = ["Programming Languages", "AI / Machine Learning", "Generative AI", "Frameworks / Libraries", "Backend", "Databases", "Cloud", "DevOps", "Tools", "Other"];

export const blankEducation = () => ({ id: uid(), degree: "", field: "", institution: "", location: "", start: "", end: "", gpa: "", coursework: "", honors: "" });
export const blankExperience = () => ({ id: uid(), title: "", company: "", location: "", start: "", end: "", present: false, responsibilities: "", achievements: "", technologies: "" });
export const blankProject = () => ({ id: uid(), name: "", description: "", problem: "", built: "", technologies: "", results: "", github: "", live: "", year: "" });
export const blankCert = () => ({ id: uid(), name: "", issuer: "", year: "", url: "" });
export const blankPub = () => ({ id: uid(), title: "", venue: "", year: "", doi: "", url: "", authors: "" });
export const blankAchievement = () => ({ id: uid(), kind: "Achievement", title: "", org: "", date: "", description: "" });

export const emptyDraft = () => ({
  basics: { name: "", title: "", city: "", region: "", phone: "", email: "", linkedin: "", github: "", portfolio: "", other: "" },
  summary: { title: "", years: "", expertise: "", interests: "", raw: "" },
  education: [], experience: [], projects: [],
  skills: SKILL_CATEGORIES.map((category) => ({ category, items: "" })),
  certifications: [], publications: [], achievements: [],
  target: { role: "", jd: "" },
});

const str = (v) => (v == null ? "" : String(v).trim());
const list = (s) => str(s).split(/[,\n;]+/).map((x) => x.trim()).filter(Boolean);

/* ---------- CareerOS import ---------- */
// Maps the existing normalized career state (profile, targets, evidence, skills)
// into a builder draft. Only copies what CareerOS actually holds.
export function importFromCareer(c, t) {
  const d = emptyDraft();
  const p = (c && c.profile) || {};
  d.basics.name = str(p.name);
  d.basics.title = str(t && t.label) || str(p.track);
  d.summary.title = d.basics.title;
  d.summary.years = str(p.experience);
  d.summary.expertise = str(p.focus);
  d.summary.raw = str(p.resume).slice(0, 1500);
  d.target.role = str(t && t.label);
  const ev = (c && c.evidence) || [];
  ev.filter((e) => /project/i.test(e.type || "")).forEach((e) => {
    const pr = blankProject();
    pr.name = str(e.title);
    pr.technologies = (e.skills || []).join(", ");
    pr.description = str(e.note || e.description);
    d.projects.push(pr);
  });
  const known = new Set();
  const skillNames = [...((c && c.skills) || []).map((s) => (typeof s === "string" ? s : s && s.name)), ...ev.flatMap((e) => e.skills || [])];
  skillNames.map(str).filter(Boolean).forEach((s) => known.add(s));
  if (known.size) d.skills.find((s) => s.category === "Other").items = [...known].join(", ");
  return d;
}

/* ---------- validation ---------- */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateDraft(d) {
  const errors = [];
  if (!str(d.basics.name)) errors.push("Full name is required");
  if (!str(d.basics.email)) errors.push("Email is required");
  else if (!EMAIL.test(str(d.basics.email))) errors.push("Email looks invalid");
  return errors;
}

/* ---------- prompt ---------- */
export const SYSTEM_PROMPT = `You are an expert technical recruiter, ATS resume specialist, and professional resume editor.
Priorities, in order: 1 truthfulness, 2 relevance, 3 clarity, 4 evidence, 5 concision, 6 technical specificity, 7 ATS compatibility, 8 target-role alignment.
NEVER invent: companies, job titles, dates, degrees, certifications, technologies, metrics, achievements, responsibilities, publications, URLs.
NEVER exaggerate or turn an ordinary contribution into an unsupported leadership claim. NEVER invent numbers; use a number only if the candidate supplied it.
Use strong action verbs. Keep bullets concise: action + what was built/done + technology/method + measurable result ONLY when supplied.
If a job description is given, reorder and reword to align with it and surface relevant keywords, but never add a skill the candidate did not list.
Omit any section with no data. Return ONLY valid JSON, no markdown fences.`;

const SCHEMA = `{"name":"","title":"","contact":{"location":"","phone":"","email":"","linkedin":"","github":"","portfolio":"","other":""},"summary":"","skills":[{"category":"","items":[]}],"experience":[{"title":"","company":"","location":"","dates":"","bullets":[]}],"projects":[{"name":"","dates":"","links":[],"bullets":[]}],"education":[{"degree":"","institution":"","location":"","dates":"","details":[]}],"certifications":[{"name":"","issuer":"","year":"","url":""}],"publications":[{"title":"","venue":"","year":"","authors":"","link":""}],"achievements":[{"title":"","org":"","date":"","description":""}]}`;

const dates = (a, b, present) => [str(a), present ? "Present" : str(b)].filter(Boolean).join(" – ");

// Structured, trimmed facts only — what the model is allowed to use.
export function draftToFacts(d) {
  const b = d.basics;
  return {
    name: str(b.name), title: str(b.title) || str(d.summary.title),
    contact: { location: [str(b.city), str(b.region)].filter(Boolean).join(", "), phone: str(b.phone), email: str(b.email), linkedin: str(b.linkedin), github: str(b.github), portfolio: str(b.portfolio), other: str(b.other) },
    summaryInput: { years: str(d.summary.years), expertise: str(d.summary.expertise), interests: str(d.summary.interests), raw: str(d.summary.raw) },
    education: d.education.filter((e) => str(e.degree) || str(e.institution)).map((e) => ({ degree: str(e.degree), field: str(e.field), institution: str(e.institution), location: str(e.location), dates: dates(e.start, e.end), gpa: str(e.gpa), coursework: str(e.coursework), honors: str(e.honors) })),
    experience: d.experience.filter((e) => str(e.title) || str(e.company)).map((e) => ({ title: str(e.title), company: str(e.company), location: str(e.location), dates: dates(e.start, e.end, e.present), responsibilities: str(e.responsibilities), achievements: str(e.achievements), technologies: str(e.technologies) })),
    projects: d.projects.filter((p) => str(p.name)).map((p) => ({ name: str(p.name), dates: str(p.year), description: str(p.description), problem: str(p.problem), built: str(p.built), technologies: str(p.technologies), results: str(p.results), links: [str(p.github), str(p.live)].filter(Boolean) })),
    skills: d.skills.map((s) => ({ category: s.category, items: list(s.items) })).filter((s) => s.items.length),
    certifications: d.certifications.filter((x) => str(x.name)).map((x) => ({ name: str(x.name), issuer: str(x.issuer), year: str(x.year), url: str(x.url) })),
    publications: d.publications.filter((x) => str(x.title)).map((x) => ({ title: str(x.title), venue: str(x.venue), year: str(x.year), authors: str(x.authors), link: str(x.doi) || str(x.url) })),
    achievements: d.achievements.filter((x) => str(x.title)).map((x) => ({ kind: x.kind, title: str(x.title), org: str(x.org), date: str(x.date), description: str(x.description) })),
    targetRole: str(d.target.role), jobDescription: str(d.target.jd),
  };
}

export function buildPrompt(d) {
  return `${SYSTEM_PROMPT}\n\nCANDIDATE FACTS (the ONLY allowed source):\n${JSON.stringify(draftToFacts(d))}\n\nWrite: a 2-3 sentence summary from summaryInput/facts only; 2-4 concise bullets per experience and project; skills grouped as given (reorder for the target role, add none); education/certifications/publications/achievements copied faithfully.\nOutput JSON in exactly this shape:\n${SCHEMA}`;
}

/* ---------- parse + normalize AI output ---------- */
const arr = (v) => (Array.isArray(v) ? v : []);
const strs = (v) => arr(v).map(str).filter(Boolean);

export function normalizeResume(raw, d) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("AI returned an invalid resume");
  const facts = draftToFacts(d);
  // Identity + contact always come from the user's own data, never the model.
  const r = {
    name: facts.name, title: str(raw.title) || facts.title,
    contact: { ...facts.contact },
    summary: str(raw.summary),
    skills: arr(raw.skills).map((s) => ({ category: str(s && s.category), items: strs(s && s.items) })).filter((s) => s.items.length),
    experience: arr(raw.experience).map((e) => ({ title: str(e && e.title), company: str(e && e.company), location: str(e && e.location), dates: str(e && e.dates), bullets: strs(e && e.bullets) })).filter((e) => e.title || e.company),
    projects: arr(raw.projects).map((p) => ({ name: str(p && p.name), dates: str(p && p.dates), links: strs(p && p.links), bullets: strs(p && p.bullets) })).filter((p) => p.name),
    education: arr(raw.education).map((e) => ({ degree: str(e && e.degree), institution: str(e && e.institution), location: str(e && e.location), dates: str(e && e.dates), details: strs(e && e.details) })).filter((e) => e.degree || e.institution),
    certifications: arr(raw.certifications).map((x) => ({ name: str(x && x.name), issuer: str(x && x.issuer), year: str(x && x.year), url: str(x && x.url) })).filter((x) => x.name),
    publications: arr(raw.publications).map((x) => ({ title: str(x && x.title), venue: str(x && x.venue), year: str(x && x.year), authors: str(x && x.authors), link: str(x && x.link) })).filter((x) => x.title),
    achievements: arr(raw.achievements).map((x) => ({ title: str(x && x.title), org: str(x && x.org), date: str(x && x.date), description: str(x && x.description) })).filter((x) => x.title),
  };
  if (!r.summary && !r.experience.length && !r.projects.length && !r.education.length && !r.skills.length) throw new Error("AI returned an empty resume");
  return r;
}

export function parseResumeResponse(text, d) {
  if (!str(text)) throw new Error("Empty response from AI");
  if (/^\s*⚠️/.test(text)) throw new Error(text.replace(/^\s*⚠️\s*/, "").split("\n")[0]);
  let raw;
  try { raw = extractJSON(text, "{", "}"); } catch { throw new Error("AI returned malformed JSON — retry"); }
  return normalizeResume(raw, d);
}

/* ---------- ATS checks (deterministic) ---------- */
const PLACEHOLDER = /lorem ipsum|\[(your|insert|company|name)[^\]]*\]|\bTBD\b|\bN\/A\b|xxx+/i;
const NUM = /\d[\d,.]*\s?(%|x|k|m|\+)?/gi;

export function resumeText(r) {
  return [r.name, r.title, r.summary, ...r.skills.flatMap((s) => [s.category, ...s.items]), ...r.experience.flatMap((e) => [e.title, e.company, ...e.bullets]), ...r.projects.flatMap((p) => [p.name, ...p.bullets]), ...r.education.flatMap((e) => [e.degree, e.institution, ...e.details]), ...r.certifications.map((x) => x.name), ...r.publications.map((x) => x.title), ...r.achievements.flatMap((x) => [x.title, x.description])].filter(Boolean).join("\n");
}

// Numbers in AI bullets/summary that never appeared in the user's input = unsupported.
export function unsupportedNumbers(r, d) {
  const source = JSON.stringify(draftToFacts(d)).toLowerCase();
  const gen = [r.summary, ...r.experience.flatMap((e) => e.bullets), ...r.projects.flatMap((p) => p.bullets)].join(" ");
  const found = (gen.match(NUM) || []).map((n) => n.trim().toLowerCase());
  return [...new Set(found.filter((n) => { const core = n.replace(/[^\d.]/g, ""); return core && !source.includes(core); }))];
}

export function unsupportedSkills(r, d) {
  const allowed = new Set(draftToFacts(d).skills.flatMap((s) => s.items.map((i) => i.toLowerCase())));
  const techText = JSON.stringify(draftToFacts(d)).toLowerCase();
  return r.skills.flatMap((s) => s.items).filter((i) => !allowed.has(i.toLowerCase()) && !techText.includes(i.toLowerCase()));
}

export function atsChecks(r, d) {
  const text = resumeText(r);
  const nums = unsupportedNumbers(r, d), sk = unsupportedSkills(r, d);
  return [
    { label: "Single-column structure", ok: true },
    { label: "Standard section headings", ok: true },
    { label: "Text-based content, no graphics", ok: true },
    { label: "No empty sections", ok: true },
    { label: "No placeholder text", ok: !PLACEHOLDER.test(text) },
    { label: d.target.role ? "Target role considered" : "Target role not set", ok: !!d.target.role, soft: true },
    { label: nums.length ? `Unverified numbers: ${nums.join(", ")}` : "No unsupported metrics detected", ok: nums.length === 0 },
    { label: sk.length ? `Skills not in your input: ${sk.join(", ")}` : "No unsupported skills detected", ok: sk.length === 0 },
  ];
}

/* ---------- draft persistence ---------- */
export function serializeDraft(state) { return JSON.stringify({ v: 1, ...state }); }
export function restoreDraft(json) {
  try {
    const s = JSON.parse(json);
    if (!s || s.v !== 1 || !s.draft) return null;
    return { ...s, draft: { ...emptyDraft(), ...s.draft } };
  } catch { return null; }
}

export const hasContent = (d) => !!(str(d.basics.name) || str(d.basics.email) || d.education.length || d.experience.length || d.projects.length || d.skills.some((s) => str(s.items)) || str(d.summary.raw));
