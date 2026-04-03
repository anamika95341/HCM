import LoginPage from "../auth/LoginPage.jsx";

export default function OperatorsPage() {
  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        padding: "20px",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1, minWidth: 320 }}>
        <LoginPage defaultRole="admin" />
      </div>
      <div style={{ flex: 1, minWidth: 320 }}>
        <LoginPage defaultRole="minister" />
      </div>
      <div style={{ flex: 1, minWidth: 320 }}>
        <LoginPage defaultRole="deo" />
      </div>
    </div>
  );
}
