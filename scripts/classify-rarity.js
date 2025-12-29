#!/usr/bin/env node

/**
 * Script para classificar a raridade dos personagens
 * Calcula baseado em:
 * - averageScore da obra (info.json)
 * - popularity da obra (info.json)
 * - role do personagem
 * 
 * Execute: node scripts/classify-rarity.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const WEB_DATA_DIR = path.join(__dirname, '..', 'web', 'public', 'data');
const TYPES = ['anime', 'manga', 'game'];

// Pesos para o cálculo de raridade
const WEIGHTS = {
  averageScore: 0.3,    // 30% do peso
  popularity: 0.4,      // 40% do peso
  role: 0.3             // 30% do peso
};

// Multiplicadores de role (quanto maior, melhor)
const ROLE_MULTIPLIERS = {
  protagonist: 1.0,
  deuteragonist: 0.85,
  antagonist: 0.9,
  supporting: 0.5,
  minor: 0.2,
  other: 0.1
};

// Limiares de raridade (percentis)
const RARITY_THRESHOLDS = {
  legendary: 0.95,  // Top 5%
  epic: 0.80,       // Top 20%
  rare: 0.55,       // Top 45%
  uncommon: 0.30,   // Top 70%
  common: 0         // Resto
};

// Estatísticas globais para normalização
let globalStats = {
  maxPopularity: 0,
  minPopularity: Infinity,
  maxScore: 0,
  minScore: Infinity,
  maxEpisodes: 0,
  minEpisodes: Infinity,
  maxCharacters: 0,
  minCharacters: Infinity,
  avgEpisodes: 0,
  avgCharacters: 0,
  totalWorks: 0,
  allScores: []
};

/**
 * Lê um arquivo JSON
 */
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Escreve um arquivo JSON
 */
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Coleta estatísticas globais de todas as obras
 */
function collectGlobalStats(dataDir) {
  console.log('📊 Coletando estatísticas globais...');
  
  let sumEpisodes = 0;
  let sumCharacters = 0;
  let countEpisodes = 0;
  let countCharacters = 0;
  
  for (const type of TYPES) {
    const typeDir = path.join(dataDir, type);
    if (!fs.existsSync(typeDir)) continue;
    
    const works = fs.readdirSync(typeDir).filter(f => {
      const stat = fs.statSync(path.join(typeDir, f));
      return stat.isDirectory();
    });
    
    for (const workSlug of works) {
      const infoPath = path.join(typeDir, workSlug, 'info.json');
      const charactersPath = path.join(typeDir, workSlug, 'characters.json');
      const info = readJson(infoPath);
      const charactersData = readJson(charactersPath);
      
      if (info) {
        globalStats.totalWorks++;
        
        const popularity = info.metadata?.popularity || info.popularity || 0;
        const score = info.metadata?.averageScore || info.averageScore || 0;
        
        // Coletar episódios
        const episodes = info.metadata?.episodes || info.episodes || 0;
        if (episodes > 0) {
          globalStats.maxEpisodes = Math.max(globalStats.maxEpisodes, episodes);
          globalStats.minEpisodes = Math.min(globalStats.minEpisodes, episodes);
          sumEpisodes += episodes;
          countEpisodes++;
        }
        
        // Coletar número de personagens
        if (charactersData) {
          const numChars = charactersData.count || (charactersData.characters?.length || 0);
          if (numChars > 0) {
            globalStats.maxCharacters = Math.max(globalStats.maxCharacters, numChars);
            globalStats.minCharacters = Math.min(globalStats.minCharacters, numChars);
            sumCharacters += numChars;
            countCharacters++;
          }
        }
        
        if (popularity > 0) {
          globalStats.maxPopularity = Math.max(globalStats.maxPopularity, popularity);
          globalStats.minPopularity = Math.min(globalStats.minPopularity, popularity);
        }
        
        if (score > 0) {
          globalStats.maxScore = Math.max(globalStats.maxScore, score);
          globalStats.minScore = Math.min(globalStats.minScore, score);
        }
      }
    }
  }
  
  // Calcular médias
  globalStats.avgEpisodes = countEpisodes > 0 ? sumEpisodes / countEpisodes : 0;
  globalStats.avgCharacters = countCharacters > 0 ? sumCharacters / countCharacters : 0;
  
  // Ajustar mínimos se não encontrou valores válidos
  if (globalStats.minPopularity === Infinity) globalStats.minPopularity = 0;
  if (globalStats.minScore === Infinity) globalStats.minScore = 0;
  if (globalStats.minEpisodes === Infinity) globalStats.minEpisodes = 0;
  if (globalStats.minCharacters === Infinity) globalStats.minCharacters = 0;
  
  console.log(`   Max Popularity: ${globalStats.maxPopularity}`);
  console.log(`   Min Popularity: ${globalStats.minPopularity}`);
  console.log(`   Max Score: ${globalStats.maxScore}`);
  console.log(`   Min Score: ${globalStats.minScore}`);
  console.log(`   Episodes: ${Math.round(globalStats.minEpisodes)}-${Math.round(globalStats.maxEpisodes)} (avg: ${Math.round(globalStats.avgEpisodes)})`);
  console.log(`   Characters: ${Math.round(globalStats.minCharacters)}-${Math.round(globalStats.maxCharacters)} (avg: ${Math.round(globalStats.avgCharacters)})`);
}

