import React from "react";

interface Props {
  children: React.ReactNode;
  /** Shown above the error detail — keep it specific to where this boundary sits */
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

/**
 * The app has no error boundary anywhere else — an uncaught render error in
 * any screen just unmounts the whole React tree with zero visible feedback
 * (a blank/black screen, no console access needed to reproduce it, no way
 * to tell what broke). Wrapping the new Academy booking screens in this
 * turns that into a visible, on-screen error message instead — no devtools
 * required to see what actually failed.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("💥 ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "70vh",
            padding: "24px",
            textAlign: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#FFF0F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            ❌
          </div>
          <p style={{ fontFamily: "var(--lato)", fontSize: 14, color: "#4B3827", margin: 0, fontWeight: 500 }}>
            {this.props.fallbackTitle || "Something went wrong."}
          </p>
          <p style={{ fontFamily: "var(--lato)", fontSize: 12, color: "#8C8C8C", margin: 0, wordBreak: "break-word", maxWidth: 320 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => {
              window.location.href = "/home";
            }}
            style={{
              padding: "10px 28px",
              borderRadius: 8,
              border: "none",
              background: "#6C7A5F",
              color: "#fff",
              fontFamily: "var(--lato)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
