"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { listGroups, listProfiles, toggleGroup, type GroupStatus, type MonitoredGroup } from "@/lib/api"
import { AddGroupDialog } from "@/app/components/dashboard/add-group-dialog"
import { ConfigureGroupDialog } from "@/app/components/dashboard/configure-group-dialog"
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

export function GroupsView() {
  const { data: groups = [], mutate: mutateGroups } = useSWR("groups", listGroups)
  const { data: businessProfiles = [] } = useSWR("profiles", listProfiles)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [configuredGroup, setConfiguredGroup] = useState<MonitoredGroup | null>(null)
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null)

  function handleAdd(group: MonitoredGroup) {
    void mutateGroups((current = []) => [group, ...current], false)
  }

  function handleUpdate(updatedGroup: MonitoredGroup) {
    void mutateGroups((current = []) => current.map((group) => group.id === updatedGroup.id ? updatedGroup : group), false)
  }

  async function handleToggle(group: MonitoredGroup) {
    setUpdatingGroupId(group.id)
    try {
      const updatedGroup = await toggleGroup(group.id, !group.enabled)
      handleUpdate(updatedGroup)
    } finally {
      setUpdatingGroupId(null)
    }
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

      <AddGroupDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
        profiles={businessProfiles}
      />
      {configuredGroup && (
        <ConfigureGroupDialog
          key={configuredGroup.id}
          group={configuredGroup}
          profiles={businessProfiles}
          onClose={() => setConfiguredGroup(null)}
          onSave={handleUpdate}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const meta = statusMeta(group.status)
          
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
                      {businessProfiles.find((profile) => profile.id === pid)?.name ?? pid}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last scan {group.lastScan}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void handleToggle(group)} disabled={updatingGroupId === group.id}>
                      {group.enabled ? "Pause" : "Resume"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfiguredGroup(group)}>
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
