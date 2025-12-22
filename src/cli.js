#!/usr/bin/env node

import { Command } from 'commander';
import { createImportJob } from './jobs/importWork.js';
import { createWriter } from './writers/jsonWriter.js';
import { createValidator } from './utils/validator.js';
import { logger } from './utils/logger.js';
import { readJson } from './utils/file.js';
import { join } from 'path';

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
  .description('Importa uma obra do AniList')
  .argument('<type>', 'Tipo da obra (anime, manga)')
  .argument('<search>', 'Nome ou ID da obra')
  .option('-s, --source <source>', 'Fonte dos dados', 'anilist')
  .option('--id <id>', 'ID direto da obra na fonte')
  .option('--skip-characters', 'Importar apenas informações da obra')
  .option('--limit <number>', 'Limite de personagens', parseInt)
  .option('--base-dir <dir>', 'Diretório base dos dados', './data')
  .action(async (type, search, options) => {
    try {
      const criteria = {
        search: options.id ? undefined : search,
        id: options.id ? parseInt(options.id) : undefined,
        type: type
      };

      const job = createImportJob({ baseDir: options.baseDir });
      
      const result = await job.import(criteria, {
        skipCharacters: options.skipCharacters,
        characterLimit: options.limit
      });

      console.log('\n📊 Resultado:');
      console.log(`   Obra: ${result.work.title}`);
      console.log(`   ID: ${result.work.id}`);
      console.log(`   Tipo: ${result.work.type}`);
      
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

// Parse dos argumentos
program.parse();
