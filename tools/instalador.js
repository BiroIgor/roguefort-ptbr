// Instalador da tradução PT-BR do Roguefort (vira um .exe único com tools/build-exe.js).
// Acha o jogo, guarda o app.asar original e aplica/restaura a tradução.
// Parâmetros opcionais: --aplicar | --restaurar   --jogo "<pasta do jogo>"   --sem-pausa
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');

// Dados embutidos no .exe (o esbuild inclui estes JSON no arquivo final).
globalThis.__PTBR_DADOS = {
  'pt-BR': require('../dados/pt-BR.json'),
  'patches-codigo': require('../dados/patches-codigo.json'),
  materiais: require('../dados/materiais.json'),
  'nomes-base': require('../dados/nomes-base.json'),
  versao: require('../dados/versao.json'),
};
const { gerar } = require('./aplicar');
const asar = require('./asar');

const args = process.argv.slice(2);
const opc = (n) => args.includes(n);
const valor = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const VERSAO = globalThis.__PTBR_DADOS.versao;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const perguntar = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));
const pausar = async () => { if (!opc('--sem-pausa')) await perguntar('\nPressione Enter para sair...'); };

const ehJogo = (dir) => dir && fs.existsSync(path.join(dir, 'resources', 'app.asar')) && fs.existsSync(path.join(dir, 'roguefort.exe'));

// Bibliotecas da Steam: caminho do registro + libraryfolders.vdf.
function pastasSteam() {
  const raizes = new Set(['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam']);
  try {
    const out = execSync('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (m) raizes.add(m[1].trim().replace(/\//g, '\\'));
  } catch { /* sem Steam no registro */ }
  const libs = new Set();
  for (const r of raizes) {
    libs.add(r);
    const vdf = path.join(r, 'steamapps', 'libraryfolders.vdf');
    if (!fs.existsSync(vdf)) continue;
    for (const m of fs.readFileSync(vdf, 'utf8').matchAll(/"path"\s+"([^"]+)"/g)) libs.add(m[1].replace(/\\\\/g, '\\'));
  }
  return [...libs].map((l) => path.join(l, 'steamapps', 'common', 'Roguefort'));
}

async function acharJogo() {
  const dado = valor('--jogo');
  if (dado) return ehJogo(dado) ? dado : null;
  // 1) .exe colocado dentro da pasta do jogo (ou numa subpasta dela)
  let d = path.dirname(process.execPath);
  for (let i = 0; i < 3; i++, d = path.dirname(d)) if (ehJogo(d)) return d;
  // 2) bibliotecas da Steam
  for (const p of pastasSteam()) if (ehJogo(p)) return p;
  // 3) perguntar
  console.log('Não encontrei o Roguefort automaticamente.');
  for (;;) {
    const p = (await perguntar('Cole o caminho da pasta do jogo (onde fica roguefort.exe), ou deixe vazio para sair: ')).replace(/^"|"$/g, '');
    if (!p) return null;
    if (ehJogo(p)) return p;
    console.log('Essa pasta não tem roguefort.exe e resources\\app.asar. Tente de novo.');
  }
}

const jogoAberto = () => {
  try { return /roguefort\.exe/i.test(execSync('tasklist /FI "IMAGENAME eq roguefort.exe"', { encoding: 'utf8' })); } catch { return false; }
};
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

// O app.asar já tem esta tradução? (o normalizador de itens só existe no arquivo traduzido)
function ehTraduzido(asarPath) {
  const { header, base } = asar.readHeader(asarPath);
  return asar.listFiles(header).some(([p, n]) => /^\/dist\/assets\/index-[^/]+\.js$/.test(p)
    && asar.readFile(asarPath, base, n).toString('utf8').includes('AFX_EN'));
}

function caminhos(jogo) {
  const pasta = path.join(jogo, 'traducao-ptbr', 'backup');
  return { atual: path.join(jogo, 'resources', 'app.asar'), backup: path.join(pasta, 'app.asar.original'), pasta };
}

function aplicar(jogo) {
  const c = caminhos(jogo);
  if (ehTraduzido(c.atual)) {
    if (!fs.existsSync(c.backup)) {
      console.log('O jogo já está traduzido, mas o backup do original sumiu.');
      console.log('Na Steam: botão direito no Roguefort > Propriedades > Arquivos instalados > Verificar integridade. Depois rode de novo.');
      return false;
    }
    console.log('Tradução já instalada: vou reaplicar a partir do backup do original.');
  } else {
    // Arquivo original (instalação nova ou jogo atualizado pela Steam): vira o backup.
    fs.mkdirSync(c.pasta, { recursive: true });
    fs.copyFileSync(c.atual, c.backup);
    console.log('Backup do original salvo em traducao-ptbr\\backup\\.');
  }
  if (sha256(c.backup) !== VERSAO.sha256_app_asar) {
    console.log(`Aviso: esta tradução foi feita para a versão ${VERSAO.versao} do jogo. Textos novos ou alterados ficarão em inglês.`);
  }
  console.log('Traduzindo (pode levar até um minuto)...');
  const dict = globalThis.__PTBR_DADOS['pt-BR'];
  const r = gerar(c.atual, (core) => dict[core], dict, c.backup);
  console.log(`\nPronto! ${r.total} textos traduzidos. Pode abrir o jogo pela Steam.`);
  return true;
}

function restaurar(jogo) {
  const c = caminhos(jogo);
  if (!fs.existsSync(c.backup)) {
    console.log('Não há backup do original. Se o jogo estiver traduzido, use "Verificar integridade dos arquivos" na Steam.');
    return false;
  }
  fs.copyFileSync(c.backup, c.atual);
  console.log('Pronto! O jogo voltou ao original em inglês.');
  return true;
}

async function main() {
  console.log(`=== Tradução PT-BR do Roguefort (feita para a v${VERSAO.versao}) ===\n`);
  const jogo = await acharJogo();
  if (!jogo) { console.log('Jogo não encontrado. Nada foi alterado.'); return pausar(); }
  console.log(`Jogo encontrado em: ${jogo}\n`);
  let escolha = opc('--aplicar') ? '1' : opc('--restaurar') ? '2' : null;
  if (!escolha) {
    console.log('  1) Instalar / atualizar a tradução');
    console.log('  2) Restaurar o jogo original (inglês)');
    console.log('  0) Sair');
    escolha = await perguntar('\nEscolha: ');
  }
  if (escolha !== '1' && escolha !== '2') return pausar();
  while (jogoAberto()) {
    if (opc('--sem-pausa')) { console.log('Feche o Roguefort antes de continuar.'); return; }
    await perguntar('O Roguefort está aberto. Feche o jogo e pressione Enter...');
  }
  try {
    if (escolha === '1') aplicar(jogo); else restaurar(jogo);
  } catch (e) {
    console.log('\nErro: ' + e.message + '\nO jogo não foi alterado.');
  }
  return pausar();
}

main().finally(() => rl.close());
