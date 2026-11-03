"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleHelp, Clock3, Database, FileSearch, KeyRound, Layers3, LoaderCircle, Moon, Network, Search, ShieldCheck, Sun, X } from "lucide-react";
import type { Investigation } from "../../../packages/core/src/investigation";
import { Brand } from "./Brand";
type Evidence = Investigation["movements"][number] | Investigation["warnings"][number];
const shorten = (value: string) => value.slice(0, 6) + "…" + value.slice(-4);
export function Workspace({ initial }: { initial: Investigation }) {
  const [investigation, setInvestigation] = useState(initial);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"address" | "transaction">("address");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Evidence | null>(null);
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<"timeline" | "graph">("timeline");
  const [showExplanation, setShowExplanation] = useState(false);
  const [entered, setEntered] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  useEffect(() => { if (selected) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [selected]);
  async function investigate(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const value = query.trim();
    if (!value) { setError("Enter an Ethereum address or transaction hash"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/investigations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, value }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Unable to create sample preview");
      setInvestigation(body); setEntered(value); setSelected(null); setShowExplanation(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create investigation"); }
    finally { setLoading(false); }
  }
  return <>
    <div className="preview-banner"><Database size={14}/><strong>Sample investigation</strong><span>Synthetic data · not connected to Ethereum</span></div>
    <header className="topbar"><Brand /><nav aria-label="Product"><a className="active" aria-current="location" href="#investigation">Investigation</a><a href="#evidence">Evidence</a></nav><div className="header-actions"><span className="local-badge"><span /> Local workspace</span><button className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button></div></header>
    <main>
      <section className="search-section">
        <div className="eyebrow"><span className="eyebrow-line"/> EVIDENCE-FIRST INVESTIGATIONS</div>
        <h1>Follow what happened.<br/><span>Understand what it means.</span></h1>
        <p className="hero-copy">Explore on-chain activity through clear timelines, connected evidence and honest uncertainty.</p>
        <form className="search-form" onSubmit={investigate}>
          <div className="search-top"><div className="subject-tabs"><button type="button" aria-pressed={kind === "address"} className={kind === "address" ? "selected" : ""} onClick={() => setKind("address")}>Address</button><button type="button" aria-pressed={kind === "transaction"} className={kind === "transaction" ? "selected" : ""} onClick={() => setKind("transaction")}>Transaction</button></div><span className="network"><span/> Ethereum</span></div>
          <div className="search-input"><Search size={20}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={kind === "address" ? "Paste an Ethereum address" : "Paste a transaction hash"} aria-label={kind === "address" ? "Ethereum address" : "Transaction hash"} aria-invalid={!!error} aria-describedby={error ? "search-error" : "preview-note"} /><button disabled={loading} aria-label={loading ? "Loading sample preview" : undefined} aria-busy={loading}>{loading ? <LoaderCircle className="spin" size={18}/> : <>Preview sample <ArrowRight size={17}/></>}</button></div>
          <div className="search-bottom"><span><ShieldCheck size={13}/> Read-only by design</span><button type="button" onClick={() => { setKind("address"); setQuery(initial.subject); }}>Try a synthetic example <ChevronRight size={12}/></button></div>
        </form>
        {error && <p id="search-error" className="error" role="alert">{error}</p>}
          {entered && <p className="demo-note">You entered {entered}; showing the fixed synthetic sample, not evidence about that subject.</p>}
        <p id="preview-note" className="demo-note"><CircleHelp size={14}/> Preview mode: searches return clearly labeled synthetic evidence. Live blockchain collection is not connected.</p>
      </section>
      <section id="investigation" className="investigation-section">
        <div className="section-heading"><div><div className="eyebrow">CASE FILE / {investigation.id.toUpperCase()}</div><h2>The evidence file.</h2></div><span className="synthetic-badge"><Database size={13}/> Synthetic evidence</span></div>
        <div className="overview-grid">
          <article className="subject-card"><div className="card-label">SUBJECT</div><div className="subject-address"><span className="address-icon"><KeyRound size={19}/></span><span>{shorten(investigation.subject)}<small>Sample · Ethereum-style data</small></span></div><div className="subject-meta"><span><Layers3 size={13}/> Illustrative block {investigation.blockNumber}</span><span><Clock3 size={13}/> Invented evidence</span></div></article>
          <article className="stat-card"><div className="card-label">OBSERVED MOVEMENTS</div><strong>{investigation.movements.length}</strong><span>Across this synthetic evidence set</span><div className="stat-rule"><span/></div></article>
          <article className="stat-card"><div className="card-label">SIGNALS TO REVIEW</div><strong>{investigation.warnings.length}</strong><span>Explainable, not a verdict</span><div className="stat-rule amber"><span/></div></article>
          <article className="coverage-card"><div className="card-label">EVIDENCE COVERAGE</div><div><span className="partial-dot"/> Partial</div><p>{investigation.coverage.summary}</p><button onClick={() => document.getElementById("evidence")?.scrollIntoView({ behavior: "smooth" })}>View limitations <ArrowRight size={13}/></button></article>
        </div>
        <div className="workspace-grid dossier-grid">
          <div className="activity-panel">
            <div className="panel-heading"><div><span className="chapter">01 / OBSERVED ACTIVITY</span><h3>Follow the sightline.</h3><p>Three observations. One connected record.</p></div><div className="view-tabs"><button aria-pressed={tab === "timeline"} className={tab === "timeline" ? "selected" : ""} onClick={() => setTab("timeline")}><Clock3 size={14}/> Timeline</button><button aria-pressed={tab === "graph"} className={tab === "graph" ? "selected" : ""} onClick={() => setTab("graph")}><Network size={14}/> Graph</button></div></div>
            {tab === "timeline" ? <div className="timeline">{investigation.movements.map((movement, index) => <button className="movement" key={movement.id} onClick={() => setSelected(movement)}><span className="timeline-marker"><span className={movement.kind === "approval" ? "approval-marker" : ""}/>{index < investigation.movements.length - 1 && <i/>}</span><span className="movement-icon">{movement.kind === "approval" ? <KeyRound size={17}/> : index === 0 ? <ArrowUpRight size={17}/> : <ArrowDownLeft size={17}/>}</span><span className="movement-content"><span className="movement-title">{movement.description}<small>{movement.evidenceId} · {movement.kind === "approval" ? "Approval event" : "Observed transfer"}</small></span><span className="movement-addresses">{shorten(movement.from)} <ArrowRight size={13}/> {shorten(movement.to)}</span></span><span className="movement-amount">{movement.amount}<small>{movement.asset}</small></span><ChevronRight size={15}/></button>)}</div> : <div className="graph" role="region" aria-label="Synthetic movement graph"><svg viewBox="0 0 700 350" role="img" aria-label="Observed transfers between three synthetic addresses"><path d="M180 170 C270 40 420 40 520 145"/><path d="M180 190 C280 310 410 310 520 180"/><path d="M190 175 C300 180 370 175 510 170"/><circle cx="145" cy="180" r="49"/><circle cx="555" cy="165" r="49"/><circle cx="355" cy="75" r="38"/><text x="145" y="176">{shorten(investigation.movements[0]!.from)}</text><text x="145" y="196">Subject</text><text x="555" y="161">{shorten(investigation.movements[0]!.to)}</text><text x="555" y="181">Counterparty</text><text x="355" y="72">Token</text><text x="355" y="91">contract</text></svg><p>Illustrative graph · select Timeline to inspect individual evidence.</p></div>}
            <div className="panel-footer"><FileSearch size={14}/> Synthetic data only · no live chain state</div>
          </div>
          <aside className="insights-panel">
            <div className="panel-heading"><div><span className="chapter">02 / INVESTIGATION MARGIN</span><h3>Read between the lines.</h3><p>Context, caveats and open questions.</p></div></div>
            {investigation.warnings.map(warning => <button className="warning" key={warning.id} onClick={() => setSelected(warning)}><span className="warning-label"><span/> REVIEW</span><span className="warning-title">{warning.title}</span><span className="warning-reason">{warning.reason}</span><span className="evidence-link">{warning.evidenceId} <ArrowRight size={12}/></span></button>)}
            <div className="explanation"><div className="explanation-heading"><ShieldCheck size={17}/><h3>Evidence explanation</h3></div><p>A pre-generated sample reading of the evidence, with uncertainty kept in view.</p>{showExplanation ? <div className="explanation-body"><p>{investigation.explanation.summary}</p><strong>What remains unknown</strong><p>{investigation.explanation.uncertainty}</p></div> : <button onClick={() => setShowExplanation(true)}>Read explanation <ArrowRight size={14}/></button>}<span className="deterministic"><Check size={12}/> Deterministic example · no AI request</span></div>
          </aside>
        </div>
      </section>
      <section id="evidence" className="evidence-section"><div><div className="eyebrow">03 / THE EVIDENCE STANDARD</div><h2>Clarity without false certainty.</h2></div><div className="evidence-points"><article><ShieldCheck size={21}/><h3>Source before story</h3><p>Every explanation points to the evidence it describes. AI cannot introduce new findings.</p></article><article><CircleHelp size={21}/><h3>Unknown stays unknown</h3><p>{investigation.coverage.limitations.join(". ")}.</p></article><article><KeyRound size={21}/><h3>Read-only by default</h3><p>No wallet connection, signing, transactions or automated interventions.</p></article></div></section>
    </main>
    <footer><Brand/><p>Evidence first. Uncertainty included.</p><span>Local preview · Ethereum target</span></footer>
    <dialog ref={dialogRef} className="evidence-drawer" aria-label="Evidence details" onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>{selected && <><button className="icon-button close" onClick={() => dialogRef.current?.close()} aria-label="Close evidence"><X size={19}/></button><div className="eyebrow">EVIDENCE DETAIL</div><h2>{"title" in selected ? selected.title : selected.description}</h2><span className="synthetic-badge"><Database size={13}/> Synthetic observation</span><p>{"reason" in selected ? selected.reason : selected.description}</p><dl><div><dt>Evidence reference</dt><dd>{selected.evidenceId}</dd></div><div><dt>Chain</dt><dd>Sample · Ethereum-style data</dd></div><div><dt>Coverage</dt><dd>Partial · synthetic</dd></div>{"from" in selected && <><div><dt>From</dt><dd>{selected.from}</dd></div><div><dt>To</dt><dd>{selected.to}</dd></div><div><dt>Amount</dt><dd>{selected.amount} {selected.asset}</dd></div></>}</dl><p className="drawer-note">This observation does not establish wallet ownership, intent or criminal activity.</p></>}</dialog>
  </>;
}
