import "server-only"

import { createClient } from "@supabase/supabase-js"

function getRequiredServerEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} must be configured on the server.`)
  }

  return value
}

export function getSupabaseAdmin() {
  return createClient(
    getRequiredServerEnv("SUPABASE_URL"),
    getRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}