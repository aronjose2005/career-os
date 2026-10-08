import React from "react";

// The white, ATS-friendly resume. Semantic HTML only: single column, no tables,
// no images, no absolute positioning. Empty sections are never rendered.
const Row = ({ left, right }) => <div className="r-row"><h3>{left}</h3>{right ? <span className="r-dates">{right}</span> : null}</div>;
const Link = ({ href }) => { const h = /^https?:\/\//i.test(href) ? href : "https://" + href; return <a href={h}>{href.replace(/^https?:\/\//i, "")}</a>; };

export default function ResumeDocument({ r }) {
  const c = r.contact || {};
  const contact = [c.location, c.phone, c.email].filter(Boolean);
  const links = [c.linkedin, c.github, c.portfolio, c.other].filter(Boolean);
  return (
    <div id="resume-print">
      <article className="resume-paper" aria-label="Resume">
        <header>
          <h1>{r.name}</h1>
          {r.title && <p className="r-title">{r.title}</p>}
          <p className="r-contact">{contact.join(" | ")}{contact.length && links.length ? " | " : ""}{links.map((l, i) => <React.Fragment key={l}>{i > 0 && " | "}<Link href={l} /></React.Fragment>)}</p>
        </header>
        {r.summary && <section><h2>Summary</h2><p>{r.summary}</p></section>}
        {r.skills.length > 0 && <section><h2>Technical Skills</h2>{r.skills.map((s) => <p key={s.category}><strong>{s.category}:</strong> {s.items.join(", ")}</p>)}</section>}
        {r.experience.length > 0 && <section><h2>Experience</h2>{r.experience.map((e, i) => <div key={i} style={{ breakInside: "avoid" }}><Row left={[e.title, e.company].filter(Boolean).join(", ")} right={e.dates} />{e.location && <p className="r-sub">{e.location}</p>}{e.bullets.length > 0 && <ul>{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}</div>)}</section>}
        {r.projects.length > 0 && <section><h2>Projects</h2>{r.projects.map((p, i) => <div key={i} style={{ breakInside: "avoid" }}><Row left={p.name} right={p.dates} />{p.links.length > 0 && <p className="r-sub">{p.links.map((l, k) => <React.Fragment key={l}>{k > 0 && " | "}<Link href={l} /></React.Fragment>)}</p>}{p.bullets.length > 0 && <ul>{p.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}</div>)}</section>}
        {r.education.length > 0 && <section><h2>Education</h2>{r.education.map((e, i) => <div key={i}><Row left={[e.degree, e.institution].filter(Boolean).join(", ")} right={e.dates} />{e.location && <p className="r-sub">{e.location}</p>}{e.details.length > 0 && <ul>{e.details.map((b, j) => <li key={j}>{b}</li>)}</ul>}</div>)}</section>}
        {r.certifications.length > 0 && <section><h2>Certifications</h2><ul>{r.certifications.map((x, i) => <li key={i}>{[x.name, x.issuer, x.year].filter(Boolean).join(", ")}{x.url && <> — <Link href={x.url} /></>}</li>)}</ul></section>}
        {r.publications.length > 0 && <section><h2>Publications</h2><ul>{r.publications.map((x, i) => <li key={i}>{[x.authors, x.title, x.venue, x.year].filter(Boolean).join(", ")}{x.link && <> — <Link href={x.link} /></>}</li>)}</ul></section>}
        {r.achievements.length > 0 && <section><h2>Achievements &amp; Leadership</h2><ul>{r.achievements.map((x, i) => <li key={i}><strong>{x.title}</strong>{[x.org, x.date].filter(Boolean).length ? ", " + [x.org, x.date].filter(Boolean).join(", ") : ""}{x.description ? " — " + x.description : ""}</li>)}</ul></section>}
      </article>
    </div>
  );
}
