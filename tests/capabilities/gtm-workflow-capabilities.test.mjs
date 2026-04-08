/**
 * GTM workflow capability checks (static verification — no live DB/services).
 * Validates that WordPress + VPS code paths contain the expected building blocks.
 *
 * Run: node --test tests/capabilities/gtm-workflow-capabilities.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

describe('1 — Create a client (tenant)', () => {
  test('IAM schema defines tenants table', () => {
    const sql = read('migrations/002_create_iam_schema.sql');
    assert.match(sql, /CREATE TABLE tenants/i);
  });

  test('Workspace UUID ↔ IAM tenant link migration exists', () => {
    assert.ok(exists('migrations/023_iam_tenant_workspace_uuid_link.sql'));
  });

  test('Business Builder: provision API can create workspace (product tenant context)', () => {
    const routes = read('services/business-builder/src/routes/provision.routes.ts');
    assert.match(routes, /createWorkspace/);
    const svc = read('services/business-builder/src/services/provision.service.ts');
    assert.match(svc, /INSERT INTO tenant_workspaces/);
  });

  test('WordPress: sovereign tenant onboarding plugin exists', () => {
    assert.ok(
      exists('wordpress/wp-content/plugins/sovereign-tenant-onboarding/sovereign-tenant-onboarding.php')
    );
  });
});

describe('2 — Workspace for a client (tenant)', () => {
  test('tenant_workspaces migration and default workspace seed', () => {
    const sql = read('migrations/012_business_builder_tenant_workspaces.sql');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS tenant_workspaces/);
    assert.match(sql, /tenant_workspace_members/);
  });

  test('Provision routes expose POST /workspaces', () => {
    const r = read('services/business-builder/src/routes/provision.routes.ts');
    assert.match(r, /router\.post\(\s*['"]\/workspaces['"]/);
  });
});

describe('3 — Page builder / landing pages', () => {
  test('Landing Page Factory: CRUD + publish routes', () => {
    const r = read('services/landing-page-factory/src/routes/index.ts');
    assert.match(r, /controller\.(generatePage|getPages|publishPage)/);
  });

  test('Portal UI: page editor and generator routes exist', () => {
    assert.ok(exists('frontend/portal-ui/src/app/dashboard/pages/editor/[id]/page.tsx'));
    assert.ok(exists('frontend/portal-ui/src/app/dashboard/pages/generator/page.tsx'));
  });

  test('WordPress: Elementor landing page document type present', () => {
    assert.ok(
      exists(
        'wordpress/wp-content/plugins/elementor/modules/landing-pages/documents/landing-page.php'
      )
    );
  });
});

describe('4 — Link + AI agents for bespoke landing page', () => {
  test('PageGeneratorService generates blocks from affiliate URL context', () => {
    const gen = read('services/landing-page-factory/src/services/pageGenerator.ts');
    assert.match(gen, /generatePage\(/);
    assert.match(gen, /affiliateUrl/);
  });

  test('Landing API exposes POST /generate', () => {
    const r = read('services/landing-page-factory/src/routes/index.ts');
    assert.match(r, /router\.post\(\s*['"]\/generate['"]/);
  });
});

describe('5 — Post to social with backlink to landing page', () => {
  test('VPS: landing publish pipeline has CDN/subdomain/embed — not OAuth social post', () => {
    const pub = read('services/landing-page-factory/src/services/publishPipeline.ts');
    assert.match(pub, /deployToCDN/);
    assert.match(pub, /PublishTargetType\.CDN/);
    // No Meta/X/LinkedIn API scheduler in this service
    assert.doesNotMatch(pub, /graph\.facebook|api\.twitter|linkedin\.com\/oauth/i);
  });

  test('Landing Page Factory: intent share URLs + optional publish webhook', () => {
    assert.ok(exists('services/landing-page-factory/src/services/socialShareLinks.ts'));
    assert.ok(exists('services/landing-page-factory/src/services/socialPublishWebhook.ts'));
    assert.ok(exists('services/landing-page-factory/src/services/socialOAuth.ts'));
    assert.ok(exists('services/landing-page-factory/src/services/socialQueue.ts'));
    assert.ok(exists('services/landing-page-factory/src/services/analyticsClient.ts'));
    assert.ok(exists('services/landing-page-factory/src/controllers/social.controller.ts'));
    assert.ok(exists('services/landing-page-factory/src/routes/social.routes.ts'));
    const routes = read('services/landing-page-factory/src/routes/share-links.routes.ts');
    assert.match(routes, /share-links|\/share-links/);
    const socialRoutes = read('services/landing-page-factory/src/routes/social.routes.ts');
    assert.match(socialRoutes, /oauth|accounts|posts/);
    const idx = read('services/landing-page-factory/src/index.ts');
    assert.match(idx, /share-links|shareLinks|ShareLinks/);
    assert.match(idx, /\/api\/v1\/social/);
    const publishController = read('services/landing-page-factory/src/controllers/landing-page.controller.ts');
    assert.match(publishController, /autoPost|queuedSocialPostIds|enqueuePublishJob/);
  });

  test('WordPress: theme/Elementor share-link patterns (manual share URLs, not auto-post)', () => {
    const share = read('wordpress/wp-content/plugins/elementor/assets/lib/share-link/share-link.js');
    assert.match(share, /twitter\.com\/intent|facebook\.com\/sharer/);
  });
});

describe('6 — Click tracking', () => {
  test('Analytics service: event ingest routes', () => {
    const r = read('services/analytics-service/src/routes/index.ts');
    assert.match(r, /\/events/);
  });

  test('WordPress: SAAOS traffic router click tracker', () => {
    assert.ok(
      exists('wordpress/wp-content/plugins/saaos-traffic-router/includes/class-click-tracker.php')
    );
    const php = read('wordpress/wp-content/plugins/saaos-traffic-router/includes/class-click-tracker.php');
    assert.match(php, /track_click/);
  });
});
