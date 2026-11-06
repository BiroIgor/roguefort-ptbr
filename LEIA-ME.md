# Tradução PT-BR do Roguefort (v0.36.0)

## Uso
- **APLICAR-TRADUCAO.bat**: gera o `resources\app.asar` traduzido a partir do backup original.
- **RESTAURAR-ORIGINAL.bat**: devolve o jogo em inglês.
- Feche o jogo antes de rodar qualquer um dos dois. Precisa do Node.js instalado.

## Como funciona
O jogo (Electron/React) não tem sistema de idiomas: os textos estão no código JavaScript dentro de `resources\app.asar`.
- `backup\app.asar.original`: cópia intacta do jogo (SHA-256 2ea3f6f9…). Nunca é alterada.
- `dados\textos-en.json`: todos os textos exibíveis encontrados (gerado por `node tools\extrair.js`).
- `dados\pt-BR.json`: dicionário inglês → português. É o que importa preservar.
- `dados\glossario.md`: termos fixos e estilo.
- `tools\`: extrator (parser acorn), aplicador e reempacotador de asar.

O aplicador só troca strings que são texto exibido. Ele pula strings usadas como chave, em comparações e em CSS, e nomes de objetos sem id próprio (o jogo deriva ids desses nomes). Depois de traduzir, valida a sintaxe de cada arquivo.

## Atualização do jogo
Quando o jogo atualizar, o `app.asar` muda:
1. Copie o novo `resources\app.asar` para `backup\app.asar.original`.
2. `node tools\extrair.js`, depois `node tools\lotes.js fase1`: gera lotes só com os textos novos que ainda não estão no dicionário.
3. Traduza os lotes novos, rode `node tools\aplicar.js juntar` e aplique.

## Teste
`node tools\aplicar.js pseudo <saida.asar>` gera uma versão com todos os textos marcados com "ã·", para ver a cobertura e se nada quebra.
`tools\cdp.js` tira print e lê erros do jogo aberto com `roguefort.exe --remote-debugging-port=9333`.
## Status (03/11/2026)
- Versão 0.36.0 (Steam): 100% dos textos encontrados traduzidos (dicionário com 47.020 textos, 54.401 trechos aplicados).
- Ficam em inglês de propósito: valores que o código compara ou usa como chave (ex.: Quests, Spells, Speed, períodos do dia e estações).
- Quando o jogo atualizar: apague `backup\`, rode `node tools\extrair.js` e `node tools\lotes.js vXXX` (gera só os textos novos, com referência da tradução antiga), traduza os lotes, rode `node tools\aplicar.js juntar` e aplique com `APLICAR-TRADUCAO.bat`.
