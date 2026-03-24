import { useEffect, useMemo, useState } from "react";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { toSafeUserMessage } from "../../shared/security/text.js";

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

export default function MasterAdminAccessPage({ mode }) {
  const { C } = usePortalTheme();
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
      const { data } = await apiClient.post("/masteradmin/admins", { ...adminForm, age: Number(adminForm.age) }, config);
      setSuccess(`Admin created. Verification code sent to ${data.admin.email}. Username: ${data.admin.username}`);
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
      const { data } = await apiClient.post("/masteradmin/deos", { ...deoForm, age: Number(deoForm.age) }, config);
      setSuccess(`DEO created. Verification code sent to ${data.deo.email}. Login username: ${data.deo.username}`);
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

  return (
    <div className="portal-page" style={{ padding: 24, display: "grid", gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".18em" }}>Master Admin Workspace</div>
        <h1 style={{ marginTop: 10, fontSize: 28, color: C.t1 }}>
          {isCreateAdmin && "Create Admin"}
          {isCreateDeo && "Create DEO"}
          {isManageAdmins && "Manage Admins"}
          {isManageDeos && "Manage DEOs"}
        </h1>
        <p style={{ marginTop: 6, color: C.t3, fontSize: 13 }}>
          {(isCreateAdmin || isCreateDeo)
            ? "Verification codes are sent by email immediately at account creation. First login stays blocked until verification is completed on the target portal."
            : "Review active records, verification state, and remove access when required."}
        </p>
      </div>

      {error ? <MessageBox C={C} tone="danger" message={error} /> : null}
      {success ? <MessageBox C={C} tone="success" message={success} /> : null}

      {isCreateAdmin ? (
        <Card C={C}>
          <SectionHeader C={C} title="Admin Onboarding" subtitle="Masteradmin-controlled onboarding for admins." />
          <TwoColumnGrid>
            <Field C={C} label="Username"><Input C={C} value={adminForm.username} onChange={(value) => setAdminForm((current) => ({ ...current, username: value }))} /></Field>
            <Field C={C} label="First Name"><Input C={C} value={adminForm.firstName} onChange={(value) => setAdminForm((current) => ({ ...current, firstName: value }))} /></Field>
            <Field C={C} label="Middle Name"><Input C={C} value={adminForm.middleName} onChange={(value) => setAdminForm((current) => ({ ...current, middleName: value }))} /></Field>
            <Field C={C} label="Last Name"><Input C={C} value={adminForm.lastName} onChange={(value) => setAdminForm((current) => ({ ...current, lastName: value }))} /></Field>
            <Field C={C} label="Age"><Input C={C} type="number" value={adminForm.age} onChange={(value) => setAdminForm((current) => ({ ...current, age: value }))} /></Field>
            <Field C={C} label="Sex"><Select C={C} value={adminForm.sex} onChange={(value) => setAdminForm((current) => ({ ...current, sex: value }))} /></Field>
            <Field C={C} label="Designation"><Input C={C} value={adminForm.designation} onChange={(value) => setAdminForm((current) => ({ ...current, designation: value }))} /></Field>
            <Field C={C} label="Aadhaar Number"><Input C={C} value={adminForm.aadhaarNumber} onChange={(value) => setAdminForm((current) => ({ ...current, aadhaarNumber: value }))} /></Field>
            <Field C={C} label="Phone Number"><Input C={C} value={adminForm.phoneNumber} onChange={(value) => setAdminForm((current) => ({ ...current, phoneNumber: value }))} /></Field>
            <Field C={C} label="Email Address"><Input C={C} type="email" value={adminForm.email} onChange={(value) => setAdminForm((current) => ({ ...current, email: value }))} /></Field>
            <Field C={C} label="Password"><Input C={C} type="password" value={adminForm.password} onChange={(value) => setAdminForm((current) => ({ ...current, password: value }))} /></Field>
            <Field C={C} label="Confirm Password"><Input C={C} type="password" value={adminForm.confirmPassword} onChange={(value) => setAdminForm((current) => ({ ...current, confirmPassword: value }))} /></Field>
          </TwoColumnGrid>
          <ActionsRow><PrimaryButton C={C} disabled={submitting} onClick={handleCreateAdmin}>{submitting ? "Creating Admin..." : "Create Admin"}</PrimaryButton></ActionsRow>
        </Card>
      ) : null}

      {isCreateDeo ? (
        <Card C={C}>
          <SectionHeader C={C} title="DEO Onboarding" subtitle="Masteradmin-controlled onboarding for Data Entry Operators." />
          <TwoColumnGrid>
            <Field C={C} label="First Name"><Input C={C} value={deoForm.firstName} onChange={(value) => setDeoForm((current) => ({ ...current, firstName: value }))} /></Field>
            <Field C={C} label="Middle Name"><Input C={C} value={deoForm.middleName} onChange={(value) => setDeoForm((current) => ({ ...current, middleName: value }))} /></Field>
            <Field C={C} label="Last Name"><Input C={C} value={deoForm.lastName} onChange={(value) => setDeoForm((current) => ({ ...current, lastName: value }))} /></Field>
            <Field C={C} label="Age"><Input C={C} type="number" value={deoForm.age} onChange={(value) => setDeoForm((current) => ({ ...current, age: value }))} /></Field>
            <Field C={C} label="Sex"><Select C={C} value={deoForm.sex} onChange={(value) => setDeoForm((current) => ({ ...current, sex: value }))} /></Field>
            <Field C={C} label="Designation"><Input C={C} value={deoForm.designation} onChange={(value) => setDeoForm((current) => ({ ...current, designation: value }))} /></Field>
            <Field C={C} label="Aadhaar Number"><Input C={C} value={deoForm.aadhaarNumber} onChange={(value) => setDeoForm((current) => ({ ...current, aadhaarNumber: value }))} /></Field>
            <Field C={C} label="Phone Number"><Input C={C} value={deoForm.phoneNumber} onChange={(value) => setDeoForm((current) => ({ ...current, phoneNumber: value }))} /></Field>
            <Field C={C} label="Email Address"><Input C={C} type="email" value={deoForm.email} onChange={(value) => setDeoForm((current) => ({ ...current, email: value }))} /></Field>
            <Field C={C} label="Password"><Input C={C} type="password" value={deoForm.password} onChange={(value) => setDeoForm((current) => ({ ...current, password: value }))} /></Field>
            <Field C={C} label="Confirm Password"><Input C={C} type="password" value={deoForm.confirmPassword} onChange={(value) => setDeoForm((current) => ({ ...current, confirmPassword: value }))} /></Field>
          </TwoColumnGrid>
          <ActionsRow><PrimaryButton C={C} disabled={submitting} onClick={handleCreateDeo}>{submitting ? "Creating DEO..." : "Create DEO"}</PrimaryButton></ActionsRow>
        </Card>
      ) : null}

      {isManageAdmins ? (
        <Card C={C}>
          <SectionHeader C={C} title="Admin Directory" subtitle="Track created admins and remove access when required." />
          {loading ? <EmptyState C={C} message="Loading admin directory..." /> : admins.length === 0 ? <EmptyState C={C} message="No admins created yet." /> : (
            <DirectoryList
              C={C}
              items={admins}
              onRemove={handleRemoveAdmin}
            />
          )}
        </Card>
      ) : null}

      {isManageDeos ? (
        <Card C={C}>
          <SectionHeader C={C} title="DEO Directory" subtitle="Track created DEOs and remove access when required." />
          {loading ? <EmptyState C={C} message="Loading DEO directory..." /> : deos.length === 0 ? <EmptyState C={C} message="No DEOs created yet." /> : (
            <DirectoryList
              C={C}
              items={deos}
              onRemove={handleRemoveDeo}
            />
          )}
        </Card>
      ) : null}
    </div>
  );
}

