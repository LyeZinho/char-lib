#!/usr/bin/env node

/**
 * Teste das novas funções da API - Versão Node.js
 * Execute: node scripts/test-api-node.js
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

// Função auxiliar para ler JSON
function readJson(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Erro ao ler ${filePath}: ${error.message}`);
  }
}

// Simulação das funções da API (versão simplificada para Node.js)
async function listWorks() {
  const types = ['anime', 'manga', 'game'];
  const works = [];

  for (const type of types) {
    try {
      const indexPath = join(DATA_DIR, type, 'index.json');
      const typeWorks = readJson(indexPath);
      works.push(...typeWorks.map(w => ({ ...w, type })));
    } catch (error) {
      console.warn(`Erro ao carregar obras de ${type}:`, error.message);
    }
  }

  return works;
}

async function getWorkCharacters(type, slug) {
  try {
    const charactersPath = join(DATA_DIR, type, slug, 'characters.json');
    const data = readJson(charactersPath);
    return data.characters || [];
  } catch (error) {
    throw new Error(`Erro ao buscar personagens: ${error.message}`);
  }
}

async function getRandomCharacter(type, workSlug) {
  try {
    const characters = await getWorkCharacters(type, workSlug);
    if (characters.length === 0) throw new Error('Nenhum personagem encontrado nesta obra');

    const randomIndex = Math.floor(Math.random() * characters.length);
    const character = characters[randomIndex];

    // Buscar info da obra
    const infoPath = join(DATA_DIR, type, workSlug, 'info.json');
    const workInfo = readJson(infoPath);

    return {
      ...character,
      work: {
        title: workInfo.title,
        slug: workSlug,
        type: type
      }
    };
  } catch (error) {
    throw new Error(`Erro ao buscar personagem aleatório: ${error.message}`);
  }
}

async function getRandomCharacterGlobal() {
  try {
    const allWorks = await listWorks();
    if (allWorks.length === 0) throw new Error('Nenhuma obra encontrada');

    // Escolher uma obra aleatória
    const randomWorkIndex = Math.floor(Math.random() * allWorks.length);
    const work = allWorks[randomWorkIndex];

    // Buscar personagem aleatório dessa obra
    return await getRandomCharacter(work.type, work.slug);
  } catch (error) {
    throw new Error(`Erro ao buscar personagem aleatório global: ${error.message}`);
  }
}

async function searchWorksByGenre(genre) {
  const allWorks = await listWorks();
  const lowerGenre = genre.toLowerCase();

  return allWorks.filter(work =>
    work.genres?.some(g => g.toLowerCase().includes(lowerGenre))
  );
}

async function searchWorksByStatus(status) {
  const allWorks = await listWorks();
  const upperStatus = status.toUpperCase();

  return allWorks.filter(work => work.status === upperStatus);
}

async function searchWorksByYear(year) {
  const allWorks = await listWorks();

  return allWorks.filter(work => {
    const startYear = work.startDate ? new Date(work.startDate).getFullYear() : null;
    const endYear = work.endDate ? new Date(work.endDate).getFullYear() : null;
    return startYear === year || endYear === year;
  });
}

async function searchCharactersByRole(role) {
  const allWorks = await listWorks();
  const results = [];
  const lowerRole = role.toLowerCase();

  for (const work of allWorks) {
    try {
      const characters = await getWorkCharacters(work.type, work.slug);
      const matchingChars = characters.filter(char =>
        char.role?.toLowerCase().includes(lowerRole)
      );

      results.push(...matchingChars.map(char => ({
        ...char,
        work: {
          title: work.title,
          slug: work.slug,
          type: work.type
        }
      })));
    } catch (error) {
      continue;
    }
  }

  return results;
}

async function searchCharactersByGender(gender) {
  const allWorks = await listWorks();
  const results = [];
  const lowerGender = gender.toLowerCase();

  for (const work of allWorks) {
    try {
      const characters = await getWorkCharacters(work.type, work.slug);
      const matchingChars = characters.filter(char =>
        char.metadata?.gender?.toLowerCase().includes(lowerGender)
      );

      results.push(...matchingChars.map(char => ({
        ...char,
        work: {
          title: work.title,
          slug: work.slug,
          type: work.type
        }
      })));
    } catch (error) {
      continue;
    }
  }

  return results;
}

async function getStats() {
  try {
    const allWorks = await listWorks();
    let totalCharacters = 0;
    const worksByType = { anime: 0, manga: 0, game: 0 };
    const charactersByRole = {};
    const charactersByGender = {};

    for (const work of allWorks) {
      worksByType[work.type] = (worksByType[work.type] || 0) + 1;

      try {
        const characters = await getWorkCharacters(work.type, work.slug);
        totalCharacters += characters.length;

        characters.forEach(char => {
          const role = char.role || 'unknown';
          charactersByRole[role] = (charactersByRole[role] || 0) + 1;

          const gender = char.metadata?.gender || 'unknown';
          charactersByGender[gender] = (charactersByGender[gender] || 0) + 1;
        });
      } catch (error) {
        continue;
      }
    }

    return {
      totalWorks: allWorks.length,
      totalCharacters,
      worksByType,
      charactersByRole,
      charactersByGender
    };
  } catch (error) {
    throw new Error(`Erro ao calcular estatísticas: ${error.message}`);
  }
}

// Função principal de teste
async function testNewApiFunctions() {
  console.log('🧪 Testando novas funções da API (Node.js)...\n');

  try {
    // Teste personagem aleatório de uma obra específica
    console.log('1. Personagem aleatório de "A Silent Voice":');
    const randomChar = await getRandomCharacter('anime', 'a-silent-voice');
    console.log(`   ${randomChar.name} (${randomChar.role})`);
    console.log(`   Obra: ${randomChar.work.title}\n`);

    // Teste personagem aleatório global
    console.log('2. Personagem aleatório global:');
    const randomGlobalChar = await getRandomCharacterGlobal();
    console.log(`   ${randomGlobalChar.name} (${randomGlobalChar.role})`);
    console.log(`   Obra: ${randomGlobalChar.work.title}\n`);

    // Teste busca por gênero
    console.log('3. Obras do gênero "Drama":');
    const dramaWorks = await searchWorksByGenre('Drama');
    console.log(`   Encontradas: ${dramaWorks.length} obras`);
    if (dramaWorks.length > 0) {
      console.log(`   Exemplo: ${dramaWorks[0].title}\n`);
    }

    // Teste busca por status
    console.log('4. Obras finalizadas:');
    const finishedWorks = await searchWorksByStatus('FINISHED');
    console.log(`   Encontradas: ${finishedWorks.length} obras\n`);

    // Teste busca por ano
    console.log('5. Obras de 2016:');
    const works2016 = await searchWorksByYear(2016);
    console.log(`   Encontradas: ${works2016.length} obras`);
    if (works2016.length > 0) {
      console.log(`   Exemplo: ${works2016[0].title}\n`);
    }

    // Teste busca personagens por papel
    console.log('6. Personagens protagonistas:');
    const protagonists = await searchCharactersByRole('protagonist');
    console.log(`   Encontrados: ${protagonists.length} personagens`);
    if (protagonists.length > 0) {
      console.log(`   Exemplo: ${protagonists[0].name} de ${protagonists[0].work.title}\n`);
    }

    // Teste busca personagens por gênero
    console.log('7. Personagens femininos:');
    const femaleChars = await searchCharactersByGender('female');
    console.log(`   Encontrados: ${femaleChars.length} personagens`);
    if (femaleChars.length > 0) {
      console.log(`   Exemplo: ${femaleChars[0].name} de ${femaleChars[0].work.title}\n`);
    }

    // Teste estatísticas
    console.log('8. Estatísticas gerais:');
    const stats = await getStats();
    console.log(`   Total de obras: ${stats.totalWorks}`);
    console.log(`   Total de personagens: ${stats.totalCharacters}`);
    console.log(`   Obras por tipo:`, stats.worksByType);
    console.log(`   Personagens por papel:`, stats.charactersByRole);
    console.log(`   Personagens por gênero:`, stats.charactersByGender);

    console.log('\n✅ Todos os testes passaram!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testNewApiFunctions();