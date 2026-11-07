// Gera um lote de reescrita: frases-modelo já traduzidas que mantiveram um {n} que só escolhe entre
// textos fixos em inglês (n===1?" tile":" tiles"). O tradutor reescreve sem esse {n}, em português.
// uso: node tools/reescrita.js <nome-do-lote>
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const textos = require(path.join(ROOT, 'dados', 'textos-en.json'));
const dict = require(path.join(ROOT, 'dados', 'pt-BR.json'));
const escolhaFixa = (e) => /^\(?[^"'`?:]+\?\s*(["'`])[^"'`$]*\1\s*:\s*(["'`])[^"'`$]*\2\)?$/.test((e || '').trim())
  && /[A-Za-z]{2,}/.test(e.replace(/^[^?]*\?/, ''));

const nome = process.argv[2] || 'v036d';
const sel = textos.filter((u) => u.exprs && dict[u.text]
  && u.exprs.some((e, i) => escolhaFixa(e) && dict[u.text].includes('{' + i + '}')));
const lote = sel.map((u, i) => [i, 'reescrita', u.text, null, dict[u.text], u.exprs.map((e) => e.slice(0, 90))]);
fs.writeFileSync(path.join(ROOT, 'dados', 'lotes', `${nome}-01.json`), JSON.stringify(lote).replace(/\],\[/g, '],\n['));
fs.writeFileSync(path.join(ROOT, 'dados', 'lotes', `${nome}-indice.json`), JSON.stringify(sel.map((u) => u.text)));
console.log(`${sel.length} frases para reescrever em ${nome}-01.json`);
