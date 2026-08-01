"use client"

import FacebookLoginButton from "@/app/components/FacebookLoginButton"
import { Badge } from "@/app/components/ui/badge"
import { Card, CardContent } from "@/app/components/ui/card"
import { AlertTriangle, CheckCircle2, Link2, ShieldCheck } from "lucide-react"

interface FacebookConnectionOnboardingProps {
  reason: "expired" | "invalid" | "not_connected"
}

export function FacebookConnectionOnboarding({ reason }: FacebookConnectionOnboardingProps) {
  const reconnectRequired = reason !== "not_connected"
  const title = reconnectRequired ? "Reconnect your Facebook account" : "Connect Facebook to start monitoring"
  const description = reason === "expired"
    ? "Your Facebook authorization has expired. Reconnect to resume monitoring; your profiles and configuration remain unchanged."
    : reason === "invalid"
      ? "Facebook could no longer validate this connection. Reconnect to resume monitoring; your profiles and configuration remain unchanged."
    : "A connected Facebook account is required before Facehook can collect posts or run monitoring jobs."

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl items-center py-8">
      <Card className="w-full border-primary/25">
        <CardContent className="p-6 sm:p-8">
          <Badge className={reconnectRequired ? "border-warning/25 bg-warning/15 text-warning" : "border-primary/25 bg-primary/10 text-primary"}>
            {reconnectRequired ? <AlertTriangle className="size-3" /> : <Link2 className="size-3" />}
            {reason === "expired" ? "Connection expired" : reason === "invalid" ? "Connection needs attention" : "Connection required"}
          </Badge>

          <div className="mt-5 flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-y border-border py-5 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              <span>Use a Facebook user access token that can read the groups you manage.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              <span>Facebook verifies the token before monitoring is enabled.</span>
            </div>
          </div>

          <div className="mt-6">
            <FacebookLoginButton reconnect={reconnectRequired} />
            <p className="mt-3 text-xs text-muted-foreground">Your Facebook access token is kept server-side.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}