import { usePortalTheme } from "../theme/portalTheme.jsx";

// Derive a semantic color from a status string
function statusColor(status, C) {
  if (!status) return C.purple;
  const s = status.toLowerCase().replace(/[_\s-]/g, "");
  if (/^(verified|resolved|completed|scheduled|active|accepted|approved)$/.test(s)) return C.mint;
  if (/^(rejected|cancelled|notverified|locked|failed)$/.test(s)) return C.danger;
  if (/^(pending|submitted|inreview|assigned|verificationpending|deptcontactidentified|callscheduled|followup|escalatedtomeeting|escalated)$/.test(s)) return C.warn;
  return C.purple;
}

export function WorkspacePage({ children, width = 1240 }) {
  const { C } = usePortalTheme();
  return (
    <div style={{ minHeight: "100%", background: C.bg }}>
      <div style={{ maxWidth: width, margin: "0 auto", padding: "32px 28px 40px" }}>
        {children}
      </div>
    </div>
  );
}

export function WorkspaceSectionHeader({ eyebrow, title, subtitle, action, icon }) {
  const { C } = usePortalTheme();
  return (
    <div style={{ marginBottom: 30 }}>
      {eyebrow && (
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 10 }}>
          {eyebrow}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {icon ? (
            <div style={{
              width: 46, height: 46, borderRadius: 13,
              background: C.purpleDim,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.purple, flexShrink: 0,
              border: `1px solid ${C.purple}22`,
            }}>
              {icon}
            </div>
          ) : null}
          <div>
            <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.2, fontWeight: 700, color: C.t1, letterSpacing: "-0.02em" }}>{title}</h1>
            {subtitle && <p style={{ margin: "5px 0 0", fontSize: 13, lineHeight: 1.6, color: C.t3 }}>{subtitle}</p>}
          </div>
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  );
}

export function WorkspaceCard({ children, style }) {
  const { C } = usePortalTheme();
  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${C.card} 0%, ${C.bgElevated} 100%)`,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: 24,
        boxShadow: "0 10px 30px rgba(15,23,42,0.05), 0 2px 8px rgba(15,23,42,0.03)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function WorkspaceCardHeader({ title, subtitle, action }) {
  const { C } = usePortalTheme();
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: subtitle ? "flex-start" : "center",
      gap: 12, paddingBottom: 16, marginBottom: 20,
      borderBottom: `1px solid ${C.borderLight}`,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, letterSpacing: "-0.01em" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function WorkspaceTabs({ items, value, onChange }) {
  const { C } = usePortalTheme();
  return (
    <div style={{
      display: "inline-flex", gap: 2, padding: "4px",
      borderRadius: 12, background: C.bgElevated,
      border: `1px solid ${C.border}`,
      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(255,255,255,0.65)",
      flexWrap: "wrap",
    }}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              border: "none",
              borderRadius: 9,
              padding: "7px 13px",
              cursor: "pointer",
              background: active ? C.card : "transparent",
              color: active ? C.purple : C.t3,
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              boxShadow: active ? "0 4px 12px rgba(15,23,42,0.08)" : "none",
              transition: "all 0.18s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 18, height: 18, padding: "0 5px",
                borderRadius: 999, fontSize: 10, fontWeight: 700,
                background: active ? C.purpleDim : `${C.t3}20`,
                color: active ? C.purple : C.t3,
                transition: "all 0.18s ease",
              }}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function WorkspaceStatGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
      {items.map((item) => (
        <WorkspaceStatCard key={item.label} {...item} />
      ))}
    </div>
  );
}

export function WorkspaceStatCard({ label, value, accent, icon }) {
  const { C } = usePortalTheme();
  const color = accent || C.purple;
  return (
    <div style={{
      background: C.card,
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      padding: "18px 20px",
      borderLeft: `3px solid ${color}`,
      boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${color}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</div>
    </div>
  );
}

export function WorkspaceInput(props) {
  const { C } = usePortalTheme();
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "9px 13px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.inp,
        color: C.t1,
        fontSize: 13,
        outline: "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
        ...(props.style || {}),
      }}
    />
  );
}

export function WorkspaceSelect(props) {
  const { C } = usePortalTheme();
  return (
    <select
      {...props}
      style={{
        width: "100%",
        padding: "9px 13px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.inp,
        color: C.t1,
        fontSize: 13,
        outline: "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
        ...(props.style || {}),
      }}
    />
  );
}

export function WorkspaceButton({ variant = "primary", children, style, ...props }) {
  const { C } = usePortalTheme();
  const variants = {
    primary: {
      background: C.purple, color: "#fff", border: "none",
      boxShadow: `0 10px 18px ${C.purple}20, 0 2px 6px ${C.purple}18`,
    },
    ghost: {
      background: C.bgElevated, color: C.t2, border: `1px solid ${C.border}`,
      boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
    },
    outline: { background: "transparent", color: C.purple, border: `1px solid ${C.purple}`, boxShadow: "none" },
    danger: { background: "transparent", color: C.danger, border: `1px solid ${C.danger}`, boxShadow: "none" },
  };
  const current = variants[variant] || variants.primary;
  return (
    <button
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "9px 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.55 : 1,
        transition: "opacity 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
        letterSpacing: "-0.01em",
        ...current,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function WorkspaceBadge({ children, color, status }) {
  const { C } = usePortalTheme();
  // Auto-color from status string if no explicit color given
  const tone = color || (status ? statusColor(status, C) : C.purple);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: `${tone}18`,
      color: tone,
      border: `1px solid ${tone}28`,
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

export function WorkspaceEmptyState({ title, subtitle, icon }) {
  const { C } = usePortalTheme();
  return (
    <div style={{
      textAlign: "center",
      padding: "52px 28px",
      background: `linear-gradient(180deg, ${C.card} 0%, ${C.bgElevated} 100%)`,
      borderRadius: 16,
      border: `1.5px dashed ${C.border}`,
      boxShadow: "0 8px 22px rgba(15,23,42,0.04)",
    }}>
      {icon && (
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: C.purpleDim, color: C.purple,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          border: `1px solid ${C.purple}20`,
        }}>
          {icon}
        </div>
      )}
      {!icon && (
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: C.bgElevated, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          color: C.t3, fontSize: 20,
        }}>
          ○
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, letterSpacing: "-0.01em" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.t3, marginTop: 6, lineHeight: 1.6, maxWidth: 280, margin: "6px auto 0" }}>{subtitle}</div>}
    </div>
  );
}
