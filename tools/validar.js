// Confere um lote traduzido: todos os ids presentes, marcadores {n} e quebras de linha preservados.
// uso: node tools/validar.js dados/lotes/fase1-01.json   (lê fase1-01.pt.json ao lado)
const fs = require('fs');

const placeholders = (s) => (s.match(/\{\d+\}/g) || []).sort().join(',');
const newlines = (s) => (s.match(/\n/g) || []).length;

function validar(arquivo) {
  const lote = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const saida = arquivo.replace(/\.json$/, '.pt.json');
  if (!fs.existsSync(saida)) return [`arquivo ${saida} não existe`];
  let pt;
  try { pt = JSON.parse(fs.readFileSync(saida, 'utf8')); } catch (e) { return [`JSON inválido: ${e.message}`]; }
  const erros = [];
  for (const [id, , en] of lote) {
    const t = pt[id];
    if (typeof t !== 'string' || !t.trim()) { erros.push(`${id}: faltando`); continue; }
    if (placeholders(t) !== placeholders(en)) erros.push(`${id}: marcadores diferentes (${placeholders(en)} vs ${placeholders(t)})`);
    if (newlines(t) !== newlines(en)) erros.push(`${id}: quebras de linha diferentes`);
  }
  return erros;
}

const erros = validar(process.argv[2]);
if (erros.length) {
  console.log(`${erros.length} problema(s):\n` + erros.slice(0, 50).join('\n'));
  process.exit(1);
}
console.log('OK');
