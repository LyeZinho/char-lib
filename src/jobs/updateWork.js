import { createAniListCollector } from '../collectors/anilist.js';
import { createJikanCollector } from '../collectors/jikan.js';
import { createRawgCollector } from '../collectors/rawg.js';
import { createEnrichmentCollector } from '../collectors/enrichment.js';
import { normalizeWork as normalizeAniListWork, normalizeCharacters as normalizeAniListCharacters } from '../normalizers/anilist.js';
import { normalizeWork as normalizeJikanWork, normalizeCharacters as normalizeJikanCharacters } from '../normalizers/jikan.js';
import { normalizeWork as normalizeRawgWork, normalizeCharacters as normalizeRawgCharacters } from '../normalizers/rawg.js';
import { createWriter } from '../writers/jsonWriter.js';
import { createWorkCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { readJson, listFiles } from '../utils/file.js';
import path from 'path';
import { readdir } from 'fs/promises';

/**
 * Job de atualização de obras existentes
 * Percorre obras já importadas e atualiza seus dados
 */
export class UpdateWorkJob {
  constructor(options = {}) {
    this.baseDir = path.resolve(options.baseDir || './data');
    this.updateCharacters = options.updateCharacters !== false; // true por padrão
    this.useEnrichment = options.useEnrichment || false;
    this.delayBetweenPages = options.delayBetweenPages || 1000; // Delay entre páginas em ms
    this.smartDelay = options.smartDelay || false;
    this.baseDelay = options.baseDelay || 1000;
    this.delayMultiplier = options.delayMultiplier || 500;
    this.maxDelay = options.maxDelay || 10000;
    this.anilistSafe = options.anilistSafe || false; // Flag para modo ultra-conservador
    this.enrichmentCollector = this.useEnrichment ? createEnrichmentCollector() : null;
    this.writer = createWriter(this.baseDir);
    this.cache = createWorkCache({ cacheFile: path.join(this.baseDir, 'work-cache.json') });
  }

  /**
   * Lista todas as obras existentes
   * @returns {Promise<Array>} Lista de {type, workId, infoPath}
   */
  async listExistingWorks() {
    const works = [];

    // Tipos suportados
    const types = ['anime', 'manga', 'game'];

    for (const type of types) {
      const typeDir = path.join(this.baseDir, type);
      try {
        const workDirs = await readdir(typeDir);
        for (const workId of workDirs) {
          const infoPath = path.join(typeDir, workId, 'info.json');
          try {
            await readJson(infoPath); // Verifica se existe
            works.push({ type, workId, infoPath });
          } catch (error) {
            // Ignora se não conseguir ler
          }
        }
      } catch (error) {
        // Diretório não existe, continua
      }
    }

    return works;
  }

  /**
   * Atualiza uma obra específica
   * @param {string} type - Tipo da obra
   * @param {string} workId - ID da obra
   * @returns {Promise<Object>} Resultado da atualização
   */
  async updateWork(type, workId) {
    const infoPath = path.join(this.baseDir, type, workId, 'info.json');
    const existingInfo = await readJson(infoPath);

    // Define normalizers baseados na source
    this.setNormalizers(existingInfo.source);

    let workData = null;
    let charactersData = null;
    let usedEnrichment = false;

    logger.debug(`Atualizando ${workId}: updateCharacters=${this.updateCharacters}, useEnrichment=${this.useEnrichment}`);

    try {
      // Tenta buscar dados da API principal
      const collector = this.createCollector(existingInfo.source, {
        delayBetweenPages: this.delayBetweenPages,
        smartDelay: this.smartDelay,
        baseDelay: this.baseDelay,
        delayMultiplier: this.delayMultiplier,
        maxDelay: this.maxDelay
      });

      // Adapta critérios baseado no tipo de fonte
      if (existingInfo.source.toLowerCase() === 'rawg') {
        // Para jogos (RAWG)
        workData = await collector.searchGame({
          id: existingInfo.source_id,
          slug: existingInfo.external_ids?.rawg_slug
        });
        
        if (this.updateCharacters) {
          charactersData = await collector.collectCharacters(existingInfo.source_id, {});
        }
      } else {
        // Para anime/manga (AniList, MAL)
        workData = await collector.searchMedia({
          id: existingInfo.source_id,
          type: type === 'anime' ? 'ANIME' : type === 'manga' ? 'MANGA' : 'ANIME'
        });

        if (this.updateCharacters) {
          charactersData = await collector.collectCharacters(existingInfo.source_id, {});
        }
      }

    } catch (error) {
      if (error.message.includes('429') && this.useEnrichment) {
        logger.warn(`Rate limit atingido para ${workId}, tentando enrichment...`);
        try {
          // Fallback para enrichment
          const enrichment = await this.enrichmentCollector.enrichWork(existingInfo.title, type);
          if (enrichment.found) {
            // Cria dados básicos a partir do enrichment
            workData = this.createWorkFromEnrichment(existingInfo, enrichment);
            usedEnrichment = true;
            logger.info(`✅ Enrichment usado para ${workId}`);
          } else {
            throw new Error('Enrichment não encontrou dados suficientes');
          }
        } catch (enrichmentError) {
          logger.error(`Enrichment também falhou: ${enrichmentError.message}`);
          throw error; // Lança o erro original
        }
      } else {
        throw error;
      }
    }

    // Normaliza
    const normalizedWork = this.normalizeWork(workData);

    // Atualiza info
    const updatedWork = {
      ...existingInfo,
      ...normalizedWork,
      updated_at: new Date().toISOString(),
      enriched: usedEnrichment
    };

    await this.writer.upsertWork(type, workId, updatedWork);

    let charactersResult = null;
    if (this.updateCharacters && charactersData && !usedEnrichment) {
      const normalizedCharacters = this.normalizeCharacters(charactersData, workId);
      charactersResult = await this.writer.upsertCharacters(type, workId, normalizedCharacters);
    }

    return {
      work: updatedWork,
      characters: charactersResult,
      usedEnrichment
    };
  }

  /**
   * Atualiza todas as obras existentes
   * @param {Object} options - Opções
   * @returns {Promise<Object>} Relatório
   */
  async updateAll(options = {}) {
    const works = await this.listExistingWorks();
    logger.info(`Encontradas ${works.length} obras para atualizar`);

    const results = {
      total: works.length,
      updated: 0,
      errors: 0,
      skipped: 0,
      details: []
    };

    for (const work of works) {
      try {
        logger.progress(`Atualizando ${work.type}/${work.workId}...`);

        const result = await this.updateWork(work.type, work.workId);

        results.updated++;
        results.details.push({
          type: work.type,
          workId: work.workId,
          success: true,
          characters: result.characters ? result.characters.total : 0
        });

      } catch (error) {
        logger.error(`Erro ao atualizar ${work.type}/${work.workId}: ${error.message}`);
        results.errors++;
        results.details.push({
          type: work.type,
          workId: work.workId,
          success: false,
          error: error.message
        });
      }

      // Delay entre obras (sempre aplicado, independente de sucesso/erro)
      if (options.delayBetween && options.delayBetween > 0) {
        logger.info(`⏳ Aguardando ${options.delayBetween}ms antes da próxima obra...`);
        await new Promise(resolve => setTimeout(resolve, options.delayBetween));
      }
    }

    return results;
  }

  /**
   * Cria o collector apropriado baseado na fonte
   * @param {string} source - Fonte dos dados
   * @param {Object} options - Opções do collector
   * @returns {Object} Instância do collector
   */
  createCollector(source, options) {
    switch (source.toLowerCase()) {
      case 'anilist':
        return createAniListCollector({
          ...options,
          anilistSafe: this.anilistSafe // Passar flag para configurações ultra-conservadoras
        });
      case 'myanimelist':
      case 'mal':
        return createJikanCollector(options);
      case 'rawg':
        return createRawgCollector(options);
      default:
        // Fallback para AniList
        return createAniListCollector({
          ...options,
          anilistSafe: this.anilistSafe
        });
    }
  }

  /**
   * Define as funções de normalização baseadas na fonte
   * @param {string} source - Fonte
   */
  setNormalizers(source) {
    switch (source.toLowerCase()) {
      case 'mal':
      case 'myanimelist':
        this.normalizeWork = normalizeJikanWork;
        this.normalizeCharacters = normalizeJikanCharacters;
        break;
      case 'rawg':
        this.normalizeWork = normalizeRawgWork;
        this.normalizeCharacters = normalizeRawgCharacters;
        break;
      default:
        // Fallback para AniList
        this.normalizeWork = normalizeAniListWork;
        this.normalizeCharacters = normalizeAniListCharacters;
    }
  }

  /**
   * Cria dados da obra a partir do enrichment
   * @param {Object} existingInfo - Info existente
   * @param {Object} enrichment - Dados do enrichment
   * @returns {Object} Dados da obra
   */
  createWorkFromEnrichment(existingInfo, enrichment) {
    // Implementação básica - usa os dados do enrichment como base
    return {
      ...existingInfo,
      ...enrichment,
      source: 'enrichment'
    };
  }
}

/**
 * Cria uma instância do job de atualização
 * @param {Object} options - Opções
 * @returns {UpdateWorkJob}
 */
export function createUpdateJob(options) {
  return new UpdateWorkJob(options);
}