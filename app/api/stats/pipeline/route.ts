import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const admin = getSupabaseAdmin()
    const [collected, processed, qualified, failed] = await Promise.all([
      admin.from("facebook_posts").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
      admin.from("facebook_posts").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).not("processed_at", "is", null),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
      admin.from("facebook_posts").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).not("processing_error", "is", null),
    ])
    if ([collected, processed, qualified, failed].some((result) => result.error)) return internalServerErrorResponse()

    const collectedCount = collected.count ?? 0
    const failedCount = failed.count ?? 0
    return NextResponse.json({
      collected: collectedCount,
      processed: processed.count ?? 0,
      qualified: qualified.count ?? 0,
      failed: failedCount,
      failureRate: collectedCount ? failedCount / collectedCount : 0,
    })
  } catch {
    return internalServerErrorResponse()
  }
}