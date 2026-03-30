import { useEffect, useMemo, useState } from "react";
import { Shield, Trash2, UserCog, Users } from "lucide-react";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { normalizeInputText, toSafeUserMessage } from "../../shared/security/text.js";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceSelect,
  WorkspaceStatGrid,
} from "../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";

const emptyAdminForm = {
  username: "",
  firstName: "",
  middleName: "",
  lastName: "",
  age: "",
  sex: "male",
  designation: "",
  aadhaarNumber: "",
  phoneNumber: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const emptyDeoForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  age: "",
  sex: "male",
  designation: "",
  aadhaarNumber: "",
  phoneNumber: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function sanitizeDigits(value, maxLength) {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

function sanitizeText(value, maxLength = 150) {
  return normalizeInputText(value, { maxLength, trim: false });
}

function humanizeStatus(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function FormField({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--portal-text)" }}>{label}</span>
      {children}
    </label>
  );
}

function MessageStrip({ tone = "error", message }) {
  const { C } = usePortalTheme();
  if (!message) return null;
  const colors =
    tone === "success"
      ? { border: `1px solid ${C.mint}4D`, background: C.mintDim, color: C.mint }
      : { border: `1px solid ${C.danger}4D`, background: `${C.danger}14`, color: C.danger };

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: colors.border,
        background: colors.background,
        color: colors.color,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {message}
    </div>
  );
}

function AccountDirectory({ items, type, loading, onRemove }) {
  if (loading) {
    return <WorkspaceEmptyState title={`Loading ${type} directory...`} />;
  }

  if (!items.length) {
    return <WorkspaceEmptyState title={`No ${type} accounts found`} subtitle={`Created ${type} accounts will appear here once provisioning starts.`} />;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((item) => {
        const fullName = [item.firstName, item.middleName, item.lastName].filter(Boolean).join(" ") || item.username || item.email;
        return (
          <div
            key={item.id}
            style={{
              display: "grid",
              gap: 14,
              padding: 18,
              borderRadius: 12,
              border: "1px solid var(--portal-border)",
              background: "var(--portal-bg-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--portal-t1)", letterSpacing: "-0.01em" }}>{fullName}</div>
                <div style={{ fontSize: 12, color: "var(--portal-t3)" }}>{item.designation || "Designation not set"}</div>
                <div style={{ fontSize: 12, color: "var(--portal-t2)" }}>{item.email}</div>
                <div style={{ fontSize: 12, color: "var(--portal-t3)" }}>Username: {item.username}</div>
                <div style={{ fontSize: 11, color: "var(--portal-t3)" }}>Created by: {item.createdByName || "Unknown master admin"}</div>
              </div>
              <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <WorkspaceBadge status={item.isVerified ? "verified" : "pending"}>
                    {item.isVerified ? "Verified" : "Pending Verification"}
                  </WorkspaceBadge>
                  <WorkspaceBadge status={item.status}>{humanizeStatus(item.status)}</WorkspaceBadge>
                </div>
                <WorkspaceButton type="button" variant="danger" onClick={() => onRemove(item.id)}>
                  <Trash2 size={15} />
                  Remove
                </WorkspaceButton>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MasterAdminAccessPage({ mode }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(mode === "manage-admins" || mode === "manage-deos");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [admins, setAdmins] = useState([]);
  const [deos, setDeos] = useState([]);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [deoForm, setDeoForm] = useState(emptyDeoForm);

  const config = useMemo(() => authorizedConfig(session?.accessToken), [session?.accessToken]);
  const isCreateAdmin = mode === "create-admin";
  const isCreateDeo = mode === "create-deo";
  const isManageAdmins = mode === "manage-admins";
  const isManageDeos = mode === "manage-deos";

  function setAdminField(field, value) {
    setAdminForm((current) => ({ ...current, [field]: value }));
  }

  function setDeoField(field, value) {
    setDeoForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (!session?.accessToken) return;
    if (isManageAdmins) {
      loadAdmins();
      return;
    }
    if (isManageDeos) {
      loadDeos();
    }
  }, [session?.accessToken, isManageAdmins, isManageDeos]);

  async function loadAdmins() {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/masteradmin/admins", config);
      setAdmins(data.admins || []);
      setError("");
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to load admin directory"));
    } finally {
      setLoading(false);
    }
  }

  async function loadDeos() {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/masteradmin/deos", config);
      setDeos(data.deos || []);
      setError("");
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to load DEO directory"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAdmin() {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...adminForm,
        username: sanitizeText(adminForm.username, 100).trim(),
        firstName: sanitizeText(adminForm.firstName, 100).trim(),
        middleName: sanitizeText(adminForm.middleName, 100).trim(),
        lastName: sanitizeText(adminForm.lastName, 100).trim(),
        designation: sanitizeText(adminForm.designation, 150).trim(),
        aadhaarNumber: sanitizeDigits(adminForm.aadhaarNumber, 12),
        phoneNumber: sanitizeDigits(adminForm.phoneNumber, 10),
        email: sanitizeText(adminForm.email, 255).trim(),
        age: Number(adminForm.age),
      };
      const { data } = await apiClient.post("/masteradmin/admins", payload, config);
      setSuccess(`Admin created. Verification code sent to ${data.admin.email}. Username: ${data.admin.username}. Verify the account on /admin/verify before first login.`);
      setAdminForm(emptyAdminForm);
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to create admin"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateDeo() {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...deoForm,
        firstName: sanitizeText(deoForm.firstName, 100).trim(),
        middleName: sanitizeText(deoForm.middleName, 100).trim(),
        lastName: sanitizeText(deoForm.lastName, 100).trim(),
        designation: sanitizeText(deoForm.designation, 150).trim(),
        aadhaarNumber: sanitizeDigits(deoForm.aadhaarNumber, 12),
        phoneNumber: sanitizeDigits(deoForm.phoneNumber, 10),
        email: sanitizeText(deoForm.email, 255).trim(),
        age: Number(deoForm.age),
      };
      const { data } = await apiClient.post("/masteradmin/deos", payload, config);
      setSuccess(`DEO created. Verification code sent to ${data.deo.email}. Login username: ${data.deo.username}. Verify the account on /DEO/verify before first login.`);
      setDeoForm(emptyDeoForm);
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to create DEO"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveAdmin(adminId) {
    setError("");
    setSuccess("");
    try {
      await apiClient.delete(`/masteradmin/admins/${adminId}`, config);
      setSuccess("Admin removed successfully.");
      await loadAdmins();
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to remove admin"));
    }
  }

  async function handleRemoveDeo(deoId) {
    setError("");
    setSuccess("");
    try {
      await apiClient.delete(`/masteradmin/deos/${deoId}`, config);
      setSuccess("DEO removed successfully.");
      await loadDeos();
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to remove DEO"));
    }
  }

  const statItems = [
    { label: "Admins", value: admins.length || "—", icon: <UserCog size={16} /> },
    { label: "DEOs", value: deos.length || "—", icon: <Users size={16} /> },
    { label: "Pending Admins", value: admins.filter((item) => !item.isVerified).length || "—", accent: "var(--portal-warn)", icon: <Shield size={16} /> },
    { label: "Pending DEOs", value: deos.filter((item) => !item.isVerified).length || "—", accent: "var(--portal-warn)", icon: <Shield size={16} /> },
  ];

  return (
    <WorkspacePage width={1240}>
      <WorkspaceSectionHeader
        eyebrow="Master Admin Workspace"
        title={isCreateAdmin ? "Create Admin" : isCreateDeo ? "Create DEO" : isManageAdmins ? "Manage Admins" : "Manage DEOs"}
        subtitle={(isCreateAdmin || isCreateDeo)
          ? "Verification codes are sent immediately at account creation. First login remains blocked until verification is completed on the target portal."
          : "Review provisioned accounts, verification state, and remove access when required."}
        icon={isCreateDeo ? <Users size={18} /> : <Shield size={18} />}
      />

      <div style={{ display: "grid", gap: 18 }}>
        {(isManageAdmins || isManageDeos) && (
          <WorkspaceStatGrid items={statItems} />
        )}

        <MessageStrip tone="error" message={error} />
        <MessageStrip tone="success" message={success} />

        {isCreateAdmin ? (
          <WorkspaceCard>
            <WorkspaceCardHeader title="Admin Onboarding" subtitle="Masteradmin-controlled onboarding for admin accounts." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
              <FormField label="Username"><WorkspaceInput value={adminForm.username} onChange={(event) => setAdminField("username", sanitizeText(event.target.value, 100))} /></FormField>
              <FormField label="First Name"><WorkspaceInput value={adminForm.firstName} onChange={(event) => setAdminField("firstName", sanitizeText(event.target.value, 100))} /></FormField>
              <FormField label="Middle Name"><WorkspaceInput value={adminForm.middleName} onChange={(event) => setAdminField("middleName", sanitizeText(event.target.value, 100))} /></FormField>
              <FormField label="Last Name"><WorkspaceInput value={adminForm.lastName} onChange={(event) => setAdminField("lastName", sanitizeText(event.target.value, 100))} /></FormField>
              <FormField label="Age"><WorkspaceInput type="number" value={adminForm.age} onChange={(event) => setAdminField("age", sanitizeDigits(event.target.value, 3))} /></FormField>
              <FormField label="Sex">
                <WorkspaceSelect value={adminForm.sex} onChange={(event) => setAdminField("sex", event.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </WorkspaceSelect>
              </FormField>
              <FormField label="Designation"><WorkspaceInput value={adminForm.designation} onChange={(event) => setAdminField("designation", sanitizeText(event.target.value, 150))} /></FormField>
              <FormField label="Aadhaar Number"><WorkspaceInput value={adminForm.aadhaarNumber} onChange={(event) => setAdminField("aadhaarNumber", sanitizeDigits(event.target.value, 12))} inputMode="numeric" maxLength={12} /></FormField>
              <FormField label="Phone Number"><WorkspaceInput value={adminForm.phoneNumber} onChange={(event) => setAdminField("phoneNumber", sanitizeDigits(event.target.value, 10))} inputMode="numeric" maxLength={10} /></FormField>
              <FormField label="Email Address"><WorkspaceInput type="email" value={adminForm.email} onChange={(event) => setAdminField("email", sanitizeText(event.target.value, 255))} /></FormField>
              <FormField label="Password"><WorkspaceInput type="password" value={adminForm.password} onChange={(event) => setAdminField("password", event.target.value)} /></FormField>
              <FormField label="Confirm Password"><WorkspaceInput type="password" value={adminForm.confirmPassword} onChange={(event) => setAdminField("confirmPassword", event.target.value)} /></FormField>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
              <WorkspaceButton type="button" disabled={submitting} onClick={handleCreateAdmin}>
                {submitting ? "Creating Admin..." : "Create Admin"}
              </WorkspaceButton>
            </div>
          </WorkspaceCard>
        ) : null}

        {isCreateDeo ? (
          <WorkspaceCard>
            <WorkspaceCardHeader title="DEO Onboarding" subtitle="Masteradmin-controlled onboarding for Data Entry Operators." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
              <FormField label="First Name"><WorkspaceInput value={deoForm.firstName} onChange={(event) => setDeoField("firstName", sanitizeText(event.target.value, 100))} /></FormField>
              <FormField label="Middle Name"><WorkspaceInput value={deoForm.middleName} onChange={(event) => setDeoField("middleName", sanitizeText(event.target.value, 100))} /></FormField>
              <FormField label="Last Name"><WorkspaceInput value={deoForm.lastName} onChange={(event) => setDeoField("lastName", sanitizeText(event.target.value, 100))} /></FormField>
              <FormField label="Age"><WorkspaceInput type="number" value={deoForm.age} onChange={(event) => setDeoField("age", sanitizeDigits(event.target.value, 3))} /></FormField>
              <FormField label="Sex">
                <WorkspaceSelect value={deoForm.sex} onChange={(event) => setDeoField("sex", event.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </WorkspaceSelect>
              </FormField>
              <FormField label="Designation"><WorkspaceInput value={deoForm.designation} onChange={(event) => setDeoField("designation", sanitizeText(event.target.value, 150))} /></FormField>
              <FormField label="Aadhaar Number"><WorkspaceInput value={deoForm.aadhaarNumber} onChange={(event) => setDeoField("aadhaarNumber", sanitizeDigits(event.target.value, 12))} inputMode="numeric" maxLength={12} /></FormField>
              <FormField label="Phone Number"><WorkspaceInput value={deoForm.phoneNumber} onChange={(event) => setDeoField("phoneNumber", sanitizeDigits(event.target.value, 10))} inputMode="numeric" maxLength={10} /></FormField>
              <FormField label="Email Address"><WorkspaceInput type="email" value={deoForm.email} onChange={(event) => setDeoField("email", sanitizeText(event.target.value, 255))} /></FormField>
              <FormField label="Password"><WorkspaceInput type="password" value={deoForm.password} onChange={(event) => setDeoField("password", event.target.value)} /></FormField>
              <FormField label="Confirm Password"><WorkspaceInput type="password" value={deoForm.confirmPassword} onChange={(event) => setDeoField("confirmPassword", event.target.value)} /></FormField>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
              <WorkspaceButton type="button" disabled={submitting} onClick={handleCreateDeo}>
                {submitting ? "Creating DEO..." : "Create DEO"}
              </WorkspaceButton>
            </div>
          </WorkspaceCard>
        ) : null}

        {isManageAdmins ? (
          <WorkspaceCard>
            <WorkspaceCardHeader title="Admin Directory" subtitle="Track created admins and remove access when required." />
            <AccountDirectory items={admins} type="admin" loading={loading} onRemove={handleRemoveAdmin} />
          </WorkspaceCard>
        ) : null}

        {isManageDeos ? (
          <WorkspaceCard>
            <WorkspaceCardHeader title="DEO Directory" subtitle="Track created DEOs and remove access when required." />
            <AccountDirectory items={deos} type="DEO" loading={loading} onRemove={handleRemoveDeo} />
          </WorkspaceCard>
        ) : null}
      </div>
    </WorkspacePage>
  );
}
