// Teste: conecta no jogo aberto com --remote-debugging-port=9333, tira print e lê o texto da tela.
// uso: node tools/cdp.js <saida.png> [esperaMs] [js-para-executar-antes]
const fs = require('fs');

async function main() {
  const [out, wait = '3000', script] = process.argv.slice(2);
  const targets = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  if (script) await send('Runtime.evaluate', { expression: script, awaitPromise: true });
  await new Promise((r) => setTimeout(r, Number(wait)));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result) fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  const txt = await send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
  console.log('--- texto na tela ---\n' + String(txt.result?.result?.value || '').slice(0, 3000));
  console.log('--- erros ---\n' + (errors.join('\n') || '(nenhum)'));
  ws.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
