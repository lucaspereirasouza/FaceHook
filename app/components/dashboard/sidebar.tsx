"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Target,
  Activity,
  Radar,
  LogOut,
} from "lucide-react"
import { Button } from "@/app/components/ui/button"

export type View = "overview" | "groups" | "profiles" | "leads" | "monitoring"

const nav: { id: View; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "groups", label: "Groups", icon: Users },
  { id: "profiles", label: "Business Profiles", icon: Briefcase },
  { id: "leads", label: "Leads", icon: Target, badge: "4 new" },
  { id: "monitoring", label: "Monitoring", icon: Activity },
]

export function Sidebar({
  view,
  onChange,
  facebookConnected,
  facebookName,
  onLogout,
  isLoggingOut,
}: {
  view: View
  onChange: (v: View) => void
  facebookConnected: boolean
  facebookName?: string
  onLogout: () => void
  isLoggingOut: boolean
}) {
  return (
    <aside className="flex h-full w-14 shrink-0 flex-col bg-sidebar text-sidebar-foreground sm:w-64">
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border sm:justify-start sm:gap-2.5 sm:px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Radar className="size-5" />
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold text-sidebar-accent-foreground">Facehook</p>
          <p className="text-xs text-sidebar-foreground/70">Lead Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2 sm:p-3" aria-label="Primary">
        {nav.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:justify-start sm:gap-3 sm:px-3",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="sr-only sm:not-sr-only sm:flex-1 sm:text-left">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "hidden rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:block",
                    active
                      ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                      : "bg-sidebar-primary/25 text-sidebar-accent-foreground",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 sm:p-3">
        <div className="flex items-center justify-center rounded-lg px-2 py-2 sm:justify-start sm:gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            AO
          </div>
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{facebookName ?? "Facebook User"}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {facebookConnected ? "Facebook connected" : "Facebook connection required"}
            </p>
          </div>
          <span
            className={cn("ml-auto hidden size-2 rounded-full sm:flex", facebookConnected ? "bg-success" : "bg-warning")}
            aria-hidden
          />
          {facebookConnected && <Button size="icon-xs" variant="ghost" onClick={onLogout} disabled={isLoggingOut} aria-label="Log out of Facebook" title="Log out of Facebook"><LogOut className="size-3.5" /></Button>}
        </div>
      </div>
    </aside>
  )
}
