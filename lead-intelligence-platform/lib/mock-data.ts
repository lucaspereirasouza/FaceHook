// Mock data + types for the Lead Intelligence dashboard (front-end MVP).

export type GroupStatus = "active" | "paused" | "error"
export type LeadStatus = "New" | "Reviewed" | "Contacted" | "Converted" | "Ignored"
export type Urgency = "Low" | "Medium" | "High"
export type WorkerState = "healthy" | "degraded" | "down"

export interface BusinessProfile {
  id: string
  name: string
  description: string
  prompt: string
  services: string[]
  keywords: string[]
  negativeKeywords: string[]
  locations: string[]
  responseStyle: string
  discordWebhook: string
  enabled: boolean
  leadsMatched: number
}

export interface MonitoredGroup {
  id: string
  name: string
  url: string
  enabled: boolean
  intervalMinutes: number
  profiles: string[] // business profile ids
  lastScan: string
  status: GroupStatus
  postsCollected: number
  errors: number
}

export interface Lead {
  id: string
  author: string
  authorAvatar: string
  groupName: string
  content: string
  images: number
  score: number
  confidence: number
  service: string
  location: string
  urgency: Urgency
  summary: string
  recommendedResponse: string
  matchedProfile: string
  contactInfo: string
  status: LeadStatus
  createdAt: string
  facebookUrl: string
}

export interface WorkerInfo {
  id: string
  name: string
  role: string
  state: WorkerState
  lastPoll: string
  avgProcessingMs: number
  processedToday: number
}

export interface LogEntry {
  id: string
  time: string
  level: "info" | "warn" | "error"
  worker: string
  message: string
}

export const overviewStats = {
  groupsMonitored: 14,
  totalPosts: 8421,
  aiProcessed: 8107,
  qualifiedLeads: 612,
  processingFailures: 23,
  aiCostUsd: 47.82,
  queueSize: 38,
}

// 14-day trend of collected posts vs qualified leads
export const trend: { day: string; posts: number; leads: number }[] = [
  { day: "Jul 11", posts: 512, leads: 34 },
  { day: "Jul 12", posts: 604, leads: 41 },
  { day: "Jul 13", posts: 488, leads: 29 },
  { day: "Jul 14", posts: 671, leads: 52 },
  { day: "Jul 15", posts: 720, leads: 61 },
  { day: "Jul 16", posts: 655, leads: 47 },
  { day: "Jul 17", posts: 590, leads: 38 },
  { day: "Jul 18", posts: 742, leads: 66 },
  { day: "Jul 19", posts: 810, leads: 71 },
  { day: "Jul 20", posts: 698, leads: 55 },
  { day: "Jul 21", posts: 623, leads: 44 },
  { day: "Jul 22", posts: 767, leads: 63 },
  { day: "Jul 23", posts: 845, leads: 78 },
  { day: "Jul 24", posts: 496, leads: 33 },
]

export const businessProfiles: BusinessProfile[] = [
  {
    id: "bp-web",
    name: "Web Agency",
    description: "Full-service web design and SEO studio serving the Pacific Northwest.",
    prompt: "Look for businesses actively requesting website design, redesign, or SEO services.",
    services: ["Websites", "SEO", "Landing Pages", "E-commerce"],
    keywords: ["website", "web design", "redesign", "landing page", "seo"],
    negativeKeywords: ["hiring", "course", "freelancer wanted", "internship"],
    locations: ["Seattle", "Tacoma", "Bellevue"],
    responseStyle: "Professional, concise, consultative",
    discordWebhook: "https://discord.com/api/webhooks/••••/web-agency",
    enabled: true,
    leadsMatched: 214,
  },
  {
    id: "bp-roof",
    name: "Roofing & Exteriors",
    description: "Residential roofing, siding, and gutter contractor.",
    prompt: "Identify homeowners seeking roof repair, replacement, or storm damage assessment.",
    services: ["Roof Repair", "Roof Replacement", "Gutters", "Siding"],
    keywords: ["roof", "leak", "shingles", "storm damage", "gutter"],
    negativeKeywords: ["diy", "wholesale", "job posting"],
    locations: ["Portland", "Vancouver", "Salem"],
    responseStyle: "Friendly, urgent, trust-building",
    discordWebhook: "https://discord.com/api/webhooks/••••/roofing",
    enabled: true,
    leadsMatched: 168,
  },
  {
    id: "bp-clean",
    name: "Commercial Cleaning",
    description: "Janitorial and post-construction cleaning for offices and retail.",
    prompt: "Find facility managers or business owners needing recurring cleaning services.",
    services: ["Office Cleaning", "Post-Construction", "Carpet Care"],
    keywords: ["cleaning", "janitorial", "office clean", "recurring"],
    negativeKeywords: ["residential only", "hiring cleaners"],
    locations: ["Seattle", "Renton"],
    responseStyle: "Warm, reliable, value-focused",
    discordWebhook: "https://discord.com/api/webhooks/••••/cleaning",
    enabled: false,
    leadsMatched: 92,
  },
  {
    id: "bp-photo",
    name: "Event Photography",
    description: "Weddings, corporate events, and brand shoots.",
    prompt: "Detect people planning events who need a photographer or videographer.",
    services: ["Weddings", "Corporate", "Brand Shoots", "Videography"],
    keywords: ["photographer", "wedding", "event", "shoot", "videographer"],
    negativeKeywords: ["free", "tfp", "student project"],
    locations: ["Austin", "Dallas"],
    responseStyle: "Creative, personable, portfolio-driven",
    discordWebhook: "https://discord.com/api/webhooks/••••/photo",
    enabled: true,
    leadsMatched: 138,
  },
]

