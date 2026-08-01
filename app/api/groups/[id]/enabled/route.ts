import { NextRequest, NextResponse } from "next/server"

import { badRequestResponse, getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { toMonitoredGroup } from "@/lib/dashboard-models"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const body = await request.json() as Record<string, unknown>
    if (typeof body.enabled !== "boolean") {
      return badRequestResponse("enabled must be a boolean.")
    }

    const { id } = await context.params
    const enabled = body.enabled
    const admin = getSupabaseAdmin()
    const { data: group, error } = await admin
      .from("monitored_groups")
      .update({ enabled, status: enabled ? "active" : "paused" })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("*")
      .maybeSingle()

    if (error) return internalServerErrorResponse()
    if (!group) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const { data: links, error: linksError } = await admin
      .from("group_profiles")
      .select("profile_id")
      .eq("group_id", id)
    if (linksError) return internalServerErrorResponse()

    return NextResponse.json(toMonitoredGroup(group as Record<string, unknown>, (links ?? []).map((link) => link.profile_id as string)))
  } catch {
    return badRequestResponse("Request body must be valid JSON.")
  }
}