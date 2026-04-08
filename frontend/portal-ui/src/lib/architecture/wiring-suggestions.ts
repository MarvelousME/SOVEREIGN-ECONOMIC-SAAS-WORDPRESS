/**
 * Pure helpers for wiring diff / human-readable suggestions (used by UI + API route).
 */

export type LayoutNode = {
  id?: string;
  data?: { label?: string; sub?: string; category?: string };
};

export type LayoutEdge = {
  id?: string;
  source?: string;
  target?: string;
  label?: string;
};

function labelOf(nodes: LayoutNode[], id: string | undefined): string {
  if (!id) return '?';
  const n = nodes.find((x) => x.id === id);
  return n?.data?.label ?? id;
}

function subOf(nodes: LayoutNode[], id: string | undefined): string | undefined {
  if (!id) return undefined;
  const n = nodes.find((x) => x.id === id);
  return n?.data?.sub;
}

/** Structured compose/env hints for tooling and manifests (advisory only). */
export type EdgeComposeHints = {
  narrative: string;
  envVars: string[];
  dependsOn: string[];
  networks: string[];
  docRefs: string[];
  composeNotes: string[];
};

function uniq(a: string[]): string[] {
  return [...new Set(a.filter(Boolean))];
}

/**
 * Heuristic compose/env hints from an edge (for review only).
 * Order: specific infra targets first, then HTTP/messaging patterns.
 */
