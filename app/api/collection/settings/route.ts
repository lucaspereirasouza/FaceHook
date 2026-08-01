import { NextRequest, NextResponse } from "next/server"

import { badRequestResponse, getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { getSupabaseAdmin } from "@/lib/supabase"

function toSettings(record: Record<string, unknown>) {
  return {
    pollIntervalMinutes: Number(record.poll_interval_minutes) || 5,
    lastBatchAt: typeof record.last_batch_at === "string" ? record.last_batch_at : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const { data, error } = await getSupabaseAdmin()
      .from("lead_collection_settings")
      .select("poll_interval_minutes, last_batch_at")
      .eq("owner_id", ownerId)
      .maybeSingle()
    if (error) return internalServerErrorResponse()

    return NextResponse.json(data ? toSettings(data as Record<string, unknown>) : { pollIntervalMinutes: 5, lastBatchAt: null })
  } catch {
    return internalServerErrorResponse()
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const body = await request.json() as Record<string, unknown>
    const pollIntervalMinutes = Number(body.pollIntervalMinutes)
    if (!Number.isInteger(pollIntervalMinutes) || pollIntervalMinutes < 1 || pollIntervalMinutes > 1440) {
      return badRequestResponse("Polling interval must be a whole number from 1 to 1440 minutes.")
    }

    const { data, error } = await getSupabaseAdmin()
      .from("lead_collection_settings")
      .upsert({ owner_id: ownerId, poll_interval_minutes: pollIntervalMinutes }, { onConflict: "owner_id" })
      .select("poll_interval_minutes, last_batch_at")
      .single()
    if (error || !data) return internalServerErrorResponse()

    return NextResponse.json(toSettings(data as Record<string, unknown>))
  } catch {
    return badRequestResponse("Request body must be valid JSON.")
  }
}