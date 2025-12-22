import { createAniListCollector } from '../collectors/anilist.js';
import { normalizeWork, normalizeCharacters } from '../normalizers/anilist.js';
import { createWriter } from '../writers/jsonWriter.js';
import { logger } from '../utils/logger.js';

/**
 * Job de importação de obras e personagens
 * Orquestra: coleta -> normalização -> escrita
 */
export class ImportWorkJob {
  constructor(options = {}) {
    this.baseDir = options.baseDir || './data';
    this.collector = createAniListCollector(options.collectorOptions);
    this.writer = createWriter(this.baseDir);
  }

  /**
   * Importa uma obra completa (info + personagens)
   * @param {Object} criteria - Critérios para buscar a obra
   * @param {string} criteria.search - Nome da obra
   * @param {number} criteria.id - ID do AniList
   * @param {string} criteria.type - anime ou manga
   * @param {Object} options - Opções de importação
   * @param {boolean} options.skipCharacters - Importar apenas info da obra
   * @param {number} options.characterLimit - Limite de personagens
   * @returns {Promise<Object>} Resultado da importação
   */
  async import(criteria, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Iniciando importação: ${criteria.search || criteria.id}`);

      // 1. Buscar dados da obra
      logger.progress('Buscando informações da obra...');
      const mediaData = await this.collector.searchMedia(criteria);
      
      if (!mediaData) {
        throw new Error('Obra não encontrada');
      }

      logger.success(`Encontrado: ${mediaData.title.romaji || mediaData.title.english}`);

      // 2. Normalizar dados da obra
      const normalizedWork = normalizeWork(mediaData);
      
      logger.info(`ID gerado: ${normalizedWork.id}`);
      logger.info(`Tipo: ${normalizedWork.type}`);

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
        
        const rawCharacters = await this.collector.collectCharacters(
          mediaData.id,
          {
            perPage: 25,
            onProgress: (progress) => {
              logger.info(
                `Página ${progress.page}: ${progress.collected}/${progress.total} personagens`
              );
            }
          }
        );

        // Aplicar limite se especificado
        const charactersToImport = options.characterLimit
          ? rawCharacters.slice(0, options.characterLimit)
          : rawCharacters;

        if (charactersToImport.length === 0) {
          logger.warn('Nenhum personagem encontrado');
        } else {
          // 5. Normalizar personagens
          const normalizedCharacters = normalizeCharacters(
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
      logger.error(`Erro na importação: ${error.message}`);
      throw error;
    }
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
