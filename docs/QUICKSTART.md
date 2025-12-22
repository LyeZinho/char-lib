# 🚀 Guia de Início Rápido

## Instalação (5 minutos)

\`\`\`bash
# 1. Clone o repositório
git clone https://github.com/LyeZinho/char-lib.git
cd char-lib

# 2. Instale as dependências
npm install

# 3. Teste a instalação
node src/cli.js --version
\`\`\`

## Seu Primeiro Import (2 minutos)

Vamos importar o anime "Naruto" com seus personagens:

\`\`\`bash
node src/cli.js import anime "Naruto" --limit 10
\`\`\`

Isso vai:
1. ✅ Buscar informações do anime no AniList
2. ✅ Coletar os primeiros 10 personagens
3. ✅ Salvar tudo em \`data/anime/naruto/\`

**Tempo estimado:** 10-15 segundos

## Explorando os Dados

### Ver estatísticas

\`\`\`bash
node src/cli.js stats anime naruto
\`\`\`

Saída:
\`\`\`
📊 Estatísticas: Naruto

   ID: naruto
   Tipo: anime
   Total de personagens: 10

   Por role:
     protagonist: 2
     supporting: 5
     minor: 3
\`\`\`

### Buscar personagens

\`\`\`bash
node src/cli.js search "Uzumaki" --type anime --work naruto
\`\`\`

### Validar dados

\`\`\`bash
node src/cli.js validate anime naruto
\`\`\`

### Listar obras importadas

\`\`\`bash
node src/cli.js list
\`\`\`

## Estrutura Criada

Após o import, você terá:

\`\`\`
data/
└── anime/
    └── naruto/
        ├── info.json        # Informações do anime
        └── characters.json  # 10 personagens
\`\`\`

## Próximos Passos

### Importar mais personagens

\`\`\`bash
# Sem limite (todos os personagens)
node src/cli.js import anime "Naruto"
\`\`\`

### Importar outras obras

\`\`\`bash
node src/cli.js import anime "One Piece" --limit 20
node src/cli.js import anime "Death Note"
node src/cli.js import manga "Berserk"
\`\`\`

### Importação em batch

\`\`\`bash
node scripts/batch-import-example.js
\`\`\`

### Uso programático

\`\`\`bash
node scripts/usage-example.js
\`\`\`

### Auto-Crawling (Novo!)

Descubra e importe automaticamente obras populares:

\`\`\`bash
# Crawling automático
npm run crawl

# Ver status e fila
npm run crawl-status

# Listar obras processadas
npm run crawl-list

# Exemplo completo
npm run crawl-example
\`\`\`

## Comandos Essenciais

| Comando | Descrição |
|---------|-----------|
| \`crawl\` | Crawling automático de obras populares |
| \`crawl-status\` | Ver status do crawling |
| \`crawl-list\` | Listar obras processadas |
| \`import anime <nome>\` | Importa um anime específico |
| \`import manga <nome>\` | Importa um manga específico |
| \`stats <tipo> <id>\` | Ver estatísticas |
| \`search <termo>\` | Buscar personagens |
| \`validate <tipo> <id>\` | Validar dados |
| \`list [tipo]\` | Listar obras |

## Opções Úteis

| Opção | Descrição |
|-------|-----------|
| \`--limit <n>\` | Limitar personagens |
| \`--skip-characters\` | Só importar info da obra |
| \`--id <id>\` | Usar ID direto do AniList |
| \`--base-dir <dir>\` | Mudar diretório de dados |

## Exemplos Rápidos

\`\`\`bash
# Crawling automático (10 obras populares)
npm run crawl

# Ver status do que já foi processado
npm run crawl-status

# Import rápido (poucos personagens)
node src/cli.js import anime "Cowboy Bebop" --limit 5

# Import completo
node src/cli.js import anime "Steins;Gate"

# Buscar protagonistas
node src/cli.js search "Okabe" --type anime --work steinsgate --role protagonist

# Ver todas as obras
node src/cli.js list
\`\`\`

## Troubleshooting

### Erro "fetch is not defined"

Você precisa do Node.js ≥ 18. Verifique:

\`\`\`bash
node --version
\`\`\`

### Erro de rate limit

Se receber erro 429, aguarde alguns minutos. O sistema já tem retry automático, mas APIs públicas têm limites.

### Obra não encontrada

Tente com o ID direto:

\`\`\`bash
# Busque o ID no AniList (https://anilist.co)
node src/cli.js import anime "Naruto" --id 20
\`\`\`

## Publicando seus Dados

Depois de coletar dados, você pode publicá-los em um site usando o comando deploy:

\`\`\`bash
# Atualizar a base de dados pública
npm run deploy
\`\`\`

Isso vai:
1. 🗑️ **Remover** dados antigos de \`web/public/data\`
2. 📋 **Copiar** todos os dados de \`data/\` para \`web/public/data\`
3. ✅ **Atualizar** o site com dados frescos

**Para sites:**
- Configure um servidor web servindo a pasta \`web/\`
- Os dados estarão disponíveis em \`/data/\` via HTTP
- Pronto para consumo por aplicações frontend

## Documentação Completa

- [README.md](../README.md) - Visão geral
- [EXAMPLES.md](./EXAMPLES.md) - Exemplos avançados
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Guia para desenvolvedores

## Suporte

- GitHub Issues: https://github.com/LyeZinho/char-lib/issues
- API AniList: https://anilist.gitbook.io/anilist-apiv2-docs/

---

**Pronto para começar!** 🎉

Execute seu primeiro import agora:

\`\`\`bash
node src/cli.js import anime "Naruto" --limit 10
\`\`\`
