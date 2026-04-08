# Social OAuth Service

This service provides OAuth 2.0 authentication and account linking for 6 social media providers, enabling cross-tenant social account management and publishing capabilities.

## Supported Providers

| Provider | Service | Env Prefix |
|----------|---------|------------|
| X (Twitter) | Tweet publishing | `X_` |
| LinkedIn | Company page posts | `LINKEDIN_` |
| Facebook | Page posts | `META_` |
| Instagram | Business posts | `META_` |
| TikTok | Video publishing | `TIKTOK_` |
| YouTube | Channel management | `YOUTUBE_` |

## Environment Variables

### Common Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SOCIAL_OAUTH_REDIRECT_BASE_URL` | Yes | Public base URL of the service (e.g., `https://app.example.com`). The OAuth callback path `/api/v1/social/oauth/{provider}/callback` is appended automatically. |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Yes | Base64-encoded 32-byte AES key for encrypting stored access tokens. Generate with PowerShell: `[Convert]::ToBase64String((1..32 \| ForEach-Object {Get-Random -Maximum 256}))` |
| `REDIS_URL` | Yes | Redis connection URL for job queue backend (e.g., `redis://127.0.0.1:6379`) |

### Provider-Specific Variables

#### X (Twitter)

| Variable | Required | Description |
|----------|----------|-------------|
| `X_CLIENT_ID` | Yes | X OAuth app client ID |
| `X_CLIENT_SECRET` | Yes | X OAuth app client secret |

#### LinkedIn

| Variable | Required | Description |
|----------|----------|-------------|
| `LINKEDIN_CLIENT_ID` | Yes | LinkedIn OAuth app client ID |
| `LINKEDIN_CLIENT_SECRET` | Yes | LinkedIn OAuth app client secret |

#### Facebook (Meta)

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_ID` | Yes | Meta/Facebook app ID |
| `META_APP_SECRET` | Yes | Meta/Facebook app secret |

#### Instagram (Meta)

Instagram reuses the Facebook/Meta app credentials since it's part of the Meta Graph API.

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_ID` | Yes | Same Meta app ID as Facebook |
| `META_APP_SECRET` | Yes | Same Meta app secret as Facebook |

#### TikTok

| Variable | Required | Description |
|----------|----------|-------------|
| `TIKTOK_CLIENT_KEY` | Yes | TikTok OAuth app client key |
| `TIKTOK_CLIENT_SECRET` | Yes | TikTok OAuth app client secret |

#### YouTube (Google)

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_CLIENT_ID` | Yes | Google OAuth app client ID |
| `YOUTUBE_CLIENT_SECRET` | Yes | Google OAuth app client secret |

## OAuth Callback URLs

All OAuth callbacks follow the pattern:

```
{base}/api/v1/social/oauth/{provider}/callback
```

### Full Callback URLs by Provider

| Provider | Callback URL |
|----------|-------------|
| X | `https://app.example.com/api/v1/social/oauth/x/callback` |
| LinkedIn | `https://app.example.com/api/v1/social/oauth/linkedin/callback` |
| Facebook | `https://app.example.com/api/v1/social/oauth/facebook/callback` |
| Instagram | `https://app.example.com/api/v1/social/oauth/instagram/callback` |
| TikTok | `https://app.example.com/api/v1/social/oauth/tiktok/callback` |
| YouTube | `https://app.example.com/api/v1/social/oauth/youtube/callback` |

## OAuth Scopes

### X (Twitter)

- `tweet.read`
- `tweet.write`
- `users.read`
- `offline.access`

### LinkedIn

- `openid`
- `profile`
- `w_member_social`

### Facebook

- `pages_manage_posts`
- `pages_read_engagement`

### Instagram

- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`

### TikTok

- `user.info.basic`
- `video.publish`

### YouTube

- `https://www.googleapis.com/auth/youtube`
- `https://www.googleapis.com/auth/youtube.force-ssl`

## OAuth Flow

### 1. Start Authorization

```
GET /api/v1/social/oauth/{provider}/start
```

Query parameters:
- `tenantId` (required): Tenant UUID
- `redirectUrl` (optional): URL to redirect after successful OAuth

Response:
```json
{
  "state": "tenant-uuid:randomhex",
  "codeVerifier": "...",
  "authUrl": "https://provider.com/oauth/authorize?...",
  "redirectUri": "https://app.example.com/api/v1/social/oauth/{provider}/callback",
  "scope": ["scope1", "scope2"]
}
```

### 2. OAuth Callback

```
GET /api/v1/social/oauth/{provider}/callback
```

Query parameters:
- `code` (required): Authorization code from provider
- `state` (required): State parameter containing tenantId and verifier

### 3. Exchange Code for Tokens

The service automatically exchanges the authorization code for access tokens using PKCE (where supported).

### 4. Resolve Profile

After token exchange, the service fetches the user's profile and managed pages/accounts to store.

## Troubleshooting

### Common Issues

