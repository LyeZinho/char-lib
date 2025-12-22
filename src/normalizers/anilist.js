import { slugify } from '../utils/slugify.js';

/**
 * Normaliza dados do AniList para o formato do nosso schema
 */

/**
 * Normaliza dados de uma obra (Media) do AniList
 * @param {Object} anilistMedia - Dados da API do AniList
 * @returns {Object} Dados normalizados para work.schema.json
 */
export function normalizeWork(anilistMedia) {
  const titles = [
    anilistMedia.title.english,
    anilistMedia.title.romaji,
    anilistMedia.title.native
  ].filter(Boolean);

  const mainTitle = titles[0] || 'Untitled';
  const altTitles = titles.slice(1);

  // Determinar tipo
  let type = 'other';
  if (anilistMedia.type === 'ANIME') {
    type = 'anime';
  } else if (anilistMedia.type === 'MANGA') {
    type = 'manga';
  }

  // Criar slug baseado no título principal
  const id = slugify(mainTitle);

  // Montar metadata específica do tipo
  const metadata = {
    format: anilistMedia.format,
    status: anilistMedia.status,
    startDate: formatDate(anilistMedia.startDate),
    endDate: formatDate(anilistMedia.endDate),
    genres: anilistMedia.genres || [],
    averageScore: anilistMedia.averageScore,
    popularity: anilistMedia.popularity
  };

  if (type === 'anime') {
    metadata.episodes = anilistMedia.episodes;
  } else if (type === 'manga') {
    metadata.chapters = anilistMedia.chapters;
    metadata.volumes = anilistMedia.volumes;
  }

  // Tags (filtrar por relevância)
  const tags = (anilistMedia.tags || [])
    .filter(tag => tag.rank >= 60) // Apenas tags relevantes
    .map(tag => tag.name);

  // Imagens
  const images = [];
  if (anilistMedia.coverImage?.large) {
    images.push({
      url: anilistMedia.coverImage.large,
      type: 'cover',
      source: 'AniList'
    });
  }
  if (anilistMedia.bannerImage) {
    images.push({
      url: anilistMedia.bannerImage,
      type: 'banner',
      source: 'AniList'
    });
  }

  return {
    id,
    type,
    title: mainTitle,
    alt_titles: altTitles,
    source: 'AniList',
    source_id: anilistMedia.id,
    description: cleanDescription(anilistMedia.description || ''),
    metadata,
    images,
    external_ids: {
      anilist: anilistMedia.id
    },
    tags,
    updated_at: new Date().toISOString()
  };
}

/**
 * Normaliza dados de personagens do AniList
 * @param {Array} anilistCharacters - Array de edges do AniList
 * @param {string} workId - ID da obra
 * @returns {Array} Personagens normalizados
 */
export function normalizeCharacters(anilistCharacters, workId) {
  return anilistCharacters.map(edge => {
    const char = edge.node;
    const role = normalizeRole(edge.role);

    // Gerar ID único
    const id = slugify(char.name.full);

    // Nomes alternativos
    const altNames = [
      char.name.native,
      ...(char.name.alternative || [])
    ].filter(Boolean);

    // Metadata
    const metadata = {};
    if (char.gender) metadata.gender = char.gender.toLowerCase();
    if (char.age) metadata.age = char.age;
    if (char.dateOfBirth) {
      metadata.dateOfBirth = formatDate(char.dateOfBirth);
    }

    // Imagens
    const images = [];
    if (char.image?.large) {
      images.push({
        url: char.image.large,
        type: 'portrait',
        source: 'AniList'
      });
    }

    return {
      id,
      name: char.name.full,
      alt_names: altNames,
      role,
      description: cleanDescription(char.description || ''),
      metadata,
      images,
      external_ids: {
        anilist: char.id
      }
    };
  });
}

/**
 * Normaliza o papel do personagem
 * @param {string} anilistRole - MAIN, SUPPORTING, BACKGROUND
 * @returns {string} Role normalizado
 */
function normalizeRole(anilistRole) {
  const roleMap = {
    'MAIN': 'protagonist',
    'SUPPORTING': 'supporting',
    'BACKGROUND': 'minor'
  };
  
  return roleMap[anilistRole] || 'other';
}

/**
 * Limpa a descrição HTML do AniList
 * @param {string} description - Descrição com possível HTML
 * @returns {string} Descrição limpa
 */
function cleanDescription(description) {
  if (!description) return '';
  
  return description
    .replace(/<br\s*\/?>/gi, '\n') // Quebras de linha
    .replace(/<[^>]+>/g, '') // Remover tags HTML
    .replace(/\n{3,}/g, '\n\n') // Múltiplas quebras
    .trim();
}

/**
 * Formata objeto de data do AniList
 * @param {Object} dateObj - { year, month, day }
 * @returns {string|null} Data em formato ISO ou null
 */
function formatDate(dateObj) {
  if (!dateObj || !dateObj.year) return null;
  
  const year = dateObj.year;
  const month = String(dateObj.month || 1).padStart(2, '0');
  const day = String(dateObj.day || 1).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Normaliza lista de obras da busca
 * @param {Array} mediaList - Lista de obras do AniList
 * @returns {Array} Obras simplificadas
 */
export function normalizeMediaList(mediaList) {
  return mediaList.map(media => ({
    id: media.id,
    title: media.title.romaji || media.title.english || media.title.native,
    type: media.type.toLowerCase(),
    format: media.format,
    year: media.startDate?.year,
    coverImage: media.coverImage?.medium,
    popularity: media.popularity
  }));
}
