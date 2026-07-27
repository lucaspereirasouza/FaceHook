import { NextRequest, NextResponse } from "next/server"

import { badRequestResponse, getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { asStringList, toBusinessProfile } from "@/lib/dashboard-models"
import { encryptServerSecret } from "@/lib/facebookStore"
import { getSupabaseAdmin } from "@/lib/supabase"

function requiredString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= maximumLength ? trimmed : null
}

function getEncryptedDiscordWebhook(value: unknown) {
  if (value === undefined || value === "") return null
  if (typeof value !== "string") return undefined

  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.hostname !== "discord.com" || !url.pathname.startsWith("/api/webhooks/")) {
      return undefined
    }
    return encryptServerSecret(value)
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const admin = getSupabaseAdmin()
    const [{ data: profiles, error: profilesError }, { data: leads, error: leadsError }] = await Promise.all([
      admin.from("business_profiles").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
      admin.from("leads").select("profile_id").eq("owner_id", ownerId),
    ])
    if (profilesError || leadsError) return internalServerErrorResponse()

    const matchedLeadCount = new Map<string, number>()
    for (const lead of leads ?? []) {
      if (typeof lead.profile_id === "string") {
        matchedLeadCount.set(lead.profile_id, (matchedLeadCount.get(lead.profile_id) ?? 0) + 1)
      }
    }

    return NextResponse.json((profiles ?? []).map((profile) =>
      toBusinessProfile(profile as Record<string, unknown>, matchedLeadCount.get(profile.id as string) ?? 0),
    ))
  } catch {
    return internalServerErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const body = await request.json() as Record<string, unknown>
    const name = requiredString(body.name, 120)
    const prompt = requiredString(body.prompt, 10_000)
    if (!name || !prompt) return badRequestResponse("Profile name and prompt are required.")

    const encryptedWebhook = getEncryptedDiscordWebhook(body.discordWebhook)
    if (encryptedWebhook === undefined) return badRequestResponse("Discord webhook must be a valid HTTPS Discord webhook URL.")

    const { data, error } = await getSupabaseAdmin()
      .from("business_profiles")
      .insert({
        owner_id: ownerId,
        name,
        prompt,
        description: requiredString(body.description, 2_000) ?? "",
        services: asStringList(body.services),
        keywords: asStringList(body.keywords),
        negative_keywords: asStringList(body.negativeKeywords),
        locations: asStringList(body.locations),
        response_style: requiredString(body.responseStyle, 2_000) ?? "",
        discord_webhook_encrypted: encryptedWebhook,
        discord_webhook_key_version: encryptedWebhook ? "v1" : null,
        enabled: body.enabled !== false,
      })
      .select("*")
      .single()
    if (error || !data) return internalServerErrorResponse()

    return NextResponse.json(toBusinessProfile(data as Record<string, unknown>), { status: 201 })
  } catch {
    return badRequestResponse("Request body must be valid JSON.")
  }
}