export function isAllowedAdminRequest({
  mutation,
  secFetchSite,
  origin,
  appUrl,
}: {
  mutation: boolean;
  secFetchSite: string | null;
  origin: string | null;
  appUrl: string;
}): boolean {
  if (!mutation) return true;

  return secFetchSite !== "cross-site" && origin === new URL(appUrl).origin;
}
