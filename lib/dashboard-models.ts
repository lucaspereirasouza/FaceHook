import "server-only"

import type { BusinessProfile, MonitoredGroup } from "@/lib/mock-data"

type DataRecord = Record<string, unknown>

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

export function toBusinessProfile(record: DataRecord, leadsMatched = 0): BusinessProfile {
  return {
    id: stringValue(record.id),
    name: stringValue(record.name),
    description: stringValue(record.description),
    prompt: stringValue(record.prompt),
    services: stringList(record.services),
    keywords: stringList(record.keywords),
    negativeKeywords: stringList(record.negative_keywords),
    locations: stringList(record.locations),
    responseStyle: stringValue(record.response_style),
    discordWebhook: record.discord_webhook_encrypted ? "Configured" : "Not configured",
    enabled: record.enabled === true,
    leadsMatched,
  }
}

export function toRelativeTime(value: unknown) {
  if (typeof value !== "string") return "not scanned yet"

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000))
  if (elapsedSeconds < 60) return "just now"
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} min ago`
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} hours ago`
  return `${Math.floor(elapsedSeconds / 86400)} days ago`
}

export function toMonitoredGroup(record: DataRecord, profiles: string[]): MonitoredGroup {
  return {
    id: stringValue(record.id),
    name: stringValue(record.name),
    url: stringValue(record.url),
    enabled: record.enabled === true,
    intervalMinutes: Number(record.interval_minutes) || 30,
    profiles,
    lastScan: toRelativeTime(record.last_scan_at),
    status: stringValue(record.status, "paused") as MonitoredGroup["status"],
    postsCollected: Number(record.posts_collected) || 0,
    errors: Number(record.errors) || 0,
  }
}

export function asStringList(value: unknown, maximum = 100) {
  if (!Array.isArray(value)) return []

  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
    .slice(0, maximum)
}