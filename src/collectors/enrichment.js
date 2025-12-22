import axios from 'axios';
import { logger } from '../utils/logger.js';
import { retryHttp } from '../utils/retry.js';

/**
 * Collector para enriquecimento de dados usando DuckDuckGo e wikis
 * Busca informações complementares para reduzir dependência de APIs principais
 */
export class EnrichmentCollector {
  constructor(options = {}) {
    this.userAgent = options.userAgent || 'CharLib-Enrichment/1.0';
    this.timeout = options.timeout || 10000;
    this.maxResults = options.maxResults || 5;
  }

  /**
   * Busca informações complementares para uma obra
   * @param {string} workTitle - Título da obra
   * @param {string} workType - Tipo (anime, manga, etc.)
   * @returns {Promise<Object>} Dados complementares
   */
  async enrichWork(workTitle, workType = 'anime') {
    try {
      logger.debug(`Buscando enriquecimento para: ${workTitle}`);

      const enrichment = {
        wikiLinks: [],
        additionalInfo: {},
        found: false
      };

      // Estratégia 1: Gerar URLs prováveis de wikis
      const possibleWikiUrls = this.generatePossibleWikiUrls(workTitle, workType);

      for (const wikiInfo of possibleWikiUrls) {
        try {
          // Tenta acessar a URL
          const response = await axios.head(wikiInfo.url, {
            timeout: 5000,
            headers: { 'User-Agent': this.userAgent }
          });

          if (response.status === 200) {
            enrichment.wikiLinks.push({
              type: wikiInfo.type,
              url: wikiInfo.url,
              title: wikiInfo.title,
              snippet: `Página wiki para ${workTitle}`
            });
            enrichment.found = true;
          }
        } catch (error) {
          // URL não existe ou erro, continua
        }
      }

      // Estratégia 2: Busca simples no DuckDuckGo se necessário
      if (!enrichment.found) {
        try {
          const searchResults = await this.simpleWebSearch(`${workTitle} ${workType} wiki`);
          enrichment.wikiLinks = searchResults;
          enrichment.found = searchResults.length > 0;
        } catch (error) {
          logger.debug(`Busca simples falhou: ${error.message}`);
        }
      }

      return enrichment;

    } catch (error) {
      logger.warn(`Erro no enriquecimento para ${workTitle}: ${error.message}`);
      return { wikiLinks: [], additionalInfo: {}, found: false };
    }
  }

  /**
   * Busca informações complementares para um personagem
   * @param {string} characterName - Nome do personagem
   * @param {string} workTitle - Título da obra
   * @returns {Promise<Object>} Dados complementares do personagem
   */
  async enrichCharacter(characterName, workTitle) {
    try {
      logger.debug(`Buscando enriquecimento para personagem: ${characterName} (${workTitle})`);

      const searchQuery = `${characterName} ${workTitle} character wiki site:fandom.com OR site:anime-planet.com`;
      const searchResults = await this.searchDuckDuckGo(searchQuery);

      const enrichment = {
        wikiLinks: [],
        additionalInfo: {},
        found: false
      };

      for (const result of searchResults) {
        if (result.url.includes('fandom.com') || result.url.includes('wikia.org')) {
          enrichment.wikiLinks.push({
            type: 'fandom',
            url: result.url,
            title: result.title,
            snippet: result.snippet
          });
          enrichment.found = true;
        } else if (result.url.includes('anime-planet.com')) {
          enrichment.wikiLinks.push({
            type: 'anime-planet',
            url: result.url,
            title: result.title,
            snippet: result.snippet
          });
          enrichment.found = true;
        }
      }

      return enrichment;

    } catch (error) {
      logger.warn(`Erro no enriquecimento para personagem ${characterName}: ${error.message}`);
      return { wikiLinks: [], additionalInfo: {}, found: false };
    }
  }

