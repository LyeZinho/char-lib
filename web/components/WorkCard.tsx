'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Work {
  id: string;
  slug: string;
  type: string;
  title: string;
  cover_image?: string;
  genres?: string[];
  average_score?: number;
  metadata?: {
    format?: string;
    status?: string;
    genres?: string[];
    averageScore?: number;
    episodes?: number;
    chapters?: number;
  };
  images?: Array<{
    url: string;
    type: string;
  }>;
}

export default function WorkCard({ work }: { work: Work }) {
  const coverImage = work.cover_image || work.images?.find(img => img.type === 'cover')?.url || work.images?.[0]?.url;
  const typeLabel = work.type === 'anime' ? '📺 Anime' : work.type === 'manga' ? '📖 Manga' : '🎮 Game';
  const statusMap: Record<string, string> = {
    'FINISHED': 'Finalizado',
    'RELEASING': 'Em lançamento',
    'NOT_YET_RELEASED': 'Não lançado',
    'CANCELLED': 'Cancelado',
    'HIATUS': 'Em pausa'
  };

  return (
    <Link href={`/work/${work.type}/${work.slug}`}>
      <div className="group bg-dark-card/80 backdrop-blur-sm border border-dark-border/50 rounded-xl overflow-hidden hover:border-accent-primary/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent-primary/20 h-full flex flex-col relative">
        {/* Overlay gradiente no hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
        
        {/* Imagem de Capa */}
        <div className="relative h-72 bg-gradient-to-br from-dark-surface to-dark-card overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={work.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl bg-gradient-to-br from-dark-surface to-dark-card">
              {work.type === 'anime' ? '🎬' : work.type === 'manga' ? '📚' : '🎮'}
            </div>
          )}
          
          {/* Badge de tipo */}
          <div className="absolute top-2 left-2 bg-dark-surface/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold border border-white/10">
            {typeLabel}
          </div>

          {/* Score */}
          {work.metadata?.averageScore && (
            <div className="absolute top-2 right-2 bg-accent-primary/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border border-accent-primary/30">
              ⭐ {work.metadata.averageScore}%
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-4 flex-1 flex flex-col relative z-20">
          <h3 className="text-lg font-bold mb-3 line-clamp-2 text-white group-hover:text-accent-primary transition-colors duration-300">
            {work.title}
          </h3>

          {/* Metadados */}
          <div className="space-y-2 text-sm text-gray-400 flex-1">
            {work.metadata?.format && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">📺</span>
                <span className="text-gray-300">{work.metadata.format}</span>
              </div>
            )}

            {work.metadata?.status && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">📊</span>
                <span className={
                  work.metadata.status === 'FINISHED' ? 'text-accent-success' :
                  work.metadata.status === 'RELEASING' ? 'text-accent-primary' :
                  'text-gray-400'
                }>
                  {statusMap[work.metadata.status] || work.metadata.status}
                </span>
              </div>
            )}

            {(work.metadata?.episodes || work.metadata?.chapters) && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">📚</span>
                <span className="text-gray-300">
                  {work.metadata.episodes ? `${work.metadata.episodes} episódios` : `${work.metadata.chapters} capítulos`}
                </span>
              </div>
            )}
          </div>

          {/* Gêneros */}
          {work.metadata?.genres && work.metadata.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {work.metadata.genres.slice(0, 3).map((genre) => (
                <span 
                  key={genre}
                  className="px-3 py-1 bg-gradient-to-r from-accent-secondary/20 to-accent-primary/20 border border-accent-secondary/30 rounded-full text-xs text-accent-secondary font-medium hover:bg-accent-secondary/30 transition-colors duration-300"
                >
                  {genre}
                </span>
              ))}
              {work.metadata.genres.length > 3 && (
                <span className="px-3 py-1 bg-dark-surface/50 border border-gray-600/30 rounded-full text-xs text-gray-500 font-medium">
                  +{work.metadata.genres.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
