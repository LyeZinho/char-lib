# CharLib - Next.js Frontend

Interface web moderna construída com Next.js 16, React 19 e Tailwind CSS para visualizar e explorar a biblioteca de personagens.

## 🚀 Tecnologias

- **Next.js 16** - Framework React com App Router
- **React 19** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS 3** - Estilização
- **API Routes** - Backend integrado no Next.js

## 📁 Estrutura do Projeto

```
web/
├── app/                    # App Router do Next.js
│   ├── api/               # API Routes (Backend)
│   │   ├── works/         # Endpoints de obras
│   │   └── search/        # Endpoint de busca
│   ├── work/              # Páginas de obras e personagens
│   ├── search/            # Página de busca
│   ├── docs/              # Documentação da API
│   ├── layout.tsx         # Layout raiz
│   ├── page.tsx           # Home page
│   └── globals.css        # Estilos globais
├── components/            # Componentes React reutilizáveis
├── public/data/           # Dados JSON (copiados do diretório raiz)
└── next.config.ts         # Configuração do Next.js
```

## 🛠️ Instalação e Uso

### Desenvolvimento

```bash
# Da raiz do projeto char-lib
npm run web:dev
```

Acesse: `http://localhost:3000` (ou a porta disponível)

### Build de Produção

```bash
npm run web:build    # Build para produção
npm run web:start    # Iniciar servidor produção
npm run web:preview  # Build + Start
```

## 🎨 Design

Sistema completo de design com tema escuro, gradientes, hover effects e animações suaves.

## 📡 API Endpoints

- `GET /api/works` - Lista todas as obras
- `GET /api/works/[type]/[workSlug]` - Detalhes de uma obra
- `GET /api/works/[type]/[workSlug]/characters` - Personagens de uma obra
- `GET /api/works/[type]/[workSlug]/characters/[characterId]` - Detalhes de um personagem
- `GET /api/search?q=[query]&type=[works|characters]` - Busca

## 📝 Licença

MIT
