export type GscConfig = {
  siteUrl: string;
  clientEmail: string;
  privateKey: string;
};

export function getGscConfig(): GscConfig | null {
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  const clientEmail = process.env.GSC_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!siteUrl || !clientEmail || !privateKeyRaw) return null;
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  return { siteUrl, clientEmail, privateKey };
}

export function isGscConfigured(): boolean {
  return getGscConfig() != null;
}
