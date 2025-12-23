import axios from 'axios';
import * as cheerio from 'cheerio';
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

      // Para jogos, tenta primeiro o enriquecimento via Fandom (mais estruturado)
      if (workType === 'game') {
        const fandomResult = await this.enrichGameWithFandom(workTitle);
        if (fandomResult.found && fandomResult.characters.length > 0) {
          logger.info(`Enriquecimento Fandom bem-sucedido: ${fandomResult.characters.length} personagens`);
          return fandomResult;
        }
        logger.info(`Fallback para método básico (Fandom não retornou resultados)`);
      }

      // Fallback para método básico (regex-based) para outros tipos ou se Fandom falhar
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

      // Tenta extrair lista de personagens a partir de seções comuns ('Characters', 'Cast')
      const characters = [];

      // Procura seção com título 'Characters' ou 'Cast' seguida por uma <ul> ou <table>
      const sectionRegex = /<h[12][^>]*>(?:\s|&nbsp;|<[^>]*>)*?(Characters|Cast)[:]?<\/h[12]>[\s\S]*?(?:<ul[\s\S]*?<\/ul>|<table[\s\S]*?<\/table>)/i;
      const sectionMatch = html.match(sectionRegex);

      if (sectionMatch) {
        const sectionHtml = sectionMatch[0];

        // Extrai itens de <ul>
        const ulMatch = sectionHtml.match(/<ul[\s\S]*?<\/ul>/i);
        if (ulMatch) {
          const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
          let m;
          while ((m = liRegex.exec(ulMatch[0])) !== null) {
            const text = m[1].replace(/<[^>]*>/g, '').trim();
            if (text) {
              // Limpar informações extras (papéis entre parênteses, etc.)
              const cleanName = text.split(/[()–—\/]/)[0].trim();
              characters.push(cleanName);
            }
          }
        } else {
          // Tenta extrair de tabelas (rows)
          const trRegex = /<tr[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
          let t;
          while ((t = trRegex.exec(sectionHtml)) !== null) {
            const text = t[1].replace(/<[^>]*>/g, '').trim();
            if (text) {
              const cleanName = text.split(/[()–—\/]/)[0].trim();
              characters.push(cleanName);
            }
          }
        }
      } else {
        // Fallback: busca textual simples 'Characters: ...'
        const simpleMatch = html.match(/Characters[:\s]*([A-Za-z0-9,\-()\.\s]{10,500})/i);
        if (simpleMatch) {
          const names = simpleMatch[1].split(/[\,\n]+/).map(n => n.replace(/<[^>]*>/g, '').trim()).filter(Boolean);
          characters.push(...names);
        }
      }

      data.characters = Array.from(new Set(characters)).slice(0, 200);

      return data;

    } catch (error) {
      logger.debug(`Erro ao fazer scrape de ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca o URL da wiki do Fandom para um jogo usando DuckDuckGo
   * @param {string} gameName - Nome do jogo
   * @returns {Promise<string|null>} URL base do Fandom ou null
   */
  async findFandomWiki(gameName) {
    try {
      logger.debug(`Buscando wiki do Fandom para: ${gameName}`);

      // Busca no DuckDuckGo usando HTML search (sem API key)
      const searchQuery = encodeURIComponent(`${gameName} characters site:fandom.com`);
      const searchUrl = `https://html.duckduckgo.com/html/?q=${searchQuery}`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data);
      
      // Extrai links dos resultados
      const fandomLinks = [];
      $('.result__a').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && href.includes('fandom.com')) {
          // Extrai URL real do redirect do DuckDuckGo
          const urlMatch = href.match(/uddg=([^&]+)/);
          if (urlMatch) {
            const realUrl = decodeURIComponent(urlMatch[1]);
            fandomLinks.push(realUrl);
          }
        }
      });

      if (fandomLinks.length === 0) {
        logger.debug(`Nenhuma wiki do Fandom encontrada para: ${gameName}`);
        return null;
      }

      // Extrai o base URL (exemplo: https://nier.fandom.com)
      const firstLink = fandomLinks[0];
      const baseUrlMatch = firstLink.match(/(https?:\/\/[^\/]+\.fandom\.com)/);
      if (baseUrlMatch) {
        const baseUrl = baseUrlMatch[1];
        logger.info(`Wiki do Fandom encontrada: ${baseUrl}`);
        return baseUrl;
      }

      return null;

    } catch (error) {
      logger.warn(`Erro ao buscar wiki do Fandom para ${gameName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Lista personagens da categoria Characters usando MediaWiki API
   * @param {string} fandomBaseUrl - URL base do Fandom (ex: https://nier.fandom.com)
   * @param {string} category - Nome da categoria (padrão: 'Category:Characters')
   * @returns {Promise<Array>} Lista de títulos de páginas de personagens
   */
  async listFandomCharacters(fandomBaseUrl, category = 'Category:Characters') {
    try {
      logger.debug(`Listando personagens de ${fandomBaseUrl}/${category}`);

      const apiUrl = `${fandomBaseUrl}/api.php`;
      const params = {
        action: 'query',
        list: 'categorymembers',
        cmtitle: category,
        cmlimit: 500,
        format: 'json'
      };

      const response = await axios.get(apiUrl, {
        params,
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: this.timeout
      });

      const members = response.data?.query?.categorymembers || [];
      
      logger.info(`Encontrados ${members.length} personagens em ${category}`);
      
      // Retorna apenas os títulos das páginas
      return members.map(member => member.title);

    } catch (error) {
      logger.warn(`Erro ao listar personagens de ${fandomBaseUrl}: ${error.message}`);
      return [];
    }
  }

  /**
   * Extrai dados estruturados de uma página de personagem do Fandom
   * @param {string} fandomBaseUrl - URL base do Fandom
   * @param {string} pageTitle - Título da página do personagem
   * @returns {Promise<Object|null>} Dados do personagem ou null
   */
  async scrapeFandomCharacter(fandomBaseUrl, pageTitle) {
    try {
      logger.debug(`Extraindo dados do personagem: ${pageTitle}`);

      const apiUrl = `${fandomBaseUrl}/api.php`;
      const params = {
        action: 'parse',
        page: pageTitle,
        prop: 'text',
        format: 'json'
      };

      const response = await axios.get(apiUrl, {
        params,
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: this.timeout
      });

      const html = response.data?.parse?.text?.['*'];
      if (!html) {
        logger.debug(`Sem HTML para página: ${pageTitle}`);
        return null;
      }

      const $ = cheerio.load(html);
      
      // Busca infobox portátil do Fandom
      const infobox = $('.portable-infobox');
      if (infobox.length === 0) {
        logger.debug(`Nenhuma infobox encontrada para: ${pageTitle}`);
        return null;
      }

      const character = {
        name: pageTitle,
        data: {}
      };

      // Extrai título da infobox
      const title = infobox.find('.pi-title').first().text().trim();
      if (title) {
        character.name = title;
      }

      // Extrai imagem
      const image = infobox.find('.pi-image img').first();
      if (image.length > 0) {
        let imgSrc = image.attr('src') || image.attr('data-src');
        if (imgSrc) {
          // Remove parâmetros de thumbnail para obter imagem original
          imgSrc = imgSrc.split('/revision/')[0];
          character.data.image = imgSrc;
        }
      }

      // Extrai campos de dados (label + value)
      infobox.find('.pi-data').each((i, elem) => {
        const label = $(elem).find('.pi-data-label').text().trim();
        const value = $(elem).find('.pi-data-value').text().trim();
        
        if (label && value) {
          // Normaliza o label para key válida
          const key = label.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_');
          character.data[key] = value;
        }
      });

      // Extrai descrição (primeiro parágrafo do conteúdo)
      const content = $('.mw-parser-output > p').first().text().trim();
      if (content && content.length > 20) {
        character.data.description = content.substring(0, 500);
      }

      logger.debug(`Personagem extraído: ${character.name} (${Object.keys(character.data).length} campos)`);
      
      return character;

    } catch (error) {
      logger.debug(`Erro ao extrair personagem ${pageTitle}: ${error.message}`);
      return null;
    }
  }

  /**
   * Enriquece um jogo usando Fandom (busca + MediaWiki API + scraping)
   * @param {string} gameName - Nome do jogo
   * @returns {Promise<Object>} Dados enriquecidos
   */
  async enrichGameWithFandom(gameName) {
    try {
      logger.info(`Iniciando enriquecimento Fandom para: ${gameName}`);

      const result = {
        found: false,
        source: 'fandom',
        wikiUrl: null,
        characters: []
      };

      // Passo 1: Encontrar wiki do Fandom
      const fandomUrl = await this.findFandomWiki(gameName);
      if (!fandomUrl) {
        logger.info(`Wiki do Fandom não encontrada para: ${gameName}`);
        return result;
      }

      result.wikiUrl = fandomUrl;
      result.found = true;

      // Passo 2: Tentar diferentes categorias de personagens
      const characterCategories = [
        'Category:Characters',
        'Category:Playable_Characters',
        'Category:Heroes',
        'Category:Villains',
        'Category:Antagonists',
        'Category:Bosses',
        'Category:NPCs'
      ];

      let allCharacterTitles = [];

      for (const category of characterCategories) {
        try {
          const titles = await this.listFandomCharacters(fandomUrl, category);
          if (titles.length > 0) {
            logger.info(`Encontrados ${titles.length} personagens em ${category}`);
            allCharacterTitles.push(...titles);
            
            // Limitar para não sobrecarregar
            if (allCharacterTitles.length >= 200) break;
          }
        } catch (error) {
          // Continuar tentando outras categorias
          logger.debug(`Categoria ${category} falhou: ${error.message}`);
        }
      }

      // Remover duplicatas
      allCharacterTitles = [...new Set(allCharacterTitles)];
      
      if (allCharacterTitles.length === 0) {
        logger.info(`Nenhum personagem encontrado em nenhuma categoria`);
        return result;
      }

      logger.info(`Total de personagens únicos encontrados: ${allCharacterTitles.length}`);

      // Passo 3: Extrair dados de cada personagem (com limite e delay)
      const maxCharacters = Math.min(allCharacterTitles.length, 100); // Limita para evitar sobrecarga
      
      for (let i = 0; i < maxCharacters; i++) {
        const title = allCharacterTitles[i];
        
        // Adiciona delay entre requisições (respeito aos rate limits)
        if (i > 0 && i % 10 === 0) {
          logger.debug(`Aguardando 2s após ${i} personagens...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const characterData = await this.scrapeFandomCharacter(fandomUrl, title);
        if (characterData) {
          result.characters.push(characterData);
        }
      }

      logger.info(`Enriquecimento concluído: ${result.characters.length} personagens extraídos`);
      
      return result;

    } catch (error) {
      logger.error(`Erro no enriquecimento Fandom para ${gameName}: ${error.message}`);
      return {
        found: false,
        source: 'fandom',
        wikiUrl: null,
        characters: []
      };
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