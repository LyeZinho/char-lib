# Character Library (char-lib)

> 📚 Database local de personagens (anime, games*, manga, etc.) usando arquivos JSON
>
> \* *Para jogos, coleta criadores/desenvolvedores; o AutoCrawl ativa automaticamente enrichment via Fandom para buscar personagens reais (não apenas criadores)*

Sistema de wiki de personagens 100% em JavaScript, com coleta via APIs públicas (AniList, RAWG), batch controlado, rate limit e armazenamento incremental em JSON.

## 🚀 Início Rápido

```bash
# Instalação
npm install

# Seu primeiro import
node src/cli.js import anime "Naruto" --limit 10

# Ver estatísticas
node src/cli.js stats anime naruto
```

📖 **[Guia Completo de Início Rápido →](docs/QUICKSTART.md)**

## 🎛️ Interface Interativa (TUI)

Interface interativa baseada em menus para **todas as operações** disponíveis:

```bash
# Iniciar interface interativa
npm run tui
# ou
node src/cli.js interactive
```

### 📋 Funcionalidades Completas

#### 📥 **Importar Obra**
- Importar anime, manga ou jogos
- Configurar limite de personagens
- Ajustar delay entre requisições

#### 🔍 **Buscar Personagens**
- Busca local em obras específicas
- Filtragem por tipo (anime/manga/game)

#### 📊 **Ver Estatísticas**
- Estatísticas detalhadas de obras
- Contagem por roles de personagens

#### 🔄 **Atualizar Dados**
- Atualizar todas as obras existentes
- Opção de pular personagens
- Suporte a enrichment como fallback

#### 🤖 **Auto-Crawling** (Menu Completo)
- 🚀 **Executar Crawling**: Processar obras da fila
- 📊 **Ver Status**: Estado atual do crawler
- 📋 **Listar Processadas**: Índice de obras processadas
- 🧹 **Limpar Fila**: Resetar fila pendente
- ➕ **Aumentar Fila**: Descobrir mais obras populares
- 🔄 **AutoCraw Contínuo**: Crawling automático contínuo
- 🎯 **Smart Queue**: Sistema inteligente de alternância entre tipos
- 🐧 **Smart Queue Daemon**: Gerenciamento do daemon Linux

#### 📋 **Listar Obras**
- Listar todas as obras por tipo
- Filtrar por anime, manga ou games

#### ✅ **Validar Dados**
- Validação completa contra schemas JSON
- Relatório de erros detalhado

#### 💾 **Gerenciar Cache**
- 📊 **Ver Status**: Estatísticas do cache
- 🧹 **Limpar Cache**: Reset completo
- 🔄 **Reconstruir Cache**: Reconstruir baseado em dados existentes

#### 🚀 **Deploy Web**
- Atualizar dados do frontend
- Copiar database para interface web

#### 🛠️ **Scripts Úteis**
- 📊 **Gerar Índices**: Criar arquivos index.json para API web
- 🎮 **Importar Jogos**: Executar script de importação de jogos
- 🤖 **Exemplo de Crawling**: Demonstração de funcionalidades de crawling

### 🎯 Navegação

- **Setas ↑↓**: Navegar entre opções
- **Enter**: Selecionar opção
- **Menus aninhados**: Submenus para funcionalidades complexas
- **Confirmações**: Validações para operações destrutivas

### 💡 Dicas

- Use o modo interativo para descobrir todas as opções disponíveis
- As configurações padrão são otimizadas para uso geral
- Operações de crawling suportam apenas anime e manga (games não têm personagens fictícios)
- O cache acelera verificações de obras já processadas

## ⚡ Controle de Rate Limit

Novo parâmetro `--delay` para controlar o tempo entre requisições e evitar bans:

```bash
# Import com delay de 3 segundos entre páginas
node src/cli.js import anime "One Piece" --limit 100 --delay 3000

# Crawling com delay maior para execuções longas
node src/cli.js crawl --max-works 50 --delay 5000
```

**Por que isso importa:**
- Evita erros "too many requests"
- Permite execuções longas sem interrupção
- Respeita as APIs de terceiros

## 🤖 Auto-Crawling (Novo!)

Sistema automático que descobre e importa obras populares do AniList:

```bash
# Executar crawling automático (10 obras por vez)
npm run crawl

# Ver status do crawling
npm run crawl-status

# Listar obras já processadas
npm run crawl-list

# Aumentar a fila com mais obras
npm run crawl-grow -- --count 50

# Crawling personalizado
node src/cli.js crawl --max-works 5 --character-limit 25 --delay 10000

# Para mangas (igual ao anime)
node src/cli.js crawl --type manga --max-works 3
```

