# Guia de Importação de Jogos

## 🎮 Visão Geral

**ATENÇÃO: Jogos não são suportados por enquanto no sistema de autocrawling.**

O char-lib suporta importação manual de jogos usando a **RAWG Video Games Database API**, mas apenas para importação individual. O sistema de autocrawling não funciona com jogos porque a API RAWG não fornece dados de **personagens fictícios** de jogos.

## 🔑 Configuração

### Obter Chave da API RAWG

1. Acesse: https://rawg.io/apidocs
2. Crie uma conta gratuita
3. Gere sua chave de API

### Configurar a Chave

```bash
# Opção 1: Variável de ambiente
export RAWG_API_KEY="sua-chave-aqui"

# Opção 2: Arquivo .env (recomendado)
echo "RAWG_API_KEY=sua-chave-aqui" > .env
```

## 📖 Exemplos de Uso

### ℹ️ Limitação Importante

**RAWG não oferece personagens fictícios de jogos.** Quando você importa um jogo, o sistema coleta **criadores e desenvolvedores** (pessoas reais que trabalharam no jogo), não personagens fictícios como Geralt, Master Chief, etc.

### Importação Manual (funciona)

```bash
# Importar um jogo específico
node src/cli.js import game "The Witcher 3"

# Ver criadores/desenvolvedores coletados
node src/cli.js list game
```

### ❌ Autocrawling (não funciona)

```bash
# ISSO NÃO FUNCIONA - jogos não são suportados no autocrawl
node src/cli.js crawl --type game
# Erro: Jogos não são suportados por enquanto (RAWG não oferece personagens fictícios)
```

## 🚀 Futuro

Para implementar suporte completo a jogos, seria necessário:
- Encontrar uma API que forneça personagens fictícios de jogos
- Ou implementar web scraping de wikis de jogos
- Ou criar uma base de dados própria de personagens de jogos

Se você conhece alguma API ou fonte de dados que forneça personagens fictícios de jogos, por favor contribua!

## 🎯 Exemplos Práticos

### Jogos Populares

```bash
# RPGs
node src/cli.js import game "The Witcher 3 Wild Hunt"
node src/cli.js import game "Elden Ring"
node src/cli.js import game "Final Fantasy VII Remake"

# Ação/Aventura
node src/cli.js import game "The Last of Us"
node src/cli.js import game "God of War"
node src/cli.js import game "Red Dead Redemption 2"

# Indie
node src/cli.js import game "Hollow Knight"
node src/cli.js import game "Celeste"
node src/cli.js import game "Hades"
```

### Buscar por ID

Se você conhece o ID da RAWG (encontrado na URL do jogo no site):

```bash
# The Witcher 3 (ID: 3328)
node src/cli.js import game --id 3328

# GTA V (ID: 3498)
node src/cli.js import game --id 3498

# Minecraft (ID: 22509)
node src/cli.js import game --id 22509
```

## 📊 Estrutura dos Dados

### info.json (Informações do Jogo)

```json
{
  "id": "the-witcher-3-wild-hunt",
  "type": "game",
  "title": "The Witcher 3: Wild Hunt",
  "alt_titles": [],
  "source": "RAWG",
  "source_id": "3328",
  "description": "As a witcher, Geralt...",
  "metadata": {
    "released": "2015-05-18",
    "rating": 4.67,
    "metacritic": 92,
    "genres": ["Action", "RPG"],
    "platforms": ["PC", "PlayStation 4", "Xbox One", "Nintendo Switch"],
    "developers": ["CD PROJEKT RED"],
    "publishers": ["CD PROJEKT RED"],
    "esrb_rating": "Mature",
    "playtime": 46,
    "achievements_count": 78
  },
  "images": [...],
  "external_ids": {
    "rawg": 3328,
    "rawg_slug": "the-witcher-3-wild-hunt"
  }
}
```

### characters.json (Criadores/Desenvolvedores)

```json
{
  "work_id": "the-witcher-3-wild-hunt",
  "count": 15,
  "characters": [
    {
      "id": "andrzej-sapkowski-12345",
      "name": "Andrzej Sapkowski",
      "role": "protagonist",
      "description": "Original Author, Writer",
      "metadata": {
        "games_count": 8,
        "positions": ["Original Author", "Writer"]
      },
      "external_ids": {
        "rawg": 12345
      }
    }
  ]
}
```

## 🔍 Diferenças em Relação a Anime/Manga

### "Personagens" vs "Criadores"

Para jogos, o conceito de "personagens" é adaptado para incluir:
- **Criadores originais** (autores, escritores)
- **Diretores e produtores**
- **Designers principais**
- **Membros importantes da equipe de desenvolvimento**

### Roles Mapeados

- `protagonist` - Criadores originais, diretores
- `supporting` - Produtores, designers
- `other` - Outros membros da equipe

## ⚙️ Configuração Programática

### Exemplo de Script

```javascript
import { createImportJob } from './src/jobs/importWork.js';

const job = createImportJob({
  baseDir: './data',
  type: 'game' // Auto-detecta RAWG como fonte
});

const result = await job.import(
  { search: 'The Witcher 3' },
  { characterLimit: 20 }
);

console.log(`Importado: ${result.work.title}`);
console.log(`Criadores: ${result.characters.total}`);
```

## 🚀 Futuras Expansões

A arquitetura está preparada para suportar outras fontes:

```javascript
// Preparado para desenhos animados
node src/cli.js import cartoon "Avatar The Last Airbender"

// Preparado para quadrinhos
node src/cli.js import comic "Spider-Man"

// Preparado para livros
node src/cli.js import book "Harry Potter"
```

## ❓ Troubleshooting

### Erro: "RAWG_API_KEY não configurada"

```bash
# Configure a variável de ambiente
export RAWG_API_KEY="sua-chave"

# Ou verifique se o .env existe
cat .env
```

### Erro: Rate limit excedido

A RAWG tem limite de ~20 requisições por minuto na versão gratuita. O sistema automaticamente respeita esse limite, mas se você atingir, aguarde um minuto.

### Jogo não encontrado

Tente buscar no site da RAWG primeiro e use o ID ou slug:

```bash
# Busque em: https://rawg.io/games
# Use o slug da URL
node src/cli.js import game --slug nome-do-jogo-na-url
```

## 📚 Recursos

- **RAWG API Docs**: https://rawg.io/apidocs
- **Database RAWG**: https://rawg.io/games
- **GitHub do Projeto**: https://github.com/LyeZinho/char-lib
