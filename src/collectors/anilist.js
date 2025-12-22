import { RateLimiter } from '../utils/rateLimiter.js';
import { retryHttp } from '../utils/retry.js';
import { logger } from '../utils/logger.js';

/**
 * Cliente para a API GraphQL do AniList
 * https://anilist.gitbook.io/anilist-apiv2-docs/
 */
export class AniListCollector {
  constructor(options = {}) {
    this.apiUrl = 'https://graphql.anilist.co';
    this.rateLimiter = new RateLimiter(
      options.anilistSafe ? 5 : (options.requestsPerMinute || 10), // 5 req/min no modo safe
      60000
    );
    this.delayBetweenPages = options.delayBetweenPages || 1000; // Delay padrão de 1s
    this.smartDelay = options.smartDelay || false;
    this.baseDelay = options.baseDelay || 1000;
    this.delayMultiplier = options.delayMultiplier || 500; // Multiplicador para delay inteligente
    this.maxDelay = options.maxDelay || 10000; // Delay máximo
    this.anilistSafe = options.anilistSafe || false;
    this.lastRequestTime = null; // Para controlar delay mínimo entre requests
  }

  /**
   * Método utilitário para delay
   * @param {number} ms - Milissegundos para aguardar
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executa uma query GraphQL
   * @param {string} query - Query GraphQL
   * @param {Object} variables - Variáveis da query
   * @returns {Promise<Object>} Resposta da API
   */
  async query(query, variables = {}) {
    return this.rateLimiter.execute(async () => {
      // Delay mínimo obrigatório entre requests para evitar rate limits
      const minDelay = this.anilistSafe ? 12000 : 2000; // 12s no modo safe, 2s normal
      if (this.lastRequestTime) {
        const timeSinceLast = Date.now() - this.lastRequestTime;
        if (timeSinceLast < minDelay) {
          const waitTime = minDelay - timeSinceLast;
          console.log(`AniList: Aguardando ${waitTime}ms (delay mínimo entre requests${this.anilistSafe ? ' - SAFE MODE' : ''})`);
          await this.delay(waitTime);
        }
      }
      this.lastRequestTime = Date.now();

      return retryHttp(async () => {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ query, variables })
        });

        if (!response.ok) {
          const error = new Error(`AniList API error: ${response.status}`);
          error.response = response;
          throw error;
        }

        const data = await response.json();
        
        if (data.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        return data.data;
      }, {
        maxAttempts: 3,
        delayMs: 2000,
        onRetry: (error, attempt, delay) => {
          logger.warn(`Retry ${attempt} após erro: ${error.message} (aguardando ${delay}ms)`);
        }
      });
    });
  }

  /**
   * Busca uma obra (anime/manga) por nome ou ID
   * @param {Object} criteria - Critérios de busca
   * @param {string} criteria.search - Nome para buscar
   * @param {number} criteria.id - ID do AniList
   * @param {string} criteria.type - ANIME ou MANGA
   * @returns {Promise<Object>} Dados da obra
   */
  async searchMedia(criteria) {
    const query = `
      query ($id: Int, $search: String, $type: MediaType) {
        Media(id: $id, search: $search, type: $type) {
          id
          title {
            romaji
            english
            native
          }
          type
          format
          description(asHtml: false)
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          episodes
          chapters
          volumes
          status
          coverImage {
            large
            medium
          }
          bannerImage
          genres
          tags {
            name
            rank
          }
          averageScore
          popularity
          siteUrl
        }
      }
    `;

    const variables = {
      id: criteria.id,
      search: criteria.search,
      type: criteria.type?.toUpperCase()
    };

    const data = await this.query(query, variables);
    return data.Media;
  }

  /**
   * Coleta personagens de uma obra com paginação
   * @param {number} mediaId - ID da obra no AniList
   * @param {Object} options - Opções
   * @param {number} options.perPage - Personagens por página
   * @param {Function} options.onProgress - Callback de progresso
   * @returns {Promise<Array>} Lista de personagens
   */
  async collectCharacters(mediaId, options = {}) {
    const { perPage = 25, onProgress } = options;
    
    const allCharacters = [];
    let page = 1;
    let hasNextPage = true;
    let totalCharacters = 0;
    let currentDelay = this.delayBetweenPages;

    while (hasNextPage) {
      logger.progress(`Coletando página ${page}...`);

      const query = `
        query ($mediaId: Int, $page: Int, $perPage: Int) {
          Media(id: $mediaId) {
            characters(page: $page, perPage: $perPage, sort: [ROLE, RELEVANCE, ID]) {
              pageInfo {
                hasNextPage
                currentPage
                lastPage
                total
              }
              edges {
                role
                node {
                  id
                  name {
                    full
                    native
                    alternative
                  }
                  image {
                    large
                    medium
                  }
                  description(asHtml: false)
                  gender
                  age
                  dateOfBirth {
                    year
                    month
                    day
                  }
                  siteUrl
                }
              }
            }
          }
        }
      `;

      const variables = { mediaId, page, perPage };
      const data = await this.query(query, variables);
      
      const charactersData = data.Media.characters;
      allCharacters.push(...charactersData.edges);

      hasNextPage = charactersData.pageInfo.hasNextPage;

      // Ajustar delay inteligente na primeira página
      if (page === 1 && this.smartDelay) {
        totalCharacters = charactersData.pageInfo.total;
        currentDelay = Math.min(
          this.maxDelay,
          this.baseDelay + Math.floor((totalCharacters / 100) * this.delayMultiplier)
        );
        logger.info(`Delay inteligente ativado: ${totalCharacters} personagens, delay ajustado para ${currentDelay}ms por página`);
      }

      page++;

      if (onProgress) {
        onProgress({
          page: charactersData.pageInfo.currentPage,
          total: charactersData.pageInfo.total,
          collected: allCharacters.length
        });
      }

      // Pequeno delay adicional entre páginas
      if (hasNextPage) {
        await this.delay(currentDelay);
      }
    }

    logger.success(`Coletados ${allCharacters.length} personagens`);
    return allCharacters;
  }

  /**
   * Busca múltiplas obras
   * @param {string} searchTerm - Termo de busca
   * @param {string} type - ANIME ou MANGA
   * @param {number} perPage - Resultados por página
   * @returns {Promise<Array>} Lista de obras
   */
  async searchMultipleMedia(searchTerm, type, perPage = 10) {
    const query = `
      query ($search: String, $type: MediaType, $perPage: Int) {
        Page(perPage: $perPage) {
          media(search: $search, type: $type, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            type
            format
            startDate {
              year
            }
            coverImage {
              medium
            }
            popularity
          }
        }
      }
    `;

    const variables = {
      search: searchTerm,
      type: type?.toUpperCase(),
      perPage
    };

    const data = await this.query(query, variables);
    return data.Page.media;
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
 * Cria uma instância do collector AniList
 * @param {Object} options - Opções
 * @returns {AniListCollector}
 */
export function createAniListCollector(options) {
  return new AniListCollector(options);
}
