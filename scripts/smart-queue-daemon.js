#!/usr/bin/env node

/**
 * Smart Queue Daemon
 * Processo Linux que executa Smart Queue continuamente
 * Gerenciado como serviço systemd
 */

import { createSmartQueueJob } from '../src/jobs/smartQueue.js';
import { logger } from '../src/utils/logger.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream, existsSync } from 'fs';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações do daemon
const DAEMON_CONFIG = {
  pidFile: '/var/run/smart-queue.pid',
  logFile: '/var/log/smart-queue.log',
  configDir: '/etc/smart-queue',
  dataDir: process.env.SMART_QUEUE_DATA_DIR || join(process.cwd(), 'data'),
  user: process.env.SMART_QUEUE_USER || 'smartqueue',
  group: process.env.SMART_QUEUE_GROUP || 'smartqueue'
};

// Configurações padrão da Smart Queue
const DEFAULT_OPTIONS = {
  baseDir: DAEMON_CONFIG.dataDir,
  supportedTypes: ['anime', 'manga'],
  maxWorksPerCycle: 2,
  characterLimit: 15,
  delayBetweenTypes: 300000, // 5 minutos
  delayBetweenCycles: 600000, // 10 minutos
  enrich: true
};

/**
 * Classe principal do Daemon
 */
class SmartQueueDaemon {
  constructor() {
    this.isRunning = false;
    this.smartQueueJob = null;
    this.logStream = null;
    this.shutdownRequested = false;

    // Configurar sinais de shutdown
    this.setupSignalHandlers();
  }

  /**
   * Configura handlers de sinais do sistema
   */
  setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`📡 Sinal ${signal} recebido, iniciando shutdown...`);
        await this.shutdown();
      });
    });

    // Handler para shutdown gracioso
    process.on('SIGUSR1', () => {
      logger.info('🔄 Sinal SIGUSR1 recebido, solicitando parada graciosa...');
      this.requestShutdown();
    });
  }

  /**
   * Solicita shutdown gracioso
   */
  requestShutdown() {
    this.shutdownRequested = true;
    if (this.smartQueueJob) {
      this.smartQueueJob.stop();
    }
  }

  /**
   * Inicializa o daemon
   */
  async initialize() {
    try {
      logger.info('🚀 Inicializando Smart Queue Daemon...');

      // Criar diretórios necessários
      await this.createDirectories();

      // Configurar logging para arquivo
      await this.setupLogging();

      // Criar PID file
      await this.createPidFile();

      // Carregar configurações
      const options = await this.loadConfiguration();

      // Inicializar Smart Queue
      this.smartQueueJob = createSmartQueueJob(options);

      logger.info('✅ Daemon inicializado com sucesso');
      return true;

    } catch (error) {
      logger.error(`❌ Falha na inicialização do daemon: ${error.message}`);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Cria diretórios necessários
   */
  async createDirectories() {
    const dirs = [
      dirname(DAEMON_CONFIG.logFile),
      DAEMON_CONFIG.configDir,
      DAEMON_CONFIG.dataDir
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        logger.info(`📁 Diretório criado: ${dir}`);
      }
    }
  }

  /**
   * Configura logging para arquivo
   */
  async setupLogging() {
    try {
      this.logStream = createWriteStream(DAEMON_CONFIG.logFile, { flags: 'a' });

      // Redirecionar console para arquivo
      const originalLog = console.log;
      const originalError = console.error;

      console.log = (...args) => {
        const message = args.join(' ');
        this.logStream.write(`[${new Date().toISOString()}] LOG: ${message}\n`);
        originalLog(...args);
      };

      console.error = (...args) => {
        const message = args.join(' ');
        this.logStream.write(`[${new Date().toISOString()}] ERROR: ${message}\n`);
        originalError(...args);
      };

      logger.info(`📝 Logging configurado: ${DAEMON_CONFIG.logFile}`);

    } catch (error) {
      logger.error(`❌ Falha ao configurar logging: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria arquivo PID
   */
  async createPidFile() {
    try {
      const pidDir = dirname(DAEMON_CONFIG.pidFile);
      if (!existsSync(pidDir)) {
        await mkdir(pidDir, { recursive: true });
      }

      const fs = await import('fs/promises');
      await fs.writeFile(DAEMON_CONFIG.pidFile, process.pid.toString());
      logger.info(`📄 PID file criado: ${DAEMON_CONFIG.pidFile} (PID: ${process.pid})`);

    } catch (error) {
      logger.error(`❌ Falha ao criar PID file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Carrega configurações do daemon
   */
  async loadConfiguration() {
    try {
      const configFile = join(DAEMON_CONFIG.configDir, 'config.json');

      if (existsSync(configFile)) {
        const fs = await import('fs/promises');
        const configData = await fs.readFile(configFile, 'utf8');
        const config = JSON.parse(configData);

        logger.info('⚙️ Configurações carregadas do arquivo');
        return { ...DEFAULT_OPTIONS, ...config };
      }

      logger.info('⚙️ Usando configurações padrão');
      return DEFAULT_OPTIONS;

    } catch (error) {
      logger.warn(`⚠️ Erro ao carregar configurações, usando padrão: ${error.message}`);
      return DEFAULT_OPTIONS;
    }
  }

  /**
   * Inicia o loop principal do daemon
   */
  async start() {
    try {
      await this.initialize();

      this.isRunning = true;
      logger.info('🔄 Iniciando loop principal do daemon...');

      // Loop principal - roda indefinidamente
      while (this.isRunning && !this.shutdownRequested) {
        try {
          await this.smartQueueJob.run({ maxCycles: 1 }); // Executa 1 ciclo por vez

          // Pequena pausa entre verificações de shutdown
          await this.sleep(5000);

        } catch (error) {
          logger.error(`❌ Erro no loop principal: ${error.message}`);

          // Aguardar antes de tentar novamente
          await this.sleep(30000);
        }
      }

    } catch (error) {
      logger.error(`❌ Erro fatal no daemon: ${error.message}`);
    } finally {
      await this.shutdown();
    }
  }

  /**
   * Para o daemon
   */
  async shutdown() {
    logger.info('🛑 Iniciando shutdown do daemon...');

    this.isRunning = false;

    if (this.smartQueueJob) {
      await this.smartQueueJob.stop();
    }

    await this.cleanup();
    logger.info('✅ Daemon finalizado');
    process.exit(0);
  }

  /**
   * Limpa recursos do daemon
   */
  async cleanup() {
    try {
      // Remover PID file
      if (existsSync(DAEMON_CONFIG.pidFile)) {
        const fs = await import('fs/promises');
        await fs.unlink(DAEMON_CONFIG.pidFile);
        logger.info('🧹 PID file removido');
      }

      // Fechar log stream
      if (this.logStream) {
        this.logStream.end();
        logger.info('🧹 Log stream fechado');
      }

    } catch (error) {
      logger.error(`❌ Erro na limpeza: ${error.message}`);
    }
  }

  /**
   * Sleep helper
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Função principal
async function main() {
  const daemon = new SmartQueueDaemon();

  try {
    await daemon.start();
  } catch (error) {
    console.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SmartQueueDaemon, DAEMON_CONFIG };