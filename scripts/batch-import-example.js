#!/usr/bin/env node

/**
 * Exemplo de importação em batch
 * Execute: node scripts/batch-import-example.js
 */

import { createImportJob } from '../src/jobs/importWork.js';
import { logger } from '../src/utils/logger.js';

// Lista de obras para importar
const worksToImport = [
  { search: 'Naruto', type: 'anime' },
  { search: 'One Piece', type: 'anime' },
  { search: 'Death Note', type: 'anime' },
  { search: 'Fullmetal Alchemist: Brotherhood', type: 'anime' },
  { search: 'Attack on Titan', type: 'anime' }
];

async function main() {
  logger.info('🚀 Iniciando importação em batch');
  logger.info(`📦 ${worksToImport.length} obras na fila`);
  
  const job = createImportJob({
    baseDir: './data'
  });

  const results = await job.importBatch(worksToImport, {
    skipCharacters: false,    // Importar personagens
    characterLimit: 50,       // Limitar a 50 personagens por obra
    delayBetween: 3000        // 3 segundos entre cada importação
  });

  // Resumo
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA IMPORTAÇÃO');
  console.log('='.repeat(50));
  console.log(`✅ Sucessos: ${successful}`);
  console.log(`❌ Falhas: ${failed}`);
  console.log('='.repeat(50));

  // Detalhes dos sucessos
  if (successful > 0) {
    console.log('\n✅ Obras importadas com sucesso:');
    results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`   - ${r.work.title} (${r.characters?.total || 0} personagens)`);
      });
  }

  // Detalhes das falhas
  if (failed > 0) {
    console.log('\n❌ Falhas:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.criteria.search}: ${r.error}`);
      });
  }
}

// Executar
main().catch(error => {
  logger.error(`Erro fatal: ${error.message}`);
  process.exit(1);
});
