#!/usr/bin/env node

/**
 * Exemplo: AutoCrawl com Enrichment Automático para Jogos
 * Demonstra como o sistema agora ativa automaticamente o Fandom Scraper para jogos
 */

import { createAutoCrawlJob } from '../src/jobs/autoCrawl.js';
import { logger } from '../src/utils/logger.js';

async function demoAutoCrawlGames() {
  logger.info('🎮 Demo: AutoCrawl com Enrichment Automático para Jogos\n');

  logger.info('Este exemplo demonstra como o AutoCrawl agora:');
  logger.info('1. Descobre jogos populares via RAWG');
  logger.info('2. Ativa enrichment automaticamente para cada jogo');
  logger.info('3. Busca wikis no Fandom via DuckDuckGo');
  logger.info('4. Extrai personagens via MediaWiki API + Cheerio');
  logger.info('5. Salva dados normalizados no schema padrão\n');

  // Criar job de AutoCrawl para jogos
  const crawlJob = createAutoCrawlJob({
    baseDir: './data',
    type: 'game',           // Tipo: game (ativa enrichment automaticamente)
    maxWorks: 2,            // Processar apenas 2 jogos para demo
    characterLimit: 10,     // Limitar personagens por jogo
    delayBetweenImports: 5000, // 5s entre jogos
    delayBetweenPages: 1000
  });

  try {
    logger.info('🚀 Iniciando AutoCrawl para jogos...\n');

    // Executar o crawling
    const result = await crawlJob.run();

    logger.success('✅ AutoCrawl concluído!\n');

    logger.info('📊 Resultados:');
    logger.info(`   Jogos processados: ${result.processed}`);
    logger.info(`   Personagens totais: ${result.totalCharacters}`);
    logger.info(`   Tempo total: ${result.duration}ms\n`);

    logger.info('🎯 O que aconteceu automaticamente:');
    logger.info('   ✓ RAWG API: Jogos populares descobertos');
    logger.info('   ✓ Enrichment ativado: Para cada jogo');
    logger.info('   ✓ DuckDuckGo: Wikis do Fandom localizadas');
    logger.info('   ✓ MediaWiki API: Personagens listados');
    logger.info('   ✓ Cheerio: Dados estruturados extraídos');
    logger.info('   ✓ Schema: Personagens normalizados salvos\n');

    logger.info('💡 Para ver os dados:');
    logger.info('   node src/cli.js list game');
    logger.info('   node src/cli.js stats game <nome-do-jogo>');
    logger.info('   node src/cli.js search "<personagem>" --type game --work <nome-do-jogo>');

  } catch (error) {
    logger.error(`❌ Erro no AutoCrawl: ${error.message}`);
  }
}

// Executar demo
demoAutoCrawlGames();
