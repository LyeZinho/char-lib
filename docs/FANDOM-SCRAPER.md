# Fandom Scraper - Documentação

## Visão Geral

O sistema agora suporta scraping estruturado de wikis do Fandom usando uma abordagem híbrida:

1. **DuckDuckGo Search** → Encontra URLs de wikis do Fandom
2. **MediaWiki API** → Lista personagens da categoria "Characters"
3. **Cheerio Parser** → Extrai dados estruturados das infoboxes

## ✅ Integração com AutoCrawl

O Fandom Scraper está **integrado automaticamente ao AutoCrawl** para jogos:

```bash
# AutoCrawl ativa enrichment automaticamente para jogos
node src/cli.js autocrawl --type game --max-works 5

# Para cada jogo descoberto via RAWG:
# 1. Coleta dados básicos do jogo
# 2. Ativa enrichment automaticamente
# 3. Busca wiki no Fandom
# 4. Extrai personagens via MediaWiki API + Cheerio
# 5. Salva dados normalizados no schema padrão
```

**Fluxo completo:**
```
RAWG API → Descobre jogos populares
    ↓
AutoCrawl → Processa cada jogo com enrich=true
    ↓
DuckDuckGo → "Jogo characters site:fandom.com"
    ↓
Fandom encontrado → https://jogo.fandom.com
    ↓
MediaWiki API → Lista Category:Characters
    ↓
Cheerio → Extrai infoboxes de cada personagem
    ↓
Schema normalizado → data/game/slug/characters.json
```

### Categorias Tentadas

O sistema tenta automaticamente múltiplas categorias de personagens:

- `Category:Characters` (padrão)
- `Category:Playable_Characters`
- `Category:Heroes`
- `Category:Villains`
- `Category:Antagonists`
- `Category:Bosses`
- `Category:NPCs`

### Rate Limiting Automático

- Delay de 2s a cada 10 personagens processados
- Limite de 100 personagens por jogo
- Respeito aos rate limits do Fandom

## Arquitetura

### 1. EnrichmentCollector

Novos métodos adicionados em `src/collectors/enrichment.js`:

#### `findFandomWiki(gameName)`
Busca no DuckDuckGo por wikis do Fandom relacionadas ao jogo.

```javascript
const collector = createEnrichmentCollector();
const wikiUrl = await collector.findFandomWiki('Nier Automata');
// Retorna: "https://nier.fandom.com"
```

#### `listFandomCharacters(fandomBaseUrl, category = 'Category:Characters')`
Usa a MediaWiki API para listar todos os membros de uma categoria.

```javascript
const characters = await collector.listFandomCharacters('https://nier.fandom.com');
// Retorna: ['2B', '9S', 'A2', ...]
```

#### `scrapeFandomCharacter(fandomBaseUrl, pageTitle)`
Extrai dados estruturados de uma página de personagem usando a API parse + Cheerio.

```javascript
const charData = await collector.scrapeFandomCharacter('https://nier.fandom.com', '2B');
// Retorna:
// {
//   name: "2B",
//   data: {
//     image: "https://...",
//     species: "Android",
//     gender: "Female",
//     occupation: "Combat Unit",
//     ...
//   }
// }
```

#### `enrichGameWithFandom(gameName)`
Método orquestrador que executa todo o pipeline:

```javascript
const result = await collector.enrichGameWithFandom('Nier Automata');
// Retorna:
// {
//   found: true,
//   source: 'fandom',
//   wikiUrl: 'https://nier.fandom.com',
//   characters: [...]  // Array com dados estruturados
// }
```

### 2. Normalizador Fandom

Função `normalizeFandomCharacters()` em `src/normalizers/rawg.js`:

- Converte dados brutos do Fandom para o schema do projeto
- Extrai nomes alternativos de campos como `alias`, `also_known_as`
- Identifica role do personagem baseado em campos da infobox
- Mapeia campos comuns: species, gender, occupation, etc.

