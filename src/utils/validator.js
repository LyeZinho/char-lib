import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readJson, listFiles } from './file.js';
import { logger } from './logger.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validador de JSON Schema
 */
export class SchemaValidator {
  constructor(schemasDir) {
    this.schemasDir = schemasDir || join(__dirname, '../../schemas');
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.schemas = {};
  }

  /**
   * Carrega todos os schemas do diretório
   * @returns {Promise<void>}
   */
  async loadSchemas() {
    const schemaFiles = await listFiles(this.schemasDir);
    
    for (const file of schemaFiles) {
      if (file.endsWith('.json')) {
        const schema = await readJson(file);
        const schemaId = schema.$id || file;
        this.ajv.addSchema(schema, schemaId);
        this.schemas[schemaId] = schema;
        
        // Também adicionar por nome do arquivo
        const fileName = file.split('/').pop().replace('.schema.json', '');
        this.schemas[fileName] = schema;
      }
    }
    
    logger.debug(`${Object.keys(this.schemas).length} schemas carregados`);
  }

  /**
   * Valida dados contra um schema
   * @param {Object} data - Dados a validar
   * @param {string} schemaName - Nome do schema (sem extensão)
   * @returns {Object} Resultado da validação
   */
  validate(data, schemaName) {
    const schema = this.schemas[schemaName] || this.schemas[`${schemaName}.schema.json`];
    
    if (!schema) {
      return {
        valid: false,
        errors: [`Schema não encontrado: ${schemaName}`]
      };
    }

    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    return {
      valid,
      errors: valid ? [] : this.formatErrors(validate.errors)
    };
  }

  /**
   * Valida um arquivo JSON
   * @param {string} filePath - Caminho do arquivo
   * @param {string} schemaName - Nome do schema
   * @returns {Promise<Object>} Resultado
   */
  async validateFile(filePath, schemaName) {
    try {
      const data = await readJson(filePath);
      return this.validate(data, schemaName);
    } catch (error) {
      return {
        valid: false,
        errors: [`Erro ao ler arquivo: ${error.message}`]
      };
    }
  }

  /**
   * Valida estrutura de uma obra completa
   * @param {string} type - Tipo (anime, manga, etc)
   * @param {string} workId - ID da obra
   * @param {string} baseDir - Diretório base
   * @returns {Promise<Object>} Resultado
   */
  async validateWork(type, workId, baseDir = './data') {
    const workPath = join(baseDir, type, workId);
    const infoPath = join(workPath, 'info.json');
    const charactersPath = join(workPath, 'characters.json');

    const results = {
      valid: true,
      errors: []
    };

    // Validar info.json
    const infoResult = await this.validateFile(infoPath, 'work');
    if (!infoResult.valid) {
      results.valid = false;
      results.errors.push({
        file: 'info.json',
        errors: infoResult.errors
      });
    }

    // Validar characters.json
    const charsResult = await this.validateFile(charactersPath, 'characters_collection');
    if (!charsResult.valid) {
      results.valid = false;
      results.errors.push({
        file: 'characters.json',
        errors: charsResult.errors
      });
    }

    return results;
  }

  /**
   * Formata erros do AJV
   * @param {Array} errors - Erros do AJV
   * @returns {Array<string>} Erros formatados
   */
  formatErrors(errors) {
    return errors.map(err => {
      const path = err.instancePath || '/';
      const message = err.message;
      const params = JSON.stringify(err.params);
      return `${path}: ${message} ${params}`;
    });
  }
}

/**
 * Cria uma instância do validador
 * @param {string} schemasDir - Diretório dos schemas
 * @returns {Promise<SchemaValidator>}
 */
export async function createValidator(schemasDir) {
  const validator = new SchemaValidator(schemasDir);
  await validator.loadSchemas();
  return validator;
}
