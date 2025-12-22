import { readJson, writeJson } from '../utils/file.js';
import { logger } from '../utils/logger.js';
import { join } from 'path';

/**
 * Classe responsável por escrever dados incrementalmente nos arquivos JSON
 * Gerencia merge de dados, deduplicação e atualização de contadores
 */
export class JsonWriter {
  constructor(baseDir = './data') {
    this.baseDir = baseDir;
  }

  /**
   * Salva ou atualiza informações de uma obra
   * @param {string} type - Tipo da obra (anime, game, manga, etc)
   * @param {string} workId - ID da obra (slug)
   * @param {Object} workData - Dados da obra
   * @returns {Promise<string>} Caminho do arquivo salvo
   */
  async upsertWork(type, workId, workData) {
    const dirPath = join(this.baseDir, type, workId);
    const filePath = join(dirPath, 'info.json');
    
    const existing = await readJson(filePath, null);
    
    const merged = existing ? {
      ...existing,
      ...workData,
      updated_at: new Date().toISOString()
    } : {
      ...workData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await writeJson(filePath, merged);
    
    logger.success(`Obra salva: ${type}/${workId}`);
    return filePath;
  }

  /**
   * Adiciona ou atualiza personagens de uma obra
   * Implementa merge inteligente sem duplicação
   * @param {string} type - Tipo da obra
   * @param {string} workId - ID da obra
   * @param {Array<Object>} newCharacters - Novos personagens
   * @returns {Promise<Object>} Estatísticas da operação
   */
  async upsertCharacters(type, workId, newCharacters) {
    const dirPath = join(this.baseDir, type, workId);
    const filePath = join(dirPath, 'characters.json');
    
    // Ler arquivo existente ou criar estrutura vazia
    const file = await readJson(filePath, {
      work_id: workId,
      count: 0,
      characters: [],
      updated_at: null
    });
    
    // Criar mapa de personagens existentes por ID
    const characterMap = new Map(
      file.characters.map(char => [char.id, char])
    );
    
    let added = 0;
    let updated = 0;
    
    // Processar novos personagens
    for (const newChar of newCharacters) {
      const existing = characterMap.get(newChar.id);
      
      if (existing) {
        // Merge: novos dados têm prioridade, mas preserva campos não fornecidos
        characterMap.set(newChar.id, this.mergeCharacter(existing, newChar));
        updated++;
      } else {
        characterMap.set(newChar.id, newChar);
        added++;
      }
    }
    
    // Atualizar arquivo
    file.characters = Array.from(characterMap.values());
    file.count = file.characters.length;
    file.updated_at = new Date().toISOString();
    
    await writeJson(filePath, file);
    
    logger.success(
      `Personagens salvos: ${type}/${workId} (${added} novos, ${updated} atualizados, ${file.count} total)`
    );
    
    return { added, updated, total: file.count };
  }

  /**
   * Merge inteligente de dois personagens
   * Novos dados têm prioridade, mas arrays são mesclados
   * @param {Object} existing - Personagem existente
   * @param {Object} newData - Novos dados
   * @returns {Object} Personagem mesclado
   */
  mergeCharacter(existing, newData) {
    const merged = { ...existing, ...newData };
    
    // Merge especial para arrays
    if (existing.alt_names && newData.alt_names) {
      merged.alt_names = [...new Set([...existing.alt_names, ...newData.alt_names])];
    }
    
    if (existing.images && newData.images) {
      merged.images = this.mergeImages(existing.images, newData.images);
    }
    
    if (existing.tags && newData.tags) {
      merged.tags = [...new Set([...existing.tags, ...newData.tags])];
    }
    
    // Merge de external_ids
    if (existing.external_ids && newData.external_ids) {
      merged.external_ids = {
        ...existing.external_ids,
        ...newData.external_ids
      };
    }
    
    return merged;
  }

  /**
   * Merge de imagens sem duplicação
   * @param {Array} existingImages - Imagens existentes
   * @param {Array} newImages - Novas imagens
   * @returns {Array} Imagens mescladas
   */
  mergeImages(existingImages, newImages) {
    const imageMap = new Map(
      existingImages.map(img => [img.url, img])
    );
    
    for (const newImg of newImages) {
      if (!imageMap.has(newImg.url)) {
        imageMap.set(newImg.url, newImg);
      }
    }
    
    return Array.from(imageMap.values());
  }

  /**
   * Busca personagens por critérios
   * @param {string} type - Tipo da obra
   * @param {string} workId - ID da obra
   * @param {Object} criteria - Critérios de busca
   * @returns {Promise<Array>} Personagens encontrados
   */
  async findCharacters(type, workId, criteria = {}) {
    const filePath = join(this.baseDir, type, workId, 'characters.json');
    const file = await readJson(filePath, null);
    
    if (!file) {
      return [];
    }
    
    let results = file.characters;
    
    // Filtrar por nome
    if (criteria.name) {
      const searchName = criteria.name.toLowerCase();
      results = results.filter(char => 
        char.name.toLowerCase().includes(searchName) ||
        char.alt_names?.some(alt => alt.toLowerCase().includes(searchName))
      );
    }
    
    // Filtrar por role
    if (criteria.role) {
      results = results.filter(char => char.role === criteria.role);
    }
    
    // Filtrar por tag
    if (criteria.tag) {
      results = results.filter(char => 
        char.tags?.includes(criteria.tag)
      );
    }
    
    return results;
  }

  /**
   * Obtém estatísticas de uma obra
   * @param {string} type - Tipo da obra
   * @param {string} workId - ID da obra
   * @returns {Promise<Object>} Estatísticas
   */
  async getStats(type, workId) {
    const charactersPath = join(this.baseDir, type, workId, 'characters.json');
    const infoPath = join(this.baseDir, type, workId, 'info.json');
    
    const [charactersFile, workInfo] = await Promise.all([
      readJson(charactersPath, null),
      readJson(infoPath, null)
    ]);
    
    if (!charactersFile) {
      return null;
    }
    
    const roleCount = {};
    for (const char of charactersFile.characters) {
      const role = char.role || 'unknown';
      roleCount[role] = (roleCount[role] || 0) + 1;
    }
    
    return {
      workId,
      type,
      title: workInfo?.title,
      totalCharacters: charactersFile.count,
      byRole: roleCount,
      lastUpdated: charactersFile.updated_at
    };
  }
}

/**
 * Cria uma instância do writer
 * @param {string} baseDir - Diretório base dos dados
 * @returns {JsonWriter}
 */
export function createWriter(baseDir) {
  return new JsonWriter(baseDir);
}
