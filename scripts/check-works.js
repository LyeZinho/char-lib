import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./data/character-ranking.json', 'utf-8'));
const ranking = data.characters;

// Agrupar por obra
const byWork = {};
ranking.forEach(char => {
  const key = char.workTitle;
  if (!byWork[key]) {
    byWork[key] = { title: key, legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0, total: 0 };
  }
  byWork[key][char.rarity.toLowerCase()]++;
  byWork[key].total++;
});

// Obras específicas para análise
const works = ['One Piece', 'Naruto', 'Demon Slayer: Kimetsu no Yaiba', 'Attack on Titan', 'Bleach'];

console.log('📊 Análise de Obras Específicas:\n');
works.forEach(work => {
  const data = byWork[work];
  if (data) {
    console.log(`${work}:`);
    console.log(`  🟡 Legendary: ${data.legendary}`);
    console.log(`  🟣 Epic: ${data.epic}`);
    console.log(`  🔵 Rare: ${data.rare}`);
    console.log(`  🟢 Uncommon: ${data.uncommon}`);
    console.log(`  ⚪ Common: ${data.common}`);
    console.log(`  📊 Total: ${data.total}\n`);
  }
});
