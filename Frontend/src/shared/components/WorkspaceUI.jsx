import { useState } from "react";
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

export function WorkspacePage({ children, width = 900, outerStyle, contentStyle }) {
  return (
    <div className="portal-page" style={{ minHeight: "100%", background: "transparent", ...(outerStyle || {}) }}>
      <div
        style={{
          padding: "var(--portal-space-13) var(--portal-space-12) var(--portal-space-14)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: width,
            margin: "0 auto",
            ...(contentStyle || {}),
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function WorkspaceSectionHeader({ eyebrow, title, subtitle, action, icon }) {
  const { C } = usePortalTheme();
  return (
    <div style={{ marginBottom: 28 }}>
      {eyebrow && (
        <div style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
          {eyebrow}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {icon ? (
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: C.purpleDim,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.purple, flexShrink: 0,
            }}>
              {icon}
            </div>
          ) : null}
          <div>
            <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>{title}</h1>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.5, color: C.t3 }}>{subtitle}</p>}
          </div>
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  );
}

export function WorkspaceCard({ children, style, hoverable = false }) {
  const { C } = usePortalTheme();
  const [hovered, setHovered] = useState(false);
  const isHovered = hoverable && hovered;
  return (
    <div
      className="portal-card"
      onMouseEnter={hoverable ? () => setHovered(true) : undefined}
      onMouseLeave={hoverable ? () => setHovered(false) : undefined}
      style={{
        border: `1px solid ${isHovered ? C.purple : C.border}`,
        padding: 24,
        marginBottom: 20,
        background: isHovered ? C.cardHover : C.card,
        transition: "border-color var(--portal-duration-fast) ease, background var(--portal-duration-fast) ease",
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
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: C.t1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.45, color: C.t3, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function WorkspaceTabs({ items, value, onChange }) {
  const { C } = usePortalTheme();
  return (
    <div className="portal-pill-track" style={{ flexWrap: "wrap" }}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`portal-pill-segment${active ? " is-active" : ""}`}
            style={{
              color: active ? C.t1 : C.t3,
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
                transition: "all var(--portal-duration-slow) cubic-bezier(0.4, 0, 0.2, 1)",
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
    <div className="portal-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

export function WorkspaceInput(props) {
  const { C } = usePortalTheme();
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: "100%",
        padding: "10px 14px",
        border: `1px solid ${focused ? C.purple : C.border}`,
        background: C.inp,
        color: C.t1,
        fontSize: 13,
        outline: "none",
        boxShadow: focused ? `0 0 0 3px ${C.purpleDim}` : "none",
        borderRadius: "var(--portal-radius-sm, 10px)",
        transition: "border-color var(--portal-duration-fast) ease, box-shadow var(--portal-duration-fast) ease",
        ...(props.style || {}),
      }}
    />
  );
}

export function WorkspaceSelect(props) {
  const { C } = usePortalTheme();
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: "100%",
        padding: "10px 14px",
        border: `1px solid ${focused ? C.purple : C.border}`,
        background: C.inp,
        color: C.t1,
        fontSize: 13,
        outline: "none",
        cursor: "pointer",
        boxShadow: focused ? `0 0 0 3px ${C.purpleDim}` : "none",
        borderRadius: "var(--portal-radius-sm, 10px)",
        transition: "border-color var(--portal-duration-fast) ease, box-shadow var(--portal-duration-fast) ease",
        ...(props.style || {}),
      }}
    />
  );
}

export function WorkspaceButton({ variant = "primary", children, style, ...props }) {
  const { C } = usePortalTheme();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const h = hovered && !props.disabled;
  const p = pressed && !props.disabled;

  const variants = {
    primary: {
      background: C.purple,
      color: "#ffffff",
      border: "none",
    },
    ghost: {
      background: C.bgElevated,
      color: C.t2,
      border: `1px solid ${C.border}`,
    },
    outline: {
      background: "transparent",
      color: C.purple,
      border: `1px solid ${C.purple}`,
    },
    danger: {
      background: "transparent",
      color: C.danger,
      border: `1px solid ${C.danger}`,
    },
  };
  const current = variants[variant] || variants.primary;
  return (
    <button
      {...props}
      className={`portal-btn portal-btn-${variant === "primary" ? "primary" : variant === "ghost" ? "ghost" : variant === "outline" ? "outline" : "danger"}`}
      onMouseEnter={(event) => { setHovered(true); props.onMouseEnter?.(event); }}
      onMouseLeave={(event) => { setHovered(false); setPressed(false); props.onMouseLeave?.(event); }}
      onMouseDown={(event) => { setPressed(true); props.onMouseDown?.(event); }}
      onMouseUp={(event) => { setPressed(false); props.onMouseUp?.(event); }}
      style={{
        opacity: props.disabled ? 0.4 : h ? 0.9 : 1,
        transform: p ? "scale(0.98)" : "none",
        ...current,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function WorkspaceBadge({ children, color, status, style, title }) {
  const { C } = usePortalTheme();
  // Auto-color from status string if no explicit color given
  const tone = color || (status ? statusColor(status, C) : C.purple);
  return (
    <span className="portal-badge" title={title} style={{
      background: `${tone}18`,
      color: tone,
      border: `1px solid ${tone}28`,
      whiteSpace: "nowrap",
      display: "inline-block",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      verticalAlign: "middle",
      ...style,
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
      padding: "var(--portal-space-12) var(--portal-space-12)",
      background: C.bgElevated,
      borderRadius: "var(--portal-radius-md, 12px)",
      border: `2px dashed ${C.border}`,
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56, borderRadius: "var(--portal-radius-md, 12px)",
          background: C.purpleDim, color: C.purple,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto var(--portal-space-8)",
          border: `1px solid ${C.purple}33`,
        }}>
          {icon}
        </div>
      )}
      {!icon && (
        <div style={{
          width: 56, height: 56, borderRadius: "var(--portal-radius-md, 12px)",
          background: C.bgElevated, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto var(--portal-space-8)",
          color: C.t3, fontSize: 28,
        }}>
          ○
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, color: C.t2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.55, color: C.t3, maxWidth: 280, margin: "var(--portal-space-2) auto 0" }}>{subtitle}</div>}
    </div>
  );
}
