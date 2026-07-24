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

import { useState, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import supabase from "./supabaseClient";
import { useAuth } from "./AuthContext";
import VLogo from "./VLogo";

// Cloudflare Turnstile site key (PUBLIC by design -- it is meant to be embedded in
// the page; the matching SECRET lives only in the Supabase dashboard). Supabase Auth
// has CAPTCHA protection enabled, so signUp / signInWithPassword /
// resetPasswordForEmail are REJECTED without a valid token.
//
// Graceful degradation (same pattern as supabaseClient.js): if the env var is absent
// we warn once and skip the widget entirely rather than crashing or hard-blocking the
// form. Supabase will still reject the call, but the app renders and the reason is
// visible in the console.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
if (!TURNSTILE_SITE_KEY) {
  console.warn(
    "Turnstile not configured: set VITE_TURNSTILE_SITE_KEY to render the CAPTCHA. " +
    "Supabase has CAPTCHA protection enabled, so sign-in/sign-up will fail without it."
  );
}

// Mirrors the password policy configured in the Supabase dashboard (minimum length
// 8, plus lowercase + uppercase + digit). These are client-side COURTESY checks so a
// user gets a clear inline message instead of a confusing server rejection; Supabase
// remains the real authority and re-validates everything server-side.
const MIN_PASSWORD = 8;

// Returns an error string, or "" when the password satisfies the policy.
// NOTE: applied to SIGN-UP only. Existing accounts may predate the policy, so
// sign-in must never pre-validate beyond "not empty" -- otherwise a legitimate
// user with an older password could be locked out of their own account by our
// own form before Supabase is ever asked.
function passwordPolicyError(pw) {
  if (pw.length < MIN_PASSWORD) return "Password must be at least " + MIN_PASSWORD + " characters.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  return "";
}

// Simple structural email check (non-empty, one @, a dotted domain). Deliberately
// lenient: Supabase does the authoritative validation.
function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function AuthPanel({ onViewBattles }) {
  const { session, user, loading, recovery, clearRecovery, linkError, clearLinkError } = useAuth();

  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");   // inline validation / Supabase error
  const [notice, setNotice] = useState(""); // success / "check your email" info

  // Turnstile: a token is single-use, so it must be cleared + the widget reset after
  // EVERY submit attempt, otherwise a second attempt replays a consumed token and
  // Supabase rejects it. captchaEnabled is false when the site key is missing, which
  // keeps the form usable (and unblocked) in an unconfigured environment.
  const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef(null);

  // "Set a new password" flow (arrived via a reset-password email link).
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Account deletion. Kept behind a collapsed panel and a typed-email confirmation:
  // it is irreversible, so it must never be one stray click away.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Set once the account is gone. Signing out immediately would swap the card for the
  // sign-in form with no explanation, so the confirmation is shown first and the sign-out
  // happens when the user dismisses it.
  const [deleted, setDeleted] = useState(false);

  async function handleDeleteAccount() {
    if (deleting || !session || !session.access_token) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ confirm_email: deleteEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error || "Could not delete your account. Try again in a moment.");
        return;
      }
      // The account is gone. Show the confirmation before tearing the session down --
      // the leftover tokens are already dead server-side, so nothing can be done with
      // them in the meantime.
      setDeleted(true);
    } catch {
      setDeleteError("Something went wrong. Try again in a moment.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSetNewPassword(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setNotice("");

    // Same policy as sign-up, enforced here too (Supabase re-checks server-side).
    const pwErr = passwordPolicyError(newPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Both passwords must match.");
      return;
    }

    setSubmitting(true);
    try {
      // No captcha token here: Supabase enforces CAPTCHA on signup/signin/recover,
      // not on updateUser. The recovery session itself is the proof of ownership.
      const { error: upErr } = await supabase.auth.updateUser({ password: newPassword });
      if (upErr) {
        setError(upErr.message || "Could not update your password. Try again.");
      } else {
        setNewPassword("");
        setConfirmPassword("");
        setNotice("Password updated. You're signed in.");
        clearRecovery(); // leave recovery mode -> normal account view
      }
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetCaptcha() {
    setCaptchaToken("");
    try {
      if (turnstileRef.current && turnstileRef.current.reset) turnstileRef.current.reset();
    } catch {
      // Widget may already be unmounted (e.g. after a successful sign-in) - ignore.
    }
  }

  // Switch mode and clear any stale error/notice + password so a message from one
  // flow never bleeds into another.
  function switchMode(next) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    resetCaptcha(); // a token issued for one form must not carry into another
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

    // Normalize the email (trim + lowercase) BEFORE it is used anywhere. Emails are
    // case-insensitive for the account, so this keeps sign-up/sign-in consistent and
    // denies the case-manipulation trick (Bob@x / BOB@x / bOb@x) any way to split a
    // per-email counter/lockout into separate keys. Passwords are NEVER normalized --
    // altering a password would change it.
    const em = email.trim().toLowerCase();

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
      if (mode === "signup") {
        const pwErr = passwordPolicyError(password);
        if (pwErr) {
          setError(pwErr);
          return;
        }
      }
    }

    // Safety net behind the disabled submit button: Supabase rejects any auth call
    // without a valid captcha token, so fail with a clear message rather than a raw
    // "captcha verification process failed" from the server.
    if (captchaEnabled && !captchaToken) {
      setError("Please complete the verification challenge below.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error: suErr } = await supabase.auth.signUp({
          email: em,
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });
        if (suErr) {
          // Anti-enumeration: never confirm whether an email is already registered.
          // Map the "already registered" signal to the SAME neutral notice a brand-new
          // sign-up shows, so an attacker cannot tell existing accounts apart. Genuine
          // input errors (weak password, rate limit) are still surfaced so the user can
          // act. (Also enable "prevent enumeration" in the Supabase dashboard for the
          // server-side half of this.)
          const msg = (suErr.message || "").toLowerCase();
          if (msg.includes("already") && msg.includes("registered")) {
            setNotice("Check your email to confirm your account, then sign in.");
          } else {
            setError(suErr.message || "Could not create your account. Try again.");
          }
        } else {
          // Email confirmation is ON: the user is NOT logged in yet. Tell them to
          // confirm before signing in -- do not assume an active session.
          setNotice("Check your email to confirm your account, then sign in.");
        }
      } else if (mode === "signin") {
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email: em,
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });
        if (siErr) {
          setError(siErr.message || "Could not sign you in. Check your details and try again.");
        }
        // Success: no state set here -- onAuthStateChange re-renders into signed-in view.
      } else if (mode === "forgot") {
        // NOTE: resetPasswordForEmail takes options as its SECOND argument (there is
        // no nested `options` key here, unlike signUp / signInWithPassword above).
        // redirectTo sends the user back to THIS origin, so a reset started on
        // localhost returns to localhost instead of the production Site URL. The
        // origin must be listed under Supabase Auth -> URL Configuration -> Redirect URLs.
        const resetOptions = { redirectTo: window.location.origin };
        if (captchaToken) resetOptions.captchaToken = captchaToken;
        const { error: rpErr } = await supabase.auth.resetPasswordForEmail(em, resetOptions);
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
      // The token was consumed by the attempt above (success OR failure), so always
      // clear it and re-arm the widget -- otherwise the next submit replays a used
      // token and Supabase rejects it.
      resetCaptcha();
    }
  }

  // --- Unconfigured client: degrade gracefully, never crash. ---
  if (!supabase) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <VLogo className="auth-logo" />
          <span className="auth-rule" aria-hidden="true" />
          <p className="auth-lead">Accounts are temporarily unavailable.</p>
          <p className="auth-text">
            We could not reach the accounts service right now. The rest of the Arena
            works as normal -- every battle still runs free, no account needed.
          </p>
        </div>
      </div>
    );
  }

  // --- Still resolving the initial session. ---
  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <VLogo className="auth-logo" />
          <span className="auth-rule" aria-hidden="true" />
          <p className="auth-loading">Loading...</p>
        </div>
      </div>
    );
  }

  // --- Expired / already-used / invalid email link. Checked FIRST: a dead link
  // never produces a session, so without this the app would just render the normal
  // page and the link would look silently broken (which is exactly what happens
  // today). Recovery links are single-use, so this also covers the common case of
  // an email scanner prefetching and consuming the link before the user clicks. ---
  if (linkError) {
    const expired = (linkError.code || "").indexOf("expired") !== -1;
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <VLogo className="auth-logo" />
          <span className="auth-rule" aria-hidden="true" />
          <h2 className="auth-heading">
            {expired ? "This link has expired" : "This link is no longer valid"}
          </h2>
          <p className="auth-text">
            {expired
              ? "Password reset links expire after a short time, and can only be used once."
              : "This link has already been used, or it is not valid anymore."}
            {" "}Request a new one and we'll email you a fresh link.
          </p>
          <div className="auth-actions">
            <button
              type="button"
              className="auth-submit"
              onClick={() => {
                clearLinkError();
                switchMode("forgot");
              }}
            >
              Send a New Link
            </button>
            <button
              type="button"
              className="auth-submit auth-secondary"
              onClick={() => {
                clearLinkError();
                switchMode("signin");
              }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Password recovery: the user clicked the reset link in their email. This is
  // checked BEFORE the signed-in view, because a recovery session DOES have a user
  // -- without this branch the link would silently sign them in and never let them
  // set a new password. ---
  if (recovery) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <VLogo className="auth-logo" />
          <span className="auth-rule" aria-hidden="true" />
          <h2 className="auth-heading">Set a new password</h2>
          <p className="auth-text">
            Choose a new password for <strong>{user ? user.email : "your account"}</strong>.
          </p>

          <form className="auth-form" onSubmit={handleSetNewPassword} noValidate>
            <label className="auth-field">
              <span className="auth-label">New password</span>
              <input
                className="auth-input"
                type="password"
                id="auth-new-password"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={MIN_PASSWORD + "+ chars, with a capital and a number"}
                disabled={submitting}
              />
            </label>

            <label className="auth-field">
              <span className="auth-label">Confirm new password</span>
              <input
                className="auth-input"
                type="password"
                id="auth-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                disabled={submitting}
              />
            </label>

            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-notice" role="status">{notice}</p>}

            <div className="auth-actions">
              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save New Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Account just deleted: confirm before dropping to the logged-out form. Checked
  // BEFORE the signed-in branch, because the browser still holds the (now dead) session
  // until the user dismisses this. ---
  if (deleted) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <VLogo className="auth-logo" />
          <span className="auth-rule" aria-hidden="true" />
          <h2 className="auth-heading">Your account has been deleted</h2>
          <p className="auth-text">
            Your sign-in details and saved battle history are gone. Thanks for stopping
            by the Arena, you're welcome back any time.
          </p>
          <div className="auth-actions">
            <button
              className="auth-submit"
              onClick={async () => {
                try { await supabase.auth.signOut(); } catch { /* session is dead anyway */ }
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Signed-in view (Step 2 scope: confirm + sign out only). ---
  if (user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <VLogo className="auth-logo" />
          <span className="auth-rule" aria-hidden="true" />
          <p className="auth-lead">
            You're signed in as <strong>{user.email}</strong>.
          </p>
          <p className="auth-text">
            Every battle you run while signed in is saved to your history. Your record
            and more are coming soon.
          </p>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="auth-actions">
            {onViewBattles && (
              <button type="button" className="auth-submit auth-secondary" onClick={onViewBattles}>
                View My Battles
              </button>
            )}
            <button className="auth-submit" onClick={handleSignOut} disabled={submitting}>
              {submitting ? "Signing out..." : "Sign Out"}
            </button>
          </div>

          <style>{`
            .auth-danger { margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--line); }
            .auth-danger-toggle {
              background: none; border: none; padding: 0; cursor: pointer;
              font-family: 'Inter', sans-serif; font-size: 0.78rem; color: var(--muted);
              text-decoration: underline; text-underline-offset: 3px;
            }
            .auth-danger-toggle:hover { color: #9b2c2c; }
            .auth-danger-panel {
              margin-top: 1rem; border: 1px solid #9b2c2c; border-radius: 4px;
              background: rgba(155,44,44,0.06); padding: 1rem 1.15rem; text-align: left;
            }
            .auth-danger-panel p {
              font-family: 'Inter', sans-serif; font-size: 0.85rem; line-height: 1.65;
              color: var(--ink-soft); margin: 0 0 0.7rem;
            }
            .auth-danger-panel strong { color: #9b2c2c; }
            .auth-danger-input {
              width: 100%; box-sizing: border-box; margin-bottom: 0.7rem;
              font-family: 'Inter', sans-serif; font-size: 0.9rem;
              padding: 0.6rem 0.7rem; border: 1px solid var(--line-strong);
              border-radius: 4px; background: var(--surface); color: var(--ink);
            }
            .auth-danger-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
            .auth-danger-go {
              font-family: 'Inter', sans-serif; font-size: 0.78rem;
              background: #9b2c2c; color: #fff; border: 1px solid #9b2c2c;
              border-radius: 4px; padding: 0.5rem 0.95rem; cursor: pointer;
            }
            .auth-danger-go:disabled { opacity: 0.55; cursor: default; }
            .auth-danger-cancel {
              font-family: 'Inter', sans-serif; font-size: 0.78rem;
              background: transparent; color: var(--ink-soft);
              border: 1px solid var(--line-strong);
              border-radius: 4px; padding: 0.5rem 0.95rem; cursor: pointer;
            }
          `}</style>

          <div className="auth-danger">
            {!deleteOpen ? (
              <button
                type="button"
                className="auth-danger-toggle"
                onClick={() => { setDeleteError(""); setDeleteEmail(""); setDeleteOpen(true); }}
              >
                Delete my account
              </button>
            ) : (
              <div className="auth-danger-panel" role="alert">
                <p>
                  <strong>Delete your account permanently?</strong> This removes your
                  sign-in details and your saved battle history. It cannot be undone.
                </p>
                <p>
                  The battles you ran stay in the Arena, but nothing links them to you
                  once your account is gone. If a battle contains anything private, use
                  Delete on it in My Battles <em>before</em> deleting your account, since
                  afterwards you will not be able to find it.
                </p>
                <p>Type <strong>{user.email}</strong> to confirm.</p>
                <input
                  className="auth-danger-input"
                  type="email"
                  id="auth-delete-confirm"
                  name="deleteConfirmEmail"
                  autoComplete="off"
                  aria-label="Type your email address to confirm account deletion"
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  placeholder="your email address"
                  disabled={deleting}
                />
                {deleteError && <p className="auth-error" role="alert">{deleteError}</p>}
                <div className="auth-danger-actions">
                  <button
                    type="button"
                    className="auth-danger-go"
                    onClick={handleDeleteAccount}
                    disabled={
                      deleting ||
                      deleteEmail.trim().toLowerCase() !== (user.email || "").trim().toLowerCase()
                    }
                  >
                    {deleting ? "Deleting..." : "Delete my account"}
                  </button>
                  <button
                    type="button"
                    className="auth-danger-cancel"
                    onClick={() => { setDeleteOpen(false); setDeleteEmail(""); setDeleteError(""); }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
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
    <div className="auth-shell">
      <div className="auth-card">
      <VLogo className="auth-logo" />
      <span className="auth-rule" aria-hidden="true" />
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
            id="auth-email"
            name="email"
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
              id="auth-password"
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? MIN_PASSWORD + "+ chars, with a capital and a number" : "Your password"}
              disabled={submitting}
            />
          </label>
        )}

        {/* Turnstile CAPTCHA. Rendered for ALL THREE flows (sign in, sign up, forgot
            password) because Supabase requires a token on each of those endpoints.
            Light theme to match the cream card. */}
        {captchaEnabled && (
          <div className="auth-captcha">
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => { setCaptchaToken(token); setError(""); }}
              onExpire={() => setCaptchaToken("")}
              onError={() => {
                setCaptchaToken("");
                setError("Verification could not load. Refresh the page and try again.");
              }}
              options={{ theme: "light", size: "normal" }}
            />
          </div>
        )}

        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-notice" role="status">{notice}</p>}

        <div className="auth-actions">
          <button
            className="auth-submit"
            type="submit"
            disabled={submitting || (captchaEnabled && !captchaToken)}
          >
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
    </div>
  );
}
