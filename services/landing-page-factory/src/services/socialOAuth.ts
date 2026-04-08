import crypto from 'crypto';
import { SocialProvider } from '../models/social.model';
import { sha256Hex } from './crypto';
import { RateLimitError, TokenExpiredError, OAuthError } from '../errors';

export interface OAuthStartResult {
  state: string;
  codeVerifier?: string;
  authUrl: string;
  redirectUri: string;
  scope: string[];
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface OAuthProfileResult {
  accountRef: string;
  displayName?: string;
  metadata?: Record<string, unknown>;
}

function envOrThrow(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function buildRedirectUri(provider: SocialProvider): string {
  const base = envOrThrow('SOCIAL_OAUTH_REDIRECT_BASE_URL').replace(/\/$/, '');
  return `${base}/api/v1/social/oauth/${provider}/callback`;
}

function randomHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function pkceChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

function checkResponseStatus(provider: SocialProvider, resp: Response): void {
  if (resp.status === 429) {
    const retryAfter = resp.headers.get('Retry-After');
    throw new RateLimitError(
      provider,
      `${provider} API rate limit exceeded. Retry after some time.`,
      retryAfter ? parseInt(retryAfter, 10) : undefined
    );
  }
  if (resp.status >= 500) {
    throw new OAuthError(provider, 'SERVER_ERROR', `${provider} API server error: ${resp.status}`);
  }
}

export class SocialOAuthService {
  start(provider: SocialProvider, tenantId: string): OAuthStartResult {
    const state = `${tenantId}:${randomHex(24)}`;

    if (provider === 'x') {
      const clientId = envOrThrow('X_CLIENT_ID');
      const redirectUri = buildRedirectUri('x');
      const codeVerifier = randomHex(48);
      const challenge = pkceChallenge(codeVerifier);
      const scope = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope.join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      return {
        state,
        codeVerifier,
        authUrl: `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
        redirectUri,
        scope,
      };
    }

    if (provider === 'linkedin') {
      const clientId = envOrThrow('LINKEDIN_CLIENT_ID');
      const redirectUri = buildRedirectUri('linkedin');
      const scope = ['openid', 'profile', 'w_member_social'];
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope.join(' '),
        state,
      });
      return {
        state,
        authUrl: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
        redirectUri,
        scope,
      };
    }

    if (provider === 'facebook') {
      const clientId = envOrThrow('META_APP_ID');
      const redirectUri = buildRedirectUri('facebook');
      const scope = ['pages_manage_posts', 'pages_read_engagement'];
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope.join(','),
        state,
      });
      return {
        state,
        authUrl: `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`,
        redirectUri,
        scope,
      };
    }

    if (provider === 'instagram') {
      const clientId = envOrThrow('META_APP_ID');
      const redirectUri = buildRedirectUri('instagram');
      const scope = ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'];
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope.join(','),
        state,
      });
      return {
        state,
        authUrl: `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`,
        redirectUri,
        scope,
      };
    }

    if (provider === 'tiktok') {
      const clientKey = envOrThrow('TIKTOK_CLIENT_KEY');
      const redirectUri = buildRedirectUri('tiktok');
      const scope = ['user.info.basic', 'video.publish'];
      const params = new URLSearchParams({
        client_key: clientKey,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scope.join(','),
        state,
      });
      return {
        state,
        authUrl: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
        redirectUri,
        scope,
      };
    }

    if (provider === 'youtube') {
      const clientId = envOrThrow('YOUTUBE_CLIENT_ID');
      const redirectUri = buildRedirectUri('youtube');
      const codeVerifier = randomHex(48);
      const challenge = pkceChallenge(codeVerifier);
      const scope = [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl',
      ];
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope.join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent',
      });
      return {
        state,
        codeVerifier,
        authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        redirectUri,
        scope,
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  static stateHash(state: string): string {
    return sha256Hex(state);
  }

  static codeVerifierHash(codeVerifier: string): string {
    return sha256Hex(codeVerifier);
  }

  async exchangeCodeForTokens(
    provider: SocialProvider,
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<OAuthTokenResult> {
    if (provider === 'x') {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: envOrThrow('X_CLIENT_ID'),
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || '',
      });
      const resp = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) throw new Error(`X token exchange failed: ${resp.status}`);
      const json = (await resp.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      };
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
        scope: json.scope,
      };
    }

    if (provider === 'linkedin') {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: envOrThrow('LINKEDIN_CLIENT_ID'),
        client_secret: envOrThrow('LINKEDIN_CLIENT_SECRET'),
      });
      const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) throw new Error(`LinkedIn token exchange failed: ${resp.status}`);
      const json = (await resp.json()) as { access_token: string; expires_in?: number };
      return {
        accessToken: json.access_token,
        expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
      };
    }

    if (provider === 'facebook') {
      const params = new URLSearchParams({
        client_id: envOrThrow('META_APP_ID'),
        client_secret: envOrThrow('META_APP_SECRET'),
        redirect_uri: redirectUri,
        code,
      });
      const resp = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${params.toString()}`);
      checkResponseStatus(provider, resp);
      if (!resp.ok) throw new Error(`Facebook token exchange failed: ${resp.status}`);
      const json = (await resp.json()) as { access_token: string; expires_in?: number };
      return {
        accessToken: json.access_token,
        expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
      };
    }

    if (provider === 'instagram') {
      const params = new URLSearchParams({
        client_id: envOrThrow('META_APP_ID'),
        client_secret: envOrThrow('META_APP_SECRET'),
        redirect_uri: redirectUri,
        code,
      });
      const resp = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${params.toString()}`);
      checkResponseStatus(provider, resp);
      if (!resp.ok) throw new Error(`Instagram token exchange failed: ${resp.status}`);
      const json = (await resp.json()) as { access_token: string; expires_in?: number };
      return {
        accessToken: json.access_token,
        expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
      };
    }

    if (provider === 'tiktok') {
      const body = new URLSearchParams({
        client_key: envOrThrow('TIKTOK_CLIENT_KEY'),
        client_secret: envOrThrow('TIKTOK_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      const resp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) throw new Error(`TikTok token exchange failed: ${resp.status}`);
      const json = (await resp.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (!json.access_token) throw new Error('TikTok token exchange missing access token');
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
      };
    }

    if (provider === 'youtube') {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: envOrThrow('YOUTUBE_CLIENT_ID'),
        client_secret: envOrThrow('YOUTUBE_CLIENT_SECRET'),
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || '',
      });
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) throw new Error(`YouTube token exchange failed: ${resp.status}`);
      const json = (await resp.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
      };
    }

    throw new Error(`Token exchange not implemented for provider: ${provider}`);
  }

  async refreshAccessToken(provider: SocialProvider, refreshToken: string): Promise<OAuthTokenResult> {
    if (provider === 'youtube') {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: envOrThrow('YOUTUBE_CLIENT_ID'),
        client_secret: envOrThrow('YOUTUBE_CLIENT_SECRET'),
        refresh_token: refreshToken,
      });
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) {
        if (resp.status === 401) {
          throw new TokenExpiredError(provider);
        }
        throw new Error(`YouTube token refresh failed: ${resp.status}`);
      }
      const json = (await resp.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token || refreshToken,
        expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
      };
    }

    if (provider === 'tiktok') {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_key: envOrThrow('TIKTOK_CLIENT_KEY'),
        client_secret: envOrThrow('TIKTOK_CLIENT_SECRET'),
        refresh_token: refreshToken,
      });
      const resp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) {
        if (resp.status === 401) {
          throw new TokenExpiredError(provider);
        }
        throw new Error(`TikTok token refresh failed: ${resp.status}`);
      }
      const json = (await resp.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (!json.access_token) throw new Error('TikTok token refresh missing access token');
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token || refreshToken,
        expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
      };
    }

    throw new Error(`Refresh not implemented for provider: ${provider}`);
  }

  async resolveProfile(provider: SocialProvider, accessToken: string): Promise<OAuthProfileResult> {
    if (provider === 'x') {
      const resp = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) {
        if (resp.status === 401) throw new TokenExpiredError(provider);
        throw new Error(`X profile fetch failed: ${resp.status}`);
      }
      const json = (await resp.json()) as { data?: { id: string; username?: string; name?: string } };
      const id = json.data?.id;
      if (!id) throw new Error('X profile missing id');
      return {
        accountRef: id,
        displayName: json.data?.name || json.data?.username,
        metadata: { username: json.data?.username },
      };
    }

    if (provider === 'linkedin') {
      const resp = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) {
        if (resp.status === 401) throw new TokenExpiredError(provider);
        throw new Error(`LinkedIn profile fetch failed: ${resp.status}`);
      }
      const json = (await resp.json()) as { sub?: string; name?: string; email?: string };
      if (!json.sub) throw new Error('LinkedIn profile missing sub');
      return {
        accountRef: json.sub,
        displayName: json.name,
        metadata: { email: json.email },
      };
    }

    if (provider === 'facebook') {
      const meResp = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(accessToken)}`
      );
      checkResponseStatus(provider, meResp);
      if (!meResp.ok) {
        if (meResp.status === 401) throw new TokenExpiredError(provider);
        throw new Error(`Facebook pages fetch failed: ${meResp.status}`);
      }
      const pages = (await meResp.json()) as {
        data?: Array<{ id: string; name?: string; access_token?: string }>;
      };
      const first = pages.data?.[0];
      if (!first?.id || !first.access_token) {
        throw new Error('Facebook requires at least one managed page');
      }
      return {
        accountRef: first.id,
        displayName: first.name,
        metadata: { pageAccessToken: first.access_token },
      };
    }

    if (provider === 'instagram') {
      const meResp = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?access_token=${encodeURIComponent(accessToken)}`
      );
      checkResponseStatus(provider, meResp);
      if (!meResp.ok) {
        if (meResp.status === 401) throw new TokenExpiredError(provider);
        throw new Error(`Instagram pages fetch failed: ${meResp.status}`);
      }
      const pages = (await meResp.json()) as {
        data?: Array<{ id: string; name?: string; access_token?: string }>;
      };
      const first = pages.data?.[0];
      if (!first?.id || !first.access_token) {
        throw new Error('Instagram requires at least one managed page');
      }

      const pageId = first.id;
      const pageAccessToken = first.access_token;
      const igResp = await fetch(
        `https://graph.facebook.com/v20.0/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(pageAccessToken)}`
      );
      checkResponseStatus(provider, igResp);
      if (!igResp.ok) throw new Error(`Instagram business account fetch failed: ${igResp.status}`);
      const igData = (await igResp.json()) as { instagram_business_account?: { id: string } };
      const igAccountId = igData.instagram_business_account?.id;
      if (!igAccountId) {
        throw new Error('Page does not have an associated Instagram business account');
      }

      const profileResp = await fetch(
        `https://graph.facebook.com/v20.0/${igAccountId}?fields=id,name,username&access_token=${encodeURIComponent(pageAccessToken)}`
      );
      checkResponseStatus(provider, profileResp);
      if (!profileResp.ok) throw new Error(`Instagram profile fetch failed: ${profileResp.status}`);
      const profile = (await profileResp.json()) as { id: string; name?: string; username?: string };

      return {
        accountRef: profile.id,
        displayName: profile.name,
        metadata: { username: profile.username },
      };
    }

    if (provider === 'tiktok') {
      const resp = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) {
        if (resp.status === 401) throw new TokenExpiredError(provider);
        throw new Error(`TikTok profile fetch failed: ${resp.status}`);
      }
      const json = (await resp.json()) as {
        data?: { user?: { open_id?: string; display_name?: string } };
      };
      const openId = json.data?.user?.open_id;
      if (!openId) throw new Error('TikTok profile missing open_id');
      return {
        accountRef: openId,
        displayName: json.data?.user?.display_name,
      };
    }

    if (provider === 'youtube') {
      const resp = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      checkResponseStatus(provider, resp);
      if (!resp.ok) {
        if (resp.status === 401) throw new TokenExpiredError(provider);
        throw new Error(`YouTube profile fetch failed: ${resp.status}`);
      }
      const json = (await resp.json()) as {
        items?: Array<{ id?: string; snippet?: { title?: string } }>;
      };
      const channelId = json.items?.[0]?.id;
      if (!channelId) throw new Error('YouTube profile missing channel id');
      return {
        accountRef: channelId,
        displayName: json.items?.[0]?.snippet?.title,
      };
    }

    throw new Error(`Profile fetch not implemented for provider: ${provider}`);
  }
}