/**
 * Normaliza um valor entre 0 e 1
 */
function normalize(value, min, max) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Calcula o fator de escala baseado no tamanho da obra
 * Cria um GRADIENTE PROGRESSIVO em vez de corte abrupto
 * Obras maiores terão seus personagens distribuídos ao longo do ranking
 * 
 * @param {number} numEpisodes - Número de episódios da obra
 * @param {number} numCharacters - Número de personagens da obra
 * @param {string} role - Role do personagem (protagonist, etc)
 * @returns {number} Fator de escala entre 0.7 e 1.15
 */
function calculateScaleFactor(numEpisodes, numCharacters, role) {
  const avgEps = globalStats.avgEpisodes || 24;
  const avgChars = globalStats.avgCharacters || 30;
  
  // Razão em relação à média
  const episodeRatio = numEpisodes > 0 ? numEpisodes / avgEps : 1.0;
  const characterRatio = numCharacters > 0 ? numCharacters / avgChars : 1.0;
  
  // Usar logaritmo para suavizar a curva
  const episodeLog = Math.log10(Math.max(episodeRatio, 0.1));
  const characterLog = Math.log10(Math.max(characterRatio, 0.1));
  
  // Dar mais peso ao número de personagens (70%) vs episódios (30%)
  const combinedLog = (episodeLog * 0.3) + (characterLog * 0.7);
  
  // GRADIENTE MAIS SUAVE: penaliza menos os protagonistas
  // Mantém personagens icônicos de obras grandes no topo
  // Mas distribui melhor os secundários
  
  let baseReduction;
  if (combinedLog <= 0) {
    // Obra menor que média: leve boost
    baseReduction = combinedLog * 0.05;
  } else if (combinedLog <= 0.7) {
    // Obra até 5x maior: redução muito leve (5-8%)
    baseReduction = combinedLog * 0.08;
  } else if (combinedLog <= 1.3) {
    // Obra até 20x maior: redução moderada (8-15%)
    baseReduction = 0.056 + (combinedLog - 0.7) * 0.12;
  } else {
    // Obra muito grande (>20x): redução maior (15-22% máximo)
    baseReduction = 0.128 + (combinedLog - 1.3) * 0.10;
    baseReduction = Math.min(0.22, baseReduction);
  }
  
  // Protagonistas e deuteragonistas mantêm força máxima
  // Personagens principais sofrem penalização leve
  // Supporting sofre penalização MUITO FORTE proporcional ao tamanho da obra
  let roleBonus;
  if (role === 'protagonist') {
    roleBonus = 0.22; // Protagonistas sempre fortes
  } else if (role === 'deuteragonist') {
    roleBonus = 0.17; // Deuteragonistas também mantêm força
  } else if (role === 'main') {
    roleBonus = 0.10; // Personagens principais com bônus moderado
  } else {
    // Supporting: penalização MUITO FORTE (15-35% extra baseado no tamanho da obra)
    // Obras com 200+ personagens terão supporting fortemente penalizados
    roleBonus = -Math.min(0.35, combinedLog * 0.28);
  }
  
  const scaleFactor = Math.max(0.55, Math.min(1.15, 1.0 - baseReduction + roleBonus));
  
  return scaleFactor;
}

/**
 * Calcula o score de raridade de um personagem
 * Retorna um valor entre 0 e 1
 */
