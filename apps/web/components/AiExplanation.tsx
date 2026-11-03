"use client";
import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import type { Investigation } from "../../../packages/core/src/investigation";
type Result = { summary: string; uncertainty: string; citations: string[]; model: string; provider: string; costUsd: number | null; seconds: number };
const citation = /\b((?:stop-\d+)|(?:check-[a-z0-9-]+))\b/gi;
function Cited({ text }: { text: string }) {
  const parts = text.split(citation);
  return <>{parts.map((part, index) => index % 2 ? <a key={index} className="citation" href={"#" + part.toLowerCase()}>{part.replace("-", " ")}</a> : part)}</>;
}
export function AiExplanation({ investigation, available, onAddKey }: { investigation: Investigation; available: boolean; onAddKey: () => void }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  async function explain() {
    setState("loading");
    setError("");
    const started = Date.now();
    try {
      const response = await fetch("/api/explanations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investigation }) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.summary) { setError(body?.error ?? "The explanation couldn’t be written. Try again in a moment."); setState("error"); return; }
      setResult({ ...body, seconds: Math.round((Date.now() - started) / 1000) });
      setState("done");
    } catch { setError("ChainSightline couldn’t be reached. Is it still running?"); setState("error"); }
  }
  if (!available) return <div className="ai"><p className="ai-intro"><Sparkles size={16} aria-hidden="true" /> AI can explain this route in plain words, citing each stop. <button type="button" className="text-button" onClick={onAddKey}>Add an OpenRouter key</button> to turn it on.</p></div>;
  return <div className="ai" aria-live="polite">
    {state === "idle" && <button type="button" className="ai-button" onClick={explain}><Sparkles size={16} aria-hidden="true" /> Explain this with AI</button>}
    {state === "loading" && <p className="ai-intro"><LoaderCircle className="spin" size={16} aria-hidden="true" /> The AI is reading the route. This can take up to a minute.</p>}
    {state === "error" && <p className="ai-intro ai-error">{error} <button type="button" className="text-button" onClick={explain}>Try again</button></p>}
    {state === "done" && result && <div className="ai-result">
      <p className="ai-label"><Sparkles size={14} aria-hidden="true" /> AI explanation</p>
      <p className="ai-summary"><Cited text={result.summary} /></p>
      {result.citations.length > 0 && <p className="ai-cites">Based on {result.citations.map((id, index) => <span key={id}>{index ? ", " : ""}<a className="citation" href={"#" + id.toLowerCase()}>{id.replace("-", " ")}</a></span>)}.</p>}
      <p className="ai-unknown"><strong>What it can’t tell you.</strong> <Cited text={result.uncertainty} /></p>
      <p className="ai-meta">Written by {result.model} through OpenRouter in {result.seconds} seconds{result.costUsd !== null ? ", costing $" + result.costUsd.toFixed(4) : ""}. AI can be wrong: check the stops it cites.</p>
    </div>}
  </div>;
}
