import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/search?q=query&type=works|characters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const searchType = searchParams.get('type') || 'works';

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    if (searchType === 'works') {
      const types = ['anime', 'manga', 'game'];
      const results = [];

      for (const type of types) {
        const indexPath = path.join(DATA_DIR, type, 'index.json');
        if (fs.existsSync(indexPath)) {
          const works = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
          const filtered = works.filter((work: any) => 
            work.title?.toLowerCase().includes(query) ||
            work.alt_titles?.some((t: string) => t.toLowerCase().includes(query))
          );
          // Adicionar id como alias de slug
          const filteredWithId = filtered.map((w: any) => ({ ...w, id: w.slug || w.id || 'unknown' }));
          results.push(...filteredWithId);
        }
      }

      return NextResponse.json(results);
    } else if (searchType === 'characters') {
      const types = ['anime', 'manga', 'game'];
      const results = [];

      for (const type of types) {
        const indexPath = path.join(DATA_DIR, type, 'index.json');
        if (!fs.existsSync(indexPath)) continue;

        const works = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

        for (const work of works) {
          const workId = work.slug || work.id;
          const charactersPath = path.join(DATA_DIR, type, workId, 'characters.json');
          if (!fs.existsSync(charactersPath)) continue;

          const charData = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
          const filtered = charData.characters?.filter((char: any) =>
            char.name?.toLowerCase().includes(query) ||
            char.alt_names?.some((n: string) => n.toLowerCase().includes(query))
          );

          if (filtered && filtered.length > 0) {
            results.push(...filtered.map((char: any) => ({
              ...char,
              work: {
                id: work.slug || work.id || 'unknown',
                slug: work.slug || work.id || 'unknown',
                type: work.type,
                title: work.title
              }
            })));
          }
        }
      }

      return NextResponse.json(results);
    }

    return NextResponse.json({ error: 'Invalid search type' }, { status: 400 });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
