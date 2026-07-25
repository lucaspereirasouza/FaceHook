"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  leads as allLeads,
  statusColor,
  urgencyColor,
  scoreColor,
  type Lead,
  type LeadStatus,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import {
  Search,
  ExternalLink,
  ImageIcon,
  MapPin,
  Sparkles,
  MessageSquareQuote,
  X,
  Copy,
} from "lucide-react"

const filters: (LeadStatus | "All")[] = ["All", "New", "Reviewed", "Contacted", "Converted", "Ignored"]

export function LeadsView() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Lead | null>(null)

  const visible = allLeads.filter((l) => {
    const matchesFilter = filter === "All" || l.status === filter
    const matchesQuery =
      query === "" ||
      l.summary.toLowerCase().includes(query.toLowerCase()) ||
      l.author.toLowerCase().includes(query.toLowerCase()) ||
      l.service.toLowerCase().includes(query.toLowerCase())
    return matchesFilter && matchesQuery
  })

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads by summary, author, or service…"
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
              {f !== "All" && (
                <span className="ml-1.5 opacity-70">
                  {allLeads.filter((l) => l.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2">
          {visible.map((lead) => (
            <Card
              key={lead.id}
              className={cn(
                "cursor-pointer p-4 transition-colors hover:border-primary/40",
                selected?.id === lead.id && "border-primary ring-1 ring-primary/30",
              )}
              onClick={() => setSelected(lead)}
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {lead.authorAvatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{lead.author}</p>
                    <span className="text-xs text-muted-foreground">· {lead.createdAt}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{lead.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
                    <Badge className={urgencyColor(lead.urgency)}>{lead.urgency}</Badge>
                    <Badge className="border-border bg-secondary text-secondary-foreground">
                      {lead.service}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {lead.location}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-mono text-xl font-semibold", scoreColor(lead.score))}>
                    {lead.score}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round(lead.confidence * 100)}% conf.
                  </p>
                </div>
              </div>
            </Card>
          ))}
          {visible.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No leads match the current filter.
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <div className="hidden w-96 shrink-0 xl:block">
      <div className="sticky top-6">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold">Lead Detail</p>
            <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close detail">
              <X className="size-4" />
            </Button>
          </div>

          <div className="max-h-[calc(100vh-9rem)] space-y-5 overflow-y-auto p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {lead.authorAvatar}
              </div>
              <div>
                <p className="font-medium">{lead.author}</p>
                <p className="text-xs text-muted-foreground">{lead.groupName}</p>
              </div>
              <div className="ml-auto text-right">
                <p className={cn("font-mono text-2xl font-semibold", scoreColor(lead.score))}>
                  {lead.score}<span className="text-sm text-muted-foreground">/10</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
              <Badge className={urgencyColor(lead.urgency)}>{lead.urgency} urgency</Badge>
              <Badge className="border-primary/25 bg-primary/10 text-primary">{lead.matchedProfile}</Badge>
            </div>

            {/* Original post */}
            <section>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Original Facebook Post</p>
              <div className="rounded-lg border border-border bg-background/50 p-3 text-sm leading-relaxed">
                {lead.content}
                {lead.images > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <ImageIcon className="size-3.5" /> {lead.images} image{lead.images > 1 ? "s" : ""} attached
                  </div>
                )}
              </div>
            </section>

            {/* AI summary */}
            <section>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" /> AI Summary
              </p>
              <p className="text-sm leading-relaxed">{lead.summary}</p>
            </section>

            {/* Extracted fields */}
            <section className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm">
              <Field label="Service" value={lead.service} />
              <Field label="Location" value={lead.location} />
              <Field label="Confidence" value={`${Math.round(lead.confidence * 100)}%`} />
              <Field label="Contact" value={lead.contactInfo} />
            </section>

            {/* Recommended response */}
            <section>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MessageSquareQuote className="size-3.5" /> Recommended Response
              </p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">
                {lead.recommendedResponse}
              </div>
              <Button size="sm" variant="outline" className="mt-2 w-full">
                <Copy className="size-3.5" /> Copy response
              </Button>
            </section>

            <div className="flex gap-2">
              <a
                href={lead.facebookUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "default", size: "default" }), "flex-1")}
              >
                <ExternalLink className="size-4" /> Open Post
              </a>
              <Button variant="secondary" className="flex-1">
                Mark Contacted
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
