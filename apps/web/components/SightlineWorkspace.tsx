"use client";
import { useEffect, useId, useState } from "react";
import { ArrowRight, LoaderCircle, Moon, Sun } from "lucide-react";
import { investigationSchema, type Investigation } from "../../../packages/core/src/investigation";
import { asSentence, describeMovement, evidenceSummary, kindName, roleName, roleOf, routeTitle, shortHash, type Movement } from "../../../packages/core/src/route";
import { Brand } from "./Brand";
function Address({ value, investigation }: { value: string; investigation: Investigation }) {
  const role = roleOf(value, investigation);
  return <span className={"address address-" + role} title={value}><span className="address-role">{roleName[role]}</span><span className="address-hash">{shortHash(value)}</span></span>;
}
function Headline({ movement, investigation }: { movement: Movement; investigation: Investigation }) {
  const parts = describeMovement(movement, investigation);
  return <>{parts.before}<span className="amount">{parts.amount}</span>{parts.after}</>;
}
export function SightlineWorkspace({ initial }: { initial: Investigation }) {
  const uid = useId();
  const [investigation, setInvestigation] = useState(initial);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"address" | "transaction">("address");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ text: string; input: boolean; attempt: number } | null>(null);
  const [entered, setEntered] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("chainsightline-theme", next ? "dark" : "light"); } catch {}
  }
  function fail(text: string, input: boolean) {
    setEntered("");
    setError(previous => ({ text, input, attempt: (previous?.attempt ?? 0) + 1 }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const value = query.trim();
    if (!value) { fail("Enter an Ethereum address or transaction hash.", true); return; }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/investigations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, value }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) { fail(body?.error ?? "The sample could not be opened.", response.status === 400); return; }
      const parsed = investigationSchema.safeParse(body);
      if (!parsed.success) { fail("The sample came back in an unexpected format.", false); return; }
      setInvestigation(parsed.data);
      setEntered(value);
      setOpen(null);
    } catch {
      fail("The sample could not be opened. Check that ChainSightline is still running.", false);
    } finally {
      setLoading(false);
    }
  }
  const title = routeTitle(investigation.movements.length);
  return <div className="site">
    <header className="masthead"><Brand /><button className="theme-toggle" onClick={toggleTheme} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button></header>
    <main className="page">
      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">Follow the line.</h1>
        <p className="lede">Every investigation becomes one line you can read from top to bottom: what moved, between whom, and exactly where the evidence ends.</p>
        <form className="search" onSubmit={submit} noValidate>
          <div className="search-kind" role="group" aria-label="What are you pasting?">
            <button type="button" aria-pressed={kind === "address"} onClick={() => setKind("address")}>Address</button>
            <button type="button" aria-pressed={kind === "transaction"} onClick={() => setKind("transaction")}>Transaction</button>
          </div>
          <div className="search-field">
            <input value={query} onChange={event => { setQuery(event.target.value); if (error) setError(null); }} placeholder={kind === "address" ? "0x… Ethereum address" : "0x… transaction hash"} aria-label={kind === "address" ? "Ethereum address" : "Transaction hash"} aria-invalid={error?.input ? true : undefined} aria-describedby={uid + "-message"} spellCheck={false} autoComplete="off" />
            <button type="submit" aria-disabled={loading} aria-label={loading ? "Opening the sample" : undefined}>{loading ? <LoaderCircle className="spin" size={18} /> : <>Open the sample <ArrowRight size={18} /></>}</button>
          </div>
          <div id={uid + "-message"}>
            {error
              ? <p key={error.attempt} className="search-error" role="alert">{error.text}</p>
              : <p className="search-hint">This preview isn’t connected to Ethereum yet, so every search opens the same invented example. <button type="button" className="text-button" onClick={() => { setKind("address"); setQuery(initial.subject); setError(null); }}>Use the sample address</button></p>}
          </div>
          <p className="search-entered" aria-live="polite">{entered && <>You entered <span className="address-hash">{shortHash(entered)}</span>. The route below is still the invented example, not evidence about it.</>}</p>
        </form>
      </section>
      <section className="route" aria-labelledby="route-title">
        <header className="route-header">
          <h2 id="route-title">{title}</h2>
          <p className="stamp">An invented example</p>
        </header>
        <ol className="trail" role="list" aria-label="The route, from starting point to the end of the evidence">
          <li className="terminus">
            <span className="marker" aria-hidden="true" />
            <p className="stop-label">Starting point</p>
            <h3 className="stop-title">The subject’s account.</h3>
            <p className="stop-meta"><Address value={investigation.subject} investigation={investigation} /></p>
            <p className="stop-meta">Invented Ethereum-style data at block {investigation.blockNumber}. {asSentence(investigation.coverage.summary)}</p>
          </li>
          {investigation.movements.map((movement, index) => {
            const warning = investigation.warnings.find(item => item.evidenceId === movement.evidenceId);
            const isOpen = open === movement.id;
            const key = uid + "-stop-" + index;
            return <li key={movement.id} className={"stop" + (warning ? " has-warning" : "") + (isOpen ? " is-open" : "")}>
              <span className="marker" aria-hidden="true" />
              <p className="stop-label" id={key + "-label"}>Stop {index + 1}. {kindName[movement.kind]}</p>
              <h3 className="stop-title"><Headline movement={movement} investigation={investigation} /></h3>
              <p className="stop-route"><Address value={movement.from} investigation={investigation} /><ArrowRight className="route-arrow" size={16} aria-hidden="true" /><span className="sr-only">to</span><Address value={movement.to} investigation={investigation} /></p>
              {warning && <div className="stop-note"><p><strong>{asSentence(warning.title)}</strong> {warning.reason}</p></div>}
              <button type="button" className="evidence-toggle" aria-expanded={isOpen} aria-controls={key + "-evidence"} aria-describedby={key + "-label"} onClick={() => setOpen(isOpen ? null : movement.id)}>{isOpen ? "Hide the evidence" : "Show the evidence"}</button>
              <dl className="evidence" id={key + "-evidence"} hidden={!isOpen}>
                <div><dt>Reference</dt><dd>{movement.evidenceId}</dd></div>
                <div><dt>From</dt><dd className="hash">{movement.from}</dd></div>
                <div><dt>To</dt><dd className="hash">{movement.to}</dd></div>
                <div><dt>Amount</dt><dd>{movement.amount} {movement.asset}</dd></div>
                <div><dt>What it shows</dt><dd>{evidenceSummary(movement, investigation.synthetic)}</dd></div>
              </dl>
            </li>;
          })}
          <li className="terminus terminus-end">
            <span className="marker" aria-hidden="true" />
            <p className="stop-label">End of the line</p>
            <h3 className="stop-title">Where the evidence ends.</h3>
            <p className="stop-meta">{investigation.explanation.uncertainty}</p>
            <ul className="unknowns">{investigation.coverage.limitations.map((item, index) => <li key={index}>{asSentence(item)}</li>)}</ul>
            <p className="stop-meta">This example explanation was written in advance.</p>
          </li>
        </ol>
      </section>
    </main>
    <footer className="colophon"><Brand /><p>Read-only. ChainSightline never connects a wallet, signs anything or moves funds.</p></footer>
  </div>;
}
