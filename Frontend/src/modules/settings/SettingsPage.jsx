import React, { useState, useEffect, useRef } from "react";
import { usePortalTheme, PORTAL_THEME_PREVIEW_LIGHT, PORTAL_THEME_PREVIEW_DARK } from "../../shared/theme/portalTheme.jsx";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { useNotifications } from "../../shared/notifications/NotificationContext.jsx";
import { getRoleSettings } from "./roleSettingsConfig.js";
import { changePassword, fetchProfile, updateProfile } from "./settingsApi.js";

const useTheme = usePortalTheme;

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
      boxShadow: C.insetShadow, gap: 2,
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
              boxShadow: active ? C.activePillShadow : 'none',
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
  return (
    <div
      onClick={() => set(!on)}
      style={{
        width: 44, height: 24, borderRadius: 999, cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: C.bgElevated, boxShadow: C.insetShadow,
        transition: 'background 0.3s ease',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: 999,
        background: on ? C.purple : C.t3, boxShadow: on ? C.activeGlow : C.knobShadow,
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
    primary: { bg: C.purple, color: '#ffffff', border: 'none' },
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
const ProfileSection = ({ permissions, profile, role, onProfileSaved }) => {
  const { C } = useTheme();

  const buildName = (p) =>
    [p?.first_name, p?.middle_name, p?.last_name].filter(Boolean).join(' ').trim();

  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [delegate, setDelegate] = useState(false);
  const [delegateTo, setDelegateTo] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [twoFA, setTwoFA] = useState(true);
  const [smsOTP, setSmsOTP] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  useEffect(() => {
    if (!profile) return;
    setName(buildName(profile));
    setDesignation(profile.designation ?? '');
    setContact(profile.mobile_number ?? profile.phone_number ?? '');
    setEmail(profile.email ?? '');
    setIdentifier(profile.citizen_id ?? profile.username ?? '');
    setCreatedBy(profile.created_by_name ?? '');
    setVerificationStatus(profile.is_verified ? 'Verified' : 'Pending Verification');
  }, [profile]);

  function handleDiscard() {
    if (profile) {
      setName(buildName(profile));
      setDesignation(profile.designation ?? '');
      setContact(profile.mobile_number ?? profile.phone_number ?? '');
      setEmail(profile.email ?? '');
      setIdentifier(profile.citizen_id ?? profile.username ?? '');
      setCreatedBy(profile.created_by_name ?? '');
      setVerificationStatus(profile.is_verified ? 'Verified' : 'Pending Verification');
    } else {
      setName('');
      setDesignation('');
      setContact('');
      setEmail('');
      setIdentifier('');
      setCreatedBy('');
      setVerificationStatus('');
    }
    setSaveError(null);
  }

  function resetPasswordForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {};
      if (!permissions.nameReadOnly) payload.name = name.trim();
      if (!permissions.phoneReadOnly) payload.contact = contact.trim();
      if (!permissions.emailReadOnly) payload.email = email.trim();
      const result = await updateProfile(role, payload);
      const nextProfile = result?.profile ?? null;
      if (nextProfile) {
        onProfileSaved?.(nextProfile);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'Failed to save changes. Please try again.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave() {
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordSaving(false);
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordSaving(false);
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      const result = await changePassword(role, {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess(result?.message ?? 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'Failed to update password. Please try again.';
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SH icon="person" title="Profile & Account Settings" sub="Manage your personal information and account security." />

      {/* Personal Information */}
      <Card>
        <CH title="Personal Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Inp
            label="Full Name"
            value={name}
            set={permissions.nameReadOnly ? undefined : setName}
            readOnly={permissions.nameReadOnly}
            icon="person"
          />
          {permissions.showDesignation && (
            <Inp
              label="Designation"
              value={designation}
              set={permissions.designationReadOnly ? undefined : setDesignation}
              readOnly={permissions.designationReadOnly}
            />
          )}
          <Inp
            label="Contact Number"
            value={contact}
            set={permissions.phoneReadOnly ? undefined : setContact}
            readOnly={permissions.phoneReadOnly}
            icon="phone"
            type="tel"
          />
          <Inp
            label="Official Email"
            value={email}
            set={permissions.emailReadOnly ? undefined : setEmail}
            readOnly={permissions.emailReadOnly}
            icon="mail"
            type="email"
          />
          {permissions.showIdentifier && (
            <Inp
              label={permissions.identifierLabel}
              value={identifier}
              readOnly
              icon="person"
            />
          )}
          {permissions.showCreatedBy && (
            <Inp
              label={permissions.createdByLabel || 'Created By'}
              value={createdBy}
              readOnly
            />
          )}
          {permissions.showVerificationStatus && (
            <Inp
              label="Verification Status"
              value={verificationStatus}
              readOnly
            />
          )}
        </div>
        {saveError && (
          <div style={{ fontSize: 12, color: C.danger, textAlign: 'right', marginBottom: 4 }}>
            {saveError}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
          <Btn label="Discard" variant="ghost" onClick={handleDiscard} />
          <Btn
            label={saving ? 'Saving…' : 'Save Changes'}
            variant="primary"
            icon="check"
            onClick={handleSave}
          />
        </div>
      </Card>

      {/* Digital Signature — minister only */}
      {permissions.showDigitalSignature && (
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
              <div style={{ background: C.mintDim, border: `1px solid ${C.mint}4D`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.mint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Current Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="portal-status-dot" style={{ color: C.mint }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>e-Sign Active</span>
                </div>
                <div style={{ fontSize: 12, color: C.t2, marginTop: 8 }}>Valid until: 31 March 2026</div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>NIC e-Sign Gateway · Last used: 15 Mar 2026</div>
              </div>
              <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.65 }}>Integrated with NIC e-Sign Gateway for one-click approvals.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Delegation of Authority — minister only */}
      {permissions.showDelegation && (
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
      )}

      {/* Security Settings */}
      {(permissions.show2FA || permissions.showSmsOtp || permissions.showChangePassword) && (
        <Card>
          <CH title="Security Settings" />
          {permissions.show2FA && (
            <TR
              label="Two-Factor Authentication (2FA)"
              note="Require OTP verification at every login session"
              on={twoFA}
              set={setTwoFA}
            />
          )}
          {permissions.showSmsOtp && (
            <TR
              label="SMS OTP Configuration"
              note="Receive one-time passwords via registered mobile number"
              on={smsOTP}
              set={setSmsOTP}
            />
          )}
          {permissions.showChangePassword && (
            <>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <Btn
                  label={passwordOpen ? "Hide Password Form" : "Change Password"}
                  variant="outline"
                  icon="lock"
                  onClick={() => {
                    setPasswordOpen((current) => {
                      const next = !current;
                      if (!next) {
                        resetPasswordForm();
                      }
                      return next;
                    });
                  }}
                />
              </div>
              {passwordOpen && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                    <Inp
                      label="Current Password"
                      value={currentPassword}
                      set={setCurrentPassword}
                      type="password"
                      icon="lock"
                      placeholder="Enter current password"
                    />
                    <div />
                    <Inp
                      label="New Password"
                      value={newPassword}
                      set={setNewPassword}
                      type="password"
                      icon="lock"
                      placeholder="Enter new password"
                    />
                    <Inp
                      label="Confirm New Password"
                      value={confirmPassword}
                      set={setConfirmPassword}
                      type="password"
                      icon="lock"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 2, lineHeight: 1.6 }}>
                    Password must be 12-128 characters and include uppercase, lowercase, number, and special character.
                  </div>
                  {passwordError && (
                    <div style={{ fontSize: 12, color: C.danger, marginTop: 14 }}>
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div style={{ fontSize: 12, color: C.mint, marginTop: 14 }}>
                      {passwordSuccess}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
                    <Btn
                      label="Discard"
                      variant="ghost"
                      onClick={() => {
                        resetPasswordForm();
                        setPasswordOpen(false);
                      }}
                    />
                    <Btn
                      label={passwordSaving ? 'Updating…' : 'Update Password'}
                      variant="primary"
                      icon="check"
                      onClick={handlePasswordSave}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════
//  SECTION 2 — NOTIFICATIONS
// ═══════════════════════════════════════════
const NotificationsSection = ({ permissions }) => {
  const { C } = useTheme();
  const { preferences, savePreferences } = useNotifications();
  const syncingRef = useRef(false);

  const [ch, setCh] = useState({ app: true, email: true, sms: false });

  const initialTriggers = Object.fromEntries(
    permissions.triggers.map(t => [t.k, true])
  );
  const [tr, setTr] = useState(initialTriggers);
  const [days, setDays] = useState(3);

  const allDigestOptions = [
    { id: 'realtime', label: 'Real-Time', icon: 'bell' },
    { id: 'daily', label: 'Daily Digest', icon: 'clock' },
    { id: 'weekly', label: 'Weekly Summary', icon: 'calendar' },
  ];
  const digestOptions = allDigestOptions.filter(o =>
    permissions.digestOptions.includes(o.id)
  );
  const [digest, setDigest] = useState(permissions.digestOptions[0] ?? 'daily');

  const hasDeadlineTrigger = permissions.triggers.some(t => t.deadline);
  const deadlineTriggerKey = permissions.triggers.find(t => t.deadline)?.k;

  useEffect(() => {
    syncingRef.current = true;
    setCh({
      app: preferences?.channels?.app ?? true,
      email: preferences?.channels?.email ?? true,
      sms: preferences?.channels?.sms ?? false,
    });
    setTr((current) => {
      const next = {};
      for (const trigger of permissions.triggers) {
        next[trigger.k] = preferences?.triggers?.[trigger.k] ?? current[trigger.k] ?? true;
      }
      return next;
    });
    setDigest(preferences?.digestFrequency ?? permissions.digestOptions[0] ?? 'daily');
    setDays(preferences?.deadlineDays ?? 3);
  }, [permissions, preferences]);

  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      savePreferences({
        channels: ch,
        triggers: tr,
        digestFrequency: digest,
        deadlineDays: days,
      }).catch(() => {});
    }, 300);

    return () => window.clearTimeout(timer);
  }, [ch, tr, digest, days, savePreferences]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SH icon="bell" title="Notification & Alert Preferences" sub="Control how and when you receive updates from the system." />

      {/* Notification Channels */}
      <Card>
        <CH title="Notification Channels" sub="Toggle which delivery channels are active for your account." />
        <div style={{ display: 'grid', gridTemplateColumns: permissions.showSmsChannel ? '1fr 1fr 1fr' : '1fr 1fr', gap: 16 }}>
          {[
            { k: 'app', icon: 'bell', label: 'In-App Notifications', sub: 'Bell icon in the top navigation bar', color: C.purple },
            { k: 'email', icon: 'mail', label: 'Email Alerts', sub: 'Sent to your registered email address', color: C.purple },
            permissions.showSmsChannel
              ? { k: 'sms', icon: 'phone', label: 'SMS Alerts', sub: 'Sent to your registered mobile number', color: C.mint }
              : null,
          ].filter(Boolean).map(item => (
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

      {/* Trigger Configurations */}
      <Card>
        <CH title="Trigger Configurations" sub="Select which events generate a notification for your account." />
        {permissions.triggers.map(item => (
          <TR
            key={item.k}
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {item.label}
                {item.badge && (
                  <Badge
                    label={item.badge}
                    color={item.badgeType === 'danger' ? C.danger : C.warn}
                  />
                )}
              </span>
            }
            on={tr[item.k] ?? true}
            set={v => setTr(p => ({ ...p, [item.k]: v }))}
          />
        ))}
        {hasDeadlineTrigger && tr[deadlineTriggerKey] && (
          <div style={{ marginTop: 16, padding: 16, background: C.purpleDim, border: `1px solid ${C.purple}4D`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: C.t2 }}>Alert me</span>
            <input
              type="number"
              value={days}
              min={1}
              max={14}
              onChange={e => setDays(+e.target.value)}
              style={{ width: 60, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.purple, fontWeight: 700, textAlign: 'center', background: C.inp }}
            />
            <span style={{ fontSize: 13, color: C.t2 }}>days before the due date</span>
          </div>
        )}
      </Card>

      {/* Email Digest Frequency */}
      <Card>
        <CH title="Email Digest Frequency" sub="Choose how often email summaries are delivered to your inbox." />
        <PillSegmented
          options={digestOptions}
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
//  SETTINGS PORTAL CONTENT
// ═══════════════════════════════════════════
function SettingsPortalContent() {
  const { C } = useTheme();
  const { session } = useAuth();
  const { unreadCount } = useNotifications();

  const role = session?.role ?? 'citizen';
  const { profile: profilePermissions, notifications: notifPermissions } = getRoleSettings(role);

  const [activeTab, setActiveTab] = useState('profile');
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!session?.role) return;
    let cancelled = false;
    fetchProfile(role)
      .then(data => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setProfile(null); });
    return () => { cancelled = true; };
  }, [role, session?.role]);

  const tabs = [
    { id: 'profile', icon: 'person', label: 'Profile & Account' },
    { id: 'notifications', icon: 'bell', label: 'Notifications', badge: unreadCount > 0 ? String(unreadCount) : null },
  ];

  return (
    <div className="settings-portal" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden', transition: 'background 0.3s ease' }}>

      {/* HEADER */}
      <header style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, flexShrink: 0, background: C.bgElevated }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.purpleDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico n="settings" s={18} c={C.purple} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.25, color: C.t1 }}>Settings</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Ico n="search" s={14} c={C.t3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search settings..."
              style={{ width: 200, padding: '10px 14px 10px 38px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 500, color: C.t1, background: C.inp, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }} />
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
                background: activeTab === t.id ? C.card : 'transparent', border: 'none', borderRadius: 10,
                color: activeTab === t.id ? C.t1 : C.t3,
                fontSize: 13, fontWeight: activeTab === t.id ? 600 : 500,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left',
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
            {activeTab === 'profile' && (
              <ProfileSection
                permissions={profilePermissions}
                profile={profile}
                role={role}
                onProfileSaved={setProfile}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationsSection
                permissions={notifPermissions}
                role={role}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Setting() {
  return <SettingsPortalContent />;
}

function ThemePreviewCard({ label, selected, onClick, preview }) {
  const { C } = useTheme();

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 0,
        borderRadius: 12,
        overflow: 'hidden',
        border: `2px solid ${selected ? C.purple : C.border}`,
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ height: 72, background: preview.appBg, display: 'flex' }}>
        <div style={{ width: 24, background: preview.sidebar, borderRight: `1px solid ${preview.line}`, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 16, borderRadius: 4, background: preview.panel, border: `1px solid ${preview.line}`, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 8, top: 5, width: 28, height: 4, borderRadius: 999, background: preview.accent }} />
          </div>
          <div style={{ height: 10, borderRadius: 4, background: preview.panel, border: `1px solid ${preview.line}`, width: '70%' }} />
          <div style={{ height: 10, borderRadius: 4, background: preview.panel, border: `1px solid ${preview.line}`, width: '45%' }} />
        </div>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selected ? C.purpleDim : C.bgElevated }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: selected ? C.purple : C.t2 }}>{label}</span>
        {selected ? <Ico n="check" s={13} c={C.purple} /> : <span style={{ fontSize: 11, color: C.t3 }}>Apply</span>}
      </div>
    </button>
  );
}
