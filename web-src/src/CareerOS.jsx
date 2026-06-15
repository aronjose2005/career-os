import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Command, Target, Gauge, Map as MapIcon, GraduationCap, Mic, Repeat, Brain,
  Focus as FocusIcon, Handshake, Briefcase, History, Clock, Flame, FileText,
  Search, X, Plus, Check, ChevronRight, ArrowRight, ExternalLink, Loader2, Send,
  Square, Sparkles, TrendingUp, Building2, BookOpen, ShieldAlert, Activity,
  Lightbulb, Bot, User, Settings, CircleDot
} from "lucide-react";

/* ============================================================================
   CareerOS v3 — The Operating System for Career Growth
   One normalized state (`career`) + derived engines + an event log.
   The loop: DIAGNOSE → PRESCRIBE → IMPROVE → VERIFY → ADVANCE.
   Every action writes to state/events; every surface reads derived values.
   Backend: calls /api/claude (key stays server-side). Storage: window.storage.
   ============================================================================ */

const KEY = "careeros:v3";
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

/* ---------- backend ---------- */
async function callClaude(messages, { useSearch = false } = {}) {
  const res = await fetch("/api/claude", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, useSearch }),
  });
  if (!res.ok) throw new Error("API request failed (" + res.status + ")");
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}
function extractJSON(text, open, close) {
  const c = text.replace(/```json|```/g, "").trim();
  const a = c.indexOf(open), b = c.lastIndexOf(close);
  if (a === -1 || b === -1) throw new Error("no JSON in response");
  return JSON.parse(c.slice(a, b + 1));
}

/* ---------- storage ---------- */
async function loadState(fallback) {
  try { const r = await window.storage.get(KEY); return r && r.value ? JSON.parse(r.value) : fallback; }
  catch { return fallback; }
}
async function persist(state) { try { await window.storage.set(KEY, JSON.stringify(state)); } catch (e) { console.error(e); } }

/* ============================================================================
   DYNAMIC CAREER SYSTEM — no hardcoded AI path. Each track defines the skill
   checklist (drives Gap Map + Offer Distance), interview rounds, concept cards
   (Spaced Knowledge), and the trajectory ladder.
   ============================================================================ */
const TRACKS = {
  "AI Engineer": { skills: ["Python", "Deep Learning", "Transformers/NLP", "LLM apps (RAG)", "PyTorch", "MLOps", "System design", "DSA"], rounds: ["DSA coding", "ML concepts", "ML system design", "Behavioral"], concepts: ["Attention & transformers from first principles", "RAG: chunking, embeddings, reranking", "Fine-tuning vs RLHF vs prompting", "LLM inference: quantization, KV cache"], ladder: ["System Engineer", "Software Engineer", "AI Engineer", "Senior AI Engineer", "AI Architect"] },
  "ML Engineer": { skills: ["Python", "ML algorithms", "Feature engineering", "MLOps", "Model serving", "SQL/Spark", "System design", "DSA"], rounds: ["DSA coding", "ML concepts", "ML system design", "Behavioral"], concepts: ["Bias–variance & regularization", "Gradient boosting vs random forests", "Training→serving pipeline (MLOps)", "Drift detection & monitoring"], ladder: ["Engineer", "ML Engineer", "Senior ML Engineer", "Staff ML Engineer", "ML Architect"] },
  "Data Scientist": { skills: ["Python/R", "Statistics", "ML modeling", "SQL", "Experimentation (A/B)", "Data viz", "Storytelling", "Business sense"], rounds: ["SQL/coding", "Stats & ML", "Case study", "Behavioral"], concepts: ["Hypothesis testing & p-values", "A/B test design & pitfalls", "Causal inference basics", "Feature selection methods"], ladder: ["Analyst", "Data Scientist", "Senior DS", "Lead DS", "Principal DS"] },
  "Backend Engineer": { skills: ["A language (Java/Go/Python)", "Databases", "APIs/REST", "System design", "Caching/queues", "Cloud basics", "Testing", "DSA"], rounds: ["DSA coding", "System design", "API/DB design", "Behavioral"], concepts: ["CAP theorem & consistency", "Indexing & query optimization", "Caching strategies", "Idempotency & retries"], ladder: ["Engineer", "Backend Engineer", "Senior Backend", "Staff Engineer", "Principal Engineer"] },
  "Frontend Engineer": { skills: ["JavaScript", "React", "CSS/layout", "Web performance", "Accessibility", "State management", "Testing", "DSA"], rounds: ["DSA/JS coding", "UI build", "Frontend system design", "Behavioral"], concepts: ["Rendering & reconciliation", "Critical rendering path & perf", "Accessibility (ARIA, focus)", "State patterns & data flow"], ladder: ["Engineer", "Frontend Engineer", "Senior Frontend", "Staff Frontend", "Principal Engineer"] },
  "DevOps Engineer": { skills: ["Linux", "Docker", "Kubernetes", "CI/CD", "Terraform/IaC", "Cloud (AWS/GCP)", "Monitoring", "Scripting"], rounds: ["Scripting/coding", "Systems & networking", "CI/CD & infra design", "Behavioral"], concepts: ["Container vs VM internals", "K8s scheduling & probes", "Blue-green vs canary deploys", "Observability: metrics/logs/traces"], ladder: ["SysAdmin", "DevOps Engineer", "Senior DevOps", "SRE/Platform Lead", "Principal SRE"] },
  "Cloud Engineer": { skills: ["AWS/GCP/Azure", "Networking", "IaC (Terraform)", "Security/IAM", "Containers", "Cost optimization", "Scripting", "System design"], rounds: ["Cloud fundamentals", "Architecture design", "Security/networking", "Behavioral"], concepts: ["VPC & subnet design", "IAM least-privilege", "High availability patterns", "Cost levers (NAT, egress, spot)"], ladder: ["Engineer", "Cloud Engineer", "Senior Cloud", "Cloud Architect", "Principal Architect"] },
  "Cybersecurity Engineer": { skills: ["Networking", "OS internals", "Threat modeling", "Cryptography basics", "SIEM/tooling", "Scripting", "Incident response", "Compliance"], rounds: ["Security fundamentals", "Threat/scenario", "Hands-on/coding", "Behavioral"], concepts: ["OWASP Top 10", "Symmetric vs asymmetric crypto", "Defense in depth", "Incident response lifecycle"], ladder: ["Analyst", "Security Engineer", "Senior Security", "Security Lead", "Principal/CISO track"] },
  "Product Manager": { skills: ["Product sense", "Execution", "Metrics/analytics", "User research", "Prioritization", "Strategy", "Communication", "Technical fluency"], rounds: ["Product sense", "Analytical/metrics", "Execution/estimation", "Behavioral/leadership"], concepts: ["North-star & input metrics", "Prioritization (RICE)", "Designing experiments", "Writing a crisp PRD"], ladder: ["APM", "Product Manager", "Senior PM", "Group PM", "Director of Product"] },
  "UI/UX Designer": { skills: ["Visual design", "Interaction design", "User research", "Prototyping (Figma)", "Design systems", "Usability testing", "IA", "Communication"], rounds: ["Portfolio review", "Design challenge", "Critique/whiteboard", "Behavioral"], concepts: ["Heuristics (Nielsen)", "IA & navigation patterns", "Accessibility & contrast", "Design tokens & systems"], ladder: ["Junior Designer", "Product Designer", "Senior Designer", "Staff Designer", "Design Lead"] },
  "Game Developer": { skills: ["C++/C#", "Game engine (Unity/Unreal)", "Math/linear algebra", "Graphics basics", "Physics", "Optimization", "Gameplay systems", "DSA"], rounds: ["Coding/DSA", "Engine/graphics", "Gameplay design", "Behavioral"], concepts: ["Game loop & delta time", "Vectors, matrices, transforms", "Collision detection", "Frame budget & profiling"], ladder: ["Junior Dev", "Game Developer", "Senior Game Dev", "Lead Developer", "Technical Director"] },
  "Mobile Developer": { skills: ["Kotlin/Swift", "Android/iOS SDK", "UI frameworks", "State/architecture", "APIs/networking", "Performance", "Testing", "DSA"], rounds: ["DSA coding", "Mobile fundamentals", "App/system design", "Behavioral"], concepts: ["Activity/View lifecycle", "Memory & battery profiling", "Offline-first sync", "MVVM/architecture patterns"], ladder: ["Engineer", "Mobile Developer", "Senior Mobile", "Staff Mobile", "Principal Engineer"] },
  "Blockchain Engineer": { skills: ["Solidity", "EVM/smart contracts", "Cryptography", "Web3 libs", "Security/auditing", "DApp architecture", "Gas optimization", "DSA"], rounds: ["DSA/coding", "Blockchain fundamentals", "Contract/security design", "Behavioral"], concepts: ["Consensus (PoW/PoS)", "Reentrancy & common exploits", "Gas & storage costs", "Merkle trees"], ladder: ["Engineer", "Blockchain Engineer", "Senior Blockchain", "Protocol Engineer", "Principal Engineer"] },
  "Robotics Engineer": { skills: ["C++/Python", "ROS", "Control systems", "Linear algebra", "Computer vision", "Sensors/SLAM", "Embedded", "Math"], rounds: ["Coding", "Controls & math", "Robotics systems", "Behavioral"], concepts: ["PID control", "Kinematics & transforms", "Kalman filters", "SLAM basics"], ladder: ["Engineer", "Robotics Engineer", "Senior Robotics", "Robotics Lead", "Principal Engineer"] },
  "Quant Engineer": { skills: ["Math/probability", "C++/Python", "Statistics", "Algorithms", "Finance basics", "Data structures", "Low-latency", "Modeling"], rounds: ["Brain teasers/probability", "Coding/DSA", "Math & stats", "Behavioral"], concepts: ["Probability & expected value", "Time-series stationarity", "Optimization basics", "Low-latency data structures"], ladder: ["Analyst", "Quant Engineer", "Senior Quant", "Quant Lead", "Head of Quant"] },
  "Research Scientist": { skills: ["Math (linear alg/prob)", "Deep learning", "Research methods", "Paper reading/writing", "PyTorch/JAX", "Experimentation", "Statistics", "Domain depth"], rounds: ["ML/DL depth", "Research discussion", "Coding", "Behavioral"], concepts: ["Optimization & backprop", "Reading & reproducing papers", "Experimental rigor", "Recent architectures"], ladder: ["Research Intern", "Research Engineer", "Research Scientist", "Senior RS", "Principal RS"] },
  "Startup Founder": { skills: ["Customer discovery", "MVP building", "Fundraising", "Go-to-market", "Hiring", "Finance/runway", "Storytelling", "Resilience"], rounds: ["Pitch", "Market/strategy", "Product/tech", "Investor Q&A"], concepts: ["Problem–solution fit", "Unit economics (CAC/LTV)", "Fundraising narrative", "Lean experiments"], ladder: ["Builder", "Founder (idea)", "Founder (traction)", "Founder (scale)", "CEO"] },
};
const TRACK_NAMES = Object.keys(TRACKS);

