import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/ranking - Retorna o ranking de personagens
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const rarity = searchParams.get('rarity'); // legendary, epic, rare, uncommon, common
    const type = searchParams.get('type'); // anime, manga, game
    
    const rankingPath = path.join(DATA_DIR, 'character-ranking.json');
    
    if (!fs.existsSync(rankingPath)) {
      return NextResponse.json(
        { error: 'Ranking not found. Run classify-rarity.js script first.' },
        { status: 404 }
      );
    }
    
    const ranking = JSON.parse(fs.readFileSync(rankingPath, 'utf-8'));
    
    // Filtrar personagens
    let characters = ranking.characters;
    
    if (rarity) {
      characters = characters.filter((c: { rarity: string }) => c.rarity === rarity);
    }
    
    if (type) {
      characters = characters.filter((c: { workType: string }) => c.workType === type);
    }
    
    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCharacters = characters.slice(startIndex, endIndex);
    
    return NextResponse.json({
      generated_at: ranking.generated_at,
      total_characters: characters.length,
      distribution: ranking.distribution,
      page,
      limit,
      total_pages: Math.ceil(characters.length / limit),
      characters: paginatedCharacters
    });
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return NextResponse.json({ error: 'Failed to fetch ranking' }, { status: 500 });
  }
}
