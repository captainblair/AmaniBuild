type ProgressRingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
};

export function ProgressRing({
  percent,
  size = 112,
  stroke = 8,
  label = "Complete",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = 14;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;

  return (
    <div className="portal-ring" style={{ width: size, height: size }} aria-label={`${clamped}% ${label}`}>
      <svg viewBox="0 0 36 36" width={size} height={size}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--dash-line, #e2e8f0)" strokeWidth={stroke / 3.5} />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--orange)"
          strokeWidth={stroke / 3.5}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <div className="portal-ring__label">
        <strong>{Math.round(clamped)}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
