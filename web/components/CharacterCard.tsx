'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Character {
  id: string;
  name: string;
  role?: string;
  gender?: string;
  images?: Array<{
    url: string;
  }>;
}

interface CharacterCardProps {
  character: Character;
  workType: string;
  workSlug: string;
}

export default function CharacterCard({ character, workType, workSlug }: CharacterCardProps) {
  const imageUrl = character.images?.[0]?.url;
  
  const roleColors: Record<string, string> = {
    'protagonist': 'bg-accent-primary',
    'main': 'bg-accent-secondary',
    'supporting': 'bg-accent-success',
    'background': 'bg-gray-600'
  };

  const roleLabels: Record<string, string> = {
    'protagonist': 'Protagonista',
    'main': 'Principal',
    'supporting': 'Coadjuvante',
    'background': 'Secundário'
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'anime': return '📺';
      case 'manga': return '📖';
      case 'game': return '🎮';
      default: return '📚';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'anime': return 'Anime';
      case 'manga': return 'Mangá';
      case 'game': return 'Game';
      default: return type;
    }
  };

  return (
    <Link href={`/work/${workType}/${workSlug}/character/${character.id}`}>
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden hover:border-accent-primary transition-all duration-300 hover:scale-105">
        {/* Imagem */}
        <div className="relative h-64 bg-dark-surface">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={character.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-6xl">
              👤
            </div>
          )}
          
          {/* Badge de papel */}
          {character.role && (
            <div className={`absolute top-2 left-2 ${roleColor} backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold`}>
              {roleLabel}
            </div>
          )}

          {/* Badge de tipo */}
          <div className="absolute bottom-2 left-2 bg-dark-surface/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
            {getTypeIcon(workType)} {getTypeLabel(workType)}
          </div>

          {/* Badge de gênero */}
          {character.gender && (
            <div className="absolute top-2 right-2 bg-dark-surface/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs">
              {character.gender === 'Male' ? '♂' : character.gender === 'Female' ? '♀' : '⚧'}
            </div>
          )}
        </div>

        {/* Nome */}
        <div className="p-4">
          <h3 className="text-base font-bold text-white line-clamp-2">
            {character.name}
          </h3>
        </div>
      </div>
    </Link>
  );
}
