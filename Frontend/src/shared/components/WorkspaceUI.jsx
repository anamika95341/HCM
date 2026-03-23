import { usePortalTheme } from "../theme/portalTheme.jsx";

export function WorkspacePage({ children, width = 1240 }) {
  const { C } = usePortalTheme();
  return (
    <div style={{ minHeight: "100%", background: C.bg }}>
      <div style={{ maxWidth: width, margin: "0 auto", padding: "24px" }}>
        {children}
      </div>
    </div>
  );
}

export function WorkspaceSectionHeader({ eyebrow, title, subtitle, action, icon }) {
  const { C } = usePortalTheme();
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow && (
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 10 }}>
          {eyebrow}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {icon ? (
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", color: C.purple, flexShrink: 0 }}>
              {icon}
            </div>
          ) : null}
          <div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 600, color: C.t1 }}>{title}</h1>
            {subtitle && <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.7, color: C.t3 }}>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

export function WorkspaceCard({ children, style }) {
  const { C } = usePortalTheme();
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: 24,
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: subtitle ? "flex-start" : "center", gap: 12, paddingBottom: 16, marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function WorkspaceTabs({ items, value, onChange }) {
  const { C } = usePortalTheme();
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 4, borderRadius: 999, background: C.bgElevated, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)", flexWrap: "wrap" }}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "8px 12px",
              cursor: "pointer",
              background: active ? C.card : "transparent",
              color: active ? C.t1 : C.t3,
              fontSize: 12,
              fontWeight: 600,
              boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {item.label}
            {typeof item.count === "number" ? ` (${item.count})` : ""}
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

export function WorkspaceStatCard({ label, value, accent }) {
  const { C } = usePortalTheme();
  const color = accent || C.purple;
  return (
    <WorkspaceCard style={{ padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </WorkspaceCard>
  );
}

export function WorkspaceInput(props) {
  const { C } = usePortalTheme();
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.inp,
        color: C.t1,
        fontSize: 13,
        outline: "none",
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
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.inp,
        color: C.t1,
        fontSize: 13,
        outline: "none",
        ...(props.style || {}),
      }}
    />
  );
}

export function WorkspaceButton({ variant = "primary", children, style, ...props }) {
  const { C } = usePortalTheme();
  const variants = {
    primary: { background: C.purple, color: "#fff", border: "none" },
    ghost: { background: C.bgElevated, color: C.t2, border: `1px solid ${C.border}` },
    outline: { background: "transparent", color: C.purple, border: `1px solid ${C.purple}` },
    danger: { background: "transparent", color: C.danger, border: `1px solid ${C.danger}` },
  };
  const current = variants[variant];
  return (
    <button
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...current,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function WorkspaceBadge({ children, color }) {
  const { C } = usePortalTheme();
  const tone = color || C.purple;
  return (
    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${tone}20`, color: tone }}>
      {children}
    </span>
  );
}

export function WorkspaceEmptyState({ title, subtitle }) {
  const { C } = usePortalTheme();
  return (
    <WorkspaceCard style={{ textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.t3, marginTop: 8 }}>{subtitle}</div>}
    </WorkspaceCard>
  );
}
