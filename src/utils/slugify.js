/**
 * Converte uma string em um slug válido
 * Remove caracteres especiais, normaliza acentos e converte para lowercase
 * @param {string} text - Texto a converter
 * @returns {string} Slug gerado
 */
export function slugify(text) {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substituir espaços por hífens
    .replace(/-+/g, '-') // Remover múltiplos hífens
    .replace(/^-+|-+$/g, ''); // Remover hífens do início/fim
}

/**
 * Gera um ID único baseado em múltiplos campos
 * @param  {...string} parts - Partes do ID
 * @returns {string} ID gerado
 */
export function generateId(...parts) {
  return parts
    .filter(Boolean)
    .map(p => slugify(p))
    .join('_');
}

/**
 * Valida se uma string é um slug válido
 * @param {string} slug - Slug a validar
 * @returns {boolean} True se válido
 */
export function isValidSlug(slug) {
  return /^[a-z0-9-_]+$/.test(slug);
}
