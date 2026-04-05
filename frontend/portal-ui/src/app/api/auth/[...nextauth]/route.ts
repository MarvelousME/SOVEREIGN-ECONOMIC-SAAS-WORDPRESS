// next-auth is not used in this project. This placeholder prevents 404s on
// any legacy /api/auth/* requests; all auth is handled by the Node API.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 404 });
}
