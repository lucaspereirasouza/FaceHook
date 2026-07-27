import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { toLead } from "@/lib/dashboard-models"
import { getSupabaseAdmin } from "@/lib/supabase"

const leadStatuses = new Set(["New", "Reviewed", "Contacted", "Converted", "Ignored"])
const urgencies = new Set(["Low", "Medium", "High"])

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const urgency = searchParams.get("urgency")
    const profileId = searchParams.get("profile")
    const groupId = searchParams.get("group")
    const minScore = Number(searchParams.get("minScore"))
    const query = searchParams.get("search")?.trim().toLocaleLowerCase()
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1)

    const admin = getSupabaseAdmin()
    let leadQuery = admin.from("leads").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false })
    if (status && leadStatuses.has(status)) leadQuery = leadQuery.eq("status", status)
    if (urgency && urgencies.has(urgency)) leadQuery = leadQuery.eq("urgency", urgency)
    if (profileId) leadQuery = leadQuery.eq("profile_id", profileId)
    if (groupId) leadQuery = leadQuery.eq("group_id", groupId)
    if (Number.isFinite(minScore) && minScore >= 0 && minScore <= 10) leadQuery = leadQuery.gte("score", minScore)

    const { data: leads, error: leadsError } = await leadQuery
    if (leadsError) return internalServerErrorResponse()

    const postIds = [...new Set((leads ?? []).map((lead) => lead.post_id).filter((id): id is string => typeof id === "string"))]
    const groupIds = [...new Set((leads ?? []).map((lead) => lead.group_id).filter((id): id is string => typeof id === "string"))]
    const [{ data: posts, error: postsError }, { data: groups, error: groupsError }] = await Promise.all([
      postIds.length
        ? admin.from("facebook_posts").select("id, author_name, content, attachment_count, facebook_url").eq("owner_id", ownerId).in("id", postIds)
        : { data: [], error: null },
      groupIds.length
        ? admin.from("monitored_groups").select("id, name").eq("owner_id", ownerId).in("id", groupIds)
        : { data: [], error: null },
    ])
    if (postsError || groupsError) return internalServerErrorResponse()

    const postsById = new Map((posts ?? []).map((post) => [post.id as string, post as Record<string, unknown>]))
    const groupNamesById = new Map((groups ?? []).map((group) => [group.id as string, group.name as string]))
    const items = (leads ?? [])
      .map((lead) => toLead(lead as Record<string, unknown>, postsById.get(lead.post_id as string), groupNamesById.get(lead.group_id as string) ?? "Unknown group"))
      .filter((lead) => !query || [lead.author, lead.content, lead.summary, lead.service].some((value) => value.toLocaleLowerCase().includes(query)))
    const pageSize = 50
    const start = (page - 1) * pageSize

    return NextResponse.json({ items: items.slice(start, start + pageSize), total: items.length, page })
  } catch {
    return internalServerErrorResponse()
  }
}