function calculateRarityScore(character, workInfo, numCharacters) {
  const popularity = workInfo.metadata?.popularity || workInfo.popularity || 0;
  const averageScore = workInfo.metadata?.averageScore || workInfo.averageScore || 0;
  const episodes = workInfo.metadata?.episodes || workInfo.episodes || 0;
  const role = character.role || 'other';
  
  // Normalizar valores
  const normalizedPopularity = normalize(
    popularity, 
    globalStats.minPopularity, 
    globalStats.maxPopularity
  );
  
  const normalizedScore = normalize(
    averageScore,
    globalStats.minScore,
    globalStats.maxScore
  );
  
  const roleMultiplier = ROLE_MULTIPLIERS[role] || ROLE_MULTIPLIERS.other;
  
  // Calcular score base ponderado
  const baseScore = (
    (normalizedPopularity * WEIGHTS.popularity) +
    (normalizedScore * WEIGHTS.averageScore) +
    (roleMultiplier * WEIGHTS.role)
  );
  
  // Aplicar fator de escala GRADIENTE baseado no tamanho da obra
  const scaleFactor = calculateScaleFactor(episodes, numCharacters, role);
  const finalScore = baseScore * scaleFactor;
  
  return finalScore;
}

/**
 * Determina a raridade baseada no score
 */
function determineRarity(score, allScores) {
  // Calcular o percentil do score
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const rank = sortedScores.filter(s => s <= score).length;
  const percentile = rank / sortedScores.length;
  
  if (percentile >= RARITY_THRESHOLDS.legendary) return 'legendary';
  if (percentile >= RARITY_THRESHOLDS.epic) return 'epic';
  if (percentile >= RARITY_THRESHOLDS.rare) return 'rare';
  if (percentile >= RARITY_THRESHOLDS.uncommon) return 'uncommon';
  return 'common';
}

/**
 * Processa uma única obra
 */
function processWork(typeDir, workSlug, allScores) {
  const workDir = path.join(typeDir, workSlug);
  const infoPath = path.join(workDir, 'info.json');
  const charactersPath = path.join(workDir, 'characters.json');
  
  const info = readJson(infoPath);
  const characters = readJson(charactersPath);
  
  if (!info || !characters) return { processed: 0, characters: [] };
  
  const numCharacters = characters.count || (characters.characters?.length || 0);
  
  let processed = 0;
  const characterResults = [];
  
  for (const character of characters.characters || []) {
    const score = calculateRarityScore(character, info, numCharacters);
    allScores.push(score);
    
    characterResults.push({
      character,
      score,
      workInfo: info,
      workSlug,
      type: info.type,
      numCharacters
    });
    processed++;
  }
  
  return { processed, characters: characterResults };
}

/**
 * Atualiza os personagens com a raridade calculada
 */
function updateCharactersWithRarity(dataDir, allCharacterResults) {
  console.log('\n📝 Atualizando personagens com raridade...');
  
  // Extrair apenas os scores para cálculo de percentil
  const allScores = allCharacterResults.map(r => r.score);
  
  // Agrupar por obra
  const byWork = {};
  for (const result of allCharacterResults) {
    const key = `${result.type}/${result.workSlug}`;
    if (!byWork[key]) byWork[key] = [];
    byWork[key].push(result);
  }
  
  let updatedWorks = 0;
  let updatedCharacters = 0;
  
  for (const [key, results] of Object.entries(byWork)) {
    const [type, workSlug] = key.split('/');
    const charactersPath = path.join(dataDir, type, workSlug, 'characters.json');
    const charactersData = readJson(charactersPath);
    
    if (!charactersData) continue;
    
    // Criar mapa de raridades
    const rarityMap = {};
    for (const result of results) {
      const rarity = determineRarity(result.score, allScores);
      rarityMap[result.character.id] = { rarity, score: result.score };
    }
    
    // Atualizar personagens
    for (const character of charactersData.characters) {
      const rarityInfo = rarityMap[character.id];
      if (rarityInfo) {
        character.rarity = rarityInfo.rarity;
        updatedCharacters++;
      }
    }
    
    // Salvar arquivo atualizado
    writeJson(charactersPath, charactersData);
    updatedWorks++;
  }
  
  return { updatedWorks, updatedCharacters };
}

/**
 * Consolida personagens duplicados de diferentes versões da mesma obra
 * Mantém apenas a versão mais popular
 */
