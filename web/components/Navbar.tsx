'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-dark-surface/80 backdrop-blur-md border-b border-dark-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="text-3xl font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-clip-text text-transparent animate-gradient-x">
              CharLib
            </div>
            <div className="text-sm text-gray-400 group-hover:text-accent-primary transition-colors duration-300">
              Database Local
            </div>
          </Link>

          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-300 hover:text-accent-primary transition-all duration-300 hover:scale-105 relative group"
            >
              <span className="relative z-10">🏠 Obras</span>
              <div className="absolute inset-0 bg-accent-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link 
              href="/ranking" 
              className="text-gray-300 hover:text-accent-primary transition-all duration-300 hover:scale-105 relative group"
            >
              <span className="relative z-10">🏆 Ranking</span>
              <div className="absolute inset-0 bg-accent-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link 
              href="/search" 
              className="text-gray-300 hover:text-accent-primary transition-all duration-300 hover:scale-105 relative group"
            >
              <span className="relative z-10">🔍 Busca</span>
              <div className="absolute inset-0 bg-accent-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link 
              href="/docs" 
              className="text-gray-300 hover:text-accent-primary transition-all duration-300 hover:scale-105 relative group"
            >
              <span className="relative z-10">📚 Documentação</span>
              <div className="absolute inset-0 bg-accent-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
