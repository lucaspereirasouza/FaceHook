"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { Sidebar, type View } from "@/app/components/dashboard/sidebar"
import { FacebookConnectionOnboarding } from "@/app/components/dashboard/facebook-connection-onboarding"
import { Overview } from "@/app/components/dashboard/overview"
import { GroupsView } from "@/app/components/dashboard/groups-view"
import { ProfilesView } from "@/app/components/dashboard/profiles-view"
import { LeadsView } from "@/app/components/dashboard/leads-view"
import { MonitoringView } from "@/app/components/dashboard/monitoring-view"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { getFacebookConnection, listLeads, logoutFacebook, type Lead } from "@/lib/api"
import { Search, Bell, CheckCircle2, Link2, RefreshCw, LoaderCircle, X } from "lucide-react"

const titles: Record<View, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Pipeline metrics across every monitored source" },
  groups: { title: "Groups", subtitle: "Configure and monitor Facebook group sources" },
  profiles: { title: "Business Profiles", subtitle: "AI configurations used to classify and match leads" },
  leads: { title: "Leads", subtitle: "Review, triage, and action qualified opportunities" },
  monitoring: { title: "Monitoring", subtitle: "Worker health, queue depth, and processing logs" },
}

export default function Page() {
  const [view, setView] = useState<View>("overview")
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { mutate } = useSWRConfig()
  const { data: facebookConnection, isLoading: isLoadingConnection } = useSWR(
    "facebook-connection",
    getFacebookConnection,
    { revalidateOnFocus: true },
  )
  const meta = titles[view]
  const facebookConnected = facebookConnection?.status === "connected"
  const facebookConnectionIssue = facebookConnection?.status === "expired" || facebookConnection?.status === "invalid"
  const { data: newLeads } = useSWR(facebookConnected ? ["leads", "notifications"] : null, () => listLeads({ status: "New", page: 1 }))
  const onboardingReason = facebookConnection?.status === "expired"
    ? "expired"
    : facebookConnection?.status === "invalid"
      ? "invalid"
      : "not_connected"

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      await mutate(() => true, undefined, { revalidate: true })
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logoutFacebook()
      await mutate("facebook-connection")
      setView("overview")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar view={view} onChange={setView} facebookConnected={facebookConnected} facebookName={facebookConnection?.account?.name} onLogout={() => void handleLogout()} isLoggingOut={isLoggingOut} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{meta.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              className={
                `${facebookConnected
                  ? "border-success/25 bg-success/15 text-success"
                  : facebookConnectionIssue
                    ? "border-warning/25 bg-warning/15 text-warning"
                    : "border-border bg-muted text-muted-foreground"} hidden sm:flex`
              }
            >
              {facebookConnected ? <CheckCircle2 className="size-3" /> : <Link2 className="size-3" />}
              {facebookConnected ? "Facebook connected" : facebookConnectionIssue ? "Reconnect Facebook" : "Connect Facebook"}
            </Badge>
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search…"
                className="h-8 w-56 rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>
            <Button size="icon" variant="outline" aria-label="Refresh dashboard" title="Refresh dashboard" onClick={() => void handleRefresh()} disabled={isRefreshing}>
              {isRefreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
            <Button size="icon" variant="outline" aria-label="Notifications" title="Notifications" className="relative" onClick={() => setNotificationsOpen((open) => !open)}>
              <Bell className="size-4" />
              {(newLeads?.total ?? 0) > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />}
            </Button>
            {notificationsOpen && <NotificationPanel leads={newLeads?.items ?? []} total={newLeads?.total ?? 0} onClose={() => setNotificationsOpen(false)} onViewLeads={() => { setView("leads"); setNotificationsOpen(false) }} />}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
        {isLoadingConnection ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Checking Facebook connection...</div>
        ) : !facebookConnected ? (
          <FacebookConnectionOnboarding reason={onboardingReason} />
        ) : (
          <>
            {view === "overview" && <Overview />}
            {view === "groups" && <GroupsView />}
            {view === "profiles" && <ProfilesView />}
            {view === "leads" && <LeadsView />}
            {view === "monitoring" && <MonitoringView />}
          </>
        )}
        </main>
      </div>
    </div>
  )
}

function NotificationPanel({ leads, total, onClose, onViewLeads }: { leads: Lead[]; total: number; onClose: () => void; onViewLeads: () => void }) {
  return (
    <div className="absolute right-3 top-14 z-30 w-[min(24rem,calc(100vw-1.5rem))] border border-border bg-card p-3 shadow-xl sm:right-6" role="dialog" aria-label="New lead notifications">
      <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">New leads</p><p className="text-xs text-muted-foreground">{total} awaiting review</p></div><Button size="icon-xs" variant="ghost" onClick={onClose} aria-label="Close notifications"><X className="size-3.5" /></Button></div>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {leads.map((lead) => <button key={lead.id} type="button" onClick={onViewLeads} className="w-full border border-border p-3 text-left transition-colors hover:bg-muted"><p className="truncate text-sm font-medium">{lead.service} · {lead.score}/10</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lead.summary}</p></button>)}
        {leads.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">No new leads right now.</p>}
      </div>
      {total > 0 && <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onViewLeads}>View all leads</Button>}
    </div>
  )
}
