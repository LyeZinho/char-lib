# Character Library (char-lib)

> 📚 Database local de personagens (anime, games, manga, etc.) usando arquivos JSON

Sistema de wiki de personagens 100% em JavaScript, com coleta via APIs públicas (AniList), batch controlado, rate limit e armazenamento incremental em JSON.

## ✨ Features

- 🎯 **Database JSON local** - Sem dependência de banco de dados externo
- 🔄 **Import incremental** - Merge inteligente sem duplicação
- 🌐 **API AniList** - Coleta de animes e mangas
- ⚡ **Rate limiting** - Respeita limites das APIs
- 🔍 **Busca local** - Query rápida nos dados importados
- ✅ **Validação JSON Schema** - Garante consistência dos dados
- 🎨 **CLI completa** - Interface de linha de comando amigável

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

## 📝 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🔗 Links Úteis

- [AniList API Documentation](https://anilist.gitbook.io/anilist-apiv2-docs/)
- [JSON Schema](https://json-schema.org/)
- [Commander.js](https://github.com/tj/commander.js)

---

**Feito com ❤️ por LyeZinho**
