import type {
  BusinessProfile,
  GroupStatus,
  Lead,
  LeadStatus,
  LogEntry,
  MonitoredGroup,
  Urgency,
  WorkerInfo,
  WorkerState,
} from "@/lib/mock-data"

export type {
  BusinessProfile,
  GroupStatus,
  Lead,
  LeadStatus,
  LogEntry,
  MonitoredGroup,
  Urgency,
  WorkerInfo,
  WorkerState,
}

export interface OverviewStats {
  groupsMonitored: number
  totalPosts: number
  aiProcessed: number
  qualifiedLeads: number
  processingFailures: number
  aiCostUsd: number
  queueSize: number
}

export interface TrendPoint {
  day: string
  posts: number
  leads: number
}

export interface PipelineHealth {
  collected: number
  processed: number
  qualified: number
  failed: number
  failureRate: number
}

export interface QueueStatus {
  size: number
  oldestJobAgeSec: number
  inFlight: number
  failed: number
}

export interface FacebookConnection {
  status: "connected" | "expired" | "invalid" | "not_connected"
  account?: {
    id: string
    name?: string
    expiresAt?: number
  }
}

export interface LeadListParams {
  status?: LeadStatus
  profile?: string
  group?: string
  minScore?: number
  search?: string
  urgency?: Urgency
  page?: number
  sort?: string
}

export interface LeadListResponse {
  items: Lead[]
  total: number
  page: number
}

export interface LeadFilters {
  statuses: LeadStatus[]
  profiles: string[]
  groups: string[]
  urgencies: Urgency[]
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown }

function toQuery(params: object) {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if ((typeof value === "string" || typeof value === "number") && value !== "") {
      searchParams.set(key, String(value))
    }
  }
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...init } = options
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getOverviewStats(range = "7d") {
  return request<OverviewStats>(`/api/stats/overview${toQuery({ range })}`)
}

export function getFacebookConnection() {
  return request<FacebookConnection>("/api/auth/facebook/me")
}

export function logoutFacebook() {
  return request<{ loggedOut: true }>("/api/auth/facebook/logout", { method: "POST" })
}

export function getTrend(days = 14) {
  return request<TrendPoint[]>(`/api/stats/trend${toQuery({ days })}`)
}

export function getPipelineHealth() {
  return request<PipelineHealth>("/api/stats/pipeline")
}

export function listProfiles() {
  return request<BusinessProfile[]>("/api/profiles")
}

export function getProfile(id: string) {
  return request<BusinessProfile>(`/api/profiles/${id}`)
}

export function createProfile(data: Omit<BusinessProfile, "id" | "leadsMatched">) {
  return request<BusinessProfile>("/api/profiles", { method: "POST", body: data })
}

export function updateProfile(id: string, data: Partial<Omit<BusinessProfile, "id" | "leadsMatched">>) {
  return request<BusinessProfile>(`/api/profiles/${id}`, { method: "PATCH", body: data })
}

export function deleteProfile(id: string) {
  return request<{ success: boolean }>(`/api/profiles/${id}`, { method: "DELETE" })
}

export function toggleProfile(id: string, enabled: boolean) {
  return request<BusinessProfile>(`/api/profiles/${id}/enabled`, { method: "PATCH", body: { enabled } })
}

export function testDiscordWebhook(id: string) {
  return request<{ delivered: boolean; statusCode: number }>(`/api/profiles/${id}/test-webhook`, {
    method: "POST",
  })
}

export function listGroups() {
  return request<MonitoredGroup[]>("/api/groups")
}

export function getGroup(id: string) {
  return request<MonitoredGroup>(`/api/groups/${id}`)
}

export function createGroup(data: Pick<MonitoredGroup, "name" | "url" | "intervalMinutes" | "profiles" | "enabled">) {
  return request<MonitoredGroup>("/api/groups", { method: "POST", body: data })
}

export function updateGroup(
  id: string,
  data: Partial<Pick<MonitoredGroup, "name" | "url" | "intervalMinutes" | "profiles" | "enabled">>,
) {
  return request<MonitoredGroup>(`/api/groups/${id}`, { method: "PATCH", body: data })
}

export function deleteGroup(id: string) {
  return request<{ success: boolean }>(`/api/groups/${id}`, { method: "DELETE" })
}

export function toggleGroup(id: string, enabled: boolean) {
  return request<MonitoredGroup>(`/api/groups/${id}/enabled`, { method: "PATCH", body: { enabled } })
}

export function triggerScan(id: string) {
  return request<{ queued: true; jobId: string }>(`/api/groups/${id}/scan`, { method: "POST" })
}

export function listLeads(params: LeadListParams = {}) {
  return request<LeadListResponse>(`/api/leads${toQuery(params)}`)
}

export function getLead(id: string) {
  return request<Lead>(`/api/leads/${id}`)
}

export function updateLeadStatus(id: string, status: LeadStatus) {
  return request<Lead>(`/api/leads/${id}/status`, { method: "PATCH", body: { status } })
}

export function regenerateResponse(id: string) {
  return request<{ recommendedResponse: string }>(`/api/leads/${id}/regenerate`, { method: "POST" })
}

export function deleteLead(id: string) {
  return request<{ success: boolean }>(`/api/leads/${id}`, { method: "DELETE" })
}

export function getLeadFilters() {
  return request<LeadFilters>("/api/leads/filters")
}

export function getWorkers() {
  return request<WorkerInfo[]>("/api/workers")
}

export function getQueueStatus() {
  return request<QueueStatus>("/api/queue")
}

export function getLogs(params: { limit?: number; level?: LogEntry["level"] } = {}) {
  return request<LogEntry[]>(`/api/logs${toQuery(params)}`)
}

export function retryFailedJobs() {
  return request<{ requeued: number }>("/api/queue/retry", { method: "POST" })
}