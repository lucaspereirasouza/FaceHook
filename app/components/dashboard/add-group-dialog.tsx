"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import type { BusinessProfile, MonitoredGroup } from "@/lib/api"
import { X, Check, Globe } from "lucide-react"

interface AddGroupDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (group: MonitoredGroup) => void
  profiles: BusinessProfile[]
}

const intervalOptions = [15, 30, 45, 60]

export function AddGroupDialog({ open, onClose, onAdd, profiles }: AddGroupDialogProps) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [interval, setInterval] = useState(30)
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const closeDialog = useCallback(() => {
    setName("")
    setUrl("")
    setInterval(30)
    setSelectedProfiles([])
    setError(null)
    onClose()
  }, [onClose])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDialog()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, closeDialog])

  if (!open) return null

  function toggleProfile(id: string) {
    setSelectedProfiles((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Group name is required.")
      return
    }
    if (!url.trim() || !url.includes("facebook.com")) {
      setError("Enter a valid Facebook group URL.")
      return
    }
    if (selectedProfiles.length === 0) {
      setError("Attach at least one business profile.")
      return
    }

    const group: MonitoredGroup = {
      id: `g-${Date.now()}`,
      name: name.trim(),
      url: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`,
      enabled: true,
      intervalMinutes: interval,
      profiles: selectedProfiles,
      lastScan: "not scanned yet",
      status: "active",
      postsCollected: 0,
      errors: 0,
    }
    onAdd(group)
    closeDialog()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-group-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={closeDialog}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Globe className="size-4.5" />
            </div>
            <div>
              <h2 id="add-group-title" className="font-semibold leading-tight">
                Add Facebook Group
              </h2>
              <p className="text-xs text-muted-foreground">Start monitoring a new group for leads.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor="group-name" className="text-sm font-medium">
              Group name
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Seattle Contractors & Home Services"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="group-url" className="text-sm font-medium">
              Group URL
            </label>
            <input
              id="group-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://facebook.com/groups/..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Polling interval</span>
            <div className="flex flex-wrap gap-2">
              {intervalOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInterval(opt)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    interval === opt
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}m
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Business profiles</span>
            <p className="text-xs text-muted-foreground">
              Posts in this group are classified against the selected profiles.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {profiles.map((profile) => {
                const active = selectedProfiles.includes(profile.id)
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleProfile(profile.id)}
                    className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-background hover:border-muted-foreground/40"
                    }`}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                        active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                      }`}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{profile.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedProfiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedProfiles.map((id) => (
                <Badge key={id} className="border-border bg-secondary text-secondary-foreground">
                  {profiles.find((profile) => profile.id === id)?.name}
                </Badge>
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit">Add Group</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
