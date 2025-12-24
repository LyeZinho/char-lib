import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/works/:type/:workSlug
export async function GET(request: Request, { params }: { params: { type: string; workSlug: string } }) {
  try {
    const { type, workSlug } = params;
    if (!type || !workSlug) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const infoPath = path.join(DATA_DIR, type, workSlug, 'info.json');
    if (!fs.existsSync(infoPath)) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    return NextResponse.json(info);
  } catch (error) {
    console.error('Error fetching work:', error);
    return NextResponse.json({ error: 'Failed to fetch work' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/works/[type]/[slug] - Informações de uma obra
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; workSlug: string }> }
) {
  try {
    const { type, workSlug } = await params;
    const infoPath = path.join(DATA_DIR, type, workSlug, 'info.json');

    if (!fs.existsSync(infoPath)) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const work = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    // Adicionar slug como campo se não existir
    if (!work.slug) {
      work.slug = workSlug;
    }
    return NextResponse.json(work);
  } catch (error) {
    console.error('Error fetching work:', error);
    return NextResponse.json({ error: 'Failed to fetch work' }, { status: 500 });
  }
}
