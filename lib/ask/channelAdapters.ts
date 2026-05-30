import type { AskArtifact, AskEngineResult } from "@/lib/ask/types";

const SMS_MAX_RESULTS = 3;

export function formatForWeb(result: AskEngineResult): AskEngineResult {
  return result;
}

export function formatForSms(result: AskEngineResult): { text: string } {
  const lines: string[] = [result.message.trim()];

  if (result.artifact?.type === "business_results") {
    const top = result.artifact.results.slice(0, SMS_MAX_RESULTS);
    if (top.length) {
      lines.push("");
      top.forEach((r, i) => {
        lines.push(`${i + 1}. ${r.title}`);
      });
    }
    if (result.followUps?.length) {
      lines.push("");
      lines.push(result.followUps.slice(0, 2).join(" "));
    }
  } else if (result.artifact?.type === "guide_results") {
    const top = result.artifact.results.slice(0, SMS_MAX_RESULTS);
    top.forEach((g, i) => lines.push(`${i + 1}. ${g.title}`));
  } else if (result.artifact?.type === "town_results") {
    const top = result.artifact.results.slice(0, SMS_MAX_RESULTS);
    top.forEach((t, i) => lines.push(`${i + 1}. ${t.title}`));
  } else if (result.artifact?.type === "area_results") {
    const top = result.artifact.results.slice(0, SMS_MAX_RESULTS);
    top.forEach((a, i) => lines.push(`${i + 1}. ${a.title}`));
  }

  if (result.shareableArtifactSummary) {
    lines.push("");
    lines.push(result.shareableArtifactSummary.slice(0, 320));
  }

  let text = lines.join("\n").trim();
  if (text.length > 1500) text = `${text.slice(0, 1497)}…`;
  return { text };
}

export function compressArtifactForChannel(
  artifact: AskArtifact | undefined,
  channel: "web" | "sms" | "mobile",
): AskArtifact | undefined {
  if (!artifact || channel === "web") return artifact;
  if (artifact.type === "business_results") {
    return {
      ...artifact,
      results: artifact.results.slice(0, SMS_MAX_RESULTS),
    };
  }
  if (artifact.type === "guide_results") {
    return {
      ...artifact,
      results: artifact.results.slice(0, SMS_MAX_RESULTS),
    };
  }
  if (artifact.type === "town_results") {
    return {
      ...artifact,
      results: artifact.results.slice(0, SMS_MAX_RESULTS),
    };
  }
  if (artifact.type === "area_results") {
    return {
      ...artifact,
      results: artifact.results.slice(0, SMS_MAX_RESULTS),
    };
  }
  return artifact;
}
