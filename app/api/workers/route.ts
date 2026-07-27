import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { toWorkerInfo } from "@/lib/dashboard-models"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const { data, error } = await getSupabaseAdmin()
      .from("workers")
      .select("id, name, role, state, last_poll_at, avg_processing_ms, processed_today")
      .eq("owner_id", ownerId)
      .order("name")
    if (error) return internalServerErrorResponse()

    return NextResponse.json((data ?? []).map((worker) => toWorkerInfo(worker as Record<string, unknown>)))
  } catch {
    return internalServerErrorResponse()
  }
}