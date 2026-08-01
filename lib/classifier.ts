import "server-only"

export type ClassifierModel = {
  version: 1
  type: "multinomial-naive-bayes"
  labels: {
    lead: { logPrior: number; tokenLogProb: Record<string, number> }
    not_lead: { logPrior: number; tokenLogProb: Record<string, number> }
  }
}

export function tokenize(value: string) {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.map(stem).filter((token) => token.length > 1) ?? []
}

function stem(token: string) {
  return token.replace(/(ingly|edly|ing|ed|ies|es|s)$/u, "").replace(/i$/u, "y")
}

export function parseClassifierModel(value: unknown): ClassifierModel | null {
  if (!value || typeof value !== "object") return null
  const model = value as Partial<ClassifierModel>
  if (model.version !== 1 || model.type !== "multinomial-naive-bayes" || !model.labels?.lead || !model.labels.not_lead) return null
  if (!Number.isFinite(model.labels.lead.logPrior) || !Number.isFinite(model.labels.not_lead.logPrior)) return null
  if (typeof model.labels.lead.tokenLogProb !== "object" || typeof model.labels.not_lead.tokenLogProb !== "object") return null
  return model as ClassifierModel
}

export function classifyText(text: string, model: ClassifierModel) {
  let leadScore = model.labels.lead.logPrior
  let notLeadScore = model.labels.not_lead.logPrior
  for (const token of tokenize(text)) {
    leadScore += model.labels.lead.tokenLogProb[token] ?? 0
    notLeadScore += model.labels.not_lead.tokenLogProb[token] ?? 0
  }
  const probability = 1 / (1 + Math.exp(notLeadScore - leadScore))
  return { isLead: probability >= 0.6, confidence: probability }
}