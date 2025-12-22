/**
 * Executa uma função com retry automático em caso de falha
 * @param {Function} fn - Função a executar
 * @param {Object} options - Opções de retry
 * @param {number} options.maxAttempts - Número máximo de tentativas
 * @param {number} options.delayMs - Delay base entre tentativas (em ms)
 * @param {number} options.backoffMultiplier - Multiplicador para backoff exponencial
 * @param {Function} options.onRetry - Callback executado a cada retry
 * @returns {Promise<*>} Resultado da função
 */
export async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry = null
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      
      if (onRetry) {
        onRetry(error, attempt, delay);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Delay helper
 * @param {number} ms - Milissegundos
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica se um erro é recuperável (deve fazer retry)
 * @param {Error} error - Erro a verificar
 * @returns {boolean}
 */
export function isRetryableError(error) {
  // Erros de rede são recuperáveis
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ENOTFOUND') {
    return true;
  }
  
  // Rate limit (429) é recuperável
  if (error.response?.status === 429) {
    return true;
  }
  
  // Server errors (5xx) são recuperáveis
  if (error.response?.status >= 500) {
    return true;
  }
  
  return false;
}

/**
 * Retry específico para chamadas HTTP
 * @param {Function} fn - Função que faz a requisição HTTP
 * @param {Object} options - Opções de retry
 * @returns {Promise<*>}
 */
export async function retryHttp(fn, options = {}) {
  return retry(fn, {
    maxAttempts: 5,
    delayMs: 2000,
    backoffMultiplier: 2,
    ...options,
    onRetry: (error, attempt, delay) => {
      if (!isRetryableError(error)) {
        throw error; // Não fazer retry de erros não recuperáveis
      }
      
      if (options.onRetry) {
        options.onRetry(error, attempt, delay);
      }
    }
  });
}
