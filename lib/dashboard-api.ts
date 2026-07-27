import "server-only"

import { NextRequest, NextResponse } from "next/server"

import { FACEBOOK_SESSION_COOKIE, getCurrentAppUserId } from "@/lib/facebookStore"

export async function getDashboardUserId(request: NextRequest) {
  const sessionToken = request.cookies.get(FACEBOOK_SESSION_COOKIE)?.value
  return getCurrentAppUserId(sessionToken)
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "authentication_required" }, { status: 401 })
}

export function badRequestResponse(message: string) {
  return NextResponse.json({ error: "invalid_request", message }, { status: 400 })
}

export function internalServerErrorResponse() {
  return NextResponse.json({ error: "storage_unavailable" }, { status: 503 })
}