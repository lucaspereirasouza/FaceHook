import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { toLead } from "@/lib/dashboard-models"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const { id } = await context.params
    const admin = getSupabaseAdmin()
    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle()
    if (leadError) return internalServerErrorResponse()
    if (!lead) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const [{ data: post, error: postError }, { data: group, error: groupError }] = await Promise.all([
      admin
        .from("facebook_posts")
        .select("id, author_name, content, attachment_count, facebook_url")
        .eq("id", lead.post_id as string)
        .eq("owner_id", ownerId)
        .maybeSingle(),
      admin
        .from("monitored_groups")
        .select("name")
        .eq("id", lead.group_id as string)
        .eq("owner_id", ownerId)
        .maybeSingle(),
    ])
    if (postError || groupError) return internalServerErrorResponse()

    return NextResponse.json(toLead(lead as Record<string, unknown>, post ? post as Record<string, unknown> : undefined, (group?.name as string) ?? "Unknown group"))
  } catch {
    return internalServerErrorResponse()
  }
}