export const groups: MonitoredGroup[] = [
  {
    id: "g1",
    name: "Seattle Contractors & Home Services",
    url: "https://facebook.com/groups/seattlecontractors",
    enabled: true,
    intervalMinutes: 15,
    profiles: ["bp-web", "bp-roof", "bp-clean"],
    lastScan: "2 min ago",
    status: "active",
    postsCollected: 1842,
    errors: 0,
  },
  {
    id: "g2",
    name: "Portland Homeowners Network",
    url: "https://facebook.com/groups/pdxhomeowners",
    enabled: true,
    intervalMinutes: 30,
    profiles: ["bp-roof"],
    lastScan: "8 min ago",
    status: "active",
    postsCollected: 1233,
    errors: 1,
  },
  {
    id: "g3",
    name: "Austin Small Business Owners",
    url: "https://facebook.com/groups/atxsmallbiz",
    enabled: true,
    intervalMinutes: 20,
    profiles: ["bp-web", "bp-photo"],
    lastScan: "5 min ago",
    status: "active",
    postsCollected: 2104,
    errors: 0,
  },
  {
    id: "g4",
    name: "PNW Event Planning Community",
    url: "https://facebook.com/groups/pnwevents",
    enabled: false,
    intervalMinutes: 60,
    profiles: ["bp-photo"],
    lastScan: "3 hours ago",
    status: "paused",
    postsCollected: 641,
    errors: 0,
  },
  {
    id: "g5",
    name: "Tacoma Buy / Sell / Services",
    url: "https://facebook.com/groups/tacomaservices",
    enabled: true,
    intervalMinutes: 15,
    profiles: ["bp-web", "bp-clean"],
    lastScan: "just now",
    status: "error",
    postsCollected: 987,
    errors: 6,
  },
  {
    id: "g6",
    name: "Dallas–Fort Worth Weddings",
    url: "https://facebook.com/groups/dfwweddings",
    enabled: true,
    intervalMinutes: 45,
    profiles: ["bp-photo"],
    lastScan: "22 min ago",
    status: "active",
    postsCollected: 1614,
    errors: 0,
  },
]