/* ---------- starter career intel feed seeds per category (always-on, never stale) ---------- */
const INTEL = [
  "Hiring signal: GenAI/LLM-app roles are the fastest-growing JD category in India in 2026 — RAG, agents, and MLOps appear in most postings.",
  "Pattern: product companies & GCCs decide AI offers on system design + behaviorals more than algorithm trivia. Drill those in the Rehearsal Room.",
  "Leverage: referrals convert ~10x better than cold applications. Build warm paths in Pursue before you mass-apply.",
  "Comp: most fresher AI-engineer offers cluster ₹8–18 LPA, with a ladder past ₹40 LPA in 4–5 years for engineers who own production systems.",
];

/* ============================================================================
   DERIVED ENGINES (pure functions over `career`) — the Career Intelligence brain
   ============================================================================ */
function activeTarget(c) { return c.targets.find((t) => t.id === c.activeTargetId) || c.targets[0] || null; }

function evidencedSkillNames(c) {
  const s = new Set();
  c.evidence.forEach((e) => (e.skills || []).forEach((k) => s.add(k)));
  c.skills.filter((sk) => (sk.level || 0) >= 2).forEach((sk) => s.add(sk.name));
  return s;
}
function recentMockAvg(c, target) {
  const ms = c.mocks.filter((m) => !target || m.targetId === target.id);
  if (!ms.length) return null;
  const last = ms.slice(-3);
  const vals = last.map((m) => { const v = Object.values(m.scores || {}); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });
  return vals.reduce((a, b) => a + b, 0) / vals.length; // 0..10
}
function computeReadiness(c, target) {
  if (!target) return { pct: 0, parts: {} };
  const track = TRACKS[target.track] || TRACKS["AI Engineer"];
  const ev = evidencedSkillNames(c);
  const covered = track.skills.filter((s) => ev.has(s)).length;
  const skillCov = covered / track.skills.length;                 // 0..1
  const evDepth = Math.min(1, c.evidence.length / 6);             // 0..1
  const mock = recentMockAvg(c, target); const mockN = mock == null ? 0 : mock / 10; // 0..1
  const prof = [c.profile.name, c.profile.experience, c.profile.focus].filter(Boolean).length / 3;
  const pct = Math.round(100 * (0.40 * skillCov + 0.15 * evDepth + 0.30 * mockN + 0.15 * prof));
  return { pct: Math.max(0, Math.min(100, pct)), parts: { skillCov, evDepth, mockN, prof, covered, total: track.skills.length, mock } };
}
function computeGap(c, target) {
  if (!target) return [];
  const track = TRACKS[target.track] || TRACKS["AI Engineer"];
  const ev = evidencedSkillNames(c);
  const weaknesses = new Set(c.mocks.flatMap((m) => m.weaknesses || []).map((w) => w.toLowerCase()));
  return track.skills.map((s) => {
    const have = ev.has(s);
    const flagged = [...weaknesses].some((w) => s.toLowerCase().includes(w) || w.includes(s.toLowerCase().split(" ")[0]));
    const fix = have ? "Backed by evidence" : flagged ? "Flagged in a mock — drill it" : "Add a project or pass a mock to evidence this";
    return { skill: s, have, flagged, fix };
  });
}
function rankOneThing(c) {
  const t = activeTarget(c);
  const r = computeReadiness(c, t);
  const gap = computeGap(c, t);
  const dueCards = c.learning.filter((l) => l.due <= todayISO()).length;
  const openWeak = c.mocks.flatMap((m) => m.weaknesses || []);
  const staleApplied = c.pursuits.filter((p) => p.stage === "Applied" && (!p.lastTouch || daysBetween(p.lastTouch, todayISO()) >= 4));
  const cands = [];
  if (!t) cands.push({ p: 100, label: "Set your first target role", sub: "Everything calibrates to a target.", view: "target", icon: Target });
  if (t && c.mocks.length === 0) cands.push({ p: 90, label: `Run your first mock for ${t.label}`, sub: "It's the fastest way to expose your real gaps.", view: "improve", sub2: "mock", icon: Mic });
  if (t && openWeak.length) cands.push({ p: 85, label: `Drill your weak spot: ${openWeak[openWeak.length - 1]}`, sub: "Closed-loop — a mock flagged this.", view: "improve", sub2: "spaced", icon: Repeat });
  const firstGap = gap.find((g) => !g.have);
  if (t && firstGap) cands.push({ p: 70, label: `Evidence "${firstGap.skill}"`, sub: "Your top unproven skill for this role.", view: "readiness", sub2: "evidence", icon: ShieldAlert });
  if (dueCards) cands.push({ p: 60, label: `Review ${dueCards} due concept${dueCards > 1 ? "s" : ""}`, sub: "Before they fade from memory.", view: "improve", sub2: "spaced", icon: Brain });
  if (staleApplied.length) cands.push({ p: 55, label: `Follow up with ${staleApplied[0].company}`, sub: "Applied with no follow-up in 4+ days.", view: "pursue", icon: Handshake });
  if (t && r.pct >= 65 && c.pursuits.length === 0) cands.push({ p: 50, label: "Open your first pursuit", sub: "You're ready enough — start pursuing real offers.", view: "pursue", icon: Briefcase });
  cands.push({ p: 10, label: "Add a project to your Evidence Locker", sub: "Proof beats claims in every interview.", view: "readiness", sub2: "evidence", icon: ShieldAlert });
  return cands.sort((a, b) => b.p - a.p)[0];
}
function momentum(c) {
  const W = { mock: 5, evidence: 4, apply: 4, gap: 4, learn: 2, target: 3, loss: 3, immerse: 2, negotiate: 3, resume: 2, warm: 3 };
  const now = Date.now();
  let score = 0;
  const days = Array(14).fill(0);
  c.events.forEach((e) => {
    const age = (now - new Date(e.ts).getTime()) / 864e5;
    if (age <= 14) { const w = W[e.type] || 1; score += w * Math.max(0, 1 - age / 18); const idx = 13 - Math.floor(age); if (idx >= 0 && idx < 14) days[idx] += w; }
  });
  return { score: Math.round(score), days, tokens: c.momentumTokens || 0 };
}
function timeToOffer(c, target) {
  const r = computeReadiness(c, target).pct;
  if (!target) return null;
  const remaining = Math.max(0, 100 - r);
  const m = momentum(c).score;
  const velocity = Math.max(0.4, m / 14);            // rough "readiness points / week" proxy
  const weeks = Math.max(1, Math.round(remaining / (velocity * 2.2)));
  return { weeks, readiness: r };
}
function calibration(c) {
  const ms = c.mocks.filter((m) => m.confidence != null && m.scores);
  if (!ms.length) return null;
  const gaps = ms.map((m) => { const v = Object.values(m.scores); const sc = v.reduce((a, b) => a + b, 0) / v.length; return m.confidence - sc; });
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { avg, n: ms.length, over: avg > 1.2, under: avg < -1.2 };
}
function buildFeed(c) {
  const t = activeTarget(c);
  const items = [];
  if (t) { const r = computeReadiness(c, t); const gap = computeGap(c, t).find((g) => !g.have); items.push({ icon: Gauge, text: `You're ${r.pct}% ready for ${t.label}${gap ? ` — top gap: ${gap.skill}` : ""}.` }); }
  const cal = calibration(c);
  if (cal) items.push({ icon: Activity, text: cal.over ? "Calibration: you rate yourself higher than you score. Trust the tape, not the feeling." : cal.under ? "Calibration: you under-rate yourself — you're more ready than you think. Apply." : "Calibration: your self-assessment tracks your scores well. Healthy." });
  const tt = timeToOffer(c, t);
  if (tt) items.push({ icon: Clock, text: `At your current pace, ~${tt.weeks} week${tt.weeks > 1 ? "s" : ""} from offer-ready. Doing today's One Thing shortens it.` });
  c.events.slice(-3).reverse().forEach((e) => items.push({ icon: History, text: e.text }));
  INTEL.forEach((i) => items.push({ icon: Lightbulb, text: i }));
  return items.slice(0, 8);
}

/* ============================================================================
   small UI atoms (Linear/Bloomberg-dense; no glass, no particles)
   ============================================================================ */
