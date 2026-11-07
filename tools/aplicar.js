// Aplica a tradução ao jogo.
// uso:
//   node tools/aplicar.js juntar            junta os lotes traduzidos em dados/pt-BR.json
//   node tools/aplicar.js aplicar           gera resources/app.asar traduzido a partir do backup
//   node tools/aplicar.js pseudo <saida>    gera um asar de teste com textos marcados (não mexe no jogo)
//   node tools/aplicar.js restaurar         volta o app.asar original
const fs = require('fs');
const path = require('path');
const asar = require('./asar');
const { parse, splitEdges, encode } = require('./textos');
const { scan } = require('./extrair');
const { codigoNormalizador, tabelaIds } = require('./itens');

const ROOT = path.join(__dirname, '..');
const GAME_ASAR = path.join(ROOT, '..', 'resources', 'app.asar');
const ORIGINAL = path.join(ROOT, 'backup', 'app.asar.original');
const DICT = path.join(ROOT, 'dados', 'pt-BR.json');
const LOTES = path.join(ROOT, 'dados', 'lotes');
const PATCHES_FILE = path.join(ROOT, 'dados', 'patches-codigo.json');
const PATCHES = fs.existsSync(PATCHES_FILE) ? JSON.parse(fs.readFileSync(PATCHES_FILE, 'utf8')) : [];
const MATERIAIS_FILE = path.join(ROOT, 'dados', 'materiais.json');
const MATERIAIS_PT = fs.existsSync(MATERIAIS_FILE) ? JSON.parse(fs.readFileSync(MATERIAIS_FILE, 'utf8')) : {};
// Tabela id -> nome em português dos tipos base de itens, injetada no código (ASCII puro).
const BASE_FILE = path.join(ROOT, 'dados', 'nomes-base.json');
const TABELA_BASE = fs.existsSync(BASE_FILE)
  ? JSON.stringify(JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'))).replace(/[^\x20-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
  : '{}';

function juntar() {
  const dict = fs.existsSync(DICT) ? JSON.parse(fs.readFileSync(DICT, 'utf8')) : {};
  let novos = 0;
  for (const idx of fs.readdirSync(LOTES).filter((f) => f.endsWith('-indice.json'))) {
    const fase = idx.replace('-indice.json', '');
    const textos = JSON.parse(fs.readFileSync(path.join(LOTES, idx), 'utf8'));
    for (const f of fs.readdirSync(LOTES).filter((x) => x.startsWith(fase + '-') && x.endsWith('.pt.json'))) {
      const pt = JSON.parse(fs.readFileSync(path.join(LOTES, f), 'utf8'));
      for (const [id, t] of Object.entries(pt)) {
        const en = textos[Number(id)];
        if (en === undefined || typeof t !== 'string' || !t.trim()) continue;
        if (dict[en] !== t) { dict[en] = t; novos++; }
      }
    }
  }
  // Correções manuais têm prioridade sobre os lotes.
  const CORR = path.join(ROOT, 'dados', 'correcoes.json');
  if (fs.existsSync(CORR)) Object.assign(dict, JSON.parse(fs.readFileSync(CORR, 'utf8')));
  // Substituições por regex para padronizar termos dentro de frases.
  const SUBS = path.join(ROOT, 'dados', 'substituicoes.json');
  if (fs.existsSync(SUBS)) {
    const regras = JSON.parse(fs.readFileSync(SUBS, 'utf8')).map(([re, to]) => [new RegExp(re, 'g'), to]);
    for (const k of Object.keys(dict)) for (const [re, to] of regras) dict[k] = dict[k].replace(re, to);
  }
  fs.writeFileSync(DICT, JSON.stringify(dict, null, 1));
  console.log(`${novos} traduções novas/alteradas; dicionário com ${Object.keys(dict).length} textos`);
}

// A tradução pode omitir marcadores (ex.: sufixo de plural inglês "colon{1}" -> "colônia(s)"), mas não inventar novos.
const placeholdersOk = (t, en) => {
  const orig = new Set(en.match(/\{\d+\}/g) || []);
  return (t.match(/\{\d+\}/g) || []).every((p) => orig.has(p));
};

// Gera o asar traduzido em `saida` usando `traduzir(core) -> string | undefined`.
function gerar(saida, traduzir, dict = {}) {
  const files = scan(ORIGINAL);
  const repl = new Map();
  // Itens já gravados no save: renomeados em português ao carregar (ver tools/itens.js).
  const nomesBase = fs.existsSync(BASE_FILE) ? JSON.parse(fs.readFileSync(BASE_FILE, 'utf8')) : {};
  const NORMALIZADOR = codigoNormalizador(files, dict, nomesBase, MATERIAIS_PT).fn;
  const TABELA_IDS = tabelaIds(files, dict);
  let total = 0, pulados = 0;
  for (const f of files) {
    const edits = [];
    let fimAplicado = -1; // nunca aplica uma edição dentro de outra já aplicada (frase-modelo vs. pedaços)
    for (const o of f.occ) {
      if (o.start < fimAplicado) continue;
      const core = splitEdges(o.value).core;
      // Prefixo de material (prefix:"Iron" na tabela de materiais): usa a forma "de ferro", não a tradução genérica.
      const t = o.ctx === 'prop:prefix' && MATERIAIS_PT[core] && traduzir(core) !== undefined ? MATERIAIS_PT[core] : traduzir(core);
      if (t === undefined) continue;
      if (!placeholdersOk(t, core)) { pulados++; continue; }
      if (t === core) continue;
      edits.push({ start: o.start, end: o.end, code: encode(o, t) });
      fimAplicado = o.end;
      if (o.injectType) edits.push({ start: o.propStart, end: o.propStart, code: `type:${JSON.stringify(o.injectType)},` });
    }
    // Remove o "’" separado quando as duas metades da frase foram traduzidas.
    const traduzidos = new Set(edits.map((e) => e.start));
    for (const a of f.apos || []) {
      const dentro = edits.some((e) => e.start <= a.start && a.end <= e.end);
      if (!dentro && traduzidos.has(a.prev) && traduzidos.has(a.next)) edits.push({ start: a.start, end: a.end, code: '""' });
    }
    if (!edits.length) continue;
    const parts = [];
    let pos = 0;
    for (const e of edits.sort((a, b) => a.start - b.start)) {
      parts.push(f.src.slice(pos, e.start), e.code);
      pos = e.end;
    }
    parts.push(f.src.slice(pos));
    let src = parts.join('');
    // Ajustes de ordem de palavras que exigem mudar o código (regex ou busca exata; avisa se sumir após update).
    for (const p of PATCHES.filter((x) => path.basename(f.p).startsWith(x.arquivo))) {
      const re = p.regex ? new RegExp(p.regex, 'g') : null;
      const n = re ? (src.match(re) || []).length : src.split(p.de).length - 1;
      if (!n) console.warn(`aviso: patch de código não encontrado (${p.motivo})`);
      const para = p.para.split('__TABELA_BASE__').join(TABELA_BASE).split('__NORMALIZADOR_ITENS__').join(NORMALIZADOR)
        .split('__TABELA_IDS__').join(TABELA_IDS);
      src = re ? src.replace(re, para) : src.split(p.de).join(para);
    }
    try { parse(src); } catch (err) {
      const pos = err.pos || 0;
      console.error('trecho com erro:', src.slice(Math.max(0, pos - 300), pos + 120));
      throw new Error(`Erro de sintaxe após traduzir ${f.p}: ${err.message}`);
    }
    repl.set(f.p, Buffer.from(src, 'utf8'));
    total += edits.length;
  }
  // Só no build de teste: a 0.36+ remove --remote-debugging-port; reativa para tirar prints pelo cdp.js.
  if (process.env.PTBR_DEBUG) {
    const { header, base } = asar.readHeader(ORIGINAL);
    const node = asar.listFiles(header).find(([p]) => p === '/electron/main.cjs')[1];
    const main = asar.readFile(ORIGINAL, base, node).toString('utf8')
      .replace(/for \(const sw of \['remote-debugging-port'[^\n]*removeSwitch\(sw\);/, ';');
    repl.set('/electron/main.cjs', Buffer.from(main, 'utf8'));
  }
  asar.repack(ORIGINAL, saida, repl);
  console.log(`${total} trechos traduzidos em ${repl.size} arquivos (${pulados} pulados por marcador divergente) -> ${saida}`);
}

// Na primeira aplicação, guarda o app.asar original; confere se é a versão para a qual a tradução foi feita.
function garantirBackup() {
  const versao = JSON.parse(fs.readFileSync(path.join(ROOT, 'dados', 'versao.json'), 'utf8'));
  const sha = (p) => require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  if (!fs.existsSync(ORIGINAL)) {
    if (!fs.existsSync(GAME_ASAR)) throw new Error('resources\\app.asar não encontrado: coloque esta pasta dentro da pasta do jogo (ao lado de "resources").');
    fs.mkdirSync(path.dirname(ORIGINAL), { recursive: true });
    fs.copyFileSync(GAME_ASAR, ORIGINAL);
    console.log('backup do app.asar original criado em backup\\');
  }
  if (sha(ORIGINAL) !== versao.sha256_app_asar) {
    console.warn(`aviso: o app.asar não é o da versão ${versao.versao}. Textos novos ou alterados ficarão em inglês; verifique se o jogo abre normalmente.`);
  }
}

const cmd = process.argv[2];
if (cmd === 'juntar') {
  juntar();
} else if (cmd === 'aplicar') {
  garantirBackup();
  const dict = JSON.parse(fs.readFileSync(DICT, 'utf8'));
  gerar(GAME_ASAR, (core) => dict[core], dict);
} else if (cmd === 'pseudo') {
  // Sem fase: marca todos os textos encontrados (teste de segurança mais amplo).
  const fase = process.argv[4];
  const set = fase && new Set(JSON.parse(fs.readFileSync(path.join(LOTES, `${fase}-indice.json`), 'utf8')));
  const dictTeste = fs.existsSync(DICT) ? JSON.parse(fs.readFileSync(DICT, 'utf8')) : {};
  gerar(process.argv[3], (core) => (!set || set.has(core) ? 'ã·' + core : undefined), dictTeste);
} else if (cmd === 'restaurar') {
  fs.copyFileSync(ORIGINAL, GAME_ASAR);
  console.log('app.asar original restaurado');
} else {
  console.log('uso: node tools/aplicar.js juntar | aplicar | pseudo <saida.asar> | restaurar');
}