function Card({ C, children }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, boxShadow: "var(--portal-shadow)" }}>{children}</div>;
}

function SectionHeader({ C, title, subtitle }) {
  return (
    <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{subtitle}</div>
    </div>
  );
}

function Field({ C, label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>{label}</span>
      {children}
    </label>
  );
}

function Input({ C, value, onChange, type = "text" }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13 }} />;
}

function Select({ C, value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13 }}>
      <option value="male">Male</option>
      <option value="female">Female</option>
      <option value="other">Other</option>
    </select>
  );
}

function TwoColumnGrid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>{children}</div>;
}

function ActionsRow({ children }) {
  return <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>{children}</div>;
}

function PrimaryButton({ C, children, ...props }) {
  return <button {...props} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: C.purple, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: props.disabled ? 0.7 : 1 }}>{children}</button>;
}

function DangerButton({ C, children, ...props }) {
  return <button {...props} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.danger}`, background: "transparent", color: C.danger, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{children}</button>;
}

function Badge({ C, label, tone }) {
  const color = tone === "success" ? C.mint : tone === "warn" ? C.warn : C.t3;
  return <span style={{ padding: "4px 10px", borderRadius: 999, background: `${color}22`, color, fontSize: 11, fontWeight: 700 }}>{label}</span>;
}

function EmptyState({ C, message }) {
  return <div style={{ padding: 12, borderRadius: 10, background: C.bgElevated, color: C.t3, fontSize: 12 }}>{message}</div>;
}

function MessageBox({ C, tone, message }) {
  const color = tone === "success" ? C.mint : C.danger;
  return <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}12`, color, fontSize: 12 }}>{message}</div>;
}

function DirectoryList({ C, items, onRemove }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.bgElevated, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{[item.firstName, item.middleName, item.lastName].filter(Boolean).join(" ")}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{item.designation} · {item.email} · {item.phoneNumber}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>Username: {item.username}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: C.t3 }}>Created by: {item.createdByName || "Unknown master admin"}</div>
            </div>
            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Badge C={C} label={item.isVerified ? "Verified" : "Pending Verification"} tone={item.isVerified ? "success" : "warn"} />
                <Badge C={C} label={item.status} tone="neutral" />
              </div>
              <DangerButton C={C} onClick={() => onRemove(item.id)}>Remove</DangerButton>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
