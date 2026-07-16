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
