import { useEffect } from "react";
import { Link } from "react-router-dom";

/* CareerOS landing — now a real route inside the app (was a standalone file).
   GSAP + ScrollTrigger + Lenis load from CDN at runtime; if they fail, the page
   degrades to static content with native scroll. "Enter CareerOS" uses the
   router (<Link to="/app">) instead of a hardcoded localhost URL. */

const CSS = `
.os-land{--bg:#06070a;--ink:#f4f5f7;--mut:#8a909c;--dim:#5b616d;--amber:#f5a524;--teal:#22d3ee;--line:rgba(255,255,255,0.09);
  background:var(--bg);color:var(--ink);font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;letter-spacing:-0.02em;overflow-x:hidden;position:relative}
.os-land *{margin:0;padding:0;box-sizing:border-box}
.os-land::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0.035;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.os-land .wrap{max-width:1100px;margin:0 auto;padding:0 28px}
.os-land .lbtn{display:inline-flex;align-items:center;gap:9px;padding:14px 26px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;border:1px solid transparent;transition:transform .25s cubic-bezier(.2,.7,.2,1),background .2s,border-color .2s;will-change:transform}
.os-land .lbtn.solid{background:var(--amber);color:#0a0a0a}.os-land .lbtn.solid:hover{background:#ffc04d}
.os-land .lbtn.ghost{border-color:var(--line);color:var(--ink)}.os-land .lbtn.ghost:hover{border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.03)}
.os-land .mi{display:inline-flex;align-items:center;gap:9px;will-change:transform;transition:transform .2s cubic-bezier(.2,.7,.2,1)}
.os-land nav{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:18px 28px;backdrop-filter:blur(8px);background:linear-gradient(to bottom,rgba(6,7,10,0.7),transparent)}
.os-land nav .brand{font-family:ui-monospace,monospace;font-size:13px;letter-spacing:0.22em;color:var(--amber)}
.os-land nav .nlinks{display:flex;gap:26px;font-size:13px;color:var(--mut)}
.os-land nav .nlinks a{color:inherit;text-decoration:none;transition:color .2s}.os-land nav .nlinks a:hover{color:var(--ink)}
@media(max-width:680px){.os-land nav .nlinks{display:none}}
.os-land #hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;position:relative}
.os-land #hero .glow{position:absolute;width:60vw;height:60vw;max-width:760px;max-height:760px;border-radius:50%;background:radial-gradient(circle,rgba(245,165,36,0.16),transparent 62%);filter:blur(40px);top:8%;z-index:0}
.os-land #hero .glow.t{background:radial-gradient(circle,rgba(34,211,238,0.12),transparent 62%);bottom:6%;top:auto;left:8%}
.os-land #hero h1{font-size:clamp(44px,9vw,108px);line-height:0.96;font-weight:800;letter-spacing:-0.04em;position:relative;z-index:1}
.os-land #hero h1 .l2{background:linear-gradient(120deg,var(--amber),#ffd98a);-webkit-background-clip:text;background-clip:text;color:transparent}
.os-land #hero p.sub{margin-top:26px;max-width:540px;font-size:clamp(16px,2.2vw,19px);color:var(--mut);line-height:1.5;position:relative;z-index:1}
.os-land #hero .cta{margin-top:40px;display:flex;gap:14px;position:relative;z-index:1;flex-wrap:wrap;justify-content:center}
.os-land .scrollcue{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);z-index:1;font-size:11px;letter-spacing:0.2em;color:var(--dim);text-transform:uppercase}
.os-land .scrollcue .dot{width:5px;height:5px;border-radius:50%;background:var(--amber);margin:8px auto 0;animation:bob 1.6s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(8px);opacity:.4}}
.os-land .editorial{padding:34vh 0}
.os-land .editorial .line{font-size:clamp(28px,5.2vw,60px);font-weight:700;line-height:1.08;letter-spacing:-0.03em;max-width:900px}
.os-land .editorial .line .dimx{color:var(--dim)}.os-land .editorial .line .hl{color:var(--amber)}
.os-land #journey{height:100vh;display:flex;align-items:center;overflow:hidden}
.os-land #journey .jhead{position:absolute;top:14vh;left:0;right:0;text-align:center;z-index:3}
.os-land #journey .jhead h2{font-size:clamp(26px,4vw,44px);font-weight:800;letter-spacing:-0.03em}
.os-land #journey .jhead p{color:var(--mut);margin-top:8px;font-size:15px}
.os-land .jsvg{width:100%;max-width:760px;margin:0 auto;display:block;overflow:visible}
.os-land .jnode .role{font-weight:700;font-size:17px;fill:var(--ink)}.os-land .jnode .tag{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.12em}
.os-land .grid-sec{padding:18vh 0}
.os-land .sec-h{font-size:clamp(24px,4vw,40px);font-weight:800;letter-spacing:-0.03em;margin-bottom:8px}
.os-land .sec-p{color:var(--mut);font-size:15px;margin-bottom:48px;max-width:560px}
.os-land .skilltree{display:flex;flex-wrap:wrap;gap:14px;max-width:820px}
.os-land .skillchip{padding:12px 18px;border:1px solid var(--line);border-radius:14px;font-size:15px;color:var(--ink);background:rgba(255,255,255,0.02)}
.os-land .skillchip.core{border-color:rgba(245,165,36,0.4);color:var(--amber)}
.os-land .timeline{position:relative;max-width:680px;margin-top:10px}
.os-land .tl-line{position:absolute;left:13px;top:6px;bottom:6px;width:2px;background:linear-gradient(to bottom,var(--amber),rgba(245,165,36,0.1));transform-origin:top}
.os-land .milestone{display:flex;align-items:baseline;gap:24px;padding:22px 0;position:relative}
.os-land .milestone .dot{position:absolute;left:7px;top:30px;width:14px;height:14px;border-radius:50%;background:var(--bg);border:2px solid var(--amber)}
.os-land .milestone .fig{font-size:clamp(30px,5vw,52px);font-weight:800;letter-spacing:-0.03em;min-width:150px;padding-left:46px}
.os-land .milestone .meta{color:var(--mut);font-size:14px;line-height:1.4}.os-land .milestone .meta b{color:var(--ink);font-weight:600;display:block;font-size:16px}
.os-land #destinations{padding:18vh 0;overflow:hidden}
.os-land .dest-row{display:flex;gap:28px;font-size:clamp(30px,6vw,68px);font-weight:800;letter-spacing:-0.04em;white-space:nowrap;color:var(--dim)}
.os-land .dest-row .on{color:var(--ink)}
.os-land .dest-row.a{margin-left:-6vw}.os-land .dest-row.b{margin-left:-20vw;color:rgba(255,255,255,0.08)}
.os-land #loop{padding:20vh 0;text-align:center}
.os-land .loop-steps{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:40px}
.os-land .loop-step{padding:14px 22px;border:1px solid var(--line);border-radius:12px;font-weight:600;font-size:15px;background:rgba(255,255,255,0.02)}
.os-land .loop-step .n{font-family:ui-monospace,monospace;font-size:10px;color:var(--amber);display:block;margin-bottom:4px}
.os-land .loop-arrow{color:rgba(245,165,36,0.5)}
.os-land #app-cta{min-height:92vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative}
.os-land #app-cta .glow{position:absolute;width:55vw;height:55vw;max-width:680px;max-height:680px;border-radius:50%;background:radial-gradient(circle,rgba(245,165,36,0.14),transparent 62%);filter:blur(50px)}
.os-land #app-cta h2{font-size:clamp(38px,8vw,92px);font-weight:800;line-height:0.98;letter-spacing:-0.04em;position:relative;z-index:1;max-width:900px}
.os-land #app-cta p{color:var(--mut);margin-top:22px;font-size:18px;position:relative;z-index:1}
.os-land footer{padding:60px 28px;text-align:center;color:var(--dim);font-size:13px;border-top:1px solid var(--line)}
.os-land.nomo .reveal{opacity:1!important;transform:none!important}
`;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
  });
}

