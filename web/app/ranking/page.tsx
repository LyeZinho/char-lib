'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

interface RankedCharacter {
  rank: number;
  id: string;
  name: string;
  workId: string;
  workTitle: string;
  workType: string;
  role: string;
  score: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image: string | null;
}

interface RankingData {
  generated_at: string;
  total_characters: number;
  distribution: {
    legendary: number;
    epic: number;
    rare: number;
    uncommon: number;
    common: number;
  };
  page: number;
  limit: number;
  total_pages: number;
  characters: RankedCharacter[];
}

const rarityConfig: Record<string, { color: string; border: string; bg: string; glow: string; label: string; icon: string }> = {
  'legendary': { 
    color: 'from-yellow-400 to-amber-500', 
    border: 'border-yellow-400', 
    bg: 'bg-yellow-400/10',
    glow: 'shadow-yellow-400/30 shadow-md',
    label: 'Lendário',
    icon: '⭐'
  },
  'epic': { 
    color: 'from-purple-400 to-violet-500', 
    border: 'border-purple-400', 
    bg: 'bg-purple-400/10',
    glow: 'shadow-purple-400/20 shadow-sm',
    label: 'Épico',
    icon: '💎'
  },
  'rare': { 
    color: 'from-blue-400 to-cyan-500', 
    border: 'border-blue-400', 
    bg: 'bg-blue-400/10',
    glow: '',
    label: 'Raro',
    icon: '💠'
  },
  'uncommon': { 
    color: 'from-green-400 to-emerald-500', 
    border: 'border-green-400', 
    bg: 'bg-green-400/10',
    glow: '',
    label: 'Incomum',
    icon: '🔹'
  },
  'common': { 
    color: 'from-gray-400 to-slate-500', 
    border: 'border-gray-500', 
    bg: 'bg-gray-500/10',
    glow: '',
    label: 'Comum',
    icon: '○'
  }
};