const Label = ({ children }) => <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-500">{children}</div>;
const Panel = ({ children, className = "", accent }) => (
  <div className={"rounded-lg border bg-white/[0.02] " + (accent ? "border-amber-400/25" : "border-white/10") + " " + className}>{children}</div>
);
const Btn = ({ children, onClick, variant = "ghost", className = "", disabled, size = "md" }) => {
  const base = "btn inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-40 ";
  const sz = size === "sm" ? "px-2.5 py-1 text-xs " : "px-3.5 py-2 text-sm ";
  const v = variant === "primary" ? "bg-amber-400 text-slate-950 hover:bg-amber-300 "
    : variant === "danger" ? "bg-red-500/15 text-red-300 border border-red-400/30 hover:bg-red-500/25 "
    : variant === "teal" ? "border border-teal-400/40 text-teal-300 hover:bg-teal-400/10 "
    : "border border-white/15 text-slate-300 hover:bg-white/5 ";
  return <button onClick={onClick} disabled={disabled} className={base + sz + v + className}>{children}</button>;
};
function useCountUp(target, dur = 800) {
  const [n, setN] = useState(0);
  useEffect(() => { let raf, s; const tick = (t) => { if (!s) s = t; const p = Math.min(1, (t - s) / dur); setN(Math.round(target * p)); if (p < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [target, dur]);
  return n;
}
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null); const [seen, setSeen] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.1 }); io.observe(el); return () => io.disconnect(); }, []);
  return <div ref={ref} className={"reveal " + (seen ? "in " : "") + className} style={{ transitionDelay: delay + "ms" }}>{children}</div>;
}
const Ring = ({ pct, size = 56, label }) => {
  const r = size / 2 - 5, C = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f5a524" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold text-amber-300 leading-none">{pct}%</span>
        {label && <span className="text-[8px] text-slate-500 mt-0.5">{label}</span>}
      </div>
    </div>
  );
};
const MOTION_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.os-root{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;letter-spacing:-0.011em}
.reveal{opacity:0;transform:translateY(10px);transition:opacity .5s ease,transform .5s ease}
.reveal.in{opacity:1;transform:none}
.tabfade{animation:tf .35s ease both}@keyframes tf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.btn:active{transform:scale(.98)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@keyframes dash{to{stroke-dashoffset:0}}
.gline{stroke-dasharray:5 5;stroke-dashoffset:90;animation:dash 2.2s ease forwards}.gnode{animation:pulse 2.6s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.reveal{opacity:1!important;transform:none!important}}
`;

/* trajectory ladder (per track) */
function Ladder({ track, stageIndex = 0 }) {
  const steps = (TRACKS[track] || TRACKS["AI Engineer"]).ladder;
  const H = 260, top = 18, gap = (H - 36) / (steps.length - 1);
  return (
    <svg viewBox={`0 0 240 ${H}`} className="w-full max-w-[240px]" aria-hidden="true">
      {steps.slice(0, -1).map((_, i) => <line key={i} x1="34" y1={top + i * gap} x2="34" y2={top + (i + 1) * gap} stroke="#f5a524" strokeWidth="2" className="gline" style={{ animationDelay: `${i * 0.25}s`, opacity: 0.5 }} />)}
      {steps.map((s, i) => { const y = top + i * gap, goal = i === steps.length - 1, here = i === stageIndex; const fill = goal ? "#f5a524" : here ? "#22d3ee" : "#64748b";
        return <g key={s}><circle cx="34" cy={y} r={goal || here ? 6 : 4.5} fill={fill} className="gnode" style={{ animationDelay: `${i * 0.2}s`, filter: goal ? "drop-shadow(0 0 5px #f5a524)" : here ? "drop-shadow(0 0 4px #22d3ee)" : "none" }} /><text x="48" y={y + 4} fill={goal ? "#fcd34d" : here ? "#7dd3fc" : "#94a3b8"} fontSize="11.5" fontWeight={goal || here ? 700 : 500}>{s}</text>{here && <text x="48" y={y + 16} fill="#22d3ee" fontSize="8" fontWeight="700">YOU ARE HERE</text>}{goal && <text x="48" y={y + 16} fill="#fcd34d" fontSize="8" fontWeight="700">THE GOAL</text>}</g>; })}
    </svg>
  );
}

/* ============================================================================
   DEFAULT STATE
   ============================================================================ */
const DEFAULT = {
  profile: { name: "", track: "AI Engineer", experience: "", focus: "", comp: "", workPref: "", resume: "", onboarded: false },
  targets: [], activeTargetId: null,
  skills: [], evidence: [], mocks: [], pursuits: [], learning: [], events: [],
  momentumTokens: 0, immersions: {},
};
const EXP = ["Student / final year", "0–1 yrs", "1–3 yrs", "3–5 yrs", "5+ yrs"];
const STAGE_IDX = { "Student / final year": 0, "0–1 yrs": 1, "1–3 yrs": 2, "3–5 yrs": 3, "5+ yrs": 4 };
const PURSUE_STAGES = ["Researching", "Applied", "Interviewing", "Offer", "Lost"];

/* ============================================================================
   ROOT
   ============================================================================ */
export default function CareerOS() {
  const [c, setC] = useState(DEFAULT);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("command");        // command | target | readiness | improve | pursue
  const [sub, setSub] = useState(null);                // section sub-tab
  const [toast, setToast] = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [palette, setPalette] = useState(false);
  const [focusMode, setFocusMode] = useState(null);    // {kind, payload}

  useEffect(() => { (async () => { const s = await loadState(null); if (s) setC({ ...DEFAULT, ...s }); setShowOnboard(!(s && s.profile && s.profile.onboarded)); setReady(true); })(); }, []);
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); } if (e.key === "Escape") { setPalette(false); setFocusMode(null); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ping = (m, bad = false) => { setToast({ m, bad }); setTimeout(() => setToast(null), 3200); };
  const commit = (mutator, ev) => setC((prev) => {
    const next = JSON.parse(JSON.stringify(prev));
    mutator(next);
    if (ev) next.events.push({ id: uid(), ts: new Date().toISOString(), type: ev.type, text: ev.text });
    // momentum tokens: 1 per distinct active day
    const today = todayISO();
    if (!next._lastActiveDay) next._lastActiveDay = today;
    if (next._lastActiveDay !== today) { next.momentumTokens = (next.momentumTokens || 0) + 1; next._lastActiveDay = today; }
    persist(next); return next;
  });

  const t = useMemo(() => activeTarget(c), [c]);
  const readiness = useMemo(() => computeReadiness(c, t), [c, t]);
  const gap = useMemo(() => computeGap(c, t), [c, t]);
  const oneThing = useMemo(() => rankOneThing(c), [c]);
  const mo = useMemo(() => momentum(c), [c]);
  const tt = useMemo(() => timeToOffer(c, t), [c, t]);
  const feed = useMemo(() => buildFeed(c), [c]);

  const go = (v, s = null) => { setView(v); setSub(s); setPalette(false); };

  if (!ready) return <div className="min-h-screen bg-[#0b0d12] flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2" size={18} />Booting your career OS…</div>;

  const NAV = [
    { id: "command", label: "Command", icon: Command },
    { id: "target", label: "Target", icon: Target },
    { id: "readiness", label: "Readiness", icon: Gauge },
    { id: "improve", label: "Improve", icon: GraduationCap },
    { id: "pursue", label: "Pursue", icon: Briefcase },
  ];

  return (
    <div className="os-root min-h-screen bg-[#0b0d12] text-slate-200">
      <style>{MOTION_CSS}</style>
      {toast && <div className={"fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-lg text-sm border shadow-xl " + (toast.bad ? "bg-red-950/90 border-red-500/40 text-red-200" : "bg-emerald-950/90 border-emerald-500/40 text-emerald-200")}>{toast.m}</div>}
      {showOnboard && <Onboarding initial={c.profile} onDone={(p) => { commit((n) => { n.profile = { ...n.profile, ...p, onboarded: true }; if (p.targetLabel) { const id = uid(); n.targets.push({ id, label: p.targetLabel, track: p.track, role: p.targetLabel, band: p.comp, company: "" }); n.activeTargetId = id; } }, { type: "target", text: `Set target: ${p.targetLabel || p.track}` }); setShowOnboard(false); ping("Your OS is calibrated"); }} onSkip={() => { commit((n) => { n.profile.onboarded = true; }); setShowOnboard(false); }} />}
      {palette && <Palette onClose={() => setPalette(false)} go={go} c={c} startMock={() => { go("improve", "mock"); }} />}
      {focusMode && <FocusOverlay payload={focusMode} onExit={() => setFocusMode(null)} />}

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row min-h-screen">
        {/* rail */}
        <aside className="md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-white/10 p-3 md:p-4 md:min-h-screen flex md:flex-col">
          <div className="px-1 pb-3 hidden md:block">
            <div className="font-mono text-[11px] tracking-[0.22em] text-amber-400">CAREER·OS</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{c.profile.name || "your"} growth OS</div>
          </div>
          <nav className="flex md:flex-col gap-1 flex-1">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} className={"flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors " + (view === n.id ? "bg-amber-400/15 text-amber-300 border border-amber-400/30" : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent")}>
                <n.icon size={16} /><span className="hidden md:inline font-medium">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="hidden md:block mt-4 pt-4 border-t border-white/10 space-y-2">
            <button onClick={() => setPalette(true)} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-white/10 text-xs text-slate-400 hover:text-slate-200">
              <span className="flex items-center gap-1.5"><Search size={12} />Quick actions</span><kbd className="font-mono text-[9px] text-slate-500">⌘K</kbd>
            </button>
            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="flex items-center gap-1.5 text-orange-300"><Flame size={12} />Momentum</span><span className="font-mono text-amber-300">{mo.score}</span>
            </div>
            <button onClick={() => setShowOnboard(true)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-500 hover:text-slate-300"><Settings size={12} />Preferences</button>
          </div>
        </aside>

        {/* main */}
        <main className="flex-1 p-4 md:p-7 min-w-0">
          {view === "command" && <CommandCenter {...{ c, t, readiness, gap, oneThing, mo, tt, feed, go, commit, ping, setFocusMode }} />}
          {view === "target" && <TargetView {...{ c, t, readiness, commit, ping, go }} />}
          {view === "readiness" && <ReadinessView {...{ c, t, readiness, gap, sub, commit, ping, go }} />}
          {view === "improve" && <ImproveView {...{ c, t, sub, commit, ping, go, setFocusMode }} />}
          {view === "pursue" && <PursueView {...{ c, t, commit, ping }} />}
        </main>
      </div>
    </div>
  );
}

/* ============================================================================
   COMMAND CENTER (home) — One Thing + Offer Distance + Momentum + Time-to-Offer
   + Career Intelligence Feed + Changelog. No vanity dashboard.
   ============================================================================ */
function CommandCenter({ c, t, readiness, gap, oneThing, mo, tt, feed, go, commit, ping, setFocusMode }) {
  const [showAll, setShowAll] = useState(false);
  const topGaps = gap.filter((g) => !g.have).slice(0, 3);
  return (
    <div className="tabfade space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><Label>{new Date().toDateString()}</Label><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 mt-0.5">Command Center</h1></div>
        {t && <div className="flex items-center gap-3"><div className="text-right"><div className="text-[11px] text-slate-500">Active target</div><div className="text-sm text-slate-200 font-medium">{t.label}</div></div><Ring pct={readiness.pct} label="ready" /></div>}
      </div>

      {/* THE ONE THING */}
      <Reveal>
        <Panel accent className="p-5">
          <Label>Your one thing today</Label>
          <div className="flex items-start justify-between gap-4 mt-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0"><oneThing.icon size={18} className="text-amber-300" /></div>
              <div><div className="text-lg font-semibold text-slate-50 leading-tight">{oneThing.label}</div><div className="text-sm text-slate-400 mt-0.5">{oneThing.sub}</div></div>
            </div>
            <Btn variant="primary" onClick={() => go(oneThing.view, oneThing.sub2 || null)}>Do it <ArrowRight size={15} /></Btn>
          </div>
          <button onClick={() => setShowAll((s) => !s)} className="text-[11px] text-slate-500 hover:text-slate-300 mt-3">{showAll ? "Hide" : "Show"} everything else</button>
          {showAll && <div className="mt-2 text-xs text-slate-400 grid sm:grid-cols-2 gap-1.5">{topGaps.map((g) => <button key={g.skill} onClick={() => go("readiness", "evidence")} className="text-left hover:text-amber-300">· Evidence "{g.skill}"</button>)}<button onClick={() => go("improve", "mock")} className="text-left hover:text-amber-300">· Run a mock interview</button><button onClick={() => go("pursue")} className="text-left hover:text-amber-300">· Work a pursuit</button></div>}
        </Panel>
      </Reveal>

      {/* metrics that are decisions, not vanity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Reveal delay={40}><MetricTile icon={Gauge} v={readiness.pct} suffix="%" label="offer readiness" hint={t ? `${readiness.parts.covered}/${readiness.parts.total} skills proven` : "set a target"} onClick={() => go("readiness")} /></Reveal>
        <Reveal delay={80}><MetricTile icon={Clock} v={tt ? tt.weeks : 0} suffix={tt ? "w" : ""} label="to offer-ready" hint={tt ? "estimate · move it down" : "—"} onClick={() => go("readiness")} /></Reveal>
        <Reveal delay={120}><MetricTile icon={Flame} v={mo.score} label="momentum" hint={`${mo.tokens} freeze tokens`} spark={mo.days} onClick={() => go("improve")} /></Reveal>
        <Reveal delay={160}><MetricTile icon={Repeat} v={c.mocks.length} label="rehearsals" hint={c.mocks.length ? "review the tape" : "none yet"} onClick={() => go("improve", "tape")} /></Reveal>
      </div>

      {/* feed + changelog */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Reveal><Panel className="p-5">
          <div className="flex items-center justify-between"><Label>Career intelligence</Label><Sparkles size={13} className="text-amber-300" /></div>
          <div className="mt-3 space-y-2.5">{feed.map((f, i) => <div key={i} className="flex gap-2.5 text-[13px] text-slate-300"><f.icon size={14} className="text-teal-300/80 mt-0.5 shrink-0" /><span>{f.text}</span></div>)}</div>
        </Panel></Reveal>
        <Reveal delay={60}><Panel className="p-5">
          <div className="flex items-center justify-between"><Label>Career changelog</Label><History size={13} className="text-slate-500" /></div>
          {c.events.length === 0 ? <div className="text-sm text-slate-500 mt-3">Your growth log is empty. Every mock, proof, and application writes a line here — the artifact you'll paste into a resume.</div> :
            <div className="mt-3 space-y-2">{[...c.events].reverse().slice(0, 8).map((e, i) => <div key={e.id} className="flex gap-2 text-[13px]"><span className="font-mono text-[10px] text-amber-400/70 mt-0.5 shrink-0">v0.{c.events.length - i}</span><span className="text-slate-300">{e.text}</span></div>)}</div>}
        </Panel></Reveal>
      </div>
    </div>
  );
}
function MetricTile({ icon: Icon, v, suffix = "", label, hint, spark, onClick }) {
  const n = useCountUp(v);
  return (
    <button onClick={onClick} className="text-left w-full rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/25 transition-colors p-4">
      <Icon size={15} className="text-amber-300 mb-2" />
      <div className="text-2xl font-semibold text-slate-50 tracking-tight">{n}{suffix}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-0.5">{label}</div>
      {spark && <div className="flex items-end gap-0.5 h-5 mt-2">{spark.map((d, i) => <div key={i} className="flex-1 bg-amber-400/40 rounded-sm" style={{ height: Math.max(2, Math.min(20, d * 3)) }} />)}</div>}
      {hint && !spark && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </button>
  );
}

/* ============================================================================
   TARGET — roles as commitments, offer distance, trajectory, role immersion
   ============================================================================ */
function TargetView({ c, t, readiness, commit, ping, go }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ label: "", track: c.profile.track || "AI Engineer", company: "", band: "" });
  const [immersing, setImmersing] = useState(false);
  const stageIndex = STAGE_IDX[c.profile.experience] ?? 0;
  const addTarget = () => { if (!f.label.trim()) return; commit((n) => { const id = uid(); n.targets.push({ id, label: f.label, track: f.track, company: f.company, band: f.band, role: f.label }); n.activeTargetId = id; }, { type: "target", text: `Set target: ${f.label}` }); setAdding(false); setF({ label: "", track: c.profile.track, company: "", band: "" }); ping("Target set — everything now calibrates to it"); };
  const immerse = async () => { if (!t) return; setImmersing(true); try { const txt = await callClaude([{ role: "user", content: `Write a vivid but realistic "a day in the life" of a ${t.label}${t.company ? " at " + t.company : ""}. 150 words. Cover: a real task they'd do, the tools/stack, the rituals (standups, reviews), and the hardest part. Plain prose, second person ("You...").` }]); commit((n) => { n.immersions[t.id] = txt; }, { type: "immerse", text: `Previewed a day as ${t.label}` }); } catch (e) { ping(e.message, true); } setImmersing(false); };
  return (
    <div className="tabfade space-y-6">
      <div><Label>Target · who am I becoming?</Label><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 mt-0.5">Your targets</h1></div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {c.targets.length === 0 && <Panel className="p-6 text-center text-sm text-slate-500">No target yet. Commit to one role — the whole OS calibrates to it.</Panel>}
          {c.targets.map((tg) => { const r = computeReadiness(c, tg); const isA = tg.id === c.activeTargetId;
            return <Panel key={tg.id} accent={isA} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><Ring pct={r.pct} size={48} /><div><div className="text-sm font-semibold text-slate-100">{tg.label}</div><div className="text-xs text-slate-500">{[tg.company, tg.track, tg.band].filter(Boolean).join(" · ")}</div></div></div>
              <div className="flex gap-2">{!isA && <Btn size="sm" onClick={() => commit((n) => { n.activeTargetId = tg.id; })}>Make active</Btn>}<Btn size="sm" variant="danger" onClick={() => commit((n) => { n.targets = n.targets.filter((x) => x.id !== tg.id); if (n.activeTargetId === tg.id) n.activeTargetId = n.targets[0]?.id || null; })}><X size={13} /></Btn></div>
            </Panel>; })}
          {adding ? <Panel className="p-4 space-y-2">
            <input autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Role title (e.g. ML Engineer)" className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" />
            <div className="grid grid-cols-2 gap-2">
              <select value={f.track} onChange={(e) => setF({ ...f, track: e.target.value })} className="bg-black/40 border border-white/10 rounded-md px-2 py-2 text-sm outline-none">{TRACK_NAMES.map((tn) => <option key={tn}>{tn}</option>)}</select>
              <input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Company (optional)" className="bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" />
            </div>
            <input value={f.band} onChange={(e) => setF({ ...f, band: e.target.value })} placeholder="Target band (e.g. ₹18–30 LPA)" className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" />
            <div className="flex gap-2"><Btn variant="primary" size="sm" onClick={addTarget}>Add target</Btn><Btn size="sm" onClick={() => setAdding(false)}>Cancel</Btn></div>
          </Panel> : <Btn onClick={() => setAdding(true)}><Plus size={15} />Add a target role</Btn>}

          {/* role immersion */}
          {t && <Panel className="p-4">
            <div className="flex items-center justify-between"><Label>Role immersion · a day in the life</Label><Btn size="sm" variant="teal" onClick={immerse} disabled={immersing}>{immersing ? <Loader2 size={13} className="animate-spin" /> : <FocusIcon size={13} />}{c.immersions[t.id] ? "Regenerate" : "Preview the day"}</Btn></div>
            {c.immersions[t.id] ? <p className="text-[13px] text-slate-300 mt-3 leading-relaxed whitespace-pre-wrap">{c.immersions[t.id]}</p> : <p className="text-sm text-slate-500 mt-2">Before you chase the title, feel the actual work. (Needs your Gemini key set in the backend.)</p>}
          </Panel>}
        </div>
        <Panel className="p-4 h-fit"><Label>Your trajectory{t ? ` · ${t.track}` : ""}</Label><div className="flex justify-center mt-3"><Ladder track={t?.track || c.profile.track} stageIndex={stageIndex} /></div></Panel>
      </div>
    </div>
  );
}