**Nota:** Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios, apenas criadores/desenvolvedores).

**Como funciona:**
- 🔍 Descobre automaticamente animes populares
- 📋 Mantém fila de obras pendentes
- ✅ Rastreia progresso em `data/crawl-state.json`
- ⏱️ Respeita rate limits das APIs

## 🚀 AutoCraw Contínuo (Novo!)

Sistema autônomo de crawling contínuo com enrichment inteligente:

```bash
# Executar crawling contínuo (recomendado)
npm run autocraw

# Com configurações personalizadas
node src/cli.js autocraw --max-works 3 --delay 20000 --max-total 50

# Apenas para teste (limite pequeno)
node src/cli.js autocraw --max-works 1 --max-total 2 --delay 5000
```

**Características:**
- 🤖 **Totalmente autônomo**: Roda indefinidamente até ser interrompido (Ctrl+C)
- 🔄 **Ciclos inteligentes**: Processa lotes e continua automaticamente
- 🛡️ **Enrichment fallback**: Usa DuckDuckGo/wikis quando APIs atingem rate limit
- 📊 **Limite opcional**: Configure `--max-total` para limitar obras processadas
- ⏱️ **Rate limit seguro**: Delays configuráveis para evitar bloqueios

**Como funciona:**
1. Processa obras da fila em ciclos
2. Quando APIs falham (429), usa enrichment como fallback
3. Continua até fila vazia ou limite atingido
4. Pode ser interrompido a qualquer momento
- 📊 Gera índice para pesquisa futura

## 🎯 Smart Queue (Daemon Linux)

Sistema inteligente de fila que roda como **processo Linux** (daemon), alterna entre tipos de conteúdo para otimização máxima de coleta:

### 🚀 Instalação como Serviço

```bash
# Instalar como serviço systemd (requer sudo)
npm run smart-queue-install

# Ou diretamente
sudo bash scripts/install-smart-queue-service.sh
```

### 🛠️ Gerenciamento do Daemon

```bash
# Iniciar daemon (modo serviço systemd)
npm run smart-queue-start

# Parar daemon
npm run smart-queue-stop

# Reiniciar daemon
npm run smart-queue-restart

# Ver status detalhado
npm run smart-queue-service-status

# Ver logs (últimas 50 linhas)
npm run smart-queue-logs

# Seguir logs em tempo real
npm run smart-queue-logs -- --follow

# Resetar estado e logs
npm run smart-queue-service-reset
```

### ▶️ Executar Smart Queue (Local vs Serviço)

```bash
# Modo local (desenvolvimento / testes): executa no terminal atual
npm run smart-queue

# Iniciar como serviço systemd (produção) — inicia o service com sudo
node src/cli.js smart-queue --service
# ou use o helper que usa systemctl:
npm run smart-queue-start

# Observação: Ao executar `npm run smart-queue` o CLI tentará detectar se o serviço
# systemd `smart-queue` está instalado/enabled e, se estiver, solicitará seu start
# automaticamente (pode solicitar senha sudo). Para forçar execução local, use:
# node src/cli.js smart-queue --force-local

# Permissões e diretório de dados
# O instalador tenta ajustar permissões do diretório configurado em `/etc/smart-queue/config.json` (campo `baseDir`).
# Se você quiser usar o diretório do repositório, garanta que o usuário do serviço (`smartqueue`) tenha permissão de escrita:
# sudo chown -R smartqueue:smartqueue /home/pedro/projetos/char-lib/data
# Ou altere `baseDir` para um diretório em /var/lib e deixe o instalador cuidar das permissões.

# Comportamento de Ciclos
# Por padrão o daemon executa 1 ciclo por chamada (processa um tipo por vez) com delays conservativos entre tipos e ciclos.
# - Para executar continuamente sem parar entre ciclos, configure `cyclesPerRun` como 0.
# - Exemplo: no serviço (via CLI):
#   node src/cli.js smart-queue --service --cycles-per-run 0 --auto-deploy --deploy-threshold 5 --enrich
# - Ou edite /etc/smart-queue/config.json e ajuste `"cyclesPerRun": 0` e reinicie o serviço.

# Uso recomendado:
# - Em produção: instale o serviço e inicie com systemd
# - Em desenvolvimento: execute localmente com npm run smart-queue
```

### ⚙️ Configuração

