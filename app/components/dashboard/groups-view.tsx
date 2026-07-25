"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { groups as initialGroups, businessProfiles, type GroupStatus, type MonitoredGroup } from "@/lib/mock-data"
import { AddGroupDialog } from "@/components/dashboard/add-group-dialog"
import { Plus, ExternalLink, Clock, AlertCircle, CheckCircle2, PauseCircle } from "lucide-react"

function statusMeta(status: GroupStatus) {
  switch (status) {
    case "active":
      return { icon: CheckCircle2, cls: "bg-success/15 text-success border-success/25", label: "Active" }
    case "paused":
      return { icon: PauseCircle, cls: "bg-muted text-muted-foreground border-border", label: "Paused" }
    case "error":
      return { icon: AlertCircle, cls: "bg-destructive/15 text-destructive border-destructive/25", label: "Error" }
  }
}

function profileName(id: string) {
  return businessProfiles.find((p) => p.id === id)?.name ?? id
}

export function GroupsView() {
  const [groups, setGroups] = useState<MonitoredGroup[]>(initialGroups)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleAdd(group: MonitoredGroup) {
    setGroups((prev) => [group, ...prev])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Monitored Groups</h2>
          <p className="text-sm text-muted-foreground">
            {groups.filter((g) => g.enabled).length} of {groups.length} groups actively polling.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Add Group
        </Button>
      </div>

      <AddGroupDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={handleAdd} />

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const meta = statusMeta(group.status)
          const StatusIcon = meta.icon
          return (
            <Card key={group.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{group.name}</h3>
                    <a
                      href={group.url}
                      className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    >
                      <span className="truncate">{group.url.replace("https://", "")}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                  <Badge className={meta.cls}>
                    <StatusIcon className="size-3" />
                    {meta.label}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-y border-border py-3">
                  <div>
                    <p className="font-mono text-lg font-semibold">{group.postsCollected.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 font-mono text-lg font-semibold">
                      <Clock className="size-3.5 text-muted-foreground" />
                      {group.intervalMinutes}m
                    </p>
                    <p className="text-xs text-muted-foreground">Interval</p>
                  </div>
                  <div>
                    <p className={`font-mono text-lg font-semibold ${group.errors > 0 ? "text-destructive" : ""}`}>
                      {group.errors}
                    </p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {group.profiles.map((pid) => (
                    <Badge key={pid} className="border-border bg-secondary text-secondary-foreground">
                      {profileName(pid)}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last scan {group.lastScan}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      {group.enabled ? "Pause" : "Resume"}
                    </Button>
                    <Button size="sm" variant="ghost">
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
