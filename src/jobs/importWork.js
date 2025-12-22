import { createAniListCollector } from '../collectors/anilist.js';
import { createJikanCollector } from '../collectors/jikan.js';
import { createRawgCollector } from '../collectors/rawg.js';
import { createEnrichmentCollector } from '../collectors/enrichment.js';
import { normalizeWork as normalizeAniListWork, normalizeCharacters as normalizeAniListCharacters } from '../normalizers/anilist.js';
import { normalizeWork as normalizeJikanWork, normalizeCharacters as normalizeJikanCharacters } from '../normalizers/jikan.js';
import { normalizeWork as normalizeRawgWork, normalizeCharacters as normalizeRawgCharacters } from '../normalizers/rawg.js';
import { createWriter } from '../writers/jsonWriter.js';
import { logger } from '../utils/logger.js';
import { slugify } from '../utils/slugify.js';
import path from 'path';

/**
 * Job de importação de obras e personagens
 * Orquestra: coleta -> normalização -> escrita
 */
export class ImportWorkJob {
  constructor(options = {}) {
    this.baseDir = path.resolve(options.baseDir || './data');
    this.source = options.source;
    this.type = options.type; // anime, manga, game, etc.
    this.enrich = options.enrich || false;
    
    // Mapeamento de tipos para fontes padrão
    this.sourceMap = {
      'anime': 'anilist',
      'manga': 'anilist',
      'game': 'rawg',
      'light-novel': 'anilist',
      // Preparado para futuras expansões:
      'cartoon': 'tvmaze', // Exemplo para desenhos animados
      'comic': 'marvel', // Exemplo para quadrinhos
    };
    
    // Determina a fonte baseada no tipo se não foi especificada
    if (!this.source && this.type) {
      this.source = this.sourceMap[this.type] || 'anilist';
    } else if (!this.source) {
      this.source = 'anilist'; // Fallback padrão
    }
    
    // Instancia o collector baseado na fonte
    this.collector = this.createCollector(this.source, options.collectorOptions);
    
    // Instancia enrichment se necessário
    this.enrichmentCollector = this.enrich ? createEnrichmentCollector() : null;
    
    // Define as funções de normalização baseadas na fonte
    this.setNormalizers(this.source);
    
    this.writer = createWriter(this.baseDir);
  }

  /**
   * Verifica se o erro é recuperável (rate limit, API indisponível)
   * @param {Error} error - Erro ocorrido
   * @returns {boolean}
   */
  isRecoverableError(error) {
    const message = error.message.toLowerCase();
    return message.includes('429') || 
           message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('timeout') ||
           message.includes('network');
  }

  /**
   * Cria o collector apropriado baseado na fonte
   * @param {string} source - Fonte dos dados (anilist, mal, rawg, etc.)
   * @param {Object} options - Opções do collector
   * @returns {Object} Instância do collector
   */
  createCollector(source, options) {
    switch (source.toLowerCase()) {
      case 'anilist':
        return createAniListCollector(options);
      case 'mal':
        return createJikanCollector(options);
      case 'rawg':
        return createRawgCollector(options);
      // Preparado para futuras expansões:
      // case 'tvmaze':
      //   return createTVMazeCollector(options);
      // case 'marvel':
      //   return createMarvelCollector(options);
      default:
        throw new Error(`Fonte não suportada: ${source}. Fontes disponíveis: anilist, mal, rawg`);
    }
  }
  
  /**
   * Define as funções de normalização baseadas na fonte
   * @param {string} source - Fonte dos dados
   */
  setNormalizers(source) {
    switch (source.toLowerCase()) {
      case 'anilist':
        this.normalizeWork = normalizeAniListWork;
        this.normalizeCharacters = normalizeAniListCharacters;
        break;
      case 'mal':
        this.normalizeWork = normalizeJikanWork;
        this.normalizeCharacters = normalizeJikanCharacters;
        break;
      case 'rawg':
        this.normalizeWork = normalizeRawgWork;
        this.normalizeCharacters = normalizeRawgCharacters;
        break;
      // Preparado para futuras expansões:
      // case 'tvmaze':
      //   this.normalizeWork = normalizeTVMazeWork;
      //   this.normalizeCharacters = normalizeTVMazeCharacters;
      //   break;
      default:
        // Fallback para AniList
        this.normalizeWork = normalizeAniListWork;
        this.normalizeCharacters = normalizeAniListCharacters;
    }
  }

