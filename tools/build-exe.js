// Gera o instalador .exe (Node "Single Executable Application").
// uso (na pasta tools): npm install && node build-exe.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIST = path.join(__dirname, 'dist');
const versao = require('../dados/versao.json').versao;
const EXE = path.join(DIST, `Traducao-Roguefort-PTBR-v${versao}.exe`);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);

// 1) Um único arquivo JS com o parser e o dicionário embutidos.
require('esbuild').buildSync({
  entryPoints: [path.join(__dirname, 'instalador.js')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: true,
  outfile: path.join(DIST, 'instalador.cjs'),
});

// 2) Blob da aplicação e cópia do node.exe com o blob injetado.
fs.writeFileSync(path.join(DIST, 'sea-config.json'), JSON.stringify({
  main: path.join(DIST, 'instalador.cjs'),
  output: path.join(DIST, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
}));
execFileSync(process.execPath, ['--experimental-sea-config', path.join(DIST, 'sea-config.json')], { stdio: 'inherit' });
fs.copyFileSync(process.execPath, EXE);
execFileSync(process.execPath, [require.resolve('postject/dist/cli.js'), EXE, 'NODE_SEA_BLOB', path.join(DIST, 'sea-prep.blob'),
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'], { stdio: 'inherit' });

console.log(`\nGerado: ${EXE} (${(fs.statSync(EXE).size / 1048576).toFixed(1)} MB)`);
