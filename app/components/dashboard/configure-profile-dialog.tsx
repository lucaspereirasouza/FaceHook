"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { updateProfile, type BusinessProfile } from "@/lib/api"
import { Settings2, X } from "lucide-react"

interface ConfigureProfileDialogProps {
  profile: BusinessProfile
  onClose: () => void
  onSave: (profile: BusinessProfile) => void
}

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"

function joinList(values: string[]) {
  return values.join(", ")
}

function splitList(value: string) {
  return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))]
}

export function ConfigureProfileDialog({ profile, onClose, onSave }: ConfigureProfileDialogProps) {
  const [name, setName] = useState(profile.name)
  const [description, setDescription] = useState(profile.description)
  const [prompt, setPrompt] = useState(profile.prompt)
  const [services, setServices] = useState(joinList(profile.services))
  const [keywords, setKeywords] = useState(joinList(profile.keywords))
  const [negativeKeywords, setNegativeKeywords] = useState(joinList(profile.negativeKeywords))
  const [locations, setLocations] = useState(joinList(profile.locations))
  const [responseStyle, setResponseStyle] = useState(profile.responseStyle)
  const [discordWebhook, setDiscordWebhook] = useState("")
  const [enabled, setEnabled] = useState(profile.enabled)
  const [classifierModel, setClassifierModel] = useState<unknown | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const profileId = profile.id

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !prompt.trim() || !splitList(services).length) {
      setError("Profile name, AI prompt, and at least one service are required.")
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const updatedProfile = await updateProfile(profileId, {
        name: name.trim(),
        description: description.trim(),
        prompt: prompt.trim(),
        services: splitList(services),
        keywords: splitList(keywords),
        negativeKeywords: splitList(negativeKeywords),
        locations: splitList(locations),
        responseStyle: responseStyle.trim(),
        enabled,
        ...(discordWebhook.trim() ? { discordWebhook: discordWebhook.trim() } : {}),
        ...(classifierModel ? { classifierModel } : {}),
      })
      onSave(updatedProfile)
      onClose()
    } catch {
      setError("The profile could not be updated. Try again shortly.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="configure-profile-title">
      <button type="button" aria-label="Close dialog" onClick={() => !isSaving && onClose()} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><Settings2 className="size-4.5" /></div>
            <div><h2 id="configure-profile-title" className="font-semibold leading-tight">Configure Business Profile</h2><p className="text-xs text-muted-foreground">Update the AI classification and Discord notification settings.</p></div>
          </div>
          <button type="button" onClick={() => !isSaving && onClose()} disabled={isSaving} aria-label="Close" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"><X className="size-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Profile name" htmlFor="configure-profile-name"><input id="configure-profile-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} /></Field>
            <Field label="Response style" htmlFor="configure-profile-response-style"><input id="configure-profile-response-style" value={responseStyle} onChange={(event) => setResponseStyle(event.target.value)} className={inputClassName} /></Field>
          </div>
          <div className="mt-4"><Field label="Description" htmlFor="configure-profile-description"><input id="configure-profile-description" value={description} onChange={(event) => setDescription(event.target.value)} className={inputClassName} /></Field></div>
          <div className="mt-4"><Field label="AI prompt" htmlFor="configure-profile-prompt"><textarea id="configure-profile-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} className={`${inputClassName} min-h-24 resize-y`} /></Field></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Services" htmlFor="configure-profile-services"><input id="configure-profile-services" value={services} onChange={(event) => setServices(event.target.value)} className={inputClassName} /></Field>
            <Field label="Locations" htmlFor="configure-profile-locations"><input id="configure-profile-locations" value={locations} onChange={(event) => setLocations(event.target.value)} className={inputClassName} /></Field>
            <Field label="Keywords" htmlFor="configure-profile-keywords"><input id="configure-profile-keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} className={inputClassName} /></Field>
            <Field label="Exclude keywords" htmlFor="configure-profile-negative"><input id="configure-profile-negative" value={negativeKeywords} onChange={(event) => setNegativeKeywords(event.target.value)} className={inputClassName} /></Field>
          </div>
          <div className="mt-4"><Field label="Replace Discord webhook" htmlFor="configure-profile-webhook" hint={profile.discordWebhook === "Configured" ? "A webhook is configured" : "Optional"}><input id="configure-profile-webhook" type="url" value={discordWebhook} onChange={(event) => setDiscordWebhook(event.target.value)} placeholder="https://discord.com/api/webhooks/..." className={inputClassName} /></Field></div>
          <div className="mt-4"><Field label="Classifier model" htmlFor="configure-profile-classifier" hint="Offline-trained classifier.json"><input id="configure-profile-classifier" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void file.text().then((text) => setClassifierModel(JSON.parse(text))).catch(() => setError("Classifier file must contain valid JSON.")) }} className={inputClassName} /></Field></div>
          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-md border border-border bg-background px-3 py-2.5"><span><span className="block text-sm font-medium">Profile enabled</span><span className="block text-xs text-muted-foreground">Disabled profiles are excluded from lead classification.</span></span><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-4 accent-primary" /></label>
          {error && <p role="alert" className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="ghost" onClick={() => !isSaving && onClose()} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button></div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label htmlFor={htmlFor} className="flex items-center justify-between text-sm font-medium"><span>{label}</span>{hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}</label>{children}</div>
}