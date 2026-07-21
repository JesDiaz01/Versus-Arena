// src/AuthContext.jsx
// Session plumbing for Supabase Auth. Wraps the app and exposes
// { session, user, loading } via useAuth(). Purely additive: no UI, no
// behavior change anywhere -- components simply gain the ABILITY to ask
// "who is logged in?".
//
// If the browser Supabase client is unconfigured (src/supabaseClient.js
// exported null), this provider settles immediately into a safe logged-out
// state (session null, user null, loading false) so nothing downstream breaks.

import { createContext, useContext, useState, useEffect } from "react";
import supabase, { authLinkError } from "./supabaseClient";

const AuthContext = createContext({
  session: null,
  user: null,
  loading: false,
  recovery: false,
  clearRecovery: () => {},
  linkError: null,
  clearLinkError: () => {},
});

export function AuthProvider({ children }) {
  // loading starts true only when there is a client to ask; with no client
  // there is nothing to wait for.
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  // True from the moment Supabase reports PASSWORD_RECOVERY (the user arrived via
  // a reset-password email link) until the new password is saved. While it is set,
  // the app shows the "set a new password" form instead of the normal account view
  // -- otherwise the reset link would silently sign the user in and dead-end.
  const [recovery, setRecovery] = useState(false);
  // Set when the visitor arrived from an expired / already-used / invalid email
  // link. Read once at module load (see supabaseClient) before the hash is stripped.
  const [linkError, setLinkError] = useState(authLinkError);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    // Load any existing session (e.g. a returning user with a stored token).
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data && data.session ? data.session : null);
      setLoading(false);
    }).catch((err) => {
      console.error("getSession failed:", err);
      if (!cancelled) setLoading(false);
    });

    // Keep session state live across sign-in, sign-out, and token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      // Arriving from a reset-password email fires PASSWORD_RECOVERY with a valid
      // (recovery) session. Flag it so the UI can demand a new password. Signing
      // out always clears the flag so it can never stick around.
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
    });

    return () => {
      cancelled = true;
      if (sub && sub.subscription) sub.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session ? session.user : null,
    loading,
    recovery,
    // Called once the new password is saved, so the app returns to normal.
    clearRecovery: () => setRecovery(false),
    linkError,
    clearLinkError: () => setLinkError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
