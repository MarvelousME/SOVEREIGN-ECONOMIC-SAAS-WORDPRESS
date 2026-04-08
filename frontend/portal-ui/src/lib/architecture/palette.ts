import type { SystemCategory, SystemNodeData } from '@/components/system-architecture/architecture-data';

export type PaletteItem = {
  slug: string;
  label: string;
  sub: string;
  category: SystemCategory;
};

/** Services not on the default canvas — add via palette (drag onto map or click Add). */
export const PALETTE_ITEMS: PaletteItem[] = [
  { slug: 'crm-service', label: 'CRM', sub: 'services/crm-service', category: 'platform' },
  { slug: 'knowledge-service', label: 'Knowledge', sub: 'services/knowledge-service', category: 'platform' },
  { slug: 'analytics-service', label: 'Analytics', sub: 'services/analytics-service', category: 'platform' },
  { slug: 'reporting-service', label: 'Reporting', sub: 'services/reporting-service', category: 'platform' },
  { slug: 'business-builder', label: 'Business Builder', sub: 'services/business-builder', category: 'platform' },
  { slug: 'landing-page-factory', label: 'Landing Factory', sub: 'services/landing-page-factory', category: 'edge' },
  { slug: 'affiliate-intelligence', label: 'Affiliate AI', sub: 'services/affiliate-intelligence', category: 'platform' },
  { slug: 'agent-control-plane', label: 'Agent Control Plane', sub: 'services/agent-control-plane', category: 'platform' },
  { slug: 'migrations', label: 'DB Migrations', sub: 'migrations/', category: 'data' },
  { slug: 'opa', label: 'OPA', sub: 'Policy (sidecar)', category: 'infra' },
  { slug: 'keycloak', label: 'Keycloak', sub: 'infrastructure/keycloak', category: 'infra' },
  { slug: 'traefik', label: 'Traefik', sub: 'docker/configs/traefik', category: 'infra' },
];

/** Extra palette entries for diagramming more Temporal types (baseline map already includes nine workflows + four triggers). */
export const WORKFLOW_PALETTE_ITEMS: PaletteItem[] = [
  { slug: 'wf-stub', label: 'Workflow (custom)', sub: 'Rename after drop — register in workflows/', category: 'workflow' },
  { slug: 'trig-webhook', label: 'Webhook trigger', sub: 'Trigger: signed HTTP callback', category: 'trigger' },
  { slug: 'trig-signal', label: 'Temporal signal', sub: 'Trigger: workflow signal', category: 'trigger' },
];

export function makePaletteNodeId(slug: string): string {
  const s = Math.random().toString(36).slice(2, 7);
  return `ext-${slug}-${s}`;
}

export function paletteDragPayload(item: PaletteItem): string {
  return JSON.stringify({ kind: 'palette', ...item });
}

export function parsePaletteDragPayload(raw: string): PaletteItem | null {
  try {
    const o = JSON.parse(raw) as { kind?: string; slug?: string; label?: string; sub?: string; category?: SystemCategory };
    if (o.kind !== 'palette' || !o.slug || !o.label || !o.sub || !o.category) return null;
    return { slug: o.slug, label: o.label, sub: o.sub, category: o.category };
  } catch {
    return null;
  }
}

export function paletteItemToNode(item: PaletteItem, position: { x: number; y: number }) {
  const id = makePaletteNodeId(item.slug);
  return {
    id,
    type: 'system' as const,
    position,
    deletable: true,
    data: {
      label: item.label,
      sub: item.sub,
      category: item.category,
    } satisfies SystemNodeData,
  };
}