**Características:**
- 🐧 **Daemon Linux**: Roda como processo do sistema (systemd)
- 🛡️ **Ultra-conservativo**: Rate limiting de 5 req/min (12s mínimo) para AniList
- 🔄 **Background persistente**: Continua rodando mesmo após logout
- 📊 **Estado persistente**: Salva progresso automaticamente
- 🎯 **Balanceado**: Processa quantidades iguais de cada tipo
- ⏱️ **Long-running**: Projetado para execução indefinida
- 🚀 **Auto-Deploy**: Deploy automático da database a cada X obras

**Como funciona:**
1. Instalado como serviço systemd com usuário dedicado
2. Alterna entre tipos (anime → manga → anime...) automaticamente
3. Processa lote de cada tipo antes de alternar
4. **Executa auto-deploy automaticamente** quando atinge threshold
5. Logs salvos em `/var/log/smart-queue.log`
6. Estado salvo em `data/smart-queue-state.json`
7. Pode ser monitorado e controlado via systemctl

### 📊 Monitoramento

```bash
# Status completo do serviço
npm run smart-queue-service-status

# Ver logs recentes
npm run smart-queue-logs

# Seguir logs ao vivo
npm run smart-queue-logs -- --follow

# Verificar com systemctl
sudo systemctl status smart-queue
```

### 🛑 Controle Avançado

```bash
# Comandos systemctl diretos
sudo systemctl start smart-queue
sudo systemctl stop smart-queue
sudo systemctl restart smart-queue
sudo systemctl enable smart-queue    # Auto-início
sudo systemctl disable smart-queue   # Desabilitar auto-início

# Ver logs do sistema
journalctl -u smart-queue -f
journalctl -u smart-queue --since today
```

### � Auto-Deploy Automático

**Deploy automático da database** a cada X obras processadas:

```bash
# Executar com auto-deploy (deploy a cada 10 obras)
npm run smart-queue-with-deploy

# Com threshold customizado
node src/cli.js smart-queue --auto-deploy --deploy-threshold 5

# No daemon (habilitar no config)
# Editar /etc/smart-queue/config.json:
{
  "autoDeployEnabled": true,
  "autoDeployThreshold": 10
}
```

**O que o auto-deploy faz:**
1. ✅ `npm run generate-indexes` - Gera índices de pesquisa
2. ✅ `npm run validate` - Valida integridade da database
3. ✅ `npm run deploy` - Faz deploy para interface web
4. ✅ `git add .` - Adiciona mudanças ao staging
5. ✅ `git commit -m "automatic db update DD/MM/YYYY-HH:MM:SS: queue X works YMB"`

**Vantagens:**
- 🔄 **Automação completa**: Deploy automático após processamento
- 📊 **Histórico versionado**: Commits automáticos com timestamp
- ✅ **Validação**: Database validada antes do deploy
- 🌐 **Web atualizada**: Interface web sempre atualizada
- 📝 **Logs detalhados**: Acompanhamento completo das operações

**Para deploy final:**
```bash
# Após auto-deploy, fazer push manual
git push origin main
```

## ✨ Features

- 🎯 **Database JSON local** - Sem dependência de banco de dados externo
- 🔄 **Import incremental** - Merge inteligente sem duplicação
- 🤖 **Auto-Crawling** - Descoberta automática de obras populares
- 🎯 **Smart Queue** - Sistema inteligente de alternância entre tipos de conteúdo
- 🐧 **Daemon Linux** - Smart Queue como serviço systemd persistente
- � **API AniList** - Coleta de animes e mangas
- 🎮 **API RAWG** - Coleta de jogos e criadores
- 🔍 **Enrichment System** - Fallback para wikis quando APIs atingem limite
- ⚡ **Rate limiting** - Respeita limites das APIs
- 🔍 **Busca local** - Query rápida nos dados importados
- ✅ **Validação JSON Schema** - Garante consistência dos dados
- 🎨 **CLI completa** - Interface de linha de comando amigável
- 🔧 **Extensível** - Arquitetura preparada para novas fontes de dados

## 🔍 Sistema de Enrichment

Para evitar dependência excessiva de APIs e erros de rate limit, o sistema inclui um **Enrichment Collector** que:

- 🔎 **Busca no DuckDuckGo** por wikis e fontes complementares
- 📖 **Integra dados de Fandom** e outras wikis públicas
- 🛡️ **Fallback automático** quando APIs principais atingem limite
- 🔗 **Adiciona links externos** para mais informações

```bash
# Atualização com enrichment ativado
node src/cli.js update --enrich

# Atualização apenas de informações (sem personagens)
node src/cli.js update --no-characters --enrich
```