/* ============================================================================
   READINESS — gap map, evidence locker, calibration, readiness engine
   ============================================================================ */
function ReadinessView({ c, t, readiness, gap, sub, commit, ping, go }) {
  const tab = sub || "gap";
  const cal = calibration(c);
  return (
    <div className="tabfade space-y-5">
      <div><Label>Readiness · what is stopping me?</Label><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 mt-0.5">Close the gap</h1></div>
      {!t && <Panel className="p-6 text-center text-sm text-slate-500">Set a target first — readiness is measured against a specific role. <button onClick={() => go("target")} className="text-amber-300 hover:underline">Go to Target →</button></Panel>}
      {t && <>
        <div className="flex gap-1.5 flex-wrap">{[["gap", "Gap Map"], ["evidence", "Evidence Locker"], ["calibration", "Calibration"], ["engine", "Readiness Engine"]].map(([k, l]) => <button key={k} onClick={() => go("readiness", k)} className={"px-3 py-1.5 rounded-full text-xs border " + (tab === k ? "bg-amber-400/15 border-amber-400/50 text-amber-200" : "border-white/15 text-slate-400 hover:text-slate-200")}>{l}</button>)}</div>

        {tab === "gap" && <div className="grid md:grid-cols-3 gap-3">
          {[["have", "Proven", gap.filter((g) => g.have)], ["gap", "Gaps", gap.filter((g) => !g.have && !g.flagged)], ["flag", "Flagged in mocks", gap.filter((g) => !g.have && g.flagged)]].map(([k, title, items]) => (
            <Panel key={k} className="p-4"><Label>{title} · {items.length}</Label><div className="mt-2 space-y-1.5">{items.length === 0 ? <div className="text-xs text-slate-600">—</div> : items.map((g) => <div key={g.skill} className="flex items-start gap-2 text-[13px]"><CircleDot size={12} className={(g.have ? "text-emerald-400" : g.flagged ? "text-red-400" : "text-slate-500") + " mt-0.5 shrink-0"} /><div><div className={g.have ? "text-slate-300" : "text-slate-200"}>{g.skill}</div>{!g.have && <button onClick={() => go("readiness", "evidence")} className="text-[11px] text-amber-300/80 hover:underline">{g.fix} →</button>}</div></div>)}</div></Panel>
          ))}
        </div>}

        {tab === "evidence" && <EvidenceLocker c={c} t={t} commit={commit} ping={ping} />}

        {tab === "calibration" && <Panel className="p-5">
          <Label>Confidence vs. competence</Label>
          {!cal ? <div className="text-sm text-slate-500 mt-2">Run mocks (with a confidence rating before each) and your calibration appears here. Interviews are lost on miscalibration.</div> :
            <div className="mt-3 space-y-2"><div className="text-sm text-slate-300">Across {cal.n} mock{cal.n > 1 ? "s" : ""}, your pre-mock confidence runs <span className={cal.over ? "text-red-300" : cal.under ? "text-amber-300" : "text-emerald-300"}>{cal.avg > 0 ? "+" : ""}{cal.avg.toFixed(1)}</span> vs your actual score.</div><div className="text-[13px] text-slate-400">{cal.over ? "You over-rate yourself — the gap is what interviewers find. Trust the tape." : cal.under ? "You under-rate yourself — you're more ready than you feel. Apply sooner." : "Well-calibrated — your self-read matches reality."}</div></div>}
        </Panel>}

        {tab === "engine" && <Panel className="p-5"><Label>How readiness is computed (no black box)</Label>
          <div className="mt-3 space-y-2 text-[13px]">
            {[["Skill coverage", readiness.parts.skillCov, "40%"], ["Evidence depth", readiness.parts.evDepth, "15%"], ["Mock performance", readiness.parts.mockN, "30%"], ["Profile signal", readiness.parts.prof, "15%"]].map(([l, v, w]) => (
              <div key={l} className="flex items-center gap-3"><span className="w-36 text-slate-400">{l}</span><div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: Math.round((v || 0) * 100) + "%" }} /></div><span className="font-mono text-[11px] text-slate-500 w-10 text-right">{w}</span></div>
            ))}
            <div className="pt-2 text-slate-300">Blended → <span className="text-amber-300 font-semibold">{readiness.pct}% ready</span> for {t.label}. Raise the lowest bar first.</div>
          </div>
        </Panel>}
      </>}
    </div>
  );
}
function EvidenceLocker({ c, t, commit, ping }) {
  const [f, setF] = useState({ title: "", type: "Project", url: "", skills: [] });
  const trackSkills = (TRACKS[t.track] || TRACKS["AI Engineer"]).skills;
  const toggle = (s) => setF((p) => ({ ...p, skills: p.skills.includes(s) ? p.skills.filter((x) => x !== s) : [...p, s] }));
  const add = () => { if (!f.title.trim()) return; commit((n) => { n.evidence.push({ id: uid(), ...f, date: todayISO() }); }, { type: "evidence", text: `Added evidence: ${f.title}` }); setF({ title: "", type: "Project", url: "", skills: [] }); ping("Evidence locked — readiness updated"); };
  return (
    <div className="space-y-3">
      <Panel className="p-4 space-y-2">
        <Label>Add proof (a claim is grey until it has a receipt)</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title (e.g. RAG chatbot over docs)" className="bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" />
          <div className="flex gap-2"><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="bg-black/40 border border-white/10 rounded-md px-2 py-2 text-sm outline-none">{["Project", "Repo", "Cert", "Mock pass", "Publication", "Work"].map((x) => <option key={x}>{x}</option>)}</select><input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="Link (optional)" className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" /></div>
        </div>
        <div className="flex flex-wrap gap-1.5">{trackSkills.map((s) => <button key={s} onClick={() => toggle(s)} className={"px-2 py-1 rounded-full text-[11px] border " + (f.skills.includes(s) ? "bg-teal-400/15 border-teal-400/50 text-teal-200" : "border-white/15 text-slate-400 hover:border-white/30")}>{s}</button>)}</div>
        <Btn variant="primary" size="sm" onClick={add}><Plus size={13} />Lock evidence</Btn>
      </Panel>
      <Panel className="p-4"><Label>Locker · {c.evidence.length}</Label>
        {c.evidence.length === 0 ? <div className="text-sm text-slate-500 mt-2">Empty. Each proof you add turns a gap into a strength.</div> :
          <div className="mt-2 space-y-2">{[...c.evidence].reverse().map((e) => <div key={e.id} className="flex items-start justify-between gap-2 text-[13px]"><div><span className="text-slate-200">{e.title}</span> <span className="font-mono text-[10px] text-teal-300/80">{e.type}</span><div className="text-[11px] text-slate-500">{(e.skills || []).join(" · ") || "no skills tagged"}{e.url ? " · linked" : ""}</div></div><button onClick={() => commit((n) => { n.evidence = n.evidence.filter((x) => x.id !== e.id); })} className="text-slate-600 hover:text-red-400"><X size={13} /></button></div>)}</div>}
      </Panel>
    </div>
  );
}

