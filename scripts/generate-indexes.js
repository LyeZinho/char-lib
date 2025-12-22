#!/usr/bin/env node

/**
 * Script para gerar arquivos index.json para cada tipo de obra
 * Usado pela API estática do frontend
 */

import { readdir } from 'fs/promises';
import { stat } from 'fs/promises';
import { join } from 'path';
import { readJson, writeJson } from '../src/utils/file.js';

const DATA_DIR = './data';
const TYPES = ['anime', 'manga', 'game'];

async function generateIndexes() {
  console.log('🔨 Gerando índices para a API estática...\n');

  const databaseStats = {
    generated_at: new Date().toISOString(),
    types: {},
    total_works: 0,
    total_characters: 0,
    total_genres: 0,
    average_score: 0,
    // Novas informações
    database_info: {
      first_import: null,
      last_import: null,
      total_file_size: 0,
      average_characters_per_work: 0
    },
    distribution: {
      by_status: {},
      by_source: {},
      top_genres: [],
      by_format: {}
    },
    performance: {
      last_updated_by_type: {}
    }
  };

  let allScores = [];
  let allGenres = new Map();
  let statusCount = {};
  let sourceCount = {};
  let formatCount = {};
  let firstImport = null;
  let lastImport = null;
  let totalFileSize = 0;

  for (const type of TYPES) {
    const typeDir = join(DATA_DIR, type);
    
    try {
      const entries = await readdir(typeDir, { withFileTypes: true });
      const works = [];
      let typeCharacters = 0;
      let typeGenres = new Set();

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const slug = entry.name;
        const infoPath = join(typeDir, slug, 'info.json');
        const charactersPath = join(typeDir, slug, 'characters.json');

        try {
          const info = await readJson(infoPath);
          
          // Coletar informações de data
          const createdAt = new Date(info.created_at || info.updated_at);
          const updatedAt = new Date(info.updated_at);

          if (!firstImport || createdAt < firstImport) {
            firstImport = createdAt;
          }
          if (!lastImport || updatedAt > lastImport) {
            lastImport = updatedAt;
          }

          // Calcular tamanho dos arquivos
          try {
            const infoStats = await stat(infoPath);
            totalFileSize += infoStats.size;
          } catch {}

          // Contar personagens desta obra
          let workCharacters = 0;
          try {
            const charactersData = await readJson(charactersPath);
            workCharacters = charactersData.characters?.length || 0;
            typeCharacters += workCharacters;

            // Tamanho do arquivo de personagens
            try {
              const charsStats = await stat(charactersPath);
              totalFileSize += charsStats.size;
            } catch {}
          } catch {
            // Arquivo de personagens não existe
          }

          // Coletar gêneros
          if (info.metadata?.genres) {
            info.metadata.genres.forEach(genre => {
              typeGenres.add(genre);
              allGenres.set(genre, (allGenres.get(genre) || 0) + 1);
            });
          }

          // Coletar scores para média
          if (info.metadata?.averageScore) {
            allScores.push(info.metadata.averageScore);
          }

          // Distribuição por status
          const status = info.metadata?.status || 'unknown';
          statusCount[status] = (statusCount[status] || 0) + 1;

          // Distribuição por fonte
          const source = info.source || 'unknown';
          sourceCount[source] = (sourceCount[source] || 0) + 1;

          // Distribuição por formato
          const format = info.metadata?.format || 'unknown';
          formatCount[format] = (formatCount[format] || 0) + 1;

          works.push({
            slug,
            title: info.title,
            title_romaji: info.title_romaji,
            title_english: info.title_english,
            title_native: info.title_native,
            cover_image: info.images?.[0]?.url,
            format: info.metadata?.format,
            status: info.metadata?.status,
            description: info.description?.substring(0, 200),
            genres: info.metadata?.genres,
            average_score: info.metadata?.averageScore,
            characters_count: workCharacters,
            source: info.source,
            created_at: info.created_at,
            updated_at: info.updated_at,
            type
          });
        } catch (error) {
          console.warn(`⚠️  Erro ao ler ${slug}: ${error.message}`);
        }
      }

      const indexPath = join(typeDir, 'index.json');
      await writeJson(indexPath, works);
      
      // Atualizar estatísticas do tipo
      databaseStats.types[type] = {
        works_count: works.length,
        characters_count: typeCharacters,
        genres_count: typeGenres.size
      };

      databaseStats.total_works += works.length;
      databaseStats.total_characters += typeCharacters;
      databaseStats.total_genres += typeGenres.size;

      console.log(`✅ ${type}: ${works.length} obras, ${typeCharacters} personagens indexados`);
    } catch (error) {
      console.error(`❌ Erro ao processar ${type}: ${error.message}`);
    }
  }

  // Calcular score médio geral
  if (allScores.length > 0) {
    databaseStats.average_score = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
  }

  // Calcular média de personagens por obra
  if (databaseStats.total_works > 0) {
    databaseStats.database_info.average_characters_per_work = Math.round(
      (databaseStats.total_characters / databaseStats.total_works) * 100
    ) / 100;
  }

  // Informações da database
  databaseStats.database_info.first_import = firstImport?.toISOString() || null;
  databaseStats.database_info.last_import = lastImport?.toISOString() || null;
  databaseStats.database_info.total_file_size = totalFileSize;

  // Distribuições
  databaseStats.distribution.by_status = statusCount;
  databaseStats.distribution.by_source = sourceCount;
  databaseStats.distribution.by_format = formatCount;

  // Top 10 gêneros mais comuns
  databaseStats.distribution.top_genres = Array.from(allGenres.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({ genre, count }));

  // Última atualização por tipo
  databaseStats.performance.last_updated_by_type = {};
  for (const type of TYPES) {
    const typeDir = join(DATA_DIR, type);
    try {
      const entries = await readdir(typeDir, { withFileTypes: true });
      let latestUpdate = null;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const infoPath = join(typeDir, entry.name, 'info.json');
        try {
          const info = await readJson(infoPath);
          const updatedAt = new Date(info.updated_at);
          if (!latestUpdate || updatedAt > latestUpdate) {
            latestUpdate = updatedAt;
          }
        } catch {}
      }

      if (latestUpdate) {
        databaseStats.performance.last_updated_by_type[type] = latestUpdate.toISOString();
      }
    } catch {}
  }

  // Salvar estatísticas da database
  const statsPath = join(DATA_DIR, 'database-stats.json');
  await writeJson(statsPath, databaseStats);
  console.log(`📊 Estatísticas salvas em database-stats.json`);

  console.log('\n📈 Resumo da Database:');
  console.log(`   📚 ${databaseStats.total_works} obras totais`);
  console.log(`   👥 ${databaseStats.total_characters.toLocaleString()} personagens totais`);
  console.log(`   🏷️  ${databaseStats.total_genres} gêneros únicos`);
  console.log(`   ⭐ Score médio: ${databaseStats.average_score}`);
  console.log(`   📊 Média de personagens/obra: ${databaseStats.database_info.average_characters_per_work}`);
  console.log(`   💾 Tamanho total: ${(databaseStats.database_info.total_file_size / 1024 / 1024).toFixed(2)} MB`);

  if (databaseStats.database_info.first_import) {
    console.log(`   🕐 Primeiro import: ${new Date(databaseStats.database_info.first_import).toLocaleDateString('pt-BR')}`);
  }
  if (databaseStats.database_info.last_import) {
    console.log(`   🔄 Último import: ${new Date(databaseStats.database_info.last_import).toLocaleDateString('pt-BR')}`);
  }

  console.log('\n📊 Distribuição por Status:');
  Object.entries(databaseStats.distribution.by_status).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log('\n🎯 Top 5 Gêneros:');
  databaseStats.distribution.top_genres.slice(0, 5).forEach(({ genre, count }, index) => {
    console.log(`   ${index + 1}. ${genre}: ${count} obras`);
  });

  console.log('\n✨ Índices e estatísticas gerados com sucesso!');
}

generateIndexes().catch(console.error);
