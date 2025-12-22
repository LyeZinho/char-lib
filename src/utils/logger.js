/**
 * Logger simples com níveis e cores (usando caracteres ANSI)
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.silent = options.silent || false;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  shouldLog(level) {
    return !this.silent && this.levels[level] >= this.levels[this.level];
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const color = {
      debug: colors.gray,
      info: colors.blue,
      warn: colors.yellow,
      error: colors.red
    }[level];
    
    return `${colors.gray}[${timestamp}]${colors.reset} ${color}${level.toUpperCase()}${colors.reset} ${message}`;
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  success(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(`${colors.green}✓${colors.reset} ${message}`, ...args);
    }
  }

  progress(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(`${colors.cyan}⟳${colors.reset} ${message}`, ...args);
    }
  }
}

export const logger = new Logger();

export function createLogger(options) {
  return new Logger(options);
}
