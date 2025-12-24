import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/works/:type/:workSlug/character/:charId
export async function GET(request: Request, { params }: { params: { type: string; workSlug: string; charId: string } }) {
  try {
    const { type, workSlug, charId } = params;
    if (!type || !workSlug || !charId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const charactersPath = path.join(DATA_DIR, type, workSlug, 'characters.json');
    if (!fs.existsSync(charactersPath)) {
      return NextResponse.json({ error: 'Characters not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
    const characters = Array.isArray(data) ? data : data.characters || [];

    const found = characters.find((c: any) => c.id === charId || c.slug === charId);
    if (!found) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    return NextResponse.json(found);
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 });
  }
}
