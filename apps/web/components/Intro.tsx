export function Intro() {
  return <div className="intro-overlay" aria-hidden="true">
    <div className="intro-mark">
      <svg viewBox="0 0 28 28"><path className="intro-line" pathLength={1} d="M14 3.5v21" /><circle className="intro-stop intro-stop-1" cx="14" cy="3.5" r="2.6" /><circle className="intro-stop intro-stop-2" cx="14" cy="14" r="2.6" /><circle className="intro-stop intro-stop-3" cx="14" cy="24.5" r="2.6" /></svg>
      <span className="intro-word">ChainSightline</span>
    </div>
    <span className="intro-rail" />
  </div>;
}
