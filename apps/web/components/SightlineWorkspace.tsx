"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Moon, Sun } from "lucide-react";
import { investigationSchema, type Investigation } from "../../../packages/core/src/investigation";
import { asSentence, describeMovement, etherscanAddress, etherscanTx, evidenceSummary, kindName, lookalikeAddresses, nameOf, nameSource, revokeUrl, roleLabel, roleOf, shortHash, startTitle, titleFor, type Movement } from "../../../packages/core/src/route";
import { AiExplanation } from "./AiExplanation";
import { Brand } from "./Brand";
import { KeysPanel, type Settings } from "./KeysPanel";
type Mode = "transaction" | "address" | "check" | "checkup";
type Request = { mode: Mode | "sample"; value: string; from?: string };
const isAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);
const isHash = (value: string) => /^0x[0-9a-fA-F]{64}$/.test(value);
const modes: { mode: Mode; label: string; placeholder: string; action: string }[] = [
  { mode: "transaction", label: "Transaction", placeholder: "0x… transaction hash", action: "Follow the line" },
  { mode: "address", label: "Address", placeholder: "0x… Ethereum address", action: "Follow the line" },
  { mode: "check", label: "Before you send", placeholder: "0x… address you’re about to pay", action: "Check this address" },
  { mode: "checkup", label: "Wallet checkup", placeholder: "0x… your wallet address", action: "Check my wallet" },
];
const checkStatus = { ok: "Looks fine", review: "Look closer", unknown: "Can’t tell" } as const;
function urlFor(investigation: Investigation) {
  if (investigation.synthetic) return location.pathname;
  const params = new URLSearchParams();
  if (investigation.kind === "transaction" && investigation.transactionHash) params.set("tx", investigation.transactionHash);
  if (investigation.kind === "address") params.set("address", investigation.subject);
  if (investigation.kind === "check") { params.set("check", investigation.subject); if (investigation.from) params.set("from", investigation.from); }
  if (investigation.kind === "checkup") params.set("checkup", investigation.subject);
  return location.pathname + "?" + params.toString();
}
function requestFromUrl(): Request | null {
  const params = new URLSearchParams(location.search);
  const tx = params.get("tx"), address = params.get("address"), check = params.get("check"), checkup = params.get("checkup"), from = params.get("from");
  if (tx && isHash(tx)) return { mode: "transaction", value: tx };
  if (address && isAddress(address)) return { mode: "address", value: address };
  if (check && isAddress(check)) return { mode: "check", value: check, ...(from && isAddress(from) ? { from } : {}) };
  if (checkup && isAddress(checkup)) return { mode: "checkup", value: checkup };
  return null;
}
function Address({ value, investigation, onFollow }: { value: string; investigation: Investigation; onFollow?: ((address: string) => void) | undefined }) {
  const role = roleOf(value, investigation);
  const name = nameOf(value, investigation);
  const source = nameSource(value, investigation);
  const hash = lookalikeAddresses(investigation).has(value) ? value : shortHash(value);
  const inner = name && source === "known"
    ? <><span className="address-role">{roleLabel(value, investigation)}</span><span className="address-hash address-name">{name}</span><span className="address-short">{hash}</span></>
    : <><span className="address-role">{roleLabel(value, investigation)}</span><span className={"address-hash" + (hash === value ? " address-full" : "")}>{hash}</span>{name && <span className="address-short" title="ENS names are chosen by the address owner and can imitate other names">{name} (ENS)</span>}</>;
  const followable = onFollow && !investigation.synthetic && !(investigation.kind === "address" && value === investigation.subject);
  if (followable) return <button type="button" className={"address address-" + role + " address-follow"} title={"Follow " + value} onClick={() => onFollow(value)}>{inner}<span className="sr-only">: follow this address</span></button>;
  return <span className={"address address-" + role} title={value}>{inner}</span>;
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
  const [fromQuery, setFromQuery] = useState("");
  const [mode, setMode] = useState<Mode>("transaction");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fromLink, setFromLink] = useState(false);
  const routeHeading = useRef<HTMLHeadingElement>(null);
  const latest = useRef(0);
  const current = modes.find(item => item.mode === mode)!;
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  useEffect(() => {
    const request = requestFromUrl();
    if (request && request.mode !== "sample") { setMode(request.mode); setQuery(request.value); setFromQuery(request.from ?? ""); setFromLink(true); }
    const back = () => {
      const next = requestFromUrl();
      if (!next) { latest.current++; setLoading(false); setInvestigation(initial); setOpen(null); return; }
      if (next.mode !== "sample") { setMode(next.mode); setQuery(next.value); setFromQuery(next.from ?? ""); }
      if ((history.state as { loaded?: boolean } | null)?.loaded) load(next, false);
      else { latest.current++; setLoading(false); setFromLink(true); }
    };
    addEventListener("popstate", back);
    return () => removeEventListener("popstate", back);
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
  function show(next: Investigation, push: boolean) {
    setInvestigation(next);
    setOpen(null);
    setCopied(false);
    const url = urlFor(next);
    if (push && url !== location.pathname + location.search) history.pushState({ loaded: true }, "", url);
    else history.replaceState({ loaded: true }, "", url);
    requestAnimationFrame(() => { routeHeading.current?.focus({ preventScroll: true }); routeHeading.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); });
  }
  async function load(request: Request, push = true) {
    const ticket = ++latest.current;
    setError(null);
    setFromLink(false);
    setLoading(true);
    const [endpoint, payload] = request.mode === "check" ? ["/api/checks", { recipient: request.value, from: request.from ?? null }]
      : request.mode === "checkup" ? ["/api/checkups", { address: request.value }]
      : ["/api/investigations", request.mode === "sample" ? { kind: "sample" } : { kind: request.mode, value: request.value }];
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (ticket !== latest.current) return;
      if (!response.ok) { fail(body?.error ?? "Ethereum could not be read. Try again in a moment.", response.status === 400 || response.status === 404, body?.code === "needs-key"); return; }
      const parsed = investigationSchema.safeParse(body);
      if (!parsed.success) { fail("The answer came back in an unexpected format.", false); return; }
      show(parsed.data, push);
    } catch {
      if (ticket === latest.current) fail("ChainSightline couldn’t be reached. Check that it is still running.", false);
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }
  function follow(address: string) {
    setMode("address");
    setQuery(address);
    load({ mode: "address", value: address });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const value = query.trim();
    const from = fromQuery.trim();
    if (!value) { fail(mode === "transaction" ? "Paste an Ethereum transaction hash." : "Paste an Ethereum address.", true); return; }
    if (mode === "check" || mode === "checkup") {
      if (!isAddress(value)) { fail("That doesn’t look like an Ethereum address: 0x followed by 40 characters.", true); return; }
      if (mode === "check" && from && !isAddress(from)) { fail("Your own address doesn’t look right: 0x followed by 40 characters.", true); return; }
      load({ mode, value, ...(mode === "check" && from ? { from } : {}) });
      return;
    }
    const guessed: Mode = isHash(value) ? "transaction" : isAddress(value) ? "address" : mode;
    if (guessed !== mode) setMode(guessed);
    load({ mode: guessed, value });
  }
  const real = !investigation.synthetic;
  const onFollow = real ? follow : undefined;
  return <div className="site">
    <header className="masthead"><Brand /><button className="theme-toggle" onClick={toggleTheme} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button></header>
    <main className="page">
      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">Follow the line.</h1>
        <p className="lede">Paste an Ethereum transaction or address and read what moved, between whom, and where the evidence ends. Check an address before you pay it, or give your wallet a checkup.</p>
        <form className="search" onSubmit={submit} noValidate>
          <div className="search-kind" role="group" aria-label="What do you want to do?">
            {modes.map(item => <button key={item.mode} type="button" aria-pressed={mode === item.mode} onClick={() => { setMode(item.mode); setError(null); }}>{item.label}</button>)}
          </div>
          <div className="search-field">
            <input value={query} onChange={event => { setQuery(event.target.value); if (error) setError(null); }} placeholder={current.placeholder} aria-label={current.placeholder.replace("0x… ", "")} aria-invalid={error?.input ? true : undefined} aria-describedby={uid + "-message"} spellCheck={false} autoComplete="off" />
            <button type="submit" aria-disabled={loading} aria-label={loading ? "Reading Ethereum" : undefined}>{loading ? <LoaderCircle className="spin" size={18} /> : <>{current.action} <ArrowRight size={18} /></>}</button>
          </div>
          {mode === "check" && <div className="search-field search-field-secondary">
            <input value={fromQuery} onChange={event => { setFromQuery(event.target.value); if (error) setError(null); }} placeholder="0x… your own address (optional)" aria-label="Your own address, to compare with your history (optional)" spellCheck={false} autoComplete="off" />
          </div>}
          <div id={uid + "-message"}>
            {error && <p key={error.attempt} className="search-error" role="alert">{error.text} {error.needsKey && <button type="button" className="text-button" onClick={() => setShowKeys(true)}>Add a key</button>}</p>}
            {fromLink && <p className="search-link-note">Opened from a link. Press <strong>{current.action}</strong> to look it up.</p>}
            {mode === "check" && <p className="search-hint">Add your own address to catch lookalikes of people you’ve paid before.</p>}
            <p className="search-hint">
              {settings ? <>Reading from {settings.primary}{settings.addressHistory ? ", with address history from Alchemy" : ""}. </> : null}
              <button type="button" className="text-button" aria-expanded={showKeys} aria-controls={uid + "-keys"} onClick={() => setShowKeys(!showKeys)}>{showKeys ? "Hide your keys" : "Your keys"}</button>
              <span aria-hidden="true"> · </span>
              <button type="button" className="text-button" onClick={() => { setError(null); load({ mode: "sample", value: "" }); }}>See an invented example</button>
            </p>
          </div>
        </form>
        {showKeys && settings && <KeysPanel id={uid + "-keys"} settings={settings} onSaved={setSettings} />}
      </section>
      <section className="route" aria-labelledby="route-title" aria-busy={loading}>
        <header className="route-header">
          <h2 id="route-title" ref={routeHeading} tabIndex={-1}>{titleFor(investigation)}</h2>
          <div className="route-meta">
            <p className="stamp">{real ? "Ethereum mainnet, block " + investigation.blockNumber : "An invented example"}</p>
            {real && <button type="button" className="text-button" onClick={() => navigator.clipboard.writeText(location.href).then(() => setCopied(true)).catch(() => undefined)}>{copied ? "Link copied" : "Copy link"}</button>}
            {real && <span className="sr-only" aria-live="polite">{copied ? "Link copied" : ""}</span>}
          </div>
        </header>
        <AiExplanation key={investigation.id + investigation.blockNumber} investigation={investigation} available={Boolean(settings?.ai)} onAddKey={() => { setShowKeys(true); requestAnimationFrame(() => document.getElementById(uid + "-keys")?.scrollIntoView({ block: "start" })); }} />
        <ol className="trail" role="list" aria-label="The route, from starting point to the end of the evidence">
          <li className="terminus">
            <span className="marker" aria-hidden="true" />
            <p className="stop-label">Starting point</p>
            <h3 className="stop-title">{startTitle(investigation)}</h3>
            <p className="stop-meta"><Address value={investigation.subject} investigation={investigation} onFollow={onFollow} /></p>
            {investigation.from && <p className="stop-meta">Compared with <Address value={investigation.from} investigation={investigation} onFollow={onFollow} /></p>}
            {investigation.transactionHash && <p className="stop-meta">Transaction <a className="hash" href={etherscanTx(investigation.transactionHash)} target="_blank" rel="noreferrer noopener" title={"View " + investigation.transactionHash + " on Etherscan"}>{shortHash(investigation.transactionHash)}</a>{investigation.status === "failed" && <strong className="failed"> failed</strong>}</p>}
            {real && <p className="stop-meta"><a className="text-link" href={etherscanAddress(investigation.subject)} target="_blank" rel="noreferrer noopener">View it on Etherscan<span className="sr-only"> (opens in a new tab)</span></a></p>}
            <p className="stop-meta">{real ? investigation.explanation.summary : "Invented Ethereum-style data at block " + investigation.blockNumber + ". " + asSentence(investigation.coverage.summary)}</p>
          </li>
          {(investigation.checks ?? []).map((check, index) => <li key={investigation.id + check.id} id={"check-" + check.id} className={"stop check check-" + check.status}>
            <span className="marker" aria-hidden="true" />
            <p className="stop-label">Check {index + 1}. {checkStatus[check.status]}</p>
            <h3 className="stop-title">{check.title}.</h3>
            <p className="stop-meta">{check.detail}</p>
          </li>)}
          {investigation.movements.map((movement, index) => {
            const notes = investigation.warnings.filter(item => item.evidenceId === movement.evidenceId);
            const warning = notes[0];
            const txHash = movement.transactionHash ?? investigation.transactionHash;
            const isOpen = open === movement.id;
            const key = uid + "-stop-" + index;
            return <li key={investigation.id + movement.id} id={"stop-" + (index + 1)} className={"stop" + (warning ? " has-warning" : "") + (isOpen ? " is-open" : "")}>
              <span className="marker" aria-hidden="true" />
              <p className="stop-label" id={key + "-label"}>Stop {index + 1}. {movement.description.startsWith("Active") ? movement.description : kindName[movement.kind]}</p>
              <h3 className="stop-title"><Headline movement={movement} investigation={investigation} /></h3>
              <p className="stop-route"><Address value={movement.from} investigation={investigation} onFollow={onFollow} /><ArrowRight className="route-arrow" size={16} aria-hidden="true" /><span className="sr-only">to</span><Address value={movement.to} investigation={investigation} onFollow={onFollow} /></p>
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
