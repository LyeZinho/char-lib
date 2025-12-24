import fs from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

function pickRandom<T>(arr: T[], n = 1) {
  const res: T[] = []
  const len = arr.length
  if (len === 0) return res
  for (let i = 0; i < Math.min(n, len); i++) {
    const idx = Math.floor(Math.random() * arr.length)
    res.push(arr.splice(idx, 1)[0])
  }
  return res
}

async function readJson(file: string) {
  try {
    const s = await fs.readFile(file, 'utf8')
    return JSON.parse(s)
  } catch (e) {
    return null
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = url.searchParams.get('type') // anime|manga|game
  const workType = url.searchParams.get('workType')
  const work = url.searchParams.get('work') // slug or id or title
  const nParam = url.searchParams.get('n') || '1'
  const n = Math.max(1, Math.min(50, parseInt(nParam, 10) || 1))

  const dataRoot = path.join(process.cwd(), 'public', 'data')

  // If workType+work provided: try to resolve specific work dir
  if (workType && work) {
    const workDir = path.join(dataRoot, workType)
    try {
      // quick path: directory with same name as work
      const candidate = path.join(workDir, work)
      try {
        const stat = await fs.stat(candidate)
        if (stat.isDirectory()) {
          const chars = await readJson(path.join(candidate, 'characters.json'))
          const list = Array.isArray(chars) ? chars : (chars && chars.characters) || []
          const chosen = pickRandom(list.slice(), n)
          return NextResponse.json({ count: chosen.length, characters: chosen })
        }
      } catch (e) {
        // continue to scan directories
      }

      // Scan all works under this type and try to match by info.id, info.slug, or info.title
      const entries = await fs.readdir(workDir, { withFileTypes: true })
      for (const ent of entries) {
        if (!ent.isDirectory()) continue
        const infoPath = path.join(workDir, ent.name, 'info.json')
        const info = await readJson(infoPath)
        if (!info) continue
        const match = String(info.id) === work || String(info.slug) === work || String(info.title) === work
        if (match) {
          const chars = await readJson(path.join(workDir, ent.name, 'characters.json'))
          const list = Array.isArray(chars) ? chars : (chars && chars.characters) || []
          const chosen = pickRandom(list.slice(), n)
          return NextResponse.json({ count: chosen.length, characters: chosen })
        }
      }

      return NextResponse.json({ error: 'Work not found' }, { status: 404 })
    } catch (err) {
      return NextResponse.json({ error: 'Type not found' }, { status: 404 })
    }
  }

  // If type provided: aggregate characters from that type
  if (type) {
    const typeDir = path.join(dataRoot, type)
    try {
      const entries = await fs.readdir(typeDir, { withFileTypes: true })
      const pool: any[] = []
      for (const ent of entries) {
        if (!ent.isDirectory()) continue
        const chars = await readJson(path.join(typeDir, ent.name, 'characters.json'))
        if (!chars) continue
        const list = Array.isArray(chars) ? chars : (chars && chars.characters) || []
        for (const c of list) pool.push({ ...c, work: { type, slug: ent.name } })
      }
      const chosen = pickRandom(pool, n)
      return NextResponse.json({ count: chosen.length, characters: chosen })
    } catch (e) {
      return NextResponse.json({ error: 'Type not found' }, { status: 404 })
    }
  }

  // No filters: aggregate all characters from all types
  try {
    const types = await fs.readdir(dataRoot, { withFileTypes: true })
    const pool: any[] = []
    for (const t of types) {
      if (!t.isDirectory()) continue
      const typeDir = path.join(dataRoot, t.name)
      const works = await fs.readdir(typeDir, { withFileTypes: true })
      for (const w of works) {
        if (!w.isDirectory()) continue
        const chars = await readJson(path.join(typeDir, w.name, 'characters.json'))
        if (!chars) continue
        const list = Array.isArray(chars) ? chars : (chars && chars.characters) || []
        for (const c of list) pool.push({ ...c, work: { type: t.name, slug: w.name } })
      }
    }
    const chosen = pickRandom(pool, n)
    return NextResponse.json({ count: chosen.length, characters: chosen })
  } catch (e) {
    return NextResponse.json({ error: 'No data available' }, { status: 500 })
  }
}