**Como funciona:**
- Quando uma API retorna erro 429 (rate limit), o sistema automaticamente busca informações complementares
- Adiciona links para wikis do Fandom, Anime-Planet e outras fontes
- Mantém dados principais das APIs quando disponíveis
- Reduz dependência de uma única fonte de dados

## 📁 Estrutura do Projeto

\`\`\`
char-lib/
├── data/                    # Database JSON
│   ├── anime/
│   │   └── naruto/
│   │       ├── info.json
│   │       └── characters.json
│   ├── manga/
│   └── game/
│
├── schemas/                 # JSON Schemas
│   ├── work.schema.json
│   ├── character.schema.json
│   └── characters_collection.schema.json
│
├── src/
│   ├── collectors/         # APIs / coleta de dados
│   │   └── anilist.js
│   ├── normalizers/        # Transformação de dados
│   │   └── anilist.js
│   ├── writers/            # Escrita incremental
│   │   └── jsonWriter.js
│   ├── jobs/               # Orquestração
│   │   └── importWork.js
│   ├── utils/              # Utilitários
│   │   ├── file.js
│   │   ├── slugify.js
│   │   ├── rateLimiter.js
│   │   ├── retry.js
│   │   ├── logger.js
│   │   └── validator.js
│   └── cli.js              # Interface CLI
│
└── package.json
\`\`\`

## 🚀 Instalação

\`\`\`bash
# Clone o repositório
git clone https://github.com/LyeZinho/char-lib.git
cd char-lib

# Instale as dependências
npm install

# (Opcional) Link global para usar como comando
npm link
\`\`\`

## 📖 Uso

### Importar uma obra

\`\`\`bash
# Importar anime por nome
node src/cli.js import anime "Naruto"

# Importar por ID do AniList
node src/cli.js import anime naruto --id 20

# Importar apenas info (sem personagens)
node src/cli.js import anime "One Piece" --skip-characters

# Limitar número de personagens
node src/cli.js import anime "Bleach" --limit 50
\`\`\`

### Validar dados

\`\`\`bash
# Validar obra específica
node src/cli.js validate anime naruto

# Listar schemas disponíveis
node src/cli.js validate
\`\`\`

### Buscar personagens

\`\`\`bash
# Buscar em obra específica
node src/cli.js search "Uzumaki" --type anime --work naruto

# Filtrar por role
node src/cli.js search "Sasuke" --type anime --work naruto --role protagonist
\`\`\`

### Estatísticas

\`\`\`bash
# Ver stats de uma obra
node src/cli.js stats anime naruto
\`\`\`

### Listar obras

\`\`\`bash
# Listar todas as obras
node src/cli.js list

# Listar apenas animes
node src/cli.js list anime
\`\`\`

### Deploy para Web

Atualiza a base de dados pública do site, sincronizando o diretório \`web/public/data\` com os dados atuais do projeto:

\`\`\`bash
# Executar deploy
npm run deploy

# Ou diretamente
node src/cli.js deploy
\`\`\`

**O que faz:**
- 🗑️ **Remove** o diretório antigo \`web/public/data\`
- 📋 **Copia** todo o conteúdo de \`data/\` para \`web/public/data\`
- ✅ **Atualiza** a base de dados pública do site com dados frescos

## 📊 Estrutura dos Dados

### info.json (Informações da Obra)

\`\`\`json
{
  "id": "naruto",
  "type": "anime",
  "title": "Naruto",
  "alt_titles": ["ナルト"],
  "source": "AniList",
  "source_id": 20,
  "description": "Anime sobre ninjas...",
  "metadata": {
    "format": "TV",
    "episodes": 220,
    "status": "FINISHED",
    "startDate": "2002-10-03",
    "genres": ["Action", "Adventure"]
  },
  "images": [
    {
      "url": "https://...",
      "type": "cover",
      "source": "AniList"
    }
  ],
  "external_ids": {
    "anilist": 20
  },
  "tags": ["ninja", "shounen"],
  "updated_at": "2025-12-22T10:00:00.000Z"
}
\`\`\`

### characters.json (Personagens)

\`\`\`json
{
  "work_id": "naruto",
  "count": 1,
  "updated_at": "2025-12-22T10:05:00.000Z",
  "characters": [
    {
      "id": "uzumaki_naruto",
      "name": "Naruto Uzumaki",
      "alt_names": ["うずまきナルト"],
      "role": "protagonist",
      "description": "Ninja da Vila da Folha...",
      "metadata": {
        "gender": "male",
        "age": "12-17"
      },
      "images": [
        {
          "url": "https://...",
          "type": "portrait",
          "source": "AniList"
        }
      ],
      "external_ids": {
        "anilist": 17
      }
    }
  ]
}
\`\`\`

## 🧱 Arquitetura

### Fluxo de Importação

\`\`\`
┌─────────────┐
│   CLI       │  node src/cli.js import anime "Naruto"
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ ImportJob   │  Orquestra o processo
└──────┬──────┘
       │
       ├──▶ ┌────────────┐
       │    │ Collector  │  Busca dados na API AniList
       │    └────────────┘  (com rate limit e retry)
       │
       ├──▶ ┌────────────┐
       │    │ Normalizer │  Transforma para nosso schema
       │    └────────────┘
       │
       └──▶ ┌────────────┐
            │   Writer   │  Salva/merge nos arquivos JSON
            └────────────┘
\`\`\`

### Componentes Principais

- **Collectors**: Fazem requisições às APIs externas (AniList, MAL, etc)
- **Normalizers**: Transformam dados externos para nosso formato padrão
- **Writers**: Gerenciam escrita incremental e deduplicação
- **Jobs**: Orquestram o fluxo completo de importação
- **Utils**: Rate limiting, retry, validação, file I/O

## 🔧 Desenvolvimento

### Adicionar nova fonte de dados

1. Criar collector em `src/collectors/`
2. Criar normalizer em `src/normalizers/`
3. Adicionar opção na CLI

Exemplo:

\`\`\`javascript
// src/collectors/myanimelist.js
export class MALCollector {
  async searchAnime(query) {
    // Implementar coleta
  }
}

// src/normalizers/myanimelist.js
export function normalizeMALData(data) {
  // Transformar para nosso schema
  return {
    id: slugify(data.title),
    type: 'anime',
    title: data.title,
    // ...
  };
}
\`\`\`

### Rate Limits

- **AniList**: ~90 requisições/minuto (configurado em `anilist.js`)
- Ajustável via `RateLimiter` class

### Validação

Todos os dados são validados contra JSON Schemas antes de serem salvos.

\`\`\`bash
# Validar manualmente
node src/cli.js validate anime naruto
\`\`\`

## ⚠️ Limitações das APIs

### Descrições de Personagens

**MyAnimeList (MAL)**: A API Jikan não fornece descrições detalhadas dos personagens. Quando importado via `--source mal`, os personagens terão uma mensagem explicativa no campo `description`:

```json
{
  "description": "Descrição não disponível via MyAnimeList. Use --source anilist para obter descrições completas dos personagens."
}
```

**AniList**: Fornece descrições completas e ricas dos personagens. Recomendado para importações que precisam de informações detalhadas.

### Recomendação

Para obter descrições completas dos personagens, sempre use:

```bash
node src/cli.js import anime "Nome do Anime" --source anilist
```

### Rate Limits

- **AniList**: ~90 requisições/minuto (configurado em `anilist.js`)
- **MyAnimeList (Jikan)**: ~60 requisições/minuto
- Ajustável via classes `RateLimiter`

## 🗺️ Roadmap

### Fase 1 - Base ✅
- [x] Estrutura do projeto
- [x] JSON Schemas
- [x] Writer incremental
- [x] CLI básica

### Fase 2 - Coleta ✅
- [x] AniList collector
- [x] Batch + rate limit
- [x] Paginação automática

### Fase 3 - Expansão 🚧
- [ ] MyAnimeList collector
- [ ] IGDB collector (games)
- [ ] Deduplicação avançada (similaridade de strings)
- [ ] Cache de requisições
- [ ] Testes unitários

### Fase 4 - Qualidade 📋
- [ ] Logs estruturados
- [ ] Métricas de importação
- [ ] Exportação para outros formatos
- [ ] API REST local (opcional)

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

📖 **[Guia de Desenvolvimento →](docs/DEVELOPMENT.md)**

## 📚 Documentação

- **[🚀 Início Rápido](docs/QUICKSTART.md)** - Comece em 5 minutos
- **[📋 Exemplos](docs/EXAMPLES.md)** - Casos de uso práticos
- **[🏗️ Estrutura](docs/STRUCTURE.md)** - Arquitetura do projeto
- **[💻 Desenvolvimento](docs/DEVELOPMENT.md)** - Guia para contribuidores

## 📝 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🔗 Links Úteis

- [AniList API Documentation](https://anilist.gitbook.io/anilist-apiv2-docs/)
- [JSON Schema](https://json-schema.org/)
- [Commander.js](https://github.com/tj/commander.js)

---

**Feito com ❤️ por LyeZinho**
