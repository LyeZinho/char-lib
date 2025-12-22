#!/usr/bin/env node

/**
 * Exemplo de uso do sistema de Auto-Crawling
 * Execute: node scripts/crawl-example.js
 */

import { createAutoCrawlJob } from '../src/jobs/autoCrawl.js';
import { logger } from '../src/utils/logger.js';

async function exemploCrawlBasico() {
  console.log('\n🤖 Exemplo 1: Crawling básico (3 obras)');
  console.log('='.repeat(50));

  const crawlJob = createAutoCrawlJob({
    baseDir: './data',
    maxWorks: 3,
    characterLimit: 25, // Limitado para exemplo rápido
    delayBetweenImports: 1000 // 1 segundo entre imports
  });

  const report = await crawlJob.crawl();

  console.log('\n📊 Resultado:');
  console.log(`   Processadas: ${report.processed}`);
  console.log(`   Na fila: ${report.remaining}`);
  console.log(`   Total acumulado: ${report.totalProcessed} obras`);
}

async function exemploStatusEFila() {
  console.log('\n📋 Exemplo 2: Ver status e gerenciar fila');
  console.log('='.repeat(50));

  const crawlJob = createAutoCrawlJob({ baseDir: './data' });

  // Ver status atual
  await crawlJob.showStatus();

  // Listar obras processadas
  console.log('\n📚 Índice de obras processadas:');
  await crawlJob.listProcessed({ limit: 10 });
}

async function exemploCrawlContinuo() {
  console.log('\n🔄 Exemplo 3: Crawling contínuo (continuar da fila)');
  console.log('='.repeat(50));

  const crawlJob = createAutoCrawlJob({
    baseDir: './data',
    maxWorks: 2,
    characterLimit: 30
  });

  // Continuar processando da fila existente
  const report = await crawlJob.crawl({ continueFromQueue: true });

  console.log('\n📊 Continuação:');
  console.log(`   Processadas: ${report.processed}`);
  console.log(`   Restantes: ${report.remaining}`);
}

async function exemploLimpeza() {
  console.log('\n🗑️  Exemplo 4: Limpar fila');
  console.log('='.repeat(50));

  const crawlJob = createAutoCrawlJob({ baseDir: './data' });

  // Limpar fila pendente
  await crawlJob.clearQueue();

  console.log('✅ Fila limpa! Use "crawl" para descobrir novas obras.');
}

// Executar exemplos
async function main() {
  console.log('🚀 Exemplos do Sistema de Auto-Crawling');
  console.log('Pressione Ctrl+C para interromper a qualquer momento\n');

  try {
    // Exemplo 1: Crawling básico
    await exemploCrawlBasico();

    // Exemplo 2: Status
    await exemploStatusEFila();

    // Exemplo 3: Continuar
    await exemploCrawlContinuo();

    console.log('\n✅ Todos os exemplos executados com sucesso!');
    console.log('\n💡 Comandos úteis:');
    console.log('   npm run crawl              # Executar crawling');
    console.log('   npm run crawl-status       # Ver status');
    console.log('   npm run crawl-list         # Listar processadas');
    console.log('   node src/cli.js crawl --help  # Ver todas opções');

  } catch (error) {
    logger.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

// Verificar se está sendo executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  exemploCrawlBasico,
  exemploStatusEFila,
  exemploCrawlContinuo,
  exemploLimpeza
};