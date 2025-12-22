#!/usr/bin/env node

/**
 * Exemplo de importação de jogos
 * Execute: node scripts/game-import-example.js
 */
import { createImportJob } from '../src/jobs/importWork.js';
import { logger } from '../src/utils/logger.js';

// Lista de jogos populares para importar
const gamesToImport = [
  'The Witcher 3',
  'Cyberpunk 2077',
  'Elden Ring',
  'God of War',
  'The Last of Us'
];

async function importGames() {
  logger.info('🎮 Iniciando importação de jogos');
  logger.info(`📦 ${gamesToImport.length} jogos na fila`);

  const job = createImportJob({
    baseDir: './data',
    type: 'game' // Auto-detecta RAWG como fonte
  });

  const results = [];

  for (const gameName of gamesToImport) {
    try {
      logger.info(`\n🔍 Importando: ${gameName}`);
      
      const result = await job.import(
        { search: gameName },
        { 
          characterLimit: 15, // Limita criadores/desenvolvedores
          skipCharacters: false 
        }
      );

      results.push({
        success: true,
        game: result.work.title,
        id: result.work.id,
        creators: result.characters?.total || 0
      });

      logger.success(`✅ ${result.work.title} importado`);
      
      // Delay entre importações para respeitar rate limit
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      logger.error(`❌ Erro ao importar ${gameName}: ${error.message}`);
      results.push({
        success: false,
        game: gameName,
        error: error.message
      });
    }
  }

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
    console.log('\n✅ Jogos importados com sucesso:');
    results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`   - ${r.game} (${r.creators} criadores)`);
      });
  }

  // Detalhes das falhas
  if (failed > 0) {
    console.log('\n❌ Falhas:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.game}: ${r.error}`);
      });
  }
}

// Verificar se RAWG_API_KEY está configurada
if (!process.env.RAWG_API_KEY) {
  console.warn('\n⚠️  AVISO: RAWG_API_KEY não configurada!');
  console.warn('Obtenha uma chave gratuita em: https://rawg.io/apidocs');
  console.warn('Configure com: export RAWG_API_KEY="sua-chave"\n');
}

// Executar
importGames().catch(error => {
  logger.error(`Erro fatal: ${error.message}`);
  process.exit(1);
});
