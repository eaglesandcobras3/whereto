/** MJML 5 returns a Promise; @types/mjml still describes the v4 sync API. */
declare module "mjml" {
  type MjmlError = {
    line?: number;
    message: string;
    tagName?: string;
    formattedMessage?: string;
  };

  type MjmlResult = {
    html: string;
    errors: MjmlError[];
    json?: unknown;
  };

  type MjmlOptions = {
    beautify?: boolean;
    filePath?: string;
    fonts?: Record<string, string>;
    ignoreIncludes?: boolean;
    includePath?: string | string[];
    keepComments?: boolean;
    minify?: boolean;
    minifyOptions?: Record<string, unknown>;
    validationLevel?: "strict" | "soft" | "skip";
    preprocessors?: Array<(xml: string) => string>;
  };

  export default function mjml2html(
    input: string,
    options?: MjmlOptions,
  ): Promise<MjmlResult>;
}
