import { useState, useEffect, useRef } from "react";
import { FileText, Plus, Trash2, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Loader2, Sparkles, Printer, RotateCcw, Check, AlertTriangle, Download } from "lucide-react";
import { Label, Panel, Btn } from "./ui.jsx";
import ResumeDocument from "./ResumeDocument.jsx";
import {
  DRAFT_KEY, STEPS, emptyDraft, importFromCareer, validateDraft, buildPrompt, draftToFacts, SYSTEM_PROMPT,
  parseResumeResponse, atsChecks, serializeDraft, restoreDraft, hasContent,
  blankEducation, blankExperience, blankProject, blankCert, blankPub, blankAchievement,
} from "./resumeModel.js";

const INPUT = "w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60";
const GEN_STATUS = ["Building your resume", "Analyzing your experience", "Optimizing for the target role", "Writing concise bullets", "Checking for unsupported claims", "Formatting the final resume"];

let fid = 0;
function Field({ label, value, onChange, ph, area, type = "text", required, className = "" }) {
  const [id] = useState(() => "rb-f" + ++fid);
  const common = { id, value, onChange: (e) => onChange(e.target.value), placeholder: ph, className: INPUT, required };
  return (
    <div className={"space-y-1 " + className}>
      <label htmlFor={id} className="block text-xs text-slate-400">{label}{required && <span className="text-amber-300"> *</span>}</label>
      {area ? <textarea rows={3} {...common} /> : <input type={type} {...common} />}
    </div>
  );
}

// Generic add / edit / delete / reorder list used by every multi-entry step.
function EntryList({ items, setItems, blank, addLabel, empty, render, title }) {
  const upd = (id, k, v) => setItems(items.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const move = (i, d) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setItems(n); };
  return (
    <div className="space-y-3">
      {items.length === 0 && <div className="text-sm text-slate-500">{empty}</div>}
      {items.map((x, i) => (
        <Panel key={x.id} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label>{title} {i + 1}</Label>
            <div className="flex gap-1">
              <Btn size="sm" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={12} aria-label="Move up" /></Btn>
              <Btn size="sm" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown size={12} aria-label="Move down" /></Btn>
              <Btn size="sm" variant="danger" onClick={() => setItems(items.filter((y) => y.id !== x.id))}><Trash2 size={12} aria-label={"Delete " + title} /></Btn>
            </div>
          </div>
          {render(x, (k, v) => upd(x.id, k, v))}
        </Panel>
      ))}
      <Btn onClick={() => setItems([...items, blank()])}><Plus size={14} />{addLabel}</Btn>
    </div>
  );
}
const grid = "grid grid-cols-1 sm:grid-cols-2 gap-3";

