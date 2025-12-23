# 🤖 Sistema de Auto-Crawling

O sistema de auto-crawling permite descobrir e importar automaticamente obras populares do AniList, mantendo um índice de progresso e respeitando limites de API.

## Como Funciona

1. **Descoberta**: Busca as obras mais populares no AniList
2. **Fila**: Mantém uma lista de obras pendentes para processamento
3. **Processamento**: Importa obras uma por vez com delay controlado
4. **Estado**: Salva progresso em `data/crawl-state.json`
5. **Índice**: Mantém registro de todas as obras processadas

## Comandos

### Executar Crawling

```bash
# Crawling básico (10 obras por execução)
npm run crawl

# Personalizar quantidade e limites
node src/cli.js crawl --max-works 5 --character-limit 25 --delay 10000

# Continuar da fila existente
node src/cli.js crawl --continue --max-works 3
```

### Gerenciar Estado

```bash
# Ver status atual
npm run crawl-status

# Listar obras processadas
npm run crawl-list

# Aumentar a fila com mais obras
npm run crawl-grow -- --count 50

# Limpar fila pendente
node src/cli.js crawl-clear
```

### Aumentar Fila

O comando `crawl-grow` permite expandir a fila de obras sem executar o processamento:

```bash
# Adicionar 20 obras populares (padrão)
npm run crawl-grow

# Adicionar 50 obras específicas
node src/cli.js crawl-grow --count 50 --page 2
```

**Como funciona:**
- 🔍 Busca animes populares no AniList (ordenados por popularidade)
- 🚫 Filtra obras já processadas ou já na fila
- ➕ Adiciona apenas obras novas à fila
- 📄 Suporta múltiplas páginas para obter mais obras

### Exemplos

```bash
# Exemplo completo
npm run crawl-example
```

## Arquivo de Estado

O arquivo `data/crawl-state.json` mantém:

```json
{
  "processedWorks": ["16498", "101922", "1535"],
  "queue": [
    {
      "id": 113415,
      "title": "Jujutsu Kaisen",
      "popularity": 838625,
      "score": 84,
      "episodes": 24,
      "status": "FINISHED"
    }
  ],
  "stats": {
    "totalProcessed": 3,
    "totalCharacters": 150,
    "lastRun": "2025-12-22T12:23:50.627Z"
  }
}
```

## Opções de Configuração

| Opção | Padrão | Descrição |
|-------|--------|-----------|
| `--max-works` | 10 | Máximo de obras por execução |
| `--character-limit` | 50 | Limite de personagens por obra |
| `--delay` | 2000 | Delay entre importações (ms) |
| `--continue` | false | Continuar da fila existente |
| `--base-dir` | ./data | Diretório dos dados |
| `--enrich` | false | Quando usado com jogos (`--type game`), tenta buscar personagens via DuckDuckGo/wikis (experimental) |

## Rate Limiting

- **Descoberta**: ~60 req/min (limite do AniList)
- **Importação**: ~60 req/min por obra
- **Delay**: 10 segundos entre importações por padrão
- **Páginas**: 1 segundo entre páginas de personagens

## Estratégia de Descoberta

1. Busca top 20 animes mais populares
2. Filtra obras já processadas
3. Adiciona novas obras à fila
4. Processa em ordem de popularidade

## Casos de Uso

### Construir Database Inicial

```bash
# Importar top 50 obras populares
for i in {1..5}; do
  node src/cli.js crawl --max-works 10 --character-limit 100
  sleep 60  # Esperar rate limit reset
done
```

### Manutenção Contínua

```bash
# Script diário para novas obras
#!/bin/bash
node src/cli.js crawl --max-works 5 --continue
```

### Backup e Restauração

```bash
# Fazer backup do estado
cp data/crawl-state.json backup/

# Restaurar estado
cp backup/crawl-state.json data/
```

## Monitoramento

### Ver Progresso

```bash
# Status detalhado
npm run crawl-status

# Estatísticas gerais
node src/cli.js stats anime $(node src/cli.js crawl-list | grep -o '[0-9]\+' | head -1)
```

### Logs

Os logs mostram:
- 📊 Configuração atual
- 🔍 Número de obras descobertas
- 🚀 Progresso de cada importação
- ⏳ Delays entre importações
- ✅ Relatório final

## Troubleshooting

### Fila Vazia

Se a fila estiver vazia, execute sem `--continue`:

```bash
node src/cli.js crawl  # Descobrirá novas obras
```

### Rate Limit Excedido

Aumente o delay entre importações:

```bash
node src/cli.js crawl --delay 5000 --max-works 3
```

### Estado Corrompido

Recrie o estado:

```bash
rm data/crawl-state.json
node src/cli.js crawl  # Começará do zero
```

## Extensões Futuras

- **Filtros**: Por gênero, ano, status
- **Priorização**: Baseada em score/popularidade
- **Agendamento**: Execução automática periódica
- **Múltiplas fontes**: Suporte a MAL, IGDB
- **Paralelização**: Múltiplos workers
- **Webhooks**: Notificações de progresso