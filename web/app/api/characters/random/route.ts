import path from 'path'
import { NextResponse } from 'next/server'

// Forçar execução dinâmica desta rota para evitar que o bundler
// rastreie padrões dinâmicos de arquivos e inclua milhares de arquivos.
export const dynamic = 'force-dynamic'

// Multiplicadores de raridade (quanto menor, mais difícil de pegar)
const RARITY_WEIGHTS: Record<string, number> = {
  legendary: 0.3,   // 30% da chance base
  epic: 0.6,        // 60% da chance base
  rare: 1.0,        // 100% da chance base
  uncommon: 1.5,    // 150% da chance base
  common: 2.0       // 200% da chance base
};

interface RankedCharacter {
  rank: number;
  id: string;
  name: string;
  workId: string;
  workTitle: string;
  workType: string;
  role: string;
  score: number;
  rarity: string;
  image: string | null;
}

interface CharacterWithProbability extends RankedCharacter {
  weight: number;
  pullChance: number;
}

/**
 * Calcula a chance de pull para cada personagem
 * Fórmula: weight = (1 / (rank^0.5)) * rarity_multiplier
 * Personagens com ranking melhor têm menos chance, mas não é impossível
 */
function calculatePullProbabilities(rankedCharacters: RankedCharacter[]): CharacterWithProbability[] {
  // Calcular peso base para cada personagem
  const charactersWithWeight = rankedCharacters.map(char => {
    // Usa raiz quadrada do rank para suavizar a curva (rank 1 não fica muito difícil)
    const rankWeight = 1 / Math.sqrt(char.rank);
    const rarityMultiplier = RARITY_WEIGHTS[char.rarity] || 1.0;
    const weight = rankWeight * rarityMultiplier;
    
    return {
      ...char,
      weight,
      pullChance: 0 // Será calculado depois
    };
  });

  // Calcular soma total de pesos
  const totalWeight = charactersWithWeight.reduce((sum, char) => sum + char.weight, 0);

  // Calcular probabilidade percentual de cada personagem
  return charactersWithWeight.map(char => ({
    ...char,
    pullChance: (char.weight / totalWeight) * 100
  }));
}

/**
 * Seleciona personagens aleatórios baseado em suas probabilidades
 */
function pickRandomWeighted(characters: CharacterWithProbability[], n: number): CharacterWithProbability[] {
  const selected: CharacterWithProbability[] = [];
  const pool = [...characters]; // Cópia para não modificar o original
  
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    // Gerar número aleatório entre 0 e soma total de pesos
    const totalWeight = pool.reduce((sum, char) => sum + char.weight, 0);
    let random = Math.random() * totalWeight;
    
    // Selecionar personagem baseado no peso
    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].weight;
      if (random <= 0) {
        selected.push(pool[j]);
        pool.splice(j, 1); // Remove para não repetir
        break;
      }
    }
  }
  
  return selected;
}

/**
 * Seleciona personagens aleatórios uniformemente (modo legacy)
 */
function pickRandom<T>(arr: T[], n = 1): T[] {
  const res: T[] = []
  const len = arr.length
  if (len === 0) return res
  for (let i = 0; i < Math.min(n, len); i++) {
    const idx = Math.floor(Math.random() * arr.length)
    res.push(arr.splice(idx, 1)[0])
  }
  return res
}

