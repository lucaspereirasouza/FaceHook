import { NextRequest, NextResponse } from "next/server"

import { getDashboardUserId, internalServerErrorResponse, unauthorizedResponse } from "@/lib/dashboard-api"
import { toLogEntry } from "@/lib/dashboard-models"
import { getSupabaseAdmin } from "@/lib/supabase"

const logLevels = new Set(["info", "warn", "error"])

export async function GET(request: NextRequest) {
  try {
    const ownerId = await getDashboardUserId(request)
    if (!ownerId) return unauthorizedResponse()

    const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10)
    const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50
    const level = request.nextUrl.searchParams.get("level")
    const admin = getSupabaseAdmin()
    let logsQuery = admin
      .from("worker_logs")
      .select("id, worker_id, level, message, logged_at")
      .eq("owner_id", ownerId)
      .order("logged_at", { ascending: false })
      .limit(limit)
    if (level && logLevels.has(level)) logsQuery = logsQuery.eq("level", level)

    const { data: logs, error: logsError } = await logsQuery
    if (logsError) return internalServerErrorResponse()

    const workerIds = [...new Set((logs ?? []).map((log) => log.worker_id).filter((id): id is string => typeof id === "string"))]
    const { data: workers, error: workersError } = workerIds.length
      ? await admin.from("workers").select("id, name").eq("owner_id", ownerId).in("id", workerIds)
      : { data: [], error: null }
    if (workersError) return internalServerErrorResponse()

    const workerNames = new Map((workers ?? []).map((worker) => [worker.id as string, worker.name as string]))
    return NextResponse.json((logs ?? []).map((log) => toLogEntry(log as Record<string, unknown>, workerNames.get(log.worker_id as string) ?? "System")))
  } catch {
    return internalServerErrorResponse()
  }
}