```javascript
import { normalizeFandomCharacters } from './normalizers/rawg.js';

const normalized = normalizeFandomCharacters(fandomCharacters, 'nier-automata');
// Retorna array no formato do character.schema.json
```

### 3. Integração com ImportWorkJob

O job de importação agora detecta automaticamente dados do Fandom:

```javascript
// Em src/jobs/importWork.js, para jogos com --enrich:
if (enrichment?.source === 'fandom' && enrichment.characters?.length > 0) {
  // Usa normalizador específico do Fandom
  const normalizedFromFandom = normalizeFandomCharacters(
    enrichment.characters,
    normalizedWork.id
  );
  // Salva personagens normalizados
}
```

## Uso

### Via CLI

```bash
# Importar jogo com enrichment do Fandom
node src/cli.js import game "Final Fantasy VII" --enrich

# AutoCrawl com enrichment
node src/cli.js autocrawl --type=game --enrich --limit=10
```

### Via Script

```javascript
import { ImportWorkJob } from './jobs/importWork.js';

const job = new ImportWorkJob({
  baseDir: './data',
  source: 'rawg',
  type: 'game',
  enrich: true  // Ativa Fandom scraping
});

await job.importOne('Final Fantasy VII', { 
  enrich: true 
});
```

### Script de Teste

```bash
# Teste completo do Fandom
node scripts/test-fandom.js

# Teste rápido
node scripts/test-fandom-quick.js
```

## Exemplo de Dados Extraídos

### Entrada (Fandom infobox)
```html
<aside class="portable-infobox">
  <h2 class="pi-title">2B</h2>
  <figure class="pi-image">
    <img src="https://static.wikia.nocookie.net/nier/images/2B.png"/>
  </figure>
  <div class="pi-data">
    <h3 class="pi-data-label">Species</h3>
    <div class="pi-data-value">Android</div>
  </div>
  <div class="pi-data">
    <h3 class="pi-data-label">Gender</h3>
    <div class="pi-data-value">Female</div>
  </div>
  ...
</aside>
```

### Saída (Normalizada)
```json
{
  "id": "2b-nier-automata-0",
  "name": "2B",
  "alt_names": ["YoRHa No.2 Type B"],
  "role": "protagonist",
  "description": "2B is a combat android...",
  "metadata": {
    "species": "Android",
    "gender": "Female",
    "occupation": "Combat Unit",
    "affiliation": "YoRHa",
    "voice_actor": "Yui Ishikawa"
  },
  "images": [
    {
      "url": "https://static.wikia.nocookie.net/nier/images/2B.png",
      "type": "profile"
    }
  ],
  "external_ids": {
    "fandom_title": "2B"
  },
  "tags": ["Android", "YoRHa", "Combat Unit", "protagonist"],
  "updated_at": "2025-12-23T14:36:07.353Z"
}
```

## Rate Limiting

O sistema implementa delays automáticos:

- Delay de 1s entre requisições de personagens
- Pausa de 2s a cada 10 personagens processados
- Limite padrão de 100 personagens por jogo (configurável)

## Fallback

Se o Fandom não retornar resultados, o sistema automaticamente volta para o método anterior (regex-based scraping).

## Limitações Conhecidas

1. **Dependência de estrutura HTML**: Algumas wikis do Fandom não usam infoboxes portáteis
2. **Rate limits**: O Fandom pode bloquear temporariamente após muitas requisições
3. **Precisão da busca**: DuckDuckGo pode não encontrar a wiki correta em alguns casos

## Melhorias Futuras

- [ ] Cache de respostas da MediaWiki API
- [ ] Suporte para categorias alternativas além de "Category:Characters"
- [ ] Extração de relacionamentos entre personagens
- [ ] Suporte para múltiplas wikis (fallback entre diferentes Fandoms)
- [ ] Opção `--dry-run` para preview sem persistir dados
