// Lê o app.asar original e gera dados/textos-en.json com todos os textos exibíveis únicos.
// uso: node tools/extrair.js [caminho.asar]
const fs = require('fs');
const path = require('path');
const asar = require('./asar');
const { collect, splitEdges, RENDER_SINK } = require('./textos');

const ROOT = path.join(__dirname, '..');
const ASAR = process.argv[2] || path.join(ROOT, 'backup', 'app.asar.original');

function bundles(asarPath) {
  const { header, base } = asar.readHeader(asarPath);
  return asar.listFiles(header)
    .filter(([p]) => /^\/dist\/assets\/[^/]+\.js$/.test(p))
    .map(([p, node]) => ({ p, src: asar.readFile(asarPath, base, node).toString('utf8') }));
}

// Coleta tudo e remove textos que também aparecem como chave/comparação em qualquer bundle.
function scan(asarPath) {
  const files = bundles(asarPath).map((b) => ({ ...b, ...collect(b.src) }));
  const unsafe = new Set();
  const keys = new Set();
  for (const f of files) {
    for (const v of f.unsafeValues) unsafe.add(v);
    for (const k of f.keys) keys.add(k);
  }
  for (const f of files) {
    // Texto que vai direto para a tela (children, aria-label, data-tip) não volta para a lógica do jogo,
    // então pode ser traduzido mesmo que o mesmo valor seja comparado em outro ponto do código.
    f.occ = f.occ.filter((o) => RENDER_SINK.test(o.ctx) || (!unsafe.has(o.value.trim()) && !unsafe.has(splitEdges(o.value).core)))
      // Nome sem id: só traduz quando o id derivado existe como chave conhecida no código (é uma entidade).
      .filter((o) => !o.injectType || keys.has(o.injectType));
    // Descarta ocorrências aninhadas dentro de outra (ex.: string dentro de ${} de um template).
    f.occ.sort((a, b) => a.start - b.start || b.end - a.end);
    const kept = [];
    for (const o of f.occ) {
      if (kept.length && o.start < kept[kept.length - 1].end) continue;
      kept.push(o);
    }
    f.occ = kept;
  }
  return files;
}

module.exports = { scan, bundles };

if (require.main === module) {
  const files = scan(ASAR);
  const uniq = new Map();
  for (const f of files) {
    const short = path.basename(f.p).replace(/-[\w-]{8}\.js$/, '');
    for (const o of f.occ) {
      const core = splitEdges(o.value).core;
      let u = uniq.get(core);
      if (!u) {
        u = { text: core, count: 0, ctxs: {}, files: {}, words: (core.match(/[A-Za-z'’]+/g) || []).length };
        uniq.set(core, u);
      }
      u.count++;
      u.ctxs[o.ctx] = (u.ctxs[o.ctx] || 0) + 1;
      u.files[short] = (u.files[short] || 0) + 1;
    }
  }
  const list = [...uniq.values()];
  fs.mkdirSync(path.join(ROOT, 'dados'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'dados', 'textos-en.json'), JSON.stringify(list, null, 1));
  const words = list.reduce((s, u) => s + u.words, 0);
  console.log(`${list.length} textos únicos, ${words} palavras, ${files.reduce((s, f) => s + f.occ.length, 0)} ocorrências`);
}
