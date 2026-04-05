/**
 * Optional IdP / SSO entry URL (e.g. Keycloak realm login or OAuth authorize URL).
 * When unset, SSO UI is shown but explains configuration is required.
 */
export function getSsoLoginUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_SSO_LOGIN_URL;
  return typeof u === 'string' && u.trim().length > 0 ? u.trim() : null;
}
