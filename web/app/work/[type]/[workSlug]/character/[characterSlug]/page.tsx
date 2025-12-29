'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function CharacterPage() {
  const params = useParams();
  const type = params.type as string;
  const workSlug = params.workSlug as string;
  const characterSlug = params.characterSlug as string;

  const [character, setCharacter] = useState<any>(null);
  const [work, setWork] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (type && workSlug && characterSlug) {
      loadCharacterData();
    }
  }, [type, workSlug, characterSlug]);

  async function loadCharacterData() {
    try {
      const [charRes, workRes] = await Promise.all([
        fetch(`/api/works/${type}/${workSlug}/characters/${characterSlug}`),
        fetch(`/api/works/${type}/${workSlug}`)
      ]);

      if (!charRes.ok) throw new Error('Personagem não encontrado');
      
      const charData = await charRes.json();
      const workData = workRes.ok ? await workRes.json() : null;

      setCharacter(charData);
      setWork(workData);
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

  if (!character) return null;

  const mainImage = character.images?.[0]?.url;
  const roleLabels: Record<string, string> = {
    'protagonist': 'Protagonista',
    'main': 'Principal',
    'supporting': 'Coadjuvante',
    'background': 'Secundário'
  };

  const rarityConfig: Record<string, { color: string; border: string; glow: string; bg: string; label: string; icon: string }> = {
    'legendary': { 
      color: 'from-yellow-400 to-amber-500', 
      border: 'border-yellow-400', 
      bg: 'bg-yellow-400/10',
      glow: 'shadow-yellow-400/50 shadow-lg',
      label: 'Lendário',
      icon: '⭐'
    },
    'epic': { 
      color: 'from-purple-400 to-violet-500', 
      border: 'border-purple-400', 
      bg: 'bg-purple-400/10',
      glow: 'shadow-purple-400/40 shadow-md',
      label: 'Épico',
      icon: '💎'
    },
    'rare': { 
      color: 'from-blue-400 to-cyan-500', 
      border: 'border-blue-400', 
      bg: 'bg-blue-400/10',
      glow: 'shadow-blue-400/30 shadow-sm',
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
      bg: 'bg-gray-400/10',
      glow: '',
      label: 'Comum',
      icon: '○'
    }
  };

  const rarity = rarityConfig[character.rarity || 'common'];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-400">
        <Link href="/" className="hover:text-white">Home</Link>
        {' / '}
        {work && (
          <>
            <Link href={`/work/${type}/${workSlug}`} className="hover:text-white">
              {work.title}
            </Link>
            {' / '}
          </>
        )}
        <span className="text-white">{character.name}</span>
      </div>

      {/* API Request Explanation Card */}
      <div className="mb-6 bg-gradient-to-r from-accent-primary/10 via-accent-secondary/10 to-accent-primary/10 border border-accent-primary/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-2xl">🔗</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-accent-primary mb-2">API Request</h3>
            <div className="bg-dark-bg rounded-lg p-4 font-mono text-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-accent-success/20 text-accent-success rounded text-xs">GET</span>
                <code className="text-accent-primary">/api/works/{type}/{workSlug}/characters/{characterSlug}</code>
              </div>
              <p className="text-gray-400 text-xs">
                Endpoint usado para carregar os dados deste personagem. Retorna informações completas incluindo imagens, metadados e relacionamentos.
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
            ID: {character.id}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Imagem Principal */}
        <div className="md:w-80 flex-shrink-0">
          <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden shadow-2xl">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={character.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-dark-card flex items-center justify-center text-8xl">
                👤
              </div>
            )}
          </div>

          {/* Galeria de Imagens */}
          {character.images && character.images.length > 1 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {character.images.slice(1, 4).map((img: any, idx: number) => (
                <div key={idx} className="relative aspect-square rounded overflow-hidden">
                  <Image
                    src={img.url}
                    alt={`${character.name} ${idx + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="flex-1">
          {/* Badges de Raridade e Ranking */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Badge de Raridade */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${rarity.bg} ${rarity.border} border ${rarity.glow}`}>
              <span className="text-lg">{rarity.icon}</span>
              <span className={`font-bold bg-gradient-to-r ${rarity.color} bg-clip-text text-transparent`}>
                {rarity.label}
              </span>
            </div>

            {/* Badge de Ranking */}
            {character.rank && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30">
                <span className="text-lg">🏆</span>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Ranking</span>
                  <span className="font-bold text-accent-primary">
                    #{character.rank.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            )}

            {/* Badge de Pull Chance */}
            {character.pullChance !== undefined && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-warning/10 to-yellow-500/10 border border-accent-warning/30">
                <span className="text-lg">🎲</span>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Chance Pull</span>
                  <span className="font-bold text-accent-warning">
                    {character.pullChance < 0.01 
                      ? `${(character.pullChance * 1000).toFixed(2)}‰` 
                      : `${character.pullChance.toFixed(4)}%`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <h1 className="text-4xl font-bold mb-4">{character.name}</h1>

          {/* Nomes Alternativos */}
          {character.alt_names && character.alt_names.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-500 text-sm">Também conhecido como:</span>
              <p className="text-gray-300">{character.alt_names.join(', ')}</p>
            </div>
          )}

          {/* Obra */}
          {work && (
            <div className="mb-6 p-4 bg-dark-card rounded-lg border border-dark-border">
              <div className="flex items-center justify-between">
                <Link href={`/work/${type}/${workSlug}`} className="hover:text-accent-primary transition-colors flex-1">
                  <span className="text-gray-500 text-sm">De:</span>
                  <p className="text-lg font-semibold">{work.title}</p>
                </Link>
                <div className="ml-4 px-3 py-1 bg-accent-primary/20 text-accent-primary rounded-full text-sm font-medium">
                  {type === 'anime' ? '📺 Anime' : type === 'manga' ? '📖 Mangá' : type === 'game' ? '🎮 Game' : type}
                </div>
              </div>
            </div>
          )}

          {/* Metadados em Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Raridade */}
            <div className={`p-4 rounded-lg ${rarity.bg} ${rarity.border} border`}>
              <span className="text-gray-500 text-sm">Raridade</span>
              <p className={`font-bold bg-gradient-to-r ${rarity.color} bg-clip-text text-transparent flex items-center gap-1`}>
                {rarity.icon} {rarity.label}
              </p>
            </div>
            {character.role && (
              <div className="p-4 bg-dark-card rounded-lg">
                <span className="text-gray-500 text-sm">Papel</span>
                <p className="font-semibold">{roleLabels[character.role] || character.role}</p>
              </div>
            )}
            {character.gender && (
              <div className="p-4 bg-dark-card rounded-lg">
                <span className="text-gray-500 text-sm">Gênero</span>
                <p className="font-semibold">
                  {character.gender === 'Male' ? '♂ Masculino' : 
                   character.gender === 'Female' ? '♀ Feminino' : character.gender}
                </p>
              </div>
            )}
            {character.age && (
              <div className="p-4 bg-dark-card rounded-lg">
                <span className="text-gray-500 text-sm">Idade</span>
                <p className="font-semibold">{character.age}</p>
              </div>
            )}
          </div>

          {/* Descrição */}
          {character.description && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">Descrição</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                {character.description}
              </p>
            </div>
          )}

          {/* Informações Adicionais */}
          {(character.bloodType || character.dateOfBirth) && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">Informações Adicionais</h3>
              <div className="space-y-2 text-gray-300">
                {character.bloodType && (
                  <p><span className="text-gray-500">Tipo Sanguíneo:</span> {character.bloodType}</p>
                )}
                {character.dateOfBirth && (
                  <p><span className="text-gray-500">Data de Nascimento:</span> {character.dateOfBirth}</p>
                )}
              </div>
            </div>
          )}

          {/* Fonte */}
          {character.source && (
            <div className="text-sm text-gray-500">
              Fonte: {character.source}
              {character.source_id && ` (ID: ${character.source_id})`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
