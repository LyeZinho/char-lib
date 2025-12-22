# Exemplos de Uso

## Importação Básica

### Importar um anime

\`\`\`bash
# Por nome
node src/cli.js import anime "Naruto"

# Por ID do AniList
node src/cli.js import anime naruto --id 20

# Com limite de personagens
node src/cli.js import anime "One Piece" --limit 100
\`\`\`

### Importar apenas informações (sem personagens)

\`\`\`bash
node src/cli.js import anime "Bleach" --skip-characters
\`\`\`

## Importação em Batch (via script)

Crie um arquivo \`batch-import.js\`:

\`\`\`javascript
import { createImportJob } from './src/jobs/importWork.js';

const job = createImportJob({ baseDir: './data' });

const works = [
  { search: 'Naruto', type: 'anime' },
  { search: 'One Piece', type: 'anime' },
  { search: 'Death Note', type: 'anime' }
];

await job.importBatch(works, {
  skipCharacters: false,
  characterLimit: 50,
  delayBetween: 3000 // 3 segundos entre cada importação
});
\`\`\`

Execute:

\`\`\`bash
node batch-import.js
\`\`\`

## Busca e Consulta

### Buscar personagens

\`\`\`bash
# Buscar por nome
node src/cli.js search "Uzumaki" --type anime --work naruto

# Filtrar por role
node src/cli.js search "Sasuke" --type anime --work naruto --role protagonist
\`\`\`

### Ver estatísticas

\`\`\`bash
node src/cli.js stats anime naruto
\`\`\`

Saída:
\`\`\`
📊 Estatísticas: Naruto

   ID: naruto
   Tipo: anime
   Total de personagens: 245

   Por role:
     protagonist: 5
     supporting: 89
     minor: 151

   Última atualização: 2025-12-22T10:05:00.000Z
\`\`\`

### Listar obras

\`\`\`bash
# Todas
node src/cli.js list

# Apenas animes
node src/cli.js list anime
\`\`\`

## Validação

### Validar obra específica

\`\`\`bash
node src/cli.js validate anime naruto
\`\`\`

### Ver schemas disponíveis

\`\`\`bash
node src/cli.js validate
\`\`\`

## Uso Programático

### Importar via código

\`\`\`javascript
import { createImportJob } from './src/jobs/importWork.js';

const job = createImportJob();

const result = await job.import({
  search: 'Cowboy Bebop',
  type: 'anime'
});

console.log(\`Importados \${result.characters.total} personagens\`);
\`\`\`

### Buscar personagens via código

\`\`\`javascript
import { createWriter } from './src/writers/jsonWriter.js';

const writer = createWriter('./data');

const characters = await writer.findCharacters('anime', 'naruto', {
  name: 'Uzumaki',
  role: 'protagonist'
});

console.log(characters);
\`\`\`

### Validar via código

\`\`\`javascript
import { createValidator } from './src/utils/validator.js';

const validator = await createValidator();

const result = await validator.validateWork('anime', 'naruto');

if (result.valid) {
  console.log('✅ Dados válidos!');
} else {
  console.error('❌ Erros:', result.errors);
}
\`\`\`

## Exemplos Avançados

### Rate Limiting Customizado

\`\`\`javascript
import { createImportJob } from './src/jobs/importWork.js';

const job = createImportJob({
  collectorOptions: {
    requestsPerMinute: 60 // Mais conservador
  }
});
\`\`\`

### Merge Manual de Dados

\`\`\`javascript
import { createWriter } from './src/writers/jsonWriter.js';

const writer = createWriter('./data');

// Adicionar personagem manualmente
await writer.upsertCharacters('anime', 'naruto', [
  {
    id: 'custom_character',
    name: 'Custom Character',
    role: 'other',
    description: 'Personagem customizado',
    metadata: {},
    images: [],
    external_ids: {}
  }
]);
\`\`\`

### Busca com Múltiplos Critérios

\`\`\`javascript
const writer = createWriter('./data');

// Buscar protagonistas com "Uzumaki" no nome
const results = await writer.findCharacters('anime', 'naruto', {
  name: 'Uzumaki',
  role: 'protagonist'
});

// Filtrar ainda mais (exemplo)
const filtered = results.filter(char => 
  char.metadata?.gender === 'male'
);
\`\`\`

## Estrutura dos Arquivos Gerados

Após importar "Naruto", você terá:

\`\`\`
data/
└── anime/
    └── naruto/
        ├── info.json        # Informações da obra
        └── characters.json  # Lista de personagens
\`\`\`

### info.json

\`\`\`json
{
  "id": "naruto",
  "type": "anime",
  "title": "Naruto",
  "alt_titles": ["ナルト"],
  "source": "AniList",
  "source_id": 20,
  "description": "...",
  "metadata": {
    "format": "TV",
    "episodes": 220,
    "status": "FINISHED"
  },
  "updated_at": "2025-12-22T..."
}
\`\`\`

### characters.json

\`\`\`json
{
  "work_id": "naruto",
  "count": 245,
  "updated_at": "2025-12-22T...",
  "characters": [
    {
      "id": "uzumaki_naruto",
      "name": "Naruto Uzumaki",
      "role": "protagonist",
      "description": "...",
      "metadata": {
        "gender": "male"
      },
      "images": [...],
      "external_ids": {
        "anilist": 17
      }
    },
    ...
  ]
}
\`\`\`
