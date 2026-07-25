"use client"

import useSWR from "swr"
import { Card, CardContent } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { listProfiles } from "@/lib/api"
import { Plus, MapPin, Webhook, Sparkles, Ban } from "lucide-react"

export function ProfilesView() {
  const { data: businessProfiles = [] } = useSWR("profiles", listProfiles)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Business Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Reusable AI configurations. The classifier matches every post against enabled profiles.
          </p>
        </div>
        <Button>
          <Plus className="size-4" /> New Profile
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {businessProfiles.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{p.name}</h3>
                    <Badge
                      className={
                        p.enabled
                          ? "border-success/25 bg-success/15 text-success"
                          : "border-border bg-muted text-muted-foreground"
                      }
                    >
                      {p.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-lg font-semibold text-primary">{p.leadsMatched}</p>
                  <p className="text-xs text-muted-foreground">leads</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5" /> AI Prompt
                </p>
                <p className="mt-1 text-sm leading-relaxed">{p.prompt}</p>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.services.map((s) => (
                      <Badge key={s} className="border-border bg-secondary text-secondary-foreground">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {p.keywords.slice(0, 4).map((k) => (
                        <Badge key={k} className="border-primary/25 bg-primary/10 text-primary">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Ban className="size-3" /> Negative
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {p.negativeKeywords.slice(0, 3).map((k) => (
                        <Badge key={k} className="border-destructive/20 bg-destructive/10 text-destructive">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> {p.locations.join(", ")}
                </span>
                <span className="flex items-center gap-1">
                  <Webhook className="size-3.5" /> {p.discordWebhook.split("/").pop()}
                </span>
                <Button size="sm" variant="ghost" className="ml-auto">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
