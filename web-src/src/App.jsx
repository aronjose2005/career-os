import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import CareerOS from "./CareerOS.jsx";
import Landing from "./Landing.jsx";

/* One integrated app:
   "/"     → cinematic landing experience (with a one-time preloader)
   "/app"  → the CareerOS platform
   Refresh-safe: BrowserRouter restores the route from the URL; the preloader
   runs once per browser session (so refreshing /app never replays it); scroll
   resets to top on every navigation. */

const BOOT_MSGS = [
  "Analyzing career trajectory…",
  "Loading market intelligence…",
  "Building your opportunity graph…",
  "Mapping skill gaps…",
  "Preparing your AI mentor…",
];

const PRE_CSS = `
.os-pre{position:fixed;inset:0;z-index:200;background:#06070a;display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:'Inter',ui-sans-serif,system-ui,sans-serif;transition:opacity .6s ease;color:#f4f5f7}
.os-pre.out{opacity:0;pointer-events:none}
.os-pre .brand{font-family:ui-monospace,monospace;letter-spacing:0.3em;font-size:14px;color:#f5a524;margin-bottom:34px}
.os-pre .msg{font-size:16px;color:#8a909c;min-height:24px;transition:opacity .3s}
.os-pre .bar{width:220px;height:2px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:26px;overflow:hidden}
.os-pre .bar i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#f5a524);border-radius:2px;transition:width .6s cubic-bezier(.2,.7,.2,1)}
.os-pre .glow{position:absolute;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(245,165,36,0.12),transparent 62%);filter:blur(40px)}
@media (prefers-reduced-motion: reduce){.os-pre .msg,.os-pre.out{transition:none}}
`;

function Preloader({ onDone }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduce ? 250 : 680;
    const id = setInterval(() => {
      setI((v) => {
        if (v >= BOOT_MSGS.length - 1) {
          clearInterval(id);
          setTimeout(() => setOut(true), 450);
          setTimeout(onDone, 450 + 650);
          return v;
        }
        return v + 1;
      });
    }, step);
    return () => clearInterval(id);
  }, [onDone]);
  const pct = Math.round(((i + 1) / BOOT_MSGS.length) * 100);
  return (
    <div className={"os-pre" + (out ? " out" : "")}>
      <style>{PRE_CSS}</style>
      <div className="glow" />
      <div className="brand">CAREER·OS</div>
      <div className="msg" key={i}>{BOOT_MSGS[i]}</div>
      <div className="bar"><i style={{ width: pct + "%" }} /></div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  // preloader shows once per session; if the user deep-links/refreshes /app, skip it
  const startPath = window.location.pathname;
  const [showPre, setShowPre] = useState(() => sessionStorage.getItem("os_booted") !== "1" && startPath === "/");
  const done = () => { sessionStorage.setItem("os_booted", "1"); setShowPre(false); };

  return (
    <BrowserRouter>
      <ScrollToTop />
      {showPre && <Preloader onDone={done} />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<CareerOS />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
