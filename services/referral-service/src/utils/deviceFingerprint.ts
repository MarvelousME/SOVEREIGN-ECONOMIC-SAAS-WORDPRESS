import crypto from 'crypto';
import UAParser from 'ua-parser-js';

export function generateDeviceFingerprint(
  userAgent: string,
  ipAddress: string,
  acceptLanguage?: string,
  acceptEncoding?: string
): string {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  const components = [
    result.browser.name || '',
    result.browser.version || '',
    result.os.name || '',
    result.os.version || '',
    result.device.vendor || '',
    result.device.model || '',
    result.device.type || '',
    ipAddress,
    acceptLanguage || '',
    acceptEncoding || '',
  ];
  
  const fingerprintString = components.join('|');
  
  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex');
}

export function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  return parser.getResult();
}
