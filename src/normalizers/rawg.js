/**
 * Normaliza dados do RAWG (Video Games Database) para o formato do nosso schema
 */
import { slugify } from '../utils/slugify.js';

/**
 * Normaliza dados de um jogo do RAWG
 * @param {Object} rawgGame - Dados da API do RAWG
 * @returns {Object} Dados normalizados para work.schema.json
 */
export function normalizeWork(rawgGame) {
  const titles = [
    rawgGame.name,
    rawgGame.name_original,
    ...(rawgGame.alternative_names || [])
  ].filter(Boolean);

  const mainTitle = titles[0] || 'Untitled';
  const altTitles = [...new Set(titles.slice(1))]; // Remove duplicatas

  const id = rawgGame.slug || slugify(mainTitle);

  // Normalizar gêneros
  const genres = rawgGame.genres?.map(g => g.name) || [];
  
  // Normalizar plataformas
  const platforms = rawgGame.platforms?.map(p => p.platform?.name).filter(Boolean) || [];
  
  // Normalizar desenvolvedores
  const developers = rawgGame.developers?.map(d => d.name) || [];
  
  // Normalizar publishers
  const publishers = rawgGame.publishers?.map(p => p.name) || [];

  return {
    id,
    type: 'game',
    title: mainTitle,
    alt_titles: altTitles,
    source: 'RAWG',
    source_id: rawgGame.id?.toString(),
    description: cleanDescription(rawgGame.description_raw || rawgGame.description || ''),
    
    metadata: {
      released: rawgGame.released,
      rating: rawgGame.rating,
      rating_top: rawgGame.rating_top,
      ratings_count: rawgGame.ratings_count,
      metacritic: rawgGame.metacritic,
      playtime: rawgGame.playtime,
      esrb_rating: rawgGame.esrb_rating?.name,
      
      genres,
      platforms,
      developers,
      publishers,
      
      stores: rawgGame.stores?.map(s => ({
        name: s.store?.name,
        url: s.url
      })) || [],
      
      tags: rawgGame.tags?.slice(0, 10).map(t => t.name) || [],
      
      website: rawgGame.website,
      reddit_url: rawgGame.reddit_url,
      
      screenshots_count: rawgGame.screenshots_count,
      movies_count: rawgGame.movies_count,
      achievements_count: rawgGame.achievements_count
    },

    images: collectImages(rawgGame),
    
    external_ids: {
      rawg: rawgGame.id,
      rawg_slug: rawgGame.slug,
      metacritic_url: rawgGame.metacritic_url
    },

    tags: [
      ...genres.slice(0, 5),
      ...platforms.slice(0, 3),
      rawgGame.esrb_rating?.name
    ].filter(Boolean),

    updated_at: new Date().toISOString()
  };
}

/**
 * Coleta todas as imagens disponíveis do jogo
 * @param {Object} rawgGame - Dados do jogo
 * @returns {Array} Lista de URLs de imagens
 */
function collectImages(rawgGame) {
  const images = [];
  
  if (rawgGame.background_image) {
    images.push({
      url: rawgGame.background_image,
      type: 'cover'
    });
  }
  
  if (rawgGame.background_image_additional) {
    images.push({
      url: rawgGame.background_image_additional,
      type: 'background'
    });
  }

  // Screenshots se disponíveis
  if (rawgGame.short_screenshots) {
    rawgGame.short_screenshots.slice(0, 5).forEach((screenshot, index) => {
      images.push({
        url: screenshot.image,
        type: index === 0 ? 'cover' : 'screenshot'
      });
    });
  }

  return images;
}

/**
 * Normaliza dados de personagens/criadores do RAWG
 * @param {Array} rawgCharacters - Array de creators/team members
 * @param {string} workId - ID da obra
 * @returns {Array} Personagens normalizados
 */
export function normalizeCharacters(rawgCharacters, workId) {
  return rawgCharacters.map(character => {
    const name = character.name || 'Unknown';
    const id = slugify(`${name}-${character.id}`);

    return {
      id,
      name,
      alt_names: [],
      role: normalizeRole(character.role || character.positions),
      description: character.description || 
                   character.positions?.map(p => p.name).join(', ') || 
                   '',
      
      metadata: {
        games_count: character.games_count,
        positions: character.positions?.map(p => p.name) || [],
        rating: character.rating
      },

      images: character.image || character.image_background ? 
        [{
          url: character.image || character.image_background,
          type: 'profile'
        }] : [],

      external_ids: {
        rawg: character.id
      },

      tags: character.positions?.map(p => p.name) || [],

      updated_at: new Date().toISOString()
    };
  });
}

/**
 * Normaliza o papel do personagem/criador
 * @param {string|Array} role - Role ou array de positions
 * @returns {string} Role normalizado
 */
function normalizeRole(role) {
  if (!role) return 'other';
  
  // Se for array de posições
  if (Array.isArray(role)) {
    const positionNames = role.map(p => 
      (typeof p === 'string' ? p : p.name).toLowerCase()
    ).join(' ');
    
    if (positionNames.includes('director') || positionNames.includes('creator')) {
      return 'protagonist';
    }
    if (positionNames.includes('producer') || positionNames.includes('designer')) {
      return 'supporting';
    }
    
    return 'other';
  }
  
  // Se for string direta
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('creator') || roleLower.includes('director')) {
    return 'protagonist';
  }
  if (roleLower.includes('producer') || roleLower.includes('designer')) {
    return 'supporting';
  }
  
  return 'other';
}

/**
 * Limpa a descrição HTML
 * @param {string} description - Descrição com possível HTML
 * @returns {string} Descrição limpa
 */
function cleanDescription(description) {
  if (!description) return '';
  
  return description
    .replace(/<[^>]*>/g, '') // Remove tags HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Normaliza lista de jogos da busca
 * @param {Array} gameList - Lista de jogos do RAWG
 * @returns {Array} Jogos simplificados
 */
export function normalizeGameList(gameList) {
  return gameList.map(game => ({
    id: game.slug || slugify(game.name),
    title: game.name,
    rating: game.rating,
    released: game.released,
    image: game.background_image
  }));
}
