# API - Endpoints públicos

Este documento descreve os endpoints HTTP expostos pelo frontend (rotas Next.js) que leem os dados estáticos gerados em `public/data`.

Base: `/api`

Endpoints principais:

- `GET /api/works` — Lista todas as obras (anime, manga, game)
  - Retorna um array com objetos de obras. Cada obra contém `id`, `slug`, `type`, `title`, `images`, `metadata`.

- `GET /api/works/:type/:workSlug` — Detalhes da obra
  - Parâmetros: `type` (anime|manga|game), `workSlug` (slug da obra)
  - Retorna o arquivo `info.json` para a obra (metadados, descrição, imagens, etc.).

- `GET /api/works/:type/:workSlug/characters` — Lista de personagens da obra
  - Retorna a lista de personagens (lê `characters.json`). Aceita tanto `{ characters: [...] }` quanto `[...]`.

- `GET /api/works/:type/:workSlug/character/:charId` — Personagem específico
  - Parâmetros: `charId` (campo `id` ou `slug` do personagem)
  - Retorna o objeto do personagem ou 404 se não encontrar.

- `GET /api/search?q=<query>&type=works|characters` — Busca por obras ou personagens
  - `type=works`: pesquisa nos índices `public/data/{type}/index.json` por título ou `alt_titles`.
  - `type=characters`: pesquisa em `characters.json` dentro de cada obra; retorna personagens com campo `work` descrevendo a obra associada.

- `GET /api/database-stats` — Estatísticas geradas (arquivo `database-stats.json`).

Exemplos de uso (curl):

```bash
# Listar obras
curl -s http://localhost:3000/api/works | jq

# Obter detalhe de uma obra
curl -s http://localhost:3000/api/works/game/nierautomata | jq

# Listar personagens de uma obra
curl -s http://localhost:3000/api/works/game/nierautomata/characters | jq

# Buscar personagem específico
curl -s http://localhost:3000/api/works/game/nierautomata/character/2b | jq

# Buscar por nome
curl -s "http://localhost:3000/api/search?q=2B&type=characters" | jq
```

Observações:
- As rotas leem diretamente de `public/data`. Antes de consultar, rode o processo de importação/crawling para popular os arquivos JSON.
- Os endpoints são simples e destinados a servir uma SPA estática sem necessidade de um backend dinâmico.
