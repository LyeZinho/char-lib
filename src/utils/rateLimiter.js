/**
 * Implementação de Rate Limiter simples
 * Limita o número de operações por período de tempo
 */
export class RateLimiter {
  /**
   * @param {number} maxRequests - Número máximo de requisições
   * @param {number} timeWindow - Janela de tempo em milissegundos
   */
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  /**
   * Aguarda até que uma requisição possa ser feita
   * @returns {Promise<void>}
   */
  async waitForSlot() {
    const now = Date.now();
    
    // Remover requisições antigas fora da janela de tempo
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    // Se atingiu o limite, aguardar
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      console.log(`RateLimiter: Aguardando ${waitTime}ms (requests: ${this.requests.length}/${this.maxRequests})`);
      if (waitTime > 0) {
        await this.delay(waitTime);
        return this.waitForSlot(); // Tentar novamente
      }
    }
    
    // Registrar esta requisição
    this.requests.push(Date.now());
  }

  /**
   * Delay helper
   * @param {number} ms - Milissegundos
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executa uma função respeitando o rate limit
   * @param {Function} fn - Função a executar
   * @returns {Promise<*>} Resultado da função
   */
  async execute(fn) {
    await this.waitForSlot();
    return fn();
  }
}

/**
 * Cria um rate limiter pré-configurado
 * @param {number} requestsPerSecond - Requisições por segundo
 * @returns {RateLimiter}
 */
export function createRateLimiter(requestsPerSecond) {
  return new RateLimiter(requestsPerSecond, 1000);
}