const roleLabels: Record<string, string> = {
  'protagonist': 'Protagonista',
  'deuteragonist': 'Deuteragonista',
  'antagonist': 'Antagonista',
  'supporting': 'Coadjuvante',
  'minor': 'Menor',
  'other': 'Outro'
};

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [page, setPage] = useState(1);
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const limit = 50;

  useEffect(() => {
    loadRanking();
  }, [page, rarityFilter, typeFilter]);

  async function loadRanking() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (rarityFilter) params.append('rarity', rarityFilter);
      if (typeFilter) params.append('type', typeFilter);
      
      const res = await fetch(`/api/ranking?${params}`);
      if (!res.ok) throw new Error('Falha ao carregar ranking');
      
      const data = await res.json();
      setRanking(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'anime': return '📺';
      case 'manga': return '📖';
      case 'game': return '🎮';
      default: return '📚';
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏆';
    if (rank <= 100) return '⭐';
    return `#${rank}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          🏆 Ranking de Personagens
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Classificação baseada em popularidade da obra, score médio e papel do personagem
        </p>
      </div>

      {/* Estatísticas de Distribuição */}
      {ranking && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(ranking.distribution).map(([rarity, count]) => {
            const config = rarityConfig[rarity];
            return (
              <button
                key={rarity}
                onClick={() => setRarityFilter(rarityFilter === rarity ? '' : rarity)}
                className={`p-4 rounded-lg border transition-all ${
                  rarityFilter === rarity 
                    ? `${config.border} ${config.bg} ${config.glow}` 
                    : 'border-dark-border bg-dark-card hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">{config.icon}</div>
                <div className={`font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
                  {config.label}
                </div>
                <div className="text-gray-400 text-sm">
                  {count.toLocaleString()} ({((count / ranking.total_characters) * 100).toFixed(1)}%)
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          {/* Filtro por tipo */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg focus:outline-none focus:border-accent-primary"
          >
            <option value="">Todos os tipos</option>
            <option value="anime">📺 Anime</option>
            <option value="manga">📖 Mangá</option>
            <option value="game">🎮 Game</option>
          </select>

          {/* Limpar filtros */}
          {(rarityFilter || typeFilter) && (
            <button
              onClick={() => { setRarityFilter(''); setTypeFilter(''); setPage(1); }}
              className="px-4 py-2 bg-accent-danger/20 text-accent-danger border border-accent-danger/30 rounded-lg hover:bg-accent-danger/30 transition-colors"
            >
              ✕ Limpar filtros
            </button>
          )}
        </div>

        {/* Info de total */}
        {ranking && (
          <div className="text-gray-400">
            Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, ranking.total_characters)} de {ranking.total_characters.toLocaleString()} personagens
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && <LoadingSpinner />}

      {/* Error */}
      {error && <ErrorMessage message={error} />}

      {/* Ranking List */}
      {ranking && !loading && (
        <div className="space-y-3">
          {ranking.characters.map((char) => {
            const rarity = rarityConfig[char.rarity];
            const isTopTen = char.rank <= 10;
            const isTop3 = char.rank <= 3;
            
            return (
              <Link
                key={`${char.workType}-${char.workId}-${char.id}`}
                href={`/work/${char.workType}/${char.workId}/character/${char.id}`}
              >
                <div className={`
                  flex items-center gap-4 p-4 rounded-lg border transition-all hover:scale-[1.01]
                  ${isTop3 ? `${rarity.border} ${rarity.bg} ${rarity.glow}` : 'border-dark-border bg-dark-card hover:border-gray-600'}
                `}>
                  {/* Rank */}
                  <div className={`
                    w-16 h-16 flex items-center justify-center rounded-lg font-bold text-xl
                    ${isTop3 ? 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20 text-yellow-400' :
                      isTopTen ? 'bg-accent-primary/20 text-accent-primary' : 'bg-dark-surface text-gray-400'}
                  `}>
                    {getRankBadge(char.rank)}
                  </div>

                  {/* Image */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-dark-surface">
                    {char.image ? (
                      <Image
                        src={char.image}
                        alt={char.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        👤
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg truncate">{char.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${rarity.border} ${rarity.bg}`}>
                        <span className={`bg-gradient-to-r ${rarity.color} bg-clip-text text-transparent font-semibold`}>
                          {rarity.icon} {rarity.label}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>{getTypeIcon(char.workType)} {char.workTitle}</span>
                      <span className="text-gray-600">•</span>
                      <span>{roleLabels[char.role] || char.role}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-bold bg-gradient-to-r ${rarity.color} bg-clip-text text-transparent`}>
                      {char.score}%
                    </div>
                    <div className="text-xs text-gray-500">Score</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {ranking && ranking.total_pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent-primary transition-colors"
          >
            ← Anterior
          </button>
          
          <div className="flex items-center gap-1">
            {/* First page */}
            {page > 3 && (
              <>
                <button
                  onClick={() => setPage(1)}
                  className="w-10 h-10 rounded-lg border border-dark-border hover:border-accent-primary transition-colors"
                >
                  1
                </button>
                {page > 4 && <span className="px-2 text-gray-500">...</span>}
              </>
            )}
            
            {/* Pages around current */}
            {Array.from({ length: Math.min(5, ranking.total_pages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(ranking.total_pages - 4, page - 2)) + i;
              if (pageNum > ranking.total_pages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg border transition-colors ${
                    pageNum === page 
                      ? 'bg-accent-primary border-accent-primary text-white' 
                      : 'border-dark-border hover:border-accent-primary'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {/* Last page */}
            {page < ranking.total_pages - 2 && (
              <>
                {page < ranking.total_pages - 3 && <span className="px-2 text-gray-500">...</span>}
                <button
                  onClick={() => setPage(ranking.total_pages)}
                  className="w-10 h-10 rounded-lg border border-dark-border hover:border-accent-primary transition-colors"
                >
                  {ranking.total_pages}
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={() => setPage(Math.min(ranking.total_pages, page + 1))}
            disabled={page === ranking.total_pages}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent-primary transition-colors"
          >
            Próximo →
          </button>
        </div>
      )}

      {/* Footer Info */}
      {ranking && (
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Ranking gerado em: {new Date(ranking.generated_at).toLocaleString('pt-BR')}</p>
          <p className="mt-1">
            O score é calculado com base na popularidade (40%), score médio (30%) e papel do personagem (30%)
          </p>
        </div>
      )}
    </div>
  );
}
