import path from 'path';

/**
 * Resolve monorepo root when the Next.js app runs from `frontend/portal-ui`.
 */
export function getMonorepoRoot(): string {
  return path.resolve(process.cwd(), '..', '..');
}
