"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/app/components/ui/button"
import { createProfile, type BusinessProfile } from "@/lib/api"
import { Sparkles, X } from "lucide-react"

interface AddProfileDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (profile: BusinessProfile) => void
}

function splitList(value: string) {
  return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))]
}

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"

export function AddProfileDialog({ open, onClose, onAdd }: AddProfileDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [prompt, setPrompt] = useState("")
  const [services, setServices] = useState("")
  const [keywords, setKeywords] = useState("")
  const [negativeKeywords, setNegativeKeywords] = useState("")
  const [locations, setLocations] = useState("")
  const [responseStyle, setResponseStyle] = useState("")
  const [discordWebhook, setDiscordWebhook] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = useCallback(() => {
    setName("")
    setDescription("")
    setPrompt("")
    setServices("")
    setKeywords("")
    setNegativeKeywords("")
    setLocations("")
    setResponseStyle("")
    setDiscordWebhook("")
    setError(null)
  }, [])

  const closeDialog = useCallback(() => {
    if (isSaving) return
    resetForm()
    onClose()
  }, [isSaving, onClose, resetForm])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, closeDialog])

  if (!open) return null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !prompt.trim()) {
      setError("Profile name and AI prompt are required.")
      return
    }
    if (!splitList(services).length) {
      setError("Add at least one service.")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const profile = await createProfile({
        name: name.trim(),
        description: description.trim(),
        prompt: prompt.trim(),
        services: splitList(services),
        keywords: splitList(keywords),
        negativeKeywords: splitList(negativeKeywords),
        locations: splitList(locations),
        responseStyle: responseStyle.trim(),
        discordWebhook: discordWebhook.trim(),
        enabled: true,
      })
      onAdd(profile)
      resetForm()
      setIsSaving(false)
      onClose()
    } catch {
      setError("The profile could not be saved. Try again shortly.")
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-profile-title">
      <button type="button" aria-label="Close dialog" onClick={closeDialog} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <h2 id="add-profile-title" className="font-semibold leading-tight">New Business Profile</h2>
              <p className="text-xs text-muted-foreground">Configure how relevant Facebook posts are classified.</p>
            </div>
          </div>
          <button type="button" onClick={closeDialog} disabled={isSaving} aria-label="Close" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Profile name" htmlFor="profile-name" required>
              <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Web Agency" className={inputClassName} />
            </Field>
            <Field label="Response style" htmlFor="profile-response-style">
              <input id="profile-response-style" value={responseStyle} onChange={(event) => setResponseStyle(event.target.value)} placeholder="Professional and concise" className={inputClassName} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Description" htmlFor="profile-description">
              <input id="profile-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this business offers and who it serves" className={inputClassName} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="AI prompt" htmlFor="profile-prompt" required>
              <textarea id="profile-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the requests that should qualify as a lead." rows={4} className={`${inputClassName} min-h-24 resize-y`} />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Services" htmlFor="profile-services" hint="Comma-separated" required>
              <input id="profile-services" value={services} onChange={(event) => setServices(event.target.value)} placeholder="Websites, SEO, Landing pages" className={inputClassName} />
            </Field>
            <Field label="Locations" htmlFor="profile-locations" hint="Comma-separated">
              <input id="profile-locations" value={locations} onChange={(event) => setLocations(event.target.value)} placeholder="Seattle, Tacoma" className={inputClassName} />
            </Field>
            <Field label="Keywords" htmlFor="profile-keywords" hint="Comma-separated">
              <input id="profile-keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="website, redesign, SEO" className={inputClassName} />
            </Field>
            <Field label="Exclude keywords" htmlFor="profile-negative-keywords" hint="Comma-separated">
              <input id="profile-negative-keywords" value={negativeKeywords} onChange={(event) => setNegativeKeywords(event.target.value)} placeholder="hiring, course, internship" className={inputClassName} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Discord webhook" htmlFor="profile-discord-webhook" hint="Optional; stored encrypted">
              <input id="profile-discord-webhook" type="url" value={discordWebhook} onChange={(event) => setDiscordWebhook(event.target.value)} placeholder="https://discord.com/api/webhooks/..." className={inputClassName} />
            </Field>
          </div>

          {error && <p role="alert" className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Create Profile"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-center justify-between text-sm font-medium">
        <span>{label}{required ? " *" : ""}</span>
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children}
    </div>
  )
}