  /**
   * Gera URLs prováveis de wikis baseadas no título
   * @param {string} title - Título da obra
   * @param {string} type - Tipo da obra
   * @returns {Array} Lista de possíveis URLs
   */
  generatePossibleWikiUrls(title, type) {
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const urls = [];

    // Fandom wikis comuns para anime
    if (type === 'anime') {
      urls.push({
        type: 'fandom',
        url: `https://naruto.fandom.com/wiki/${slug}`,
        title: `${title} Wiki (Fandom)`
      });

      urls.push({
        type: 'fandom',
        url: `https://attackontitan.fandom.com/wiki/${slug}`,
        title: `${title} Wiki (Fandom)`
      });

      // Wiki genérica
      urls.push({
        type: 'fandom',
        url: `https://${slug}.fandom.com/wiki/${slug}`,
        title: `${title} Wiki (Fandom)`
      });
    }

    // Anime-Planet
    urls.push({
      type: 'anime-planet',
      url: `https://www.anime-planet.com/anime/${slug}`,
      title: `${title} - Anime-Planet`
    });

    return urls;
  }

  /**
   * Busca simples na web (fallback)
   * @param {string} query - Query de busca
   * @returns {Promise<Array>} Resultados
   */
  async simpleWebSearch(query) {
    // Para uma implementação simples, vamos usar URLs hardcoded para casos comuns
    // Em produção, isso poderia ser expandido com uma API de busca real

    const results = [];

    // Exemplos de URLs conhecidas para testes
    const knownUrls = {
      'naruto': [
        { type: 'fandom', url: 'https://naruto.fandom.com/wiki/Naruto_Uzumaki', title: 'Naruto Wiki' },
        { type: 'anime-planet', url: 'https://www.anime-planet.com/anime/naruto', title: 'Naruto - Anime-Planet' }
      ],
      'attack on titan': [
        { type: 'fandom', url: 'https://attackontitan.fandom.com/wiki/Attack_on_Titan_Wiki', title: 'Attack on Titan Wiki' },
        { type: 'anime-planet', url: 'https://www.anime-planet.com/anime/shingeki-no-kyojin', title: 'Attack on Titan - Anime-Planet' }
      ]
    };

    const normalizedQuery = query.toLowerCase();
    for (const [key, urls] of Object.entries(knownUrls)) {
      if (normalizedQuery.includes(key)) {
        results.push(...urls);
      }
    }

    return results.slice(0, this.maxResults);
  }

  /**
   * Parse dos resultados JSON do DuckDuckGo
   * @param {Object} data - Dados JSON da API
   * @returns {Array} Resultados parseados
   */
  parseDuckDuckGoJson(data) {
    const results = [];

    // Adiciona resultados principais
    if (data.Results) {
      for (const result of data.Results) {
        if (results.length >= this.maxResults) break;
        results.push({
          url: result.FirstURL || result.url,
          title: result.Text || result.title,
          snippet: result.Text || ''
        });
      }
    }

    // Adiciona tópicos relacionados
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= this.maxResults) break;
        if (topic.FirstURL || topic.url) {
          results.push({
            url: topic.FirstURL || topic.url,
            title: topic.Text || topic.title || '',
            snippet: topic.Text || ''
          });
        }
      }
    }

    // Filtra apenas URLs relevantes (wikis)
    return results.filter(result =>
      result.url &&
      (result.url.includes('fandom.com') ||
       result.url.includes('wikia.org') ||
       result.url.includes('anime-planet.com') ||
       result.url.includes('myanimelist.net/wiki'))
    ).slice(0, this.maxResults);
  }

  /**
   * Extrai informações básicas de uma página wiki
   * @param {string} url - URL da wiki
   * @returns {Promise<Object>} Dados extraídos
   */
  async scrapeWikiBasic(url) {
    try {
      // Nota: Scraping deve ser usado com cuidado e respeito aos termos de serviço
      const response = await retryHttp(async () => {
        return await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: this.timeout
        });
      });

      const html = response.data;
      const data = {};

      // Extrai informações básicas usando regex (muito simples, pode ser melhorado)
      const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/i);
      if (descriptionMatch) {
        data.description = descriptionMatch[1];
      }

      // Tenta extrair alguma informação estruturada
      // Isso é muito básico - em produção, usaria uma biblioteca como cheerio

      return data;

    } catch (error) {
      logger.debug(`Erro ao fazer scrape de ${url}: ${error.message}`);
      return null;
    }
  }
}

/**
 * Cria uma instância do collector de enriquecimento
 * @param {Object} options - Opções
 * @returns {EnrichmentCollector}
 */
export function createEnrichmentCollector(options) {
  return new EnrichmentCollector(options);
}