  /**
   * Importa uma obra completa (info + personagens)
   * @param {Object} criteria - Critérios para buscar a obra
   * @param {string} criteria.search - Nome da obra
   * @param {number} criteria.id - ID da obra na fonte
   * @param {string} criteria.slug - Slug da obra na fonte
   * @param {string} criteria.type - anime, manga, game, etc.
   * @param {Object} options - Opções de importação
   * @param {boolean} options.skipCharacters - Importar apenas info da obra
   * @param {number} options.characterLimit - Limite de personagens
   * @returns {Promise<Object>} Resultado da importação
   */
  async import(criteria, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Iniciando importação: ${criteria.search || criteria.id || criteria.slug}`);

      // 1. Buscar dados da obra
      logger.progress('Buscando informações da obra...');
      
      // Para jogos, usa método específico
      let mediaData;
      if (this.source === 'rawg') {
        mediaData = await this.collector.searchGame(criteria);
      } else {
        mediaData = await this.collector.searchMedia(criteria);
      }
      
      if (!mediaData) {
        throw new Error('Obra não encontrada');
      }

      // 2. Normalizar dados da obra
      const normalizedWork = this.normalizeWork(mediaData);
      
      logger.success(`Encontrado: ${normalizedWork.title}`);

      // 3. Salvar info da obra
      await this.writer.upsertWork(
        normalizedWork.type,
        normalizedWork.id,
        normalizedWork
      );

      let characterStats = null;

      // 4. Coletar personagens (se não foi desabilitado)
      if (!options.skipCharacters) {
        logger.progress('Coletando personagens...');
        
        // Adapta coleta baseado no tipo de fonte
        let rawCharacters;
        if (this.source === 'rawg') {
          // Para jogos, usa método específico
          rawCharacters = await this.collector.collectCharacters(
            normalizedWork.source_id,
            { limit: options.characterLimit || 50 }
          );
        } else {
          // Para anime/manga, usa método padrão com paginação
          rawCharacters = await this.collector.collectCharacters(
            normalizedWork.source_id,
            {
              perPage: 25,
              onProgress: (progress) => {
                logger.info(
                  `Página ${progress.page}: ${progress.collected}/${progress.total} personagens`
                );
              }
            }
          );
        }

        // Aplicar limite se especificado
        const charactersToImport = options.characterLimit
          ? rawCharacters.slice(0, options.characterLimit)
          : rawCharacters;

        if (charactersToImport.length === 0) {
          logger.warn('Nenhum personagem encontrado');
        } else {
          // 5. Normalizar personagens
          const normalizedCharacters = this.normalizeCharacters(
            charactersToImport,
            normalizedWork.id
          );

          // 6. Salvar personagens
          characterStats = await this.writer.upsertCharacters(
            normalizedWork.type,
            normalizedWork.id,
            normalizedCharacters
          );
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      logger.success(`✅ Importação concluída em ${duration}s`);

      return {
        success: true,
        work: {
          id: normalizedWork.id,
          type: normalizedWork.type,
          title: normalizedWork.title
        },
        characters: characterStats,
        duration: parseFloat(duration)
      };

    } catch (error) {
      // Tentar enrichment como fallback se habilitado e erro for recuperável
      if (this.enrich && this.isRecoverableError(error)) {
        logger.warn(`API falhou (${error.message}), tentando enrichment...`);
        return await this.importWithEnrichment(criteria, options, startTime);
      }
      
      logger.error(`Erro na importação: ${error.message}`);
      throw error;
    }
  }

  /**
   * Tenta importar usando enrichment como fallback
   * @param {Object} criteria - Critérios da obra
   * @param {Object} options - Opções de importação
   * @param {number} startTime - Tempo de início
   * @returns {Promise<Object>} Resultado da importação
   */
  async importWithEnrichment(criteria, options, startTime) {
    try {
      const title = criteria.search || `ID ${criteria.id}`;
      const type = criteria.type;

      logger.progress(`Buscando dados via enrichment para: ${title}`);

      const enrichmentData = await this.enrichmentCollector.enrichWork(title, type);

      if (!enrichmentData.found) {
        throw new Error('Enrichment não encontrou dados suficientes');
      }

      // Criar obra básica a partir dos dados de enrichment
      const basicWork = this.createBasicWorkFromEnrichment(title, type, enrichmentData);

      logger.success(`Enrichment encontrou: ${basicWork.title}`);

      // Salvar info básica da obra
      await this.writer.upsertWork(
        basicWork.type,
        basicWork.id,
        basicWork
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      logger.success(`✅ Importação via enrichment concluída em ${duration}s`);

      return {
        success: true,
        work: {
          id: basicWork.id,
          type: basicWork.type,
          title: basicWork.title
        },
        characters: null, // Enrichment não coleta personagens
        duration: parseFloat(duration),
        enriched: true
      };

    } catch (enrichmentError) {
      logger.error(`Enrichment também falhou: ${enrichmentError.message}`);
      throw enrichmentError;
    }
  }

  /**
   * Cria uma obra básica a partir dos dados de enrichment
   * @param {string} title - Título da obra
   * @param {string} type - Tipo da obra
   * @param {Object} enrichmentData - Dados do enrichment
   * @returns {Object} Obra básica
   */
  createBasicWorkFromEnrichment(title, type, enrichmentData) {
    return {
      id: slugify(title),
      type: type,
      title: title,
      source: 'enrichment',
      source_id: null,
      description: enrichmentData.description || 'Descrição não disponível via enrichment.',
      metadata: {},
      images: [],
      external_ids: {
        wiki_links: enrichmentData.wikiLinks
      },
      tags: [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  }

  /**
   * Importa apenas personagens adicionais (atualização)
   * @param {string} type - Tipo da obra
   * @param {string} workId - ID da obra
   * @param {number} anilistId - ID no AniList
   * @returns {Promise<Object>} Estatísticas
   */
  async updateCharacters(type, workId, anilistId) {
    logger.info(`Atualizando personagens: ${type}/${workId}`);

    const rawCharacters = await this.collector.collectCharacters(anilistId, {
      perPage: 25,
      onProgress: (progress) => {
        logger.info(`Página ${progress.page}: ${progress.collected} personagens`);
      }
    });

    const normalizedCharacters = normalizeCharacters(rawCharacters, workId);
    const stats = await this.writer.upsertCharacters(type, workId, normalizedCharacters);

    logger.success('✅ Atualização concluída');
    return stats;
  }

  /**
   * Importa múltiplas obras em batch
   * @param {Array<Object>} criteriaList - Lista de critérios
   * @param {Object} options - Opções gerais
   * @returns {Promise<Array>} Resultados
   */
  async importBatch(criteriaList, options = {}) {
    logger.info(`Iniciando importação em batch: ${criteriaList.length} obras`);
    
    const results = [];
    const { delayBetween = 3000 } = options;

    for (let i = 0; i < criteriaList.length; i++) {
      const criteria = criteriaList[i];
      
      logger.info(`[${i + 1}/${criteriaList.length}] Processando: ${criteria.search || criteria.id}`);

      try {
        const result = await this.import(criteria, options);
        results.push(result);
      } catch (error) {
        logger.error(`Falha: ${error.message}`);
        results.push({
          success: false,
          criteria,
          error: error.message
        });
      }

      // Delay entre importações para respeitar rate limits
      if (i < criteriaList.length - 1) {
        logger.info(`Aguardando ${delayBetween}ms...`);
        await this.delay(delayBetween);
      }
    }

    const successful = results.filter(r => r.success).length;
    logger.success(`Batch concluído: ${successful}/${criteriaList.length} sucessos`);

    return results;
  }

  /**
   * Delay helper
   * @param {number} ms - Milissegundos
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Cria uma instância do job
 * @param {Object} options - Opções
 * @returns {ImportWorkJob}
 */
export function createImportJob(options) {
  return new ImportWorkJob(options);
}
