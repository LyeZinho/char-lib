#!/usr/bin/env node

import { config } from 'dotenv';
config(); // Carrega variáveis do .env

import { Command } from 'commander';
import inquirer from 'inquirer';
import { createImportJob } from './jobs/importWork.js';
import { createAutoCrawlJob } from './jobs/autoCrawl.js';
import { createUpdateJob } from './jobs/updateWork.js';
import { createWriter } from './writers/jsonWriter.js';
import { createValidator } from './utils/validator.js';
import { logger } from './utils/logger.js';
import { readJson } from './utils/file.js';
import { join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Delay helper
 * @param {number} ms - Milissegundos
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Copia diretório recursivamente
 * @param {string} src - Diretório origem
 * @param {string} dest - Diretório destino
 */
async function copyDir(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

const program = new Command();

program
  .name('char-lib')
  .description('Character Library - Database local de personagens')
  .version('1.0.0');

/**
 * Comando: import
 * Importa uma obra e seus personagens
 */
program
  .command('import')
  .description('Importa uma obra (anime, manga, game, etc.)')
  .argument('<type>', 'Tipo da obra (anime, manga, game)')
  .argument('[search]', 'Nome, ID ou slug da obra')
  .option('-s, --source <source>', 'Fonte dos dados (auto-detecta se não especificado)')
  .option('--id <id>', 'ID direto da obra na fonte')
  .option('--slug <slug>', 'Slug da obra (para RAWG)')
  .option('--skip-characters', 'Importar apenas informações da obra')
  .option('--limit <number>', 'Limite de personagens/criadores', parseInt)
  .option('--delay <ms>', 'Delay entre páginas em ms (padrão: 1000)', parseInt)
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (type, search, options) => {
    try {
      // Detectar se search é um ID numérico
      const isNumeric = /^\d+$/.test(search);
      const criteria = {
        search: isNumeric ? undefined : search,
        id: isNumeric ? parseInt(search) : (options.id ? parseInt(options.id) : undefined),
        slug: options.slug,
        type: type
      };

      const job = createImportJob({ 
        baseDir: options.baseDir,
        source: options.source,
        type: type, // Passa o tipo para auto-detectar fonte
        delayBetweenPages: options.delay || 1000
      });
      
      const result = await job.import(criteria, {
        skipCharacters: options.skipCharacters,
        characterLimit: options.limit
      });

      console.log('\n📊 Resultado:');
      console.log(`   Obra: ${result.work.title}`);
      console.log(`   ID: ${result.work.id}`);
      console.log(`   Tipo: ${result.work.type}`);
      console.log(`   Fonte: ${result.work.source}`);
      
      if (result.characters) {
        console.log(`   Personagens: ${result.characters.total} (${result.characters.added} novos, ${result.characters.updated} atualizados)`);
      }
      
      console.log(`   Duração: ${result.duration}s`);

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: validate
 * Valida arquivos JSON contra schemas
 */
program
  .command('validate')
  .description('Valida arquivos JSON contra schemas')
  .argument('[type]', 'Tipo da obra')
  .argument('[workId]', 'ID da obra')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (type, workId, options) => {
    try {
      const validator = await createValidator();

      if (type && workId) {
        // Validar obra específica
        logger.info(`Validando: ${type}/${workId}`);
        
        const result = await validator.validateWork(type, workId, options.baseDir);
        
        if (result.valid) {
          logger.success('✅ Validação passou!');
        } else {
          logger.error('❌ Erros encontrados:');
          for (const err of result.errors) {
            console.log(`\n${err.file}:`);
            err.errors.forEach(e => console.log(`  - ${e}`));
          }
          process.exit(1);
        }
      } else {
        logger.info('Validação de schemas carregada com sucesso');
        console.log('\nSchemas disponíveis:');
        console.log('  - work');
        console.log('  - character');
        console.log('  - characters_collection');
      }

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: search
 * Busca personagens na database local
 */
program
  .command('search')
  .description('Busca personagens localmente')
  .argument('<query>', 'Termo de busca')
  .option('-t, --type <type>', 'Filtrar por tipo de obra')
  .option('-w, --work <workId>', 'Buscar em obra específica')
  .option('--role <role>', 'Filtrar por role')
  .option('--base-dir <dir>', 'Diretório base', './data')
  .action(async (query, options) => {
    try {
      const writer = createWriter(options.baseDir);

      if (options.work && options.type) {
        // Busca em obra específica
        const results = await writer.findCharacters(
          options.type,
          options.work,
          { name: query, role: options.role }
        );

        console.log(`\n🔍 Encontrados ${results.length} personagens:\n`);
        results.forEach(char => {
          console.log(`  ${char.name} (${char.role || 'unknown'})`);
          if (char.alt_names?.length > 0) {
            console.log(`    Aka: ${char.alt_names.join(', ')}`);
          }
        });
      } else {
        logger.warn('Por favor, especifique --type e --work para buscar');
      }

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: stats
 * Mostra estatísticas de uma obra
 */
program
  .command('stats')
  .description('Mostra estatísticas de uma obra')
  .argument('<type>', 'Tipo da obra')
  .argument('<workId>', 'ID da obra')
  .option('--base-dir <dir>', 'Diretório base', './data')
  .action(async (type, workId, options) => {
    try {
      const writer = createWriter(options.baseDir);
      const stats = await writer.getStats(type, workId);

      if (!stats) {
        logger.error('Obra não encontrada');
        process.exit(1);
      }

      console.log(`\n📊 Estatísticas: ${stats.title}\n`);
      console.log(`   ID: ${stats.workId}`);
      console.log(`   Tipo: ${stats.type}`);
      console.log(`   Total de personagens: ${stats.totalCharacters}`);
      console.log(`\n   Por role:`);
      
      for (const [role, count] of Object.entries(stats.byRole)) {
        console.log(`     ${role}: ${count}`);
      }
      
      console.log(`\n   Última atualização: ${stats.lastUpdated}`);

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: list
 * Lista obras importadas
 */
program
  .command('list')
  .description('Lista obras na database')
  .argument('[type]', 'Filtrar por tipo (anime, manga, game)')
  .option('--base-dir <dir>', 'Diretório base', './data')
  .action(async (type, options) => {
    try {
      const { promises: fs } = await import('fs');
      const baseDir = options.baseDir;

      const types = type ? [type] : ['anime', 'manga', 'game'];

      console.log('\n📚 Obras na database:\n');

      for (const workType of types) {
        try {
          const typePath = join(baseDir, workType);
          const works = await fs.readdir(typePath, { withFileTypes: true });
          const dirs = works.filter(w => w.isDirectory());

          if (dirs.length > 0) {
            console.log(`${workType.toUpperCase()}:`);
            
            for (const dir of dirs) {
              const infoPath = join(typePath, dir.name, 'info.json');
              try {
                const info = await readJson(infoPath);
                console.log(`  - ${info.title} (${dir.name})`);
              } catch {
                console.log(`  - ${dir.name}`);
              }
            }
            console.log('');
          }
        } catch {
          // Tipo não existe, ignorar
        }
      }

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

// /**
//  * Comando: crawl
//  * Crawling automático de obras populares
//  */
// program
//   .command('crawl')
//   .description('Crawling automático de obras populares')
//   .option('--max-works <number>', 'Máximo de obras por execução', parseInt, 10)
//   .option('--character-limit <number>', 'Limite de personagens por obra', parseInt, 50)
//   .option('--delay <number>', 'Delay entre importações (ms)', parseInt, 2000)
//   .option('--continue', 'Continuar da fila existente')
//   .option('--base-dir <dir>', 'Diretório base dos dados', './data')
//   .action(async (options) => {
//     try {
//       const crawlJob = createAutoCrawlJob({
//         baseDir: options.baseDir,
//         maxWorks: options.maxWorks,
//         characterLimit: options.characterLimit,
//         delayBetweenImports: options.delay
//       });

//       const report = await crawlJob.crawl({
//         maxWorks: options.maxWorks,
//         continueFromQueue: options.continue
//       });

//       console.log('\n📊 Relatório do Crawling:');
//       console.log(`   Processadas: ${report.processed}`);
//       console.log(`   Puladas: ${report.skipped}`);
//       console.log(`   Restantes na fila: ${report.remaining}`);
//       console.log(`   Total acumulado: ${report.totalProcessed} obras, ${report.totalCharacters} personagens`);

//     } catch (error) {
//       logger.error(`Erro: ${error.message}`);
//       process.exit(1);
//     }
//   });

/**
 * Comando: crawl
 * Crawling automático de obras populares
 */
program
  .command('crawl')
  .description('Crawling automático de obras populares')
  .option('--type <type>', 'Tipo de obra (anime, manga)', 'anime')
  .option('--max-works <number>', 'Máximo de obras por execução', parseInt, 10)
  .option('--character-limit <number>', 'Limite de personagens por obra', parseInt, 50)
  .option('--delay <number>', 'Delay entre importações (ms)', parseInt, 10000)
  .option('--continue', 'Continuar da fila existente')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      if (options.type === 'game') {
        console.error('❌ Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios).');
        console.error('📖 Use --type anime ou --type manga');
        process.exit(1);
      }

      const crawlJob = createAutoCrawlJob({
        baseDir: options.baseDir,
        type: options.type,
        maxWorks: options.maxWorks,
        characterLimit: options.characterLimit,
        delayBetweenImports: options.delay
      });

      const report = await crawlJob.crawl({
        maxWorks: options.maxWorks,
        continueFromQueue: options.continue
      });

      console.log('\n📊 Relatório do Crawling:');
      console.log(`   Tipo: ${options.type}`);
      console.log(`   Processadas: ${report.processed}`);
      console.log(`   Puladas: ${report.skipped}`);
      console.log(`   Restantes na fila: ${report.remaining}`);
      console.log(`   Total acumulado: ${report.totalProcessed} obras, ${report.totalCharacters} personagens`);

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: crawl-status
 * Mostra status do crawling automático
 */
program
  .command('crawl-status')
  .description('Mostra status do crawling automático')
  .option('--type <type>', 'Tipo de obra (anime, manga)', 'anime')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      if (options.type === 'game') {
        console.error('❌ Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios).');
        console.error('📖 Use --type anime ou --type manga');
        process.exit(1);
      }

      const crawlJob = createAutoCrawlJob({ 
        baseDir: options.baseDir,
        type: options.type
      });
      await crawlJob.showStatus();

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: crawl-list
 * Lista obras já processadas (índice)
 */
program
  .command('crawl-list')
  .description('Lista obras já processadas pelo crawler')
  .option('--type <type>', 'Tipo de obra (anime, manga)', 'anime')
  .option('--limit <number>', 'Limite de resultados', parseInt, 20)
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      if (options.type === 'game') {
        console.error('❌ Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios).');
        console.error('📖 Use --type anime ou --type manga');
        process.exit(1);
      }

      const crawlJob = createAutoCrawlJob({ 
        baseDir: options.baseDir,
        type: options.type
      });
      await crawlJob.listProcessed({ limit: options.limit });

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: crawl-clear
 * Limpa a fila de obras pendentes
 */
program
  .command('crawl-clear')
  .description('Limpa a fila de obras pendentes do crawler')
  .option('--type <type>', 'Tipo de obra (anime, manga, game)', 'anime')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      const crawlJob = createAutoCrawlJob({ 
        baseDir: options.baseDir,
        type: options.type
      });
      await crawlJob.clearQueue();

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: crawl-grow
 * Aumenta a fila de obras descobrindo mais obras populares
 */
program
  .command('crawl-grow')
  .description('Aumenta a fila de obras descobrindo mais obras populares')
  .option('--type <type>', 'Tipo de obra (anime, manga)', 'anime')
  .option('--count <number>', 'Número de obras a adicionar', parseInt, 20)
  .option('--page <number>', 'Página inicial para busca', parseInt, 1)
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      if (options.type === 'game') {
        console.error('❌ Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios).');
        console.error('📖 Use --type anime ou --type manga');
        process.exit(1);
      }

      const crawlJob = createAutoCrawlJob({ 
        baseDir: options.baseDir,
        type: options.type
      });
      const report = await crawlJob.growQueue({
        count: options.count,
        page: options.page
      });

      console.log('\n📊 Relatório do Crescimento da Fila:');
      console.log(`   Tipo: ${options.type}`);
      console.log(`   Solicitadas: ${report.requested}`);
      console.log(`   Adicionadas: ${report.added}`);
      console.log(`   Total na fila: ${report.totalQueue}`);

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: autocraw
 * Crawling automático contínuo com enrichment
 */
program
  .command('autocraw')
  .description('Crawling automático contínuo com enrichment e alternância inteligente de APIs')
  .option('--type <type>', 'Tipo de obra (anime, manga)', 'anime')
  .option('--max-works <number>', 'Máximo de obras por ciclo', parseInt, 5)
  .option('--character-limit <number>', 'Limite de personagens por obra', parseInt, 25)
  .option('--delay <number>', 'Delay entre importações (ms)', 15000)
  .option('--max-total <number>', 'Limite total de obras (0 = infinito)', parseInt, 0)
  .option('--enrich', 'Habilitar enrichment como fallback para rate limits', true)
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      if (options.type === 'game') {
        console.error('❌ Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios).');
        console.error('📖 Use --type anime ou --type manga');
        process.exit(1);
      }

      logger.info('🤖 Iniciando AutoCraw contínuo...');
      logger.info(`📊 Config: type=${options.type}, max-works=${options.maxWorks}, delay=${options.delay}ms, enrich=${options.enrich}`);

      const crawlJob = createAutoCrawlJob({
        baseDir: options.baseDir,
        type: options.type,
        maxWorks: options.maxWorks,
        characterLimit: options.characterLimit,
        delayBetweenImports: parseInt(options.delay) || 15000,
        enrich: options.enrich
      });

      let totalProcessed = 0;
      let cycleCount = 0;

      // Loop contínuo até ser interrompido ou atingir limite
      while (true) {
        cycleCount++;
        logger.info(`\n🔄 Ciclo ${cycleCount} - Verificando fila...`);

        const report = await crawlJob.crawl({
          maxWorks: options.maxWorks,
          continueFromQueue: true
        });

        totalProcessed += report.processed;

        logger.info(`📈 Ciclo ${cycleCount} concluído:`);
        logger.info(`   ✅ Processadas: ${report.processed}`);
        logger.info(`   ⏭️  Restantes na fila: ${report.remaining}`);
        logger.info(`   📊 Total acumulado: ${totalProcessed} obras`);

        // Verificar limite total
        if (options.maxTotal > 0 && totalProcessed >= options.maxTotal) {
          logger.success(`🎯 Limite total atingido: ${totalProcessed} obras`);
          break;
        }

        // Se não há mais obras na fila, esperar antes de buscar mais
        if (report.remaining === 0) {
          logger.info('📭 Fila vazia, aguardando novas descobertas...');
          await sleep(30000); // 30 segundos
        } else {
          // Pequena pausa entre ciclos
          await sleep(5000); // 5 segundos
        }
      }

    } catch (error) {
      if (error.message === 'User force closed the terminal') {
        logger.info('🛑 AutoCraw interrompido pelo usuário');
      } else {
        logger.error(`Erro no AutoCraw: ${error.message}`);
        process.exit(1);
      }
    }
  });

/**
 * Comando: update
 * Atualiza dados de obras existentes
 */
program
  .command('update')
  .description('Atualiza dados de obras já importadas')
  .option('--no-characters', 'Não atualizar personagens (apenas info da obra)')
  .option('--enrich', 'Usar enrichment com DuckDuckGo/wikis em caso de rate limit')
  .option('--delay <number>', 'Delay entre atualizações (ms)', parseInt, 2000)
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      const updateJob = createUpdateJob({
        baseDir: options.baseDir,
        updateCharacters: options.characters !== false, // true por padrão, false se --no-characters
        useEnrichment: options.enrich
      });

      logger.info(`🔄 Iniciando atualização de obras existentes... (personagens: ${options.characters === false ? 'não' : 'sim'}, enrichment: ${options.enrich ? 'sim' : 'não'})`);
      const report = await updateJob.updateAll({
        delayBetween: options.delay
      });

      console.log('\n📊 Relatório da Atualização:');
      console.log(`   Total de obras: ${report.total}`);
      console.log(`   Atualizadas: ${report.updated}`);
      console.log(`   Erros: ${report.errors}`);
      console.log(`   Puladas: ${report.skipped}`);

      if (report.details.length > 0) {
        console.log('\n📋 Detalhes:');
        for (const detail of report.details.slice(0, 10)) { // Mostra primeiras 10
          const status = detail.success ? '✅' : '❌';
          const chars = detail.characters ? ` (${detail.characters} chars)` : '';
          console.log(`   ${status} ${detail.type}/${detail.workId}${chars}`);
        }
        if (report.details.length > 10) {
          console.log(`   ... e mais ${report.details.length - 10} obras`);
        }
      }

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: cache
 * Gerencia o cache de obras processadas
 */
program
  .command('cache')
  .description('Gerencia o cache de obras processadas')
  .addCommand(
    new Command('status')
      .description('Mostra status do cache')
      .option('--base-dir <dir>', 'Diretório base dos dados', './data')
      .action(async (options) => {
        try {
          const { createWorkCache } = await import('./utils/cache.js');
          const cache = createWorkCache({ cacheFile: `${options.baseDir}/work-cache.json` });
          await cache.load();

          const stats = cache.getStats();
          console.log('\n📊 Status do Cache:');
          console.log(`   Arquivo: ${stats.cacheFile}`);
          console.log(`   Total de obras: ${stats.totalWorks}`);

          const processed = cache.listProcessed();
          if (processed.length > 0) {
            console.log('\n📋 Últimas obras processadas:');
            for (const workId of processed.slice(-10)) { // Últimas 10
              const metadata = cache.getMetadata(workId);
              const date = metadata?.processedAt ? new Date(metadata.processedAt).toLocaleDateString() : 'N/A';
              console.log(`   ${workId} (${date})`);
            }
          }

        } catch (error) {
          logger.error(`Erro: ${error.message}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('clear')
      .description('Limpa o cache completamente')
      .option('--base-dir <dir>', 'Diretório base dos dados', './data')
      .action(async (options) => {
        try {
          const { createWorkCache } = await import('./utils/cache.js');
          const cache = createWorkCache({ cacheFile: `${options.baseDir}/work-cache.json` });
          cache.clear();
          await cache.save();

          console.log('✅ Cache limpo com sucesso');

        } catch (error) {
          logger.error(`Erro: ${error.message}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('rebuild')
      .description('Reconstrói o cache baseado nas obras existentes')
      .option('--base-dir <dir>', 'Diretório base dos dados', './data')
      .action(async (options) => {
        try {
          const { createWorkCache } = await import('./utils/cache.js');
          const { createUpdateJob } = await import('./jobs/updateWork.js');

          const cache = createWorkCache({ cacheFile: `${options.baseDir}/work-cache.json` });
          const updateJob = createUpdateJob({ baseDir: options.baseDir });

          // Lista todas as obras existentes
          const existingWorks = await updateJob.listExistingWorks();

          // Reconstrói o cache
          await cache.load();
          cache.clear();

          for (const work of existingWorks) {
            try {
              const info = await readJson(work.infoPath);
              cache.markProcessed(work.workId, {
                type: work.type,
                title: info.title,
                source: info.source,
                charactersCount: info.charactersCount || 0,
                processedAt: info.updated_at || new Date().toISOString()
              });
            } catch (error) {
              // Ignora erros individuais
            }
          }

          await cache.save();

          console.log(`✅ Cache reconstruído com ${existingWorks.length} obras`);

        } catch (error) {
          logger.error(`Erro: ${error.message}`);
          process.exit(1);
        }
      })
  );

// Comando: deploy
program
  .command('deploy')
  .description('Atualiza a base de dados pública do frontend')
  .option('--web-dir <dir>', 'Diretório do frontend', './web')
  .option('--data-dir <dir>', 'Diretório dos dados', './data')
  .action(async (options) => {
    try {
      const webDir = options.webDir;
      const dataDir = options.dataDir;
      const publicDataDir = join(webDir, 'public', 'data');

      console.log('🚀 Iniciando deploy da base de dados...\n');

      // Verificar se os diretórios existem
      if (!existsSync(dataDir)) {
        throw new Error(`Diretório de dados não encontrado: ${dataDir}`);
      }

      if (!existsSync(webDir)) {
        throw new Error(`Diretório do frontend não encontrado: ${webDir}`);
      }

      // Apagar web/public/data se existir
      if (existsSync(publicDataDir)) {
        console.log(`🗑️  Removendo dados antigos: ${publicDataDir}`);
        await fs.rm(publicDataDir, { recursive: true, force: true });
      }

      // Criar diretório public/data
      await fs.mkdir(join(webDir, 'public'), { recursive: true });

      // Copiar data/ para web/public/data
      console.log(`📋 Copiando dados de ${dataDir} para ${publicDataDir}`);

      await copyDir(dataDir, publicDataDir);

      console.log('\n✅ Deploy concluído com sucesso!');
      console.log(`📊 Base de dados atualizada em: ${publicDataDir}`);

    } catch (error) {
      logger.error(`Erro no deploy: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: interactive
 * Interface interativa (TUI) para todas as operações
 */
program
  .command('interactive')
  .alias('tui')
  .description('Interface interativa para todas as operações')
  .action(async () => {
    await startInteractiveMode();
  });

// Parse dos argumentos
program.parse();

/**
 * Inicia o modo interativo (TUI)
 */
async function startInteractiveMode() {
  console.clear();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    📚 CharLib - TUI                    ║');
  console.log('║            Database de Personagens Interativa            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  let continuar = true;
  
  while (continuar) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'O que deseja fazer?',
        choices: [
          { name: '📥 Importar Obra', value: 'import' },
          { name: '🔍 Buscar Personagens', value: 'search' },
          { name: '📊 Ver Estatísticas', value: 'stats' },
          { name: '🔄 Atualizar Dados', value: 'update' },
          { name: '🤖 Auto-Crawling', value: 'crawl' },
          { name: '✅ Validar Dados', value: 'validate' },
          { name: '🚀 Deploy Web', value: 'deploy' },
          new inquirer.Separator(),
          { name: '❌ Sair', value: 'exit' }
        ]
      }
    ]);
    
    try {
      switch (action) {
        case 'import':
          await handleImportMenu();
          break;
        case 'search':
          await handleSearchMenu();
          break;
        case 'stats':
          await handleStatsMenu();
          break;
        case 'update':
          await handleUpdateMenu();
          break;
        case 'crawl':
          await handleCrawlingMenu();
          break;
        case 'validate':
          await handleValidateMenu();
          break;
        case 'deploy':
          await handleDeployMenu();
          break;
        case 'exit':
          continuar = false;
          console.log('\n👋 Até logo!\n');
          break;
      }
      
      if (action !== 'exit') {
        await inquirer.prompt([
          {
            type: 'input',
            name: 'continue',
            message: 'Pressione Enter para continuar...'
          }
        ]);
        console.clear();
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║                    📚 CharLib - TUI                    ║');
        console.log('║            Database de Personagens Interativa            ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
      }
    } catch (error) {
      console.error(`\n❌ Erro: ${error.message}\n`);
      await inquirer.prompt([
        {
          type: 'input',
          name: 'continue',
          message: 'Pressione Enter para continuar...'
        }
      ]);
    }
  }
  
  process.exit(0);
}

/**
 * Menu de importação
 */
async function handleImportMenu() {
  console.log('\n📥 Importar Obra\n');
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Tipo de obra:',
      choices: ['anime', 'manga', 'game'],
      default: 'anime'
    },
    {
      type: 'input',
      name: 'search',
      message: 'Nome da obra:',
      validate: (input) => input.trim() !== '' || 'Digite um nome válido'
    },
    {
      type: 'input',
      name: 'limit',
      message: 'Limite de personagens (deixe vazio para sem limite):',
      default: '',
      filter: (input) => input === '' ? undefined : parseInt(input)
    },
    {
      type: 'input',
      name: 'delay',
      message: 'Delay entre páginas em ms:',
      default: '1000',
      filter: (input) => parseInt(input)
    }
  ]);
  
  console.log('\n⏳ Iniciando importação...\n');
  
  const job = createImportJob({ 
    baseDir: './data',
    type: answers.type,
    delayBetweenPages: answers.delay
  });
  
  const result = await job.import({ 
    search: answers.search, 
    type: answers.type 
  }, {
    characterLimit: answers.limit
  });
  
  console.log('\n✅ Importação concluída!');
  console.log(`Obra: ${result.work.title}`);
  if (result.characters) {
    console.log(`Personagens: ${result.characters.total} (${result.characters.added} novos)`);
  }
  console.log(`Duração: ${result.duration}s\n`);
}

/**
 * Menu de busca
 */
async function handleSearchMenu() {
  console.log('\n🔍 Buscar Personagens\n');
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Tipo:',
      choices: ['anime', 'manga', 'game']
    },
    {
      type: 'input',
      name: 'workId',
      message: 'Obra (slug):',
      validate: (input) => input.trim() !== '' || 'Digite um slug válido'
    },
    {
      type: 'input',
      name: 'query',
      message: 'Buscar por:',
      validate: (input) => input.trim() !== '' || 'Digite uma busca válida'
    }
  ]);
  
  console.log('\n⏳ Buscando...\n');
  
  const writer = createWriter('./data');
  const results = await writer.findCharacters(answers.type, answers.workId, { 
    name: answers.query 
  });
  
  console.log(`\n✅ Encontrados ${results.length} personagens:\n`);
  
  results.forEach(char => {
    console.log(`• ${char.name} (${char.role || 'unknown'})`);
    if (char.alt_names?.length > 0) {
      console.log(`  Aka: ${char.alt_names.join(', ')}`);
    }
  });
  
  console.log();
}

/**
 * Menu de estatísticas
 */
async function handleStatsMenu() {
  console.log('\n📊 Estatísticas\n');
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Tipo:',
      choices: ['anime', 'manga', 'game']
    },
    {
      type: 'input',
      name: 'workId',
      message: 'Obra (slug):',
      validate: (input) => input.trim() !== '' || 'Digite um slug válido'
    }
  ]);
  
  console.log('\n⏳ Carregando...\n');
  
  const writer = createWriter('./data');
  const stats = await writer.getStats(answers.type, answers.workId);
  
  if (!stats) {
    console.log('\n❌ Obra não encontrada\n');
    return;
  }
  
  console.log(`\n📊 ${stats.title}\n`);
  console.log(`ID: ${stats.workId}`);
  console.log(`Tipo: ${stats.type}`);
  console.log(`Total de personagens: ${stats.totalCharacters}`);
  console.log('\nPor role:');
  
  for (const [role, count] of Object.entries(stats.byRole)) {
    console.log(`  ${role}: ${count}`);
  }
  
  console.log();
}

/**
 * Menu de atualização
 */
async function handleUpdateMenu() {
  console.log('\n🔄 Atualizar Dados\n');
  console.log('⏳ Atualizando todas as obras...\n');
  
  const job = createUpdateJob({ baseDir: './data' });
  const result = await job.updateAll();
  
  console.log('\n✅ Atualização concluída!');
  console.log(`Processadas: ${result.processed}`);
  console.log(`Atualizadas: ${result.updated}`);
  console.log(`Erros: ${result.errors}`);
  console.log(`Duração: ${result.duration}s\n`);
}

/**
 * Menu de crawling
 */
async function handleCrawlingMenu() {
  console.log('\n🤖 Auto-Crawling\n');
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Tipo:',
      choices: ['anime', 'manga'],
      default: 'anime'
    },
    {
      type: 'input',
      name: 'maxWorks',
      message: 'Máximo de obras:',
      default: '10',
      filter: (input) => parseInt(input)
    },
    {
      type: 'input',
      name: 'limit',
      message: 'Limite de personagens por obra:',
      default: '25',
      filter: (input) => parseInt(input)
    }
  ]);
  
  console.log('\n⏳ Iniciando crawling...\n');
  
  const job = createAutoCrawlJob({
    baseDir: './data',
    maxWorks: answers.maxWorks,
    characterLimit: answers.limit,
    type: answers.type
  });
  
  const report = await job.crawl();
  
  console.log('\n✅ Crawling concluído!');
  console.log(`Processadas: ${report.processed}`);
  console.log(`Novas: ${report.new}`);
  console.log(`Erros: ${report.errors}\n`);
}

/**
 * Menu de validação
 */
async function handleValidateMenu() {
  console.log('\n✅ Validar Dados\n');
  console.log('⏳ Validando schemas...\n');
  
  const validator = await createValidator();
  const result = await validator.validateAll('./data');
  
  if (result.valid) {
    console.log('\n✅ Todos os dados são válidos!\n');
  } else {
    console.log('\n❌ Erros encontrados:\n');
    for (const err of result.errors) {
      console.log(`${err.file}:`);
      err.errors.forEach(e => console.log(`  - ${e}`));
    }
    console.log();
  }
}

/**
 * Menu de deploy
 */
async function handleDeployMenu() {
  console.log('\n🚀 Deploy Web\n');
  console.log('⏳ Fazendo deploy...\n');
  
  // Copiar dados para web
  const dataDir = './data';
  const publicDataDir = './web/public/data';
  
  await copyDir(dataDir, publicDataDir);
  
  console.log('\n✅ Deploy concluído!');
  console.log(`Dados atualizados em: ${publicDataDir}\n`);
}
