"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Target,
  Activity,
  Radar,
} from "lucide-react"

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
}: {
  view: View
  onChange: (v: View) => void
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Radar className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-sidebar-accent-foreground">Signalscope</p>
          <p className="text-xs text-sidebar-foreground/70">Lead Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
        {nav.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
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

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            AO
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">Alex Ortega</p>
            <p className="truncate text-xs text-sidebar-foreground/70">Growth Ops</p>
          </div>
          <span className="ml-auto flex size-2 rounded-full bg-success" aria-hidden />
        </div>
      </div>
    </aside>
  )
}