async function readJson(file: string) {
  try {
    const fspLocal = await import('fs/promises')
    const s = await fspLocal.readFile(file, 'utf8')
    return JSON.parse(s)
  } catch (e) {
    return null
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = url.searchParams.get('type') // anime|manga|game
  const workType = url.searchParams.get('workType')
  const work = url.searchParams.get('work') // slug or id or title
  const nParam = url.searchParams.get('n') || '1'
  const weighted = url.searchParams.get('weighted') !== 'false' // Por padrão usa weighted
  const n = Math.max(1, Math.min(50, parseInt(nParam, 10) || 1))

  const dataRoot = path.join(process.cwd(), 'public', 'data')
  // Import filesystem functions dynamically at runtime to avoid static
  // bundler analysis that expands dynamic path patterns.
  const fsp = await import('fs/promises')
  
  // Carregar ranking para probabilidades ponderadas
  let rankingData: { characters: RankedCharacter[] } | null = null;
  if (weighted) {
    const rankingPath = path.join(dataRoot, 'character-ranking.json');
    rankingData = await readJson(rankingPath);
  }

  // Função auxiliar para enriquecer personagens com dados de ranking
  const enrichWithRanking = (characters: any[]) => {
    if (!rankingData) return characters;
    
    return characters.map(char => {
      const ranked = rankingData!.characters.find(
        (r: RankedCharacter) => r.id === char.id && r.workId === char.work?.slug
      );
      
      if (ranked) {
        return {
          ...char,
          rank: ranked.rank,
          score: ranked.score,
          rarity: ranked.rarity,
          pullChance: 0 // Será calculado no weighted selection
        };
      }
      
      return char;
    });
  };

  // If workType+work provided: try to resolve specific work dir
  if (workType && work) {
    // If we have ranking data loaded, prefer it as a fast, filesystem-free source
    if (rankingData) {
      const list = rankingData.characters.filter((c: any) => c.workType === workType && (String(c.workId) === work || String(c.workTitle) === work || String(c.workId) === work));
      if (list && list.length > 0) {
        const enriched = list.map((c: any) => ({ ...c, work: { type: workType, slug: c.workId } }));

        if (weighted && enriched.some((c: any) => c.rank)) {
          const withProbabilities = calculatePullProbabilities(enriched.filter((c: any) => c.rank));
          const chosen = pickRandomWeighted(withProbabilities, n);
          return NextResponse.json({ count: chosen.length, characters: chosen, method: 'weighted' });
        }

        const chosen = pickRandom(enriched, n);
        return NextResponse.json({ count: chosen.length, characters: chosen, method: 'uniform' });
      }
      // fallthrough to disk-based resolution if rankingData had no match
    }
    const workDir = path.join(dataRoot, workType)
    try {
      // Try quicker lookup using the type index (index.json) to resolve slug/id/title
      const indexPath = path.join(workDir, 'index.json')
      const index = await readJson(indexPath)
      if (Array.isArray(index)) {
        const found = index.find((w: any) => String(w.slug) === work || String(w.id) === work || String(w.title) === work)
        if (found && found.slug) {
          const candidate = path.join(workDir, String(found.slug))
          try {
            const stat = await fsp.stat(candidate)
            if (stat.isDirectory()) {
              const chars = await readJson(path.join(candidate, 'characters.json'))
              const list = Array.isArray(chars) ? chars : (chars && chars.characters) || []
              const enriched = enrichWithRanking(list.map((c: any) => ({ ...c, work: { type: workType, slug: found.slug } })));

              if (weighted && enriched.some((c: any) => c.rank)) {
                const withProbabilities = calculatePullProbabilities(enriched.filter((c: any) => c.rank));
                const chosen = pickRandomWeighted(withProbabilities, n);
                return NextResponse.json({ count: chosen.length, characters: chosen, method: 'weighted' });
              }

              const chosen = pickRandom(enriched, n)
              return NextResponse.json({ count: chosen.length, characters: chosen, method: 'uniform' })
            }
          } catch (e) {
            // fallthrough to directory scan below
          }
        }
      }

      // Scan all works under this type and try to match by info.id, info.slug, or info.title
      const entries = await fsp.readdir(workDir, { withFileTypes: true })
      for (const ent of entries) {
        if (!ent.isDirectory()) continue
        const infoPath = path.join(workDir, ent.name, 'info.json')
        const info = await readJson(infoPath)
        if (!info) continue
        const match = String(info.id) === work || String(info.slug) === work || String(info.title) === work
        if (match) {
          const chars = await readJson(path.join(workDir, ent.name, 'characters.json'))
          const list = Array.isArray(chars) ? chars : (chars && chars.characters) || []
          const enriched = enrichWithRanking(list.map((c: any) => ({ ...c, work: { type: workType, slug: ent.name } })));
          
          if (weighted && enriched.some((c: any) => c.rank)) {
            const withProbabilities = calculatePullProbabilities(enriched.filter((c: any) => c.rank));
            const chosen = pickRandomWeighted(withProbabilities, n);
            return NextResponse.json({ count: chosen.length, characters: chosen, method: 'weighted' });
          }
          
          const chosen = pickRandom(enriched, n)
          return NextResponse.json({ count: chosen.length, characters: chosen, method: 'uniform' })
        }
      }

      return NextResponse.json({ error: 'Work not found' }, { status: 404 })
    } catch (err) {
      return NextResponse.json({ error: 'Type not found' }, { status: 404 })
    }
  }

  // If type provided: aggregate characters from that type
  if (type) {
    // Prefer ranking data if available to avoid scanning directories
    if (rankingData) {
      const pool = rankingData.characters.filter((c: any) => c.workType === type).map((c: any) => ({ ...c, work: { type, slug: c.workId } }));

      if (pool.length === 0) {
        // fallthrough to filesystem scan
      } else {
        const enriched = pool;
        if (weighted && enriched.some((c: any) => c.rank)) {
          const withProbabilities = calculatePullProbabilities(enriched.filter((c: any) => c.rank));
          const chosen = pickRandomWeighted(withProbabilities, n);
          return NextResponse.json({ count: chosen.length, characters: chosen, method: 'weighted' });
        }

        const chosen = pickRandom(enriched, n);
        return NextResponse.json({ count: chosen.length, characters: chosen, method: 'uniform' });
      }
    }
    const typeDir = path.join(dataRoot, type)
    try {
      const entries = await fsp.readdir(typeDir, { withFileTypes: true })
      const pool: any[] = []
      for (const ent of entries) {
        if (!ent.isDirectory()) continue
        const chars = await readJson(path.join(typeDir, ent.name, 'characters.json'))
        if (!chars) continue
        const list = Array.isArray(chars) ? chars : (chars && chars.characters) || []
        for (const c of list) pool.push({ ...c, work: { type, slug: ent.name } })
      }
      
      const enriched = enrichWithRanking(pool);
      
      if (weighted && enriched.some((c: any) => c.rank)) {
        const withProbabilities = calculatePullProbabilities(enriched.filter((c: any) => c.rank));
        const chosen = pickRandomWeighted(withProbabilities, n);
        return NextResponse.json({ count: chosen.length, characters: chosen, method: 'weighted' });
      }
      
      const chosen = pickRandom(enriched, n)
      return NextResponse.json({ count: chosen.length, characters: chosen, method: 'uniform' })
    } catch (e) {
      return NextResponse.json({ error: 'Type not found' }, { status: 404 })
    }
  }

  // No filters: aggregate all characters from all types
  try {
    // If ranking data is available, use it as the canonical pool for global requests
    if (rankingData) {
      const pool = rankingData.characters.map((c: any) => ({ ...c, work: { type: c.workType, slug: c.workId } }));
      const enriched = pool;

      if (weighted && enriched.some((c: any) => c.rank)) {
        const withProbabilities = calculatePullProbabilities(enriched.filter((c: any) => c.rank));
        const chosen = pickRandomWeighted(withProbabilities, n);
        return NextResponse.json({ count: chosen.length, characters: chosen, method: 'weighted' });
      }

      const chosen = pickRandom(enriched, n);
      return NextResponse.json({ count: chosen.length, characters: chosen, method: 'uniform' });
    }

    const types = await fsp.readdir(dataRoot, { withFileTypes: true })
    const pool: any[] = []
    for (const t of types) {
      if (!t.isDirectory()) continue
      const typeDir = path.join(dataRoot, t.name)
      const works = await fsp.readdir(typeDir, { withFileTypes: true })
      for (const w of works) {
        if (!w.isDirectory()) continue
        const chars = await readJson(path.join(typeDir, w.name, 'characters.json'))
        if (!chars) continue
        const list = Array.isArray(chars) ? chars : (chars && chars.characters) || []
        for (const c of list) pool.push({ ...c, work: { type: t.name, slug: w.name } })
      }
    }
    
    const enriched = enrichWithRanking(pool);
    
    if (weighted && enriched.some((c: any) => c.rank)) {
      const withProbabilities = calculatePullProbabilities(enriched.filter((c: any) => c.rank));
      const chosen = pickRandomWeighted(withProbabilities, n);
      return NextResponse.json({ count: chosen.length, characters: chosen, method: 'weighted' });
    }
    
    const chosen = pickRandom(enriched, n)
    return NextResponse.json({ count: chosen.length, characters: chosen, method: 'uniform' })
  } catch (e) {
    return NextResponse.json({ error: 'No data available' }, { status: 500 })
  }
}
