import { readFile, writeFile } from "node:fs/promises";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("Usage: node scripts/train-classifier.mjs dataset.json classifier.json");

const documents = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(documents) || !documents.every((item) => typeof item?.text === "string" && typeof item?.label === "boolean")) {
  throw new Error("Dataset must be [{ text: string, label: boolean }].");
}

const stem = (token) => token.toLowerCase().replace(/(ingly|edly|ing|ed|ies|es|s)$/u, "").replace(/i$/u, "y");
const tokens = (text) => text.match(/[\p{L}\p{N}]+/gu)?.map(stem).filter((token) => token.length > 1) ?? [];
const counts = { lead: new Map(), not_lead: new Map() };
const totals = { lead: 0, not_lead: 0 };
const docs = { lead: 0, not_lead: 0 };
for (const document of documents) {
  const label = document.label ? "lead" : "not_lead";
  docs[label] += 1;
  for (const token of tokens(document.text)) {
    counts[label].set(token, (counts[label].get(token) ?? 0) + 1);
    totals[label] += 1;
  }
}
const vocabulary = new Set([...counts.lead.keys(), ...counts.not_lead.keys()]);
const toLabel = (label) => ({
  logPrior: Math.log((docs[label] + 1) / (documents.length + 2)),
  tokenLogProb: Object.fromEntries([...vocabulary].map((token) => [token, Math.log(((counts[label].get(token) ?? 0) + 1) / (totals[label] + vocabulary.size))])),
});
await writeFile(outputPath, JSON.stringify({ version: 1, type: "multinomial-naive-bayes", labels: { lead: toLabel("lead"), not_lead: toLabel("not_lead") } }, null, 2));