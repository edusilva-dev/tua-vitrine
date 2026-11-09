const LOOPBACK_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"] as const;

export function getTrustedOrigins(appUrl: string, additionalOrigins: string[] = []): string[] {
  const url = new URL(appUrl);

  if (!LOOPBACK_HOSTNAMES.includes(url.hostname as (typeof LOOPBACK_HOSTNAMES)[number])) {
    return Array.from(
      new Set([url.origin, ...additionalOrigins.map((origin) => new URL(origin).origin)])
    );
  }

  const port = url.port ? `:${url.port}` : "";

  return LOOPBACK_HOSTNAMES.map((hostname) => `${url.protocol}//${hostname}${port}`);
}

export function isAllowedAdminRequest({
  mutation,
  secFetchSite,
  origin,
  appUrl,
  additionalOrigins = [],
}: {
  mutation: boolean;
  secFetchSite: string | null;
  origin: string | null;
  appUrl: string;
  additionalOrigins?: string[];
}): boolean {
  if (!mutation) return true;

  return (
    secFetchSite !== "cross-site" &&
    origin !== null &&
    getTrustedOrigins(appUrl, additionalOrigins).includes(origin)
  );
}
