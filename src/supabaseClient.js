// src/supabaseClient.js
// The BROWSER Supabase client, used only for auth (and later, RLS-protected
// reads). Built with the PUBLIC anon key, which is designed to be exposed in
// the bundle: it can only do what Row-Level Security policies allow.
//
// This is completely separate from the four server-side clients in /api, which
// use the SERVICE_ROLE key via process.env and are never bundled. Vite only
// exposes env vars prefixed with VITE_ to the browser, so the service-role key
// cannot leak into this file even by accident.

import { createClient } from "@supabase/supabase-js";

// Capture any auth error Supabase appended to the URL. This MUST run before
// createClient() below: supabase-js processes and then STRIPS the hash, so reading
// it later would race and usually find nothing.
//
// An expired, already-used, or otherwise invalid email link comes back as:
//   #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
// (Recovery links are SINGLE-USE, so an email scanner that prefetches the link can
// consume it before the user ever clicks.) Without this the app just renders the
// homepage and the link looks silently broken.
function readAuthLinkError() {
  if (typeof window === "undefined") return null;
  const raw = (window.location.hash || "").replace(/^#/, "");
  if (!raw || raw.indexOf("error") === -1) return null;
  const p = new URLSearchParams(raw);
  const error = p.get("error");
  const code = p.get("error_code");
  if (!error && !code) return null;
  const description = p.get("error_description") || "";
  // Clear the hash so a refresh does not re-trigger the error screen.
  try {
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  } catch {
    // Non-fatal: the screen still shows, the hash just lingers.
  }
  return { error: error || "", code: code || "", description: description.replace(/\+/g, " ") };
}

export const authLinkError = readAuthLinkError();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Graceful degradation: if the env vars are not set (local dev without a
// .env, or a misconfigured deploy), export null instead of throwing. Consumers
// (AuthContext) treat a null client as "auth unavailable" and the rest of the
// app keeps working exactly as before.
let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    "Supabase browser client not configured: set VITE_SUPABASE_URL and " +
    "VITE_SUPABASE_ANON_KEY to enable auth. The app runs normally without them."
  );
}

export default supabase;