export const leads: Lead[] = [
  {
    id: "l1",
    author: "Marcus Whitfield",
    authorAvatar: "MW",
    groupName: "Portland Homeowners Network",
    content:
      "Big storm last night took half the shingles off our garage roof. Water is already getting in. Need someone reputable who can come out this week for an estimate — SE Portland area. Please drop recommendations!",
    images: 2,
    score: 9,
    confidence: 0.93,
    service: "Roof Repair",
    location: "Portland, OR",
    urgency: "High",
    summary:
      "Homeowner with active roof leak from storm damage seeking a same-week estimate in SE Portland.",
    recommendedResponse:
      "Hi Marcus — sorry about the storm damage. We handle emergency roof repairs across SE Portland and can get out this week. Happy to send photos of recent work and a free estimate. What's the best number to reach you?",
    matchedProfile: "Roofing & Exteriors",
    contactInfo: "Comment thread · DM open",
    status: "New",
    createdAt: "12 min ago",
    facebookUrl: "https://facebook.com/groups/pdxhomeowners/posts/8841",
  },
  {
    id: "l2",
    author: "Dana Reyes",
    authorAvatar: "DR",
    groupName: "Austin Small Business Owners",
    content:
      "Our bakery's website is stuck in 2015 and doesn't work on phones. Looking to hire someone local to rebuild it with online ordering. Budget is flexible for the right person.",
    images: 0,
    score: 8,
    confidence: 0.88,
    service: "Website Development",
    location: "Austin, TX",
    urgency: "Medium",
    summary:
      "Bakery owner wants a mobile-friendly website rebuild with online ordering; flexible budget.",
    recommendedResponse:
      "Hi Dana! We build fast, mobile-first sites with integrated online ordering for local food businesses. I'd love to show you a couple of bakery examples and talk through what online ordering could look like for you.",
    matchedProfile: "Web Agency",
    contactInfo: "Public comment",
    status: "Reviewed",
    createdAt: "48 min ago",
    facebookUrl: "https://facebook.com/groups/atxsmallbiz/posts/5522",
  },
  {
    id: "l3",
    author: "Priya Anand",
    authorAvatar: "PA",
    groupName: "Dallas–Fort Worth Weddings",
    content:
      "Getting married next April in Fort Worth and still searching for a photographer! Want someone with a natural, candid style. Recommendations welcome 🙏",
    images: 1,
    score: 9,
    confidence: 0.91,
    service: "Wedding Photography",
    location: "Fort Worth, TX",
    urgency: "Medium",
    summary:
      "Bride seeking a candid-style wedding photographer for an April Fort Worth wedding.",
    recommendedResponse:
      "Congratulations Priya! Candid, documentary-style coverage is exactly what we specialize in. I'd love to share a full April wedding gallery and check if your date is open — when works for a quick call?",
    matchedProfile: "Event Photography",
    contactInfo: "DM requested",
    status: "Contacted",
    createdAt: "1 hour ago",
    facebookUrl: "https://facebook.com/groups/dfwweddings/posts/9012",
  },
  {
    id: "l4",
    author: "Greg Salter",
    authorAvatar: "GS",
    groupName: "Seattle Contractors & Home Services",
    content:
      "We just opened a second office in Bellevue and need a reliable cleaning crew twice a week. Anyone offer recurring commercial cleaning?",
    images: 0,
    score: 7,
    confidence: 0.82,
    service: "Commercial Cleaning",
    location: "Bellevue, WA",
    urgency: "Medium",
    summary:
      "Business owner needs a recurring (2x/week) commercial cleaning crew for a new Bellevue office.",
    recommendedResponse:
      "Hi Greg — congrats on the new office! We provide recurring commercial cleaning across the Eastside and can tailor a twice-weekly plan. Can I send over a quick quote based on your square footage?",
    matchedProfile: "Commercial Cleaning",
    contactInfo: "Public comment",
    status: "New",
    createdAt: "2 hours ago",
    facebookUrl: "https://facebook.com/groups/seattlecontractors/posts/7781",
  },
  {
    id: "l5",
    author: "Tanya Brooks",
    authorAvatar: "TB",
    groupName: "Austin Small Business Owners",
    content:
      "Need a new logo and landing page for my coaching business launching next month. Who do you recommend?",
    images: 0,
    score: 6,
    confidence: 0.71,
    service: "Landing Page",
    location: "Austin, TX",
    urgency: "Low",
    summary:
      "Coach launching a business wants a logo and landing page within a month.",
    recommendedResponse:
      "Hi Tanya — exciting launch! We design conversion-focused landing pages and can pair you with a brand designer for the logo. Want to see a few coaching-niche examples?",
    matchedProfile: "Web Agency",
    contactInfo: "Public comment",
    status: "Converted",
    createdAt: "5 hours ago",
    facebookUrl: "https://facebook.com/groups/atxsmallbiz/posts/5498",
  },
  {
    id: "l6",
    author: "Leo Marchetti",
    authorAvatar: "LM",
    groupName: "Tacoma Buy / Sell / Services",
    content:
      "Selling a barely-used pressure washer, $120 OBO. Also anyone know a good taco spot downtown?",
    images: 3,
    score: 2,
    confidence: 0.34,
    service: "None",
    location: "Tacoma, WA",
    urgency: "Low",
    summary:
      "Personal for-sale post with no service request — low lead relevance.",
    recommendedResponse: "—",
    matchedProfile: "Unmatched",
    contactInfo: "n/a",
    status: "Ignored",
    createdAt: "6 hours ago",
    facebookUrl: "https://facebook.com/groups/tacomaservices/posts/3310",
  },
  {
    id: "l7",
    author: "Sofia Nguyen",
    authorAvatar: "SN",
    groupName: "Portland Homeowners Network",
    content:
      "Our gutters are overflowing every time it rains and part of the fascia is rotting. Need a full gutter replacement + inspection ASAP in Beaverton.",
    images: 1,
    score: 8,
    confidence: 0.86,
    service: "Gutters",
    location: "Beaverton, OR",
    urgency: "High",
    summary:
      "Homeowner needs urgent gutter replacement and fascia inspection in Beaverton.",
    recommendedResponse:
      "Hi Sofia — overflowing gutters plus fascia rot should be looked at quickly before it spreads. We can inspect and quote a full replacement this week. What's your address so we can confirm we cover Beaverton?",
    matchedProfile: "Roofing & Exteriors",
    contactInfo: "DM open",
    status: "New",
    createdAt: "7 hours ago",
    facebookUrl: "https://facebook.com/groups/pdxhomeowners/posts/8802",
  },
]

