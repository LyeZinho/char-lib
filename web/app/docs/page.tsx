'use client';

import { useState, useEffect } from 'react';

interface ApiResponse {
  data: any;
  status: number;
  loading: boolean;
  error: string | null;
}

interface DatabaseStats {
  total_works: number;
  total_characters: number;
  types: {
    anime: { works_count: number; characters_count: number };
    manga: { works_count: number; characters_count: number };
    game: { works_count: number; characters_count: number };
  };
  database_info: {
    total_file_size: number;
    average_characters_per_work: number;
    first_import: string;
    last_import: string;
  };
  last_updated: string;
}

export default function DocsPage() {
  const [responses, setResponses] = useState<Record<string, ApiResponse>>({});
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      const response = await fetch('/api/database-stats');
      if (response.ok) {
        const stats = await response.json();
        setDatabaseStats(stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const testEndpoint = async (endpoint: string, url: string) => {
    setResponses(prev => ({
      ...prev,
      [endpoint]: { data: null, status: 0, loading: true, error: null }
    }));

    try {
      const response = await fetch(url);
      const data = await response.json();

      setResponses(prev => ({
        ...prev,
        [endpoint]: {
          data,
          status: response.status,
          loading: false,
          error: null
        }
      }));
    } catch (error) {
      setResponses(prev => ({
        ...prev,
        [endpoint]: {
          data: null,
          status: 0,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      }));
    }
  };

  const renderResponse = (endpoint: string) => {
    const response = responses[endpoint];
    if (!response) return null;

    return (
      <div className="mt-4 border-t border-dark-border pt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">Status:</span>
          <span className={`px-2 py-1 rounded text-xs font-mono ${
            response.status === 200 ? 'bg-accent-success/20 text-accent-success' :
            response.status >= 400 ? 'bg-accent-danger/20 text-accent-danger' :
            'bg-gray-600 text-gray-300'
          }`}>
            {response.status || 'ERROR'}
          </span>
          {response.loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-primary border-t-transparent"></div>
          )}
        </div>

        {response.error && (
          <div className="bg-accent-danger/10 border border-accent-danger/30 rounded p-3 mb-3">
            <p className="text-accent-danger text-sm">{response.error}</p>
          </div>
        )}

        {response.data && (
          <div className="bg-dark-bg rounded p-4">
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-dark-surface">
              <pre className="text-xs text-gray-300">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-right">
              Role para ver mais conteúdo
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
          📚 Documentação da API
        </h1>
        <p className="text-gray-300 text-lg">
          Teste interativamente todos os endpoints da API CharLib. Clique nos botões "Testar" para executar as requisições em tempo real.
        </p>
      </div>



      {/* Database Metadata */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          📊 <span>Metadados da Database</span>
        </h2>

        {statsLoading ? (
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-dark-border rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-dark-border rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : databaseStats ? (
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-primary">
                  {databaseStats.total_works.toLocaleString('pt-BR')}
                </div>
                <div className="text-sm text-gray-400">Obras Totais</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-secondary">
                  {databaseStats.total_characters.toLocaleString('pt-BR')}
                </div>
                <div className="text-sm text-gray-400">Personagens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-success">
                  {((databaseStats.database_info?.total_file_size || 0) / 1024 / 1024).toFixed(1)} MB
                </div>
                <div className="text-sm text-gray-400">Tamanho DB</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-warning">
                  {databaseStats.database_info?.average_characters_per_work || 0}
                </div>
                <div className="text-sm text-gray-400">Chars/Obra</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-accent-primary">📺 Por Tipo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Anime:</span>
                    <span className="text-accent-primary font-medium">
                      {databaseStats.types?.anime?.works_count || 0} obras, {databaseStats.types?.anime?.characters_count || 0} chars
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Mangá:</span>
                    <span className="text-accent-secondary font-medium">
                      {databaseStats.types?.manga?.works_count || 0} obras, {databaseStats.types?.manga?.characters_count || 0} chars
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Games:</span>
                    <span className="text-accent-success font-medium">
                      {databaseStats.types?.game?.works_count || 0} obras, {databaseStats.types?.game?.characters_count || 0} chars
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-accent-secondary">📅 Atualizações</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Primeiro import:</span>
                    <span className="text-gray-300">
                      {databaseStats.database_info?.first_import ? new Date(databaseStats.database_info.first_import).toLocaleDateString('pt-BR') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Último import:</span>
                    <span className="text-gray-300">
                      {databaseStats.database_info?.last_import ? new Date(databaseStats.database_info.last_import).toLocaleDateString('pt-BR') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-accent-warning">💾 Armazenamento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total:</span>
                    <span className="text-gray-300">
                      {((databaseStats.database_info?.total_file_size || 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Média/obra:</span>
                    <span className="text-gray-300">
                      {databaseStats.database_info?.total_file_size && databaseStats.total_works ?
                        ((databaseStats.database_info.total_file_size / databaseStats.total_works) / 1024).toFixed(1) + ' KB' :
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-accent-success font-medium">Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-center">
            <p className="text-gray-400">Não foi possível carregar os metadados da database</p>
          </div>
        )}
      </section>

      {/* Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">🔗 Endpoints Disponíveis</h2>
        
        <div className="mb-6 bg-accent-primary/10 border border-accent-primary/30 rounded-lg p-4">
          <p className="text-gray-300 text-sm">
            <strong className="text-accent-primary">Base URL:</strong> <code className="text-accent-primary">{typeof window !== 'undefined' ? window.location.origin : 'https://charlib.vercel.app'}</code>
          </p>
          <p className="text-gray-300 text-sm mt-2">
            Todos os endpoints retornam JSON. Clique em "🧪 Testar" para executar requisições ao vivo.
          </p>
        </div>

        {/* Navegação rápida */}
        <div className="mb-8 bg-dark-card border border-dark-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">⚡ Navegação Rápida</h3>
          <div className="grid md:grid-cols-4 gap-2 text-sm">
            <a href="#obras" className="text-accent-primary hover:underline">📚 Obras</a>
            <a href="#personagens-obra" className="text-accent-primary hover:underline">👥 Personagens por Obra</a>
            <a href="#busca-simples" className="text-accent-primary hover:underline">🔍 Busca Simples</a>
            <a href="#busca-fuzzy" className="text-accent-success hover:underline">⚡ Busca Fuzzy</a>
            <a href="#random" className="text-accent-warning hover:underline">🎲 Aleatórios</a>
            <a href="#ranking" className="text-yellow-400 hover:underline">🏆 Ranking</a>
            <a href="#stats" className="text-accent-secondary hover:underline">📊 Estatísticas</a>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* SEÇÃO: OBRAS */}
          <div id="obras" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-4 text-accent-primary">📚 Endpoints de Obras</h3>
          {/* GET /api/works */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary font-semibold">/api/works</code>
              </div>
              <button
                onClick={() => testEndpoint('works', '/api/works')}
                disabled={responses['works']?.loading}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['works']?.loading ? 'Testando...' : '🧪 Testar'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">
              <strong>Descrição:</strong> Retorna lista completa de todas as obras disponíveis no banco de dados (anime, manga e games).
            </p>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">RESPONSE (200 OK):</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`[
  {
    "id": "naruto",
    "slug": "naruto",
    "type": "anime",
    "title": "Naruto",
    "cover_image": "https://...",
    "genres": ["Action", "Adventure"],
    "average_score": 82,
    "metadata": { ... }
  },
  ...
]`}</code>
              </pre>
            </div>
            <div className="text-xs text-gray-400">
              <p><strong>Use case:</strong> Listar obras na página inicial, filtros, dropdowns</p>
            </div>
            {renderResponse('works')}
          </div>

          {/* GET /api/works/[type]/[slug] */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary font-semibold">/api/works/<span className="text-accent-secondary">{'{type}'}</span>/<span className="text-accent-secondary">{'{workSlug}'}</span></code>
              </div>
              <button
                onClick={() => testEndpoint('work-detail', '/api/works/anime/naruto')}
                disabled={responses['work-detail']?.loading}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['work-detail']?.loading ? 'Testando...' : '🧪 Testar (Naruto)'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">
              <strong>Descrição:</strong> Retorna informações detalhadas de uma obra específica incluindo metadados, descrição, imagens, gêneros e scores.
            </p>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-1"><strong>Path Parameters:</strong></p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• <code className="text-accent-secondary">type</code>: <code className="text-gray-400">anime</code> | <code className="text-gray-400">manga</code> | <code className="text-gray-400">game</code></li>
                <li>• <code className="text-accent-secondary">workSlug</code>: identificador único da obra (ex: <code className="text-gray-400">naruto</code>, <code className="text-gray-400">one-piece</code>)</li>
              </ul>
            </div>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">EXEMPLO:</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`fetch('/api/works/anime/naruto')
  .then(res => res.json())
  .then(data => console.log(data));

// RESPONSE (200 OK):
{
  "id": "naruto",
  "slug": "naruto",
  "type": "anime",
  "title": "Naruto",
  "description": "Naruto Uzumaki, a mischievous...",
  "cover_image": "https://...",
  "genres": ["Action", "Adventure", "Martial Arts"],
  "average_score": 82,
  "popularity_rank": 5,
  "metadata": {
    "mal_id": 20,
    "episodes": 220,
    "status": "Finished Airing",
    "aired": { ... }
  }
}`}</code>
              </pre>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p><strong>Status codes:</strong></p>
              <p>• <code className="text-accent-success">200</code> - Obra encontrada</p>
              <p>• <code className="text-accent-danger">404</code> - Obra não encontrada</p>
            </div>
            {renderResponse('work-detail')}
          </div>

          </div>

          {/* SEÇÃO: PERSONAGENS POR OBRA */}
          <div id="personagens-obra" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-4 text-accent-primary">👥 Personagens por Obra</h3>

          {/* GET /api/works/[type]/[slug]/characters */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary font-semibold">/api/works/<span className="text-accent-secondary">{'{type}'}</span>/<span className="text-accent-secondary">{'{workSlug}'}</span>/characters</code>
              </div>
              <button
                onClick={() => testEndpoint('work-characters', '/api/works/anime/naruto/characters')}
                disabled={responses['work-characters']?.loading}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['work-characters']?.loading ? 'Testando...' : '🧪 Testar (Naruto)'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">
              <strong>Descrição:</strong> Lista todos os personagens pertencentes a uma obra específica.
            </p>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-1"><strong>Path Parameters:</strong></p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• <code className="text-accent-secondary">type</code>, <code className="text-accent-secondary">workSlug</code>: mesmos parâmetros do endpoint anterior</li>
              </ul>
            </div>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">RESPONSE (200 OK):</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`[
  {
    "id": "naruto-uzumaki",
    "slug": "naruto-uzumaki",
    "name": "Naruto Uzumaki",
    "alt_names": ["うずまき ナルト", "Uzumaki Naruto"],
    "role": "protagonist",
    "images": [
      { "type": "cover", "url": "https://..." }
    ],
    "description": "...",
    "metadata": { ... }
  },
  ...
]`}</code>
              </pre>
            </div>
            <div className="text-xs text-gray-400">
              <p><strong>Use case:</strong> Exibir galeria de personagens em página de obra</p>
            </div>
            {renderResponse('work-characters')}
          </div>

          {/* GET /api/works/[type]/[slug]/characters/[characterId] */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary font-semibold">/api/works/<span className="text-accent-secondary">{'{type}'}</span>/<span className="text-accent-secondary">{'{workSlug}'}</span>/characters/<span className="text-accent-secondary">{'{characterId}'}</span></code>
              </div>
              <button
                onClick={() => testEndpoint('character-detail', '/api/works/anime/naruto/characters/naruto-uzumaki')}
                disabled={responses['character-detail']?.loading}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['character-detail']?.loading ? 'Testando...' : '🧪 Testar (Naruto)'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">
              <strong>Descrição:</strong> Retorna informações detalhadas de um personagem específico.
            </p>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-1"><strong>Path Parameters:</strong></p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• <code className="text-accent-secondary">characterId</code>: ID ou slug do personagem</li>
              </ul>
            </div>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">RESPONSE (200 OK):</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`{
  "id": "naruto-uzumaki",
  "slug": "naruto-uzumaki",
  "name": "Naruto Uzumaki",
  "alt_names": ["うずまき ナルト"],
  "role": "protagonist",
  "description": "Naruto is a young ninja...",
  "images": [
    {
      "type": "cover",
      "url": "https://cdn.myanimelist.net/...",
      "width": 225,
      "height": 350
    }
  ],
  "metadata": {
    "age": "16",
    "birthday": "October 10",
    "height": "166 cm"
  }
}`}</code>
              </pre>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p><strong>Status codes:</strong></p>
              <p>• <code className="text-accent-success">200</code> - Personagem encontrado</p>
              <p>• <code className="text-accent-danger">404</code> - Personagem não encontrado</p>
            </div>
            {renderResponse('character-detail')}
          </div>

          </div>

          {/* SEÇÃO: BUSCA */}
          <div id="busca-simples" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-4 text-accent-primary">🔍 Busca Simples</h3>

          {/* GET /api/search */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary font-semibold">/api/search</code>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testEndpoint('search', '/api/search?q=naruto&type=works')}
                  disabled={responses['search']?.loading}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {responses['search']?.loading ? 'Testando...' : '🧪 Obras'}
                </button>
                <button
                  onClick={() => testEndpoint('search-custom', '/api/search?q=luffy&type=characters')}
                  disabled={responses['search-custom']?.loading}
                  className="px-4 py-2 bg-accent-secondary hover:bg-accent-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {responses['search-custom']?.loading ? 'Testando...' : '🧪 Chars'}
                </button>
              </div>
            </div>
            <p className="text-gray-300 mb-3">
              <strong>Descrição:</strong> Busca simples por substring exata em obras ou personagens. Usa <code className="text-accent-warning">.includes()</code> para match.
            </p>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-1"><strong>Query Parameters:</strong></p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• <code className="text-accent-secondary">q</code> <span className="text-accent-danger">*obrigatório</span>: termo de busca</li>
                <li>• <code className="text-accent-secondary">type</code>: <code className="text-gray-400">works</code> | <code className="text-gray-400">characters</code> (padrão: works)</li>
              </ul>
            </div>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">EXEMPLOS:</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`// Buscar obras
fetch('/api/search?q=naruto&type=works')

// Buscar personagens  
fetch('/api/search?q=luffy&type=characters')
  .then(res => res.json())
  .then(chars => {
    chars.forEach(c => {
      console.log(\`\${c.name} de \${c.work.title}\`);
    });
  });`}</code>
              </pre>
            </div>
            <div className="bg-accent-warning/10 border border-accent-warning/30 rounded p-3 mb-3">
              <p className="text-accent-warning text-sm">
                <strong>⚠️ Limitação:</strong> Busca exata (case-insensitive). Não tolera erros ortográficos. 
                Para busca inteligente, use <a href="#busca-fuzzy" className="underline">/api/characters/search</a>.
              </p>
            </div>
            {renderResponse('search')}
            {renderResponse('search-custom')}
          </div>

          </div>

          {/* SEÇÃO: BUSCA FUZZY */}
          <div id="busca-fuzzy" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-4 text-accent-success">⚡ Busca Fuzzy (Inteligente)</h3>

          {/* GET /api/characters/search - FUZZY SEARCH */}
          <div className="bg-dark-card border border-accent-success/50 rounded-lg p-6 hover:border-accent-success transition-colors shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-success font-semibold text-lg">/api/characters/search</code>
                <span className="px-2 py-1 bg-accent-warning/20 text-accent-warning text-xs rounded font-semibold">⚡ FUZZY</span>
                <span className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded font-semibold">⭐ RECOMENDADO</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testEndpoint('char-search-1', '/api/characters/search?q=naruto&limit=5')}
                  disabled={responses['char-search-1']?.loading}
                  className="px-4 py-2 bg-accent-success hover:bg-accent-success/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {responses['char-search-1']?.loading ? 'Testando...' : '🧪 Naruto'}
                </button>
                <button
                  onClick={() => testEndpoint('char-search-2', '/api/characters/search?q=goko&limit=5')}
                  disabled={responses['char-search-2']?.loading}
                  className="px-4 py-2 bg-accent-warning hover:bg-accent-warning/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {responses['char-search-2']?.loading ? 'Testando...' : '🧪 "Goko" (typo)'}
                </button>
              </div>
            </div>
            <p className="text-gray-300 mb-4 text-lg">
              <strong>🎯 Busca inteligente de personagens</strong> com tolerância a erros ortográficos, nomes parciais, variações e acentos.
              Usa o algoritmo de <strong>Levenshtein</strong> para calcular similaridade e retornar os melhores matches.
            </p>
            
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2"><strong>Query Parameters:</strong></p>
              <ul className="text-sm text-gray-300 space-y-2 ml-4">
                <li>• <code className="text-accent-success">q</code> <span className="text-accent-danger">*obrigatório</span>: termo de busca (mínimo 2 caracteres)</li>
                <li>• <code className="text-accent-success">type</code> <em className="text-gray-500">(opcional)</em>: <code className="text-gray-400">anime</code> | <code className="text-gray-400">manga</code> | <code className="text-gray-400">game</code></li>
                <li>• <code className="text-accent-success">limit</code> <em className="text-gray-500">(opcional)</em>: max resultados (padrão: 20, máx: 100)</li>
                <li>• <code className="text-accent-success">threshold</code> <em className="text-gray-500">(opcional)</em>: similaridade mínima 0-1 (padrão: 0.4)</li>
              </ul>
            </div>

            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">EXEMPLOS:</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`// Busca básica
fetch('/api/characters/search?q=goku&limit=10')
  .then(res => res.json())
  .then(data => {
    console.log(\`Encontrados: \${data.total} personagens\`);
    data.results.forEach(char => {
      console.log(\`\${char.name} - Score: \${char._searchScore.toFixed(2)}\`);
      console.log(\`  Obra: \${char.work.title} (\${char.work.type})\`);
      console.log(\`  Match: \${char._matchType}\`);
    });
  });

// Com typo → ainda funciona!
fetch('/api/characters/search?q=goko&limit=5')
// Retorna "Goku" com score alto

// Filtrar por tipo
fetch('/api/characters/search?q=naruto&type=anime')

// Busca rigorosa (threshold alto)
fetch('/api/characters/search?q=edward&threshold=0.7')

// Nome parcial
fetch('/api/characters/search?q=uzumaki')
// Retorna "Naruto Uzumaki", "Kushina Uzumaki", etc.`}</code>
              </pre>
            </div>

            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">RESPONSE STRUCTURE:</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`{
  "query": "goko",
  "total": 3,
  "threshold": 0.4,
  "results": [
    {
      "id": "goku",
      "name": "Son Goku",
      "alt_names": ["孫悟空", "Kakarot"],
      "role": "protagonist",
      "images": [...],
      "work": {
        "id": "dragon-ball",
        "slug": "dragon-ball",
        "type": "anime",
        "title": "Dragon Ball",
        "cover_image": "https://..."
      },
      "_searchScore": 0.92,
      "_matchType": "fuzzy"
    },
    ...
  ]
}`}</code>
              </pre>
            </div>

            <div className="bg-accent-success/10 border border-accent-success/30 rounded p-4 mb-3">
              <p className="text-accent-success text-sm font-medium mb-2">✨ Funcionalidades:</p>
              <div className="grid md:grid-cols-2 gap-2 text-gray-300 text-sm">
                <div>
                  <p className="font-semibold mb-1">Tipos de Match:</p>
                  <ul className="ml-4 space-y-1">
                    <li>• <strong>exact</strong>: match perfeito (score 1.0)</li>
                    <li>• <strong>contains</strong>: substring (score 0.95)</li>
                    <li>• <strong>startsWith</strong>: começa com (score 0.9)</li>
                    <li>• <strong>partialWord</strong>: palavra parcial</li>
                    <li>• <strong>fuzzy</strong>: similaridade Levenshtein</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-1">Tolerância:</p>
                  <ul className="ml-4 space-y-1">
                    <li>• Erros ortográficos</li>
                    <li>• Acentos e caracteres especiais</li>
                    <li>• Maiúsculas/minúsculas</li>
                    <li>• Ordem de palavras</li>
                    <li>• Nomes alternativos (alt_names)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p><strong>Use cases:</strong></p>
              <p>• Barra de busca com autocompletar</p>
              <p>• "Você quis dizer..." (sugestões)</p>
              <p>• Busca por nome parcial (primeiro/último nome)</p>
              <p>• Correção automática de typos</p>
            </div>

            {renderResponse('char-search-1')}
            {renderResponse('char-search-2')}
          </div>

          </div>

          {/* SEÇÃO: RANDOM */}
          <div id="random" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-4 text-accent-warning">🎲 Personagens Aleatórios</h3>

          {/* GET /api/characters/random */}
          <div className="bg-dark-card border border-accent-warning/50 rounded-lg p-6 hover:border-accent-warning transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-warning rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-warning font-semibold">/api/characters/random</code>
                <span className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded font-semibold">🎲 RANDOM</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testEndpoint('random-1', '/api/characters/random?n=3')}
                  disabled={responses['random-1']?.loading}
                  className="px-4 py-2 bg-accent-warning hover:bg-accent-warning/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {responses['random-1']?.loading ? 'Testando...' : '🎲 3 Aleatórios'}
                </button>
                <button
                  onClick={() => testEndpoint('random-2', '/api/characters/random?type=anime&n=5')}
                  disabled={responses['random-2']?.loading}
                  className="px-4 py-2 bg-accent-secondary hover:bg-accent-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {responses['random-2']?.loading ? 'Testando...' : '🎲 5 Anime'}
                </button>
              </div>
            </div>
            <p className="text-gray-300 mb-3">
              <strong>Descrição:</strong> Retorna personagens aleatórios da database. Perfeito para descoberta, features de "personagem do dia" ou recomendações surpresa.
            </p>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-1"><strong>Query Parameters:</strong></p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• <code className="text-accent-warning">n</code> <em className="text-gray-500">(opcional)</em>: quantidade (padrão: 1, máx: 50)</li>
                <li>• <code className="text-accent-warning">type</code> <em className="text-gray-500">(opcional)</em>: <code className="text-gray-400">anime</code> | <code className="text-gray-400">manga</code> | <code className="text-gray-400">game</code></li>
                <li>• <code className="text-accent-warning">workType</code> + <code className="text-accent-warning">work</code> <em className="text-gray-500">(opcional)</em>: filtrar por obra específica</li>
              </ul>
            </div>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">EXEMPLOS:</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`// Um personagem aleatório de qualquer tipo
fetch('/api/characters/random')

// 5 personagens aleatórios de anime
fetch('/api/characters/random?type=anime&n=5')

// 10 personagens de games
fetch('/api/characters/random?type=game&n=10')

// 3 personagens de uma obra específica
fetch('/api/characters/random?workType=anime&work=naruto&n=3')

// RESPONSE:
{
  "count": 3,
  "characters": [
    {
      "id": "...",
      "name": "...",
      "images": [...],
      "work": {
        "type": "anime",
        "slug": "naruto"
      }
    },
    ...
  ]
}`}</code>
              </pre>
            </div>
            <div className="bg-accent-warning/10 border border-accent-warning/30 rounded p-3 mb-3">
              <p className="text-accent-warning text-sm font-medium mb-2">💡 Use Cases:</p>
              <ul className="text-gray-300 text-sm space-y-1 ml-4">
                <li>• "Personagem do dia" na homepage</li>
                <li>• Carrossel de descoberta de personagens</li>
                <li>• Recomendações aleatórias</li>
                <li>• Easter eggs / surpresas</li>
                <li>• Placeholders para mockups</li>
              </ul>
            </div>
            {renderResponse('random-1')}
            {renderResponse('random-2')}
          </div>

          </div>

          {/* SEÇÃO: RANKING */}
          <div id="ranking" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-4 text-yellow-400">🏆 Ranking de Personagens</h3>

          {/* GET /api/ranking */}
          <div className="bg-dark-card border border-yellow-400/30 rounded-lg p-6 hover:border-yellow-400/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-yellow-400 font-semibold">/api/ranking</code>
                <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs rounded font-semibold">🏆 RANKING</span>
              </div>
              <button
                onClick={() => testEndpoint('ranking', '/api/ranking?page=1&limit=10')}
                disabled={responses['ranking']?.loading}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-black transition-colors"
              >
                {responses['ranking']?.loading ? 'Testando...' : '🧪 Testar'}
              </button>
            </div>
            <p className="text-gray-300 mb-4">
              <strong>Descrição:</strong> Retorna o ranking global de personagens ordenado por score. 
              O score é calculado com base na popularidade da obra (40%), score médio (30%) e papel do personagem (30%).
            </p>

            <div className="mb-4 bg-dark-bg rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-3 font-semibold">📌 PARÂMETROS DE QUERY:</p>
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-dark-surface rounded text-yellow-400 text-xs">page</code>
                  <div>
                    <span className="text-gray-400">Número da página (padrão: 1)</span>
                    <div className="text-xs text-gray-500 mt-1">Ex: <code>?page=2</code></div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-dark-surface rounded text-yellow-400 text-xs">limit</code>
                  <div>
                    <span className="text-gray-400">Personagens por página (padrão: 50)</span>
                    <div className="text-xs text-gray-500 mt-1">Ex: <code>?limit=100</code></div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-dark-surface rounded text-yellow-400 text-xs">rarity</code>
                  <div>
                    <span className="text-gray-400">Filtrar por raridade</span>
                    <div className="text-xs text-gray-500 mt-1">Valores: <code>legendary</code>, <code>epic</code>, <code>rare</code>, <code>uncommon</code>, <code>common</code></div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-dark-surface rounded text-yellow-400 text-xs">type</code>
                  <div>
                    <span className="text-gray-400">Filtrar por tipo de obra</span>
                    <div className="text-xs text-gray-500 mt-1">Valores: <code>anime</code>, <code>manga</code>, <code>game</code></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">💎 SISTEMA DE RARIDADES:</p>
              <div className="grid grid-cols-5 gap-2 text-center text-xs mb-4">
                <div className="p-2 rounded bg-yellow-400/10 border border-yellow-400">
                  <span className="text-lg">⭐</span>
                  <div className="text-yellow-400 font-bold">Lendário</div>
                  <div className="text-gray-500">Top 5%</div>
                </div>
                <div className="p-2 rounded bg-purple-400/10 border border-purple-400">
                  <span className="text-lg">💎</span>
                  <div className="text-purple-400 font-bold">Épico</div>
                  <div className="text-gray-500">Top 20%</div>
                </div>
                <div className="p-2 rounded bg-blue-400/10 border border-blue-400">
                  <span className="text-lg">💠</span>
                  <div className="text-blue-400 font-bold">Raro</div>
                  <div className="text-gray-500">Top 45%</div>
                </div>
                <div className="p-2 rounded bg-green-400/10 border border-green-400">
                  <span className="text-lg">🔹</span>
                  <div className="text-green-400 font-bold">Incomum</div>
                  <div className="text-gray-500">Top 70%</div>
                </div>
                <div className="p-2 rounded bg-gray-400/10 border border-gray-500">
                  <span className="text-lg">○</span>
                  <div className="text-gray-400 font-bold">Comum</div>
                  <div className="text-gray-500">Resto</div>
                </div>
              </div>
            </div>

            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">RESPONSE STRUCTURE:</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`{
  "generated_at": "2025-12-28T...",
  "total_characters": 18610,
  "distribution": {
    "legendary": 930,
    "epic": 3722,
    "rare": 4651,
    "uncommon": 4651,
    "common": 4656
  },
  "page": 1,
  "limit": 50,
  "total_pages": 373,
  "characters": [
    {
      "rank": 1,
      "id": "eren-yeager",
      "name": "Eren Yeager",
      "workId": "attack-on-titan",
      "workTitle": "Attack on Titan",
      "workType": "anime",
      "role": "protagonist",
      "score": 97.21,
      "rarity": "legendary",
      "image": "https://..."
    }
  ]
}`}</code>
              </pre>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-dark-bg rounded p-4">
                <p className="text-xs text-gray-400 mb-2 font-semibold">📝 EXEMPLOS DE USO:</p>
                <div className="space-y-2 text-sm">
                  <p><code className="text-yellow-400">/api/ranking</code></p>
                  <p className="text-gray-500 text-xs">Top 50 personagens</p>
                  
                  <p className="mt-2"><code className="text-yellow-400">/api/ranking?rarity=legendary&limit=100</code></p>
                  <p className="text-gray-500 text-xs">Todos lendários (100 por página)</p>
                  
                  <p className="mt-2"><code className="text-yellow-400">/api/ranking?type=anime&page=2</code></p>
                  <p className="text-gray-500 text-xs">Ranking só de anime, página 2</p>
                </div>
              </div>
              <div className="bg-dark-bg rounded p-4">
                <p className="text-xs text-gray-400 mb-2 font-semibold">📐 FÓRMULA DO SCORE:</p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Score =</strong></p>
                  <p className="pl-4">Popularidade × 0.4 +</p>
                  <p className="pl-4">Score Médio × 0.3 +</p>
                  <p className="pl-4">Multiplicador de Role × 0.3</p>
                  <div className="mt-3 text-xs text-gray-500">
                    <p>Role Multipliers:</p>
                    <p>Protagonist: 1.0 | Antagonist: 0.9</p>
                    <p>Deuteragonist: 0.85 | Supporting: 0.5</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 flex gap-4">
              <p><strong>Status codes:</strong> 200 OK, 404 Ranking não encontrado, 500 Erro</p>
            </div>
            {renderResponse('ranking')}
          </div>

          </div>

          {/* SEÇÃO: ESTATÍSTICAS */}
          <div id="stats" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-4 text-accent-secondary">📊 Estatísticas e Metadados</h3>

          {/* GET /api/database-stats */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-secondary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-secondary font-semibold">/api/database-stats</code>
              </div>
              <button
                onClick={() => testEndpoint('db-stats', '/api/database-stats')}
                disabled={responses['db-stats']?.loading}
                className="px-4 py-2 bg-accent-secondary hover:bg-accent-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['db-stats']?.loading ? 'Testando...' : '🧪 Testar'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">
              <strong>Descrição:</strong> Retorna estatísticas completas da database incluindo contadores, distribuições, tamanho e timestamps.
            </p>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">RESPONSE STRUCTURE:</p>
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`{
  "total_works": 150,
  "total_characters": 3420,
  "total_genres": 45,
  "average_score": 78,
  "types": {
    "anime": {
      "works_count": 100,
      "characters_count": 2500,
      "genres_count": 35
    },
    "manga": { ... },
    "game": { ... }
  },
  "database_info": {
    "total_file_size": 52428800,
    "average_characters_per_work": 22.8,
    "first_import": "2025-01-01T00:00:00Z",
    "last_import": "2025-12-24T22:00:00Z"
  },
  "distribution": {
    "by_status": {
      "Finished Airing": 80,
      "Currently Airing": 20
    },
    "top_genres": [
      { "genre": "Action", "count": 45 },
      { "genre": "Adventure", "count": 38 }
    ]
  },
  "last_updated": "2025-12-24T22:16:00Z"
}`}</code>
              </pre>
            </div>
            <div className="text-xs text-gray-400">
              <p><strong>Use case:</strong> Dashboards, página "sobre", métricas de crescimento</p>
            </div>
            {renderResponse('db-stats')}
          </div>

          </div>
        </div>
      </section>

      {/* Teste Interativo Personalizado */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">🎮 Teste Interativo Personalizado</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <p className="text-gray-300 mb-4">
            Faça suas próprias requisições para testar a API. Digite uma URL válida da API abaixo:
          </p>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="/api/works/anime/naruto"
              className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-gray-300 placeholder-gray-500 focus:border-accent-primary focus:outline-none transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    testEndpoint('custom', input.value.trim());
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="/api/works/anime/naruto"]') as HTMLInputElement;
                if (input && input.value.trim()) {
                  testEndpoint('custom', input.value.trim());
                }
              }}
              disabled={responses['custom']?.loading}
              className="px-6 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-primary/80 hover:to-accent-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105"
            >
              {responses['custom']?.loading ? '🚀 Testando...' : '🚀 Executar'}
            </button>
          </div>
          <div className="text-sm text-gray-400 mb-4">
            💡 Exemplos: <code className="text-accent-primary">/api/works</code>, <code className="text-accent-primary">/api/search?q=dragon&type=works</code>
          </div>
          {renderResponse('custom')}
        </div>
      </section>

      {/* Exemplo de Uso */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">💻 Exemplo de Uso Completo</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <pre className="text-sm overflow-x-auto">
            <code className="text-gray-300">{`// ========== OBRAS ==========

// Buscar todas as obras
const works = await fetch('/api/works').then(r => r.json());

// Obter detalhes de uma obra específica
const work = await fetch('/api/works/anime/naruto').then(r => r.json());

// Listar personagens da obra
const characters = await fetch('/api/works/anime/naruto/characters')
  .then(r => r.json());

// Obter detalhes de um personagem
const character = await fetch('/api/works/anime/naruto/characters/naruto-uzumaki')
  .then(r => r.json());


// ========== BUSCA ==========

// Busca simples de obras por nome
const searchWorks = await fetch('/api/search?q=dragon&type=works')
  .then(r => r.json());

// Busca simples de personagens
const searchChars = await fetch('/api/search?q=goku&type=characters')
  .then(r => r.json());


// ========== BUSCA FUZZY DE PERSONAGENS ==========

// Busca inteligente com tolerância a erros
const fuzzySearch = await fetch('/api/characters/search?q=goko&limit=10')
  .then(r => r.json());

console.log(\`Encontrados: \${fuzzySearch.total} personagens\`);
fuzzySearch.results.forEach(char => {
  console.log(\`\${char.name} - Score: \${char._searchScore.toFixed(2)}\`);
  console.log(\`Obra: \${char.work.title} (\${char.work.type})\`);
});

// Busca com filtro de tipo
const animeChars = await fetch('/api/characters/search?q=naruto&type=anime')
  .then(r => r.json());

// Ajustar sensibilidade (threshold 0-1)
const strictSearch = await fetch('/api/characters/search?q=luz&threshold=0.7')
  .then(r => r.json());


// ========== PERSONAGENS ALEATÓRIOS ==========

// Um personagem aleatório
const random = await fetch('/api/characters/random').then(r => r.json());

// 5 personagens aleatórios de anime
const randomAnime = await fetch('/api/characters/random?type=anime&n=5')
  .then(r => r.json());

// Personagens aleatórios de uma obra específica
const randomNaruto = await fetch('/api/characters/random?workType=anime&work=naruto&n=3')
  .then(r => r.json());


// ========== ESTATÍSTICAS ==========

// Estatísticas da database
const stats = await fetch('/api/database-stats').then(r => r.json());
console.log(\`Total: \${stats.total_works} obras, \${stats.total_characters} personagens\`);`}</code>
          </pre>
        </div>
      </section>

      {/* Códigos de Status */}
      <section>
        <h2 className="text-2xl font-bold mb-4">📊 Códigos de Status HTTP</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <ul className="space-y-2 text-gray-300">
            <li><code className="text-accent-success">200</code> - Sucesso</li>
            <li><code className="text-accent-warning">400</code> - Requisição inválida</li>
            <li><code className="text-accent-danger">404</code> - Recurso não encontrado</li>
            <li><code className="text-accent-danger">500</code> - Erro interno do servidor</li>
          </ul>
        </div>
      </section>

      {/* Informações Técnicas */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">⚙️ Informações Técnicas</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-accent-primary">📝 Formato de Dados</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>• Todas as respostas são em JSON</li>
              <li>• Codificação UTF-8</li>
              <li>• Datas em formato ISO 8601</li>
              <li>• URLs de imagens são absolutas</li>
            </ul>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-accent-secondary">🚀 Performance</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>• Rate limiting: 100 req/min por IP</li>
              <li>• Cache: 5 minutos para dados estáticos</li>
              <li>• Compressão GZIP automática</li>
              <li>• CDN para imagens otimizadas</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}