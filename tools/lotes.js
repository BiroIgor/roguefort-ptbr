// Seleciona os textos de uma fase e divide em lotes para tradução.
// uso: node tools/lotes.js fase1 [charsPorLote]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LORE = /^prop:(content|lines|offerDialogue|about|r|greeting|flavour|flavor|flavorText|narrative|scholar|herbalist|farmer|guard|blacksmith|healer|merchant|general|alchemist|innkeeper|lore|bumpMessage|archedMessage|msg|purpose|use|cold|learned|hello|more|accept|remind|ready|offer|done|discoveryMessages|where|canon|notes|source|q|a)$|^call:SA$/;
const UI = /^prop:(children|label|title|name|aria-label|data-tip|text|tip|tips|hint|action|reason|message|section|blurb|help|why|how|intro|cost|proof|body|detail|desc|description|header|subtitle|placeholder|tooltip|status)$|^assign:A\.notice$/;
const TUT = /^prop:(help|why|how|tips|tip|intro|cost|proof|hint|blurb|body|section)$/;

const topCtx = (u) => Object.entries(u.ctxs).sort((a, b) => b[1] - a[1])[0][0];

const FASES = {
  fase1: (u) => { const c = topCtx(u); return !LORE.test(c) && UI.test(c) && (u.words <= 8 || (TUT.test(c) && u.words <= 80)); },
  // Interface/log/objetivos restantes, frases curtas fora de diálogos e lore.
  fase1b: (u) => !LORE.test(topCtx(u)) && u.words <= 15,
  // Todo o resto: diálogos, lore, livros e textos longos.
  fase2: (u) => LORE.test(topCtx(u)) || u.words > 15,
};

if (require.main === module) {
  const fase = process.argv[2] || 'fase1';
  const maxChars = Number(process.argv[3] || 34000);
  const textos = require(path.join(ROOT, 'dados', 'textos-en.json'));
  const feitos = fs.existsSync(path.join(ROOT, 'dados', 'pt-BR.json'))
    ? require(path.join(ROOT, 'dados', 'pt-BR.json')) : {};
  // fase3: tudo que nenhuma fase anterior cobriu (textos liberados por melhorias no extrator).
  const jaEmLote = new Set();
  if (fase === 'fase3') {
    for (const f of ['fase1', 'fase1b', 'fase2']) {
      const idx = path.join(ROOT, 'dados', 'lotes', `${f}-indice.json`);
      if (fs.existsSync(idx)) for (const t of require(idx)) jaEmLote.add(t);
    }
  }
  // Fase sem regra própria (ex.: "v036"): todo texto ainda sem tradução.
  const filtro = fase === 'fase3' ? (u) => !jaEmLote.has(u.text) : (FASES[fase] || (() => true));
  const sel = textos.filter(filtro).filter((u) => !(u.text in feitos));

  // Referência: texto antigo mais parecido já traduzido (o jogo costuma editar frases entre versões).
  const palavras = (s) => s.toLowerCase().match(/[a-z']+/g) || [];
  const chave = (ws) => [ws.slice(0, 4).join(' '), ws.slice(-4).join(' ')];
  const indice = new Map();
  for (const en of Object.keys(feitos)) {
    const ws = palavras(en);
    if (ws.length < 4) continue;
    for (const k of chave(ws)) { if (!indice.has(k)) indice.set(k, []); indice.get(k).push(en); }
  }
  const referencia = (texto) => {
    const ws = palavras(texto);
    if (ws.length < 4) return null;
    const a = new Set(ws);
    let melhor = null, nota = 0.5;
    for (const k of chave(ws)) {
      for (const en of indice.get(k) || []) {
        const b = new Set(palavras(en));
        const inter = [...a].filter((w) => b.has(w)).length;
        const j = inter / (a.size + b.size - inter);
        if (j > nota) { nota = j; melhor = en; }
      }
    }
    return melhor;
  };
  const dir = path.join(ROOT, 'dados', 'lotes');
  fs.mkdirSync(dir, { recursive: true });
  let lote = [], chars = 0, n = 0;
  const flush = () => {
    if (!lote.length) return;
    n++;
    const nome = `${fase}-${String(n).padStart(2, '0')}.json`;
    fs.writeFileSync(path.join(dir, nome), JSON.stringify(lote, null, 0).replace(/\],\[/g, '],\n['));
    lote = []; chars = 0;
  };
  let comRef = 0;
  sel.forEach((u, i) => {
    const ref = referencia(u.text);
    const item = [i, topCtx(u).replace(/^prop:/, ''), u.text];
    if (ref) { item.push(ref, feitos[ref]); comRef++; }
    lote.push(item);
    chars += u.text.length + 20 + (ref ? ref.length + feitos[ref].length : 0) / 2;
    if (chars >= maxChars) flush();
  });
  flush();
  // Índice id -> texto original, para juntar as traduções depois.
  fs.writeFileSync(path.join(dir, `${fase}-indice.json`), JSON.stringify(sel.map((u) => u.text)));
  console.log(`${sel.length} textos em ${n} lotes (${comRef} com referência de tradução antiga)`);
}

module.exports = { FASES, topCtx };