function consolidateDuplicateWorks(allCharacterResults) {
  console.log('\n🔄 Consolidando versões duplicadas...');
  
  // Agrupar por workTitle normalizado (remove números, "season", etc)
  const workGroups = {};
  const workStats = {};
  
  for (const result of allCharacterResults) {
    const workKey = `${result.type}/${result.workSlug}`;
    
    if (!workStats[workKey]) {
      workStats[workKey] = {
        workSlug: result.workSlug,
        workTitle: result.workInfo.title,
        type: result.type,
        popularity: result.workInfo.metadata?.popularity || result.workInfo.popularity || 0,
        numCharacters: result.numCharacters || 0
      };
    }
    
    // Normalizar título: remove sufixos de temporadas, arcos, filmes, etc
    let baseTitle = result.workInfo.title
      // Remove hífen seguido de texto entre hífens (ex: "-Kimetsu no Yaiba-")
      .replace(/\s*-[^-]+-\s*/g, ' ')
      // Remove tudo após ":" que seja sufixo de temporada/arco/filme
      .replace(/\s*:\s*(Season|Part|Final Season|The Movie|Movie|OVA|Special).*$/gi, '')
      // Remove sufixos comuns de arcos/temporadas (sem dois pontos)
      .replace(/\s+(Entertainment District|Hashira Training|Mugen Train|Swordsmith Village|War of Underworld|Alicization|Phantom Blood|Battle Tendency|Stardust Crusaders|Diamond is Unbreakable|Golden Wind|Stone Ocean|Steel Ball Run|Jojolion)\s*(Arc|Part)?.*$/gi, '')
      // Remove padrões genéricos de arc/season/part (incluindo "Final")
      .replace(/\s+(Final\s+)?(Season|Part|Arc)\s+(\d+|Two|Three|One|II|III|IV|V|VI|Final).*$/gi, '')
      .replace(/\s+Final\s+Season.*$/gi, '')
      // Remove números romanos no final
      .replace(/\s+(I{1,3}|IV|V|VI{1,3}|IX|X|XI|XII)$/gi, '')
      // Remove números no final
      .replace(/\s*\d+(st|nd|rd|th)?\s*(Season|Part)?$/gi, '')
      // Normaliza espaços múltiplos
      .replace(/\s+/g, ' ')
      .trim();
    
    const groupKey = `${result.type}/${baseTitle}`;
    
    if (!workGroups[groupKey]) {
      workGroups[groupKey] = [];
    }
    
    if (!workGroups[groupKey].find(w => w.workSlug === result.workSlug)) {
      workGroups[groupKey].push(workStats[workKey]);
    }
  }
  
  // Para cada grupo, identificar a versão mais popular
  const excludedWorks = new Set();
  let consolidatedCount = 0;
  
  for (const [groupKey, versions] of Object.entries(workGroups)) {
    if (versions.length > 1) {
      // Ordenar por popularidade
      versions.sort((a, b) => b.popularity - a.popularity);
      const mostPopular = versions[0];
      
      console.log(`   📌 ${versions[0].workTitle.replace(/\s*:?\s*(Season|Part|Final Season).*$/gi, '').trim()}: ${versions.length} versões → usando "${mostPopular.workTitle}"`);
      
      // Marcar todas as outras versões para exclusão
      for (let i = 1; i < versions.length; i++) {
        excludedWorks.add(versions[i].workSlug);
        consolidatedCount++;
      }
    }
  }
  
  console.log(`   ✅ Consolidadas ${consolidatedCount} obras duplicadas\n`);
  
  // Filtrar resultados: remover personagens de obras duplicadas
  const filtered = allCharacterResults.filter(result => {
    return !excludedWorks.has(result.workSlug);
  });
  
  console.log(`   📊 ${allCharacterResults.length} → ${filtered.length} personagens (${consolidatedCount} obras removidas)`);
  
  return filtered;
}

/**
 * Gera o arquivo de ranking global
 */
function generateRanking(allCharacterResults) {
  console.log('\n🏆 Gerando ranking global...');
  
  const allScores = allCharacterResults.map(r => r.score);
  
  // Calcular raridade e ordenar por score
  const rankedCharacters = allCharacterResults.map(result => ({
    id: result.character.id,
    name: result.character.name,
    workId: result.workSlug,
    workTitle: result.workInfo.title,
    workType: result.type,
    role: result.character.role || 'other',
    score: Math.round(result.score * 10000) / 100, // Porcentagem com 2 decimais
    rarity: determineRarity(result.score, allScores),
    image: result.character.images?.[0]?.url || null
  })).sort((a, b) => b.score - a.score);
  
  // Adicionar posição no ranking
  rankedCharacters.forEach((char, index) => {
    char.rank = index + 1;
  });
  
  const ranking = {
    generated_at: new Date().toISOString(),
    total_characters: rankedCharacters.length,
    distribution: {
      legendary: rankedCharacters.filter(c => c.rarity === 'legendary').length,
      epic: rankedCharacters.filter(c => c.rarity === 'epic').length,
      rare: rankedCharacters.filter(c => c.rarity === 'rare').length,
      uncommon: rankedCharacters.filter(c => c.rarity === 'uncommon').length,
      common: rankedCharacters.filter(c => c.rarity === 'common').length
    },
    characters: rankedCharacters
  };
  
  return ranking;
}

