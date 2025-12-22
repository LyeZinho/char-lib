# 📁 Estrutura Completa do Projeto

\`\`\`
char-lib/
│
├── 📄 LICENSE                          # Licença MIT
├── 📄 package.json                     # Dependências e scripts
├── 📄 README.md                        # Documentação principal
├── 📄 .gitignore                       # Arquivos ignorados
│
├── 📂 data/                            # Database JSON (criada após imports)
│   ├── anime/                          # Animes importados
│   │   └── [work-id]/
│   │       ├── info.json
│   │       └── characters.json
│   ├── manga/                          # Mangas importados
│   └── game/                           # Games importados
│
├── 📂 schemas/                         # JSON Schemas
│   ├── work.schema.json                # Schema de obras
│   ├── character.schema.json           # Schema de personagens
│   └── characters_collection.schema.json # Schema de coleção
│
├── 📂 src/                             # Código fonte
│   │
│   ├── 📄 cli.js                       # Interface de linha de comando
│   │                                   # Comandos: import, validate, search, stats, list
│   │
│   ├── 📂 collectors/                  # Coleta de dados de APIs
│   │   └── anilist.js                  # Cliente GraphQL do AniList
│   │                                   # - searchMedia()
│   │                                   # - collectCharacters()
│   │                                   # - Rate limiting integrado
│   │
│   ├── 📂 normalizers/                 # Transformação de dados
│   │   └── anilist.js                  # Normaliza dados do AniList
│   │                                   # - normalizeWork()
│   │                                   # - normalizeCharacters()
│   │
│   ├── 📂 writers/                     # Escrita de dados
│   │   └── jsonWriter.js               # Writer incremental
│   │                                   # - upsertWork()
│   │                                   # - upsertCharacters()
│   │                                   # - findCharacters()
│   │                                   # - getStats()
│   │
│   ├── 📂 jobs/                        # Orquestração
│   │   └── importWork.js               # Job de importação completo
│   │                                   # - import()
│   │                                   # - updateCharacters()
│   │                                   # - importBatch()
│   │
│   └── 📂 utils/                       # Utilitários
│       ├── file.js                     # I/O de arquivos JSON
│       ├── slugify.js                  # Geração de slugs
│       ├── rateLimiter.js              # Controle de rate limit
│       ├── retry.js                    # Retry automático
│       ├── logger.js                   # Sistema de logs
│       └── validator.js                # Validação JSON Schema
│
├── 📂 scripts/                         # Scripts auxiliares
│   ├── batch-import-example.js         # Exemplo de batch import
│   └── usage-example.js                # Exemplos de uso programático
│
└── 📂 docs/                            # Documentação
    ├── QUICKSTART.md                   # Guia de início rápido
    ├── EXAMPLES.md                     # Exemplos de uso
    └── DEVELOPMENT.md                  # Guia para desenvolvedores
\`\`\`

## 🔍 Descrição dos Componentes

### Core (src/)

#### **cli.js**
- Interface principal do usuário
- Comandos: import, validate, search, stats, list
- Usa Commander.js para parsing de argumentos

#### **collectors/**
- Responsáveis por buscar dados de APIs externas
- Implementam rate limiting e retry automático
- Atualmente: AniList (GraphQL)
- Futuro: MyAnimeList, IGDB, etc.

#### **normalizers/**
- Transformam dados externos para formato padronizado
- Garantem compatibilidade com os schemas
- Limpam e formatam dados (HTML, datas, etc.)

#### **writers/**
- Gerenciam persistência em JSON
- Merge inteligente sem duplicação
- Criam diretórios automaticamente
- Atualizam contadores

#### **jobs/**
- Orquestram fluxo completo: coleta → normalização → escrita
- Suportam batch processing
- Gerenciam checkpoints (futuro)

#### **utils/**
- **file.js**: Operações de I/O assíncronas
- **slugify.js**: Geração de IDs válidos
- **rateLimiter.js**: Controle de taxa de requisições
- **retry.js**: Retry com backoff exponencial
- **logger.js**: Logs coloridos com níveis
- **validator.js**: Validação contra JSON Schemas

### Dados (data/)

Estrutura gerada após imports:

\`\`\`
data/
└── [tipo]/              # anime, manga, game, etc.
    └── [work-id]/       # slug da obra
        ├── info.json    # Metadados da obra
        └── characters.json  # Personagens
\`\`\`

**info.json**: Título, descrição, metadata, tags, imagens
**characters.json**: Array de personagens com deduplicação

### Schemas (schemas/)

Validação automática de todos os dados:

- **work.schema.json**: Estrutura de uma obra
- **character.schema.json**: Estrutura de um personagem
- **characters_collection.schema.json**: Arquivo characters.json

### Scripts (scripts/)

Exemplos prontos para uso:

- **batch-import-example.js**: Importa múltiplas obras
- **usage-example.js**: 5 exemplos de uso programático

### Docs (docs/)

- **QUICKSTART.md**: Começar em 5 minutos
- **EXAMPLES.md**: Casos de uso avançados
- **DEVELOPMENT.md**: Guia para contribuir

## 🔄 Fluxo de Dados

\`\`\`
┌─────────────────┐
│  CLI Command    │  node src/cli.js import anime "Naruto"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ImportJob      │  Orquestra o processo
└────────┬────────┘
         │
         ├──▶ ┌──────────────┐
         │    │  Collector   │  GET https://graphql.anilist.co
         │    └──────────────┘  Rate limit: 90 req/min
         │                      Retry: 3x com backoff
         │
         ├──▶ ┌──────────────┐
         │    │  Normalizer  │  Transforma para schema
         │    └──────────────┘  Limpa HTML, gera slugs
         │
         ├──▶ ┌──────────────┐
         │    │  Validator   │  Valida contra schema
         │    └──────────────┘  Garante consistência
         │
         └──▶ ┌──────────────┐
              │   Writer     │  Salva/merge em JSON
              └──────────────┘  Deduplica, atualiza count
                      │
                      ▼
              data/anime/naruto/
              ├── info.json
              └── characters.json
\`\`\`

## 📦 Dependências

- **commander**: CLI framework
- **ajv**: JSON Schema validator
- **ajv-formats**: Formatos adicionais para AJV
- **fetch**: Nativo no Node ≥ 18

## 🎯 Extensibilidade

### Adicionar Nova Fonte

1. Criar `src/collectors/myfont.js`
2. Criar `src/normalizers/myfont.js`
3. Atualizar CLI para suportar nova fonte

### Adicionar Novo Tipo

1. Criar pasta `data/meu-tipo/`
2. Schema já suporta tipos customizados
3. Usar normalmente: `import meu-tipo "Nome"`

### Personalizar Schemas

Editar arquivos em `schemas/` - validação automática

## 📊 Métricas

- **Linhas de código**: ~2000 LOC
- **Arquivos**: 23
- **Cobertura**: Schemas completos, validação automática
- **Performance**: ~90 requisições/minuto (AniList)
