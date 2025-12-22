/**
 * Normaliza dados do Jikan (MyAnimeList) para o formato do nosso schema
 */

import { slugify } from '../utils/slugify.js';

/**
 * Normaliza dados de um anime do Jikan
 * @param {Object} jikanAnime - Dados da API do Jikan
 * @returns {Object} Dados normalizados para work.schema.json
 */
export function normalizeWork(jikanAnime) {
  const titles = [
    jikanAnime.title,
    jikanAnime.title_english,
    jikanAnime.title_japanese,
    ...(jikanAnime.title_synonyms || [])
  ].filter(Boolean);

  const mainTitle = titles[0] || 'Untitled';
  const altTitles = titles.slice(1);

  const id = slugify(mainTitle);

  return {
    id,
    type: 'anime',
    title: mainTitle,
    alt_titles: altTitles,
    source: 'MyAnimeList',
    source_id: jikanAnime.mal_id,
    description: jikanAnime.synopsis || '',
    metadata: {
      format: jikanAnime.type,
      status: jikanAnime.status,
      startDate: jikanAnime.aired?.from,
      endDate: jikanAnime.aired?.to,
      genres: jikanAnime.genres?.map(g => g.name) || [],
      averageScore: jikanAnime.score,
      popularity: jikanAnime.members,
      episodes: jikanAnime.episodes
    },
    images: [
      {
        url: jikanAnime.images?.jpg?.large_image_url,
        type: 'cover',
        source: 'MyAnimeList'
      }
    ],
    external_ids: {
      mal: jikanAnime.mal_id
    },
    tags: jikanAnime.genres?.map(g => g.name) || [],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
}

/**
 * Normaliza dados de personagens do Jikan
 * @param {Array} jikanCharacters - Array de characters do Jikan
 * @param {string} workId - ID da obra
 * @returns {Array} Personagens normalizados
 */
export function normalizeCharacters(jikanCharacters, workId) {
  return jikanCharacters.map(char => {
    const charData = char.node;
    const role = char.role;

    return {
      id: `${workId}_${slugify(charData.name?.full || charData.name)}`,
      name: charData.name?.full || charData.name,
      alt_names: charData.name?.alternative || [],
      role: normalizeRole(role),
      description: charData.description || charData.about || 'Descrição não disponível via MyAnimeList API. Para descrições completas, importe usando --source anilist.',
      metadata: {
        gender: charData.gender,
        age: charData.age
      },
      images: charData.image?.large ? [{
        url: charData.image.large,
        type: 'portrait',
        source: 'MyAnimeList'
      }] : [],
      external_ids: {
        mal: charData.id
      },
      tags: [],
      relations: [],
      voice_actors: char.voiceActors?.map(va => ({
        id: va.id,
        name: va.name?.full || va.name,
        language: va.language,
        external_ids: {
          mal: va.id
        }
      })) || [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  });
}

/**
 * Normaliza o papel do personagem
 * @param {string} jikanRole - MAIN, SUPPORTING, etc
 * @returns {string} Role normalizado
 */
function normalizeRole(jikanRole) {
  switch (jikanRole) {
    case 'MAIN':
      return 'protagonist';
    case 'SUPPORTING':
      return 'supporting';
    default:
      return 'minor';
  }
}

/**
 * Normaliza lista de animes da busca
 * @param {Array} animeList - Lista de animes do Jikan
 * @returns {Array} Animes simplificados
 */
export function normalizeMediaList(animeList) {
  return animeList.map(anime => ({
    id: anime.mal_id,
    title: anime.title,
    type: 'anime',
    source: 'MyAnimeList'
  }));
}