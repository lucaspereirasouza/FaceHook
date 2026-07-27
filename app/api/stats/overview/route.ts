import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const admin = getSupabaseAdmin()
    const [groups, posts, processedPosts, leads, failures, queuedJobs] = await Promise.all([
      admin.from("monitored_groups").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("enabled", true),
      admin.from("facebook_posts").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
      admin.from("facebook_posts").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).not("processed_at", "is", null),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
      admin.from("facebook_posts").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).not("processing_error", "is", null),
      admin.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("state", "queued"),
    ])
    if ([groups, posts, processedPosts, leads, failures, queuedJobs].some((result) => result.error)) {
      return internalServerErrorResponse()
    }

    return NextResponse.json({
      groupsMonitored: groups.count ?? 0,
      totalPosts: posts.count ?? 0,
      aiProcessed: processedPosts.count ?? 0,
      qualifiedLeads: leads.count ?? 0,
      processingFailures: failures.count ?? 0,
      aiCostUsd: 0,
      queueSize: queuedJobs.count ?? 0,
    })
  } catch {
    return internalServerErrorResponse()
  }
}