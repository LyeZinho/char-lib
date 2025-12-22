'use client';

import { useState, useEffect } from 'react';
import WorkCard from '@/components/WorkCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

interface Work {
  id: string;
  slug: string;
  type: string;
  title: string;
  cover_image?: string;
  genres?: string[];
  average_score?: number;
  metadata?: any;
  images?: any[];
}

interface DatabaseStats {
  total_works: number;
  total_characters: number;
  total_genres?: number;
  average_score?: number;
  types: {
    anime: { works_count: number; characters_count: number; genres_count?: number };
    manga: { works_count: number; characters_count: number; genres_count?: number };
    game: { works_count: number; characters_count: number; genres_count?: number };
  };
  database_info: {
    total_file_size: number;
    average_characters_per_work: number;
    first_import: string;
    last_import: string;
  };
  distribution?: {
    by_status: Record<string, number>;
    by_source?: Record<string, number>;
    top_genres?: Array<{ genre: string; count: number }>;
  };
  last_updated?: string;
  generated_at?: string;
}

export default function HomePage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadData();
    }
  }, []);

  async function loadData() {
    try {
      // Carregar obras e estatísticas em paralelo
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const [worksRes, statsRes] = await Promise.all([
        fetch(`${baseUrl}/api/works`),
        fetch(`${baseUrl}/api/database-stats`)
      ]);

      if (!worksRes.ok) throw new Error('Falha ao carregar obras');
      
      const worksData = await worksRes.json();
      setWorks(worksData);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setDatabaseStats(statsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  const filteredWorks = filter === 'all' 
    ? works 
    : works.filter(w => w.type === filter);

  // Calcular estatísticas
  const stats = {
    totalWorks: databaseStats?.total_works || works.length,
    animeCount: databaseStats?.types?.anime?.works_count || works.filter(w => w.type === 'anime').length,
    mangaCount: databaseStats?.types?.manga?.works_count || works.filter(w => w.type === 'manga').length,
    gameCount: databaseStats?.types?.game?.works_count || works.filter(w => w.type === 'game').length,
    totalGenres: databaseStats?.total_genres || [...new Set(works.flatMap(w => w.genres || []))].length,
    averageScore: databaseStats?.average_score || Math.round(works.reduce((acc, w) => acc + (w.average_score || 0), 0) / works.length),
    totalCharacters: databaseStats?.total_characters || 0
  };

  if (loading) return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-400">Carregando dados...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="container mx-auto px-4 py-8">
      <ErrorMessage message={error} />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
          CharLib
        </h1>
        <p className="text-gray-400 text-lg">
          Database local de personagens de anime, manga e games
        </p>
        <p className="text-gray-500 mt-2">
          Explore uma vasta coleção de personagens com informações detalhadas, imagens e relacionamentos.
          Tudo armazenado localmente para máxima privacidade e velocidade.
        </p>
      </div>

      {/* Contador Grande de Personagens */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-accent-primary/10 via-accent-secondary/10 to-accent-primary/10 border border-accent-primary/20 rounded-xl p-8 text-center">
          <div className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent mb-2">
            {stats.totalCharacters !== null ? stats.totalCharacters.toLocaleString('pt-BR') : '...'}
          </div>
          <div className="text-xl md:text-2xl text-gray-300 font-medium">
            Personagens Registrados
          </div>
          <div className="text-sm text-gray-500 mt-2">
            De {stats.totalWorks} obras catalogadas
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 border border-accent-primary/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-accent-primary">{stats.totalWorks}</div>
          <div className="text-sm text-gray-400">Obras</div>
        </div>
        <div className="bg-gradient-to-br from-accent-secondary/20 to-accent-secondary/5 border border-accent-secondary/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-accent-secondary">{stats.animeCount}</div>
          <div className="text-sm text-gray-400">Animes</div>
        </div>
        <div className="bg-gradient-to-br from-accent-success/20 to-accent-success/5 border border-accent-success/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-accent-success">{stats.totalCharacters.toLocaleString('pt-BR')}</div>
          <div className="text-sm text-gray-400">Personagens</div>
        </div>
        <div className="bg-gradient-to-br from-accent-warning/20 to-accent-warning/5 border border-accent-warning/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-accent-warning">{stats.averageScore}</div>
          <div className="text-sm text-gray-400">Score Médio</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-3 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-accent-primary text-white'
              : 'bg-dark-card text-gray-300 hover:bg-dark-hover'
          }`}
        >
          Todos ({works.length})
        </button>
        <button
          onClick={() => setFilter('anime')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'anime'
              ? 'bg-accent-primary text-white'
              : 'bg-dark-card text-gray-300 hover:bg-dark-hover'
          }`}
        >
          📺 Animes ({works.filter(w => w.type === 'anime').length})
        </button>
        <button
          onClick={() => setFilter('manga')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'manga'
              ? 'bg-accent-primary text-white'
              : 'bg-dark-card text-gray-300 hover:bg-dark-hover'
          }`}
        >
          📖 Mangás ({works.filter(w => w.type === 'manga').length})
        </button>
        <button
          onClick={() => setFilter('game')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'game'
              ? 'bg-accent-primary text-white'
              : 'bg-dark-card text-gray-300 hover:bg-dark-hover'
          }`}
        >
          🎮 Games ({works.filter(w => w.type === 'game').length})
        </button>
      </div>

      {/* Grade de Obras */}
      {filteredWorks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Nenhuma obra encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredWorks.map((work) => (
            <WorkCard key={`${work.type}-${work.slug}`} work={work} />
          ))}
        </div>
      )}

      {/* Estatísticas Detalhadas */}
      <div className="mt-8 bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">📊 Estatísticas Detalhadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Distribuição por Status */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-accent-primary">Status das Obras</h3>
            <div className="space-y-2">
              {databaseStats?.distribution?.by_status && Object.entries(databaseStats.distribution.by_status).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-gray-300 capitalize">{status.toLowerCase()}</span>
                  <span className="text-accent-secondary font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Gêneros */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-accent-secondary">Top Gêneros</h3>
            <div className="space-y-2">
              {databaseStats?.distribution?.top_genres?.slice(0, 5).map(({ genre, count }, index) => (
                <div key={genre} className="flex justify-between items-center">
                  <span className="text-gray-300">{index + 1}. {genre}</span>
                  <span className="text-accent-success font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Informações da Database */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-accent-warning">Database Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Tamanho total:</span>
                <span className="text-gray-300">{((databaseStats?.database_info?.total_file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Média chars/obra:</span>
                <span className="text-gray-300">{databaseStats?.database_info?.average_characters_per_work || 0}</span>
              </div>
              {databaseStats?.database_info?.first_import && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Primeiro import:</span>
                  <span className="text-gray-300">{new Date(databaseStats.database_info.first_import).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {databaseStats?.database_info?.last_import && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Último import:</span>
                  <span className="text-gray-300">{new Date(databaseStats.database_info.last_import).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
