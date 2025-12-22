# Guia de Desenvolvimento

## Setup do Ambiente

\`\`\`bash
# Clone e instale
git clone https://github.com/LyeZinho/char-lib.git
cd char-lib
npm install

# Link global (opcional)
npm link
\`\`\`

## Estrutura de Código

### Collectors

Responsáveis por buscar dados de APIs externas.

**Template:**

\`\`\`javascript
// src/collectors/example.js
import { RateLimiter } from '../utils/rateLimiter.js';
import { retryHttp } from '../utils/retry.js';

export class ExampleCollector {
  constructor(options = {}) {
    this.apiUrl = 'https://api.example.com';
    this.rateLimiter = new RateLimiter(
      options.requestsPerMinute || 60,
      60000
    );
  }

  async query(endpoint, params = {}) {
    return this.rateLimiter.execute(async () => {
      return retryHttp(async () => {
        const response = await fetch(\`\${this.apiUrl}/\${endpoint}\`);
        return response.json();
      });
    });
  }

  async searchWork(query) {
    return this.query('search', { q: query });
  }

  async getCharacters(workId) {
    return this.query(\`works/\${workId}/characters\`);
  }
}
\`\`\`

### Normalizers

Transformam dados externos para o formato do schema.

**Template:**

\`\`\`javascript
// src/normalizers/example.js
import { slugify } from '../utils/slugify.js';

export function normalizeWork(externalData) {
  return {
    id: slugify(externalData.title),
    type: determineType(externalData.type),
    title: externalData.title,
    alt_titles: externalData.alternativeTitles || [],
    source: 'Example',
    source_id: externalData.id,
    description: externalData.synopsis,
    metadata: {
      // Campos específicos
    },
    images: normalizeImages(externalData.images),
    external_ids: {
      example: externalData.id
    },
    tags: externalData.tags || [],
    updated_at: new Date().toISOString()
  };
}

export function normalizeCharacters(externalCharacters, workId) {
  return externalCharacters.map(char => ({
    id: slugify(char.name),
    name: char.name,
    alt_names: char.aliases || [],
    role: normalizeRole(char.role),
    description: char.bio,
    metadata: {},
    images: normalizeImages(char.images),
    external_ids: {
      example: char.id
    }
  }));
}
\`\`\`

### Writers

Gerenciam a escrita incremental e merge de dados.

O writer já está implementado em `src/writers/jsonWriter.js` e oferece:

- `upsertWork()` - Salvar/atualizar obra
- `upsertCharacters()` - Merge inteligente de personagens
- `findCharacters()` - Busca local
- `getStats()` - Estatísticas

### Jobs

Orquestram o fluxo completo.

**Template:**

\`\`\`javascript
// src/jobs/importExample.js
import { createExampleCollector } from '../collectors/example.js';
import { normalizeWork, normalizeCharacters } from '../normalizers/example.js';
import { createWriter } from '../writers/jsonWriter.js';

export class ImportExampleJob {
  constructor(options = {}) {
    this.collector = createExampleCollector(options);
    this.writer = createWriter(options.baseDir || './data');
  }

  async import(criteria, options = {}) {
    // 1. Coletar
    const workData = await this.collector.searchWork(criteria.search);
    const charactersData = await this.collector.getCharacters(workData.id);

    // 2. Normalizar
    const normalizedWork = normalizeWork(workData);
    const normalizedChars = normalizeCharacters(charactersData, normalizedWork.id);

    // 3. Escrever
    await this.writer.upsertWork(
      normalizedWork.type,
      normalizedWork.id,
      normalizedWork
    );

    const stats = await this.writer.upsertCharacters(
      normalizedWork.type,
      normalizedWork.id,
      normalizedChars
    );

    return { work: normalizedWork, characters: stats };
  }
}
\`\`\`

## Adicionando Nova Fonte

### 1. Criar Collector

\`\`\`bash
touch src/collectors/myfont.js
\`\`\`

Implementar métodos de coleta com rate limiting.

### 2. Criar Normalizer

\`\`\`bash
touch src/normalizers/myfont.js
\`\`\`

Implementar transformação para nossos schemas.

### 3. Criar Job (opcional)

\`\`\`bash
touch src/jobs/importMyFont.js
\`\`\`

Orquestrar coleta, normalização e escrita.

### 4. Adicionar na CLI

Editar `src/cli.js`:

\`\`\`javascript
program
  .command('import')
  .option('-s, --source <source>', 'Fonte dos dados', 'anilist')
  // ...
  .action(async (type, search, options) => {
    let job;
    
    switch (options.source) {
      case 'anilist':
        job = createImportJob({ baseDir: options.baseDir });
        break;
      case 'myfont':
        job = createMyFontJob({ baseDir: options.baseDir });
        break;
      default:
        throw new Error(\`Fonte desconhecida: \${options.source}\`);
    }
    
    // ...
  });
\`\`\`

## Testes

### Teste Manual

\`\`\`bash
# Testar importação
node src/cli.js import anime "Test Anime" --limit 5

# Validar resultado
node src/cli.js validate anime test-anime

# Ver stats
node src/cli.js stats anime test-anime
\`\`\`

### Testes Unitários (futuro)

Estrutura sugerida:

\`\`\`
tests/
├── unit/
│   ├── collectors/
│   ├── normalizers/
│   └── writers/
└── integration/
    └── import.test.js
\`\`\`

## Debugging

### Logs Detalhados

Editar `src/utils/logger.js` para habilitar nível debug:

\`\`\`javascript
export const logger = new Logger({ level: 'debug' });
\`\`\`

### Inspecionar Requisições

Adicionar logs no collector:

\`\`\`javascript
async query(query, variables = {}) {
  console.log('Query:', query);
  console.log('Variables:', variables);
  
  const result = await this.rateLimiter.execute(async () => {
    // ...
  });
  
  console.log('Result:', result);
  return result;
}
\`\`\`

## Performance

### Rate Limits

Ajustar por fonte:

\`\`\`javascript
const collector = createAniListCollector({
  requestsPerMinute: 60 // Mais conservador
});
\`\`\`

### Batch Processing

\`\`\`javascript
const works = [...]; // Lista grande

await job.importBatch(works, {
  delayBetween: 5000, // 5s entre cada
  characterLimit: 50  // Limitar personagens
});
\`\`\`

### Cache (futuro)

Implementar cache de requisições para evitar duplicadas.

## Schemas

### Modificar Schemas Existentes

Editar arquivos em `schemas/`:

- `work.schema.json`
- `character.schema.json`
- `characters_collection.schema.json`

### Adicionar Novo Schema

\`\`\`bash
touch schemas/my_entity.schema.json
\`\`\`

O validador carregará automaticamente.

## Boas Práticas

1. **Rate Limiting**: Sempre usar `RateLimiter` para APIs externas
2. **Retry**: Usar `retryHttp` para requisições HTTP
3. **Validação**: Validar dados antes de salvar
4. **Logs**: Usar `logger` para feedback ao usuário
5. **Slugs**: Usar `slugify()` para gerar IDs consistentes
6. **Merge**: Preservar dados existentes ao fazer upsert

## Contribuindo

1. Fork o projeto
2. Crie branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'Adiciona feature X'`
4. Push: `git push origin feature/minha-feature`
5. Abra PR

### Checklist de PR

- [ ] Código segue o estilo do projeto
- [ ] Adiciona documentação se necessário
- [ ] Testa manualmente as mudanças
- [ ] Atualiza README se necessário
