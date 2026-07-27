import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const { data: jobs, error } = await getSupabaseAdmin()
      .from("jobs")
      .select("state, scheduled_at")
      .eq("owner_id", ownerId)
      .in("state", ["queued", "running", "failed"])
    if (error) return internalServerErrorResponse()

    const queued = (jobs ?? []).filter((job) => job.state === "queued")
    const oldestJob = queued.reduce<string | null>((oldest, job) => {
      const scheduledAt = job.scheduled_at as string
      return !oldest || scheduledAt < oldest ? scheduledAt : oldest
    }, null)
    const oldestJobAgeSec = oldestJob ? Math.max(0, Math.floor((Date.now() - Date.parse(oldestJob)) / 1000)) : 0

    return NextResponse.json({
      size: queued.length,
      oldestJobAgeSec,
      inFlight: (jobs ?? []).filter((job) => job.state === "running").length,
      failed: (jobs ?? []).filter((job) => job.state === "failed").length,
    })
  } catch {
    return internalServerErrorResponse()
  }
}