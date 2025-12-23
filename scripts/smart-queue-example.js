#!/usr/bin/env node

/**
 * Exemplo de uso da Smart Queue
 * Execute: node scripts/smart-queue-example.js
 */
/* Lines 7-10 omitted */

// Lista de exemplos de uso da Smart Queue
const examples = [
  {
    name: '🚀 INSTALAÇÃO DO DAEMON',
    description: 'Instalar Smart Queue como serviço systemd',
    command: 'npm run smart-queue-install'
  },
  {
    name: '▶️  Iniciar Daemon',
    description: 'Iniciar o serviço Smart Queue',
    command: 'npm run smart-queue-start'
  },
  {
    name: '▶️  Iniciar via CLI como Serviço',
    description: 'Iniciar o serviço systemd diretamente via CLI (requer sudo)',
    command: 'node src/cli.js smart-queue --service'
  },
  {
    name: '⏹️  Parar Daemon',
    description: 'Parar o serviço Smart Queue',
    command: 'npm run smart-queue-stop'
  },
  {
    name: '🔄 Reiniciar Daemon',
    description: 'Reiniciar o serviço Smart Queue',
    command: 'npm run smart-queue-restart'
  },
  {
    name: '📊 Status do Serviço',
    description: 'Ver status detalhado do daemon',
    command: 'npm run smart-queue-service-status'
  },
  {
    name: '📝 Ver Logs',
    description: 'Mostrar logs do daemon (últimas 50 linhas)',
    command: 'npm run smart-queue-logs'
  },
  {
    name: '👀 Seguir Logs',
    description: 'Seguir logs em tempo real',
    command: 'npm run smart-queue-logs -- --follow'
  },
  {
    name: '🔄 Resetar Serviço',
    description: 'Resetar estado e logs do serviço',
    command: 'npm run smart-queue-service-reset'
  },
  {
    name: '--- MODO MANUAL (Não Recomendado) ---',
    description: '',
    command: ''
  },
  {
    name: 'Smart Queue com Auto-Deploy',
    description: 'Smart Queue com deploy automático a cada 10 obras',
    command: 'npm run smart-queue-with-deploy'
  },
  {
    name: 'Smart Queue Deploy Customizado',
    description: 'Auto-deploy a cada 5 obras processadas',
    command: 'node src/cli.js smart-queue --auto-deploy --deploy-threshold 5'
  },
  {
    name: 'Smart Queue com Limite de Ciclos',
    description: 'Executa apenas 5 ciclos completos',
    command: 'npm run smart-queue -- --max-cycles 5'
  },
  {
    name: 'Smart Queue Customizada',
    description: 'Configurações personalizadas para tipos e delays',
    command: 'node src/cli.js smart-queue --supported-types anime,manga --max-works-cycle 3 --character-limit 20 --delay-types 600000 --delay-cycles 1200000'
  },
  {
    name: 'Ver Status da Smart Queue',
    description: 'Mostra estatísticas e estado atual',
    command: 'npm run smart-queue-status'
  },
  {
    name: 'Resetar Smart Queue',
    description: 'Limpa estado e estatísticas',
    command: 'npm run smart-queue-reset'
  }
];

async function showExamples() {
  console.log('🧠 Exemplos de Uso da Smart Queue');
  console.log('🐧 Daemon Linux + Modo Manual + 🚀 Auto-Deploy');
  console.log('='.repeat(60));
  console.log('RECOMENDADO: Use o modo DAEMON com AUTO-DEPLOY para produção!');
  console.log('O daemon roda como serviço Linux persistente com deploy automático.');
  console.log('');
  console.log('🚀 Auto-Deploy: Automaticamente executa generate-indexes, validate,');
  console.log('deploy, git add e git commit a cada X obras processadas.');
  console.log('');
  console.log('Modo Manual: Para testes ou desenvolvimento.');
  console.log('='.repeat(60));

  examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.name}`);
    console.log(`   ${example.description}`);
    console.log(`   Comando: ${example.command}`);
    console.log();
  });

  console.log('💡 DICAS PARA USO EM BACKGROUND:');
  console.log('• Use nohup ou screen/tmux para execução contínua');
  console.log('• Monitore com: npm run smart-queue-status');
  console.log('• Pare com Ctrl+C ou kill do processo');
  console.log('• Configure limites apropriados para seu servidor');
  console.log();

  console.log('🔧 CONFIGURAÇÕES ULTRA-CONSERVADORAS:');
  console.log('• Rate limit: 5 req/min (AniList)');
  console.log('• Delay mínimo: 12s entre requests');
  console.log('• Delay entre obras: 4 minutos');
  console.log('• Delay entre páginas: 1 minuto');
  console.log('• Máximo por ciclo: 2 obras');
  console.log('• Limite de personagens: 15 por obra');
  console.log();

  console.log('📊 MONITORAMENTO:');
  console.log('Execute "npm run smart-queue-status" para ver:');
  console.log('• Ciclos executados');
  console.log('• Obras processadas por tipo');
  console.log('• Personagens coletados');
  console.log('• Próximo tipo a processar');
}

async function runBasicExample() {
  console.log('\n🚀 Executando exemplo básico da Smart Queue...\n');

  const { createSmartQueueJob } = await import('../src/jobs/smartQueue.js');

  const smartQueue = createSmartQueueJob({
    baseDir: './data',
    supportedTypes: ['anime', 'manga'],
    maxWorksPerCycle: 1, // Apenas 1 obra por tipo para exemplo
    characterLimit: 10   // Limite reduzido para exemplo
  });

  console.log('⏳ Executando 2 ciclos (1 anime + 1 manga)...');
  console.log('Pressione Ctrl+C para interromper\n');

  try {
    await smartQueue.run({ maxCycles: 2 });
  } catch (error) {
    if (error.message.includes('interrompido')) {
      console.log('\n✅ Exemplo interrompido pelo usuário');
    } else {
      console.error(`\n❌ Erro: ${error.message}`);
    }
  }
}

// Executar
if (process.argv[2] === "--run") {
  runBasicExample();
} else {
  showExamples();
}
