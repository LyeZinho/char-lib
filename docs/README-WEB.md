# CharLib - Biblioteca de Personagens

Sistema completo de crawling e visualização de personagens de anime, manga e games.

## 📚 Visão Geral

O CharLib é composto por duas partes principais:

1. **Sistema de Crawling**: CLI Node.js para importar e gerenciar dados
2. **Interface Web**: Frontend React para visualizar e explorar os dados

## 🚀 Início Rápido

### Instalação

```bash
# Instalar dependências do sistema de crawling
npm install

# Instalar dependências do frontend
cd web
npm install
cd ..
```

### Uso Básico

```bash
# Importar uma obra específica
npm run import -- --id 20

# Crawling automático contínuo
npm run autocraw

# Atualizar obras existentes
npm run update

# Gerar índices para a API web
npm run generate-indexes

# Iniciar o frontend
npm run web:dev
```

## 🛠️ Sistema de Crawling

### Comandos Disponíveis

#### AutoCraw - Crawling Automático
```bash
npm run autocraw -- --max-works 10 --delay 5000
```

Descobre e importa obras populares automaticamente.

**Opções:**
- `--max-works <n>` - Máximo de obras por ciclo (padrão: 5)
- `--character-limit <n>` - Limite de personagens por obra (padrão: 25)
- `--delay <ms>` - Delay entre importações (padrão: 15000)
- `--max-total <n>` - Limite total de obras (0 = infinito)
- `--enrich` - Habilitar enrichment como fallback
- `--base-dir <dir>` - Diretório base dos dados

#### Import - Importar Obra Específica
```bash
npm run import -- --id 20 --character-limit 50
```

Importa uma obra pelo ID do AniList.

#### Update - Atualizar Dados
```bash
npm run update
```

Atualiza informações de obras já importadas.

**Opções:**
- `--no-characters` - Não atualizar personagens
- `--enrich` - Usar enrichment em caso de rate limit
- `--delay <ms>` - Delay entre atualizações

#### Cache - Gerenciar Cache
```bash
npm run cache status    # Ver status
npm run cache clear     # Limpar cache
npm run cache rebuild   # Reconstruir cache
```

Gerencia o cache de obras processadas.

#### Outros Comandos
```bash
npm run validate        # Validar schemas
npm run search          # Buscar obras
npm run stats           # Ver estatísticas
npm run list            # Listar obras
```

## 🌐 Interface Web

### Desenvolvimento

```bash
npm run web:dev
```

Servidor de desenvolvimento disponível em `http://localhost:5173`

### Build para Produção

```bash
npm run web:build
npm run web:preview
```

### Features

- 📖 **Wiki Moderna**: Interface limpa em tema escuro
- 🔍 **Busca Avançada**: Pesquise obras e personagens
- 📊 **Hierarquia Clara**: Obras → Personagens → Detalhes
- 📡 **API Estática**: Sem necessidade de backend
- 📱 **Responsivo**: Funciona em todos os dispositivos
- 📚 **Documentação**: Guia completo integrado

## 📁 Estrutura de Dados

```
data/
├── anime/
│   ├── index.json              # Índice de todas as obras anime
│   └── {slug}/
│       ├── info.json           # Informações da obra
│       ├── characters.json     # Lista de personagens
│       └── {character}.json    # Dados individuais
├── manga/
│   └── ...
└── game/
    └── ...
```

## 🔌 API Estática

A interface web usa uma API completamente estática:

### Endpoints

- `GET /data/{type}/index.json` - Lista todas as obras
- `GET /data/{type}/{slug}/info.json` - Informações da obra
- `GET /data/{type}/{slug}/characters.json` - Personagens da obra
- `GET /data/{type}/{slug}/{character}.json` - Dados do personagem

**Tipos disponíveis:** `anime`, `manga`, `game`

### Exemplo de Uso

```javascript
// Listar obras de anime
fetch('/data/anime/index.json')
  .then(res => res.json())
  .then(works => console.log(works));

// Obter informações de uma obra
fetch('/data/anime/naruto/info.json')
  .then(res => res.json())
  .then(work => console.log(work));

// Listar personagens
fetch('/data/anime/naruto/characters.json')
  .then(res => res.json())
  .then(data => console.log(data.characters));

// Dados de um personagem
fetch('/data/anime/naruto/uzumaki-naruto.json')
  .then(res => res.json())
  .then(character => console.log(character));
```

## 🔧 Tecnologias

### Backend/Crawling
- Node.js
- GraphQL (AniList API)
- DuckDuckGo (Enrichment)
- JSON Schema (Validação)

### Frontend
- Vite
- React
- React Router
- Tailwind CSS

## 💡 Dicas

### Rate Limits
Use delays adequados para evitar ser bloqueado:
```bash
npm run autocraw -- --delay 15000
```

### Enrichment Automático
O sistema usa DuckDuckGo como fallback quando rate limits são atingidos:
```bash
npm run autocraw -- --enrich
```

### Cache Inteligente
O cache rastreia obras processadas automaticamente:
```bash
npm run cache status  # Monitorar cache
```

### Gerando Índices
Sempre gere os índices após importar novas obras:
```bash
npm run generate-indexes
```

## 📖 Documentação Completa

Acesse a documentação completa no frontend em `/docs` ou veja:
- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Exemplos](docs/EXAMPLES.md)
- [Estrutura](docs/STRUCTURE.md)
- [Quickstart](docs/QUICKSTART.md)

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🔗 Links

- [AniList API](https://anilist.gitbook.io/anilist-apiv2-docs/)
- [Jikan API](https://jikan.moe/)
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
