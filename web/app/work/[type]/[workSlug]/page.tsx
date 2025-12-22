'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import CharacterCard from '@/components/CharacterCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function WorkPage() {
  const params = useParams();
  const type = params.type as string;
  const slug = params.workSlug as string;

  const [work, setWork] = useState<any>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (type && slug) {
      loadWorkData();
    }
  }, [type, slug]);

  async function loadWorkData() {
    try {
      const [workRes, charsRes] = await Promise.all([
        fetch(`/api/works/${type}/${slug}`),
        fetch(`/api/works/${type}/${slug}/characters`)
      ]);

      if (!workRes.ok) throw new Error('Obra não encontrada');
      
      const workData = await workRes.json();
      const charsData = charsRes.ok ? await charsRes.json() : [];

      setWork(workData);
      setCharacters(charsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="container mx-auto px-4 py-8">
      <LoadingSpinner />
    </div>
  );

  if (error) return (
    <div className="container mx-auto px-4 py-8">
      <ErrorMessage message={error} />
    </div>
  );

  if (!work) return null;

  const coverImage = work.images?.find((img: any) => img.type === 'cover')?.url || work.images?.[0]?.url;
  const bannerImage = work.images?.find((img: any) => img.type === 'banner')?.url;

  return (
    <div className="min-h-screen">
      {/* Banner */}
      {bannerImage && (
        <div className="relative h-64 md:h-96 w-full">
          <Image
            src={bannerImage}
            alt={work.title}
            fill
            className="object-cover"
            unoptimized
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-bg"></div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* API Request Explanation Card */}
        <div className="mb-8 bg-gradient-to-r from-accent-primary/10 via-accent-secondary/10 to-accent-primary/10 border border-accent-primary/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-2xl">🔗</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-accent-primary mb-2">API Request</h3>
              <div className="bg-dark-bg rounded-lg p-4 font-mono text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-accent-success/20 text-accent-success rounded text-xs">GET</span>
                  <code className="text-accent-primary">/api/works/{type}/{slug}</code>
                </div>
                <p className="text-gray-400 text-xs">
                  Endpoint usado para carregar os dados desta obra. Retorna informações completas incluindo metadados, imagens e estatísticas.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Database Metadata Card */}
        <div className="mb-8 bg-dark-card/50 border border-dark-border rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-accent-success">●</span>
                <span className="text-gray-400">Database Status:</span>
                <span className="text-accent-success font-medium">Online</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent-primary">🕒</span>
                <span className="text-gray-400">Última atualização:</span>
                <span className="text-gray-300">{work.updated_at ? new Date(work.updated_at).toLocaleDateString('pt-BR') : 'N/A'}</span>
              </div>
            </div>
            <div className="text-gray-500">
              ID: {work.id}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Capa */}
          <div className="md:w-64 flex-shrink-0">
            <div className="relative aspect-[2/3] w-full md:w-64 rounded-lg overflow-hidden shadow-2xl">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={work.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-dark-card flex items-center justify-center text-6xl">
                  {type === 'anime' ? '📺' : type === 'manga' ? '📖' : '🎮'}
                </div>
              )}
            </div>
          </div>

          {/* Informações */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">{work.title}</h1>

            {work.alt_titles && work.alt_titles.length > 0 && (
              <p className="text-gray-400 mb-4">{work.alt_titles[0]}</p>
            )}

            {/* Metadados */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {work.metadata?.format && (
                <div>
                  <span className="text-gray-500 text-sm">Formato</span>
                  <p className="font-semibold">{work.metadata.format}</p>
                </div>
              )}
              {work.metadata?.status && (
                <div>
                  <span className="text-gray-500 text-sm">Status</span>
                  <p className="font-semibold">{work.metadata.status}</p>
                </div>
              )}
              {work.metadata?.averageScore && (
                <div>
                  <span className="text-gray-500 text-sm">Score</span>
                  <p className="font-semibold">⭐ {work.metadata.averageScore}%</p>
                </div>
              )}
              {work.metadata?.episodes && (
                <div>
                  <span className="text-gray-500 text-sm">Episódios</span>
                  <p className="font-semibold">{work.metadata.episodes}</p>
                </div>
              )}
              {work.metadata?.chapters && (
                <div>
                  <span className="text-gray-500 text-sm">Capítulos</span>
                  <p className="font-semibold">{work.metadata.chapters}</p>
                </div>
              )}
            </div>

            {/* Gêneros */}
            {work.metadata?.genres && work.metadata.genres.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm text-gray-500 mb-2">Gêneros</h3>
                <div className="flex flex-wrap gap-2">
                  {work.metadata.genres.map((genre: string) => (
                    <span key={genre} className="px-3 py-1 bg-dark-card rounded-full text-sm">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Descrição */}
            {work.description && (
              <div>
                <h3 className="text-xl font-bold mb-2">Sinopse</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {work.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Personagens */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-6">Personagens ({characters.length})</h2>
          
          {characters.length === 0 ? (
            <p className="text-gray-400">Nenhum personagem encontrado</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  workType={type}
                  workSlug={slug}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
