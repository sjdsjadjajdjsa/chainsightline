export function Brand({ compact = false }: { compact?: boolean }) {
  return <a className="brand" href="/" aria-label="ChainSightline home"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 3 15 8.5v17L20 37 5 28.5v-17Z"/><path d="m13 14 7-4 7 4v8l-7 4-7-4Z"/><path d="m17 18 2 2 5-5"/></svg>{!compact && <span>ChainSightline<span className="brand-caption">FOLLOW THE EVIDENCE</span></span>}</a>;
}