export default function Landing() {
  useEffect(() => {
    const root = document.querySelector(".os-land");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // magnetic buttons (works regardless of GSAP)
    const magCleanups = [];
    if (!reduce) {
      document.querySelectorAll(".os-land [data-magnetic]").forEach((btn) => {
        const inner = btn.querySelector(".mi") || btn;
        const move = (e) => { const r = btn.getBoundingClientRect(); const x = e.clientX - r.left - r.width / 2; const y = e.clientY - r.top - r.height / 2; btn.style.transform = `translate(${x * 0.25}px,${y * 0.4}px)`; inner.style.transform = `translate(${x * 0.12}px,${y * 0.2}px)`; };
        const leave = () => { btn.style.transform = ""; inner.style.transform = ""; };
        btn.addEventListener("mousemove", move); btn.addEventListener("mouseleave", leave);
        magCleanups.push(() => { btn.removeEventListener("mousemove", move); btn.removeEventListener("mouseleave", leave); });
      });
    }

    let killed = false;
    let lenis;
    (async () => {
      if (reduce) { root && root.classList.add("nomo"); return; }
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/lenis/1.1.14/lenis.min.js");
        if (killed || !window.gsap || !window.ScrollTrigger) { root && root.classList.add("nomo"); return; }
        const { gsap, ScrollTrigger } = window;
        gsap.registerPlugin(ScrollTrigger);

        if (window.Lenis) { lenis = new window.Lenis({ duration: 1.1, smoothWheel: true }); lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }

        gsap.set(".os-land #hero .reveal", { opacity: 0, y: 26 });
        gsap.to(".os-land #hero .reveal", { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.12, delay: 0.1 });
        gsap.to(".os-land #hero .glow", { scale: 1.12, opacity: 0.8, duration: 6, yoyo: true, repeat: -1, ease: "sine.inOut" });

        gsap.utils.toArray(".os-land .reveal").forEach((el) => { if (el.closest("#hero")) return; gsap.fromTo(el, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } }); });

        const path = document.getElementById("journeyPath");
        if (path) {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          const nodes = gsap.utils.toArray(".os-land #jsvg .jnode");
          gsap.set(nodes, { opacity: 0, scale: 0.4, transformOrigin: "center" });
          const tl = gsap.timeline({ scrollTrigger: { trigger: ".os-land #journey", start: "top top", end: "+=2200", scrub: 1, pin: true, anticipatePin: 1 } });
          tl.to(path, { strokeDashoffset: 0, ease: "none", duration: 5 }, 0);
          nodes.forEach((n, i) => tl.to(n, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, i * 0.9));
        }

        const line = document.getElementById("tlLine");
        if (line) gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".os-land .timeline", start: "top 70%", end: "bottom 70%", scrub: true } });
        document.querySelectorAll(".os-land .milestone .fig").forEach((fig) => {
          const target = parseInt(fig.getAttribute("data-fig"), 10); const plus = fig.getAttribute("data-plus") ? "+" : ""; const obj = { v: 0 };
          ScrollTrigger.create({ trigger: fig, start: "top 88%", once: true, onEnter: () => gsap.to(obj, { v: target, duration: 1.3, ease: "power2.out", onUpdate: () => { fig.textContent = "₹" + Math.round(obj.v) + "L" + plus; } }) });
        });

        gsap.utils.toArray(".os-land [data-parallax]").forEach((row) => { const sp = parseFloat(row.getAttribute("data-parallax")); gsap.fromTo(row, { xPercent: sp * 8 }, { xPercent: sp * -8, ease: "none", scrollTrigger: { trigger: ".os-land #destinations", start: "top bottom", end: "bottom top", scrub: true } }); });
        gsap.fromTo(".os-land #loop .loop-step, .os-land #loop .loop-arrow", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", scrollTrigger: { trigger: ".os-land #loop .loop-steps", start: "top 80%" } });

        // smooth in-page anchors via Lenis
        document.querySelectorAll('.os-land a[href^="#"]').forEach((a) => {
          a.addEventListener("click", (e) => { const id = a.getAttribute("href"); if (id.length < 2) return; const el = document.querySelector(".os-land " + id); if (!el) return; e.preventDefault(); if (lenis) lenis.scrollTo(el); else el.scrollIntoView({ behavior: "smooth" }); });
        });
      } catch { root && root.classList.add("nomo"); }
    })();

    return () => {
      killed = true;
      magCleanups.forEach((fn) => fn());
      try { if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((t) => t.kill()); if (window.gsap) window.gsap.set(".os-land .reveal", { clearProps: "all" }); if (lenis && lenis.destroy) lenis.destroy(); } catch { /* noop */ }
    };
  }, []);

  return (
    <div className="os-land">
      <style>{CSS}</style>
      <nav>
        <div className="brand">CAREER·OS</div>
        <div className="nlinks">
          <a href="#journey">The Journey</a>
          <a href="#salary">Trajectory</a>
          <a href="#loop">How it works</a>
          <Link to="/app" style={{ color: "var(--amber)" }}>Open the app</Link>
        </div>
      </nav>

      <section id="hero">
        <div className="glow" /><div className="glow t" />
        <h1 className="reveal">The career platform<br /><span className="l2">that thinks.</span></h1>
        <p className="sub reveal">Job boards list openings. CareerOS measures the exact distance between you and the offer — then tells you the one thing to do today.</p>
        <div className="cta reveal">
          <Link to="/app" className="lbtn solid" data-magnetic><span className="mi">Enter CareerOS →</span></Link>
          <a href="#journey" className="lbtn ghost" data-magnetic><span className="mi">See the journey</span></a>
        </div>
        <div className="scrollcue">Scroll<div className="dot" /></div>
      </section>

      <section className="editorial wrap">
        <p className="line reveal">Most career tools show you <span className="dimx">a list of jobs.</span></p>
        <p className="line reveal" style={{ marginTop: 24 }}>CareerOS shows you <span className="hl">the gap</span> — and closes it,<br />one measured move at a time.</p>
      </section>

      <section id="journey">
        <div className="jhead"><h2>Your career, as a journey</h2><p>Watch the path from where you are to where you're going.</p></div>
        <svg className="jsvg" viewBox="0 0 760 360" id="jsvg">
          <path id="journeyPath" d="M 90 320 C 200 320, 180 250, 270 240 S 420 210, 430 160 S 560 120, 600 90 S 690 60, 690 40" fill="none" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" />
          <defs><linearGradient id="grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#22d3ee" /><stop offset="1" stopColor="#f5a524" /></linearGradient></defs>
          <g className="jnode"><circle cx="90" cy="320" r="7" fill="#22d3ee" /><text className="role" x="104" y="318">System Engineer</text><text className="tag" x="104" y="333" fill="#7dd3fc">YOU ARE HERE</text></g>
          <g className="jnode"><circle cx="270" cy="240" r="6" fill="#64748b" /><text className="role" x="284" y="238">Software Engineer</text></g>
          <g className="jnode"><circle cx="430" cy="160" r="6" fill="#64748b" /><text className="role" x="444" y="158">AI Engineer</text></g>
          <g className="jnode"><circle cx="600" cy="90" r="6" fill="#64748b" /><text className="role" x="500" y="84">Senior AI Engineer</text></g>
          <g className="jnode"><circle cx="690" cy="40" r="8" fill="#f5a524" /><text className="role" x="540" y="34" fill="#fcd34d">AI Architect</text><text className="tag" x="540" y="49" fill="#fcd34d">THE GOAL</text></g>
        </svg>
      </section>

      <section className="grid-sec wrap">
        <h2 className="sec-h reveal">Skills unfold into a tree.</h2>
        <p className="sec-p reveal">CareerOS knows what your target role demands — and which branches you've already grown.</p>
        <div className="skilltree">
          {["Python", "Deep Learning", "Transformers / NLP", "LLM apps · RAG", "PyTorch", "MLOps", "System design", "Data structures", "Model serving", "Vector search", "Evaluation", "Cloud · AWS"].map((s, i) => (
            <div key={s} className={"skillchip reveal" + ([0, 1, 3].includes(i) ? " core" : "")}>{s}</div>
          ))}
        </div>
      </section>

      <section id="salary" className="grid-sec wrap">
        <h2 className="sec-h reveal">Milestones emerge from the timeline.</h2>
        <p className="sec-p reveal">Illustrative India trajectory for an AI engineer who keeps closing the gap. Your real path is computed inside the app.</p>
        <div className="timeline">
          <div className="tl-line" id="tlLine" />
          {[["6", "Entry · first AI role", "Product company, GCC, or startup. The hardest leap — proof beats pedigree."],
            ["15", "1–3 years · you ship", "You own features in production. Mocks pass. Referrals open."],
            ["28", "3–5 years · senior", "You design systems, not just code them. Leverage compounds."],
            ["45", "Staff · scarce skill", "Inference, infra, or model work few can do. Pay follows scarcity."],
            ["70", "Architect · global", "₹70L+, or a global-remote offer in another currency entirely."]].map(([fig, b, m], i) => (
            <div className="milestone reveal" key={fig}><span className="dot" /><span className="fig" data-fig={fig} {...(i === 4 ? { "data-plus": "1" } : {})}>₹0L</span><span className="meta"><b>{b}</b>{m}</span></div>
          ))}
        </div>
      </section>

      <section id="destinations">
        <div className="wrap"><h2 className="sec-h reveal" style={{ marginBottom: 40 }}>Companies become destinations.</h2></div>
        <div className="dest-row a" data-parallax="0.3"><span className="on">Zoho</span><span>Freshworks</span><span className="on">Sarvam AI</span><span>PayPal</span><span className="on">Google</span><span>NVIDIA</span></div>
        <div className="dest-row b" data-parallax="-0.4" style={{ marginTop: 18 }}><span>CRED</span><span className="on">Anthropic</span><span>Tiger Analytics</span><span className="on">Hugging Face</span><span>Krutrim</span><span>Observe.AI</span></div>
        <div className="dest-row a" data-parallax="0.5" style={{ marginTop: 18, color: "rgba(255,255,255,0.06)" }}><span>Flipkart</span><span>Microsoft</span><span>Cohere</span><span>Razorpay</span><span>Postman</span><span>Adobe</span></div>
      </section>

      <section id="loop" className="wrap">
        <h2 className="sec-h reveal" style={{ marginBottom: 0 }}>It runs on one loop.</h2>
        <p className="sec-p reveal" style={{ margin: "8px auto 0" }}>Every action feeds the next. The product gets smarter about you each day.</p>
        <div className="loop-steps">
          {["Diagnose", "Prescribe", "Improve", "Verify", "Advance"].map((s, i) => (
            <span key={s} style={{ display: "contents" }}>
              <div className="loop-step reveal"><span className="n">0{i + 1}</span>{s}</div>
              {i < 4 && <span className="loop-arrow reveal">→</span>}
            </span>
          ))}
        </div>
      </section>

      <section id="app-cta">
        <div className="glow" />
        <h2 className="reveal">Your career,<br />as an operating system.</h2>
        <p className="reveal">Stop browsing jobs. Start closing the distance.</p>
        <div style={{ marginTop: 38 }} className="reveal">
          <Link to="/app" className="lbtn solid" data-magnetic><span className="mi">Enter CareerOS →</span></Link>
        </div>
      </section>

      <footer>CareerOS · the operating system for career growth</footer>
    </div>
  );
}
