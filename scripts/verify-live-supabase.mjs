import { createClient } from "@supabase/supabase-js"

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "FACEHOOK_TEST_ACCESS_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]

function requiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function responseCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie()
  }

  const cookie = response.headers.get("set-cookie")
  return cookie ? [cookie] : []
}

function sessionCookie(response) {
  const cookie = responseCookies(response).find((value) => value.startsWith("facehook_session="))
  const match = cookie?.match(/^facehook_session=([^;]+)/)
  return match?.[1]
}

function containsSensitiveField(value) {
  if (!value || typeof value !== "object") return false

  return Object.entries(value).some(([key, child]) => {
    const normalizedKey = key.toLocaleLowerCase()
    if (
      normalizedKey.includes("access_token") ||
      normalizedKey.includes("accesstoken") ||
      normalizedKey.includes("tokenhash") ||
      normalizedKey.includes("token_hash")
    ) {
      return true
    }
    return containsSensitiveField(child)
  })
}

async function request(appUrl, path, options = {}) {
  const response = await fetch(new URL(path, appUrl), {
    ...options,
    signal: AbortSignal.timeout(15_000),
  })
  return response
}

async function main() {
  for (const name of REQUIRED_ENVIRONMENT_VARIABLES) requiredEnvironmentVariable(name)

  const appUrl = new URL(process.env.FACEHOOK_TEST_APP_URL?.trim() || "http://localhost:3000")
  const accessToken = requiredEnvironmentVariable("FACEHOOK_TEST_ACCESS_TOKEN")
  const admin = createClient(
    requiredEnvironmentVariable("SUPABASE_URL"),
    requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const unauthenticatedGroups = await request(appUrl, "/api/groups")
  assert(unauthenticatedGroups.status === 401, "Unauthenticated group access must return 401.")

  const loginResponse = await request(appUrl, "/api/auth/facebook/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  })
  assert(loginResponse.ok, "Facebook token authentication failed.")

  const cookieValue = sessionCookie(loginResponse)
  assert(cookieValue, "Authentication response did not set an opaque session cookie.")
  assert(!cookieValue.includes(accessToken), "Session cookie must not contain the Facebook access token.")

  const cookieHeader = { Cookie: `facehook_session=${cookieValue}` }
  const connectionResponse = await request(appUrl, "/api/auth/facebook/me", { headers: cookieHeader })
  assert(connectionResponse.ok, "Authenticated connection lookup failed.")
  const connection = await connectionResponse.json()
  assert(connection.status === "connected" && typeof connection.account?.id === "string", "Facebook account is not connected.")
  assert(!containsSensitiveField(connection), "Connection response exposed sensitive token data.")

  for (const path of ["/api/groups", "/api/profiles", "/api/leads", "/api/stats/overview"]) {
    const response = await request(appUrl, path, { headers: cookieHeader })
    assert(response.ok, `Authenticated request to ${path} failed.`)
    const payload = await response.json()
    assert(!containsSensitiveField(payload), `${path} exposed sensitive token data.`)
  }

  const { data: storedConnection, error: connectionError } = await admin
    .from("facebook_connections")
    .select("user_id, facebook_user_id, status, token_encryption_key_version, access_token_encrypted")
    .eq("facebook_user_id", connection.account.id)
    .maybeSingle()
  if (connectionError) throw new Error("Could not inspect the persisted Facebook connection.")
  assert(storedConnection, "No persisted Facebook connection was found.")
  assert(storedConnection.status === "connected", "Persisted Facebook connection is not active.")
  assert(storedConnection.token_encryption_key_version === "v1", "Unexpected token encryption key version.")
  assert(storedConnection.access_token_encrypted !== accessToken, "Facebook token was stored without encryption.")
  assert(storedConnection.access_token_encrypted.startsWith("v1."), "Stored token has an unexpected encryption format.")

  const { data: session, error: sessionError } = await admin
    .from("app_sessions")
    .select("token_hash, expires_at, revoked_at")
    .eq("user_id", storedConnection.user_id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (sessionError) throw new Error("Could not inspect the persisted application session.")
  assert(session, "No active persisted application session was found.")
  assert(/^[a-f0-9]{64}$/.test(session.token_hash), "Session value is not stored as a SHA-256 hash.")
  assert(session.token_hash !== cookieValue, "Opaque session cookie was stored without hashing.")

  console.log("Live Supabase verification succeeded.")
  console.log("Verified: protected API access, encrypted Facebook token storage, and hashed session persistence.")
}

main().catch((error) => {
  console.error(error instanceof Error ? `Live Supabase verification failed: ${error.message}` : "Live Supabase verification failed.")
  process.exitCode = 1
})