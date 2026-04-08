# SWARM 4 Results: Social OAuth Extensions

## OAuth Providers Implemented

### Instagram OAuth (Instagram Graph API)
- **start()**: Uses Meta/Facebook OAuth dialog with Instagram-specific scopes
- **exchangeCodeForTokens()**: Exchanges code via Facebook Graph API
- **resolveProfile()**: Fetches Instagram business account via page -> Instagram business account chain
- **Scopes**: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
- **Auth URL**: `https://www.facebook.com/v20.0/dialog/oauth`

### YouTube OAuth (YouTube Data API v3)
- **start()**: Google OAuth 2.0 with PKCE support
- **exchangeCodeForTokens()**: Exchanges code at `https://oauth2.googleapis.com/token`
- **resolveProfile()**: Fetches channel info via `https://www.googleapis.com/youtube/v3/channels`
- **Scopes**: `https://www.googleapis.com/auth/youtube`, `https://www.googleapis.com/auth/youtube.force-ssl`
- **Token Refresh**: Implemented via `refreshAccessToken()` method

## Environment Variables Required

| Variable | Provider | Description |
|----------|----------|-------------|
| `SOCIAL_OAUTH_REDIRECT_BASE_URL` | All | Base URL for OAuth callbacks |
| `X_CLIENT_ID` | X | X OAuth app client ID |
| `X_CLIENT_SECRET` | X | X OAuth app client secret |
| `LINKEDIN_CLIENT_ID` | LinkedIn | LinkedIn OAuth app client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn | LinkedIn OAuth app client secret |
| `META_APP_ID` | Facebook, Instagram | Meta app ID |
| `META_APP_SECRET` | Facebook, Instagram | Meta app secret |
| `TIKTOK_CLIENT_KEY` | TikTok | TikTok OAuth app client key |
| `TIKTOK_CLIENT_SECRET` | TikTok | TikTok OAuth app client secret |
| `YOUTUBE_CLIENT_ID` | YouTube | Google OAuth app client ID |
| `YOUTUBE_CLIENT_SECRET` | YouTube | Google OAuth app client secret |

## Callback URLs

All OAuth callbacks follow: `{REDIRECT_BASE_URL}/api/v1/social/oauth/{provider}/callback`

## Test Coverage

- **Test File**: `services/landing-page-factory/tests/services/socialOAuth.test.ts`
- **Test Count**: 75 tests
- **Coverage**: All 6 OAuth providers (start, token exchange, profile resolution)
- **Error Scenarios**: Rate limiting (429), server errors (5xx), invalid tokens (401), network failures
- **Edge Cases**: Missing optional fields, token refresh for unsupported providers

## Error Handling Added

- **RateLimitError**: Thrown on 429 responses with retry-after support
- **TokenExpiredError**: Thrown on 401 responses during profile fetch
- **OAuthError**: Thrown for server errors (5xx) with code and provider context
- **Rate Limit Checking**: `checkResponseStatus()` helper applied to all fetch calls

## Token Refresh Support

- **YouTube**: Fully implemented via `refreshAccessToken()`
- **TikTok**: Fully implemented via `refreshAccessToken()`
- **Other Providers**: Throws `Error("Refresh not implemented for provider: {provider}")`

## Files Modified/Created

1. `services/landing-page-factory/src/services/socialOAuth.ts` - Added Instagram and YouTube OAuth flows
2. `services/landing-page-factory/src/models/social.model.ts` - Updated SocialProvider type
3. `services/landing-page-factory/src/errors.ts` - New error classes
4. `services/landing-page-factory/tests/services/socialOAuth.test.ts` - Comprehensive tests
5. `services/landing-page-factory/README.md` - Complete documentation

## Limitations

1. **Instagram**: Requires Instagram Business/Creator account linked to Facebook Page
2. **YouTube**: Requires Google account with at least one YouTube channel
3. **TikTok**: `video.publish` scope requires TikTok enterprise approval
4. **Meta Apps**: Permissions require app review before production use

## Future Work

- Add LinkedIn refresh token support
- Implement token refresh for X (Twitter)
- Add support for Pinterest OAuth
- Add Snapchat OAuth
- Implement batch token refresh scheduling
