"use client"

import { useState } from "react"
import { Sidebar, type View } from "@/components/dashboard/sidebar"
import { Overview } from "@/components/dashboard/overview"
import { GroupsView } from "@/components/dashboard/groups-view"
import { ProfilesView } from "@/components/dashboard/profiles-view"
import { LeadsView } from "@/components/dashboard/leads-view"
import { MonitoringView } from "@/components/dashboard/monitoring-view"
import { Button } from "@/components/ui/button"
import { Search, Bell, RefreshCw } from "lucide-react"

const titles: Record<View, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Pipeline metrics across every monitored source" },
  groups: { title: "Groups", subtitle: "Configure and monitor Facebook group sources" },
  profiles: { title: "Business Profiles", subtitle: "AI configurations used to classify and match leads" },
  leads: { title: "Leads", subtitle: "Review, triage, and action qualified opportunities" },
  monitoring: { title: "Monitoring", subtitle: "Worker health, queue depth, and processing logs" },
}

export default function Page() {
  const [view, setView] = useState<View>("overview")
  const meta = titles[view]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar view={view} onChange={setView} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{meta.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search…"
                className="h-8 w-56 rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>
            <Button size="icon" variant="outline" aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label="Notifications" className="relative">
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
        {view === "overview" && <Overview />}
        {view === "groups" && <GroupsView />}
        {view === "profiles" && <ProfilesView />}
        {view === "leads" && <LeadsView />}
        {view === "monitoring" && <MonitoringView />}
        </main>
      </div>
    </div>
  )
}
