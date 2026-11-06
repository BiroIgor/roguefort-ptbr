// Leitura e reescrita mínima do formato asar (Electron), sem dependências.
const fs = require('fs');
const crypto = require('crypto');

const BLOCK_SIZE = 4 * 1024 * 1024;

function readHeader(asarPath) {
  const fd = fs.openSync(asarPath, 'r');
  const pre = Buffer.alloc(16);
  fs.readSync(fd, pre, 0, 16, 0);
  const headerSize = pre.readUInt32LE(4);
  const jsonLen = pre.readUInt32LE(12);
  const json = Buffer.alloc(jsonLen);
  fs.readSync(fd, json, 0, jsonLen, 16);
  fs.closeSync(fd);
  return { header: JSON.parse(json.toString('utf8')), base: 8 + headerSize };
}

// Lista [caminhoInterno, nó] de todos os arquivos, na ordem do cabeçalho.
function listFiles(header) {
  const out = [];
  (function walk(node, prefix) {
    for (const [name, child] of Object.entries(node.files || {})) {
      const p = prefix + '/' + name;
      if (child.files) walk(child, p);
      else out.push([p, child]);
    }
  })(header, '');
  return out;
}

function readFile(asarPath, base, node) {
  const buf = Buffer.alloc(node.size);
  const fd = fs.openSync(asarPath, 'r');
  fs.readSync(fd, buf, 0, node.size, base + Number(node.offset));
  fs.closeSync(fd);
  return buf;
}

function integrity(buf) {
  const blocks = [];
  for (let i = 0; i < buf.length; i += BLOCK_SIZE) {
    blocks.push(crypto.createHash('sha256').update(buf.subarray(i, i + BLOCK_SIZE)).digest('hex'));
  }
  return {
    algorithm: 'SHA256',
    hash: crypto.createHash('sha256').update(buf).digest('hex'),
    blockSize: BLOCK_SIZE,
    blocks,
  };
}

// Reescreve o asar trocando o conteúdo dos arquivos em `replacements` (Map caminho -> Buffer).
function repack(srcPath, outPath, replacements = new Map()) {
  const { header, base } = readHeader(srcPath);
  const files = listFiles(header).filter(([, n]) => !n.unpacked && n.offset !== undefined);
  // Mantém a ordem física original dos dados.
  files.sort((a, b) => Number(a[1].offset) - Number(b[1].offset));
  let offset = 0;
  const plan = [];
  for (const [p, node] of files) {
    const repl = replacements.get(p);
    plan.push({ p, node, srcOffset: Number(node.offset), srcSize: node.size, repl });
    node.offset = String(offset);
    if (repl) {
      node.size = repl.length;
      if (node.integrity) node.integrity = integrity(repl);
    }
    offset += node.size;
  }
  for (const p of replacements.keys()) {
    if (!plan.some((x) => x.p === p)) throw new Error('Arquivo não encontrado no asar: ' + p);
  }

  const json = Buffer.from(JSON.stringify(header), 'utf8');
  const padded = (json.length + 3) & ~3;
  const headerPickle = Buffer.alloc(8 + padded);
  headerPickle.writeUInt32LE(4 + padded, 0);
  headerPickle.writeUInt32LE(json.length, 4);
  json.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4, 0);
  sizePickle.writeUInt32LE(headerPickle.length, 4);

  const tmp = outPath + '.tmp';
  const out = fs.openSync(tmp, 'w');
  const src = fs.openSync(srcPath, 'r');
  fs.writeSync(out, sizePickle);
  fs.writeSync(out, headerPickle);
  const chunk = Buffer.alloc(BLOCK_SIZE);
  for (const item of plan) {
    if (item.repl) { fs.writeSync(out, item.repl); continue; }
    let done = 0;
    while (done < item.srcSize) {
      const n = fs.readSync(src, chunk, 0, Math.min(BLOCK_SIZE, item.srcSize - done), base + item.srcOffset + done);
      fs.writeSync(out, chunk, 0, n);
      done += n;
    }
  }
  fs.closeSync(src);
  fs.closeSync(out);
  fs.renameSync(tmp, outPath);
}

module.exports = { readHeader, listFiles, readFile, repack };

if (require.main === module) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'identity') {
    repack(a, b);
    console.log('ok');
  } else {
    console.log('uso: node asar.js identity <origem.asar> <saida.asar>');
  }
}
