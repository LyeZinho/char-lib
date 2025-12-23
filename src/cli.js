#!/usr/bin/env node

import { config } from 'dotenv';
config(); // Carrega variáveis do .env

import { Command } from 'commander';
import inquirer from 'inquirer';
import { createImportJob } from './jobs/importWork.js';
import { createAutoCrawlJob } from './jobs/autoCrawl.js';
import { createUpdateJob } from './jobs/updateWork.js';
import { createSmartQueueJob } from './jobs/smartQueue.js';
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
  .option('--smart-delay', 'Usar delay inteligente baseado no número de personagens')
  .option('--base-delay <number>', 'Delay base para smart delay (ms)', parseInt, 10000)
  .option('--delay-multiplier <number>', 'Multiplicador para smart delay', parseInt, 50)
  .option('--max-delay <number>', 'Delay máximo para smart delay (ms)', parseInt, 30000)
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
        delayBetweenPages: options.delay || 1000,
        smartDelay: options.smartDelay,
        baseDelay: options.baseDelay,
        delayMultiplier: options.delayMultiplier,
        maxDelay: options.maxDelay
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
  .option('--delay <number>', 'Delay entre importações (ms)', parseInt, 30000)
  .option('--page-delay <number>', 'Delay entre páginas de personagens (ms)', parseInt, 10000)
  .option('--smart-delay', 'Usar delay inteligente baseado no número de personagens')
  .option('--base-delay <number>', 'Delay base para smart delay (ms)', parseInt, 10000)
  .option('--delay-multiplier <number>', 'Multiplicador para smart delay', parseInt, 50)
  .option('--max-delay <number>', 'Delay máximo para smart delay (ms)', parseInt, 30000)
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
        delayBetweenImports: options.delay,
        delayBetweenPages: options.pageDelay,
        smartDelay: options.smartDelay,
        baseDelay: options.baseDelay,
        delayMultiplier: options.delayMultiplier,
        maxDelay: options.maxDelay
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
  .option('--delay <number>', 'Delay entre importações (ms)', 30000)
  .option('--page-delay <number>', 'Delay entre páginas de personagens (ms)', parseInt, 10000)
  .option('--smart-delay', 'Usar delay inteligente baseado no número de personagens')
  .option('--base-delay <number>', 'Delay base para smart delay (ms)', parseInt, 10000)
  .option('--delay-multiplier <number>', 'Multiplicador para smart delay', parseInt, 50)
  .option('--max-delay <number>', 'Delay máximo para smart delay (ms)', parseInt, 30000)
  .option('--max-total <number>', 'Limite total de obras (0 = infinito)', parseInt, 0)
  .option('--enrich', 'Habilitar enrichment como fallback para rate limits', true)
  .option('--anilist-safe', 'Configurações ultra-conservadoras para AniList (5 req/min, delays altos)')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      if (options.type === 'game') {
        console.error('❌ Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios).');
        console.error('📖 Use --type anime ou --type manga');
        process.exit(1);
      }

      // Aplicar configurações ultra-conservadoras se --anilist-safe
      if (options.anilistSafe) {
        logger.info('🛡️ Modo AniList Safe ativado - configurações ultra-conservadoras');
        options.maxWorks = Math.min(options.maxWorks, 3); // Máximo 3 obras por ciclo
        options.characterLimit = Math.min(options.characterLimit, 15); // Máximo 15 personagens
        options.delay = 240000; // 4 minutos entre importações
        options.pageDelay = 60000; // 1 minuto entre páginas
        options.smartDelay = true;
        options.baseDelay = 60000; // 1 minuto base
        options.delayMultiplier = 200; // Multiplicador muito alto
        options.maxDelay = 300000; // 5 minutos máximo
      }

      logger.info('🤖 Iniciando AutoCraw contínuo...');
      logger.info(`📊 Config: type=${options.type}, max-works=${options.maxWorks}, delay=${options.delay}ms, enrich=${options.enrich}, safe=${options.anilistSafe ? 'sim' : 'não'}`);

      const crawlJob = createAutoCrawlJob({
        baseDir: options.baseDir,
        type: options.type,
        maxWorks: options.maxWorks,
        characterLimit: options.characterLimit,
        delayBetweenImports: parseInt(options.delay) || 15000,
        delayBetweenPages: options.pageDelay,
        smartDelay: options.smartDelay,
        baseDelay: options.baseDelay,
        delayMultiplier: options.delayMultiplier,
        maxDelay: options.maxDelay,
        enrich: options.enrich,
        anilistSafe: options.anilistSafe // Passar flag para o job
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
 * Comando: smart-queue
 * Smart Queue - Alternância inteligente entre tipos para crawling contínuo
 */
program
  .command('smart-queue')
  .description('Smart Queue - Alternância inteligente entre tipos (anime/manga) para crawling contínuo em background')
  .option('--max-cycles <number>', 'Máximo de ciclos (0 = infinito)', parseInt, 0)
  .option('--supported-types <types>', 'Tipos suportados separados por vírgula', 'anime,manga')
  .option('--max-works-cycle <number>', 'Máximo de obras por ciclo', parseInt, 2)
  .option('--character-limit <number>', 'Limite de personagens por obra', parseInt, 15)
  .option('--delay-types <number>', 'Delay entre tipos (ms)', parseInt, 300000)
  .option('--delay-cycles <number>', 'Delay entre ciclos completos (ms)', parseInt, 600000)
  .option('--enrich', 'Habilitar enrichment como fallback', true)
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .option('--auto-deploy', 'Habilitar auto-deploy automático')
  .option('--deploy-threshold <number>', 'Executar deploy a cada X obras processadas', parseInt, 10)
  .action(async (options) => {
    try {
      const supportedTypes = options.supportedTypes.split(',').map(t => t.trim());

      const smartQueueJob = createSmartQueueJob({
        baseDir: options.baseDir,
        supportedTypes: supportedTypes,
        maxWorksPerCycle: options.maxWorksCycle,
        characterLimit: options.characterLimit,
        delayBetweenTypes: options.delayTypes,
        delayBetweenCycles: options.delayCycles,
        enrich: options.enrich,
        autoDeployEnabled: options.autoDeploy || false,
        autoDeployThreshold: options.deployThreshold || 10
      });

      logger.info('🧠 Iniciando Smart Queue...');
      logger.info(`📊 Configuração: ${supportedTypes.join(', ')} | ${options.maxWorksCycle} obras/ciclo | ${options.characterLimit} chars/limite`);

      await smartQueueJob.run({
        maxCycles: options.maxCycles
      });

    } catch (error) {
      logger.error(`Erro na Smart Queue: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-status
 * Mostra status da Smart Queue
 */
program
  .command('smart-queue-status')
  .description('Mostra status atual da Smart Queue')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      const smartQueueJob = createSmartQueueJob({
        baseDir: options.baseDir
      });

      await smartQueueJob.showStatus();

    } catch (error) {
      logger.error(`Erro ao mostrar status: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-reset
 * Reseta o estado da Smart Queue
 */
program
  .command('smart-queue-reset')
  .description('Reseta o estado da Smart Queue')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      const smartQueueJob = createSmartQueueJob({
        baseDir: options.baseDir
      });

      await smartQueueJob.reset();

    } catch (error) {
      logger.error(`Erro ao resetar: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-install
 * Instala o Smart Queue como serviço systemd
 */
program
  .command('smart-queue-install')
  .description('Instala o Smart Queue como serviço systemd')
  .action(async () => {
    try {
      const { execSync } = await import('child_process');

      logger.info('🚀 Instalando Smart Queue como serviço...');

      // Executar script de instalação
      execSync('sudo bash scripts/install-smart-queue-service.sh', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      logger.success('✅ Smart Queue instalado como serviço');

    } catch (error) {
      logger.error(`❌ Erro na instalação: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-start
 * Inicia o daemon do Smart Queue
 */
program
  .command('smart-queue-start')
  .description('Inicia o daemon do Smart Queue')
  .action(async () => {
    try {
      const { execSync } = await import('child_process');

      logger.info('🚀 Iniciando Smart Queue daemon...');

      execSync('sudo bash scripts/manage-smart-queue.sh start', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

    } catch (error) {
      logger.error(`❌ Erro ao iniciar: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-stop
 * Para o daemon do Smart Queue
 */
program
  .command('smart-queue-stop')
  .description('Para o daemon do Smart Queue')
  .action(async () => {
    try {
      const { execSync } = await import('child_process');

      logger.info('🛑 Parando Smart Queue daemon...');

      execSync('sudo bash scripts/manage-smart-queue.sh stop', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

    } catch (error) {
      logger.error(`❌ Erro ao parar: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-restart
 * Reinicia o daemon do Smart Queue
 */
program
  .command('smart-queue-restart')
  .description('Reinicia o daemon do Smart Queue')
  .action(async () => {
    try {
      const { execSync } = await import('child_process');

      logger.info('🔄 Reiniciando Smart Queue daemon...');

      execSync('sudo bash scripts/manage-smart-queue.sh restart', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

    } catch (error) {
      logger.error(`❌ Erro ao reiniciar: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-service-status
 * Mostra status detalhado do serviço
 */
program
  .command('smart-queue-service-status')
  .description('Mostra status detalhado do serviço Smart Queue')
  .action(async () => {
    try {
      const { execSync } = await import('child_process');

      execSync('sudo bash scripts/manage-smart-queue.sh status', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

    } catch (error) {
      logger.error(`❌ Erro ao verificar status: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-logs
 * Mostra logs do daemon
 */
program
  .command('smart-queue-logs')
  .description('Mostra logs do daemon Smart Queue')
  .option('--lines <number>', 'Número de linhas a mostrar', parseInt, 50)
  .option('--follow', 'Seguir logs em tempo real')
  .action(async (options) => {
    try {
      const { execSync } = await import('child_process');

      if (options.follow) {
        logger.info('📝 Seguindo logs em tempo real (Ctrl+C para sair)...');
        execSync('sudo bash scripts/manage-smart-queue.sh follow', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } else {
        execSync(`sudo bash scripts/manage-smart-queue.sh logs ${options.lines}`, {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }

    } catch (error) {
      logger.error(`❌ Erro ao mostrar logs: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Comando: smart-queue-service-reset
 * Reseta estado e logs do serviço
 */
program
  .command('smart-queue-service-reset')
  .description('Reseta estado e logs do serviço Smart Queue')
  .action(async () => {
    try {
      const { execSync } = await import('child_process');

      logger.warn('⚠️ Isso irá resetar estado e logs do serviço!');

      execSync('sudo bash scripts/manage-smart-queue.sh reset', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

    } catch (error) {
      logger.error(`❌ Erro ao resetar: ${error.message}`);
      process.exit(1);
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
  .option('--delay <number>', 'Delay entre atualizações (ms)', parseInt, 30000)
  .option('--page-delay <number>', 'Delay entre páginas de personagens (ms)', parseInt, 10000)
  .option('--smart-delay', 'Usar delay inteligente baseado no número de personagens')
  .option('--base-delay <number>', 'Delay base para smart delay (ms)', parseInt, 10000)
  .option('--delay-multiplier <number>', 'Multiplicador para smart delay', parseInt, 50)
  .option('--max-delay <number>', 'Delay máximo para smart delay (ms)', parseInt, 30000)
  .option('--anilist-safe', 'Configurações ultra-conservadoras para AniList (5 req/min, delays altos)')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      // Aplicar configurações ultra-conservadoras se --anilist-safe
      if (options.anilistSafe) {
        logger.info('🛡️ Modo AniList Safe ativado - configurações ultra-conservadoras');
        options.delay = 120000; // 2 minutos entre obras
        options.pageDelay = 30000; // 30s entre páginas
        options.smartDelay = true;
        options.baseDelay = 30000; // 30s base
        options.delayMultiplier = 100; // Multiplicador alto
        options.maxDelay = 120000; // 2 minutos máximo
      }

      const updateJob = createUpdateJob({
        baseDir: options.baseDir,
        updateCharacters: options.characters !== false, // true por padrão, false se --no-characters
        useEnrichment: options.enrich,
        delayBetweenPages: options.pageDelay,
        smartDelay: options.smartDelay,
        baseDelay: options.baseDelay,
        delayMultiplier: options.delayMultiplier,
        maxDelay: options.maxDelay,
        anilistSafe: options.anilistSafe // Passar flag para o job
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
 * Comando: validate
 * Valida dados contra schemas JSON
 */
program
  .command('validate')
  .description('Valida dados contra schemas JSON')
  .option('--type <type>', 'Tipo de obra (anime, manga, game)')
  .option('--work <workId>', 'ID da obra específica para validar')
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (options) => {
    try {
      console.log('⏳ Carregando validador...\n');
      const validator = await createValidator();
      console.log('✅ Validador carregado!\n');
      
      if (options.work && options.type) {
        // Validar obra específica
        console.log(`✅ Validando ${options.type}/${options.work}...\n`);
        
        const result = await validator.validateWork(options.type, options.work, options.baseDir);
        
        if (result.valid) {
          console.log('✅ Dados válidos!\n');
        } else {
          console.log('❌ Erros encontrados:\n');
          for (const err of result.errors) {
            console.log(`${err.file}:`);
            err.errors.forEach(e => console.log(`  - ${e}`));
          }
          console.log();
        }
      } else {
        // Validar tudo
        console.log('✅ Validando todos os dados...\n');
        
        const result = await validator.validateAll(options.baseDir);
        
        if (result.valid) {
          console.log('✅ Todos os dados são válidos!\n');
        } else {
          console.log('❌ Erros encontrados:\n');
          for (const err of result.errors) {
            console.log(`${err.file}:`);
            err.errors.forEach(e => console.log(`  - ${e}`));
          }
          console.log();
        }
      }

    } catch (error) {
      logger.error(`Erro: ${error.message}`);
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
 * Menu de scripts úteis
 */
async function handleScriptsMenu() {
  console.log('\n🛠️ Scripts Úteis\n');
  
  const { script } = await inquirer.prompt([
    {
      type: 'list',
      name: 'script',
      message: 'Qual script deseja executar?',
      choices: [
        { name: '📊 Gerar Índices (generate-indexes)', value: 'generate-indexes' },
        { name: '🎮 Importar Jogos (import:game)', value: 'import-game' },
        { name: '🤖 Exemplo de Crawling (crawl-example)', value: 'crawl-example' }
      ]
    }
  ]);
  
  console.log(`\n⏳ Executando: npm run ${script}\n`);
  
  try {
    const { spawn } = await import('child_process');
    
    const command = script === 'import-game' ? 'npm run import:game' : `npm run ${script}`;
    
    const child = spawn('bash', ['-c', command], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Script falhou com código ${code}`));
        }
      });
      child.on('error', reject);
    });
    
    console.log('\n✅ Script executado com sucesso!\n');
  } catch (error) {
    console.error(`\n❌ Erro ao executar script: ${error.message}\n`);
  }
}

/**
 * Inicia o modo interativo (TUI)
 */
async function startInteractiveMode() {
  console.clear();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    CharLib                                   ║');
  console.log('║            Database de Personagens Interativa                ║');
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
          { name: '📋 Listar Obras', value: 'list' },
          { name: '✅ Validar Dados', value: 'validate' },
          { name: '💾 Gerenciar Cache', value: 'cache' },
          { name: '🚀 Deploy Web', value: 'deploy' },
          { name: '🛠️ Scripts Úteis', value: 'scripts' },
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
        case 'list':
          await handleListMenu();
          break;
        case 'validate':
          await handleValidateMenu();
          break;
        case 'cache':
          await handleCacheMenu();
          break;
        case 'deploy':
          await handleDeployMenu();
          break;
        case 'scripts':
          await handleScriptsMenu();
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
  console.log('║                    CharLib                                   ║');
  console.log('║            Database de Personagens Interativa                ║');
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
  
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'noCharacters',
      message: 'Não atualizar personagens (apenas info da obra)?',
      default: false
    },
    {
      type: 'confirm',
      name: 'enrich',
      message: 'Usar enrichment com DuckDuckGo/wikis em caso de rate limit?',
      default: false
    },
    {
      type: 'confirm',
      name: 'anilistSafe',
      message: '🛡️ Usar configurações ultra-conservadoras para AniList (5 req/min, delays altos)?',
      default: false
    },
    {
      type: 'confirm',
      name: 'smartDelay',
      message: 'Usar delay inteligente baseado no número de personagens?',
      default: false,
      when: (answers) => !answers.anilistSafe
    },
    {
      type: 'input',
      name: 'delay',
      message: 'Delay entre atualizações (ms):',
      default: '2000',
      filter: (input) => parseInt(input)
    },
    {
      type: 'input',
      name: 'pageDelay',
      message: 'Delay entre páginas de personagens (ms):',
      default: '1000',
      filter: (input) => parseInt(input),
      when: (answers) => !answers.smartDelay
    },
    {
      type: 'input',
      name: 'baseDelay',
      message: 'Delay base para smart delay (ms):',
      default: '1000',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    },
    {
      type: 'input',
      name: 'delayMultiplier',
      message: 'Multiplicador para smart delay:',
      default: '50',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    },
    {
      type: 'input',
      name: 'maxDelay',
      message: 'Delay máximo para smart delay (ms):',
      default: '10000',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    }
  ]);
  
  console.log('\n⏳ Atualizando todas as obras...\n');
  
  // Aplicar configurações ultra-conservadoras se --anilist-safe
  let updateOptions = {
    baseDir: './data',
    updateCharacters: !answers.noCharacters,
    useEnrichment: answers.enrich,
    delayBetweenPages: answers.pageDelay || answers.baseDelay,
    smartDelay: answers.smartDelay,
    baseDelay: answers.baseDelay,
    delayMultiplier: answers.delayMultiplier,
    maxDelay: answers.maxDelay
  };
  
  if (answers.anilistSafe) {
    console.log('🛡️ Modo AniList Safe ativado - configurações ultra-conservadoras');
    updateOptions = {
      ...updateOptions,
      delayBetweenPages: 30000, // 30s entre páginas
      smartDelay: true,
      baseDelay: 30000, // 30s base
      delayMultiplier: 100, // Multiplicador alto
      maxDelay: 120000, // 2 minutos máximo
      anilistSafe: true
    };
  }
  
  const job = createUpdateJob(updateOptions);
  
  let updateAllOptions = {
    delayBetween: answers.delay
  };
  
  if (answers.anilistSafe) {
    updateAllOptions.delayBetween = 120000; // 2 minutos entre obras
  }
  
  const result = await job.updateAll(updateAllOptions);
  
  console.log('\n✅ Atualização concluída!');
  console.log(`Total de obras: ${result.total}`);
  console.log(`Atualizadas: ${result.updated}`);
  console.log(`Erros: ${result.errors}`);
  console.log(`Puladas: ${result.skipped}`);
  console.log(`Duração: ${result.duration}s`);
  
  if (result.details.length > 0) {
    console.log('\n📋 Detalhes:');
    for (const detail of result.details.slice(0, 5)) { // Mostra primeiras 5
      const status = detail.success ? '✅' : '❌';
      const chars = detail.characters ? ` (${detail.characters} chars)` : '';
      console.log(`   ${status} ${detail.type}/${detail.workId}${chars}`);
    }
    if (result.details.length > 5) {
      console.log(`   ... e mais ${result.details.length - 5} obras`);
    }
  }
  console.log();
}

/**
 * Menu de crawling
 */
async function handleCrawlingMenu() {
  console.log('\n🤖 Auto-Crawling\n');
  
  const { crawlAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'crawlAction',
      message: 'O que deseja fazer?',
      choices: [
        { name: '🚀 Executar Crawling', value: 'crawl' },
        { name: '📊 Ver Status', value: 'status' },
        { name: '📋 Listar Processadas', value: 'list' },
        { name: '🧹 Limpar Fila', value: 'clear' },
        { name: '➕ Aumentar Fila', value: 'grow' },
        { name: '🔄 AutoCraw Contínuo', value: 'autocraw' }
      ]
    }
  ]);
  
  switch (crawlAction) {
    case 'crawl':
      await handleCrawlExecute();
      break;
    case 'status':
      await handleCrawlStatus();
      break;
    case 'list':
      await handleCrawlList();
      break;
    case 'clear':
      await handleCrawlClear();
      break;
    case 'grow':
      await handleCrawlGrow();
      break;
    case 'autocraw':
      await handleAutoCraw();
      break;
  }
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

/**
 * Executar crawling básico
 */
async function handleCrawlExecute() {
  console.log('\n🚀 Executar Crawling\n');
  
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
    },
    {
      type: 'confirm',
      name: 'smartDelay',
      message: 'Usar delay inteligente baseado no número de personagens?',
      default: false
    },
    {
      type: 'input',
      name: 'pageDelay',
      message: 'Delay entre páginas de personagens (ms):',
      default: '1000',
      filter: (input) => parseInt(input),
      when: (answers) => !answers.smartDelay
    },
    {
      type: 'input',
      name: 'baseDelay',
      message: 'Delay base para smart delay (ms):',
      default: '1000',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    },
    {
      type: 'input',
      name: 'delayMultiplier',
      message: 'Multiplicador para smart delay:',
      default: '50',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    },
    {
      type: 'input',
      name: 'maxDelay',
      message: 'Delay máximo para smart delay (ms):',
      default: '10000',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    },
    {
      type: 'confirm',
      name: 'continue',
      message: 'Continuar da fila existente?',
      default: false
    }
  ]);
  
  console.log('\n⏳ Iniciando crawling...\n');
  
  const job = createAutoCrawlJob({
    baseDir: './data',
    maxWorks: answers.maxWorks,
    characterLimit: answers.limit,
    delayBetweenPages: answers.pageDelay || answers.baseDelay,
    smartDelay: answers.smartDelay,
    baseDelay: answers.baseDelay,
    delayMultiplier: answers.delayMultiplier,
    maxDelay: answers.maxDelay,
    type: answers.type
  });
  
  const report = await job.crawl({
    maxWorks: answers.maxWorks,
    continueFromQueue: answers.continue
  });
  
  console.log('\n✅ Crawling concluído!');
  console.log(`Tipo: ${answers.type}`);
  console.log(`Processadas: ${report.processed}`);
  console.log(`Puladas: ${report.skipped}`);
  console.log(`Restantes na fila: ${report.remaining}`);
  console.log(`Total acumulado: ${report.totalProcessed} obras, ${report.totalCharacters} personagens\n`);
}

/**
 * Ver status do crawling
 */
async function handleCrawlStatus() {
  console.log('\n📊 Status do Crawling\n');
  
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Tipo:',
      choices: ['anime', 'manga'],
      default: 'anime'
    }
  ]);
  
  console.log('\n⏳ Carregando status...\n');
  
  const job = createAutoCrawlJob({ 
    baseDir: './data',
    type: type
  });
  
  await job.showStatus();
}

/**
 * Listar obras processadas
 */
async function handleCrawlList() {
  console.log('\n📋 Listar Processadas\n');
  
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
      name: 'limit',
      message: 'Limite de resultados:',
      default: '20',
      filter: (input) => parseInt(input)
    }
  ]);
  
  console.log('\n⏳ Carregando lista...\n');
  
  const job = createAutoCrawlJob({ 
    baseDir: './data',
    type: answers.type
  });
  
  await job.listProcessed({ limit: answers.limit });
}

/**
 * Limpar fila
 */
async function handleCrawlClear() {
  console.log('\n🧹 Limpar Fila\n');
  
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Tipo:',
      choices: ['anime', 'manga', 'game'],
      default: 'anime'
    }
  ]);
  
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Tem certeza que deseja limpar a fila de ${type}?`,
      default: false
    }
  ]);
  
  if (confirm) {
    const job = createAutoCrawlJob({ 
      baseDir: './data',
      type: type
    });
    
    await job.clearQueue();
    console.log('\n✅ Fila limpa!\n');
  } else {
    console.log('\n❌ Operação cancelada.\n');
  }
}

/**
 * Aumentar fila
 */
async function handleCrawlGrow() {
  console.log('\n➕ Aumentar Fila\n');
  
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
      name: 'count',
      message: 'Número de obras a adicionar:',
      default: '20',
      filter: (input) => parseInt(input)
    },
    {
      type: 'input',
      name: 'page',
      message: 'Página inicial:',
      default: '1',
      filter: (input) => parseInt(input)
    }
  ]);
  
  console.log('\n⏳ Descobrindo novas obras...\n');
  
  const job = createAutoCrawlJob({ 
    baseDir: './data',
    type: answers.type
  });
  
  const report = await job.growQueue({
    count: answers.count,
    page: answers.page
  });
  
  console.log('\n✅ Fila aumentada!');
  console.log(`Solicitadas: ${report.requested}`);
  console.log(`Adicionadas: ${report.added}`);
  console.log(`Total na fila: ${report.totalQueue}\n`);
}

/**
 * AutoCraw contínuo
 */
async function handleAutoCraw() {
  console.log('\n🔄 AutoCraw Contínuo\n');
  
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
      message: 'Máximo de obras por ciclo:',
      default: '5',
      filter: (input) => parseInt(input)
    },
    {
      type: 'input',
      name: 'limit',
      message: 'Limite de personagens por obra:',
      default: '25',
      filter: (input) => parseInt(input)
    },
    {
      type: 'confirm',
      name: 'anilistSafe',
      message: '🛡️ Usar configurações ultra-conservadoras para AniList (5 req/min, delays altos)?',
      default: false
    },
    {
      type: 'confirm',
      name: 'smartDelay',
      message: 'Usar delay inteligente baseado no número de personagens?',
      default: false,
      when: (answers) => !answers.anilistSafe
    },
    {
      type: 'input',
      name: 'pageDelay',
      message: 'Delay entre páginas de personagens (ms):',
      default: '1000',
      filter: (input) => parseInt(input),
      when: (answers) => !answers.smartDelay
    },
    {
      type: 'input',
      name: 'baseDelay',
      message: 'Delay base para smart delay (ms):',
      default: '1000',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    },
    {
      type: 'input',
      name: 'delayMultiplier',
      message: 'Multiplicador para smart delay:',
      default: '50',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    },
    {
      type: 'input',
      name: 'maxDelay',
      message: 'Delay máximo para smart delay (ms):',
      default: '10000',
      filter: (input) => parseInt(input),
      when: (answers) => answers.smartDelay
    },
    {
      type: 'input',
      name: 'delay',
      message: 'Delay entre importações (ms):',
      default: '15000',
      filter: (input) => parseInt(input)
    },
    {
      type: 'input',
      name: 'maxTotal',
      message: 'Limite total de obras (0 = infinito):',
      default: '0',
      filter: (input) => parseInt(input)
    }
  ]);
  
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Isso iniciará um processo contínuo. Deseja continuar?',
      default: false
    }
  ]);
  
  if (!confirm) {
    console.log('\n❌ Operação cancelada.\n');
    return;
  }
  
  console.log('\n🤖 Iniciando AutoCraw contínuo...\n');
  
  // Aplicar configurações ultra-conservadoras se --anilist-safe
  let crawlOptions = {
    baseDir: './data',
    type: answers.type,
    maxWorks: answers.maxWorks,
    characterLimit: answers.limit,
    delayBetweenImports: answers.delay,
    delayBetweenPages: answers.pageDelay || answers.baseDelay,
    smartDelay: answers.smartDelay,
    baseDelay: answers.baseDelay,
    delayMultiplier: answers.delayMultiplier,
    maxDelay: answers.maxDelay
  };
  
  if (answers.anilistSafe) {
    console.log('🛡️ Modo AniList Safe ativado - configurações ultra-conservadoras');
    crawlOptions = {
      ...crawlOptions,
      maxWorks: Math.min(answers.maxWorks, 3), // Máximo 3 obras por ciclo
      characterLimit: Math.min(answers.limit, 15), // Máximo 15 personagens
      delayBetweenImports: 240000, // 4 minutos entre importações
      delayBetweenPages: 60000, // 1 minuto entre páginas
      smartDelay: true,
      baseDelay: 60000, // 1 minuto base
      delayMultiplier: 200, // Multiplicador muito alto
      maxDelay: 300000, // 5 minutos máximo
      anilistSafe: true
    };
  }
  
  console.log(`Config: type=${answers.type}, max-works=${crawlOptions.maxWorks}, delay=${crawlOptions.delayBetweenImports}ms, safe=${answers.anilistSafe ? 'sim' : 'não'}\n`);
  
  const job = createAutoCrawlJob(crawlOptions);
  
  let totalProcessed = 0;
  let cycleCount = 0;
  
  try {
    while (true) {
      cycleCount++;
      console.log(`\n🔄 Ciclo ${cycleCount} - Verificando fila...`);
      
      const report = await job.crawl({
        maxWorks: answers.maxWorks,
        continueFromQueue: true
      });
      
      totalProcessed += report.processed;
      
      console.log(`📈 Ciclo ${cycleCount} concluído:`);
      console.log(`   ✅ Processadas: ${report.processed}`);
      console.log(`   ⏭️  Restantes na fila: ${report.remaining}`);
      console.log(`   📊 Total acumulado: ${totalProcessed} obras`);
      
      // Verificar limite total
      if (answers.maxTotal > 0 && totalProcessed >= answers.maxTotal) {
        console.log(`\n🎯 Limite total atingido: ${totalProcessed} obras`);
        break;
      }
      
      // Se não há mais obras na fila, esperar antes de buscar mais
      if (report.remaining === 0) {
        console.log('📭 Fila vazia, aguardando novas descobertas...');
        await sleep(30000); // 30 segundos
      } else {
        // Pequena pausa entre ciclos
        await sleep(5000); // 5 segundos
      }
    }
  } catch (error) {
    if (error.message === 'User force closed the terminal') {
      console.log('\n🛑 AutoCraw interrompido pelo usuário');
    } else {
      console.log(`\n❌ Erro no AutoCraw: ${error.message}`);
    }
  }
  
  console.log('\n✅ AutoCraw finalizado!\n');
}

/**
 * Menu de listagem
 */
async function handleListMenu() {
  console.log('\n📋 Listar Obras\n');
  
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Filtrar por tipo (ou "todos"):',
      choices: ['todos', 'anime', 'manga', 'game'],
      default: 'todos'
    }
  ]);
  
  console.log('\n⏳ Carregando obras...\n');
  
  const types = type === 'todos' ? ['anime', 'manga', 'game'] : [type];
  
  console.log('📚 Obras na database:\n');
  
  for (const workType of types) {
    try {
      const typePath = join('./data', workType);
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
}

/**
 * Menu de cache
 */
async function handleCacheMenu() {
  console.log('\n💾 Gerenciar Cache\n');
  
  const { cacheAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'cacheAction',
      message: 'O que deseja fazer?',
      choices: [
        { name: '📊 Ver Status', value: 'status' },
        { name: '🧹 Limpar Cache', value: 'clear' },
        { name: '🔄 Reconstruir Cache', value: 'rebuild' }
      ]
    }
  ]);
  
  switch (cacheAction) {
    case 'status':
      await handleCacheStatus();
      break;
    case 'clear':
      await handleCacheClear();
      break;
    case 'rebuild':
      await handleCacheRebuild();
      break;
  }
}

/**
 * Status do cache
 */
async function handleCacheStatus() {
  console.log('\n📊 Status do Cache\n');
  console.log('⏳ Carregando...\n');
  
  const { createWorkCache } = await import('./utils/cache.js');
  const cache = createWorkCache({ cacheFile: './data/work-cache.json' });
  await cache.load();
  
  const stats = cache.getStats();
  console.log('📊 Status do Cache:');
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
  console.log();
}

/**
 * Limpar cache
 */
async function handleCacheClear() {
  console.log('\n🧹 Limpar Cache\n');
  
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Tem certeza que deseja limpar o cache completamente?',
      default: false
    }
  ]);
  
  if (confirm) {
    const { createWorkCache } = await import('./utils/cache.js');
    const cache = createWorkCache({ cacheFile: './data/work-cache.json' });
    cache.clear();
    await cache.save();
    
    console.log('\n✅ Cache limpo com sucesso!\n');
  } else {
    console.log('\n❌ Operação cancelada.\n');
  }
}

/**
 * Reconstruir cache
 */
async function handleCacheRebuild() {
  console.log('\n🔄 Reconstruir Cache\n');
  console.log('⏳ Reconstruindo cache...\n');
  
  const { createWorkCache } = await import('./utils/cache.js');
  const { createUpdateJob } = await import('./jobs/updateWork.js');
  
  const cache = createWorkCache({ cacheFile: './data/work-cache.json' });
  const updateJob = createUpdateJob({ baseDir: './data' });
  
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
  
  console.log(`\n✅ Cache reconstruído com ${existingWorks.length} obras!\n`);
}
