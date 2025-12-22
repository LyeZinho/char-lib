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
                    <span className="text-gray-400">Última:</span>
                    <span className="text-gray-300">
                      {databaseStats.last_updated ? new Date(databaseStats.last_updated).toLocaleDateString('pt-BR') : 'N/A'}
                    </span>
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

        <div className="space-y-8">
          {/* GET /api/works */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary">/api/works</code>
              </div>
              <button
                onClick={() => testEndpoint('works', '/api/works')}
                disabled={responses['works']?.loading}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['works']?.loading ? 'Testando...' : '🧪 Testar'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">Lista todas as obras disponíveis no banco de dados.</p>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`// Exemplo de resposta
[
  {
    "id": "naruto",
    "type": "anime",
    "title": "Naruto",
    "metadata": { ... },
    "cover_image": "..."
  }
]`}</code>
              </pre>
            </div>
            {renderResponse('works')}
          </div>

          {/* GET /api/works/[type]/[slug] */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary">/api/works/[type]/[slug]</code>
              </div>
              <button
                onClick={() => testEndpoint('work-detail', '/api/works/anime/naruto')}
                disabled={responses['work-detail']?.loading}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['work-detail']?.loading ? 'Testando...' : '🧪 Testar'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">Retorna informações detalhadas de uma obra específica.</p>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-1">Parâmetros:</p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li><code className="text-accent-primary">type</code>: anime, manga ou game</li>
                <li><code className="text-accent-primary">slug</code>: identificador da obra</li>
              </ul>
            </div>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`// Exemplo
fetch('/api/works/anime/naruto')
  .then(res => res.json())
  .then(data => console.log(data));`}</code>
              </pre>
            </div>
            {renderResponse('work-detail')}
          </div>

          {/* GET /api/works/[type]/[slug]/characters */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary">/api/works/[type]/[slug]/characters</code>
              </div>
              <button
                onClick={() => testEndpoint('work-characters', '/api/works/anime/naruto/characters')}
                disabled={responses['work-characters']?.loading}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['work-characters']?.loading ? 'Testando...' : '🧪 Testar'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">Lista todos os personagens de uma obra.</p>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`// Retorna array de personagens
[
  {
    "id": "naruto-uzumaki",
    "name": "Naruto Uzumaki",
    "role": "protagonist",
    "images": [ ... ]
  }
]`}</code>
              </pre>
            </div>
            {renderResponse('work-characters')}
          </div>

          {/* GET /api/works/[type]/[slug]/characters/[characterId] */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary">/api/works/[type]/[slug]/characters/[characterId]</code>
              </div>
              <button
                onClick={() => testEndpoint('character-detail', '/api/works/anime/naruto/characters/naruto-uzumaki')}
                disabled={responses['character-detail']?.loading}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {responses['character-detail']?.loading ? 'Testando...' : '🧪 Testar'}
              </button>
            </div>
            <p className="text-gray-300 mb-3">Retorna informações detalhadas de um personagem específico.</p>
            {renderResponse('character-detail')}
          </div>

          {/* GET /api/search */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-accent-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent-success rounded text-sm font-mono font-bold">GET</span>
                <code className="text-accent-primary">/api/search?q=[query]&type=[works|characters]</code>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testEndpoint('search', '/api/search?q=naruto&type=works')}
                  disabled={responses['search']?.loading}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {responses['search']?.loading ? 'Testando...' : '🧪 Testar Naruto'}
                </button>
                <button
                  onClick={() => testEndpoint('search-custom', '/api/search?q=one+piece&type=characters')}
                  disabled={responses['search-custom']?.loading}
                  className="px-4 py-2 bg-accent-secondary hover:bg-accent-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {responses['search-custom']?.loading ? 'Testando...' : '🧪 Testar Personagens'}
                </button>
              </div>
            </div>
            <p className="text-gray-300 mb-3">Busca por obras ou personagens.</p>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-1">Query Parameters:</p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li><code className="text-accent-primary">q</code>: termo de busca</li>
                <li><code className="text-accent-primary">type</code>: works ou characters</li>
              </ul>
            </div>
            <div className="bg-dark-bg rounded p-4 mb-4">
              <pre className="text-sm overflow-x-auto">
                <code className="text-gray-300">{`// Exemplo
fetch('/api/search?q=naruto&type=works')
  .then(res => res.json())
  .then(data => console.log(data));`}</code>
              </pre>
            </div>
            {renderResponse('search')}
            {renderResponse('search-custom')}
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
            <code className="text-gray-300">{`// Buscar todas as obras
const works = await fetch('/api/works').then(r => r.json());

// Obter detalhes de uma obra específica
const work = await fetch('/api/works/anime/naruto').then(r => r.json());

// Listar personagens da obra
const characters = await fetch('/api/works/anime/naruto/characters')
  .then(r => r.json());

// Obter detalhes de um personagem
const character = await fetch('/api/works/anime/naruto/characters/naruto-uzumaki')
  .then(r => r.json());

// Buscar obras por nome
const searchResults = await fetch('/api/search?q=one+piece&type=works')
  .then(r => r.json());`}</code>
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