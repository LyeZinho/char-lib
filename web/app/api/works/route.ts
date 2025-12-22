import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/works - Lista todas as obras
export async function GET() {
  try {
    const types = ['anime', 'manga', 'game'];
    const allWorks = [];

    for (const type of types) {
      const indexPath = path.join(DATA_DIR, type, 'index.json');
      if (fs.existsSync(indexPath)) {
        const works = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        // Adicionar id como alias de slug para compatibilidade
        const worksWithId = works.map((w: any) => ({ ...w, id: w.slug || w.id || 'unknown' }));
        allWorks.push(...worksWithId);
      }
    }

    return NextResponse.json(allWorks);
  } catch (error) {
    console.error('Error listing works:', error);
    return NextResponse.json({ error: 'Failed to list works' }, { status: 500 });
  }
}
