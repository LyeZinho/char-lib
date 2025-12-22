/**
 * Sistema de cache simples para obras processadas
 * Otimiza verificações e evita requests desnecessários
 */

export class WorkCache {
  constructor(options = {}) {
    this.cacheFile = options.cacheFile || './data/work-cache.json';
    this.cache = new Map();
    this.loaded = false;
  }

  /**
   * Carrega o cache do arquivo
   * @returns {Promise<void>}
   */
  async load() {
    if (this.loaded) return;

    try {
      const { readJson } = await import('./file.js');
      const data = await readJson(this.cacheFile, {});
      this.cache = new Map(Object.entries(data));
      this.loaded = true;
    } catch (error) {
      // Cache não existe ou inválido, começar vazio
      this.cache = new Map();
      this.loaded = true;
    }
  }

  /**
   * Salva o cache no arquivo
   * @returns {Promise<void>}
   */
  async save() {
    try {
      const { writeJson } = await import('./file.js');
      const data = Object.fromEntries(this.cache);
      await writeJson(this.cacheFile, data);
    } catch (error) {
      console.warn('Erro ao salvar cache:', error.message);
    }
  }

  /**
   * Verifica se uma obra foi processada
   * @param {string} workId - ID da obra
   * @returns {boolean}
   */
  isProcessed(workId) {
    return this.cache.has(workId);
  }

  /**
   * Marca uma obra como processada
   * @param {string} workId - ID da obra
   * @param {Object} metadata - Metadados opcionais
   */
  markProcessed(workId, metadata = {}) {
    this.cache.set(workId, {
      processedAt: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Remove uma obra do cache
   * @param {string} workId - ID da obra
   */
  remove(workId) {
    this.cache.delete(workId);
  }

  /**
   * Lista todas as obras processadas
   * @returns {Array} Lista de workIds
   */
  listProcessed() {
    return Array.from(this.cache.keys());
  }

  /**
   * Obtém metadados de uma obra
   * @param {string} workId - ID da obra
   * @returns {Object|null}
   */
  getMetadata(workId) {
    return this.cache.get(workId) || null;
  }

  /**
   * Limpa o cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obtém estatísticas do cache
   * @returns {Object}
   */
  getStats() {
    return {
      totalWorks: this.cache.size,
      cacheFile: this.cacheFile
    };
  }
}

/**
 * Cria uma instância do cache
 * @param {Object} options - Opções
 * @returns {WorkCache}
 */
export function createWorkCache(options = {}) {
  return new WorkCache(options);
}