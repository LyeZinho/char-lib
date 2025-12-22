import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// GET /api/database-stats - Estatísticas da database
export async function GET() {
  try {
    const statsPath = path.join(DATA_DIR, 'database-stats.json');

    if (!fs.existsSync(statsPath)) {
      return NextResponse.json({ error: 'Database stats not found' }, { status: 404 });
    }

    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json({ error: 'Failed to fetch database stats' }, { status: 500 });
  }
}