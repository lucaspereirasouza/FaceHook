import { NextRequest, NextResponse } from "next/server"

import { badRequestResponse, getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { asStringList, toMonitoredGroup } from "@/lib/dashboard-models"
import { getSupabaseAdmin } from "@/lib/supabase"

function parseFacebookGroupUrl(value: unknown) {
  if (typeof value !== "string") return null

  try {
    const url = new URL(value.trim())
    const isFacebookHost = url.hostname === "facebook.com" || url.hostname.endsWith(".facebook.com")
    return url.protocol === "https:" && isFacebookHost ? url.toString() : null
  } catch {
    return null
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const { id } = await context.params
    const body = await request.json() as Record<string, unknown>
    const admin = getSupabaseAdmin()
    const { data: currentGroup, error: currentGroupError } = await admin
      .from("monitored_groups")
      .select("id, name, url, interval_minutes, enabled, status")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle()
    if (currentGroupError) return internalServerErrorResponse()
    if (!currentGroup) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const { data: existingLinks, error: existingLinksError } = await admin
      .from("group_profiles")
      .select("profile_id")
      .eq("group_id", id)
    if (existingLinksError) return internalServerErrorResponse()

    const hasProfileUpdate = body.profiles !== undefined
    const profileIds = hasProfileUpdate
      ? asStringList(body.profiles)
      : (existingLinks ?? []).map((link) => link.profile_id as string)
    const name = body.name === undefined ? currentGroup.name as string : typeof body.name === "string" ? body.name.trim() : ""
    const url = body.url === undefined ? currentGroup.url as string : parseFacebookGroupUrl(body.url)
    const intervalMinutes = body.intervalMinutes === undefined
      ? Number(currentGroup.interval_minutes)
      : Number(body.intervalMinutes)
    const enabled = body.enabled === undefined ? currentGroup.enabled === true : body.enabled === true

    if (!name || name.length > 200 || !url || !Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 1440) {
      return badRequestResponse("Name, HTTPS Facebook URL, and a 1-1440 minute interval are required.")
    }
    if (!profileIds.length) return badRequestResponse("At least one business profile is required.")

    const { data: ownedProfiles, error: ownedProfilesError } = await admin
      .from("business_profiles")
      .select("id")
      .eq("owner_id", ownerId)
      .in("id", profileIds)
    if (ownedProfilesError) return internalServerErrorResponse()
    if ((ownedProfiles ?? []).length !== profileIds.length) return badRequestResponse("One or more profiles are unavailable.")

    const status = body.enabled === undefined ? currentGroup.status : enabled ? "active" : "paused"
    const { data: updatedGroup, error: updateError } = await admin
      .from("monitored_groups")
      .update({ name, url, interval_minutes: intervalMinutes, enabled, status })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("*")
      .single()
    if (updateError || !updatedGroup) return internalServerErrorResponse()

    if (hasProfileUpdate) {
      const { error: deleteLinksError } = await admin.from("group_profiles").delete().eq("group_id", id)
      if (deleteLinksError) return internalServerErrorResponse()

      const { error: insertLinksError } = await admin
        .from("group_profiles")
        .insert(profileIds.map((profileId) => ({ group_id: id, profile_id: profileId })))
      if (insertLinksError) return internalServerErrorResponse()
    }

    return NextResponse.json(toMonitoredGroup(updatedGroup as Record<string, unknown>, profileIds))
  } catch {
    return badRequestResponse("Request body must be valid JSON.")
  }
}