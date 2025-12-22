'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('works');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [lastSearchType, setLastSearchType] = useState('');

  // Efeito para buscar automaticamente quando o tipo muda e há uma query
  useEffect(() => {
    if (query.trim() && lastSearchQuery === query && lastSearchType !== searchType) {
      handleSearch();
    }
  }, [searchType]);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${searchType}`);
      if (!response.ok) throw new Error('Falha na busca');
      const data = await response.json();

      // Filtrar resultados vazios ou inválidos
      const validResults = data.filter((item: any) => {
        if (searchType === 'works') {
          return item && item.title && item.slug && item.type;
        } else {
          return item && item.name && item.id && item.work;
        }
      });

      setResults(validResults);
      setLastSearchQuery(query);
      setLastSearchType(searchType);
    } catch (error) {
      console.error('Erro na busca:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchTypeChange(newType: string) {
    if (newType !== searchType) {
      setSearchType(newType);
      // Não limpar resultados imediatamente - será feito pelo useEffect se necessário
    }
  }

  function getWorkCoverImage(work: any) {
    // Tentar múltiplas fontes de imagem para obras
    return work.cover_image || work.images?.[0]?.url || work.banner_image;
  }

  function getCharacterImage(character: any) {
    // Tentar múltiplas fontes de imagem para personagens
    return character.images?.[0]?.url || character.image_url;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
        🔍 Buscar
      </h1>

      {/* Formulário de Busca */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome da obra ou personagem..."
            className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-accent-primary hover:bg-accent-primary/80 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-accent-primary/25"
          >
            {loading ? '🔄 Buscando...' : '🔍 Buscar'}
          </button>
        </div>

        {/* Tipo de Busca */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSearchTypeChange('works')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              searchType === 'works'
                ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/25'
                : 'bg-dark-card text-gray-300 hover:bg-dark-hover border border-dark-border hover:border-accent-primary/50'
            }`}
          >
            📚 Obras
          </button>
          <button
            type="button"
            onClick={() => handleSearchTypeChange('characters')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              searchType === 'characters'
                ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/25'
                : 'bg-dark-card text-gray-300 hover:bg-dark-hover border border-dark-border hover:border-accent-primary/50'
            }`}
          >
            👥 Personagens
          </button>
        </div>
      </form>

      {/* Resultados */}
      {loading && (
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="mt-4 text-gray-400">Buscando...</p>
        </div>
      )}

      {!loading && searched && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-400">
              {results.length} resultado(s) encontrado(s) para "{query}"
            </p>
            {results.length > 0 && (
              <div className="text-sm text-gray-500">
                Tipo: {searchType === 'works' ? 'Obras' : 'Personagens'}
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12 bg-dark-card/50 rounded-lg border border-dark-border">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-400 text-lg mb-2">Nenhum resultado encontrado</p>
              <p className="text-gray-500 text-sm">Tente ajustar sua busca ou procurar por outro termo</p>
            </div>
          ) : searchType === 'works' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((work: any) => {
                const coverImage = getWorkCoverImage(work);
                return (
                  <Link key={`${work.type}-${work.slug}`} href={`/work/${work.type}/${work.slug}`}>
                    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden hover:border-accent-primary transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent-primary/10 group">
                      <div className="relative h-64 bg-dark-surface">
                        {coverImage ? (
                          <Image
                            src={coverImage}
                            alt={work.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            unoptimized
                            onError={(e) => {
                              // Fallback para emoji se a imagem falhar
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-gray-500 text-6xl">
                                  ${work.type === 'anime' ? '📺' : work.type === 'manga' ? '📖' : '🎮'}
                                </div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-6xl group-hover:scale-110 transition-transform duration-300">
                            {work.type === 'anime' ? '📺' : work.type === 'manga' ? '📖' : '🎮'}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-white line-clamp-2 group-hover:text-accent-primary transition-colors">
                          {work.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 capitalize">
                          {work.type}
                        </p>
                        {work.average_score && (
                          <div className="flex items-center mt-2">
                            <span className="text-yellow-400 text-sm">⭐</span>
                            <span className="text-gray-300 text-sm ml-1">{work.average_score}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((char: any) => {
                const charImage = getCharacterImage(char);
                return (
                  <Link
                    key={`${char.work?.slug}-${char.id}`}
                    href={`/work/${char.work?.type}/${char.work?.slug}/character/${char.id}`}
                  >
                    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden hover:border-accent-primary transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent-primary/10 group">
                      <div className="relative h-64 bg-dark-surface">
                        {charImage ? (
                          <Image
                            src={charImage}
                            alt={char.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            unoptimized
                            onError={(e) => {
                              // Fallback para emoji se a imagem falhar
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-gray-500 text-6xl">👤</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-6xl group-hover:scale-110 transition-transform duration-300">
                            👤
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-white line-clamp-2 group-hover:text-accent-primary transition-colors">
                          {char.name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {char.work?.title || 'Obra desconhecida'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          {char.role && (
                            <span className="text-xs bg-accent-primary/20 text-accent-primary px-2 py-1 rounded-full">
                              {char.role}
                            </span>
                          )}
                          {char.work?.type && (
                            <span className="text-xs bg-accent-secondary/20 text-accent-secondary px-2 py-1 rounded-full">
                              {char.work.type === 'anime' ? '📺 Anime' : char.work.type === 'manga' ? '📖 Mangá' : char.work.type === 'game' ? '🎮 Game' : char.work.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
