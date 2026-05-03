import { Info } from "lucide-react";

export const COLORS = {
  green: "var(--db-series-teal)",
  red: "var(--db-series-rose)",
  blue: "var(--db-series-indigo)",
  purple: "var(--db-series-lavender)",
  pink: "var(--db-series-peony)",
  muted: "var(--db-series-slate)",
  glow: "var(--db-series-amber)",
};

export function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`db-filter-pill ${active ? "active" : ""}`}
    >
      {label}
    </button>
  );
}

export function FilterGroup({ options, value, onChange }) {
  return (
    <div className="db-filter-group">
      {options.map((option) => (
        <FilterPill
          key={option}
          label={option}
          active={value === option}
          onClick={() => onChange(option)}
        />
      ))}
    </div>
  );
}

export function CardHeader({ title, infoText, children }) {
  return (
    <div className="db-card-header">
      <div className="db-card-title-group">
        <div className="db-card-title">{title}</div>
        {infoText ? (
          <div className="db-info-icon" title={infoText}>
            <Info size={14} strokeWidth={2.5} />
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function Badge({ children, colorName = "blue" }) {
  return <span className={`db-badge ${colorName}`}>{children}</span>;
}

export function ProgressBar({ value, max, colorHex = "#3b82f6" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="db-progress-bg">
      <div className="db-progress-fill" style={{ width: `${pct}%`, background: colorHex }} />
    </div>
  );
}

export function MiniStat({ label, value, colorHex = "#ffffff" }) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--db-text-secondary)",
          marginBottom: "0.25rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: colorHex, fontFamily: "'Lora', serif" }}>
        {value}
      </div>
    </div>
  );
}

export function priorityToColor(priority = "") {
  const normalized = priority.toLowerCase();
  if (normalized === "critical") return "red";
  if (normalized === "high") return "purple";
  if (normalized === "medium") return "blue";
  return "green";
}

export function StoryTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="db-story-tooltip">
      <p>{formatter(payload, label)}</p>
    </div>
  );
}
