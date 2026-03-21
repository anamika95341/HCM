import React, { useState, createContext, useContext, useEffect, useLayoutEffect } from "react";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

const THEMES = {
  dark: {
    bg: '#0a0a0a',
    bgElevated: '#111111',
    card: '#161616',
    cardHover: '#1a1a1a',
    border: '#262626',
    borderLight: '#1f1f1f',
    purple: '#a855f7',
    purpleDim: 'rgba(168,85,247,0.15)',
    mint: '#34d399',
    mintDim: 'rgba(52,211,153,0.15)',
    t1: '#ffffff',
    t2: '#a3a3a3',
    t3: '#737373',
    inp: '#1a1a1a',
    danger: '#ef4444',
    warn: '#f59e0b',
    success: '#34d399',
    scrollbar: '#2e2e2e',
    scrollbarHover: '#404040',
    navHover: 'rgba(255,255,255,0.04)',
  },
  light: {
    bg: '#f5f5f5',
    bgElevated: '#ffffff',
    card: '#ffffff',
    cardHover: '#fafafa',
    border: '#e5e5e5',
    borderLight: '#ebebeb',
    purple: '#7c3aed',
    purpleDim: 'rgba(124,58,237,0.12)',
    mint: '#059669',
    mintDim: 'rgba(5,150,105,0.12)',
    t1: '#171717',
    t2: '#525252',
    t3: '#737373',
    inp: '#fafafa',
    danger: '#dc2626',
    warn: '#d97706',
    success: '#059669',
    scrollbar: '#d4d4d4',
    scrollbarHover: '#a3a3a3',
    navHover: 'rgba(0,0,0,0.04)',
  },
};

const ThemeContext = createContext({ theme: 'dark', rawTheme: 'dark', setTheme: () => { }, C: THEMES.dark });
const useTheme = () => useContext(ThemeContext);

const getGlobalStyles = (theme) => {
  const C = THEMES[theme];
  return `
  @import url('${FONT_URL}');
  .settings-portal, .settings-portal *, .settings-portal *::before, .settings-portal *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .settings-portal { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
  .settings-portal input, .settings-portal select, .settings-portal button, .settings-portal textarea { font-family: 'Inter', system-ui, sans-serif; }
  .settings-portal input:focus, .settings-portal select:focus { border-color: ${C.purple} !important; box-shadow: 0 0 0 3px ${C.purpleDim} !important; outline: none; }
  .settings-portal input[type=color] { padding: 0; cursor: pointer; }
  .settings-portal::-webkit-scrollbar, .settings-portal *::-webkit-scrollbar { width: 6px; }
  .settings-portal::-webkit-scrollbar-track, .settings-portal *::-webkit-scrollbar-track { background: transparent; }
  .settings-portal::-webkit-scrollbar-thumb, .settings-portal *::-webkit-scrollbar-thumb { background: ${C.scrollbar}; border-radius: 10px; }
  .settings-portal::-webkit-scrollbar-thumb:hover, .settings-portal *::-webkit-scrollbar-thumb:hover { background: ${C.scrollbarHover}; }
  .settings-portal button { transition: opacity 0.2s ease, transform 0.2s ease; }
  .settings-portal button:hover { opacity: 0.9; }
  .settings-portal button:active { transform: scale(0.98); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;
};

// ── ICONS (thin line style) ──
function Ico({ n, s = 18, c = 'currentColor', w = 1.5, style }) {
  const P = {
    person: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
    bell: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
    sliders: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
    people: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
    monitor: ['M2 3h20v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3z', 'M8 21h8', 'M12 18v3'],
    database: ['M12 2C6.48 2 2 3.79 2 6.5S6.48 11 12 11s10-1.79 10-4.5S17.52 2 12 2z', 'M2 6.5v5C2 14.21 6.48 16 12 16s10-1.79 10-4.5v-5', 'M2 11.5v5C2 19.21 6.48 21 12 21s10-1.79 10-4.5v-5'],
    shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
    lock: ['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
    mail: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
    phone: ['M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2H7a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.9 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z'],
    upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
    calendar: ['M3 4h18v18H3z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
    edit: ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'],
    check: ['M20 6L9 17l-5-5'],
    x: ['M18 6L6 18', 'M6 6l12 12'],
    plus: ['M12 5v14', 'M5 12h14'],
    settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
    dashboard: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
    clock: ['M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z', 'M12 6v6l4 2'],
    info: ['M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z', 'M12 16v-4', 'M12 8h.01'],
    list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
    home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
    search: ['M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z'],
    chevronDown: ['M6 9l6 6 6-6'],
    barChart: ['M12 20V10', 'M18 20V4', 'M6 20v-4'],
    briefcase: ['M21 13.255A23.9 23.9 0 0 1 12 15c-3.2 0-6.2-.6-9-1.7M3 5a23.9 23.9 0 0 1 9-1.7m9 1.7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10'],
    coin: ['M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
    help: ['M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
    sun: ['M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'],
    moon: ['M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'],
  };
  const paths = P[n] || P.settings;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

// ── PILL SEGMENTED CONTROL (soft UI) ──
const PillSegmented = ({ options, value, onChange }) => {
  const { C } = useTheme();
  return (
    <div style={{
      display: 'inline-flex', padding: 4, borderRadius: 999, background: C.bgElevated,
      boxShadow: C.bg === '#0a0a0a' ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.08)', borderRadius: 999, gap: 2,
    }}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999,
              border: 'none', cursor: 'pointer', background: active ? C.card : 'transparent',
              color: active ? C.t1 : C.t3, fontSize: 12, fontWeight: 500,
              boxShadow: active ? (C.bg === '#0a0a0a' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.1)') : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {opt.icon && <Ico n={opt.icon} s={14} c={active ? C.t1 : C.t3} w={1.5} />}
            {opt.label}
            {opt.badge && <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: C.mintDim, color: C.mint }}>{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};

// ── PILL TOGGLE (recessed track, elevated pill) ──
const Toggle = ({ on, set }) => {
  const { C } = useTheme();
  const isDark = C.bg === '#0a0a0a';
  return (
    <div
      onClick={() => set(!on)}
      style={{
        width: 44, height: 24, borderRadius: 999, cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: C.bgElevated, boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.08)',
        transition: 'background 0.3s ease',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: 999,
        background: on ? C.purple : C.t3, boxShadow: on ? '0 2px 8px rgba(168,85,247,0.4)' : (isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)'),
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, box-shadow 0.3s ease',
      }} />
    </div>
  );
};

const Card = ({ children, style = {} }) => {
  const { C } = useTheme();
  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 24, marginBottom: 20, transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      ...style,
    }}>
      {children}
    </div>
  );
};

const CH = ({ title, sub, action }) => {
  const { C } = useTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: sub ? 'flex-start' : 'center', marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
};

const TR = ({ label, note, on, set }) => {
  const { C } = useTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.borderLight}`, transition: 'background 0.2s ease' }}>
      <div style={{ paddingRight: 20 }}>
        <div style={{ fontSize: 13, color: C.t1, fontWeight: 500 }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>{note}</div>}
      </div>
      <Toggle on={on} set={set} />
    </div>
  );
};

