// engine.js — the pure career-intelligence engine.
// Extracted verbatim from CareerOS.jsx so this logic (readiness, gap map,
// momentum, time-to-offer, calibration) can be unit-tested without React.
// No React/DOM/lucide imports live here on purpose.

export const uid = () => Math.random().toString(36).slice(2, 9);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

export function extractJSON(text, open, close) {
  const c = text.replace(/```json|```/g, "").trim();
  const a = c.indexOf(open), b = c.lastIndexOf(close);
  if (a === -1 || b === -1) throw new Error("no JSON in response");
  return JSON.parse(c.slice(a, b + 1));
}

export const TRACKS = {
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

export const TRACK_NAMES = Object.keys(TRACKS);

export function activeTarget(c) { return c.targets.find((t) => t.id === c.activeTargetId) || c.targets[0] || null; }

export function evidencedSkillNames(c) {
  const s = new Set();
  c.evidence.forEach((e) => (e.skills || []).forEach((k) => s.add(k)));
  c.skills.filter((sk) => (sk.level || 0) >= 2).forEach((sk) => s.add(sk.name));
  return s;
}

export function recentMockAvg(c, target) {
  const ms = c.mocks.filter((m) => !target || m.targetId === target.id);
  if (!ms.length) return null;
  const last = ms.slice(-3);
  const vals = last.map((m) => { const v = Object.values(m.scores || {}); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });
  return vals.reduce((a, b) => a + b, 0) / vals.length; // 0..10
}

export function computeReadiness(c, target) {
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

export function computeGap(c, target) {
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

export function momentum(c) {
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

export function timeToOffer(c, target) {
  const r = computeReadiness(c, target).pct;
  if (!target) return null;
  const remaining = Math.max(0, 100 - r);
  const m = momentum(c).score;
  const velocity = Math.max(0.4, m / 14);            // rough "readiness points / week" proxy
  const weeks = Math.max(1, Math.round(remaining / (velocity * 2.2)));
  return { weeks, readiness: r };
}

export function calibration(c) {
  const ms = c.mocks.filter((m) => m.confidence != null && m.scores);
  if (!ms.length) return null;
  const gaps = ms.map((m) => { const v = Object.values(m.scores); const sc = v.reduce((a, b) => a + b, 0) / v.length; return m.confidence - sc; });
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { avg, n: ms.length, over: avg > 1.2, under: avg < -1.2 };
}