function StepBody({ step, d, set, onSummaryAI, aiBusy }) {
  const up = (sec) => (k, v) => set({ ...d, [sec]: { ...d[sec], [k]: v } });
  const b = d.basics, ub = up("basics"), us = up("summary"), ut = up("target");
  if (step === 0) return (
    <div className="space-y-3">
      <div className={grid}>
        <Field label="Full name" required value={b.name} onChange={(v) => ub("name", v)} />
        <Field label="Email" required type="email" value={b.email} onChange={(v) => ub("email", v)} />
        <Field label="Professional title" value={b.title} onChange={(v) => ub("title", v)} ph="e.g. AI Engineer" />
        <Field label="Phone" value={b.phone} onChange={(v) => ub("phone", v)} />
        <Field label="City" value={b.city} onChange={(v) => ub("city", v)} />
        <Field label="State / Country" value={b.region} onChange={(v) => ub("region", v)} />
        <Field label="LinkedIn" value={b.linkedin} onChange={(v) => ub("linkedin", v)} ph="linkedin.com/in/…" />
        <Field label="GitHub" value={b.github} onChange={(v) => ub("github", v)} ph="github.com/…" />
        <Field label="Portfolio" value={b.portfolio} onChange={(v) => ub("portfolio", v)} />
        <Field label="Other professional URL" value={b.other} onChange={(v) => ub("other", v)} />
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="space-y-3">
      <div className={grid}>
        <Field label="Current / professional title" value={d.summary.title} onChange={(v) => us("title", v)} />
        <Field label="Years of experience" value={d.summary.years} onChange={(v) => us("years", v)} />
        <Field label="Main areas of expertise" value={d.summary.expertise} onChange={(v) => us("expertise", v)} />
        <Field label="Career interests" value={d.summary.interests} onChange={(v) => us("interests", v)} />
      </div>
      <Field label="Raw summary (optional)" area value={d.summary.raw} onChange={(v) => us("raw", v)} ph="Anything you already have — AI will tighten it, not embellish it." />
      <Btn variant="teal" onClick={onSummaryAI} disabled={aiBusy}>{aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}Generate summary with AI</Btn>
    </div>
  );
  if (step === 2) return <EntryList title="Education" items={d.education} setItems={(v) => set({ ...d, education: v })} blank={blankEducation} addLabel="Add education" empty="No education added yet." render={(x, u) => (
    <div className={grid}>
      <Field label="Degree" value={x.degree} onChange={(v) => u("degree", v)} /><Field label="Field of study" value={x.field} onChange={(v) => u("field", v)} />
      <Field label="Institution" value={x.institution} onChange={(v) => u("institution", v)} /><Field label="Location" value={x.location} onChange={(v) => u("location", v)} />
      <Field label="Start year" value={x.start} onChange={(v) => u("start", v)} /><Field label="End year / expected" value={x.end} onChange={(v) => u("end", v)} />
      <Field label="GPA / CGPA (optional)" value={x.gpa} onChange={(v) => u("gpa", v)} /><Field label="Relevant coursework (optional)" value={x.coursework} onChange={(v) => u("coursework", v)} />
      <Field className="sm:col-span-2" label="Honors / achievements (optional)" value={x.honors} onChange={(v) => u("honors", v)} />
    </div>)} />;
  if (step === 3) return <EntryList title="Role" items={d.experience} setItems={(v) => set({ ...d, experience: v })} blank={blankExperience} addLabel="Add experience" empty="No experience added yet — internships and training count." render={(x, u) => (
    <div className="space-y-3">
      <div className={grid}>
        <Field label="Job title" value={x.title} onChange={(v) => u("title", v)} /><Field label="Company" value={x.company} onChange={(v) => u("company", v)} />
        <Field label="Location" value={x.location} onChange={(v) => u("location", v)} /><Field label="Technologies" value={x.technologies} onChange={(v) => u("technologies", v)} ph="Comma separated" />
        <Field label="Start date" value={x.start} onChange={(v) => u("start", v)} ph="e.g. Sep 2026" />
        <div className="space-y-1"><Field label="End date" value={x.present ? "" : x.end} onChange={(v) => u("end", v)} />
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={x.present} onChange={(e) => u("present", e.target.checked)} />Present</label></div>
      </div>
      <Field label="Responsibilities" area value={x.responsibilities} onChange={(v) => u("responsibilities", v)} ph="Rough is fine — AI turns it into concise bullets." />
      <Field label="Achievements (only real ones, include numbers you actually have)" area value={x.achievements} onChange={(v) => u("achievements", v)} />
    </div>)} />;
  if (step === 4) return <EntryList title="Project" items={d.projects} setItems={(v) => set({ ...d, projects: v })} blank={blankProject} addLabel="Add project" empty="No projects added yet." render={(x, u) => (
    <div className="space-y-3">
      <div className={grid}>
        <Field label="Project name" value={x.name} onChange={(v) => u("name", v)} /><Field label="Year" value={x.year} onChange={(v) => u("year", v)} />
        <Field label="GitHub" value={x.github} onChange={(v) => u("github", v)} /><Field label="Live URL" value={x.live} onChange={(v) => u("live", v)} />
        <Field className="sm:col-span-2" label="Technologies" value={x.technologies} onChange={(v) => u("technologies", v)} ph="Comma separated" />
      </div>
      <Field label="Description" area value={x.description} onChange={(v) => u("description", v)} />
      <div className={grid}>
        <Field label="Problem solved" area value={x.problem} onChange={(v) => u("problem", v)} /><Field label="What I built" area value={x.built} onChange={(v) => u("built", v)} />
      </div>
      <Field label="Results / impact (real numbers only)" area value={x.results} onChange={(v) => u("results", v)} />
    </div>)} />;
  if (step === 5) return (
    <div className="space-y-3">
      <div className="text-xs text-slate-500">Comma-separated. Listed as plain text — no bars, stars or levels.</div>
      {d.skills.map((s, i) => <Field key={s.category} label={s.category} value={s.items} onChange={(v) => set({ ...d, skills: d.skills.map((y, j) => (j === i ? { ...y, items: v } : y)) })} />)}
    </div>
  );
  if (step === 6) return (
    <div className="space-y-6">
      <div><Label>Certifications</Label><div className="mt-2"><EntryList title="Certification" items={d.certifications} setItems={(v) => set({ ...d, certifications: v })} blank={blankCert} addLabel="Add certification" empty="Optional." render={(x, u) => (
        <div className={grid}><Field label="Name" value={x.name} onChange={(v) => u("name", v)} /><Field label="Issuer" value={x.issuer} onChange={(v) => u("issuer", v)} /><Field label="Year" value={x.year} onChange={(v) => u("year", v)} /><Field label="Credential URL" value={x.url} onChange={(v) => u("url", v)} /></div>)} /></div></div>
      <div><Label>Publications</Label><div className="mt-2"><EntryList title="Publication" items={d.publications} setItems={(v) => set({ ...d, publications: v })} blank={blankPub} addLabel="Add publication" empty="Optional." render={(x, u) => (
        <div className={grid}><Field className="sm:col-span-2" label="Title" value={x.title} onChange={(v) => u("title", v)} /><Field label="Venue" value={x.venue} onChange={(v) => u("venue", v)} /><Field label="Year" value={x.year} onChange={(v) => u("year", v)} /><Field label="Authors" value={x.authors} onChange={(v) => u("authors", v)} /><Field label="DOI" value={x.doi} onChange={(v) => u("doi", v)} /><Field className="sm:col-span-2" label="URL" value={x.url} onChange={(v) => u("url", v)} /></div>)} /></div></div>
      <div><Label>Achievements · awards · leadership · volunteering</Label><div className="mt-2"><EntryList title="Entry" items={d.achievements} setItems={(v) => set({ ...d, achievements: v })} blank={blankAchievement} addLabel="Add entry" empty="Optional." render={(x, u) => (
        <div className="space-y-3"><div className={grid}>
          <div className="space-y-1"><label className="block text-xs text-slate-400">Type</label><select value={x.kind} onChange={(e) => u("kind", e.target.value)} className={INPUT}>{["Achievement", "Award", "Leadership", "Volunteering"].map((k) => <option key={k}>{k}</option>)}</select></div>
          <Field label="Title" value={x.title} onChange={(v) => u("title", v)} /><Field label="Organization" value={x.org} onChange={(v) => u("org", v)} /><Field label="Date" value={x.date} onChange={(v) => u("date", v)} /></div>
          <Field label="Description" area value={x.description} onChange={(v) => u("description", v)} /></div>)} /></div></div>
    </div>
  );
  if (step === 7) return (
    <div className="space-y-3">
      <Field label="What role are you targeting?" value={d.target.role} onChange={(v) => ut("role", v)} ph="e.g. AI Engineer, ML Engineer, Data Analyst" />
      <Field label="Paste the job description (optional)" area value={d.target.jd} onChange={(v) => ut("jd", v)} ph="AI will align wording and priority — it will not add skills you didn't list." />
    </div>
  );
  return null;
}

