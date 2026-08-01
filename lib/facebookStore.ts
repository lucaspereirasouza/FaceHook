import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

import { getSupabaseAdmin } from "@/lib/supabase"

export const FACEBOOK_SESSION_COOKIE = "facehook_session"
export const FACEBOOK_OAUTH_STATE_COOKIE = "facehook_oauth_state"
export const SESSION_MAX_AGE_SECONDS = 60 * 24 * 60 * 60

type FacebookConnectionRecord = {
  user_id: string
  facebook_user_id: string
  facebook_name: string | null
  access_token_encrypted: string
  expires_at: string | null
  invalidated_at: string | null
  status: "connected" | "expired" | "invalid" | "revoked"
}

type ActiveSession = {
  userId: string
}

export type FacebookSessionToken = {
  userId: string
  accessToken: string
}

function hashOpaqueValue(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function getEncryptionKey() {
  const encodedKey = process.env.FACEHOOK_ENCRYPTION_KEY?.trim()

  if (!encodedKey) {
    throw new Error("FACEHOOK_ENCRYPTION_KEY must be configured on the server.")
  }

  const key = Buffer.from(encodedKey, "base64")
  if (key.length !== 32) {
    throw new Error("FACEHOOK_ENCRYPTION_KEY must be a base64-encoded 32-byte key.")
  }

  return key
}

export function encryptServerSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])

  return ["v1", iv.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".")
}

function decryptSecret(value: string) {
  const [version, iv, ciphertext, authTag] = value.split(".")
  if (version !== "v1" || !iv || !ciphertext || !authTag) {
    throw new Error("Stored Facebook token has an unsupported encryption format.")
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(authTag, "base64url"))

  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8")
}

function toExpiresAt(expiresAt?: number) {
  return expiresAt ? new Date(expiresAt).toISOString() : null
}

async function getActiveSession(sessionToken?: string): Promise<ActiveSession | null> {
  if (!sessionToken) return null

  const { data, error } = await getSupabaseAdmin()
    .from("app_sessions")
    .select("user_id")
    .eq("token_hash", hashOpaqueValue(sessionToken))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (error) throw error
  return data ? { userId: data.user_id as string } : null
}

export async function getCurrentAppUserId(sessionToken?: string) {
  return (await getActiveSession(sessionToken))?.userId ?? null
}

async function getConnectionForUser(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("facebook_connections")
    .select("user_id, facebook_user_id, facebook_name, access_token_encrypted, expires_at, invalidated_at, status")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as FacebookConnectionRecord | null
}

async function getOrCreateAppUser(facebookUserId: string, name?: string) {
  const admin = getSupabaseAdmin()
  const { data: existingConnection, error: existingConnectionError } = await admin
    .from("facebook_connections")
    .select("user_id")
    .eq("facebook_user_id", facebookUserId)
    .maybeSingle()

  if (existingConnectionError) throw existingConnectionError
  if (existingConnection) return existingConnection.user_id as string

  const { data: user, error: userError } = await admin
    .from("app_users")
    .insert({ display_name: name ?? `Facebook ${facebookUserId}` })
    .select("id")
    .single()

  if (userError) throw userError
  return user.id as string
}

export async function saveFacebookConnection({
  facebookUserId,
  name,
  accessToken,
  expiresAt,
}: {
  facebookUserId: string
  name?: string
  accessToken: string
  expiresAt?: number
}) {
  const admin = getSupabaseAdmin()
  let userId = await getOrCreateAppUser(facebookUserId, name)
  const connection = {
    facebook_user_id: facebookUserId,
    facebook_name: name ?? null,
    access_token_encrypted: encryptServerSecret(accessToken),
    token_encryption_key_version: "v1",
    status: "connected" as const,
    expires_at: toExpiresAt(expiresAt),
    invalidated_at: null,
    last_validated_at: new Date().toISOString(),
  }

  const { error: updateError } = await admin.from("facebook_connections").update(connection).eq("user_id", userId)
  if (updateError) throw updateError

  const { data: existingConnection, error: lookupError } = await admin
    .from("facebook_connections")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existingConnection) return { userId }

  const { error: insertError } = await admin.from("facebook_connections").insert({ user_id: userId, ...connection })
  if (insertError?.code === "23505") {
    const { data: existingConnection, error: retryError } = await admin
      .from("facebook_connections")
      .select("user_id")
      .eq("facebook_user_id", facebookUserId)
      .single()
    if (retryError) throw retryError

    userId = existingConnection.user_id as string
    const { error: updateError } = await admin.from("facebook_connections").update(connection).eq("user_id", userId)
    if (updateError) throw updateError
  }

  if (insertError && insertError.code !== "23505") throw insertError
  return { userId }
}

export async function createSession(userId: string) {
  const sessionToken = randomBytes(32).toString("base64url")
  const { error } = await getSupabaseAdmin().from("app_sessions").insert({
    user_id: userId,
    token_hash: hashOpaqueValue(sessionToken),
    expires_at: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
  })

  if (error) throw error
  return sessionToken
}

export async function revokeSession(sessionToken?: string) {
  if (!sessionToken) return

  const { error } = await getSupabaseAdmin()
    .from("app_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashOpaqueValue(sessionToken))
    .is("revoked_at", null)

  if (error) throw error
}

export async function createOAuthState(redirectUri: string) {
  const state = randomBytes(32).toString("base64url")
  const { error } = await getSupabaseAdmin().from("facebook_oauth_states").insert({
    state_hash: hashOpaqueValue(state),
    redirect_uri: redirectUri,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  if (error) throw error
  return state
}

export async function consumeOAuthState(state: string, redirectUri: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("facebook_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state_hash", hashOpaqueValue(state))
    .eq("redirect_uri", redirectUri)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function getFacebookConnection(sessionToken?: string) {
  const session = await getActiveSession(sessionToken)
  if (!session) return { status: "not_connected" as const }

  const connection = await getConnectionForUser(session.userId)
  if (!connection) return { status: "not_connected" as const }

  const account = {
    id: connection.facebook_user_id,
    name: connection.facebook_name ?? undefined,
    expiresAt: connection.expires_at ? Date.parse(connection.expires_at) : undefined,
  }

  if (connection.invalidated_at || connection.status === "invalid" || connection.status === "revoked") {
    return { status: "invalid" as const, account }
  }

  if (connection.status === "expired" || (connection.expires_at && Date.parse(connection.expires_at) <= Date.now())) {
    return { status: "expired" as const, account }
  }

  return { status: "connected" as const, account }
}

export async function getFacebookSessionToken(sessionToken?: string): Promise<FacebookSessionToken | null> {
  const session = await getActiveSession(sessionToken)
  if (!session) return null

  return getFacebookAccessTokenForUser(session.userId)
}

export async function getFacebookAccessTokenForUser(userId: string): Promise<FacebookSessionToken | null> {
  const connection = await getConnectionForUser(userId)
  if (
    !connection ||
    connection.status !== "connected" ||
    connection.invalidated_at ||
    (connection.expires_at && Date.parse(connection.expires_at) <= Date.now())
  ) {
    return null
  }

  return { userId, accessToken: decryptSecret(connection.access_token_encrypted) }
}

export async function invalidateFacebookConnection(userId: string) {
  const { error } = await getSupabaseAdmin()
    .from("facebook_connections")
    .update({ status: "invalid", invalidated_at: new Date().toISOString() })
    .eq("user_id", userId)

  if (error) throw error
}
