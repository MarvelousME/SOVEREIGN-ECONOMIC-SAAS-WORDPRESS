import { requireReportAccess } from './auth.middleware';

describe('reporting requireReportAccess', () => {
  it('allows owner role', () => {
    const middleware = requireReportAccess();
    const req = { roles: ['owner'], ssoAuthenticated: false };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('denies SSO-protected report access without SSO', () => {
    const middleware = requireReportAccess({ requireSso: true });
    const req = { roles: ['owner'], ssoAuthenticated: false };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
