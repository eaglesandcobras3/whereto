import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import mjml2html from "mjml";

import { escapeHtml } from "@/lib/email/escape";

export type BusinessEmailTemplateId =
  | "business-request-received"
  | "business-request-approved"
  | "listing-live"
  | "listing-removed"
  | "simple-message"
  | "admin-alert";

/** Logical ids that render via shared MJML files. */
export type EmailTemplateId =
  | BusinessEmailTemplateId
  | "portal-invite"
  | "request-rejected"
  | "review-needs-changes"
  | "payment-success"
  | "payment-failed"
  | "subscription-upgraded";

const TEMPLATES_DIR = join(process.cwd(), "lib/email/templates");

/** Map logical template ids to MJML filenames (without extension). */
const TEMPLATE_FILE: Record<EmailTemplateId, string> = {
  "business-request-received": "business-request-received",
  "business-request-approved": "business-request-approved",
  "listing-live": "listing-live",
  "listing-removed": "listing-removed",
  "simple-message": "simple-message",
  "admin-alert": "admin-alert",
  "portal-invite": "simple-message",
  "request-rejected": "simple-message",
  "review-needs-changes": "simple-message",
  "payment-success": "simple-message",
  "payment-failed": "simple-message",
  "subscription-upgraded": "simple-message",
};

const INCLUDE_RE = /<mj-include\s+path=["']([^"']+)["']\s*\/>/g;

/**
 * Expand `<mj-include path="..." />` before `{{var}}` interpolation so partials
 * can use the same placeholders as top-level templates.
 */
export function expandMjmlIncludes(
  source: string,
  baseDir: string,
  stack: string[] = [],
): string {
  return source.replace(INCLUDE_RE, (_match, relPath: string) => {
    const absPath = resolve(baseDir, relPath);
    if (stack.includes(absPath)) {
      throw new Error(`Circular mj-include: ${[...stack, absPath].join(" → ")}`);
    }
    const partial = readFileSync(absPath, "utf8");
    return expandMjmlIncludes(partial, dirname(absPath), [...stack, absPath]);
  });
}

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
  templateId: EmailTemplateId,
  vars: Record<string, string>,
  opts?: { rawKeys?: ReadonlySet<string> },
): Promise<string> {
  const fileStem = TEMPLATE_FILE[templateId];
  const filePath = join(TEMPLATES_DIR, `${fileStem}.mjml`);
  const source = readFileSync(filePath, "utf8");
  const expanded = expandMjmlIncludes(source, dirname(filePath));
  const mjml = interpolateTemplate(expanded, vars, opts);

  const { html, errors } = await mjml2html(mjml, {
    filePath,
    validationLevel: "soft",
    minify: true,
    ignoreIncludes: true,
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
