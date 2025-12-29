'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Character {
  id: string;
  name: string;
  role?: string;
  gender?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
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

  const rarityConfig: Record<string, { color: string; border: string; glow: string; label: string; icon: string }> = {
    'legendary': { 
      color: 'from-yellow-400 to-amber-500', 
      border: 'border-yellow-400', 
      glow: 'shadow-yellow-400/50 shadow-lg',
      label: 'Lendário',
      icon: '⭐'
    },
    'epic': { 
      color: 'from-purple-400 to-violet-500', 
      border: 'border-purple-400', 
      glow: 'shadow-purple-400/40 shadow-md',
      label: 'Épico',
      icon: '💎'
    },
    'rare': { 
      color: 'from-blue-400 to-cyan-500', 
      border: 'border-blue-400', 
      glow: 'shadow-blue-400/30 shadow-sm',
      label: 'Raro',
      icon: '💠'
    },
    'uncommon': { 
      color: 'from-green-400 to-emerald-500', 
      border: 'border-green-400', 
      glow: '',
      label: 'Incomum',
      icon: '🔹'
    },
    'common': { 
      color: 'from-gray-400 to-slate-500', 
      border: 'border-gray-500', 
      glow: '',
      label: 'Comum',
      icon: '○'
    }
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

  const roleColor = roleColors[character.role || ''] || 'bg-gray-600';
  const roleLabel = roleLabels[character.role || ''] || character.role;
  const rarity = rarityConfig[character.rarity || 'common'];

  return (
    <Link href={`/work/${workType}/${workSlug}/character/${character.id}`}>
      <div className={`bg-dark-card border ${rarity.border} rounded-lg overflow-hidden hover:border-accent-primary transition-all duration-300 hover:scale-105 ${rarity.glow}`}>
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

        {/* Nome e Raridade */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold bg-gradient-to-r ${rarity.color} bg-clip-text text-transparent`}>
              {rarity.icon} {rarity.label}
            </span>
          </div>
          <h3 className="text-base font-bold text-white line-clamp-2">
            {character.name}
          </h3>
        </div>
      </div>
    </Link>
  );
}
