import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SocialOAuthService, OAuthStartResult, OAuthTokenResult, OAuthProfileResult } from '../../src/services/socialOAuth';
import { SocialProvider } from '../../src/models/social.model';
import { RateLimitError, TokenExpiredError, OAuthError } from '../../src/errors';

const ALL_PROVIDERS: SocialProvider[] = ['x', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube'];

const REDIRECT_BASE = 'https://app.example.com';

const mockFetch = jest.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>();

(global as { fetch?: typeof fetch }).fetch = mockFetch;

function setEnvVars(): void {
  process.env.SOCIAL_OAUTH_REDIRECT_BASE_URL = REDIRECT_BASE;
  process.env.X_CLIENT_ID = 'x_client_id';
  process.env.X_CLIENT_SECRET = 'x_client_secret';
  process.env.LINKEDIN_CLIENT_ID = 'linkedin_client_id';
  process.env.LINKEDIN_CLIENT_SECRET = 'linkedin_client_secret';
  process.env.META_APP_ID = 'meta_app_id';
  process.env.META_APP_SECRET = 'meta_app_secret';
  process.env.TIKTOK_CLIENT_KEY = 'tiktok_client_key';
  process.env.TIKTOK_CLIENT_SECRET = 'tiktok_client_secret';
  process.env.YOUTUBE_CLIENT_ID = 'youtube_client_id';
  process.env.YOUTUBE_CLIENT_SECRET = 'youtube_client_secret';
}

function clearEnvVars(): void {
  delete process.env.SOCIAL_OAUTH_REDIRECT_BASE_URL;
  delete process.env.X_CLIENT_ID;
  delete process.env.X_CLIENT_SECRET;
  delete process.env.LINKEDIN_CLIENT_ID;
  delete process.env.LINKEDIN_CLIENT_SECRET;
  delete process.env.META_APP_ID;
  delete process.env.META_APP_SECRET;
  delete process.env.TIKTOK_CLIENT_KEY;
  delete process.env.TIKTOK_CLIENT_SECRET;
  delete process.env.YOUTUBE_CLIENT_ID;
  delete process.env.YOUTUBE_CLIENT_SECRET;
}

describe('SocialOAuthService', () => {
  let service: SocialOAuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    setEnvVars();
    service = new SocialOAuthService();
  });

  afterEach(() => {
    clearEnvVars();
  });

  describe('start()', () => {
    describe('X (Twitter)', () => {
      it('returns OAuthStartResult with codeVerifier for PKCE', () => {
        const result = service.start('x', 'tenant-1');
        expect(result.state).toMatch(/^tenant-1:[a-f0-9]{48}$/);
        expect(result.codeVerifier).toBeDefined();
        expect(result.codeVerifier).toHaveLength(96);
        expect(result.authUrl).toContain('https://twitter.com/i/oauth2/authorize');
        expect(result.authUrl).toContain('code_challenge_method=S256');
        expect(result.redirectUri).toBe(`${REDIRECT_BASE}/api/v1/social/oauth/x/callback`);
        expect(result.scope).toEqual(['tweet.read', 'tweet.write', 'users.read', 'offline.access']);
      });

      it('generates unique state values', () => {
        const result1 = service.start('x', 'tenant-1');
        const result2 = service.start('x', 'tenant-1');
        expect(result1.state).not.toBe(result2.state);
        expect(result1.codeVerifier).not.toBe(result2.codeVerifier);
      });
    });

    describe('LinkedIn', () => {
      it('returns OAuthStartResult without codeVerifier', () => {
        const result = service.start('linkedin', 'tenant-1');
        expect(result.state).toMatch(/^tenant-1:[a-f0-9]{48}$/);
        expect(result.codeVerifier).toBeUndefined();
        expect(result.authUrl).toContain('https://www.linkedin.com/oauth/v2/authorization');
        expect(result.scope).toEqual(['openid', 'profile', 'w_member_social']);
      });
    });

    describe('Facebook', () => {
      it('returns OAuthStartResult with page scopes', () => {
        const result = service.start('facebook', 'tenant-1');
        expect(result.state).toMatch(/^tenant-1:[a-f0-9]{48}$/);
        expect(result.authUrl).toContain('https://www.facebook.com/v20.0/dialog/oauth');
        expect(result.scope).toEqual(['pages_manage_posts', 'pages_read_engagement']);
      });
    });

    describe('Instagram', () => {
      it('returns OAuthStartResult with instagram scopes', () => {
        const result = service.start('instagram', 'tenant-1');
        expect(result.state).toMatch(/^tenant-1:[a-f0-9]{48}$/);
        expect(result.authUrl).toContain('https://www.facebook.com/v20.0/dialog/oauth');
        expect(result.scope).toEqual(['instagram_basic', 'instagram_content_publish', 'pages_read_engagement']);
      });
    });

    describe('TikTok', () => {
      it('returns OAuthStartResult with tiktok scopes', () => {
        const result = service.start('tiktok', 'tenant-1');
        expect(result.state).toMatch(/^tenant-1:[a-f0-9]{48}$/);
        expect(result.codeVerifier).toBeUndefined();
        expect(result.authUrl).toContain('https://www.tiktok.com/v2/auth/authorize/');
        expect(result.scope).toEqual(['user.info.basic', 'video.publish']);
      });
    });

    describe('YouTube', () => {
      it('returns OAuthStartResult with codeVerifier for PKCE', () => {
        const result = service.start('youtube', 'tenant-1');
        expect(result.state).toMatch(/^tenant-1:[a-f0-9]{48}$/);
        expect(result.codeVerifier).toBeDefined();
        expect(result.codeVerifier).toHaveLength(96);
        expect(result.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
        expect(result.authUrl).toContain('code_challenge_method=S256');
        expect(result.authUrl).toContain('access_type=offline');
        expect(result.authUrl).toContain('prompt=consent');
        expect(result.scope).toEqual([
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.force-ssl',
        ]);
      });
    });

    it('throws for all supported providers without error', () => {
      expect(() => service.start('x', 'tenant-1')).not.toThrow();
      expect(() => service.start('linkedin', 'tenant-1')).not.toThrow();
      expect(() => service.start('facebook', 'tenant-1')).not.toThrow();
      expect(() => service.start('instagram', 'tenant-1')).not.toThrow();
      expect(() => service.start('tiktok', 'tenant-1')).not.toThrow();
      expect(() => service.start('youtube', 'tenant-1')).not.toThrow();
    });

    it('throws when required env var is missing', () => {
      delete process.env.X_CLIENT_ID;
      expect(() => service.start('x', 'tenant-1')).toThrow('X_CLIENT_ID is required');
    });
  });

  describe('static stateHash()', () => {
    it('returns consistent SHA-256 hex hash', () => {
      const state = 'tenant-1:abc123';
      const hash1 = SocialOAuthService.stateHash(state);
      const hash2 = SocialOAuthService.stateHash(state);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns different hashes for different states', () => {
      const hash1 = SocialOAuthService.stateHash('state-1');
      const hash2 = SocialOAuthService.stateHash('state-2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('static codeVerifierHash()', () => {
    it('returns consistent SHA-256 hex hash', () => {
      const verifier = 'random-verifier-string';
      const hash1 = SocialOAuthService.codeVerifierHash(verifier);
      const hash2 = SocialOAuthService.codeVerifierHash(verifier);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('returns different hashes for different verifiers', () => {
      const hash1 = SocialOAuthService.codeVerifierHash('verifier-1');
      const hash2 = SocialOAuthService.codeVerifierHash('verifier-2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('exchangeCodeForTokens()', () => {
    const redirectUri = `${REDIRECT_BASE}/api/v1/social/oauth/x/callback`;
    const code = 'auth-code-123';

    describe('X', () => {
      it('exchanges code for tokens successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'x_access_token',
            refresh_token: 'x_refresh_token',
            expires_in: 7200,
            scope: 'tweet.read users.read',
          }),
        } as unknown as Response);

        const result = await service.exchangeCodeForTokens('x', code, redirectUri, 'code_verifier');

        expect(result.accessToken).toBe('x_access_token');
        expect(result.refreshToken).toBe('x_refresh_token');
        expect(result.expiresAt).toBeInstanceOf(Date);
        expect(result.scope).toBe('tweet.read users.read');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.twitter.com/2/oauth2/token',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('handles missing optional fields', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'x_access_token_only',
          }),
        } as unknown as Response);

        const result = await service.exchangeCodeForTokens('x', code, redirectUri);

        expect(result.accessToken).toBe('x_access_token_only');
        expect(result.refreshToken).toBeUndefined();
        expect(result.expiresAt).toBeUndefined();
      });
    });

    describe('LinkedIn', () => {
      it('exchanges code for access token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'linkedin_access_token',
            expires_in: 3600,
          }),
        } as unknown as Response);

        const result = await service.exchangeCodeForTokens('linkedin', code, redirectUri);

        expect(result.accessToken).toBe('linkedin_access_token');
        expect(result.refreshToken).toBeUndefined();
        expect(result.expiresAt).toBeInstanceOf(Date);
      });
    });

    describe('Facebook', () => {
      it('exchanges code for page access token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'facebook_page_token',
            expires_in: 5100,
          }),
        } as unknown as Response);

        const result = await service.exchangeCodeForTokens('facebook', code, redirectUri);

        expect(result.accessToken).toBe('facebook_page_token');
        expect(result.expiresAt).toBeInstanceOf(Date);
      });
    });

    describe('Instagram', () => {
      it('exchanges code for access token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'instagram_access_token',
            expires_in: 5100,
          }),
        } as unknown as Response);

        const result = await service.exchangeCodeForTokens('instagram', code, redirectUri);

        expect(result.accessToken).toBe('instagram_access_token');
      });
    });

    describe('TikTok', () => {
      it('exchanges code for tokens with refresh token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'tiktok_access_token',
            refresh_token: 'tiktok_refresh_token',
            expires_in: 7200,
          }),
        } as unknown as Response);

        const result = await service.exchangeCodeForTokens('tiktok', code, redirectUri);

        expect(result.accessToken).toBe('tiktok_access_token');
        expect(result.refreshToken).toBe('tiktok_refresh_token');
        expect(result.expiresAt).toBeInstanceOf(Date);
      });

      it('throws when access_token is missing in response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            refresh_token: 'tiktok_refresh_token',
          }),
        } as unknown as Response);

        await expect(service.exchangeCodeForTokens('tiktok', code, redirectUri)).rejects.toThrow(
          'TikTok token exchange missing access token'
        );
      });
    });

    describe('YouTube', () => {
      it('exchanges code for tokens with refresh token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'youtube_access_token',
            refresh_token: 'youtube_refresh_token',
            expires_in: 3600,
          }),
        } as unknown as Response);

        const result = await service.exchangeCodeForTokens('youtube', code, redirectUri, 'code_verifier');

        expect(result.accessToken).toBe('youtube_access_token');
        expect(result.refreshToken).toBe('youtube_refresh_token');
        expect(result.expiresAt).toBeInstanceOf(Date);
      });
    });

    it('throws for unsupported provider', async () => {
      await expect(service.exchangeCodeForTokens('x' as SocialProvider, code, redirectUri)).rejects.toThrow();
    });
  });

  describe('resolveProfile()', () => {
    const accessToken = 'test_access_token';

    describe('X', () => {
      it('resolves user profile successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              id: '1234567890',
              name: 'John Doe',
              username: 'johndoe',
            },
          }),
        } as unknown as Response);

        const result = await service.resolveProfile('x', accessToken);

        expect(result.accountRef).toBe('1234567890');
        expect(result.displayName).toBe('John Doe');
        expect(result.metadata).toEqual({ username: 'johndoe' });
      });

      it('uses username as displayName when name is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              id: '1234567890',
              username: 'johndoe',
            },
          }),
        } as unknown as Response);

        const result = await service.resolveProfile('x', accessToken);

        expect(result.displayName).toBe('johndoe');
      });

      it('throws when id is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              name: 'John Doe',
            },
          }),
        } as unknown as Response);

        await expect(service.resolveProfile('x', accessToken)).rejects.toThrow('X profile missing id');
      });
    });

    describe('LinkedIn', () => {
      it('resolves user profile successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            sub: 'linkedin-user-id',
            name: 'Jane Smith',
            email: 'jane@example.com',
          }),
        } as unknown as Response);

        const result = await service.resolveProfile('linkedin', accessToken);

        expect(result.accountRef).toBe('linkedin-user-id');
        expect(result.displayName).toBe('Jane Smith');
        expect(result.metadata).toEqual({ email: 'jane@example.com' });
      });

      it('throws when sub is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            name: 'Jane Smith',
          }),
        } as unknown as Response);

        await expect(service.resolveProfile('linkedin', accessToken)).rejects.toThrow(
          'LinkedIn profile missing sub'
        );
      });
    });

    describe('Facebook', () => {
      it('resolves page profile successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: 'fb-page-id',
                name: 'My Facebook Page',
                access_token: 'fb_page_access_token',
              },
            ],
          }),
        } as unknown as Response);

        const result = await service.resolveProfile('facebook', accessToken);

        expect(result.accountRef).toBe('fb-page-id');
        expect(result.displayName).toBe('My Facebook Page');
        expect(result.metadata).toEqual({ pageAccessToken: 'fb_page_access_token' });
      });

      it('throws when no pages found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [],
          }),
        } as unknown as Response);

        await expect(service.resolveProfile('facebook', accessToken)).rejects.toThrow(
          'Facebook requires at least one managed page'
        );
      });

      it('throws when page access token is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ id: 'fb-page-id', name: 'My Page' }],
          }),
        } as unknown as Response);

        await expect(service.resolveProfile('facebook', accessToken)).rejects.toThrow(
          'Facebook requires at least one managed page'
        );
      });
    });

    describe('Instagram', () => {
      it('resolves instagram business account profile', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: 'fb-page-id',
                name: 'My FB Page',
                access_token: 'fb_page_token',
              },
            ],
          }),
        } as unknown as Response);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            instagram_business_account: { id: 'ig-account-id' },
          }),
        } as unknown as Response);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 'ig-account-id',
            name: 'My Instagram',
            username: 'myinstagram',
          }),
        } as unknown as Response);

        const result = await service.resolveProfile('instagram', accessToken);

        expect(result.accountRef).toBe('ig-account-id');
        expect(result.displayName).toBe('My Instagram');
        expect(result.metadata).toEqual({ username: 'myinstagram' });
      });

      it('throws when no pages found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        } as unknown as Response);

        await expect(service.resolveProfile('instagram', accessToken)).rejects.toThrow(
          'Instagram requires at least one managed page'
        );
      });

      it('throws when instagram business account not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ id: 'fb-page-id', access_token: 'token' }],
          }),
        } as unknown as Response);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        } as unknown as Response);

        await expect(service.resolveProfile('instagram', accessToken)).rejects.toThrow(
          'Page does not have an associated Instagram business account'
        );
      });
    });

    describe('TikTok', () => {
      it('resolves user profile successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              user: {
                open_id: 'tiktok-user-id',
                display_name: 'TikTok User',
              },
            },
          }),
        } as unknown as Response);

        const result = await service.resolveProfile('tiktok', accessToken);

        expect(result.accountRef).toBe('tiktok-user-id');
        expect(result.displayName).toBe('TikTok User');
      });

      it('throws when open_id is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              user: {
                display_name: 'TikTok User',
              },
            },
          }),
        } as unknown as Response);

        await expect(service.resolveProfile('tiktok', accessToken)).rejects.toThrow(
          'TikTok profile missing open_id'
        );
      });
    });

    describe('YouTube', () => {
      it('resolves channel profile successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'youtube-channel-id',
                snippet: { title: 'My YouTube Channel' },
              },
            ],
          }),
        } as unknown as Response);

        const result = await service.resolveProfile('youtube', accessToken);

        expect(result.accountRef).toBe('youtube-channel-id');
        expect(result.displayName).toBe('My YouTube Channel');
      });

      it('throws when channel id is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [{}],
          }),
        } as unknown as Response);

        await expect(service.resolveProfile('youtube', accessToken)).rejects.toThrow(
          'YouTube profile missing channel id'
        );
      });

      it('throws when items array is empty', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [],
          }),
        } as unknown as Response);

        await expect(service.resolveProfile('youtube', accessToken)).rejects.toThrow(
          'YouTube profile missing channel id'
        );
      });
    });

    it('throws for unsupported provider', async () => {
      await expect(service.resolveProfile('x' as SocialProvider, accessToken)).rejects.toThrow();
    });
  });

  describe('refreshAccessToken()', () => {
    const refreshToken = 'test_refresh_token';

    describe('YouTube', () => {
      it('refreshes access token successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new_youtube_access_token',
            refresh_token: 'new_youtube_refresh_token',
            expires_in: 3600,
          }),
        } as unknown as Response);

        const result = await service.refreshAccessToken('youtube', refreshToken);

        expect(result.accessToken).toBe('new_youtube_access_token');
        expect(result.refreshToken).toBe('new_youtube_refresh_token');
        expect(result.expiresAt).toBeInstanceOf(Date);
      });

      it('keeps old refresh token when new one not provided', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new_youtube_access_token',
            expires_in: 3600,
          }),
        } as unknown as Response);

        const result = await service.refreshAccessToken('youtube', refreshToken);

        expect(result.accessToken).toBe('new_youtube_access_token');
        expect(result.refreshToken).toBe(refreshToken);
      });

      it('throws TokenExpiredError on 401', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as unknown as Response);

        await expect(service.refreshAccessToken('youtube', refreshToken)).rejects.toThrow(TokenExpiredError);
      });
    });

    describe('TikTok', () => {
      it('refreshes access token successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new_tiktok_access_token',
            refresh_token: 'new_tiktok_refresh_token',
            expires_in: 7200,
          }),
        } as unknown as Response);

        const result = await service.refreshAccessToken('tiktok', refreshToken);

        expect(result.accessToken).toBe('new_tiktok_access_token');
        expect(result.refreshToken).toBe('new_tiktok_refresh_token');
      });

      it('throws TokenExpiredError on 401', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as unknown as Response);

        await expect(service.refreshAccessToken('tiktok', refreshToken)).rejects.toThrow(TokenExpiredError);
      });

      it('throws when access_token is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            refresh_token: 'new_refresh_token',
          }),
        } as unknown as Response);

        await expect(service.refreshAccessToken('tiktok', refreshToken)).rejects.toThrow(
          'TikTok token refresh missing access token'
        );
      });
    });

    it('throws for providers that do not support refresh', async () => {
      await expect(service.refreshAccessToken('x', refreshToken)).rejects.toThrow(
        'Refresh not implemented for provider: x'
      );
      await expect(service.refreshAccessToken('linkedin', refreshToken)).rejects.toThrow(
        'Refresh not implemented for provider: linkedin'
      );
      await expect(service.refreshAccessToken('facebook', refreshToken)).rejects.toThrow(
        'Refresh not implemented for provider: facebook'
      );
      await expect(service.refreshAccessToken('instagram', refreshToken)).rejects.toThrow(
        'Refresh not implemented for provider: instagram'
      );
    });
  });

  describe('error scenarios', () => {
    describe('rate limiting (429)', () => {
      const providers: SocialProvider[] = ['x', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube'];
      const methods = ['exchangeCodeForTokens', 'resolveProfile'] as const;

      for (const provider of providers) {
        for (const method of methods) {
          it(`throws RateLimitError for ${provider} in ${method}`, async () => {
            const mockResponse = {
              ok: false,
              status: 429,
              headers: new Map([['Retry-After', '60']]),
            } as unknown as Response;

            mockFetch.mockResolvedValueOnce(mockResponse);

            const svc = new SocialOAuthService();

            if (method === 'exchangeCodeForTokens') {
              await expect(
                svc.exchangeCodeForTokens(provider, 'code', 'redirect_uri')
              ).rejects.toThrow(RateLimitError);
            } else {
              await expect(svc.resolveProfile(provider, 'access_token')).rejects.toThrow(RateLimitError);
            }
          });
        }
      }
    });

    describe('server errors (5xx)', () => {
      it('throws OAuthError for X on 500', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as unknown as Response);

        await expect(
          service.exchangeCodeForTokens('x', 'code', 'redirect_uri')
        ).rejects.toThrow(OAuthError);
      });

      it('throws OAuthError for YouTube on 503', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
        } as unknown as Response);

        await expect(service.resolveProfile('youtube', 'access_token')).rejects.toThrow(OAuthError);
      });
    });

    describe('invalid tokens (401)', () => {
      it('throws TokenExpiredError when resolving X profile with invalid token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as unknown as Response);

        await expect(service.resolveProfile('x', 'invalid_token')).rejects.toThrow(TokenExpiredError);
      });

      it('throws TokenExpiredError when resolving LinkedIn profile with invalid token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as unknown as Response);

        await expect(service.resolveProfile('linkedin', 'invalid_token')).rejects.toThrow(
          TokenExpiredError
        );
      });

      it('throws TokenExpiredError when resolving Facebook profile with invalid token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as unknown as Response);

        await expect(service.resolveProfile('facebook', 'invalid_token')).rejects.toThrow(
          TokenExpiredError
        );
      });

      it('throws TokenExpiredError when resolving Instagram profile with invalid token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as unknown as Response);

        await expect(service.resolveProfile('instagram', 'invalid_token')).rejects.toThrow(
          TokenExpiredError
        );
      });

      it('throws TokenExpiredError when resolving TikTok profile with invalid token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as unknown as Response);

        await expect(service.resolveProfile('tiktok', 'invalid_token')).rejects.toThrow(
          TokenExpiredError
        );
      });

      it('throws TokenExpiredError when resolving YouTube profile with invalid token', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as unknown as Response);

        await expect(service.resolveProfile('youtube', 'invalid_token')).rejects.toThrow(
          TokenExpiredError
        );
      });
    });

    describe('network failures', () => {
      it('propagates network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          service.exchangeCodeForTokens('x', 'code', 'redirect_uri')
        ).rejects.toThrow('Network error');
      });

      it('propagates errors when fetching profile', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

        await expect(service.resolveProfile('x', 'access_token')).rejects.toThrow(
          'Connection refused'
        );
      });
    });
  });

  describe('edge cases', () => {
    it('handles missing refreshToken in X token response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'x_token',
          expires_in: 7200,
        }),
      } as unknown as Response);

      const result = await service.exchangeCodeForTokens('x', 'code', 'redirect');

      expect(result.accessToken).toBe('x_token');
      expect(result.refreshToken).toBeUndefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('handles missing expiresAt in token response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
        }),
      } as unknown as Response);

      const result = await service.exchangeCodeForTokens('tiktok', 'code', 'redirect');

      expect(result.accessToken).toBe('token');
      expect(result.refreshToken).toBe('refresh');
      expect(result.expiresAt).toBeUndefined();
    });

    it('handles missing scope in token response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'x_token',
          refresh_token: 'x_refresh',
          expires_in: 7200,
        }),
      } as unknown as Response);

      const result = await service.exchangeCodeForTokens('x', 'code', 'redirect', 'verifier');

      expect(result.scope).toBeUndefined();
    });

    it('handles TikTok user with minimal data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            user: {
              open_id: 'tiktok-id',
            },
          },
        }),
      } as unknown as Response);

      const result = await service.resolveProfile('tiktok', 'token');

      expect(result.accountRef).toBe('tiktok-id');
      expect(result.displayName).toBeUndefined();
    });

    it('handles X profile with only id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: '123456',
          },
        }),
      } as unknown as Response);

      const result = await service.resolveProfile('x', 'token');

      expect(result.accountRef).toBe('123456');
      expect(result.displayName).toBeUndefined();
      expect(result.metadata).toEqual({ username: undefined });
    });

    it('handles YouTube channel without snippet.title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'channel-id',
              snippet: {},
            },
          ],
        }),
      } as unknown as Response);

      const result = await service.resolveProfile('youtube', 'token');

      expect(result.accountRef).toBe('channel-id');
      expect(result.displayName).toBeUndefined();
    });

    it('handles LinkedIn profile without email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sub: 'li-id',
          name: 'LinkedIn User',
        }),
      } as unknown as Response);

      const result = await service.resolveProfile('linkedin', 'token');

      expect(result.accountRef).toBe('li-id');
      expect(result.displayName).toBe('LinkedIn User');
      expect(result.metadata).toEqual({ email: undefined });
    });
  });
});
