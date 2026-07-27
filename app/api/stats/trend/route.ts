import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { getSupabaseAdmin } from "@/lib/supabase"

function dayKey(value: string) {
  return value.slice(0, 10)
}

function dayLabel(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(value)
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const requestedDays = Number.parseInt(request.nextUrl.searchParams.get("days") ?? "14", 10)
    const days = Number.isInteger(requestedDays) ? Math.min(90, Math.max(1, requestedDays)) : 14
    const startDate = new Date()
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
    startDate.setUTCHours(0, 0, 0, 0)

    const admin = getSupabaseAdmin()
    const [{ data: posts, error: postsError }, { data: leads, error: leadsError }] = await Promise.all([
      admin.from("facebook_posts").select("collected_at").eq("owner_id", ownerId).gte("collected_at", startDate.toISOString()),
      admin.from("leads").select("created_at").eq("owner_id", ownerId).gte("created_at", startDate.toISOString()),
    ])
    if (postsError || leadsError) return internalServerErrorResponse()

    const postCounts = new Map<string, number>()
    const leadCounts = new Map<string, number>()
    for (const post of posts ?? []) {
      const key = dayKey(post.collected_at as string)
      postCounts.set(key, (postCounts.get(key) ?? 0) + 1)
    }
    for (const lead of leads ?? []) {
      const key = dayKey(lead.created_at as string)
      leadCounts.set(key, (leadCounts.get(key) ?? 0) + 1)
    }

    return NextResponse.json(Array.from({ length: days }, (_, offset) => {
      const date = new Date(startDate)
      date.setUTCDate(startDate.getUTCDate() + offset)
      const key = dayKey(date.toISOString())
      return { day: dayLabel(date), posts: postCounts.get(key) ?? 0, leads: leadCounts.get(key) ?? 0 }
    }))
  } catch {
    return internalServerErrorResponse()
  }
}