function ReviewStep({ d, goStep }) {
  const f = draftToFacts(d);
  const rows = [
    ["Personal information", 0, [f.name, f.title, f.contact.email, f.contact.location].filter(Boolean).join(" · ")],
    ["Summary", 1, [f.summaryInput.expertise, f.summaryInput.years].filter(Boolean).join(" · ") || f.summaryInput.raw.slice(0, 120)],
    ["Education", 2, f.education.map((e) => e.degree + (e.institution ? ", " + e.institution : "")).join(" | ")],
    ["Experience", 3, f.experience.map((e) => e.title + (e.company ? " @ " + e.company : "")).join(" | ")],
    ["Projects", 4, f.projects.map((p) => p.name).join(" | ")],
    ["Skills", 5, f.skills.map((s) => s.category + ": " + s.items.length).join(" | ")],
    ["Certifications / publications / achievements", 6, [f.certifications.length && f.certifications.length + " cert", f.publications.length && f.publications.length + " pub", f.achievements.length && f.achievements.length + " other"].filter(Boolean).join(" · ")],
    ["Target role", 7, f.targetRole + (f.jobDescription ? " · job description added" : "")],
  ];
  return (
    <div className="space-y-2">
      {rows.map(([label, idx, val]) => (
        <Panel key={label} className="p-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><Label>{label}</Label><div className={"text-sm mt-0.5 truncate " + (val ? "text-slate-200" : "text-slate-600")}>{val || "Nothing added"}</div></div>
          <Btn size="sm" onClick={() => goStep(idx)}>Edit</Btn>
        </Panel>
      ))}
    </div>
  );
}

