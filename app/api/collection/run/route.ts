import { NextRequest, NextResponse } from "next/server"

import { classifyText, parseClassifierModel, tokenize } from "@/lib/classifier"
import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { getFacebookAccessTokenForUser } from "@/lib/facebookStore"
import { getSupabaseAdmin } from "@/lib/supabase"

type GraphPost = { id?: string; message?: string; created_time?: string; from?: { name?: string; id?: string }; permalink_url?: string; attachments?: { data?: unknown[] } }
type GraphBatchResponse = { code?: number; body?: string | null }[]

function hasCronAuthorization(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`
}

function groupGraphId(group: Record<string, unknown>) {
  if (typeof group.facebook_group_id === "string" && group.facebook_group_id) return group.facebook_group_id
  if (typeof group.url !== "string") return null
  const match = new URL(group.url).pathname.match(/\/groups\/([^/?#]+)/)
  return match?.[1] ?? null
}

function fallbackClassification(content: string, profile: Record<string, unknown>) {
  const textTokens = new Set(tokenize(content))
  const positiveTokens = [profile.name, profile.description, profile.prompt, ...(Array.isArray(profile.services) ? profile.services : []), ...(Array.isArray(profile.keywords) ? profile.keywords : [])]
    .flatMap((value) => typeof value === "string" ? tokenize(value) : [])
  const negativeTokens = (Array.isArray(profile.negative_keywords) ? profile.negative_keywords : []).flatMap((value) => typeof value === "string" ? tokenize(value) : [])
  const matches = positiveTokens.filter((token) => textTokens.has(token)).length
  const blocked = negativeTokens.some((token) => textTokens.has(token))
  const confidence = blocked ? 0 : Math.min(0.85, matches / Math.max(3, positiveTokens.length / 4))
  return { isLead: !blocked && matches >= 2, confidence }
}

function classify(content: string, profile: Record<string, unknown>) {
  const model = parseClassifierModel(profile.classifier_model)
  return model ? classifyText(content, model) : fallbackClassification(content, profile)
}

async function collectOwner(ownerId: string) {
  const admin = getSupabaseAdmin()
  const { data: claimed, error: claimError } = await admin.rpc("claim_lead_collection_run", { p_owner_id: ownerId })
  if (claimError || !claimed) return { collected: 0, leads: 0 }

  const token = await getFacebookAccessTokenForUser(ownerId)
  if (!token) return { collected: 0, leads: 0 }
  const [{ data: groups, error: groupsError }, { data: profiles, error: profilesError }] = await Promise.all([
    admin.from("monitored_groups").select("id, facebook_group_id, url").eq("owner_id", ownerId).eq("enabled", true),
    admin.from("business_profiles").select("*").eq("owner_id", ownerId).eq("enabled", true),
  ])
  if (groupsError || profilesError) throw new Error("Unable to load collection sources.")

  const groupEntries = (groups ?? []).map((group) => ({ group: group as Record<string, unknown>, graphId: groupGraphId(group as Record<string, unknown>) })).filter((entry): entry is { group: Record<string, unknown>; graphId: string } => Boolean(entry.graphId))
  let collected = 0
  let leadsCreated = 0
  for (let offset = 0; offset < groupEntries.length; offset += 50) {
    const batchGroups = groupEntries.slice(offset, offset + 50)
    const batch = batchGroups.map(({ graphId }) => ({ method: "GET", relative_url: `${encodeURIComponent(graphId)}/feed?fields=id,message,created_time,from,permalink_url,attachments.limit(1)&limit=25` }))
    const response = await fetch("https://graph.facebook.com/v19.0", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: token.accessToken, include_headers: "false", batch: JSON.stringify(batch) }),
      cache: "no-store",
    })
    if (!response.ok) throw new Error("Facebook Graph batch request failed.")
    const results = await response.json() as GraphBatchResponse
    for (const [index, result] of results.entries()) {
      if (result?.code !== 200 || !result.body) continue
      const payload = JSON.parse(result.body) as { data?: GraphPost[] }
      const group = batchGroups[index]?.group
      if (!group) continue
      const posts = (payload.data ?? []).filter((post) => post.id && post.message)
      if (!posts.length) continue
      const postRows = posts.map((post) => ({
        owner_id: ownerId,
        group_id: group.id as string,
        facebook_post_id: post.id!,
        author_facebook_id: post.from?.id ?? null,
        author_name: post.from?.name ?? "Facebook member",
        content: post.message!,
        attachment_count: post.attachments?.data?.length ?? 0,
        facebook_url: post.permalink_url ?? `https://www.facebook.com/${post.id}`,
        collected_at: post.created_time ?? new Date().toISOString(),
      }))
      const { data: savedPosts, error: postError } = await admin.from("facebook_posts").upsert(postRows, { onConflict: "group_id,facebook_post_id" }).select("id, content")
      if (postError) throw postError
      collected += savedPosts?.length ?? 0
      const { data: links, error: linksError } = await admin.from("group_profiles").select("profile_id").eq("group_id", group.id as string)
      if (linksError) throw linksError
      const profileIds = new Set((links ?? []).map((link) => link.profile_id as string))
      const groupProfiles = (profiles ?? []).filter((profile) => profileIds.has(profile.id as string)) as Record<string, unknown>[]
      for (const post of savedPosts ?? []) {
        const { count, error: existingError } = await admin.from("leads").select("id", { count: "exact", head: true }).eq("post_id", post.id as string)
        if (existingError || count) continue
        const best = groupProfiles.map((profile) => ({ profile, result: classify(post.content as string, profile) })).filter((candidate) => candidate.result.isLead).sort((a, b) => b.result.confidence - a.result.confidence)[0]
        if (!best) continue
        const services = Array.isArray(best.profile.services) ? best.profile.services : []
        const locations = Array.isArray(best.profile.locations) ? best.profile.locations : []
        const { error: leadError } = await admin.from("leads").insert({
          owner_id: ownerId, post_id: post.id as string, group_id: group.id as string, profile_id: best.profile.id as string,
          matched_profile_name: best.profile.name as string, score: Math.max(1, Math.round(best.result.confidence * 10)), confidence: best.result.confidence,
          service: typeof services[0] === "string" ? services[0] : "General inquiry", location: typeof locations[0] === "string" ? locations[0] : "Unspecified",
          summary: `Potential lead matched by the local ${parseClassifierModel(best.profile.classifier_model) ? "Naive Bayes" : "keyword"} classifier.`,
          recommended_response: `Thanks for sharing this. ${best.profile.name as string} can help with this request. Would you like to discuss the details?`,
          contact_info: "Review the original post for contact details.", urgency: best.result.confidence >= 0.8 ? "High" : "Medium",
        })
        if (leadError) throw leadError
        leadsCreated += 1
      }
      await admin.from("monitored_groups").update({ last_scan_at: new Date().toISOString(), status: "active" }).eq("id", group.id as string).eq("owner_id", ownerId)
    }
  }
  return { collected, leads: leadsCreated }
}

export async function GET(request: NextRequest) {
  if (!hasCronAuthorization(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  try {
    const admin = getSupabaseAdmin()
    const { data: connections, error } = await admin.from("facebook_connections").select("user_id").eq("status", "connected").is("invalidated_at", null)
    if (error) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 })
    const results = await Promise.all((connections ?? []).map((connection) => collectOwner(connection.user_id as string)))
    return NextResponse.json({ owners: results.length, collected: results.reduce((sum, result) => sum + result.collected, 0), leads: results.reduce((sum, result) => sum + result.leads, 0) })
  } catch {
    return NextResponse.json({ error: "collection_failed" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    return NextResponse.json(await collectOwner(ownerId))
  } catch {
    return internalServerErrorResponse()
  }
}