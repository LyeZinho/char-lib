import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Função de similaridade de Levenshtein simplificada
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Função de score de similaridade (0-1, 1 = idêntico)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
}

// Normalizar string para busca
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .trim();
}

// GET /api/characters/search?q=query&type=anime|manga|game&limit=20&threshold=0.4
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const typeFilter = searchParams.get('type'); // anime, manga, game ou null (todos)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const threshold = parseFloat(searchParams.get('threshold') || '0.4'); // 0-1, mínimo de similaridade

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const normalizedQuery = normalize(query);
    const queryWords = normalizedQuery.split(/\s+/);

    const types = typeFilter ? [typeFilter] : ['anime', 'manga', 'game'];
    const results: Array<{
      character: any;
      work: any;
      score: number;
      matchType: string;
    }> = [];

    for (const type of types) {
      const indexPath = path.join(DATA_DIR, type, 'index.json');
      if (!fs.existsSync(indexPath)) continue;

      const works = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

      for (const work of works) {
        const workId = work.slug || work.id;
        const charactersPath = path.join(DATA_DIR, type, workId, 'characters.json');
        if (!fs.existsSync(charactersPath)) continue;

        const charData = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
        const characters = charData.characters || charData || [];

        for (const char of characters) {
          if (!char.name) continue;

          const normalizedName = normalize(char.name);
          const nameWords = normalizedName.split(/\s+/);
          
          let bestScore = 0;
          let matchType = 'fuzzy';

          // 1. Match exato (score máximo)
          if (normalizedName === normalizedQuery) {
            bestScore = 1.0;
            matchType = 'exact';
          }
          // 2. Contém a query completa
          else if (normalizedName.includes(normalizedQuery)) {
            bestScore = 0.95;
            matchType = 'contains';
          }
          // 3. Começa com a query
          else if (normalizedName.startsWith(normalizedQuery)) {
            bestScore = 0.9;
            matchType = 'startsWith';
          }
          // 4. Similaridade fuzzy do nome completo
          else {
            const fullSimilarity = similarity(normalizedQuery, normalizedName);
            if (fullSimilarity > bestScore) {
              bestScore = fullSimilarity;
            }

            // 5. Verifica palavras individuais (nome parcial)
            for (const nameWord of nameWords) {
              for (const queryWord of queryWords) {
                if (nameWord.startsWith(queryWord)) {
                  const wordScore = 0.8 * (queryWord.length / nameWord.length);
                  if (wordScore > bestScore) {
                    bestScore = wordScore;
                    matchType = 'partialWord';
                  }
                }
                
                const wordSimilarity = similarity(queryWord, nameWord);
                if (wordSimilarity > bestScore && wordSimilarity > 0.7) {
                  bestScore = wordSimilarity * 0.85;
                  matchType = 'fuzzyWord';
                }
              }
            }
          }

          // Verifica nomes alternativos
          if (char.alt_names && Array.isArray(char.alt_names)) {
            for (const altName of char.alt_names) {
              const normalizedAlt = normalize(altName);
              
              if (normalizedAlt === normalizedQuery) {
                bestScore = Math.max(bestScore, 0.98);
                matchType = 'exactAlt';
              } else if (normalizedAlt.includes(normalizedQuery)) {
                bestScore = Math.max(bestScore, 0.93);
                matchType = 'containsAlt';
              } else {
                const altSimilarity = similarity(normalizedQuery, normalizedAlt);
                if (altSimilarity > bestScore) {
                  bestScore = altSimilarity * 0.9;
                  matchType = 'fuzzyAlt';
                }
              }
            }
          }

          // Adiciona se passa no threshold
          if (bestScore >= threshold) {
            results.push({
              character: char,
              work: {
                id: work.slug || work.id || 'unknown',
                slug: work.slug || work.id || 'unknown',
                type: work.type,
                title: work.title,
                cover_image: work.cover_image
              },
              score: bestScore,
              matchType
            });
          }
        }
      }
    }

    // Ordena por score (maior primeiro)
    results.sort((a, b) => b.score - a.score);

    // Limita resultados
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      query,
      total: limitedResults.length,
      threshold,
      results: limitedResults.map(r => ({
        ...r.character,
        work: r.work,
        _searchScore: r.score,
        _matchType: r.matchType
      }))
    });
  } catch (error) {
    console.error('Error searching characters:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
