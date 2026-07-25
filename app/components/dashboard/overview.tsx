"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  overviewStats,
  trend,
  leads,
  scoreColor,
  statusColor,
} from "@/lib/mock-data"
import {
  Users,
  FileText,
  Cpu,
  Target,
  AlertTriangle,
  DollarSign,
  ListChecks,
  ArrowUpRight,
} from "lucide-react"

const kpis = [
  { label: "Groups Monitored", value: overviewStats.groupsMonitored, icon: Users, hint: "3 added this week" },
  { label: "Total Posts", value: overviewStats.totalPosts.toLocaleString(), icon: FileText, hint: "+845 today" },
  { label: "AI Processed", value: overviewStats.aiProcessed.toLocaleString(), icon: Cpu, hint: "96.3% of collected" },
  { label: "Qualified Leads", value: overviewStats.qualifiedLeads, icon: Target, hint: "7.5% conversion", accent: true },
  { label: "Processing Failures", value: overviewStats.processingFailures, icon: AlertTriangle, hint: "last 24h", warn: true },
  { label: "AI Cost", value: `$${overviewStats.aiCostUsd.toFixed(2)}`, icon: DollarSign, hint: "month to date" },
  { label: "Queue Size", value: overviewStats.queueSize, icon: ListChecks, hint: "posts awaiting AI" },
]

export function Overview() {
  const maxPosts = Math.max(...trend.map((t) => t.posts))
  const recent = leads.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <Card key={k.label} className={k.accent ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{k.label}</span>
                  <Icon
                    className={
                      k.warn
                        ? "size-4 text-warning"
                        : k.accent
                          ? "size-4 text-primary"
                          : "size-4 text-muted-foreground"
                    }
                  />
                </div>
                <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">{k.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Collection & Lead Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Posts collected vs. qualified leads · 14 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary/30" /> Posts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-success" /> Leads
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-52 items-stretch gap-1.5">
              {trend.map((t) => (
                <div key={t.day} className="group flex h-full flex-1 flex-col items-center gap-1">
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    <div
                      className="w-full rounded-t bg-primary/25 transition-colors group-hover:bg-primary/40"
                      style={{ height: `${(t.posts / maxPosts) * 100}%` }}
                      title={`${t.posts} posts`}
                    >
                      <div
                        className="w-full rounded-t bg-success"
                        style={{ height: `${(t.leads / t.posts) * 100}%` }}
                        title={`${t.leads} leads`}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.day.split(" ")[1]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline status */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Health</CardTitle>
            <p className="text-sm text-muted-foreground">Live stage throughput</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { stage: "Facebook Collection", pct: 100, note: "6 groups active" },
              { stage: "Duplicate Detection", pct: 94, note: "6% filtered as dupes" },
              { stage: "AI Classification", pct: 88, note: "38 in queue" },
              { stage: "Business Matching", pct: 76, note: "qualified rate" },
              { stage: "Discord Delivery", pct: 91, note: "1 webhook retrying" },
            ].map((s) => (
              <div key={s.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.stage}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${s.pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent leads */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Latest Qualified Leads</CardTitle>
          <span className="flex items-center gap-1 text-sm text-primary">
            View all <ArrowUpRight className="size-3.5" />
          </span>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {lead.authorAvatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{lead.summary}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {lead.author} · {lead.groupName}
                </p>
              </div>
              <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
              <div className="w-10 text-right">
                <span className={`font-mono text-sm font-semibold ${scoreColor(lead.score)}`}>
                  {lead.score}
                </span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
