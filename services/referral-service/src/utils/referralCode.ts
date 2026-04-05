import { customAlphabet } from 'nanoid';

// Use alphanumeric characters excluding similar-looking ones (0, O, I, l)
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 8);

export function generateReferralCode(): string {
  return nanoid();
}

export function isValidReferralCode(code: string): boolean {
  // Check if code is 6-12 characters and only contains allowed characters
  const regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{6,12}$/;
  return regex.test(code);
}

export function generateReferralLink(code: string, baseUrl: string = 'https://app.example.com'): string {
  return `${baseUrl}?ref=${code}`;
}
