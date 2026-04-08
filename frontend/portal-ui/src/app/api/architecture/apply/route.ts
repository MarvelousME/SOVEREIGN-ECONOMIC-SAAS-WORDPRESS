import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { getMonorepoRoot } from '@/lib/repo-root';

export const runtime = 'nodejs';
export const maxDuration = 300;

function assertWriteAllowed(req: NextRequest): boolean {
  const secret = process.env.ARCHITECTURE_WRITE_SECRET;
  if (!secret) return true;
  return req.headers.get('x-architecture-secret') === secret;
}

export async function POST(req: NextRequest) {
  if (process.env.ARCHITECTURE_ALLOW_APPLY !== 'true') {
    return NextResponse.json(
      {
        error:
          'Apply disabled. Set ARCHITECTURE_ALLOW_APPLY=true on the Next.js server and ensure docker is available.',
      },
      { status: 403 },
    );
  }

  if (!assertWriteAllowed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const root = getMonorepoRoot();
  const scriptPath =
    process.platform === 'win32'
      ? path.join(root, 'generated', 'architecture', 'outputs', 'scripts', 'apply-wiring.ps1')
      : path.join(root, 'generated', 'architecture', 'outputs', 'scripts', 'apply-wiring.sh');

  if (!existsSync(scriptPath)) {
    return NextResponse.json(
      { error: 'Generated scripts not found. Use “Save to repo” on the Architecture page first.' },
      { status: 400 },
    );
  }

  const cmd = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const args =
    process.platform === 'win32'
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]
      : [scriptPath];

  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve) => {
      const child = spawn(cmd, args, {
        cwd: root,
        env: { ...process.env },
        shell: false,
      });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('close', (code) => resolve({ code, stdout, stderr }));
      child.on('error', (err) => resolve({ code: 1, stdout, stderr: stderr + String(err) }));
    },
  );

  if (result.code !== 0) {
    return NextResponse.json(
      {
        error: 'Apply script exited non-zero',
        code: result.code,
        stderr: result.stderr.slice(-8000),
        stdout: result.stdout.slice(-4000),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'docker compose build/up completed (dev stack).',
    stdout: result.stdout.slice(-4000),
  });
}
