# Character Library (char-lib)

> 📚 Database local de personagens (anime, games, manga, etc.) usando arquivos JSON

Sistema de wiki de personagens 100% em JavaScript, com coleta via APIs públicas (AniList), batch controlado, rate limit e armazenamento incremental em JSON.

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
```

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

## ✨ Features

- 🎯 **Database JSON local** - Sem dependência de banco de dados externo
- 🔄 **Import incremental** - Merge inteligente sem duplicação
- 🤖 **Auto-Crawling** - Descoberta automática de obras populares
- 🌐 **API AniList** - Coleta de animes e mangas
- 🔍 **Enrichment System** - Fallback para wikis quando APIs atingem limite
- ⚡ **Rate limiting** - Respeita limites das APIs
- 🔍 **Busca local** - Query rápida nos dados importados
- ✅ **Validação JSON Schema** - Garante consistência dos dados
- 🎨 **CLI completa** - Interface de linha de comando amigável

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
