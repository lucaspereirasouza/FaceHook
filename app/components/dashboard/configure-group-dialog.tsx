"use client"

import { useState } from "react"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { updateGroup, type BusinessProfile, type MonitoredGroup } from "@/lib/api"
import { Check, Settings2, X } from "lucide-react"

interface ConfigureGroupDialogProps {
  group: MonitoredGroup
  profiles: BusinessProfile[]
  onClose: () => void
  onSave: (group: MonitoredGroup) => void
}

const intervalOptions = [15, 30, 45, 60]
const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"

export function ConfigureGroupDialog({ group, profiles, onClose, onSave }: ConfigureGroupDialogProps) {
  const [name, setName] = useState(group.name)
  const [url, setUrl] = useState(group.url)
  const [interval, setInterval] = useState(group.intervalMinutes)
  const [selectedProfiles, setSelectedProfiles] = useState(group.profiles)
  const [enabled, setEnabled] = useState(group.enabled)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const groupId = group.id

  function closeDialog() {
    if (!isSaving) onClose()
  }

  function toggleProfile(id: string) {
    setSelectedProfiles((current) => current.includes(id) ? current.filter((profileId) => profileId !== id) : [...current, id])
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Group name is required.")
      return
    }
    if (!url.trim() || !url.includes("facebook.com")) {
      setError("Enter a valid Facebook group URL.")
      return
    }
    if (!selectedProfiles.length) {
      setError("Attach at least one business profile.")
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const updatedGroup = await updateGroup(groupId, {
        name: name.trim(),
        url: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`,
        intervalMinutes: interval,
        profiles: selectedProfiles,
        enabled,
      })
      onSave(updatedGroup)
      setIsSaving(false)
      onClose()
    } catch {
      setError("The group could not be updated. Try again shortly.")
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="configure-group-title">
      <button type="button" aria-label="Close dialog" onClick={closeDialog} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Settings2 className="size-4.5" />
            </div>
            <div>
              <h2 id="configure-group-title" className="font-semibold leading-tight">Configure Group</h2>
              <p className="text-xs text-muted-foreground">Update monitoring, profiles, and collection frequency.</p>
            </div>
          </div>
          <button type="button" onClick={closeDialog} disabled={isSaving} aria-label="Close" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor="configure-group-name" className="text-sm font-medium">Group name</label>
            <input id="configure-group-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="configure-group-url" className="text-sm font-medium">Group URL</label>
            <input id="configure-group-url" value={url} onChange={(event) => setUrl(event.target.value)} className={`${inputClassName} font-mono`} />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Polling interval</span>
            <div className="flex flex-wrap gap-2">
              {intervalOptions.map((option) => (
                <button key={option} type="button" onClick={() => setInterval(option)} className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${interval === option ? "border-primary bg-primary/15 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                  {option}m
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-background px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium">Monitoring enabled</span>
              <span className="block text-xs text-muted-foreground">Disabled groups remain configured but are not scheduled.</span>
            </span>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-4 accent-primary" />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">Business profiles</span>
            <p className="text-xs text-muted-foreground">Posts in this group are classified against the selected profiles.</p>
            {profiles.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {profiles.map((profile) => {
                  const selected = selectedProfiles.includes(profile.id)
                  return (
                    <button key={profile.id} type="button" onClick={() => toggleProfile(profile.id)} className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors ${selected ? "border-primary/40 bg-primary/10" : "border-border bg-background hover:border-muted-foreground/40"}`}>
                      <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                        {selected && <Check className="size-3" />}
                      </span>
                      <span className="truncate">{profile.name}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">Create a business profile before configuring this group.</p>
            )}
          </div>

          {selectedProfiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedProfiles.map((id) => <Badge key={id} className="border-border bg-secondary text-secondary-foreground">{profiles.find((profile) => profile.id === id)?.name ?? id}</Badge>)}
            </div>
          )}

          {error && <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}