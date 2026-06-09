// api/get-battle.js
// Vercel Serverless Function — fetches a saved battle by ID from Supabase.
// Uses the service role key server-side only; the key is never sent to the browser.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!id || id.length > 20) {
    return res.status(400).json({ error: "Invalid battle ID." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server not configured." });
  }

  try {
    const db = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await db
      .from("battles")
      .select("battle_data, result")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Battle not found." });
    }

    return res.status(200).json({ battle_data: data.battle_data, result: data.result });
  } catch (err) {
    console.error("get-battle error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
