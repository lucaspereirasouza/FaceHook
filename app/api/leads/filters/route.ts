import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const admin = getSupabaseAdmin()
    const [{ data: profiles, error: profilesError }, { data: groups, error: groupsError }] = await Promise.all([
      admin.from("business_profiles").select("name").eq("owner_id", ownerId).order("name"),
      admin.from("monitored_groups").select("name").eq("owner_id", ownerId).order("name"),
    ])
    if (profilesError || groupsError) return internalServerErrorResponse()

    return NextResponse.json({
      statuses: ["New", "Reviewed", "Contacted", "Converted", "Ignored"],
      profiles: (profiles ?? []).map((profile) => profile.name as string),
      groups: (groups ?? []).map((group) => group.name as string),
      urgencies: ["Low", "Medium", "High"],
    })
  } catch {
    return internalServerErrorResponse()
  }
}