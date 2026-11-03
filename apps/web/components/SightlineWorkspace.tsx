"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Moon, Sun } from "lucide-react";
import { investigationSchema, type Investigation } from "../../../packages/core/src/investigation";
import { asSentence, describeMovement, etherscanAddress, etherscanTx, evidenceSummary, kindName, lookalikeAddresses, nameOf, nameSource, revokeUrl, roleName, roleOf, routeTitle, shortHash, type Movement } from "../../../packages/core/src/route";
import { Brand } from "./Brand";
import { KeysPanel, type Settings } from "./KeysPanel";
function Address({ value, investigation }: { value: string; investigation: Investigation }) {
  const role = roleOf(value, investigation);
  const name = nameOf(value, investigation);
  const source = nameSource(value, investigation);
  const hash = lookalikeAddresses(investigation).has(value) ? value : shortHash(value);
  if (name && source === "known") return <span className={"address address-" + role} title={value}><span className="address-role">{roleName[role]}</span><span className="address-hash address-name">{name}</span><span className="address-short">{hash}</span></span>;
  return <span className={"address address-" + role} title={value}><span className="address-role">{roleName[role]}</span><span className={"address-hash" + (hash === value ? " address-full" : "")}>{hash}</span>{name && <span className="address-short" title="ENS names are chosen by the address owner and can imitate other names">{name} (ENS)</span>}</span>;
}
function Headline({ movement, investigation }: { movement: Movement; investigation: Investigation }) {
  const parts = describeMovement(movement, investigation);
  return <>{parts.before}<span className="amount">{parts.amount}</span>{movement.usd && <span className="usd"> ({movement.usd}{investigation.prices ? " " + investigation.prices.basis : ""})</span>}{parts.after}</>;
}
type Failure = { text: string; input: boolean; attempt: number; needsKey: boolean };
export function SightlineWorkspace({ initial }: { initial: Investigation }) {
  const uid = useId();
  const [investigation, setInvestigation] = useState(initial);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"address" | "transaction">("transaction");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fromLink, setFromLink] = useState(false);
  const routeHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tx = params.get("tx");
    const address = params.get("address");
    if (tx && /^0x[0-9a-fA-F]{64}$/.test(tx)) { setKind("transaction"); setQuery(tx); setFromLink(true); }
    else if (address && /^0x[0-9a-fA-F]{40}$/.test(address)) { setKind("address"); setQuery(address); setFromLink(true); }
  }, []);
  useEffect(() => { fetch("/api/settings").then(response => response.ok ? response.json() : null).then(body => { if (body) setSettings(body as Settings); }).catch(() => undefined); }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("chainsightline-theme", next ? "dark" : "light"); } catch {}
  }
  function fail(text: string, input: boolean, needsKey = false) {
    setError(previous => ({ text, input, needsKey, attempt: (previous?.attempt ?? 0) + 1 }));
  }
  function show(next: Investigation) {
    setInvestigation(next);
    setOpen(null);
    setCopied(false);
    const url = next.synthetic ? location.pathname : location.pathname + "?" + (next.kind === "address" ? "address=" + next.subject : "tx=" + next.transactionHash);
    history.replaceState(null, "", url);
    requestAnimationFrame(() => { routeHeading.current?.focus({ preventScroll: true }); routeHeading.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); });
  }
  async function load(payload: object) {
    setError(null);
    setFromLink(false);
    setLoading(true);
    try {
      const response = await fetch("/api/investigations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) { fail(body?.error ?? "Ethereum could not be read. Try again in a moment.", response.status === 400 || response.status === 404, body?.code === "needs-key"); return; }
      const parsed = investigationSchema.safeParse(body);
      if (!parsed.success) { fail("The answer came back in an unexpected format.", false); return; }
      show(parsed.data);
    } catch {
      fail("ChainSightline couldn’t be reached. Check that it is still running.", false);
    } finally {
      setLoading(false);
    }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const value = query.trim();
    if (!value) { fail(kind === "address" ? "Paste an Ethereum address." : "Paste an Ethereum transaction hash.", true); return; }
    const guessed = /^0x[0-9a-fA-F]{64}$/.test(value) ? "transaction" : /^0x[0-9a-fA-F]{40}$/.test(value) ? "address" : kind;
    if (guessed !== kind) setKind(guessed);
    load({ kind: guessed, value });
  }
  const title = routeTitle(investigation.movements.length);
  const real = !investigation.synthetic;
  return <div className="site">
    <header className="masthead"><Brand /><button className="theme-toggle" onClick={toggleTheme} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button></header>
    <main className="page">
      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">Follow the line.</h1>
        <p className="lede">Paste an Ethereum transaction or address. ChainSightline lays out what moved, between whom, and exactly where the evidence ends.</p>
        <form className="search" onSubmit={submit} noValidate>
          <div className="search-kind" role="group" aria-label="What are you pasting?">
            <button type="button" aria-pressed={kind === "transaction"} onClick={() => setKind("transaction")}>Transaction</button>
            <button type="button" aria-pressed={kind === "address"} onClick={() => setKind("address")}>Address</button>
          </div>
          <div className="search-field">
            <input value={query} onChange={event => { setQuery(event.target.value); if (error) setError(null); }} placeholder={kind === "address" ? "0x… Ethereum address" : "0x… transaction hash"} aria-label={kind === "address" ? "Ethereum address" : "Transaction hash"} aria-invalid={error?.input ? true : undefined} aria-describedby={uid + "-message"} spellCheck={false} autoComplete="off" />
            <button type="submit" aria-disabled={loading} aria-label={loading ? "Reading Ethereum" : undefined}>{loading ? <LoaderCircle className="spin" size={18} /> : <>Follow the line <ArrowRight size={18} /></>}</button>
          </div>
          <div id={uid + "-message"}>
            {error && <p key={error.attempt} className="search-error" role="alert">{error.text} {error.needsKey && <button type="button" className="text-button" onClick={() => setShowKeys(true)}>Add an Alchemy key</button>}</p>}
            {fromLink && <p className="search-link-note">Opened from a link. Press <strong>Follow the line</strong> to look it up.</p>}
            <p className="search-hint">
              {settings ? <>Reading from {settings.primary}{settings.addressHistory ? ", with address history from Alchemy" : ""}. </> : null}
              <button type="button" className="text-button" aria-expanded={showKeys} aria-controls={uid + "-keys"} onClick={() => setShowKeys(!showKeys)}>{showKeys ? "Hide your keys" : "Your keys"}</button>
              <span aria-hidden="true"> · </span>
              <button type="button" className="text-button" onClick={() => { setError(null); load({ kind: "sample" }); }}>See an invented example</button>
            </p>
          </div>
        </form>
        {showKeys && settings && <KeysPanel id={uid + "-keys"} settings={settings} onSaved={setSettings} />}
      </section>
      <section className="route" aria-labelledby="route-title" aria-busy={loading}>
        <header className="route-header">
          <h2 id="route-title" ref={routeHeading} tabIndex={-1}>{title}</h2>
          <div className="route-meta">
            <p className="stamp">{real ? "Ethereum mainnet, block " + investigation.blockNumber : "An invented example"}</p>
            {real && <button type="button" className="text-button" onClick={() => navigator.clipboard.writeText(location.href).then(() => setCopied(true)).catch(() => undefined)}>{copied ? "Link copied" : "Copy link"}</button>}
            {real && <span className="sr-only" aria-live="polite">{copied ? "Link copied" : ""}</span>}
          </div>
        </header>
        <ol className="trail" role="list" aria-label="The route, from starting point to the end of the evidence">
          <li className="terminus">
            <span className="marker" aria-hidden="true" />
            <p className="stop-label">Starting point</p>
            <h3 className="stop-title">{investigation.kind === "address" ? "The address you asked about." : "The subject’s account."}</h3>
            <p className="stop-meta"><Address value={investigation.subject} investigation={investigation} /></p>
            {investigation.transactionHash && <p className="stop-meta">Transaction <a className="hash" href={etherscanTx(investigation.transactionHash)} target="_blank" rel="noreferrer noopener" title={"View " + investigation.transactionHash + " on Etherscan"}>{shortHash(investigation.transactionHash)}</a>{investigation.status === "failed" && <strong className="failed"> failed</strong>}</p>}
            {real && <p className="stop-meta"><a className="text-link" href={etherscanAddress(investigation.subject)} target="_blank" rel="noreferrer noopener">View the subject on Etherscan<span className="sr-only"> (opens in a new tab)</span></a></p>}
            <p className="stop-meta">{real ? investigation.explanation.summary : "Invented Ethereum-style data at block " + investigation.blockNumber + ". " + asSentence(investigation.coverage.summary)}</p>
          </li>
          {investigation.movements.map((movement, index) => {
            const notes = investigation.warnings.filter(item => item.evidenceId === movement.evidenceId);
            const warning = notes[0];
            const txHash = movement.transactionHash ?? investigation.transactionHash;
            const isOpen = open === movement.id;
            const key = uid + "-stop-" + index;
            return <li key={investigation.id + movement.id} className={"stop" + (warning ? " has-warning" : "") + (isOpen ? " is-open" : "")}>
              <span className="marker" aria-hidden="true" />
              <p className="stop-label" id={key + "-label"}>Stop {index + 1}. {kindName[movement.kind]}</p>
              <h3 className="stop-title"><Headline movement={movement} investigation={investigation} /></h3>
              <p className="stop-route"><Address value={movement.from} investigation={investigation} /><ArrowRight className="route-arrow" size={16} aria-hidden="true" /><span className="sr-only">to</span><Address value={movement.to} investigation={investigation} /></p>
              {notes.map(note => <div className="stop-note" key={note.id}><p><strong>{asSentence(note.title)}</strong> {note.reason}{real && movement.kind === "approval" && note === notes[0] && <> <a className="text-link" href={revokeUrl(movement.from)} target="_blank" rel="noreferrer noopener">Check or revoke it on revoke.cash<span className="sr-only"> (opens in a new tab)</span></a></>}</p></div>)}
              <button type="button" className="evidence-toggle" aria-expanded={isOpen} aria-controls={key + "-evidence"} aria-describedby={key + "-label"} onClick={() => setOpen(isOpen ? null : movement.id)}>{isOpen ? "Hide the evidence" : "Show the evidence"}</button>
              <dl className="evidence" id={key + "-evidence"} hidden={!isOpen}>
                <div><dt>Reference</dt><dd>{movement.evidenceId}</dd></div>
                {real && txHash && <div><dt>Transaction</dt><dd className="hash"><a href={etherscanTx(txHash)} target="_blank" rel="noreferrer noopener">{txHash}</a></dd></div>}
                <div><dt>From</dt><dd className="hash">{real ? <a href={etherscanAddress(movement.from)} target="_blank" rel="noreferrer noopener">{movement.from}</a> : movement.from}</dd></div>
                <div><dt>To</dt><dd className="hash">{real ? <a href={etherscanAddress(movement.to)} target="_blank" rel="noreferrer noopener">{movement.to}</a> : movement.to}</dd></div>
                {movement.assetAddress && <div><dt>Token contract</dt><dd className="hash"><a href={etherscanAddress(movement.assetAddress)} target="_blank" rel="noreferrer noopener">{movement.assetAddress}</a></dd></div>}
                <div><dt>Amount</dt><dd>{movement.amount} {movement.asset}{movement.usd && <> ({movement.usd}{investigation.prices ? " " + investigation.prices.basis : ""})</>}</dd></div>
                {movement.rawAmount && <div><dt>Exact amount</dt><dd className="hash">{movement.rawAmount}</dd></div>}
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
            <p className="stop-meta">{real ? "Read from " + investigation.source + ". Written by ChainSightline’s rules, not AI." : "This example explanation was written in advance."}</p>
          </li>
        </ol>
      </section>
    </main>
    <footer className="colophon"><Brand /><p>Read-only. ChainSightline never connects a wallet, signs anything or moves funds.</p></footer>
  </div>;
}
