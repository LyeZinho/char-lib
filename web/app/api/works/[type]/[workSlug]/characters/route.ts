import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/works/:type/:workSlug/characters
export async function GET(request: Request, { params }: { params: { type: string; workSlug: string } }) {
  try {
    const { type, workSlug } = params;
    if (!type || !workSlug) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const charactersPath = path.join(DATA_DIR, type, workSlug, 'characters.json');
    if (!fs.existsSync(charactersPath)) {
      return NextResponse.json({ error: 'Characters not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
    // Accept both formats: { characters: [...] } or [...]
    const characters = Array.isArray(data) ? data : data.characters || [];
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/works/[type]/[slug]/characters - Lista personagens de uma obra
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; workSlug: string }> }
) {
  try {
    const { type, workSlug } = await params;
    const charactersPath = path.join(DATA_DIR, type, workSlug, 'characters.json');

    if (!fs.existsSync(charactersPath)) {
      return NextResponse.json({ error: 'Characters not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
    return NextResponse.json(data.characters || []);
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}
