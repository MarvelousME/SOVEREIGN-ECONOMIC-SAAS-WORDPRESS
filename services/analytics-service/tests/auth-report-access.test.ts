import { requireReportAccess } from '../src/middleware/auth';

describe('requireReportAccess middleware', () => {
  it('allows analyst role for default policy', () => {
    const middleware = requireReportAccess();
    const req = { tenantContext: { roles: ['analyst'], ssoAuthenticated: false } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks when SSO is required and absent', () => {
    const middleware = requireReportAccess({ requireSso: true });
    const req = { tenantContext: { roles: ['admin'], ssoAuthenticated: false } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
