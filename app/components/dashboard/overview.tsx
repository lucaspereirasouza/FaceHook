"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import {
  scoreColor,
  statusColor,
} from "@/lib/mock-data"
import { getOverviewStats, getPipelineHealth, getTrend, listLeads } from "@/lib/api"
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

export function Overview() {
  const { data: overviewStats } = useSWR("overview-stats", () => getOverviewStats())
  const { data: trend = [] } = useSWR("overview-trend", () => getTrend())
  const { data: pipeline } = useSWR("pipeline-health", getPipelineHealth)
  const { data: leads } = useSWR("latest-leads", () => listLeads({ page: 1 }))
  const maxPosts = Math.max(1, ...trend.map((point) => point.posts))
  const recent = leads?.items.slice(0, 5) ?? []
  const kpis = overviewStats
    ? [
        { label: "Groups Monitored", value: overviewStats.groupsMonitored, icon: Users, hint: "actively collecting" },
        { label: "Total Posts", value: overviewStats.totalPosts.toLocaleString(), icon: FileText, hint: "collected" },
        { label: "AI Processed", value: overviewStats.aiProcessed.toLocaleString(), icon: Cpu, hint: "classified" },
        { label: "Qualified Leads", value: overviewStats.qualifiedLeads, icon: Target, hint: "matched", accent: true },
        { label: "Processing Failures", value: overviewStats.processingFailures, icon: AlertTriangle, hint: "in range", warn: true },
        { label: "AI Cost", value: `$${overviewStats.aiCostUsd.toFixed(2)}`, icon: DollarSign, hint: "in range" },
        { label: "Queue Size", value: overviewStats.queueSize, icon: ListChecks, hint: "posts awaiting AI" },
      ]
    : []
  const pipelineStages = pipeline
    ? [
        { stage: "Facebook Collection", pct: 100, note: `${pipeline.collected.toLocaleString()} collected` },
        { stage: "AI Classification", pct: Math.round((pipeline.processed / Math.max(1, pipeline.collected)) * 100), note: `${pipeline.processed.toLocaleString()} processed` },
        { stage: "Business Matching", pct: Math.round((pipeline.qualified / Math.max(1, pipeline.processed)) * 100), note: `${pipeline.qualified.toLocaleString()} qualified` },
        { stage: "Processing Reliability", pct: Math.round((1 - pipeline.failureRate) * 100), note: `${pipeline.failed.toLocaleString()} failed` },
      ]
    : []

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
            {pipelineStages.map((s) => (
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
