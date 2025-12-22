#!/usr/bin/env node

/**
 * Exemplo de uso do sistema de Enrichment
 * Demonstra como usar enrichment para complementar dados
 */
/* Lines 7-12 omitted */

async function exemploEnrichmentBasico() {
  console.log('\n🔍 Exemplo 1: Enrichment básico');
  console.log('='.repeat(50));

  const enrichment = createEnrichmentCollector();

  const result = await enrichment.enrichWork('Attack on Titan', 'anime');

  console.log('Resultado do enrichment:');
  console.log(`Encontrado: ${result.found}`);
  console.log(`Links de wiki: ${result.wikiLinks.length}`);

  for (const link of result.wikiLinks) {
    console.log(`  - ${link.type}: ${link.title}`);
    console.log(`    ${link.url}`);
  }

  if (result.additionalInfo.description) {
    console.log(`\nDescrição adicional: ${result.additionalInfo.description.substring(0, 200)}...`);
  }
}

async function exemploEnrichmentPersonagem() {
  console.log('\n👤 Exemplo 2: Enrichment de personagem');
  console.log('='.repeat(50));

  const enrichment = createEnrichmentCollector();

  const result = await enrichment.enrichCharacter('Eren Yeager', 'Attack on Titan');

  console.log('Resultado do enrichment:');
  console.log(`Encontrado: ${result.found}`);
  console.log(`Links de wiki: ${result.wikiLinks.length}`);

  for (const link of result.wikiLinks) {
    console.log(`  - ${link.type}: ${link.title}`);
    console.log(`    ${link.url}`);
  }
}

async function exemploUpdateComEnrichment() {
  console.log('\n🔄 Exemplo 3: Update com enrichment');
  console.log('='.repeat(50));

  const updateJob = createUpdateJob({
    baseDir: './data',
    updateCharacters: false, // Apenas info para exemplo
    useEnrichment: true
  });

  console.log('Atualizando uma obra com enrichment ativado...');
  console.log('(Isso pode demorar devido aos delays de rate limit)');

  // Para demonstração, vamos simular um cenário
  console.log('💡 Dica: Use --enrich no comando update para ativar enrichment');
  console.log('   node src/cli.js update --enrich --no-characters');
}

// Executar exemplos
async function main() {
  try {
    await exemploEnrichmentBasico();
    await exemploEnrichmentPersonagem();
    await exemploUpdateComEnrichment();
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

// Verificar se está sendo executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  exemploEnrichmentBasico,
  exemploEnrichmentPersonagem,
  exemploUpdateComEnrichment
};