#### 1. OAuth State Validation Failed

**Symptom:** `OAuth state validation failed` error during callback.

**Causes:**
- State parameter was tampered with or expired
- Tenant ID in state doesn't match expected format

**Solutions:**
- Ensure the OAuth flow completes within the same session
- Check that `SOCIAL_OAUTH_REDIRECT_BASE_URL` is configured correctly and accessible

#### 2. Missing or Invalid Token Encryption Key

**Symptom:** Service fails to store social account credentials.

**Solutions:**
- Verify `SOCIAL_TOKEN_ENCRYPTION_KEY` is set to a valid 32-byte Base64-encoded string
- Regenerate with: `[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))`

#### 3. Instagram "No Business Account" Error

**Symptom:** `Instagram requires at least one managed page` or `Page does not have an associated Instagram business account`

**Solutions:**
- The Instagram account must be converted to a Business or Creator account
- The Facebook Page must be linked to the Instagram Business account
- The Meta app must have `instagram_basic`, `instagram_content_publish`, and `pages_read_engagement` permissions
- Ensure the app is approved for these permissions in Meta Developer Console

#### 4. LinkedIn Profile Fetch Fails

**Symptom:** `LinkedIn profile fetch failed`

**Solutions:**
- Ensure `openid` and `profile` scopes are enabled in LinkedIn Developer Console
- Verify the access token hasn't expired
- Check that the user has approved the application

#### 5. YouTube Channel Not Found

**Symptom:** `YouTube profile missing channel id`

**Solutions:**
- The Google account must have at least one YouTube channel created
- The OAuth app must have `youtube` and `youtube.force-ssl` scopes
- Verify `access_type=offline` and `prompt=consent` are set for refresh token

#### 6. X/Twitter PKCE Error

**Symptom:** `X token exchange failed`

**Solutions:**
- Ensure code verifier is exactly 48 bytes (96 hex characters)
- Verify `code_challenge_method=S256` is set
- Check that redirect_uri matches exactly what was registered in Twitter Developer Portal

#### 7. Facebook/Meta App Not Approved

**Symptom:** OAuth works in development but fails in production.

**Solutions:**
- Meta apps in Live mode require app review for most permissions
- Submit for app review with screencasts demonstrating the use case
- Permissions needed: `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`

#### 8. TikTok OAuth Scope Denied

**Symptom:** User grants access but scope is rejected.

**Solutions:**
- TikTok requires specific approval for `video.publish` scope
- Apply for TikTok Developer access and submit your use case for review
- Some scopes are only available to enterprise developers

### Provider Configuration Reference

#### X (Twitter) Developer Console

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a Project and App with OAuth 2.0 enabled
3. Set Callback URI: `https://app.example.com/api/v1/social/oauth/x/callback`
4. Enable PKCE support
5. Request these permissions: `tweet.read`, `tweet.write`, `users.read`, `offline.access`

#### LinkedIn Developer Console

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create an app with "Sign In with LinkedIn" product
3. Add OAuth redirect URL: `https://app.example.com/api/v1/social/oauth/linkedin/callback`
4. Configure these scopes: `openid`, `profile`, `w_member_social`

#### Meta/Facebook Developer Console

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Create an app (choose "Business" type for social publishing)
3. Add products: Facebook Login, Instagram Graph API
4. Configure OAuth redirect: `https://app.example.com/api/v1/social/oauth/facebook/callback` and `.../instagram/callback`
5. Submit for permissions review for `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`

#### TikTok Developer Console

1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Create an app with "Publish" capability
3. Configure redirect URL: `https://app.example.com/api/v1/social/oauth/tiktok/callback`
4. Apply for `video.publish` scope (requires enterprise account for approval)

#### Google Cloud Console (YouTube)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable YouTube Data API v3
3. Configure OAuth consent screen with these scopes:
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
4. Create OAuth 2.0 Client ID with redirect: `https://app.example.com/api/v1/social/oauth/youtube/callback`
5. Enable offline access and force consent prompt

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/social/oauth/:provider/start` | Start OAuth flow |
| GET | `/api/v1/social/oauth/:provider/callback` | OAuth callback |
| GET | `/api/v1/social/accounts` | List linked accounts |
| POST | `/api/v1/social/accounts` | Link new account |
| DELETE | `/api/v1/social/accounts/:id` | Unlink account |
| POST | `/api/v1/social/posts` | Create social post |
| GET | `/api/v1/social/posts/:id` | Get post status |
| GET | `/api/v1/social/share-links` | Generate share links |

## Security Considerations

1. **Token Encryption**: All OAuth tokens are encrypted at rest using AES-256
2. **PKCE**: X and YouTube use PKCE (Proof Key for Code Exchange) for enhanced security
3. **State Parameter**: OAuth state includes tenant ID and cryptographic nonce to prevent CSRF
4. **HTTPS Only**: All OAuth flows should use HTTPS in production
5. **Token Refresh**: Refresh tokens are supported where the provider allows
