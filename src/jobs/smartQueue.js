/**
 * Job de Smart Queue - Gerenciamento inteligente de múltiplas filas
 * Alterna entre tipos de obras (anime/manga) para crawling contínuo
 * Otimizado para execução em background com configurações ultra-conservadoras
 */
import { createAutoCrawlJob } from './autoCrawl.js';
import { readJson, writeJson } from '../utils/file.js';
import { logger } from '../utils/logger.js';
import { join } from 'path';

/**
 * Delay helper
 * @param {number} ms - Milissegundos
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class SmartQueueJob {
  constructor(options = {}) {
    this.baseDir = options.baseDir || './data';

    // Tipos suportados para alternância (expansível)
    this.supportedTypes = options.supportedTypes || ['anime', 'manga'];

    // Configurações ultra-conservadoras para background
    this.maxWorksPerCycle = options.maxWorksPerCycle || 2; // Poucas obras por ciclo
    this.characterLimit = options.characterLimit || 15; // Limite reduzido
    this.delayBetweenTypes = options.delayBetweenTypes || 300000; // 5 minutos entre tipos
    this.delayBetweenCycles = options.delayBetweenCycles || 600000; // 10 minutos entre ciclos completos

    // Configurações AniList ultra-conservadoras
    this.anilistSafe = true; // Sempre usar modo safe
    this.smartDelay = true;
    this.baseDelay = 60000; // 1 minuto base
    this.delayMultiplier = 200; // Multiplicador alto
    this.maxDelay = 300000; // 5 minutos máximo
    this.delayBetweenImports = 240000; // 4 minutos entre imports
    this.delayBetweenPages = 60000; // 1 minuto entre páginas

    this.enrich = options.enrich || true; // Enrichment como fallback

    // Configurações de auto-deploy
    this.autoDeployEnabled = options.autoDeployEnabled || false;
    this.autoDeployThreshold = options.autoDeployThreshold || 10; // Executar a cada X obras processadas
    this.autoDeployScripts = options.autoDeployScripts || [
      'npm run generate-indexes',
      'npm run validate',
      'npm run deploy'
    ];

    // Estado da smart queue
    this.stateFile = join(this.baseDir, 'smart-queue-state.json');
    this.isRunning = false;
    this.currentTypeIndex = 0;

    logger.info('🧠 Smart Queue inicializada com configurações ultra-conservadoras');
    logger.info(`📊 Tipos suportados: ${this.supportedTypes.join(', ')}`);
    if (this.autoDeployEnabled) {
      logger.info(`🚀 Auto-deploy habilitado: a cada ${this.autoDeployThreshold} obras`);
    }
  }

  /**
   * Carrega o estado atual da smart queue
   * @returns {Promise<Object>} Estado atual
   */
  async loadState() {
    try {
      const state = await readJson(this.stateFile);
      if (state) {
        this.currentTypeIndex = state.currentTypeIndex || 0;
        return state;
      }
    } catch (error) {
      // Arquivo não existe ou inválido
    }

    return {
      currentTypeIndex: 0,
      lastRun: null,
      stats: {
        totalCycles: 0,
        totalProcessed: 0,
        totalCharacters: 0,
        byType: {}
      },
      startTime: new Date().toISOString()
    };
  }

  /**
   * Salva o estado da smart queue
   * @param {Object} state - Estado a salvar
   * @returns {Promise<void>}
   */
  async saveState(state) {
    const stateToSave = {
      ...state,
      currentTypeIndex: this.currentTypeIndex,
      lastRun: new Date().toISOString()
    };

    await writeJson(this.stateFile, stateToSave);
  }

  /**
   * Obtém o próximo tipo a ser processado
   * @param {Object} state - Estado atual
   * @returns {string} Próximo tipo
   */
  getNextType(state) {
    const type = this.supportedTypes[this.currentTypeIndex];
    this.currentTypeIndex = (this.currentTypeIndex + 1) % this.supportedTypes.length;
    return type;
  }

  /**
   * Verifica se deve continuar processando
   * @param {Object} state - Estado atual
   * @returns {boolean} True se deve continuar
   */
  shouldContinue(state) {
    // Sempre continuar (pode ser interrompido externamente)
    return true;
  }

  /**
   * Verifica se deve executar auto-deploy
   * @param {Object} state - Estado atual
   * @returns {boolean} True se deve executar
   */
  shouldAutoDeploy(state) {
    if (!this.autoDeployEnabled) return false;

    const totalProcessed = state.stats.totalProcessed;
    return totalProcessed > 0 && totalProcessed % this.autoDeployThreshold === 0;
  }

  /**
   * Executa auto-deploy (generate-indexes, validate, deploy, git commit)
   * @param {Object} state - Estado atual
   * @returns {Promise<void>}
   */
  async executeAutoDeploy(state) {
    if (!this.autoDeployEnabled) return;

    logger.info(`🚀 Executando auto-deploy após ${state.stats.totalProcessed} obras processadas`);

    try {
      const { execSync } = await import('child_process');

      // Executar scripts npm
      for (const script of this.autoDeployScripts) {
        logger.info(`📦 Executando: ${script}`);
        execSync(script, {
          stdio: 'inherit',
          cwd: process.cwd(),
          env: { ...process.env, FORCE_COLOR: '1' }
        });
      }

      // Git add .
      logger.info('📝 Executando: git add .');
      execSync('git add .', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      // Gerar timestamp para commit
      const now = new Date();
      const timestamp = now.toLocaleDateString('pt-BR') + '-' +
                       now.toLocaleTimeString('pt-BR', { hour12: false });
      const dbSize = this.getDatabaseSize();
      const commitMessage = `automatic db update ${timestamp}: queue ${state.stats.totalProcessed} works ${dbSize}`;

      // Git commit
      logger.info(`💾 Executando: git commit -m "${commitMessage}"`);
      execSync(`git commit -m "${commitMessage}"`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      logger.success(`✅ Auto-deploy concluído! Commit: ${commitMessage}`);

    } catch (error) {
      logger.error(`❌ Erro no auto-deploy: ${error.message}`);
      // Não falhar o processo principal por erro no deploy
    }
  }

  /**
   * Obtém tamanho aproximado da database
   * @returns {string} Tamanho em MB
   */
  getDatabaseSize() {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');

      let totalSize = 0;
      function calculateSize(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            calculateSize(filePath);
          } else {
            totalSize += stat.size;
          }
        }
      }

      calculateSize(dataDir);
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      return `${sizeMB}MB`;

    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Executa um ciclo da smart queue
   * @param {Object} state - Estado atual
   * @returns {Promise<Object>} Resultado do ciclo
   */
  async executeCycle(state) {
    const type = this.getNextType(state);

    logger.info(`🔄 Ciclo ${state.stats.totalCycles + 1} - Processando tipo: ${type}`);

    try {
      // Criar job de auto crawl com configurações ultra-conservadoras
      const crawlJob = createAutoCrawlJob({
        baseDir: this.baseDir,
        type: type,
        maxWorks: this.maxWorksPerCycle,
        characterLimit: this.characterLimit,
        delayBetweenImports: this.delayBetweenImports,
        delayBetweenPages: this.delayBetweenPages,
        smartDelay: this.smartDelay,
        baseDelay: this.baseDelay,
        delayMultiplier: this.delayMultiplier,
        maxDelay: this.maxDelay,
        enrich: this.enrich,
        anilistSafe: this.anilistSafe
      });

      // Executar crawling para este tipo
      const report = await crawlJob.crawl({
        maxWorks: this.maxWorksPerCycle,
        continueFromQueue: true
      });

      // Atualizar estatísticas
      if (!state.stats.byType[type]) {
        state.stats.byType[type] = {
          processed: 0,
          characters: 0,
          cycles: 0
        };
      }

      state.stats.byType[type].processed += report.processed;
      state.stats.byType[type].characters += report.characters?.total || 0;
      state.stats.byType[type].cycles += 1;

      state.stats.totalCycles += 1;
      state.stats.totalProcessed += report.processed;
      state.stats.totalCharacters += report.characters?.total || 0;

      logger.success(`✅ Ciclo ${type} concluído: ${report.processed} obras, ${report.characters?.total || 0} personagens`);

      return {
        success: true,
        type,
        report,
        state
      };

    } catch (error) {
      logger.error(`❌ Erro no ciclo ${type}: ${error.message}`);
      return {
        success: false,
        type,
        error: error.message,
        state
      };
    }
  }

  /**
   * Executa a smart queue em loop contínuo
   * @param {Object} options - Opções de execução
   * @returns {Promise<void>}
   */
  async run(options = {}) {
    const maxCycles = options.maxCycles || 0; // 0 = infinito
    const state = await this.loadState();

    this.isRunning = true;
    logger.info('🚀 Iniciando Smart Queue em modo background...');
    logger.info('🛡️ Configurações ultra-conservadoras ativadas');
    logger.info(`📊 ${this.supportedTypes.length} tipos configurados: ${this.supportedTypes.join(', ')}`);

    let cycleCount = 0;

    try {
      while (this.isRunning && this.shouldContinue(state) && (maxCycles === 0 || cycleCount < maxCycles)) {
        cycleCount++;

        // Executar ciclo
        const result = await this.executeCycle(state);

        // Salvar estado após cada ciclo
        await this.saveState(state);

        // Executar auto-deploy se necessário
        if (this.shouldAutoDeploy(state)) {
          await this.executeAutoDeploy(state);
        }

        // Delay entre tipos (se não for o último tipo do ciclo)
        if (this.currentTypeIndex !== 0) {
          logger.info(`⏳ Aguardando ${this.delayBetweenTypes / 1000}s antes do próximo tipo...`);
          await sleep(this.delayBetweenTypes);
        } else {
          // Delay entre ciclos completos
          logger.info(`🔄 Ciclo completo finalizado. Aguardando ${this.delayBetweenCycles / 1000}s para próximo ciclo...`);
          await sleep(this.delayBetweenCycles);
        }
      }

    } catch (error) {
      logger.error(`❌ Erro fatal na Smart Queue: ${error.message}`);
      throw error;
    } finally {
      this.isRunning = false;
      await this.saveState(state);
      logger.info('🛑 Smart Queue finalizada');
    }
  }

  /**
   * Para a execução da smart queue
   * @returns {Promise<void>}
   */
  async stop() {
    logger.info('🛑 Solicitando parada da Smart Queue...');
    this.isRunning = false;
  }

  /**
   * Mostra status atual da smart queue
   * @returns {Promise<void>}
   */
  async showStatus() {
    const state = await this.loadState();

    console.log('\n🧠 Status da Smart Queue\n');

    console.log(`📊 Estatísticas Gerais:`);
    console.log(`   Ciclos executados: ${state.stats.totalCycles}`);
    console.log(`   Total de obras processadas: ${state.stats.totalProcessed}`);
    console.log(`   Total de personagens: ${state.stats.totalCharacters}`);
    console.log(`   Iniciado em: ${state.startTime}`);
    console.log(`   Última execução: ${state.lastRun || 'Nunca'}`);

    console.log(`\n📋 Estatísticas por Tipo:`);
    for (const [type, stats] of Object.entries(state.stats.byType || {})) {
      console.log(`   ${type}:`);
      console.log(`     Ciclos: ${stats.cycles}`);
      console.log(`     Obras: ${stats.processed}`);
      console.log(`     Personagens: ${stats.characters}`);
    }

    console.log(`\n⚙️  Configurações Atuais:`);
    console.log(`   Tipos suportados: ${this.supportedTypes.join(', ')}`);
    console.log(`   Máximo por ciclo: ${this.maxWorksPerCycle} obras`);
    console.log(`   Limite de personagens: ${this.characterLimit}`);
    console.log(`   Delay entre tipos: ${this.delayBetweenTypes / 1000}s`);
    console.log(`   Delay entre ciclos: ${this.delayBetweenCycles / 1000}s`);
    console.log(`   Modo AniList Safe: ${this.anilistSafe ? 'Ativado' : 'Desativado'}`);
    console.log(`   Auto-Deploy: ${this.autoDeployEnabled ? `Ativado (a cada ${this.autoDeployThreshold} obras)` : 'Desativado'}`);

    console.log(`\n🎯 Próximo tipo a processar: ${this.supportedTypes[this.currentTypeIndex]}`);
  }

  /**
   * Reseta o estado da smart queue
   * @returns {Promise<void>}
   */
  async reset() {
    const state = {
      currentTypeIndex: 0,
      lastRun: null,
      stats: {
        totalCycles: 0,
        totalProcessed: 0,
        totalCharacters: 0,
        byType: {}
      },
      startTime: new Date().toISOString()
    };

    await this.saveState(state);
    this.currentTypeIndex = 0;

    logger.success('🔄 Smart Queue resetada com sucesso!');
  }
}

/**
 * Cria uma instância do job de smart queue
 * @param {Object} options - Opções
 * @returns {SmartQueueJob}
 */
export function createSmartQueueJob(options) {
  return new SmartQueueJob(options);
}