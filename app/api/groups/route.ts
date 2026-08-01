import { NextRequest, NextResponse } from "next/server"

import { badRequestResponse, getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { asStringList, toMonitoredGroup } from "@/lib/dashboard-models"
import { resolveFacebookGroup } from "@/lib/facebookGraph"
import { getFacebookAccessTokenForUser } from "@/lib/facebookStore"
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

function getFacebookGroupIdentifier(url: string) {
  const pathSegments = new URL(url).pathname.split("/").filter(Boolean)
  const groupsIndex = pathSegments.findIndex((segment) => segment === "groups")
  return groupsIndex >= 0 ? pathSegments[groupsIndex + 1] ?? null : null
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const admin = getSupabaseAdmin()
    const { data: groups, error: groupsError } = await admin
      .from("monitored_groups")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
    if (groupsError) return internalServerErrorResponse()

    const groupIds = (groups ?? []).map((group) => group.id as string)
    const { data: groupProfiles, error: profilesError } = groupIds.length
      ? await admin.from("group_profiles").select("group_id, profile_id").in("group_id", groupIds)
      : { data: [], error: null }
    if (profilesError) return internalServerErrorResponse()

    const profilesByGroup = new Map<string, string[]>()
    for (const groupProfile of groupProfiles ?? []) {
      const groupId = groupProfile.group_id as string
      const profileIds = profilesByGroup.get(groupId) ?? []
      profileIds.push(groupProfile.profile_id as string)
      profilesByGroup.set(groupId, profileIds)
    }

    return NextResponse.json((groups ?? []).map((group) =>
      toMonitoredGroup(group as Record<string, unknown>, profilesByGroup.get(group.id as string) ?? []),
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
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const url = parseFacebookGroupUrl(body.url)
    const profiles = asStringList(body.profiles)
    const intervalMinutes = Number(body.intervalMinutes)
    const enabled = body.enabled !== false

    if (!name || name.length > 200 || !url || !Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 1440) {
      return badRequestResponse("Name, HTTPS Facebook URL, and a 1-1440 minute interval are required.")
    }
    if (!profiles.length) return badRequestResponse("At least one business profile is required.")

    const groupIdentifier = getFacebookGroupIdentifier(url)
    if (!groupIdentifier) return badRequestResponse("Use a Facebook group URL in the form https://www.facebook.com/groups/<group-id>.")

    const facebookToken = await getFacebookAccessTokenForUser(ownerId)
    if (!facebookToken) {
      return NextResponse.json({ error: "facebook_connection_required", message: "Connect a Facebook token with group access before adding a group." }, { status: 403 })
    }

    const groupAccess = await resolveFacebookGroup(facebookToken.accessToken, groupIdentifier)
    if (groupAccess.status === "inaccessible") {
      return NextResponse.json(
        { error: "facebook_group_access_denied", message: "Facebook did not grant this token access to that group. Ensure the app is installed in the group and your account has the required group role." },
        { status: 403 },
      )
    }
    if (groupAccess.status === "unavailable") {
      return NextResponse.json({ error: "facebook_group_lookup_failed", message: "Facebook could not verify this group. Try again shortly." }, { status: 502 })
    }

    const admin = getSupabaseAdmin()
    const { data: ownedProfiles, error: ownedProfilesError } = await admin
      .from("business_profiles")
      .select("id")
      .eq("owner_id", ownerId)
      .in("id", profiles)
    if (ownedProfilesError) return internalServerErrorResponse()
    if ((ownedProfiles ?? []).length !== profiles.length) return badRequestResponse("One or more profiles are unavailable.")

    const { data: group, error: groupError } = await admin
      .from("monitored_groups")
      .insert({
        owner_id: ownerId,
        facebook_group_id: groupAccess.groupId,
        name,
        url,
        interval_minutes: intervalMinutes,
        enabled,
        status: enabled ? "active" : "paused",
      })
      .select("*")
      .single()
    if (groupError || !group) return internalServerErrorResponse()

    const { error: groupProfilesError } = await admin
      .from("group_profiles")
      .insert(profiles.map((profileId) => ({ group_id: group.id, profile_id: profileId })))
    if (groupProfilesError) {
      await admin.from("monitored_groups").delete().eq("id", group.id).eq("owner_id", ownerId)
      return internalServerErrorResponse()
    }

    return NextResponse.json(toMonitoredGroup(group as Record<string, unknown>, profiles), { status: 201 })
  } catch {
    return badRequestResponse("Request body must be valid JSON.")
  }
}