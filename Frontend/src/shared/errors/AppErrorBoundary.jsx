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
            padding: "var(--portal-space-11, 24px)",
            background: "var(--portal-bg, #F5F5F5)",
            color: "var(--portal-text-strong, #171717)",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            transition: "background-color 0.3s ease, color 0.3s ease",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--portal-card, #FFFFFF)",
              border: "1px solid var(--portal-border, #E5E5E5)",
              borderRadius: "var(--portal-radius-md, 12px)",
              padding: "var(--portal-space-11, 24px)",
              boxShadow: "var(--portal-dialog-shadow, 0 8px 32px rgba(0,0,0,0.12))",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, marginBottom: 8, color: "var(--portal-text-strong, #171717)" }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--portal-text, #525252)" }}>
              The application hit an unexpected error and stopped rendering this screen. Refresh the page and sign in again if needed.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
