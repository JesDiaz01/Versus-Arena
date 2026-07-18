// src/AuthPanel.jsx
// Real email + password auth UI, rendered in the signup-page slot (App.jsx,
// page === "signup"). Frontend only: it talks exclusively to the browser
// Supabase client from Step 1 and reacts to the shared AuthContext session.
// No /api calls, no DB writes, no battle logic.
//
// Three form modes (signin / signup / forgot) plus two non-form states handled
// up top: unconfigured client (friendly notice) and signed-in (email + sign out).
// A successful sign-in does NOT set state here -- the AuthProvider's
// onAuthStateChange fires, useAuth() updates, and this component re-renders into
// the signed-in view on its own.

import { useState } from "react";
import supabase from "./supabaseClient";
import { useAuth } from "./AuthContext";

// Match the Supabase dashboard's minimum password length (default 6). Kept as a
// client-side courtesy check; Supabase remains the real authority.
const MIN_PASSWORD = 6;

// Simple structural email check (non-empty, one @, a dotted domain). Deliberately
// lenient: Supabase does the authoritative validation.
function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function AuthPanel() {
  const { user, loading } = useAuth();

  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");   // inline validation / Supabase error
  const [notice, setNotice] = useState(""); // success / "check your email" info

  // Switch mode and clear any stale error/notice + password so a message from one
  // flow never bleeds into another.
  function switchMode(next) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
  }

  async function handleSignOut() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { error: soErr } = await supabase.auth.signOut();
      if (soErr) setError(soErr.message || "Could not sign out. Try again.");
      // On success the AuthProvider clears the session via onAuthStateChange.
    } catch {
      setError("Could not sign out. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return; // guard double-submit

    setError("");
    setNotice("");

    const em = email.trim();

    // --- Client-side validation ---
    if (!em || !looksLikeEmail(em)) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode !== "forgot") {
      if (!password) {
        setError("Enter your password.");
        return;
      }
      if (mode === "signup" && password.length < MIN_PASSWORD) {
        setError("Password must be at least " + MIN_PASSWORD + " characters.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error: suErr } = await supabase.auth.signUp({ email: em, password });
        if (suErr) {
          setError(suErr.message || "Could not create your account. Try again.");
        } else {
          // Email confirmation is ON: the user is NOT logged in yet. Tell them to
          // confirm before signing in -- do not assume an active session.
          setNotice("Check your email to confirm your account, then sign in.");
        }
      } else if (mode === "signin") {
        const { error: siErr } = await supabase.auth.signInWithPassword({ email: em, password });
        if (siErr) {
          setError(siErr.message || "Could not sign you in. Check your details and try again.");
        }
        // Success: no state set here -- onAuthStateChange re-renders into signed-in view.
      } else if (mode === "forgot") {
        const { error: rpErr } = await supabase.auth.resetPasswordForEmail(em);
        if (rpErr) {
          setError(rpErr.message || "Could not send a reset email. Try again.");
        } else {
          setNotice("If an account exists for that email, a password reset link is on its way.");
        }
      }
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Unconfigured client: degrade gracefully, never crash. ---
  if (!supabase) {
    return (
      <div className="about-section auth-panel">
        <p className="about-lead">Accounts are temporarily unavailable.</p>
        <p>
          We could not reach the accounts service right now. The rest of the Arena
          works as normal -- every battle still runs free, no account needed.
        </p>
      </div>
    );
  }

  // --- Still resolving the initial session. ---
  if (loading) {
    return (
      <div className="about-section auth-panel">
        <p className="auth-loading">Loading...</p>
      </div>
    );
  }

  // --- Signed-in view (Step 2 scope: confirm + sign out only). ---
  if (user) {
    return (
      <div className="about-section auth-panel">
        <p className="about-lead">
          You're signed in as <strong>{user.email}</strong>.
        </p>
        <p>
          Saved battles and your record are coming soon. For now, head back and
          settle a debate.
        </p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="auth-actions">
          <button className="auth-submit" onClick={handleSignOut} disabled={submitting}>
            {submitting ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    );
  }

  // --- Logged-out: the auth form. ---
  const isForgot = mode === "forgot";
  const submitLabel =
    mode === "signup" ? (submitting ? "Creating account..." : "Create Account")
      : mode === "signin" ? (submitting ? "Signing in..." : "Sign In")
        : (submitting ? "Sending..." : "Send Reset Link");

  return (
    <div className="about-section auth-panel">
      {!isForgot && (
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={"auth-tab" + (mode === "signin" ? " active" : "")}
            onClick={() => switchMode("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={"auth-tab" + (mode === "signup" ? " active" : "")}
            onClick={() => switchMode("signup")}
          >
            Sign Up
          </button>
        </div>
      )}

      {isForgot && <h2 className="auth-heading">Reset your password</h2>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </label>

        {!isForgot && (
          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="auth-input"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least " + MIN_PASSWORD + " characters" : "Your password"}
              disabled={submitting}
            />
          </label>
        )}

        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-notice" role="status">{notice}</p>}

        <div className="auth-actions">
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitLabel}
          </button>
        </div>
      </form>

      <div className="auth-switch">
        {mode === "signin" && (
          <button type="button" className="auth-link" onClick={() => switchMode("forgot")}>
            Forgot password?
          </button>
        )}
        {mode === "signup" && (
          <span className="auth-quiet">
            Already have an account?{" "}
            <button type="button" className="auth-link" onClick={() => switchMode("signin")}>
              Sign In
            </button>
          </span>
        )}
        {isForgot && (
          <button type="button" className="auth-link" onClick={() => switchMode("signin")}>
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
}