export default function ResumeBuilder({ c, t, commit, ping, callAI }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("intro"); // intro | steps | generating | result
  const [resume, setResume] = useState(null);
  const [error, setError] = useState(null);
  const [gen, setGen] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const topRef = useRef(null);

  useEffect(() => { (async () => {
    try { const r = await window.storage.get(DRAFT_KEY); const s = r && r.value ? restoreDraft(r.value) : null; if (s) { setDraft(s.draft); setStep(s.step || 0); setResume(s.resume || null); setPhase(s.resume ? "result" : s.phase === "steps" ? "steps" : "intro"); } } catch { /* no draft yet */ }
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (!loaded) return; try { window.storage.set(DRAFT_KEY, serializeDraft({ draft, step, resume, phase: phase === "generating" ? "steps" : phase })); } catch { /* storage unavailable */ } }, [draft, step, resume, phase, loaded]);
  useEffect(() => { if (phase !== "generating") return; const i = setInterval(() => setGen((g) => Math.min(g + 1, GEN_STATUS.length - 1)), 2500); return () => clearInterval(i); }, [phase]);
  useEffect(() => { if (topRef.current && topRef.current.scrollIntoView) topRef.current.scrollIntoView({ block: "start" }); }, [step, phase]);

  const begin = (imp) => { if (imp) setDraft(importFromCareer(c, t)); setStep(0); setPhase("steps"); };
  const clearDraft = () => { setDraft(emptyDraft()); setResume(null); setStep(0); setPhase("intro"); setError(null); setConfirmClear(false); try { window.storage.delete(DRAFT_KEY); } catch { /* ignore */ } };

  const summaryAI = async () => {
    setAiBusy(true);
    try {
      const f = draftToFacts(draft);
      const txt = await callAI([{ role: "user", content: `${SYSTEM_PROMPT}\n\nWrite a 2-3 sentence professional resume summary using ONLY these facts. Plain text, no preamble.\n${JSON.stringify({ name: f.name, title: f.title, ...f.summaryInput, skills: f.skills, targetRole: f.targetRole })}` }], { temperature: 0.3, maxOutputTokens: 512 });
      if (/^\s*⚠️/.test(txt) || !txt.trim()) throw new Error("AI unavailable");
      setDraft({ ...draft, summary: { ...draft.summary, raw: txt.trim() } });
    } catch (e) { ping("Summary failed: " + e.message, true); }
    setAiBusy(false);
  };

  const generate = async () => {
    const errs = validateDraft(draft);
    if (errs.length) { ping(errs[0], true); setStep(0); setPhase("steps"); return; }
    setError(null); setGen(0); setPhase("generating");
    try {
      const txt = await callAI([{ role: "user", content: buildPrompt(draft) }], { json: true, temperature: 0.3, maxOutputTokens: 6000 });
      const r = parseResumeResponse(txt, draft);
      setResume(r); setPhase("result");
      commit(() => {}, { type: "resume", text: "Built AI resume" + (draft.target.role ? " for " + draft.target.role : "") });
    } catch (e) { setError(e.message || "Generation failed"); setPhase("steps"); setStep(STEPS.length - 1); }
  };

  const shell = (children) => (
    <div className="space-y-4" ref={topRef}>
      <div><Label>AI Resume Builder · ATS-friendly, evidence-only</Label></div>
      {children}
    </div>
  );

  if (!loaded) return shell(<div className="text-sm text-slate-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Loading draft…</div>);

  if (phase === "intro") return shell(
    <Panel accent className="p-6 space-y-4">
      <div><div className="text-lg font-semibold text-slate-50">Build a professional, ATS-friendly resume from your CareerOS profile.</div>
        <div className="text-sm text-slate-400 mt-1">Answer a few steps. AI only uses what you provide — it never invents experience, metrics or skills.</div></div>
      <div className="flex gap-2 flex-wrap">
        <Btn variant="primary" onClick={() => begin(true)}><FileText size={14} />Import from CareerOS</Btn>
        <Btn onClick={() => begin(false)}>Start from scratch</Btn>
        {hasContent(draft) && <Btn variant="teal" onClick={() => setPhase("steps")}>Continue draft</Btn>}
      </div>
    </Panel>
  );

  if (phase === "generating") return shell(
    <Panel className="p-6" accent>
      <div className="flex items-center gap-2 text-slate-200" role="status" aria-live="polite"><Loader2 size={16} className="animate-spin text-amber-300" />{GEN_STATUS[gen]}…</div>
      <ol className="mt-3 space-y-1 text-xs text-slate-500">{GEN_STATUS.map((s, i) => <li key={s} className={i <= gen ? "text-slate-300" : ""}>{i < gen ? "✓ " : i === gen ? "› " : "  "}{s}</li>)}</ol>
    </Panel>
  );

  if (phase === "result" && resume) {
    const checks = atsChecks(resume, draft);
    const bad = checks.filter((x) => !x.ok && !x.soft);
    return shell(
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Btn variant="primary" onClick={() => { ping("Choose “Save as PDF” in the print dialog"); window.print(); }}><Download size={14} />Download PDF</Btn>
          <Btn onClick={() => window.print()}><Printer size={14} />Print</Btn>
          <Btn onClick={() => { setPhase("steps"); setStep(STEPS.length - 1); }}>Edit resume</Btn>
          <Btn variant="teal" onClick={generate}><RotateCcw size={14} />Regenerate</Btn>
          <Btn variant="danger" onClick={clearDraft}>Start new resume</Btn>
        </div>
        <Panel className="p-4">
          <Label>ATS check · deterministic rules</Label>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">{checks.map((x) => <li key={x.label} className={x.ok ? "text-slate-300" : x.soft ? "text-slate-500" : "text-amber-300"}>{x.ok ? <Check size={11} className="inline mr-1 text-teal-300" /> : <AlertTriangle size={11} className="inline mr-1" />}{x.label}</li>)}</ul>
          {bad.length > 0 && <div className="text-xs text-amber-300 mt-2">Review the flagged items before sending — edit your inputs or regenerate.</div>}
        </Panel>
        <ResumeDocument r={resume} />
      </div>
    );
  }

  const last = step === STEPS.length - 1;
  return shell(
    <div className="space-y-4">
      <nav aria-label="Resume steps" className="flex gap-1.5 flex-wrap">{STEPS.map((s, i) => (
        <button key={s} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className={"px-3 py-1.5 rounded-full text-xs border " + (i === step ? "bg-amber-400/15 border-amber-400/50 text-amber-200" : "border-white/15 text-slate-400 hover:text-slate-200")}>{String(i + 1).padStart(2, "0")} {s}</button>
      ))}</nav>
      {error && <Panel className="p-4 border-red-400/30" ><div className="flex items-start justify-between gap-3" role="alert"><div className="text-sm text-red-300"><AlertTriangle size={14} className="inline mr-1" />{error} — your data is safe.</div><Btn size="sm" variant="danger" onClick={generate}>Retry</Btn></div></Panel>}
      <Panel className="p-5 space-y-4">
        <div className="text-base font-semibold text-slate-50">{STEPS[step]}</div>
        {last ? <><ReviewStep d={draft} goStep={setStep} /><div className="text-xs text-slate-500">AI will use only the information you provide.</div></> : <StepBody step={step} d={draft} set={setDraft} onSummaryAI={summaryAI} aiBusy={aiBusy} />}
      </Panel>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Btn onClick={() => (step === 0 ? setPhase("intro") : setStep(step - 1))}><ArrowLeft size={14} />Back</Btn>
          {confirmClear
            ? <><Btn variant="danger" onClick={clearDraft}>Confirm clear</Btn><Btn onClick={() => setConfirmClear(false)}>Cancel</Btn></>
            : <Btn onClick={() => setConfirmClear(true)}>Clear draft</Btn>}
        </div>
        {last ? <Btn variant="primary" onClick={generate}><Sparkles size={14} />Generate resume</Btn> : <Btn variant="primary" onClick={() => setStep(step + 1)}>Next<ArrowRight size={14} /></Btn>}
      </div>
    </div>
  );
}
