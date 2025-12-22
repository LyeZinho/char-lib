/**
 * Job de crawling automático
 * Descobre obras populares e as importa automaticamente
 */
import { createAniListCollector } from '../collectors/anilist.js';
import { createRawgCollector } from '../collectors/rawg.js';
import { createImportJob } from './importWork.js';
import { createWriter } from '../writers/jsonWriter.js';
import { readJson, writeJson } from '../utils/file.js';
import { createWorkCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { join } from 'path';

/**
 * Delay helper
 * @param {number} ms - Milissegundos
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class AutoCrawlJob {
  constructor(options = {}) {
    this.baseDir = options.baseDir || './data';
    this.type = options.type || 'anime'; // anime, game, manga, etc.
    this.source = options.source;
    this.maxWorks = options.maxWorks || 50; // Máximo de obras por execução
    this.characterLimit = options.characterLimit || 50;
    this.delayBetweenImports = options.delayBetweenImports || 10000; // 10s entre imports
    this.enrich = options.enrich || false;
    this.stateFile = join(this.baseDir, `crawl-state-${this.type}.json`);

    // Mapeamento de tipos para fontes padrão
    this.sourceMap = {
      'anime': 'anilist',
      'manga': 'anilist',
      // 'game': 'rawg', // Desabilitado temporariamente - RAWG não oferece personagens fictícios
      // Preparado para futuras expansões
      'cartoon': 'tvmaze',
      'comic': 'marvel'
    };

    // Determinar fonte baseada no tipo
    if (!this.source && this.type) {
      this.source = this.sourceMap[this.type] || 'anilist';
    } else if (!this.source) {
      this.source = 'anilist';
    }

    // Criar collector apropriado
    this.collector = this.createCollector(this.source);

    this.writer = createWriter(this.baseDir);
    this.cache = createWorkCache({ cacheFile: join(this.baseDir, 'work-cache.json') });
  }

  /**
   * Cria o collector apropriado baseado na fonte
   * @param {string} source - Fonte dos dados
   * @returns {Object} Instância do collector
   */
  createCollector(source) {
    switch (source.toLowerCase()) {
      case 'anilist':
        return createAniListCollector();
      case 'rawg':
        return createRawgCollector();
      default:
        return createAniListCollector();
    }
  }

  /**
   * Carrega o estado atual do crawling
   * @returns {Promise<Object>} Estado atual
   */
  async loadState() {
    try {
      const state = await readJson(this.stateFile);
      if (state) {
        // Converter array de volta para Set
        state.processedWorks = new Set(state.processedWorks || []);
        return state;
      }
    } catch {
      // Arquivo não existe ou inválido
    }
    
    return {
      lastCrawled: null,
      processedWorks: new Set(),
      queue: [],
      stats: {
        totalProcessed: 0,
        totalCharacters: 0,
        lastRun: null
      }
    };
  }

  /**
   * Salva o estado do crawling
   * @param {Object} state - Estado a salvar
   * @returns {Promise<void>}
   */
  async saveState(state) {
    // Converter Set para Array para JSON
    const stateToSave = {
      ...state,
      processedWorks: Array.from(state.processedWorks),
      stats: {
        ...state.stats,
        lastRun: new Date().toISOString()
      }
    };

    await writeJson(this.stateFile, stateToSave);
  }

  /**
   * Busca obras populares para adicionar à fila
   * @param {Object} state - Estado atual
   * @returns {Promise<Array>} Lista de obras descobertas
   */
  async discoverWorks(state) {
    logger.info(`🔍 Descobrindo novas obras populares (${this.type})...`);

    try {
      if (this.source === 'rawg') {
        return await this.discoverGames(state);
      } else {
        return await this.discoverAnime(state);
      }
    } catch (error) {
      logger.error(`Erro ao descobrir obras: ${error.message}`);
      return [];
    }
  }

  /**
   * Busca animes populares (AniList)
   * @param {Object} state - Estado atual
   * @returns {Promise<Array>} Lista de animes descobertos
   */
  async discoverAnime(state) {
    // Query GraphQL para buscar animes populares
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
            }
            popularity
            averageScore
            episodes
            status
          }
          pageInfo {
            hasNextPage
            currentPage
          }
        }
      }
    `;

    const variables = {
      page: 1,
      perPage: 20 // Buscar top 20 populares
    };

    const response = await this.collector.query(query, variables);
    const media = response.data?.Page?.media || response.Page?.media;

    // Filtrar obras já processadas
    const newWorks = media.filter(work => {
      const workId = work.id.toString();
      return !state.processedWorks.has(workId);
    });

    logger.info(`📋 Encontrados ${newWorks.length} novos animes para processar`);

    return newWorks.map(work => ({
      id: work.id,
      title: work.title.romaji || work.title.english,
      popularity: work.popularity,
      score: work.averageScore,
      episodes: work.episodes,
      status: work.status,
      type: 'anime'
    }));
  }

  /**
   * Busca jogos populares (RAWG)
   * @param {Object} state - Estado atual
   * @returns {Promise<Array>} Lista de jogos descobertos
   */
  async discoverGames(state) {
    const gamesResult = await this.collector.searchPopularGames({
      page: 1,
      pageSize: 20 // Buscar top 20 populares
    });

    const games = gamesResult.results || [];

    // Filtrar jogos já processados
    const newGames = games.filter(game => {
      const gameId = game.id.toString();
      return !state.processedWorks.has(gameId);
    });

    logger.info(`📋 Encontrados ${newGames.length} novos jogos para processar`);

    return newGames.map(game => ({
      id: game.id,
      title: game.name,
      rating: game.rating,
      metacritic: game.metacritic,
      released: game.released,
      platforms: game.platforms?.map(p => p.platform?.name).filter(Boolean) || [],
      type: 'game'
    }));
  }

  /**
   * Processa uma obra da fila
   * @param {Object} work - Obra a processar
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processWork(work) {
    logger.info(`🚀 Processando: ${work.title} (ID: ${work.id})`);

    try {
      const importJob = createImportJob({
        baseDir: this.baseDir,
        source: this.source,
        type: work.type || this.type, // Usar tipo da obra ou padrão
        enrich: this.enrich
      });

      const result = await importJob.import({
        id: work.id,
        type: work.type || this.type
      }, {
        characterLimit: this.characterLimit,
        skipCharacters: false
      });

      logger.success(`✅ ${work.title} processada com sucesso`);
      logger.info(`   📊 ${result.characters?.total || 0} ${this.source === 'rawg' ? 'criadores' : 'personagens'}`);

      // Marcar obra como processada no cache
      await this.cache.load();
      this.cache.markProcessed(work.id.toString(), {
        title: work.title,
        type: work.type || this.type,
        charactersCount: result.characters?.total || 0,
        processedAt: new Date().toISOString()
      });
      await this.cache.save();

      return {
        success: true,
        work: result.work,
        characters: result.characters,
        duration: result.duration
      };

    } catch (error) {
      logger.error(`❌ Erro ao processar ${work.title}: ${error.message}`);
      return {
        success: false,
        work: work,
        error: error.message
      };
    }
  }

  /**
   * Executa o crawling automático
   * @param {Object} options - Opções de execução
   * @returns {Promise<Object>} Relatório final
   */
  async crawl(options = {}) {
    const maxWorks = options.maxWorks || this.maxWorks;
    const continueFromQueue = options.continueFromQueue || false;

    logger.info('🤖 Iniciando crawling automático...');
    logger.info(`📊 Configuração: max ${maxWorks} obras, limite ${this.characterLimit} personagens`);

    // Carregar estado
    const state = await this.loadState();

    // Se não deve continuar da fila OU se a fila estiver vazia, descobrir/aumentar fila
    if (!continueFromQueue || state.queue.length === 0) {
      logger.info('🔍 Descobrindo novas obras populares...');
      const growResult = await this.growQueue({ count: 50 }); // Buscar 50 obras por vez
      if (growResult.added === 0) {
        logger.warn('⚠️  Nenhuma nova obra encontrada para adicionar à fila');
      } else {
        logger.info(`📋 Adicionadas ${growResult.added} obras à fila`);
      }
      // Recarregar estado após growQueue
      const updatedState = await this.loadState();
      state.queue = updatedState.queue;
    }

    // Filtrar fila para remover duplicatas (usar cache também)
    await this.cache.load();
    const processedIds = new Set(state.processedWorks);
    const cachedIds = new Set(this.cache.listProcessed());
    state.queue = state.queue.filter(work => {
      const workId = work.id.toString();
      return !processedIds.has(workId) && !cachedIds.has(workId);
    });

    if (state.queue.length === 0) {
      logger.info('📋 Nenhuma obra nova na fila');
      return { processed: 0, skipped: 0 };
    }

    logger.info(`📋 Fila atual: ${state.queue.length} obras`);
    logger.info(`✅ Já processadas: ${state.processedWorks.size} obras`);

    // Processar obras da fila
    let processed = 0;
    let skipped = 0;
    const results = [];

    for (let i = 0; i < Math.min(maxWorks, state.queue.length); i++) {
      const work = state.queue[i];

      // Verificar se já foi processada (segurança extra)
      if (state.processedWorks.has(work.id.toString())) {
        logger.info(`⏭️  Pulando ${work.title} (já processada)`);
        skipped++;
        continue;
      }

      const result = await this.processWork(work);

      if (result.success) {
        state.processedWorks.add(work.id.toString());
        state.stats.totalProcessed++;
        state.stats.totalCharacters += result.characters?.total || 0;
        processed++;
      }

      results.push(result);

      // Delay entre importações para respeitar rate limits
      if (i < state.queue.length - 1) {
        logger.info(`⏳ Aguardando ${this.delayBetweenImports}ms antes da próxima...`);
        await sleep(this.delayBetweenImports);
      }
    }

    // Remover obras processadas da fila
    state.queue = state.queue.slice(Math.min(maxWorks, state.queue.length));

    // Salvar estado
    await this.saveState(state);

    // Relatório final
    const report = {
      processed,
      skipped,
      remaining: state.queue.length,
      totalProcessed: state.stats.totalProcessed,
      totalCharacters: state.stats.totalCharacters,
      results
    };

    logger.success('🏁 Crawling concluído!');
    logger.info(`📊 Processadas: ${processed}, Puladas: ${skipped}, Restantes: ${report.remaining}`);
    logger.info(`📈 Total acumulado: ${report.totalProcessed} obras, ${report.totalCharacters} personagens`);

    return report;
  }

  /**
   * Mostra status atual do crawling
   * @returns {Promise<void>}
   */
  async showStatus() {
    const state = await this.loadState();

    console.log('\n🤖 Status do Auto-Crawling:\n');

    console.log(`📊 Estatísticas:`);
    console.log(`   Total de obras processadas: ${state.stats.totalProcessed}`);
    console.log(`   Total de personagens: ${state.stats.totalCharacters}`);
    console.log(`   Última execução: ${state.stats.lastRun || 'Nunca'}`);

    console.log(`\n📋 Fila atual:`);
    console.log(`   Obras na fila: ${state.queue.length}`);

    if (state.queue.length > 0) {
      console.log('\n   Próximas obras:');
      state.queue.slice(0, 5).forEach((work, i) => {
        console.log(`     ${i + 1}. ${work.title} (ID: ${work.id})`);
      });

      if (state.queue.length > 5) {
        console.log(`     ... e mais ${state.queue.length - 5} obras`);
      }
    }

    console.log(`\n✅ Obras já processadas: ${state.processedWorks.size}`);
  }

  /**
   * Limpa a fila de obras pendentes
   * @returns {Promise<void>}
   */
  async clearQueue() {
    const state = await this.loadState();
    state.queue = [];
    await this.saveState(state);
    logger.success('🗑️  Fila limpa!');
  }

  /**
   * Lista obras já processadas (índice)
   * @param {Object} options - Opções de listagem
   * @returns {Promise<void>}
   */
  async listProcessed(options = {}) {
    const state = await this.loadState();
    const limit = options.limit || 20;

    console.log('\n📚 Índice de Obras Processadas:\n');

    // Converter Set para Array e ordenar por data de processamento (se disponível)
    const processedList = Array.from(state.processedWorks);

    if (processedList.length === 0) {
      console.log('Nenhuma obra processada ainda.');
      return;
    }

    console.log(`Total: ${processedList.length} obras\n`);

    // Mostrar primeiras obras
    for (let i = 0; i < Math.min(limit, processedList.length); i++) {
      const workId = processedList[i];
      console.log(`  ${i + 1}. ${workId}`);
    }

    if (processedList.length > limit) {
      console.log(`\n  ... e mais ${processedList.length - limit} obras`);
    }
  }
}

/**
 * Aumenta a fila descobrindo mais obras populares
 * @param {Object} options - Opções
 * @param {number} options.count - Número de obras a adicionar (padrão: 20)
 * @param {number} options.page - Página inicial para busca (padrão: 1)
 * @returns {Promise<Object>} Relatório do crescimento da fila
 */
AutoCrawlJob.prototype.growQueue = async function(options = {}) {
  const count = options.count || 20;
  const startPage = options.page || 1;

  logger.info(`🌱 Aumentando fila com ${count} novas obras (${this.type})...`);

  const state = await this.loadState();

  try {
    let allNewWorks = [];

    if (this.type === 'anime' || this.type === 'manga') {
      // Query GraphQL para buscar animes/mangas populares
      const mediaType = this.type.toUpperCase();
      const query = `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(type: ${mediaType}, sort: POPULARITY_DESC) {
              id
              title {
                romaji
                english
              }
              popularity
              averageScore
              episodes
              status
            }
            pageInfo {
              hasNextPage
              currentPage
            }
          }
        }
      `;

      let currentPage = startPage;
      let remaining = count;

      // Buscar múltiplas páginas se necessário
      while (remaining > 0 && currentPage <= 10) { // Limitar a 10 páginas para evitar sobrecarga
        const perPage = Math.min(remaining, 50); // Máximo 50 por página

        const variables = {
          page: currentPage,
          perPage: perPage
        };

        logger.progress(`Buscando página ${currentPage} (${perPage} obras)...`);

        const response = await this.collector.query(query, variables);
        const media = response.data?.Page?.media || response.Page?.media;

        if (!media || media.length === 0) {
          logger.warn(`Página ${currentPage} não retornou resultados`);
          break;
        }

        // Filtrar obras já processadas ou já na fila
        await this.cache.load();
        const processedIds = new Set(state.processedWorks);
        const queueIds = new Set(state.queue.map(w => w.id.toString()));
        const cachedIds = new Set(this.cache.listProcessed());

        const newWorks = media.filter(work => {
          const workId = work.id.toString();
          return !processedIds.has(workId) && !queueIds.has(workId) && !cachedIds.has(workId);
        });

        allNewWorks = [...allNewWorks, ...newWorks];
        remaining -= newWorks.length;

        logger.info(`   + ${newWorks.length} novas obras da página ${currentPage}`);

        // Verificar se há mais páginas
        const pageInfo = response.data?.Page?.pageInfo || response.Page?.pageInfo;
        if (!pageInfo?.hasNextPage) {
          break;
        }

        currentPage++;
        await sleep(1000); // Pequeno delay entre páginas
      }

      // Adicionar à fila
      const worksToAdd = allNewWorks.slice(0, count).map(work => ({
        id: work.id,
        title: work.title.romaji || work.title.english,
        popularity: work.popularity,
        score: work.averageScore,
        episodes: work.episodes,
        status: work.status
      }));

      state.queue = [...state.queue, ...worksToAdd];

    } else {
      throw new Error(`Tipo '${this.type}' não suportado. Use 'anime' ou 'manga'. Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios).`);
    }

    await this.saveState(state);

    logger.success(`✅ Fila aumentada! Adicionadas ${allNewWorks.slice(0, count).length} obras`);

    return {
      added: allNewWorks.slice(0, count).length,
      totalQueue: state.queue.length,
      requested: count
    };

  } catch (error) {
    logger.error(`Erro ao aumentar fila: ${error.message}`);
    throw error;
  }
};

/**
 * Cria uma instância do job de auto-crawling
 * @param {Object} options - Opções
 * @returns {AutoCrawlJob}
 */
export function createAutoCrawlJob(options) {
  return new AutoCrawlJob(options);
}