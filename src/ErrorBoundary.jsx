import { Component } from "react";

// App-wide safety net. If any component throws while rendering, React would
// otherwise unmount the whole tree and leave a blank white screen. This catches
// that, keeps the page branded, and offers a refresh instead of dead air.
// Styles are inline (not in App.css) so the fallback still renders even if the
// failure is tangled up with the rest of the app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface the error in the console for local debugging.
    console.error("Uncaught error in app:", error, info);
    // Fire-and-forget report to /api/log-error so client crashes are visible in the
    // Vercel logs (and Supabase, if a client_errors table exists). Never awaited and
    // fully swallowed - a failed report must not break the fallback UI or throw again.
    try {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: (error && error.message) || String(error),
          stack: (error && error.stack) || "",
          componentStack: (info && info.componentStack) || "",
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
        keepalive: true,
      }).catch(function() {});
    } catch (e) { /* reporting must never itself crash the boundary */ }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        background: "#F5F2EC",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}>
        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: "0.8rem",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "#B8860B",
          marginBottom: "1rem",
        }}>
          Versus Arena
        </div>
        <h1 style={{
          fontFamily: '"Cinzel", serif',
          fontSize: "1.6rem",
          color: "#1A1A1A",
          margin: "0 0 0.75rem",
        }}>
          Something went wrong
        </h1>
        <p style={{ color: "#8A8479", maxWidth: "26rem", margin: "0 0 1.75rem", lineHeight: 1.6 }}>
          The Arena hit an unexpected snag. This is on our end, not yours.
          Refreshing usually clears it.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#F5F2EC",
            background: "#B8860B",
            border: "none",
            borderRadius: "4px",
            padding: "0.85rem 1.75rem",
            cursor: "pointer",
          }}
        >
          Refresh the page
        </button>
      </div>
    );
  }
}