const Inp = ({ label, value, set, type = 'text', readOnly, icon, placeholder }) => {
  const { C } = useTheme();
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.t2, marginBottom: 6 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Ico n={icon} s={14} c={C.t3} /></div>}
        <input type={type} value={value} onChange={e => set?.(e.target.value)} readOnly={readOnly} placeholder={placeholder}
          style={{ width: '100%', padding: icon ? '10px 14px 10px 38px' : '10px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.t1, background: readOnly ? C.bgElevated : C.inp, transition: 'all 0.2s ease' }} />
      </div>
    </div>
  );
};

const Sel = ({ label, value, onChange, children }) => {
  const { C } = useTheme();
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.t2, marginBottom: 6 }}>{label}</label>}
      <select value={value ?? ''} onChange={e => onChange?.(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.t1, background: C.inp, cursor: 'pointer', transition: 'border-color 0.2s ease' }}>
        {children}
      </select>
    </div>
  );
};

const Btn = ({ label, variant = 'primary', icon, onClick, sm }) => {
  const { C } = useTheme();
  const v = {
    primary: { bg: C.purple, color: '#fff', border: 'none' },
    outline: { bg: 'transparent', color: C.purple, border: `1px solid ${C.purple}` },
    ghost: { bg: C.bgElevated, color: C.t2, border: `1px solid ${C.border}` },
    danger: { bg: 'transparent', color: C.danger, border: `1px solid ${C.danger}` },
  }[variant];
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: sm ? '6px 12px' : '10px 18px', borderRadius: 10, fontSize: sm ? 12 : 13, fontWeight: 600, cursor: 'pointer', background: v.bg, color: v.color, border: v.border || 'none', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>
      {icon && <Ico n={icon} s={sm ? 13 : 15} c={v.color} w={1.5} />}
      {label}
    </button>
  );
};

