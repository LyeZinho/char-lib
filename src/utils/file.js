import { promises as fs } from 'fs';
import { dirname } from 'path';

/**
 * Lê e faz parse de um arquivo JSON
 * @param {string} filePath - Caminho do arquivo
 * @param {*} defaultValue - Valor padrão se o arquivo não existir
 * @returns {Promise<*>} Objeto parseado
 */
export async function readJson(filePath, defaultValue = null) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT' && defaultValue !== null) {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Escreve um objeto como JSON em um arquivo
 * Cria os diretórios necessários automaticamente
 * @param {string} filePath - Caminho do arquivo
 * @param {*} data - Dados a serem escritos
 * @param {Object} options - Opções de formatação
 * @returns {Promise<void>}
 */
export async function writeJson(filePath, data, options = {}) {
  const { spaces = 2 } = options;
  
  // Criar diretório se não existir
  const dir = dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  // Escrever arquivo
  const content = JSON.stringify(data, null, spaces);
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Verifica se um arquivo ou diretório existe
 * @param {string} path - Caminho a verificar
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lista todos os arquivos em um diretório recursivamente
 * @param {string} dir - Diretório a listar
 * @param {string[]} fileList - Lista acumuladora (uso interno)
 * @returns {Promise<string[]>} Lista de caminhos de arquivos
 */
export async function listFiles(dir, fileList = []) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = `${dir}/${file.name}`;
      
      if (file.isDirectory()) {
        await listFiles(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }
    
    return fileList;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fileList;
    }
    throw error;
  }
}

/**
 * Cria um diretório recursivamente se não existir
 * @param {string} dirPath - Caminho do diretório
 * @returns {Promise<void>}
 */
export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}
