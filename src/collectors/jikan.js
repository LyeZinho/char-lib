/**
 * Cliente para a API Jikan (MyAnimeList)
 * https://jikan.moe/
 */
import { createRateLimiter } from '../utils/rateLimiter.js';

export class JikanCollector {
  constructor(options = {}) {
    this.apiUrl = 'https://api.jikan.moe/v4';
    this.rateLimiter = options.rateLimiter || createRateLimiter(1); // 1 req/segundo
  }

  /**
   * Executa uma requisição GET para a API
   * @param {string} endpoint - Endpoint da API
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async request(endpoint, params = {}) {
    await this.rateLimiter.waitForSlot();

    const url = new URL(`${this.apiUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Busca um anime por nome ou ID
   * @param {Object} criteria - Critérios de busca
   * @param {string} criteria.search - Nome para buscar
   * @param {number} criteria.id - ID do MAL
   * @returns {Promise<Object>} Dados do anime
   */
  async searchMedia(criteria) {
    if (criteria.id) {
      const data = await this.request(`/anime/${criteria.id}`);
      return data.data;
    } else {
      const data = await this.request('/anime', { q: criteria.search, limit: 1 });
      if (data.data.length === 0) {
        throw new Error('Anime não encontrado');
      }
      return data.data[0];
    }
  }

  /**
   * Coleta personagens de um anime
   * @param {number} malId - ID do anime no MAL
   * @param {Object} options - Opções
   * @param {number} options.limit - Limite de personagens
   * @returns {Promise<Array>} Lista de personagens
   */
  async collectCharacters(malId, options = {}) {
    const limit = options.limit || 100; // MAL pode ter mais
    const data = await this.request(`/anime/${malId}/characters`);

    // Jikan retorna todos de uma vez, mas podemos limitar
    const characters = data.data.slice(0, limit);

    return characters.map(char => ({
      node: {
        id: char.character.mal_id,
        name: {
          full: char.character.name,
          native: char.character.name, // MAL não tem native separado
          alternative: char.character.nicknames || []
        },
        image: {
          large: char.character.images?.jpg?.image_url
        },
        description: char.character.about || '',
        gender: char.character.gender,
        age: char.character.birthday ? new Date().getFullYear() - new Date(char.character.birthday).getFullYear() : null,
        dateOfBirth: char.character.birthday ? {
          year: new Date(char.character.birthday).getFullYear(),
          month: new Date(char.character.birthday).getMonth() + 1,
          day: new Date(char.character.birthday).getDate()
        } : null
      },
      role: char.role.toUpperCase(), // MAIN, SUPPORTING
      voiceActors: char.voice_actors?.map(va => ({
        id: va.person.mal_id,
        name: {
          full: va.person.name
        },
        language: va.language
      })) || []
    }));
  }

  /**
   * Busca múltiplos animes
   * @param {string} searchTerm - Termo de busca
   * @param {number} limit - Limite de resultados
   * @returns {Promise<Array>} Lista de animes
   */
  async searchMultipleMedia(searchTerm, limit = 10) {
    const data = await this.request('/anime', { q: searchTerm, limit });
    return data.data;
  }
}

/**
 * Cria uma instância do collector Jikan
 * @param {Object} options - Opções
 * @returns {JikanCollector}
 */
export function createJikanCollector(options) {
  return new JikanCollector(options);
}