const Badge = ({ label, color }) => {
  const { C } = useTheme();
  const c = color ?? C.purple;
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: c + '20', color: c, letterSpacing: '.02em' }}>{label}</span>
  );
};

const SH = ({ icon, title, sub }) => {
  const { C } = useTheme();
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: C.purpleDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ico n={icon} s={20} c={C.purple} w={1.5} />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: C.t1 }}>{title}</h2>
          {sub && <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{sub}</p>}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
//  SECTION 1 — PROFILE & ACCOUNT
// ═══════════════════════════════════════════
const ProfileSection = () => {
  const { C } = useTheme();
  const [name, setName] = useState('Shri Gajendra Singh Shekhawat');
  const [contact, setContact] = useState('+91 98100 00000');
  const [email, setEmail] = useState('minister.culture@gov.in');
  const [delegate, setDelegate] = useState(false);
  const [delegateTo, setDelegateTo] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [twoFA, setTwoFA] = useState(true);
  const [smsOTP, setSmsOTP] = useState(true);
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SH icon="person" title="Profile & Account Settings" sub="Manage your personal information, digital signature, and delegation of authority." />
      <Card>
        <CH title="Personal Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Inp label="Full Name" value={name} set={setName} icon="person" />
          <Inp label="Official Designation" value="Union Minister of Culture" readOnly />
          <Inp label="Contact Number" value={contact} set={setContact} icon="phone" type="tel" />
          <Inp label="Official Email ID" value={email} set={setEmail} icon="mail" type="email" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
          <Btn label="Discard" variant="ghost" />
          <Btn label="Save Changes" variant="primary" icon="check" />
        </div>
      </Card>
      <Card>
        <CH title="Digital Signature & e-Sign Integration" sub="Configure your digital signature for one-click task approvals." />
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1, border: `2px dashed ${C.border}`, borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', cursor: 'pointer', background: C.bgElevated, transition: 'all 0.2s ease' }}>
            <Ico n="upload" s={28} c={C.t3} />
            <div style={{ fontSize: 13, fontWeight: 600, color: C.t2 }}>Upload Digital Signature</div>
            <div style={{ fontSize: 11, color: C.t3 }}>Accepted: .p12 · .pfx · .cer · Max 5 MB</div>
            <Btn label="Browse File" variant="outline" sm />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ background: C.mintDim, border: `1px solid rgba(52,211,153,0.3)`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.mint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Current Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: C.mint, boxShadow: `0 0 8px ${C.mint}` }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>e-Sign Active</span>
              </div>
              <div style={{ fontSize: 12, color: C.t2, marginTop: 8 }}>Valid until: 31 March 2026</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>NIC e-Sign Gateway · Last used: 15 Mar 2026</div>
            </div>
            <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.65 }}>Integrated with NIC e-Sign Gateway for one-click approvals.</div>
          </div>
        </div>
      </Card>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>Delegation of Authority</div>
            <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Temporarily delegate approval rights when travelling or on leave.</div>
          </div>
          <Toggle on={delegate} set={setDelegate} />
        </div>
        {delegate ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
            <Sel label="Delegate To (OSD / Officer)" value={delegateTo} onChange={setDelegateTo}>
              <option value="">Select Officer...</option>
              <option>Shri Rajeev Mehta, OSD</option>
              <option>Ms. Priya Sharma, PA to Minister</option>
            </Sel>
            <Inp label="From Date" type="date" value={fromDate} set={setFromDate} />
            <Inp label="To Date" type="date" value={toDate} set={setToDate} />
          </div>
        ) : (
          <div style={{ padding: 16, background: C.bgElevated, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Ico n="info" s={14} c={C.t3} />
              <span style={{ fontSize: 12, color: C.t3 }}>Enable to temporarily assign approval rights to an OSD or subordinate officer during absence.</span>
            </div>
          </div>
        )}
      </Card>
      <Card>
        <CH title="Security Settings" />
        <TR label="Two-Factor Authentication (2FA)" note="Require OTP verification at every login session" on={twoFA} set={setTwoFA} />
        <TR label="SMS OTP Configuration" note="Receive one-time passwords via registered mobile (+91 98100 XXXXX)" on={smsOTP} set={setSmsOTP} />
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Btn label="Change Password" variant="outline" icon="lock" />
          <Btn label="View Active Sessions" variant="ghost" icon="monitor" />
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
//  SECTION 2 — NOTIFICATIONS
// ═══════════════════════════════════════════
const NotificationsSection = () => {
  const { C } = useTheme();
  const [ch, setCh] = useState({ app: true, email: true, sms: false });
  const [tr, setTr] = useState({ newTask: true, moved: true, deadline: true, escalation: true, approval: true });
  const [days, setDays] = useState(3);
  const [digest, setDigest] = useState('daily');
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SH icon="bell" title="Notification & Alert Preferences" sub="Control how and when you receive updates from the E-Parinam system." />
      <Card>
        <CH title="Notification Channels" sub="Toggle which delivery channels are active for your account." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { k: 'app', icon: 'bell', label: 'In-App Notifications', sub: 'Bell icon in the top navigation bar', color: C.purple },
            { k: 'email', icon: 'mail', label: 'Email Alerts', sub: 'minister.culture@gov.in', color: C.purple },
            { k: 'sms', icon: 'phone', label: 'SMS Alerts', sub: '+91 98100 XXXXX (registered)', color: C.mint },
          ].map(item => (
            <div key={item.k} style={{ border: `1px solid ${ch[item.k] ? item.color + '40' : C.border}`, borderRadius: 12, padding: 18, background: ch[item.k] ? item.color + '0a' : C.bgElevated, transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ico n={item.icon} s={18} c={item.color} />
                </div>
                <Toggle on={ch[item.k]} set={v => setCh(p => ({ ...p, [item.k]: v }))} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CH title="Trigger Configurations" sub="Select which events generate a notification for your account." />
        {[
          { k: 'newTask', label: 'New task assigned or received in the pipeline' },
          { k: 'moved', label: 'Task progressed to next stage (JS → Secretary → Minister)' },
          { k: 'deadline', label: 'Task approaching its due date' },
          { k: 'escalation', label: 'Automatic escalation triggered for overdue task', badge: 'Critical', bc: C.danger },
          { k: 'approval', label: 'Task is awaiting your approval or action', badge: 'Action Required', bc: C.warn },
        ].map(item => (
          <TR key={item.k}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{item.label}{item.badge && <Badge label={item.badge} color={item.bc} />}</span>}
            on={tr[item.k]} set={v => setTr(p => ({ ...p, [item.k]: v }))} />
        ))}
        {tr.deadline && (
          <div style={{ marginTop: 16, padding: 16, background: C.purpleDim, border: `1px solid rgba(168,85,247,0.3)`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: C.t2 }}>Alert me</span>
            <input type="number" value={days} min={1} max={14} onChange={e => setDays(+e.target.value)}
              style={{ width: 60, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.purple, fontWeight: 700, textAlign: 'center', background: C.inp }} />
            <span style={{ fontSize: 13, color: C.t2 }}>days before the due date</span>
          </div>
        )}
      </Card>
      <Card>
        <CH title="Email Digest Frequency" sub="Choose how often email summaries are delivered to your inbox." />
        <PillSegmented
          options={[
            { id: 'realtime', label: 'Real-Time', icon: 'bell' },
            { id: 'daily', label: 'Daily Digest', icon: 'clock' },
            { id: 'weekly', label: 'Weekly Summary', icon: 'calendar' },
          ]}
          value={digest}
          onChange={setDigest}
        />
        <div style={{ fontSize: 11, color: C.t3, marginTop: 12 }}>
          {digest === 'realtime' && 'Instant alert for every update'}
          {digest === 'daily' && 'Morning pendency report at 8:00 AM'}
          {digest === 'weekly' && 'Comprehensive overview every Monday'}
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
//  SECTION 3 — WORKFLOW & ESCALATIONS
// ═══════════════════════════════════════════
const WorkflowSection = () => {
  const { C } = useTheme();
  const [sla, setSla] = useState([
    { p: 'Critical', c: C.danger, d: 2, v: 2 },
    { p: 'High', c: C.warn, d: 5, v: 5 },
    { p: 'Medium', c: C.purple, d: 15, v: 15 },
    { p: 'Low', c: C.mint, d: 30, v: 30 },
  ]);
  const [esc, setEsc] = useState([
    { id: 1, stage: 'Joint Secretary', days: 7, target: "Secretary's Office" },
    { id: 2, stage: "Secretary's Office", days: 15, target: "Minister's Office" },
    { id: 3, stage: 'Draft Submitted', days: 3, target: 'Joint Secretary' },
  ]);
  const [labels, setLabels] = useState([
    { id: 1, label: 'Draft Submitted', color: '#64748b' },
    { id: 2, label: 'Under Review', color: C.warn },
    { id: 3, label: 'Awaiting Approval', color: C.purple },
    { id: 4, label: 'Closed (Approved)', color: C.mint },
  ]);
  const [nextId, setNextId] = useState(10);
  const TH = ({ children, center }) => (
    <th style={{ padding: '12px 16px', textAlign: center ? 'center' : 'left', fontSize: 10, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', background: C.bgElevated, whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
  const TD = ({ children, center, style = {} }) => (
    <td style={{ padding: '12px 16px', fontSize: 13, color: C.t1, borderBottom: `1px solid ${C.borderLight}`, textAlign: center ? 'center' : 'left', ...style }}>
      {children}
    </td>
  );
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SH icon="sliders" title="Workflow & Escalation Rules" sub="System-level configuration for SLA thresholds, escalation triggers, and pipeline status labels." />
      <Card>
        <CH title="SLA / TAT Definitions by Priority" sub="Set the default turnaround time (days) for each task priority level." />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead><tr><TH>Priority Level</TH><TH>System Default (Days)</TH><TH>Current Setting (Days)</TH><TH>Status</TH></tr></thead>
            <tbody>
              {sla.map((row, i) => (
                <tr key={i}>
                  <TD><span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: row.c }} /><span style={{ fontWeight: 600, color: row.c }}>{row.p}</span></span></TD>
                  <TD style={{ color: C.t3 }}>{row.d} days</TD>
                  <TD>
                    <input type="number" value={row.v} min={1}
                      onChange={e => setSla(p => p.map((r, j) => j === i ? { ...r, v: +e.target.value } : r))}
                      style={{ width: 72, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.t1, background: C.inp }} />
                  </TD>
                  <TD><Badge label={row.v === row.d ? 'Default' : 'Modified'} color={row.v === row.d ? C.t3 : C.warn} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn label="Save SLA Settings" variant="primary" icon="check" /></div>
      </Card>
      <Card>
        <CH title="Escalation Matrix" sub="Configures automatic escalation thresholds and alert targets." action={<Btn label="Add Rule" variant="outline" icon="plus" sm />} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead><tr><TH>Pipeline Stage</TH><TH>Trigger Threshold</TH><TH>Alert Target</TH><TH>&nbsp;</TH></tr></thead>
            <tbody>
              {esc.map(rule => (
                <tr key={rule.id}>
                  <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ padding: '6px 12px', background: C.bgElevated, borderRadius: 8, fontSize: 13, color: C.t1, fontWeight: 500 }}>{rule.stage}</span>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="number" value={rule.days} min={1}
                        onChange={e => setEsc(p => p.map(r => r.id === rule.id ? { ...r, days: +e.target.value } : r))}
                        style={{ width: 60, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.danger, fontWeight: 700, background: C.inp }} />
                      <span style={{ fontSize: 12, color: C.t3 }}>days overdue</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ padding: '6px 12px', background: C.danger + '20', borderRadius: 8, fontSize: 13, color: C.danger, fontWeight: 500 }}>{rule.target}</span>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
                    <button onClick={() => setEsc(p => p.filter(r => r.id !== rule.id))}
                      style={{ width: 32, height: 32, border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgElevated, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>
                      <Ico n="x" s={14} c={C.t3} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CH title="Pipeline Status Labels" sub="Edit labels used across the workflow pipeline." action={<Btn label="Add Status" variant="outline" icon="plus" sm onClick={() => { setLabels(p => [...p, { id: nextId, label: 'New Status', color: C.purple }]); setNextId(n => n + 1); }} />} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {labels.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: C.bgElevated, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <input type="color" value={s.color}
                onChange={e => setLabels(p => p.map((l, j) => j === i ? { ...l, color: e.target.value } : l))}
                style={{ width: 32, height: 32, borderRadius: 8, border: `2px solid ${C.border}`, background: 'none', cursor: 'pointer' }} />
              <input type="text" value={s.label}
                onChange={e => setLabels(p => p.map((l, j) => j === i ? { ...l, label: e.target.value } : l))}
                style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.t1, background: C.inp }} />
              <Badge label={`Stage ${i + 1}`} color={s.color} />
              {labels.length > 2 && (
                <button onClick={() => setLabels(p => p.filter(l => l.id !== s.id))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Ico n="x" s={14} c={C.t3} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn label="Save Labels" variant="primary" icon="check" />
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
//  SECTION 4 — DEPARTMENTS & USERS
// ═══════════════════════════════════════════
const DepartmentSection = () => {
  const { C } = useTheme();
  const depts = [
    { n: 'Archaeological Survey of India', code: 'ASI', js: 'Ms. Lily Pandeya', tasks: 2, active: true },
    { n: 'National Museum', code: 'NM', js: 'Dr. Arvind Kumar', tasks: 0, active: true },
    { n: 'Indira Gandhi Natl. Centre for Arts', code: 'IGNCA', js: 'Shri Samar Nanda', tasks: 0, active: true },
    { n: 'National School of Drama', code: 'NSD', js: 'Shri Kamlesh Kumar Mishra', tasks: 0, active: true },
    { n: 'Sangeet Natak Akademi', code: 'SNA', js: '—', tasks: 0, active: false },
  ];
  const access = [
    { role: "Minister's Office", perms: [true, true, true, true] },
    { role: "Secretary's Office", perms: [false, true, true, true] },
    { role: 'Joint Secretary', perms: [false, true, false, false] },
    { role: 'Department Officer', perms: [false, false, false, false] },
  ];
  const permCols = ['Global Visibility', 'JS-Level Tasks', 'Secretary Level', 'Reports & Analytics'];
  const TH = ({ children, center }) => (
    <th style={{ padding: '12px 16px', textAlign: center ? 'center' : 'left', fontSize: 10, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', background: C.bgElevated, whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SH icon="people" title="Department & User Management" sub="Manage departmental roster, Joint Secretary assignments, and role-based access control." />
      <Card>
        <CH title="Department Roster" sub="Add, edit, or deactivate departments attached to the Ministry." action={<Btn label="Add Department" variant="outline" icon="plus" sm />} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><TH>Department</TH><TH>Code</TH><TH>Assigned JS</TH><TH center>Active Tasks</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
            <tbody>
              {depts.map((d, i) => (
                <tr key={i} style={{ transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 500, color: C.t1, borderBottom: `1px solid ${C.borderLight}` }}>{d.n}</td>
                  <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLight}` }}><Badge label={d.code} color={C.purple} /></td>
                  <td style={{ padding: '14px 16px', fontSize: 12.5, color: C.t2, borderBottom: `1px solid ${C.borderLight}` }}>{d.js}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'center', fontWeight: d.tasks > 0 ? 700 : 400, color: d.tasks > 0 ? C.warn : C.t3, borderBottom: `1px solid ${C.borderLight}` }}>{d.tasks}</td>
                  <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLight}` }}><Badge label={d.active ? 'Active' : 'Inactive'} color={d.active ? C.mint : C.t3} /></td>
                  <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLight}` }}><Btn label="Edit" variant="ghost" icon="edit" sm /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CH title="Access Control & Permissions Matrix" sub="Role-based access controls applied across the E-Parinam portal." />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><TH>Role</TH>{permCols.map(col => <TH key={col} center>{col}</TH>)}</tr></thead>
            <tbody>
              {access.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: C.t1, borderBottom: `1px solid ${C.borderLight}` }}>{row.role}</td>
                  {row.perms.map((has, j) => (
                    <td key={j} style={{ padding: '14px 16px', textAlign: 'center', borderBottom: `1px solid ${C.borderLight}` }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 8, background: has ? C.mintDim : C.bgElevated, border: `1px solid ${has ? C.mint : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {has && <Ico n="check" s={12} c={C.mint} w={2.5} />}
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, padding: 14, background: 'rgba(245,158,11,0.1)', border: `1px solid rgba(245,158,11,0.3)`, borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Ico n="info" s={14} c={C.warn} />
          <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>Permissions are applied at the role level. Individual overrides can be configured by the System Administrator.</span>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
//  SECTION 5 — DISPLAY & DASHBOARD
// ═══════════════════════════════════════════
const DisplaySection = () => {
  const { C, rawTheme: appTheme, setTheme: setAppTheme } = useTheme();
  const [page, setPage] = useState('dashboard');
  const [widgets, setWidgets] = useState({ metrics: true, pipeline: true, escalations: true, chart: true, perf: true, flow: true });
  const pageOpts = [
    { k: 'dashboard', icon: 'dashboard', label: "Minister's Dashboard" },
    { k: 'pendency', icon: 'clock', label: 'Pendency Monitor' },
    { k: 'tasks', icon: 'list', label: 'Task List' },
    { k: 'workflow', icon: 'sliders', label: 'Workflow Pipeline' },
  ];
  const themeOpts = [
    { k: 'light', label: 'Light Mode', sbBg: '#0b1929', main: '#edf1f6' },
    { k: 'dark', label: 'Dark Mode', sbBg: '#060e18', main: '#0d2039' },
    { k: 'system', label: 'Sync with System', sbBg: '#0b1929', main: 'linear-gradient(120deg,#edf1f6 50%,#0d2039 50%)' },
  ];
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SH icon="monitor" title="Display & Dashboard Preferences" sub="Customise your default landing page, colour theme, and dashboard widget visibility." />
      <Card>
        <CH title="Default Landing Page" sub="Choose which page loads immediately after you sign in." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {pageOpts.map(opt => (
            <div key={opt.k} onClick={() => setPage(opt.k)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${page === opt.k ? C.purple : C.border}`, background: page === opt.k ? C.purpleDim : C.bgElevated, transition: 'all 0.2s ease' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: page === opt.k ? C.purple + '30' : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ico n={opt.icon} s={18} c={page === opt.k ? C.purple : C.t3} />
              </div>
              <span style={{ fontSize: 13, fontWeight: page === opt.k ? 600 : 500, color: page === opt.k ? C.purple : C.t1, flex: 1 }}>{opt.label}</span>
              {page === opt.k && <Ico n="check" s={14} c={C.purple} />}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CH title="Theme Preferences" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {themeOpts.map(t => (
            <div key={t.k} onClick={() => setAppTheme(t.k)} style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${appTheme === t.k ? C.purple : C.border}`, transition: 'all 0.2s ease' }}>
              <div style={{ height: 72, background: t.main, position: 'relative', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: 24, background: t.sbBg, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 16, borderRadius: 4, background: t.k === 'dark' ? '#1c3a5a' : 'rgba(255,255,255,.85)' }} />
                  <div style={{ height: 10, borderRadius: 4, background: t.k === 'dark' ? '#1c3a5a' : 'rgba(255,255,255,.7)', width: '70%' }} />
                  <div style={{ height: 10, borderRadius: 4, background: t.k === 'dark' ? '#1c3a5a' : 'rgba(255,255,255,.7)', width: '45%' }} />
                </div>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: appTheme === t.k ? C.purpleDim : C.bgElevated }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: appTheme === t.k ? C.purple : C.t2 }}>{t.label}</span>
                {appTheme === t.k && <Ico n="check" s={13} c={C.purple} />}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CH title="Dashboard Widget Visibility" sub="Toggle which panels appear on your Minister's Dashboard home screen." />
        {[
          { k: 'metrics', label: 'Top Metric Cards', note: 'Pending Approvals · Escalations · Compliance Rate · Avg TAT · Overdue' },
          { k: 'pipeline', label: 'Approval Pipeline Sidebar', note: 'Draft Submitted, Under Review, Awaiting Approval, Closed stage counts' },
          { k: 'escalations', label: 'Escalation Alerts Section', note: "Tasks escalated to the Minister's Office" },
          { k: 'chart', label: 'Task Status Distribution Chart', note: 'Donut chart breakdown of tasks by pipeline stage' },
          { k: 'perf', label: 'Joint Secretary Performance', note: 'Per-JS overview of total, completed, pending, and overdue tasks' },
          { k: 'flow', label: 'Monthly Task Flow Graph', note: 'Created vs completed task trend over rolling 6-month period' },
        ].map(w => (
          <TR key={w.k} label={w.label} note={w.note} on={widgets[w.k]} set={v => setWidgets(p => ({ ...p, [w.k]: v }))} />
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn label="Save Display Settings" variant="primary" icon="check" />
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
//  SECTION 6 — DATA & AUDIT
// ═══════════════════════════════════════════
const DataSection = () => {
  const { C } = useTheme();
  const [autoArchive, setAutoArchive] = useState(true);
  const [archiveDays, setArchiveDays] = useState(30);
  const [exportFmt, setExportFmt] = useState('pdf');
  const [retentionOn, setRetentionOn] = useState(true);
  const [retDays, setRetDays] = useState(365);
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SH icon="database" title="Data & Audit Configurations" sub="Configure archival policies, default export formats, and audit log retention settings." />
      <Card>
        <CH title="Task Archival Policy" />
        <TR label="Automatic Archival of Completed Tasks" note="Automatically move completed tasks from the active board to the Archived tab" on={autoArchive} set={setAutoArchive} />
        {autoArchive && (
          <div style={{ marginTop: 16, padding: 16, background: C.bgElevated, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 10 }}>Archive tasks after completion:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="number" value={archiveDays} onChange={e => setArchiveDays(+e.target.value)}
                style={{ width: 72, padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.purple, fontWeight: 700, background: C.inp }} />
              <span style={{ fontSize: 13, color: C.t2 }}>Days</span>
            </div>
          </div>
        )}
      </Card>
      <Card>
        <CH title="Data Export Preferences" sub="Set the default format for downloading system reports and lists." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {['pdf', 'xlsx', 'csv'].map(fmt => (
            <div key={fmt} onClick={() => setExportFmt(fmt)} style={{ padding: 18, borderRadius: 12, cursor: 'pointer', border: `1px solid ${exportFmt === fmt ? C.purple : C.border}`, background: exportFmt === fmt ? C.purpleDim : C.bgElevated, textAlign: 'center', transition: 'all 0.2s ease' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: exportFmt === fmt ? C.purple : C.t1, textTransform: 'uppercase' }}>{fmt}</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 6 }}>
                {fmt === 'pdf' ? 'Document Format' : fmt === 'xlsx' ? 'Excel Spreadsheet' : 'Comma Separated'}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CH title="Audit Log Retention" sub="Maintain system action logs for compliance, security, and accountability." />
        <TR label="Enable System Audit Logging" note="Record all user logins, actions, workflow changes, and configuration updates" on={retentionOn} set={setRetentionOn} />
        {retentionOn && (
          <div style={{ marginTop: 16, padding: 16, background: C.inp, border: `1px solid ${C.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 13, color: C.t2 }}>Retain logs for</span>
            <input type="number" value={retDays} min={30} onChange={e => setRetDays(+e.target.value)}
              style={{ width: 84, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.purple, fontWeight: 700, textAlign: 'center', background: C.bgElevated }} />
            <span style={{ fontSize: 13, color: C.t2 }}>days before permanent deletion</span>
          </div>
        )}
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
//  MAIN APP (Kangaroo-style layout)
// ═══════════════════════════════════════════
function SettingsPortalContent() {
  const { C, theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [search, setSearch] = useState('');

  const tabs = [
    { id: 'profile', icon: 'person', label: 'Profile & Account' },
    { id: 'notifications', icon: 'bell', label: 'Notifications', badge: '3' },
    { id: 'workflow', icon: 'sliders', label: 'Workflow & SLAs' },
    { id: 'departments', icon: 'people', label: 'Departments & Users' },
    { id: 'display', icon: 'monitor', label: 'Display & Dashboard' },
    { id: 'data', icon: 'database', label: 'Data & Audit' },
  ];

  return (
    <div className="settings-portal" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden', transition: 'background 0.3s ease' }}>

      {/* HEADER */}
      <header style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, flexShrink: 0, background: C.bgElevated }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.purpleDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico n="settings" s={18} c={C.purple} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.t1 }}>Settings</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>
            {theme === 'dark' ? <Ico n="sun" s={16} c={C.t2} /> : <Ico n="moon" s={16} c={C.t2} />}
          </button>
          <div style={{ position: 'relative' }}>
            <Ico n="search" s={14} c={C.t3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search settings..."
              style={{ width: 200, padding: '8px 12px 8px 34px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.t1, background: C.inp, transition: 'border-color 0.2s' }} />
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* SETTINGS SIDEBAR */}
        <div style={{ width: 260, borderRight: `1px solid ${C.border}`, background: C.bgElevated, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flexShrink: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
                background: activeTab === t.id ? C.purpleDim : 'transparent', border: 'none', borderRadius: 10,
                color: activeTab === t.id ? C.purple : C.t3,
                fontSize: 13, fontWeight: activeTab === t.id ? 600 : 500,
                transition: 'all 0.2s ease', textAlign: 'left',
              }}
            >
              <Ico n={t.icon} s={16} c={activeTab === t.id ? C.purple : C.t3} />
              <span style={{ flex: 1 }}>{t.label}</span>
              {t.badge && <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: C.mintDim, color: C.mint }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: C.bg }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {activeTab === 'profile' && <ProfileSection />}
            {activeTab === 'notifications' && <NotificationsSection />}
            {activeTab === 'workflow' && <WorkflowSection />}
            {activeTab === 'departments' && <DepartmentSection />}
            {activeTab === 'display' && <DisplaySection />}
            {activeTab === 'data' && <DataSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Setting() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('eparinam-theme') || 'dark'; } catch { return 'dark'; }
  });
  const [resolvedTheme, setResolvedTheme] = useState('dark');

  useEffect(() => {
    try { localStorage.setItem('eparinam-theme', theme); } catch { }
  }, [theme]);

  useLayoutEffect(() => {
    const resolve = () => {
      if (theme === 'system') {
        setResolvedTheme(typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      } else {
        setResolvedTheme(theme);
      }
    };
    resolve();
    if (theme === 'system' && typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', resolve);
      return () => mq.removeEventListener('change', resolve);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, rawTheme: theme, setTheme, C: THEMES[resolvedTheme] }}>
      <style dangerouslySetInnerHTML={{ __html: getGlobalStyles(resolvedTheme) }} />
      <SettingsPortalContent />
    </ThemeContext.Provider>
  );
}
