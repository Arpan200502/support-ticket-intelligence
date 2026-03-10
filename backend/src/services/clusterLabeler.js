import { detectTrend } from "./trendDetector.js";

const STOP_WORDS = new Set([
  "the","is","a","an","and","or","to","of","for","in","on","with",
  "i","my","it","this","that","please","help","issue","problem",
  "having","have","im","ive","unable","cannot",
  "assist","device","product","support","error","using"
]);

function extractKeywords(text) {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

export function labelCluster(cluster) {

  const combinedText = cluster.tickets
    .map(t => t.text.toLowerCase())
    .join(" ");
  if (combinedText.includes("account") || combinedText.includes("password"))
    return "Account Access Issues";

  if (combinedText.includes("network") || combinedText.includes("wifi"))
    return "Network Connectivity Issues";

  if (combinedText.includes("battery") || combinedText.includes("charging"))
    return "Battery Problems";

  if (
    combinedText.includes("refund") ||
    combinedText.includes("return") ||
    combinedText.includes("money back")
  )
  return "Refund Requests";

  

  if (combinedText.includes("delivery") || combinedText.includes("shipment"))
    return "Delivery Problems";
  if (
  combinedText.includes("hardware") ||
  combinedText.includes("screen") ||
  combinedText.includes("display")
)
  return "Hardware Issues";

  if (combinedText.includes("software") || combinedText.includes("bug"))
    return "Software Bugs";

  if (combinedText.includes("data loss") || combinedText.includes("files"))
    return "Data Loss Issues";

  if (combinedText.includes("compatibility") || combinedText.includes("peripheral"))
    return "Device Compatibility Issues";

  if (combinedText.includes("setup") || combinedText.includes("installation"))
    return "Product Setup Issues";

  if (combinedText.includes("cancel"))
    return "Cancellation Requests";

  

  return "General Support Issue";
}

export function mergeIssues(labeledClusters) {

  const merged = {};

  for (const cluster of labeledClusters) {

    const issue = cluster.issue;

    if (!merged[issue]) {
      merged[issue] = {
        issue,
        mentions: 0,
        examples: [],
        tickets: []
      };
    }

    merged[issue].mentions += cluster.mentions;

    merged[issue].examples.push(...cluster.examples);

    merged[issue].tickets.push(...cluster.tickets);
  }

  return Object.values(merged).map(issue => ({
    issue: issue.issue,
    mentions: issue.mentions,
    examples: issue.examples.slice(0,3),
    tickets: issue.tickets
  }));
}
export function labelClusters(clusters) {

  const labeled = clusters.map(cluster => ({
    issue: labelCluster(cluster),
    mentions: cluster.count,
    examples: cluster.tickets.map(t => t.text).slice(0,3),
    tickets: cluster.tickets
  }));

  const merged = mergeIssues(labeled);

  return merged
    .sort((a,b) => b.mentions - a.mentions)
    .map(issue => ({
      issue: issue.issue,
      mentions: issue.mentions,
      examples: issue.examples,
      trend: detectTrend(issue)
    }));
}