import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error("Unhandled frontend error", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#f8fafc",
            color: "#0f172a",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
              The application hit an unexpected error and stopped rendering this screen. Refresh the page and sign in again if needed.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
