import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/works/[type]/[slug]/characters/[characterId] - Dados de um personagem
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; workSlug: string; characterId: string }> }
) {
  try {
    const { type, workSlug, characterId } = await params;
    const charactersPath = path.join(DATA_DIR, type, workSlug, 'characters.json');

    if (!fs.existsSync(charactersPath)) {
      return NextResponse.json({ error: 'Characters not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
    const character = data.characters?.find((c: any) => c.id === characterId);

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 });
  }
}
