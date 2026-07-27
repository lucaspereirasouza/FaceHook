"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { getLogs, getQueueStatus, getWorkers, type WorkerState } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Cpu, Server, Bell, ListChecks, Timer } from "lucide-react"

function stateMeta(state: WorkerState) {
  switch (state) {
    case "healthy":
      return { cls: "bg-success/15 text-success border-success/25", dot: "bg-success", label: "Healthy" }
    case "degraded":
      return { cls: "bg-warning/15 text-warning border-warning/25", dot: "bg-warning", label: "Degraded" }
    case "down":
      return { cls: "bg-destructive/15 text-destructive border-destructive/25", dot: "bg-destructive", label: "Down" }
  }
}

const workerIcons: Record<string, React.ElementType> = {
  w1: Server,
  w2: Cpu,
  w3: Bell,
}

const levelMeta = {
  info: "text-muted-foreground",
  warn: "text-warning",
  error: "text-destructive",
}

export function MonitoringView() {
  const { data: workers = [] } = useSWR("workers", getWorkers, { refreshInterval: 30_000 })
  const { data: queue } = useSWR("queue", getQueueStatus, { refreshInterval: 10_000 })
  const { data: logs = [] } = useSWR("logs", () => getLogs({ limit: 50 }), {
    refreshInterval: 15_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">System Monitoring</h2>
        <p className="text-sm text-muted-foreground">Worker health, queue depth, and live processing logs.</p>
      </div>

      {/* Worker cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {workers.map((w) => {
          const meta = stateMeta(w.state)
          const Icon = workerIcons[w.id] ?? Server
          return (
            <Card key={w.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-4.5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.role}</p>
                    </div>
                  </div>
                  <Badge className={meta.cls}>
                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <p className="font-mono text-sm font-semibold">{w.lastPoll}</p>
                    <p className="text-[10px] text-muted-foreground">Last poll</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold">{w.avgProcessingMs}ms</p>
                    <p className="text-[10px] text-muted-foreground">Avg time</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold">{w.processedToday.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Queue health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-4" /> Queue Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-end justify-between">
                <p className="font-mono text-3xl font-semibold">{queue?.size ?? 0}</p>
                <span className="text-xs text-muted-foreground">posts awaiting AI</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((queue?.size ?? 0), 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{queue?.failed ?? 0} failed jobs awaiting retry</p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-mono font-semibold">{queue?.oldestJobAgeSec ?? 0}s</p>
                  <p className="text-xs text-muted-foreground">Avg wait</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-mono font-semibold">{queue?.inFlight ?? 0}</p>
                  <p className="text-xs text-muted-foreground">In flight</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live logs */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Live Worker Logs</CardTitle>
            <span className="text-xs text-muted-foreground">
              Updated every 15s
            </span>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-muted/30 p-1 font-mono text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded px-2.5 py-1.5 hover:bg-muted/60"
                >
                  <span className="shrink-0 text-muted-foreground">{log.time}</span>
                  <span
                    className={cn(
                      "w-12 shrink-0 uppercase",
                      levelMeta[log.level],
                    )}
                  >
                    {log.level}
                  </span>
                  <span className="shrink-0 text-primary">[{log.worker}]</span>
                  <span className="text-foreground">{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
