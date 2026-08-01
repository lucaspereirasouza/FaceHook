import { NextRequest, NextResponse } from "next/server"

import { badRequestResponse, getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { asStringList, toBusinessProfile } from "@/lib/dashboard-models"
import { encryptServerSecret } from "@/lib/facebookStore"
import { parseClassifierModel } from "@/lib/classifier"
import { getSupabaseAdmin } from "@/lib/supabase"

function optionalString(value: unknown, maximumLength: number) {
  if (value === undefined) return undefined
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length <= maximumLength ? trimmed : null
}

function encryptedWebhook(value: unknown) {
  if (value === undefined) return undefined
  if (value === "") return null
  if (typeof value !== "string") return false

  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.hostname !== "discord.com" || !url.pathname.startsWith("/api/webhooks/")) return false
    return encryptServerSecret(value)
  } catch {
    return false
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const { id } = await context.params
    const body = await request.json() as Record<string, unknown>
    const name = optionalString(body.name, 120)
    const description = optionalString(body.description, 2_000)
    const prompt = optionalString(body.prompt, 10_000)
    const responseStyle = optionalString(body.responseStyle, 2_000)
    const webhook = encryptedWebhook(body.discordWebhook)
    const classifierModel = body.classifierModel === undefined ? undefined : parseClassifierModel(body.classifierModel)
    if (name === null || !name || description === null || prompt === null || !prompt || responseStyle === null || webhook === false || (body.classifierModel !== undefined && !classifierModel)) {
      return badRequestResponse("A profile name, AI prompt, and valid field values are required.")
    }

    const updates = {
      name,
      description: description ?? "",
      prompt,
      services: body.services === undefined ? undefined : asStringList(body.services),
      keywords: body.keywords === undefined ? undefined : asStringList(body.keywords),
      negative_keywords: body.negativeKeywords === undefined ? undefined : asStringList(body.negativeKeywords),
      locations: body.locations === undefined ? undefined : asStringList(body.locations),
      response_style: responseStyle ?? "",
      enabled: body.enabled === undefined ? undefined : body.enabled === true,
      classifier_model: classifierModel,
      discord_webhook_encrypted: webhook,
      discord_webhook_key_version: webhook === undefined ? undefined : webhook ? "v1" : null,
    }
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from("business_profiles")
      .update(updates)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("*")
      .maybeSingle()
    if (error) return internalServerErrorResponse()
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const { count, error: countError } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .eq("profile_id", id)
    if (countError) return internalServerErrorResponse()

    return NextResponse.json(toBusinessProfile(data as Record<string, unknown>, count ?? 0))
  } catch {
    return badRequestResponse("Request body must be valid JSON.")
  }
}