import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Multiplicadores de raridade para cálculo de pullChance
const RARITY_WEIGHTS: Record<string, number> = {
  legendary: 0.3,
  epic: 0.6,
  rare: 1.0,
  uncommon: 1.5,
  common: 2.0
};

// GET /api/works/:type/:workSlug/character/:charId
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; workSlug: string; charId: string }> }
) {
  try {
    const { type, workSlug, charId } = await params;
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

    // Carregar ranking para adicionar dados
    const rankingPath = path.join(DATA_DIR, 'character-ranking.json');
    if (fs.existsSync(rankingPath)) {
      const ranking = JSON.parse(fs.readFileSync(rankingPath, 'utf-8'));
      const rankedChar = ranking.characters.find(
        (r: any) => r.id === found.id && r.workId === workSlug
      );

      if (rankedChar) {
        // Calcular pullChance usando a mesma fórmula do random
        const totalChars = ranking.total_characters;
        const rankWeight = 1 / Math.sqrt(rankedChar.rank);
        const rarityMultiplier = RARITY_WEIGHTS[rankedChar.rarity] || 1.0;
        
        // Para calcular a chance real, precisamos da soma de todos os pesos
        // Usamos uma aproximação: assumimos distribuição média
        const avgWeight = totalChars / (2 * Math.sqrt(totalChars));
        const normalizedWeight = (rankWeight * rarityMultiplier) / avgWeight;
        const pullChance = (normalizedWeight / totalChars) * 100;

        found.rank = rankedChar.rank;
        found.score = rankedChar.score;
        found.pullChance = Math.min(100, Math.max(0.0001, pullChance)); // Entre 0.0001% e 100%
      }
    }

    return NextResponse.json(found);
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 });
  }
}
