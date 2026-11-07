// Confere um lote traduzido: todos os ids presentes, marcadores {n}, {{TECLA}} e quebras de linha preservados.
// uso: node tools/validar.js dados/lotes/fase1-01.json   (lê fase1-01.pt.json ao lado)
const fs = require('fs');

const lista = (s, re) => (s.match(re) || []).sort().join(',');
const newlines = (s) => (s.match(/\n/g) || []).length;
// Um {n} só pode ser omitido se for sufixo de plural/artigo inglês (ex.: n===1?"":"s", "a"/"an").
const omissivel = (expr) => (/["'`](s|es|ies|y|a|an|is|are|was|were|has|have|it|they|them|its|their|his|her)?["'`]/.test(expr || '')
  && !/\.(name|label|title)\b/.test(expr || '')) || escolhaFixa(expr);
// {n} que só escolhe entre textos fixos em inglês (ex.: n===1?"turn":"turns"): pode ser reescrito em português.
const escolhaFixa = (expr) => /^\(?[^"'`?:]+\?\s*(["'`])[^"'`$]*\1\s*:\s*(["'`])[^"'`$]*\2\)?$/.test((expr || '').trim());

function validar(arquivo) {
  const lote = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const saida = arquivo.replace(/\.json$/, '.pt.json');
  if (!fs.existsSync(saida)) return [`arquivo ${saida} não existe`];
  let pt;
  try { pt = JSON.parse(fs.readFileSync(saida, 'utf8')); } catch (e) { return [`JSON inválido: ${e.message}`]; }
  const erros = [];
  for (const item of lote) {
    const [id, , en] = item;
    const exprs = Array.isArray(item[5]) ? item[5] : [];
    const t = pt[id];
    if (typeof t !== 'string' || !t.trim()) { erros.push(`${id}: faltando`); continue; }
    const orig = new Set(en.match(/\{\d+\}/g) || []);
    const novo = new Set(t.match(/\{\d+\}/g) || []);
    for (const p of novo) if (!orig.has(p)) erros.push(`${id}: marcador ${p} não existe no original`);
    for (const p of orig) {
      if (!novo.has(p) && !omissivel(exprs[Number(p.slice(1, -1))])) erros.push(`${id}: faltou o marcador ${p}`);
    }
    if (lista(t, /\{\{[A-Z0-9_]+\}\}/g) !== lista(en, /\{\{[A-Z0-9_]+\}\}/g)) erros.push(`${id}: marcadores {{TECLA}} diferentes`);
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