export function composeHintsForEdge(
  sourceLabel: string,
  targetLabel: string,
  sourceSub?: string,
  targetSub?: string,
): EdgeComposeHints {
  const s = (sourceSub ?? '').toLowerCase();
  const t = (targetSub ?? '').toLowerCase();
  const sl = sourceLabel.toLowerCase();
  const tl = targetLabel.toLowerCase();

  const envVars: string[] = [];
  const dependsOn: string[] = [];
  const networks: string[] = [];
  const docRefs: string[] = [];
  const composeNotes: string[] = [];

  const addNet = () => {
    networks.push('default');
    composeNotes.push('Ensure both services share a Docker network (often the default compose network).');
  };

  if (tl.includes('nats') || targetLabel === 'NATS') {
    envVars.push('NATS_URL=nats://nats:4222');
    dependsOn.push('nats');
    docRefs.push('docs/nats-events.md');
    return {
      narrative: `Ensure ${sourceLabel} has NATS_URL (or equivalent) and publishes/subscribes to the intended subjects; see docs/nats-events.md.`,
      envVars: uniq(envVars),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq([
        ...composeNotes,
        'If using JetStream, confirm stream/consumer names match publisher expectations.',
      ]),
    };
  }

  if (tl.includes('temporal') || targetLabel === 'Temporal') {
    envVars.push('TEMPORAL_ADDRESS=temporal:7233', 'TEMPORAL_NAMESPACE=default');
    dependsOn.push('temporal');
    composeNotes.push(
      'Register workflows/activities on a worker task queue that matches the client (e.g. ubi-cms for UBI distribution).',
    );
    return {
      narrative: `Configure TEMPORAL_ADDRESS and task queue for ${sourceLabel} to match a worker that registers the workflow type.`,
      envVars: uniq(envVars),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq(composeNotes),
    };
  }

  if (tl.includes('postgres') || targetLabel === 'PostgreSQL') {
    envVars.push('DATABASE_URL=postgres://user:pass@postgres:5432/dbname');
    dependsOn.push('postgres');
    addNet();
    return {
      narrative: `Add DB connection env vars and a postgres dependency in docker-compose if this database link is new.`,
      envVars: uniq(envVars),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq(composeNotes),
    };
  }

  if (tl.includes('redis') || targetLabel === 'Redis') {
    envVars.push('REDIS_URL=redis://redis:6379', 'REDIS_HOST=redis');
    dependsOn.push('redis');
    addNet();
    return {
      narrative: `Point REDIS_HOST / REDIS_URL at the shared Redis service in compose.`,
      envVars: uniq(envVars),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq(composeNotes),
    };
  }

  if (tl.includes('keycloak') || sl.includes('keycloak')) {
    envVars.push('OIDC_ISSUER=http://keycloak:8080/realms/<realm>', 'OIDC_CLIENT_ID=', 'OIDC_CLIENT_SECRET=');
    dependsOn.push('keycloak');
    composeNotes.push('Expose Keycloak through Traefik or internal network only; align realm/client with auth-service.');
    return {
      narrative: `Wire OIDC discovery and client credentials; add keycloak to depends_on where the consumer starts before IdP is optional.`,
      envVars: uniq(envVars),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq(composeNotes),
    };
  }

  if (tl.includes('traefik') || sl.includes('traefik')) {
    composeNotes.push(
      'Add traefik labels on the target service (rule, entrypoint, TLS) or dynamic file provider config under docker/configs/traefik.',
    );
    dependsOn.push('traefik');
    return {
      narrative: `Define Traefik router/service for the upstream; use labels or file provider as in repo Traefik config.`,
      envVars: uniq(envVars),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq(composeNotes),
    };
  }

  if (tl.includes('opa') || sl.includes('opa')) {
    composeNotes.push(
      'Run OPA as a sidecar or shared service; mount policy bundles and set decision log / bundle URL as needed.',
    );
    return {
      narrative: `Attach OPA sidecar or shared opa service; configure policy path and service entrypoint for ${sourceLabel}.`,
      envVars: uniq(['OPA_URL=http://localhost:8181']),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq(composeNotes),
    };
  }

  if (s.includes('portal') || t.includes('portal') || sl.includes('portal') || tl.includes('portal')) {
    envVars.push('NEXT_PUBLIC_API_URL=http://api:PORT');
    addNet();
    composeNotes.push('Use internal service DNS in server-side fetches; browser calls may need public URL or Next.js rewrites.');
    return {
      narrative: `Set NEXT_PUBLIC_API_URL (or Next.js rewrites) so the portal reaches the API gateway.`,
      envVars: uniq(envVars),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq(composeNotes),
    };
  }

  if (s.includes('wordpress') || t.includes('wordpress') || sl.includes('wordpress') || tl.includes('wordpress')) {
    envVars.push('UBI_API_BASE_URL=http://api:PORT');
    composeNotes.push('From WordPress, call the gateway via HTTP client or plugin settings; avoid hardcoding host-only URLs in multisite.');
    return {
      narrative: `Point WordPress (plugin/theme) at the API gateway base URL; add CORS or server-side proxy if the browser calls cross-origin.`,
      envVars: uniq(envVars),
      dependsOn: uniq(['api']),
      networks: uniq(networks),
      docRefs: uniq(['docs/wordpress-plugins.md']),
      composeNotes: uniq(composeNotes),
    };
  }

  if (s.includes('services/') || t.includes('services/')) {
    addNet();
    composeNotes.push('Prefer internal compose DNS names (service name as hostname) for service-to-service HTTP.');
    return {
      narrative: `Wire HTTP between \`${sourceSub ?? sourceLabel}\` and \`${targetSub ?? targetLabel}\`: same network, explicit ports, healthchecks + depends_on if startup order matters.`,
      envVars: uniq(envVars),
      dependsOn: uniq(dependsOn),
      networks: uniq(networks),
      docRefs: uniq(docRefs),
      composeNotes: uniq(composeNotes),
    };
  }

  addNet();
  return {
    narrative: `Wire HTTP or messaging between \`${sourceSub ?? sourceLabel}\` and \`${targetSub ?? targetLabel}\` in compose and service config.`,
    envVars: uniq(envVars),
    dependsOn: uniq(dependsOn),
    networks: uniq(networks),
    docRefs: uniq(docRefs),
    composeNotes: uniq(composeNotes),
  };
}

/** One-line narrative; same as `composeHintsForEdge(...).narrative`. */
export function edgeHint(sourceLabel: string, targetLabel: string, sourceSub?: string, targetSub?: string): string {
  return composeHintsForEdge(sourceLabel, targetLabel, sourceSub, targetSub).narrative;
}

export type ProposedEdgeManifestEntry = {
  id: string;
  source: string;
  target: string;
  fromLabel: string;
  toLabel: string;
  edgeLabel?: string;
  composeHints: EdgeComposeHints;
};

export function buildProposedEdgeManifestEntries(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  baselineEdgeIds: Set<string>,
): ProposedEdgeManifestEntry[] {
  const proposed = edges.filter((e) => e.id && !baselineEdgeIds.has(e.id));
  return proposed.map((e) => {
    const fromLabel = labelOf(nodes, e.source);
    const toLabel = labelOf(nodes, e.target);
    const composeHints = composeHintsForEdge(fromLabel, toLabel, subOf(nodes, e.source), subOf(nodes, e.target));
    return {
      id: e.id!,
      source: e.source ?? '',
      target: e.target ?? '',
      fromLabel,
      toLabel,
      edgeLabel: typeof e.label === 'string' ? e.label : undefined,
      composeHints,
    };
  });
}

