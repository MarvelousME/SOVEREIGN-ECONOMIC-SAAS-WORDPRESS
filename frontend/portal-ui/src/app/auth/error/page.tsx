import Link from 'next/link';

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const code = searchParams.error ?? 'unknown';
  const detail =
    code === 'OAuthSignin' || code === 'OAuthCallback'
      ? 'OAuth failed—usually Keycloak is not running, KEYCLOAK_ISSUER is wrong, or KEYCLOAK_CLIENT_SECRET does not match your Keycloak client. Start Keycloak and align .env.local with your realm.'
      : code === 'Configuration'
        ? 'OAuth is not configured. Set NEXTAUTH_URL, NEXTAUTH_SECRET, and KEYCLOAK_* in .env.local.'
        : `Error: ${code}`;
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Sign-in error</h1>
      <p className="max-w-md text-center text-muted-foreground">{detail}</p>
      <Link href="/auth/login" className="text-primary underline">
        Back to login
      </Link>
    </div>
  );
}
