#!/usr/bin/env node

/**
 * Exemplo de uso programático da biblioteca
 * Execute: node scripts/usage-example.js
 */

import { createImportJob } from '../src/jobs/importWork.js';
import { createWriter } from '../src/writers/jsonWriter.js';
import { createValidator } from '../src/utils/validator.js';
import { logger } from '../src/utils/logger.js';

async function example1_ImportSingleWork() {
  console.log('\n' + '='.repeat(60));
  console.log('EXEMPLO 1: Importar uma obra');
  console.log('='.repeat(60));

  const job = createImportJob({ baseDir: './data' });

  const result = await job.import({
    search: 'Cowboy Bebop',
    type: 'anime'
  }, {
    characterLimit: 20
  });

  console.log(`✅ ${result.work.title} importado`);
  console.log(`   Personagens: ${result.characters.total}`);
}

async function example2_SearchCharacters() {
  console.log('\n' + '='.repeat(60));
  console.log('EXEMPLO 2: Buscar personagens localmente');
  console.log('='.repeat(60));

  const writer = createWriter('./data');

  const characters = await writer.findCharacters('anime', 'cowboy-bebop', {
    name: 'Spike'
  });

  console.log(`🔍 Encontrados ${characters.length} personagens:`);
  characters.forEach(char => {
    console.log(`   - ${char.name} (${char.role})`);
  });
}

async function example3_GetStats() {
  console.log('\n' + '='.repeat(60));
  console.log('EXEMPLO 3: Estatísticas de uma obra');
  console.log('='.repeat(60));

  const writer = createWriter('./data');
  const stats = await writer.getStats('anime', 'cowboy-bebop');

  if (stats) {
    console.log(`📊 ${stats.title}`);
    console.log(`   Total: ${stats.totalCharacters} personagens`);
    console.log(`   Por role:`, stats.byRole);
  } else {
    console.log('⚠️  Obra não encontrada');
  }
}

async function example4_Validate() {
  console.log('\n' + '='.repeat(60));
  console.log('EXEMPLO 4: Validar dados');
  console.log('='.repeat(60));

  const validator = await createValidator();
  const result = await validator.validateWork('anime', 'cowboy-bebop');

  if (result.valid) {
    console.log('✅ Dados válidos!');
  } else {
    console.log('❌ Erros encontrados:');
    result.errors.forEach(err => {
      console.log(`   ${err.file}:`, err.errors);
    });
  }
}

async function example5_CustomCharacter() {
  console.log('\n' + '='.repeat(60));
  console.log('EXEMPLO 5: Adicionar personagem customizado');
  console.log('='.repeat(60));

  const writer = createWriter('./data');

  await writer.upsertCharacters('anime', 'cowboy-bebop', [
    {
      id: 'custom_character',
      name: 'Custom Character',
      alt_names: [],
      role: 'minor',
      description: 'Personagem adicionado manualmente',
      metadata: {
        custom: true
      },
      images: [],
      external_ids: {}
    }
  ]);

  console.log('✅ Personagem customizado adicionado');
}

// Executar todos os exemplos
async function main() {
  try {
    await example1_ImportSingleWork();
    await example2_SearchCharacters();
    await example3_GetStats();
    await example4_Validate();
    await example5_CustomCharacter();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Todos os exemplos executados!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logger.error(`Erro: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Verificar se está sendo executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { 
  example1_ImportSingleWork,
  example2_SearchCharacters,
  example3_GetStats,
  example4_Validate,
  example5_CustomCharacter
};
