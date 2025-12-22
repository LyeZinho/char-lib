/**
 * Cliente para a API RAWG (Video Games Database)
 * https://rawg.io/apidocs
 * 
 * Nota: RAWG API requer uma chave de API gratuita
 * Obtenha em: https://rawg.io/apidocs
 */
import { RateLimiter } from '../utils/rateLimiter.js';
import { retryHttp } from '../utils/retry.js';

export class RawgCollector {
  constructor(options = {}) {
    this.apiUrl = 'https://api.rawg.io/api';
    this.apiKey = options.apiKey || process.env.RAWG_API_KEY;
    this.rateLimiter = new RateLimiter(
      options.requestsPerMinute || 20, // RAWG tem limite de ~20 req/min na versão gratuita
      60000
    );
    
    if (!this.apiKey) {
      console.warn('⚠️  RAWG_API_KEY não configurada. Obtenha uma chave em https://rawg.io/apidocs');
    }
  }

  /**
   * Executa uma requisição GET para a API
   * @param {string} endpoint - Endpoint da API
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async request(endpoint, params = {}) {
    return this.rateLimiter.execute(async () => {
      return retryHttp(async () => {
        const url = new URL(`${this.apiUrl}${endpoint}`);
        url.searchParams.append('key', this.apiKey);
        
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, value.toString());
          }
        });

        const response = await fetch(url.toString());
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`RAWG API error: ${response.status} - ${errorText}`);
        }
        
        return response.json();
      });
    });
  }

  /**
   * Busca um jogo por nome ou ID
   * @param {Object} criteria - Critérios de busca
   * @param {string} criteria.search - Nome para buscar
   * @param {number} criteria.id - ID do jogo na RAWG
   * @param {string} criteria.slug - Slug do jogo na RAWG
   * @returns {Promise<Object>} Dados do jogo
   */
  async searchGame(criteria) {
    // Busca por ID ou slug direto
    if (criteria.id || criteria.slug) {
      const identifier = criteria.id || criteria.slug;
      return this.request(`/games/${identifier}`);
    }

    // Busca por nome
    if (criteria.search) {
      const searchResult = await this.request('/games', {
        search: criteria.search,
        page_size: 5
      });

      if (!searchResult.results || searchResult.results.length === 0) {
        throw new Error(`Jogo não encontrado: ${criteria.search}`);
      }

      // Retorna o jogo mais relevante (primeiro resultado)
      const topResult = searchResult.results[0];
      
      // Busca detalhes completos do jogo
      return this.request(`/games/${topResult.id}`);
    }

    throw new Error('Forneça um nome, ID ou slug para buscar o jogo');
  }

  /**
   * Busca personagens/criadores de um jogo
   * Nota: RAWG não tem endpoint específico para personagens
   * Retorna criadores/desenvolvedores como "personagens importantes"
   * @param {number} gameId - ID do jogo na RAWG
   * @param {Object} options - Opções
   * @param {number} options.limit - Limite de resultados
   * @returns {Promise<Array>} Lista de personagens/criadores
   */
  async collectCharacters(gameId, options = {}) {
    const { limit = 50 } = options;
    const characters = [];

    try {
      // Para jogos, coletamos creators/desenvolvedores já que não há characters fictícios disponíveis na API
      // Buscar detalhes do jogo incluindo desenvolvimento
      const gameDetails = await this.request(`/games/${gameId}`);

      // Buscar equipe de desenvolvimento
      const developmentTeam = await this.request(`/games/${gameId}/development-team`, {
        page_size: limit
      });

      if (developmentTeam.results) {
        for (const member of developmentTeam.results.slice(0, limit)) {
          characters.push({
            id: member.id,
            name: member.name,
            role: this.mapPositionToRole(member.positions || []),
            description: member.positions?.map(p => p.name).join(', ') || '',
            images: member.image ? [member.image] : [],
            metadata: {
              games_count: member.games_count,
              positions: member.positions?.map(p => p.name) || []
            },
            external_ids: {
              rawg: member.id
            }
          });
        }
      }

      // Adicionar informações de criadores principais do jogo
      if (gameDetails.creators) {
        for (const creator of gameDetails.creators) {
          if (!characters.find(c => c.external_ids.rawg === creator.id)) {
            characters.push({
              id: creator.id,
              name: creator.name,
              role: 'creator',
              description: creator.positions?.map(p => p.name).join(', ') || 'Game Creator',
              images: creator.image ? [creator.image] : [],
              metadata: {
                games_count: creator.games_count
              },
              external_ids: {
                rawg: creator.id
              }
            });
          }
        }
      }

      return characters;
    } catch (error) {
      console.warn(`⚠️  Erro ao coletar criadores do jogo ${gameId}:`, error.message);
      return [];
    }
  }

  /**
   * Mapeia posições da equipe para roles do nosso schema
   * @param {Array} positions - Array de posições
   * @returns {string} Role normalizado
   */
  mapPositionToRole(positions) {
    if (!positions || positions.length === 0) return 'other';
    
    const positionNames = positions.map(p => p.name.toLowerCase()).join(' ');
    
    if (positionNames.includes('director') || positionNames.includes('creator')) {
      return 'protagonist';
    }
    if (positionNames.includes('producer') || positionNames.includes('designer')) {
      return 'supporting';
    }
    
    return 'other';
  }

  /**
   * Busca jogos populares
   * @param {Object} options - Opções de busca
   * @param {number} options.page - Página
   * @param {number} options.pageSize - Itens por página
   * @returns {Promise<Object>} Lista de jogos
   */
  async searchPopularGames(options = {}) {
    const { page = 1, pageSize = 20 } = options;
    
    return this.request('/games', {
      ordering: '-rating,-metacritic',
      page,
      page_size: pageSize
    });
  }

  /**
   * Busca múltiplos jogos
   * @param {string} searchTerm - Termo de busca
   * @param {number} limit - Limite de resultados
   * @returns {Promise<Array>} Lista de jogos
   */
  async searchMultipleGames(searchTerm, limit = 10) {
    const result = await this.request('/games', {
      search: searchTerm,
      page_size: limit
    });
    
    return result.results || [];
  }
}

/**
 * Cria uma instância do collector RAWG
 * @param {Object} options - Opções
 * @returns {RawgCollector}
 */
export function createRawgCollector(options) {
  return new RawgCollector(options);
}