/* ============================================================================
   IMPROVE — mock + rehearsal tape + closed loop + spaced knowledge + focus +
   negotiation dojo + resume compiler
   ============================================================================ */
function ImproveView({ c, t, sub, commit, ping, go, setFocusMode }) {
  const tab = sub || "mock";
  return (
    <div className="tabfade space-y-5">
      <div><Label>Improve · how do I get better?</Label><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 mt-0.5">The training room</h1></div>
      <div className="flex gap-1.5 flex-wrap">{[["mock", "Mock + Tape"], ["spaced", "Spaced Knowledge"], ["loop", "Closed Loop"], ["negotiate", "Negotiation Dojo"], ["resume", "Resume Compiler"]].map(([k, l]) => <button key={k} onClick={() => go("improve", k)} className={"px-3 py-1.5 rounded-full text-xs border " + (tab === k ? "bg-amber-400/15 border-amber-400/50 text-amber-200" : "border-white/15 text-slate-400 hover:text-slate-200")}>{l}</button>)}</div>
      {tab === "mock" && <MockRoom c={c} t={t} commit={commit} ping={ping} setFocusMode={setFocusMode} />}
      {tab === "spaced" && <SpacedKnowledge c={c} t={t} commit={commit} ping={ping} setFocusMode={setFocusMode} />}
      {tab === "loop" && <ClosedLoop c={c} t={t} go={go} />}
      {tab === "negotiate" && <Negotiation c={c} t={t} commit={commit} ping={ping} />}
      {tab === "resume" && <ResumeCompiler c={c} t={t} commit={commit} ping={ping} />}
    </div>
  );
}

