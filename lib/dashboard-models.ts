import "server-only"

import type { BusinessProfile, Lead, LogEntry, MonitoredGroup, WorkerInfo } from "@/lib/mock-data"

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

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("")
}

export function toLead(record: DataRecord, post: DataRecord | undefined, groupName: string): Lead {
  const author = stringValue(post?.author_name, "Unknown author")

  return {
    id: stringValue(record.id),
    author,
    authorAvatar: initials(author),
    groupName,
    content: stringValue(post?.content),
    images: Number(post?.attachment_count) || 0,
    score: Number(record.score) || 0,
    confidence: Number(record.confidence) || 0,
    service: stringValue(record.service),
    location: stringValue(record.location),
    urgency: stringValue(record.urgency, "Low") as Lead["urgency"],
    summary: stringValue(record.summary),
    recommendedResponse: stringValue(record.recommended_response),
    matchedProfile: stringValue(record.matched_profile_name),
    contactInfo: stringValue(record.contact_info),
    status: stringValue(record.status, "New") as Lead["status"],
    createdAt: toRelativeTime(record.created_at),
    facebookUrl: stringValue(post?.facebook_url),
  }
}

export function toWorkerInfo(record: DataRecord): WorkerInfo {
  return {
    id: stringValue(record.id),
    name: stringValue(record.name),
    role: stringValue(record.role),
    state: stringValue(record.state, "down") as WorkerInfo["state"],
    lastPoll: toRelativeTime(record.last_poll_at),
    avgProcessingMs: Number(record.avg_processing_ms) || 0,
    processedToday: Number(record.processed_today) || 0,
  }
}

export function toLogEntry(record: DataRecord, workerName: string): LogEntry {
  return {
    id: stringValue(record.id),
    time: toRelativeTime(record.logged_at),
    level: stringValue(record.level, "info") as LogEntry["level"],
    worker: workerName,
    message: stringValue(record.message),
  }
}

export function asStringList(value: unknown, maximum = 100) {
  if (!Array.isArray(value)) return []

  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
    .slice(0, maximum)
}