export function buildWiringSuggestionsMarkdown(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  baselineEdgeIds: Set<string>,
  baselineNodeIds: Set<string>,
  generatedAt: string,
): string {
  const proposed = edges.filter((e) => e.id && !baselineEdgeIds.has(e.id));
  const extraNodes = nodes.filter((n) => n.id && !baselineNodeIds.has(n.id));

  const lines: string[] = [
    `# Wiring suggestions (generated)`,
    ``,
    `Generated: ${generatedAt}`,
    ``,
    `> **Review before changing production.** This file is advisory; it does not modify compose or services automatically.`,
    ``,
  ];

  if (proposed.length === 0 && extraNodes.length === 0) {
    lines.push(`No proposed edges and no palette-only nodes beyond the baseline map.`, ``);
    return lines.join('\n');
  }

  if (extraNodes.length) {
    lines.push(`## Components added from palette (not in default map)`, ``);
    for (const n of extraNodes) {
      lines.push(`- **${n.data?.label ?? n.id}** (\`${n.id}\`) — ${n.data?.sub ?? 'no path'}`, ``);
    }
  }

  if (proposed.length) {
    lines.push(`## Proposed connections (vs documented baseline)`, ``);
    lines.push(`| From | To | Note | Suggested follow-up |`, `|------|----|------|---------------------|`);
    for (const e of proposed) {
      const from = labelOf(nodes, e.source);
      const to = labelOf(nodes, e.target);
      const pack = composeHintsForEdge(from, to, subOf(nodes, e.source), subOf(nodes, e.target));
      lines.push(`| ${from} | ${to} | ${(e.label as string) || 'Proposed'} | ${pack.narrative.replace(/\|/g, '\\|')} |`);
    }
    lines.push(``);

    lines.push(`## Proposed edges — structured compose hints`, ``);
    for (const e of proposed) {
      const from = labelOf(nodes, e.source);
      const to = labelOf(nodes, e.target);
      const pack = composeHintsForEdge(from, to, subOf(nodes, e.source), subOf(nodes, e.target));
      lines.push(`### ${from} → ${to}`, ``);
      lines.push(`- **Summary:** ${pack.narrative}`);
      if (pack.envVars.length) lines.push(`- **Env (examples):** ${pack.envVars.map((x) => `\`${x}\``).join(', ')}`);
      if (pack.dependsOn.length) lines.push(`- **depends_on (candidates):** ${pack.dependsOn.join(', ')}`);
      if (pack.networks.length) lines.push(`- **Networks:** ${pack.networks.join(', ')}`);
      if (pack.docRefs.length) lines.push(`- **Docs:** ${pack.docRefs.join(', ')}`);
      if (pack.composeNotes.length) {
        for (const n of pack.composeNotes) lines.push(`- ${n}`);
      }
      lines.push(``);
    }
  }

  lines.push(`## Docker Compose checklist`, ``);
  lines.push(
    `1. Add or update \`services:\` entries in \`docker-compose.dev.yml\` (or merge \`docker-compose.fragment.yml\`).`,
    `2. Set \`depends_on\` where startup order matters.`,
    `3. Align env files with \`docs/\` and \`seeds/\` conventions.`,
    `4. Run \`docker compose ... config\` to validate YAML before \`up\`.`,
    ``,
  );

  return lines.join('\n');
}

export function buildComposeFragmentCommentary(extraNodeSubs: string[], generatedAt: string): string {
  const header = [
    `# generated/architecture/outputs/docker-compose.fragment.yml`,
    `# ${generatedAt}`,
    `# Palette / extra components referenced in the map — stubs only; merge manually.`,
    ``,
  ];
  if (extraNodeSubs.length === 0) {
    return [...header, `services: {}`, ``].join('\n');
  }
  const lines = [...header, `services:`];
  for (const sub of extraNodeSubs) {
    const name = sub.replace(/^services\//, '').replace(/\/$/, '') || 'unknown';
    const key = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const buildPath = sub.replace(/\/$/, '');
    lines.push(`  # ${key}:`);
    lines.push(`  #   build: ./${buildPath}`);
    lines.push(`  #   # image: ghcr.io/...`);
    lines.push(`  #   environment: {}`);
    lines.push(`  #   depends_on: []`);
    lines.push(``);
  }
  return lines.join('\n');
}