function MockRoom({ c, t, commit, ping, setFocusMode }) {
  const rounds = (TRACKS[t?.track] || TRACKS["AI Engineer"]).rounds;
  const [round, setRound] = useState(rounds[0]);
  const [conf, setConf] = useState(5);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [openTape, setOpenTape] = useState(null);
  const end = useRef(null);
  useEffect(() => { end.current && end.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  const sys = () => `You are a tough-but-fair ${round} interviewer for a ${t?.label || "role"}${t?.company ? " at " + t.company : ""}. Candidate: ${c.profile.experience || "early career"}, focus ${c.profile.focus || t?.track}. Calibrate to that level. Ask ONE question at a time, probe follow-ups, keep replies under 110 words. Do not reveal scores. Begin with a one-line greeting + first question.`;
  const start = async () => { if (!t) { ping("Set a target first", true); return; } setActive(true); setMsgs([]); setBusy(true); try { const r = await callClaude([{ role: "user", content: sys() }]); setMsgs([{ role: "_sys", content: sys() }, { role: "assistant", content: r }]); } catch (e) { ping(e.message, true); setActive(false); } setBusy(false); };
  const send = async () => { const m = input.trim(); if (!m || busy) return; const hist = msgs.map((x) => x.role === "_sys" ? { role: "user", content: x.content } : x); const next = [...msgs, { role: "user", content: m }]; setMsgs(next); setInput(""); setBusy(true); try { const r = await callClaude([...hist, { role: "user", content: m }]); setMsgs([...next, { role: "assistant", content: r }]); } catch (e) { ping(e.message, true); } setBusy(false); };
  const finish = async () => { if (msgs.length < 3) { ping("Answer at least one question first", true); return; } setBusy(true); try { const transcript = msgs.filter((x) => x.role !== "_sys").map((x) => (x.role === "assistant" ? "Q: " : "A: ") + x.content).join("\n"); const out = await callClaude([{ role: "user", content: `Score this ${round} mock for ${t.label}. TRANSCRIPT:\n${transcript}\nReturn ONLY JSON: {"scores":{"technical":1-10,"communication":1-10,"structure":1-10,"role_fit":1-10},"verdict":"Strong Hire|Hire|Lean Hire|No Hire","beats":[{"tag":"strong|hesitation|gap","note":"<8 words"}],"weaknesses":["1-3 short skill phrases to drill"],"fixes":["2 concrete fixes"]}` }]); const sc = extractJSON(out, "{", "}"); commit((n) => { n.mocks.push({ id: uid(), targetId: t.id, round, company: t.company || t.label, date: todayISO(), confidence: conf, scores: sc.scores, verdict: sc.verdict, beats: sc.beats || [], weaknesses: sc.weaknesses || [], fixes: sc.fixes || [], transcript }); (sc.weaknesses || []).forEach((w) => { if (!n.learning.some((l) => l.topic === w)) n.learning.push({ id: uid(), topic: w, track: t.track, source: "mock", due: todayISO(), ease: 2.3, interval: 0, reps: 0 }); }); if ((sc.verdict || "").includes("Hire") && !(sc.verdict || "").includes("No")) n.evidence.push({ id: uid(), title: `Passed ${round} mock`, type: "Mock pass", skills: [], date: todayISO() }); }, { type: "mock", text: `${round} mock for ${t.label} — ${sc.verdict}` }); setActive(false); setMsgs([]); ping(`Scored: ${sc.verdict}. Weaknesses wired into your loop.`); } catch (e) { ping("Scoring failed: " + e.message, true); } setBusy(false); };
  return (
    <div className="space-y-4">
      {!active ? <Panel className="p-5 space-y-3">
        <Label>Set up a rehearsal</Label>
        <div className="flex flex-wrap gap-1.5">{rounds.map((r) => <button key={r} onClick={() => setRound(r)} className={"px-3 py-1.5 rounded-full text-xs border " + (round === r ? "bg-teal-400/15 border-teal-400/50 text-teal-200" : "border-white/15 text-slate-400")}>{r}</button>)}</div>
        <div><div className="text-xs text-slate-400 mb-1">How ready do you feel for this round? <span className="text-amber-300 font-mono">{conf}/10</span> <span className="text-slate-600">(calibration check)</span></div><input type="range" min="1" max="10" value={conf} onChange={(e) => setConf(+e.target.value)} className="w-full accent-amber-400" /></div>
        <div className="flex gap-2"><Btn variant="primary" onClick={start} disabled={!t}><Mic size={15} />Start mock</Btn><Btn variant="teal" onClick={() => { setFocusMode({ kind: "Mock prep", mins: 25 }); }}><FocusIcon size={15} />Focus mode</Btn></div>
      </Panel> : <Panel className="flex flex-col h-[26rem]">
        <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between"><span className="text-sm"><span className="font-mono text-xs text-teal-300">{round}</span> · {t.label}</span><Btn size="sm" variant="danger" onClick={finish} disabled={busy}><Square size={11} />End + score</Btn></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{msgs.filter((m) => m.role !== "_sys").map((m, i) => <div key={i} className={"flex gap-2 " + (m.role === "user" ? "justify-end" : "")}>{m.role === "assistant" && <div className="w-6 h-6 rounded-full bg-teal-400/15 border border-teal-400/30 flex items-center justify-center shrink-0"><Bot size={12} className="text-teal-300" /></div>}<div className={"max-w-[82%] rounded-lg px-3 py-2 text-[13px] whitespace-pre-wrap " + (m.role === "user" ? "bg-amber-400/15 border border-amber-400/25 text-amber-50" : "bg-white/[0.04] border border-white/10 text-slate-200")}>{m.content}</div>{m.role === "user" && <div className="w-6 h-6 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0"><User size={12} className="text-amber-300" /></div>}</div>)}{busy && <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 size={14} className="animate-spin" />thinking…</div>}<div ref={end} /></div>
        <div className="p-3 border-t border-white/10 flex gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2} placeholder="Answer like it's real… (Enter to send)" className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm resize-none outline-none focus:border-amber-400/60" /><Btn variant="primary" onClick={send} disabled={busy || !input.trim()}><Send size={15} /></Btn></div>
      </Panel>}

      {/* Rehearsal Tape */}
      <Panel className="p-4"><Label>Rehearsal tape · review the film ({c.mocks.length})</Label>
        {c.mocks.length === 0 ? <div className="text-sm text-slate-500 mt-2">Your past mocks become reviewable tape — tagged beats, the moment you faltered, and a button to drill it.</div> :
          <div className="mt-2 space-y-2">{[...c.mocks].reverse().map((m) => <div key={m.id} className="border border-white/10 rounded-md"><button onClick={() => setOpenTape(openTape === m.id ? null : m.id)} className="w-full flex items-center justify-between p-3 text-left"><span className="text-[13px] text-slate-200">{m.round} · {m.company} <span className="text-[11px] text-slate-500">{m.date}</span></span><span className={"font-mono text-[11px] px-2 py-0.5 rounded " + ((m.verdict || "").includes("Hire") && !(m.verdict || "").includes("No") ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300")}>{m.verdict}</span></button>
            {openTape === m.id && <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2"><div className="grid grid-cols-4 gap-2">{Object.entries(m.scores || {}).map(([k, v]) => <div key={k} className="text-center"><div className="text-base font-semibold text-slate-100">{v}</div><div className="text-[9px] font-mono uppercase text-slate-500">{k}</div></div>)}</div>{(m.beats || []).length > 0 && <div className="space-y-1">{m.beats.map((b, i) => <div key={i} className="flex gap-2 text-[12px]"><span className={"font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0 h-fit " + (b.tag === "strong" ? "bg-emerald-400/15 text-emerald-300" : b.tag === "hesitation" ? "bg-amber-400/15 text-amber-300" : "bg-red-400/15 text-red-300")}>{b.tag}</span><span className="text-slate-300">{b.note}</span></div>)}</div>}{(m.fixes || []).length > 0 && <div className="text-[12px] text-slate-400">Fixes: {m.fixes.join(" · ")}</div>}</div>}
          </div>)}</div>}
      </Panel>
    </div>
  );
}

function SpacedKnowledge({ c, t, commit, ping, setFocusMode }) {
  const track = TRACKS[t?.track] || TRACKS["AI Engineer"];
  // seed concept cards for the track if none exist for it
  useEffect(() => { const have = new Set(c.learning.map((l) => l.topic)); const missing = track.concepts.filter((x) => !have.has(x)); if (missing.length) commit((n) => { missing.forEach((x) => n.learning.push({ id: uid(), topic: x, track: t?.track, source: "concept", due: todayISO(), ease: 2.3, interval: 0, reps: 0 })); }); }, [t?.track]);
  const due = c.learning.filter((l) => l.due <= todayISO());
  const [card, setCard] = useState(0);
  const grade = (q) => { const l = due[card]; commit((n) => { const item = n.learning.find((x) => x.id === l.id); if (!item) return; item.reps += 1; if (q === 0) { item.interval = 0; item.ease = Math.max(1.3, item.ease - 0.2); } else { item.interval = item.interval === 0 ? (q === 2 ? 4 : 1) : Math.round(item.interval * item.ease * (q === 2 ? 1.3 : 1)); item.ease = Math.min(3, item.ease + (q === 2 ? 0.1 : 0)); } const d = new Date(); d.setDate(d.getDate() + item.interval); item.due = d.toISOString().slice(0, 10); }, q === 0 ? null : { type: "learn", text: `Reviewed: ${l.topic}` }); setCard(0); };
  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex items-center justify-between"><Label>Due now · {due.length}</Label>{due.length > 0 && <Btn size="sm" variant="teal" onClick={() => setFocusMode({ kind: "Concept review", mins: 15 })}><FocusIcon size={13} />Focus</Btn>}</div>
        {due.length === 0 ? <div className="text-sm text-slate-500 mt-3">Nothing due — you're current. Cards resurface on a forgetting curve before your interviews. Weaknesses from mocks land here automatically.</div> :
          <div className="mt-3"><div className="text-base text-slate-100 font-medium">{due[card].topic}</div>{due[card].source === "mock" && <div className="text-[11px] text-red-300/80 mt-1">↳ flagged in a mock — closed loop</div>}<div className="flex gap-2 mt-4"><Btn size="sm" variant="danger" onClick={() => grade(0)}>Again</Btn><Btn size="sm" onClick={() => grade(1)}>Good</Btn><Btn size="sm" variant="teal" onClick={() => grade(2)}>Easy</Btn></div></div>}
      </Panel>
      <Panel className="p-4"><Label>All concepts · {c.learning.length}</Label><div className="mt-2 grid sm:grid-cols-2 gap-1.5">{c.learning.map((l) => <div key={l.id} className="flex items-center justify-between text-[12px]"><span className="text-slate-300">{l.topic}</span><span className="font-mono text-[10px] text-slate-500">due {l.due === todayISO() ? "now" : l.due.slice(5)}</span></div>)}</div></Panel>
    </div>
  );
}

function ClosedLoop({ c, t, go }) {
  const weaknesses = [...new Set(c.mocks.flatMap((m) => m.weaknesses || []))];
  const series = c.mocks.filter((m) => !t || m.targetId === t.id).map((m) => { const v = Object.values(m.scores || {}); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });
  return (
    <div className="space-y-4">
      <Panel className="p-5"><Label>The loop, made visible</Label><div className="mt-3 flex items-center gap-2 text-[12px] font-mono text-slate-400 flex-wrap">{["DIAGNOSE (mock)", "PRESCRIBE (cards)", "IMPROVE (review)", "VERIFY (re-mock)", "ADVANCE (evidence)"].map((s, i) => <React.Fragment key={s}><span className="px-2 py-1 rounded bg-white/5 border border-white/10">{s}</span>{i < 4 && <ArrowRight size={12} className="text-amber-400/60" />}</React.Fragment>)}</div></Panel>
      <div className="grid md:grid-cols-2 gap-4">
        <Panel className="p-5"><Label>Open weaknesses → drills</Label>{weaknesses.length === 0 ? <div className="text-sm text-slate-500 mt-2">No weaknesses logged yet. After a mock, what you fumbled lands here and in your spaced cards automatically.</div> : <div className="mt-2 space-y-1.5">{weaknesses.map((w) => <div key={w} className="flex items-center justify-between text-[13px]"><span className="text-slate-200">{w}</span><button onClick={() => go("improve", "spaced")} className="text-[11px] text-amber-300 hover:underline">drill →</button></div>)}</div>}</Panel>
        <Panel className="p-5"><Label>Improvement curve (mock avg)</Label>{series.length < 2 ? <div className="text-sm text-slate-500 mt-2">Two+ mocks and your trend line appears. This is the proof you're getting better — and a resume line.</div> : <div className="mt-3 flex items-end gap-1.5 h-24">{series.map((v, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1"><div className="w-full bg-amber-400/60 rounded-sm" style={{ height: Math.max(4, v * 9) }} /><span className="text-[9px] text-slate-500">{v.toFixed(1)}</span></div>)}</div>}</Panel>
      </div>
    </div>
  );
}

function Negotiation({ c, t, commit, ping }) {
  const [msgs, setMsgs] = useState([]); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false); const [active, setActive] = useState(false); const [lev, setLev] = useState(50);
  const end = useRef(null); useEffect(() => { end.current && end.current.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const sys = `You are a recruiter making a verbal job offer for a ${t?.label || "role"} at ${t?.band || "market"} comp. Role-play a realistic salary negotiation. Push back once or twice, but reward good tactics (anchoring, citing market data, asking for time, negotiating base+ESOP+joining bonus). Keep replies under 90 words. Start by making the offer.`;
  const start = async () => { if (!t) { ping("Set a target first", true); return; } setActive(true); setLev(50); setBusy(true); try { const r = await callClaude([{ role: "user", content: sys }]); setMsgs([{ role: "_sys", content: sys }, { role: "assistant", content: r }]); } catch (e) { ping(e.message, true); } setBusy(false); };
  const strong = /market|levels|glassdoor|base|esop|equity|joining|bonus|time to think|24 hours|competing offer|data|research/i;
  const send = async () => { const m = input.trim(); if (!m || busy) return; setLev((p) => Math.max(5, Math.min(95, p + (strong.test(m) ? 12 : -6)))); const hist = msgs.map((x) => x.role === "_sys" ? { role: "user", content: x.content } : x); const next = [...msgs, { role: "user", content: m }]; setMsgs(next); setInput(""); setBusy(true); try { const r = await callClaude([...hist, { role: "user", content: m }]); setMsgs([...next, { role: "assistant", content: r }]); } catch (e) { ping(e.message, true); } setBusy(false); };
  const finish = () => { commit((n) => { }, { type: "negotiate", text: `Practiced negotiation for ${t.label} (leverage ${lev})` }); setActive(false); setMsgs([]); ping(`Session logged · final leverage ${lev}/100`); };
  return (
    <div className="space-y-3">
      {!active ? <Panel className="p-5"><Label>Negotiation dojo</Label><p className="text-sm text-slate-400 mt-2">Practice the money conversation under pressure. A recruiter (AI) makes an offer; your tactics move a live leverage meter. Most people leave lakhs on the table because they never rehearse this. (Needs Gemini key.)</p><Btn variant="primary" className="mt-3" onClick={start} disabled={!t}><Handshake size={15} />Enter the dojo</Btn></Panel> :
        <Panel className="flex flex-col h-[24rem]">
          <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-3"><span className="text-sm flex-1">Recruiter call · {t.label}</span><div className="flex items-center gap-2"><span className="text-[10px] font-mono text-slate-500">LEVERAGE</span><div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden"><div className={"h-full rounded-full " + (lev > 60 ? "bg-emerald-400" : lev > 35 ? "bg-amber-400" : "bg-red-400")} style={{ width: lev + "%" }} /></div></div><Btn size="sm" variant="danger" onClick={finish}>End</Btn></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">{msgs.filter((m) => m.role !== "_sys").map((m, i) => <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "")}><div className={"max-w-[82%] rounded-lg px-3 py-2 text-[13px] whitespace-pre-wrap " + (m.role === "user" ? "bg-amber-400/15 border border-amber-400/25 text-amber-50" : "bg-white/[0.04] border border-white/10 text-slate-200")}>{m.content}</div></div>)}{busy && <div className="text-slate-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" />…</div>}<div ref={end} /></div>
          <div className="p-3 border-t border-white/10 flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Your move…" className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" /><Btn variant="primary" onClick={send} disabled={busy}><Send size={15} /></Btn></div>
        </Panel>}
    </div>
  );
}

function ResumeCompiler({ c, t, commit, ping }) {
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);
  const ev = c.evidence;
  const compile = async () => { if (!t) { ping("Set a target first", true); return; } if (!ev.length && !c.profile.resume) { ping("Add evidence or a base resume first", true); return; } setBusy(true); try { const evText = ev.map((e) => `- ${e.title} (${e.type}; skills: ${(e.skills || []).join(", ")})`).join("\n"); const txt = await callClaude([{ role: "user", content: `You are a resume compiler. Build resume bullets for a ${t.label}${t.company ? " at " + t.company : ""} target, using ONLY this evidence — never invent. Flag any role-required skill the candidate has NO evidence for.\nEXPERIENCE: ${c.profile.experience || "early career"}; FOCUS: ${c.profile.focus || t.track}\nBASE RESUME: ${c.profile.resume || "(none)"}\nEVIDENCE:\n${evText || "(none)"}\nROLE NEEDS: ${(TRACKS[t.track] || TRACKS["AI Engineer"]).skills.join(", ")}\nOutput: === HEADLINE === / === SUMMARY (3 lines) === / === EVIDENCE-BACKED BULLETS (5) === / === UNBACKED CLAIMS TO AVOID (skills with no evidence) === / === FASTEST PROOF TO ADD NEXT ===` }]); setOut(txt); commit((n) => { }, { type: "resume", text: `Compiled resume for ${t.label}` }); } catch (e) { ping(e.message, true); } setBusy(false); };
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between"><Label>Resume compiler · it won't let you claim what you can't back</Label><Btn size="sm" variant="primary" onClick={compile} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}Compile</Btn></div>
      <p className="text-sm text-slate-400 mt-2">Generated from your Evidence Locker ({ev.length} item{ev.length !== 1 ? "s" : ""}) against {t ? t.label : "your target"}. Unbacked claims get flagged, not written. (Needs Gemini key.)</p>
      {out && <pre className="whitespace-pre-wrap text-[13px] text-slate-200 bg-black/30 border border-white/10 rounded-md p-4 mt-3 max-h-[24rem] overflow-y-auto">{out}</pre>}
    </Panel>
  );
}

/* ============================================================================
   PURSUE — pursuits CRM + warm path + loss review + recruiter intel
   ============================================================================ */
function PursueView({ c, t, commit, ping }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ company: "", role: t?.label || "", band: "" });
  const [warm, setWarm] = useState({ company: "", name: "", relation: "" });
  const [warmOut, setWarmOut] = useState(""); const [warmBusy, setWarmBusy] = useState(false);
  const [intelBusy, setIntelBusy] = useState(null);
  const [lossFor, setLossFor] = useState(null);
  const add = () => { if (!f.company.trim()) return; commit((n) => { n.pursuits.push({ id: uid(), company: f.company, role: f.role, band: f.band, stage: "Researching", warmth: 1, note: "", lastTouch: todayISO() }); }, { type: "apply", text: `Opened pursuit: ${f.company}` }); setAdding(false); setF({ company: "", role: t?.label || "", band: "" }); ping("Pursuit opened"); };
  const move = (id, stage) => { commit((n) => { const p = n.pursuits.find((x) => x.id === id); if (p) { p.stage = stage; p.lastTouch = todayISO(); } }, { type: "apply", text: `${stage}: ${c.pursuits.find((x) => x.id === id)?.company}` }); if (stage === "Lost") setLossFor(id); };
  const intel = async (p) => { setIntelBusy(p.id); try { const txt = await callClaude([{ role: "user", content: `For a candidate interviewing at ${p.company} for ${p.role}: give 3 crisp bullets — (1) what they're known to test in interviews, (2) one recent company development worth mentioning, (3) one smart question to ask them. Be concise.` }], { useSearch: true }); commit((n) => { const x = n.pursuits.find((y) => y.id === p.id); if (x) { x.intel = txt; x.lastTouch = todayISO(); } }); } catch (e) { ping(e.message, true); } setIntelBusy(null); };
  const warmGen = async () => { if (!warm.company || !warm.name) { ping("Add a contact name + company", true); return; } setWarmBusy(true); try { const txt = await callClaude([{ role: "user", content: `Write a short, warm, non-cringe LinkedIn outreach message (under 80 words) from ${c.profile.name || "a candidate"} (a ${c.profile.experience || "early-career"} ${t?.track || "engineer"}) to ${warm.name}${warm.relation ? " (" + warm.relation + ")" : ""} at ${warm.company}, asking for a referral or a quick chat about ${t?.label || "roles"} there. Specific, humble, easy to say yes to.` }]); setWarmOut(txt); commit((n) => { }, { type: "warm", text: `Drafted warm intro to ${warm.name} @ ${warm.company}` }); } catch (e) { ping(e.message, true); } setWarmBusy(false); };
  return (
    <div className="tabfade space-y-5">
      <div><Label>Pursue · how do I get the offer?</Label><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 mt-0.5">Pursuits</h1><p className="text-sm text-slate-500 mt-1">Not a saved-jobs list — a personal pipeline. Each company is a relationship you cultivate.</p></div>

      {/* board */}
      <div className="grid md:grid-cols-5 gap-2">
        {PURSUE_STAGES.map((stage) => <div key={stage} className="space-y-2"><div className="flex items-center justify-between px-1"><span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{stage}</span><span className="text-[10px] text-slate-600">{c.pursuits.filter((p) => p.stage === stage).length}</span></div>
          {c.pursuits.filter((p) => p.stage === stage).map((p) => <Panel key={p.id} className="p-2.5 space-y-1.5">
            <div className="flex items-start justify-between gap-1"><div><div className="text-[13px] text-slate-100 font-medium leading-tight">{p.company}</div><div className="text-[11px] text-slate-500">{p.role}</div></div><button onClick={() => commit((n) => { n.pursuits = n.pursuits.filter((x) => x.id !== p.id); })} className="text-slate-600 hover:text-red-400"><X size={12} /></button></div>
            {p.intel && <div className="text-[11px] text-slate-400 border-l-2 border-teal-400/40 pl-2 whitespace-pre-wrap">{p.intel}</div>}
            <div className="flex flex-wrap gap-1">
              <select value={p.stage} onChange={(e) => move(p.id, e.target.value)} className="bg-black/40 border border-white/10 rounded text-[10px] px-1 py-0.5 outline-none text-slate-300">{PURSUE_STAGES.map((s) => <option key={s}>{s}</option>)}</select>
              <button onClick={() => intel(p)} disabled={intelBusy === p.id} className="text-[10px] px-1.5 py-0.5 rounded border border-teal-400/30 text-teal-300 hover:bg-teal-400/10">{intelBusy === p.id ? "…" : "Intel"}</button>
            </div>
          </Panel>)}
        </div>)}
      </div>
      {adding ? <Panel className="p-4 space-y-2"><div className="grid sm:grid-cols-3 gap-2"><input autoFocus value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Company" className="bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" /><input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Role" className="bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" /><input value={f.band} onChange={(e) => setF({ ...f, band: e.target.value })} placeholder="Band (optional)" className="bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60" /></div><div className="flex gap-2"><Btn variant="primary" size="sm" onClick={add}>Open pursuit</Btn><Btn size="sm" onClick={() => setAdding(false)}>Cancel</Btn></div></Panel> : <Btn onClick={() => setAdding(true)}><Plus size={15} />Open a pursuit</Btn>}

      <div className="grid md:grid-cols-2 gap-4">
        {/* warm path */}
        <Panel className="p-5"><Label>Warm path finder</Label><p className="text-[13px] text-slate-400 mt-1">Referrals convert ~10× cold applications. Add a contact; get a message that's easy to say yes to.</p>
          <div className="grid grid-cols-3 gap-2 mt-3"><input value={warm.name} onChange={(e) => setWarm({ ...warm, name: e.target.value })} placeholder="Contact" className="bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs outline-none focus:border-amber-400/60" /><input value={warm.company} onChange={(e) => setWarm({ ...warm, company: e.target.value })} placeholder="Company" className="bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs outline-none focus:border-amber-400/60" /><input value={warm.relation} onChange={(e) => setWarm({ ...warm, relation: e.target.value })} placeholder="How you know them" className="bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs outline-none focus:border-amber-400/60" /></div>
          <Btn size="sm" variant="teal" className="mt-2" onClick={warmGen} disabled={warmBusy}>{warmBusy ? <Loader2 size={13} className="animate-spin" /> : <Handshake size={13} />}Draft outreach</Btn>
          {warmOut && <pre className="whitespace-pre-wrap text-[12px] text-slate-200 bg-black/30 border border-white/10 rounded-md p-3 mt-2">{warmOut}</pre>}
        </Panel>
        {/* loss reviews */}
        <Panel className="p-5"><Label>Loss reviews · turn rejection into data</Label>
          {c.pursuits.filter((p) => p.stage === "Lost").length === 0 ? <p className="text-[13px] text-slate-400 mt-1">When a pursuit is marked Lost, run a 30-second autopsy. The lesson feeds back into your gap map — rejection compounds instead of demoralizing.</p> :
            <div className="mt-2 space-y-2">{c.pursuits.filter((p) => p.stage === "Lost").map((p) => <div key={p.id} className="text-[13px]"><div className="flex items-center justify-between"><span className="text-slate-200">{p.company}</span>{!p.lossReview && <button onClick={() => setLossFor(p.id)} className="text-[11px] text-amber-300 hover:underline">review →</button>}</div>{p.lossReview && <div className="text-[11px] text-slate-500">Lesson: {p.lossReview.reason} — {p.lossReview.note}</div>}</div>)}</div>}
        </Panel>
      </div>

      {lossFor && <LossReview onClose={() => setLossFor(null)} onSave={(r) => { commit((n) => { const p = n.pursuits.find((x) => x.id === lossFor); if (p) p.lossReview = r; }, { type: "loss", text: `Loss review: ${r.reason}` }); setLossFor(null); ping("Lesson captured & fed into your gap map"); }} />}
    </div>
  );
}
function LossReview({ onClose, onSave }) {
  const [reason, setReason] = useState(""); const [note, setNote] = useState("");
  const reasons = ["Skill gap", "Culture/role fit", "Interview performance", "Timing / role closed", "Comp mismatch", "Don't know"];
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"><Panel className="p-5 w-full max-w-md bg-[#0b0d12]"><Label>Loss review</Label><p className="text-sm text-slate-400 mt-1">What was the real reason? No spiraling — just the lesson.</p><div className="flex flex-wrap gap-1.5 mt-3">{reasons.map((r) => <button key={r} onClick={() => setReason(r)} className={"px-2.5 py-1 rounded-full text-xs border " + (reason === r ? "bg-amber-400/15 border-amber-400/50 text-amber-200" : "border-white/15 text-slate-400")}>{r}</button>)}</div><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="One concrete thing to change next time" className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-amber-400/60 mt-3" /><div className="flex gap-2 mt-3"><Btn variant="primary" size="sm" onClick={() => reason && onSave({ reason, note })} disabled={!reason}>Capture lesson</Btn><Btn size="sm" onClick={onClose}>Cancel</Btn></div></Panel></div>;
}

/* ============================================================================
   COMMAND PALETTE (⌘K)
   ============================================================================ */
function Palette({ onClose, go, c, startMock }) {
  const [q, setQ] = useState("");
  const actions = [
    { label: "Go to Command Center", run: () => go("command"), icon: Command },
    { label: "Set / change target role", run: () => go("target"), icon: Target },
    { label: "Open Gap Map", run: () => go("readiness", "gap"), icon: MapIcon },
    { label: "Add evidence to locker", run: () => go("readiness", "evidence"), icon: ShieldAlert },
    { label: "Start a mock interview", run: startMock, icon: Mic },
    { label: "Review the rehearsal tape", run: () => go("improve", "tape"), icon: Repeat },
    { label: "Review due concepts (spaced)", run: () => go("improve", "spaced"), icon: Brain },
    { label: "Enter the Negotiation Dojo", run: () => go("improve", "negotiate"), icon: Handshake },
    { label: "Compile my resume", run: () => go("improve", "resume"), icon: FileText },
    { label: "Open Pursuits", run: () => go("pursue"), icon: Briefcase },
    { label: "See my Closed Loop", run: () => go("improve", "loop"), icon: Repeat },
  ];
  const f = actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));
  return <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4 bg-black/60" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl border border-white/15 bg-[#11141b] overflow-hidden shadow-2xl">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10"><Search size={16} className="text-slate-500" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Run a command…" className="flex-1 bg-transparent text-sm outline-none" /><kbd className="font-mono text-[9px] text-slate-600">esc</kbd></div>
    <div className="max-h-80 overflow-y-auto py-1">{f.map((a, i) => <button key={i} onClick={() => { a.run(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-amber-400/10 hover:text-amber-200 text-left"><a.icon size={15} className="text-slate-500" />{a.label}</button>)}{f.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-600">No matching command</div>}</div>
  </div></div>;
}

/* ============================================================================
   FOCUS MODE
   ============================================================================ */
function FocusOverlay({ payload, onExit }) {
  const [sec, setSec] = useState((payload.mins || 25) * 60);
  useEffect(() => { const id = setInterval(() => setSec((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(id); }, []);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  return <div className="fixed inset-0 z-[80] bg-[#07090d] flex flex-col items-center justify-center"><Label>{payload.kind} · single-task, no noise</Label><div className="text-7xl font-semibold text-slate-100 tabular-nums mt-4 tracking-tight">{mm}:{ss}</div><p className="text-sm text-slate-500 mt-4 max-w-sm text-center">Everything else is hidden on purpose. Do the one thing. The rest of CareerOS will be here when you're done.</p><Btn className="mt-8" onClick={onExit}><X size={15} />Exit focus</Btn></div>;
}

/* ============================================================================
   ONBOARDING
   ============================================================================ */
function Onboarding({ initial, onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState({ name: initial.name || "", track: initial.track || "AI Engineer", experience: initial.experience || "", focus: initial.focus || "", comp: initial.comp || "", workPref: initial.workPref || "", targetLabel: "" });
  const steps = [
    { key: "name", title: "What should we call you?", sub: "Personalizes your whole OS.", type: "text", ph: "Your name" },
    { key: "track", title: "Which career are you building?", sub: "Drives your skills, interviews, and prep — not just AI.", type: "chips", opts: TRACK_NAMES },
    { key: "experience", title: "Where are you now?", sub: "Calibrates interview difficulty.", type: "chips", opts: EXP },
    { key: "targetLabel", title: "Name your target role", sub: "The one thing everything calibrates to.", type: "text", ph: "e.g. ML Engineer at a product company" },
    { key: "comp", title: "Target band? (optional)", sub: "Used in negotiation + matching.", type: "text", ph: "e.g. ₹18–30 LPA" },
  ];
  const cur = steps[step]; const val = v[cur.key]; const can = cur.type === "text" ? (cur.key === "comp" ? true : !!val.trim()) : !!val;
  const set = (x) => setV((p) => ({ ...p, [cur.key]: x }));
  const next = () => { if (step < steps.length - 1) setStep(step + 1); else onDone(v); };
  return <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75"><div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#11141b] p-6 tabfade">
    <div className="flex gap-1.5 mb-5">{steps.map((_, i) => <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? "#f5a524" : "rgba(255,255,255,0.12)" }} />)}</div>
    <Label>Step {step + 1} of {steps.length}</Label>
    <h2 className="text-xl font-semibold text-slate-50 mt-1">{cur.title}</h2><p className="text-sm text-slate-400 mt-1 mb-4">{cur.sub}</p>
    {cur.type === "text" ? <input autoFocus value={val} onChange={(e) => set(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && can) next(); }} placeholder={cur.ph} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-400/60" /> :
      <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">{cur.opts.map((o) => <button key={o} onClick={() => set(o)} className={"px-3 py-2 rounded-lg text-sm border text-left " + (val === o ? "bg-amber-400/15 border-amber-400/50 text-amber-200" : "border-white/15 text-slate-300 hover:border-white/30")}>{o}</button>)}</div>}
    <div className="flex items-center justify-between mt-6"><button onClick={step === 0 ? onSkip : () => setStep((s) => s - 1)} className="text-xs text-slate-500 hover:text-slate-300">{step === 0 ? "Skip" : "← Back"}</button><Btn variant="primary" onClick={next} disabled={!can}>{step === steps.length - 1 ? "Launch OS →" : "Next →"}</Btn></div>
  </div></div>;
}