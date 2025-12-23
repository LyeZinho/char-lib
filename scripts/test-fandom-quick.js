#!/usr/bin/env node

/**
 * Script de teste simplificado para Fandom
 * Testa apenas os métodos principais
 */

import { createEnrichmentCollector } from '../src/collectors/enrichment.js';

async function quickTest() {
  console.log('🔍 Teste rápido do Fandom API\n');

  const collector = createEnrichmentCollector();
  const gameName = 'Nier Automata';

  try {
    // Teste 1: Buscar wiki
    console.log(`1. Buscando wiki para "${gameName}"...`);
    const wikiUrl = await collector.findFandomWiki(gameName);
    console.log(`   ✓ Encontrado: ${wikiUrl}\n`);

    // Teste 2: Listar personagens
    console.log('2. Listando personagens...');
    const characters = await collector.listFandomCharacters(wikiUrl);
    console.log(`   ✓ Total: ${characters.length} personagens`);
    console.log(`   ✓ Primeiros 5: ${characters.slice(0, 5).join(', ')}\n`);

    // Teste 3: Scrape um personagem
    console.log(`3. Extraindo dados de "${characters[0]}"...`);
    const charData = await collector.scrapeFandomCharacter(wikiUrl, characters[0]);
    console.log(`   ✓ Nome: ${charData.name}`);
    console.log(`   ✓ Campos: ${Object.keys(charData.data).length}`);
    console.log(`   ✓ Dados:`, JSON.stringify(charData.data, null, 2));

    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

quickTest();
