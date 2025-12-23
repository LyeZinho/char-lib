#!/usr/bin/env node

/**
 * Script de teste para scraping do Fandom
 * Testa os novos métodos de MediaWiki API + Cheerio
 */

import { createEnrichmentCollector } from '../src/collectors/enrichment.js';
import { normalizeFandomCharacters } from '../src/normalizers/rawg.js';
import { logger } from '../src/utils/logger.js';

async function testFandomScraping() {
  logger.info('=== Teste de Scraping do Fandom ===\n');

  const enrichmentCollector = createEnrichmentCollector();

  // Teste com Nier Automata (exemplo fornecido pelo usuário)
  const gameName = 'Nier Automata';
  
  try {
    logger.info(`1️⃣ Buscando wiki do Fandom para: ${gameName}`);
    const fandomUrl = await enrichmentCollector.findFandomWiki(gameName);
    
    if (!fandomUrl) {
      logger.error('❌ Wiki do Fandom não encontrada');
      return;
    }
    
    logger.success(`✅ Wiki encontrada: ${fandomUrl}\n`);

    logger.info(`2️⃣ Listando personagens da categoria Characters...`);
    const characterTitles = await enrichmentCollector.listFandomCharacters(fandomUrl);
    
    if (characterTitles.length === 0) {
      logger.error('❌ Nenhum personagem encontrado na categoria');
      return;
    }
    
    logger.success(`✅ Encontrados ${characterTitles.length} personagens`);
    logger.info(`   Primeiros 10: ${characterTitles.slice(0, 10).join(', ')}\n`);

    logger.info(`3️⃣ Extraindo dados estruturados dos primeiros 5 personagens...`);
    const characters = [];
    
    for (let i = 0; i < Math.min(5, characterTitles.length); i++) {
      const title = characterTitles[i];
      logger.progress(`   Processando: ${title}`);
      
      const characterData = await enrichmentCollector.scrapeFandomCharacter(fandomUrl, title);
      
      if (characterData) {
        characters.push(characterData);
        logger.success(`   ✅ ${characterData.name} - ${Object.keys(characterData.data).length} campos extraídos`);
        
        // Mostra alguns campos
        const sampleFields = Object.entries(characterData.data)
          .slice(0, 3)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        if (sampleFields) {
          logger.debug(`      ${sampleFields}`);
        }
      } else {
        logger.warn(`   ⚠️  Sem dados para ${title}`);
      }
      
      // Delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`\n4️⃣ Normalizando personagens para o schema do projeto...`);
    const normalized = normalizeFandomCharacters(characters, 'nier-automata');
    
    logger.success(`✅ ${normalized.length} personagens normalizados\n`);
    
    // Mostra exemplo de personagem normalizado
    if (normalized.length > 0) {
      logger.info('📊 Exemplo de personagem normalizado:');
      console.log(JSON.stringify(normalized[0], null, 2));
    }

    logger.info('\n=== Teste concluído com sucesso! ===');

  } catch (error) {
    logger.error(`❌ Erro durante o teste: ${error.message}`);
    logger.debug(error.stack);
  }
}

// Executa o teste
testFandomScraping();
