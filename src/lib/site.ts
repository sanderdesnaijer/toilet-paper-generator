const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): URL {
  const envCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of envCandidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    // Vercel-provided hostnames often omit the scheme.
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    try {
      return new URL(withProtocol);
    } catch {
      continue;
    }
  }

  return new URL(FALLBACK_SITE_URL);
}

