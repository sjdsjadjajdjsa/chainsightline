"use client";
import { useId, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
export type KeyName = "drpc" | "alchemy" | "openrouter";
export type Settings = { primary: string; addressHistory: boolean; ai: boolean; sources: Partial<Record<KeyName, "environment" | "saved">>; canSave: boolean; file: string | null };
const keys: { name: KeyName; label: string; purpose: string; href: string; steps: string }[] = [
  { name: "drpc", label: "dRPC", purpose: "Faster, more reliable transaction lookups.", href: "https://drpc.org/login", steps: "Create a key, open its Settings tab and copy the key." },
  { name: "alchemy", label: "Alchemy", purpose: "Adds address history, wallet checkups, and comparing a payment with your own history.", href: "https://www.alchemy.com", steps: "Create an app for Ethereum and copy its API key." },
  { name: "openrouter", label: "OpenRouter", purpose: "Adds AI explanations of a route, written by Kimi K3.1 Pro and citing each stop. Costs about one or two cents each.", href: "https://openrouter.ai/settings/keys", steps: "Create a key, add a little credit and copy the key." },
];
function KeyRow({ entry, settings, onSaved }: { entry: (typeof keys)[number]; settings: Settings; onSaved: (settings: Settings) => void }) {
  const id = useId();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const source = settings.sources[entry.name];
  async function send(next: string | null) {
    setBusy(true);
    setMessage(next === null ? null : { text: "Checking it with " + entry.label + "…", error: false });
    try {
      const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: entry.name, value: next }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setMessage({ text: body?.error ?? "The key couldn’t be saved.", error: true }); return; }
      setValue("");
      setMessage({ text: next === null ? "Removed." : "It works. Saved on this computer.", error: false });
      onSaved(body as Settings);
    } catch {
      setMessage({ text: "ChainSightline couldn’t be reached. Is it still running?", error: true });
    } finally {
      setBusy(false);
    }
  }
  return <div className="key-row">
    <div className="key-text">
      <h3 id={id + "-title"}>{entry.label} key</h3>
      <p>{entry.purpose}</p>
      <p className="key-get"><a href={entry.href} target="_blank" rel="noreferrer noopener">Get a free {entry.label} key<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a> {entry.steps}</p>
    </div>
    {source === "environment"
      ? <p className="key-status">Set in your .env file. Change it there.</p>
      : <form className="key-form" onSubmit={event => { event.preventDefault(); if (!busy && value.trim()) send(value); }}>
          <input type="password" value={value} onChange={event => { setValue(event.target.value); setMessage(null); }} placeholder={source === "saved" ? "Saved. Paste a new key to replace it" : "Paste the key or its link"} aria-labelledby={id + "-title"} aria-describedby={id + "-status"} autoComplete="off" spellCheck={false} disabled={!settings.canSave} />
          <button type="submit" aria-disabled={busy || !value.trim()}>{busy && message ? <LoaderCircle className="spin" size={16} aria-label="Checking" /> : "Save"}</button>
          {source === "saved" && <button type="button" className="text-button" onClick={() => send(null)} disabled={busy}>Remove</button>}
        </form>}
    <p id={id + "-status"} className={"key-message" + (message?.error ? " is-error" : "")} aria-live="polite">{message?.text ?? (source === "saved" ? "Saved on this computer." : "")}</p>
  </div>;
}
export function KeysPanel({ settings, onSaved, id }: { settings: Settings; onSaved: (settings: Settings) => void; id: string }) {
  return <section className="keys" id={id} aria-label="Your keys">
    <p className="keys-intro">ChainSightline works without keys, using dRPC’s free public access. Your own keys make lookups faster and unlock address history, wallet checkups and AI explanations. They stay on this computer and are only sent to the provider they belong to.</p>
    {keys.map(entry => <KeyRow key={entry.name} entry={entry} settings={settings} onSaved={onSaved} />)}
    {settings.file && <p className="keys-file">Keys you save here are kept in <span className="hash">{settings.file}</span>.</p>}
  </section>;
}
