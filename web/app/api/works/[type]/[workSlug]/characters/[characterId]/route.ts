import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Rarity multipliers for pull chance calculation
const RARITY_WEIGHTS = {
  legendary: 0.3,
  epic: 0.6,
  rare: 1.0,
  uncommon: 1.5,
  common: 2.0,
};

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

    // Load ranking data
    const rankingPath = path.join(DATA_DIR, 'character-ranking.json');
    if (fs.existsSync(rankingPath)) {
      try {
        const ranking = JSON.parse(fs.readFileSync(rankingPath, 'utf-8'));
        
        // Match ranking by character id and work slug
        const rankedChar = ranking.characters.find(
          (rc: any) => rc.id === characterId && rc.workId === workSlug && rc.workType === type
        );

        if (rankedChar) {
          const rank = rankedChar.rank;
          const score = rankedChar.score;
          const rarity = character.rarity || 'common';
          
          // Calculate pull chance using the same formula as random endpoint
          const rarityMultiplier = RARITY_WEIGHTS[rarity as keyof typeof RARITY_WEIGHTS] || 1.0;
          const rankWeight = 1 / Math.sqrt(rank);
          
          // Approximate average weight for normalization (calculated from formula)
          // For 18610 characters, average sqrt(rank) ≈ 68, so avg weight ≈ 0.0147
          const avgWeight = 0.0147;
          const totalChars = ranking.characters.length;
          
          // pullChance = (individual probability / sum of all probabilities) * 100
          const pullChance = ((rankWeight * rarityMultiplier / avgWeight) / totalChars) * 100;
          
          character.rank = rank;
          character.score = score;
          character.pullChance = pullChance;
        }
      } catch (err) {
        console.error('Error loading ranking:', err);
      }
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 });
  }
}