/**
 * Função principal
 */
async function main() {
  console.log('🎯 Classificador de Raridade de Personagens');
  console.log('==========================================\n');
  
  // Verificar qual diretório usar
  const dataDirExists = fs.existsSync(DATA_DIR);
  const webDataDirExists = fs.existsSync(WEB_DATA_DIR);
  
  const dirsToProcess = [];
  if (dataDirExists) dirsToProcess.push(DATA_DIR);
  if (webDataDirExists) dirsToProcess.push(WEB_DATA_DIR);
  
  if (dirsToProcess.length === 0) {
    console.error('❌ Nenhum diretório de dados encontrado!');
    process.exit(1);
  }
  
  console.log(`📁 Diretórios a processar: ${dirsToProcess.join(', ')}\n`);
  
  for (const dataDir of dirsToProcess) {
    console.log(`\n📂 Processando: ${dataDir}`);
    console.log('─'.repeat(50));
    
    // Coletar estatísticas globais
    collectGlobalStats(dataDir);
    
    // Primeira passagem: coletar todos os scores
    console.log('\n🔍 Primeira passagem: coletando scores...');
    
    const allCharacterResults = [];
    let totalWorks = 0;
    let totalCharacters = 0;
    
    for (const type of TYPES) {
      const typeDir = path.join(dataDir, type);
      if (!fs.existsSync(typeDir)) {
        console.log(`   ⚠️ Tipo ${type} não encontrado`);
        continue;
      }
      
      const works = fs.readdirSync(typeDir).filter(f => {
        const fullPath = path.join(typeDir, f);
        return fs.statSync(fullPath).isDirectory() && f !== 'index.json';
      });
      
      console.log(`   📁 ${type}: ${works.length} obras`);
      
      for (const workSlug of works) {
        const result = processWork(typeDir, workSlug, []);
        if (result.processed > 0) {
          totalWorks++;
          totalCharacters += result.processed;
          allCharacterResults.push(...result.characters);
        }
      }
    }
    
    console.log(`\n   ✅ Total: ${totalWorks} obras, ${totalCharacters} personagens`);
    
    // Consolidar versões duplicadas antes de atualizar raridades
    const consolidatedResults = consolidateDuplicateWorks(allCharacterResults);
    
    // Segunda passagem: atualizar com raridades
    const updateResult = updateCharactersWithRarity(dataDir, consolidatedResults);
    console.log(`   ✅ Atualizados: ${updateResult.updatedWorks} obras, ${updateResult.updatedCharacters} personagens`);
    
    // Gerar ranking
    const ranking = generateRanking(consolidatedResults);
    const rankingPath = path.join(dataDir, 'character-ranking.json');
    writeJson(rankingPath, ranking);
    console.log(`   ✅ Ranking salvo em: ${rankingPath}`);
    
    // Mostrar distribuição
    console.log('\n📊 Distribuição de Raridades:');
    console.log(`   🟡 Legendary: ${ranking.distribution.legendary} (${(ranking.distribution.legendary / ranking.total_characters * 100).toFixed(1)}%)`);
    console.log(`   🟣 Epic: ${ranking.distribution.epic} (${(ranking.distribution.epic / ranking.total_characters * 100).toFixed(1)}%)`);
    console.log(`   🔵 Rare: ${ranking.distribution.rare} (${(ranking.distribution.rare / ranking.total_characters * 100).toFixed(1)}%)`);
    console.log(`   🟢 Uncommon: ${ranking.distribution.uncommon} (${(ranking.distribution.uncommon / ranking.total_characters * 100).toFixed(1)}%)`);
    console.log(`   ⚪ Common: ${ranking.distribution.common} (${(ranking.distribution.common / ranking.total_characters * 100).toFixed(1)}%)`);
    
    // Top 10
    console.log('\n🏆 Top 10 Personagens:');
    ranking.characters.slice(0, 10).forEach((char, i) => {
      const rarityEmoji = {
        legendary: '🟡',
        epic: '🟣',
        rare: '🔵',
        uncommon: '🟢',
        common: '⚪'
      }[char.rarity];
      console.log(`   ${i + 1}. ${rarityEmoji} ${char.name} (${char.workTitle}) - Score: ${char.score}%`);
    });
  }
  
  console.log('\n✅ Classificação concluída!');
}

// Executar
main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
