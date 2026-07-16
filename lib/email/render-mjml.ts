import { readFileSync } from "node:fs";
import { join } from "node:path";

import mjml2html from "mjml";

import { escapeHtml } from "@/lib/email/escape";

export type BusinessEmailTemplateId =
  | "business-request-received"
  | "business-request-approved"
  | "listing-live";

const TEMPLATES_DIR = join(process.cwd(), "lib/email/templates");

/** Simple `{{key}}` replacement. Values are HTML-escaped unless marked safe. */
export function interpolateTemplate(
  source: string,
  vars: Record<string, string>,
  opts?: { rawKeys?: ReadonlySet<string> },
): string {
  return source.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value == null) return "";
    if (opts?.rawKeys?.has(key)) return value;
    return escapeHtml(value);
  });
}

export async function renderMjmlFile(
  templateId: BusinessEmailTemplateId,
  vars: Record<string, string>,
  opts?: { rawKeys?: ReadonlySet<string> },
): Promise<string> {
  const filePath = join(TEMPLATES_DIR, `${templateId}.mjml`);
  const source = readFileSync(filePath, "utf8");
  const mjml = interpolateTemplate(source, vars, opts);

  const { html, errors } = await mjml2html(mjml, {
    filePath,
    validationLevel: "soft",
    minify: true,
  });

  if (errors?.length) {
    const fatal = errors.filter((e) => e.tagName !== "mj-html-attributes");
    if (fatal.length) {
      console.error("[email-mjml]", templateId, fatal);
    }
  }

  if (!html?.trim()) {
    throw new Error(`MJML render produced empty HTML for ${templateId}`);
  }

  return html;
}
