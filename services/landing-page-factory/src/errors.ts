import { SocialProvider } from './models/social.model';

export class RateLimitError extends Error {
  readonly provider: SocialProvider;
  readonly retryAfter?: number;

  constructor(provider: SocialProvider, message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.provider = provider;
    this.retryAfter = retryAfter;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TokenExpiredError extends Error {
  readonly provider: SocialProvider;

  constructor(provider: SocialProvider, message = 'Access token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
    this.provider = provider;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class OAuthError extends Error {
  readonly code: string;
  readonly provider: SocialProvider;

  constructor(provider: SocialProvider, code: string, message: string) {
    super(message);
    this.name = 'OAuthError';
    this.code = code;
    this.provider = provider;
    Error.captureStackTrace(this, this.constructor);
  }
}
