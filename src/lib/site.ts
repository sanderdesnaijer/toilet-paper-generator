const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): URL {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return new URL(FALLBACK_SITE_URL);
  }

  try {
    return new URL(siteUrl);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