export const workers: WorkerInfo[] = [
  {
    id: "w1",
    name: "Collection Worker",
    role: "Facebook Graph polling",
    state: "healthy",
    lastPoll: "just now",
    avgProcessingMs: 340,
    processedToday: 4210,
  },
  {
    id: "w2",
    name: "AI Processing Worker",
    role: "LLM classification",
    state: "healthy",
    lastPoll: "12s ago",
    avgProcessingMs: 1180,
    processedToday: 4015,
  },
  {
    id: "w3",
    name: "Notification Worker",
    role: "Discord webhook delivery",
    state: "degraded",
    lastPoll: "1m ago",
    avgProcessingMs: 620,
    processedToday: 598,
  },
]

export const logs: LogEntry[] = [
  { id: "log1", time: "14:32:07", level: "info", worker: "collection", message: "Scanned 'Seattle Contractors' — 12 new posts queued" },
  { id: "log2", time: "14:31:58", level: "info", worker: "ai", message: "Classified post 7781 → lead (score 7, Commercial Cleaning)" },
  { id: "log3", time: "14:31:40", level: "warn", worker: "notify", message: "Discord webhook 'roofing' returned 429 — retrying in 8s" },
  { id: "log4", time: "14:31:22", level: "info", worker: "ai", message: "Post 3310 marked not-a-lead (confidence 0.34)" },
  { id: "log5", time: "14:30:55", level: "error", worker: "collection", message: "Group 'Tacoma Services' scan failed — session token expired" },
  { id: "log6", time: "14:30:31", level: "info", worker: "notify", message: "Delivered lead 8841 to #roofing-leads" },
  { id: "log7", time: "14:30:04", level: "info", worker: "ai", message: "Batch of 24 posts processed in 1.2s avg" },
  { id: "log8", time: "14:29:47", level: "info", worker: "collection", message: "Scanned 'Austin Small Business' — 5 new posts queued" },
]

export function statusColor(status: LeadStatus): string {
  switch (status) {
    case "New":
      return "bg-primary/15 text-primary border-primary/25"
    case "Reviewed":
      return "bg-warning/15 text-warning border-warning/25"
    case "Contacted":
      return "bg-chart-4/15 text-chart-4 border-chart-4/25"
    case "Converted":
      return "bg-success/15 text-success border-success/25"
    case "Ignored":
      return "bg-muted text-muted-foreground border-border"
  }
}

export function urgencyColor(u: Urgency): string {
  switch (u) {
    case "High":
      return "bg-destructive/15 text-destructive border-destructive/25"
    case "Medium":
      return "bg-warning/15 text-warning border-warning/25"
    case "Low":
      return "bg-muted text-muted-foreground border-border"
  }
}

export function scoreColor(score: number): string {
  if (score >= 8) return "text-success"
  if (score >= 5) return "text-warning"
  return "text-muted-foreground"
}
