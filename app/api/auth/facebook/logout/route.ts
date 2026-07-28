import { NextRequest, NextResponse } from "next/server"

import { FACEBOOK_SESSION_COOKIE, revokeSession } from "@/lib/facebookStore"

export async function POST(request: NextRequest) {
  try {
    await revokeSession(request.cookies.get(FACEBOOK_SESSION_COOKIE)?.value)
  } catch {
    return NextResponse.json({ error: "logout_failed" }, { status: 503 })
  }

  const response = NextResponse.json({ loggedOut: true })
  response.cookies.delete(FACEBOOK_SESSION_COOKIE)
  return response
}