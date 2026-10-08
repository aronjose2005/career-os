// Shared CareerOS UI atoms (moved verbatim out of CareerOS.jsx so new sections can reuse them).
export const Label = ({ children }) => <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-500">{children}</div>;
export const Panel = ({ children, className = "", accent }) => (
  <div className={"rounded-lg border bg-white/[0.02] " + (accent ? "border-amber-400/25" : "border-white/10") + " " + className}>{children}</div>
);
export const Btn = ({ children, onClick, variant = "ghost", className = "", disabled, size = "md" }) => {
  const base = "btn inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-40 ";
  const sz = size === "sm" ? "px-2.5 py-1 text-xs " : "px-3.5 py-2 text-sm ";
  const v = variant === "primary" ? "bg-amber-400 text-slate-950 hover:bg-amber-300 "
    : variant === "danger" ? "bg-red-500/15 text-red-300 border border-red-400/30 hover:bg-red-500/25 "
    : variant === "teal" ? "border border-teal-400/40 text-teal-300 hover:bg-teal-400/10 "
    : "border border-white/15 text-slate-300 hover:bg-white/5 ";
  return <button onClick={onClick} disabled={disabled} className={base + sz + v + className}>{children}</button>;
};
