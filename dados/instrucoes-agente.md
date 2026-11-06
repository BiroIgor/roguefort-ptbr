# Instruções para tradução de lotes

Você traduz textos do jogo Roguefort (roguelike/colony sim de fantasia sobre queijos) do inglês para português do Brasil.
Pasta base: C:\Program Files (x86)\Steam\steamapps\common\Roguefort\traducao-ptbr

1. Leia `dados\glossario.md` e siga-o à risca (inclusive a seção de consistência: consulte `dados\pt-BR.json` para reutilizar traduções de nomes e termos já traduzidos).
2. Cada lote `dados\lotes\<nome>.json` é um array JSON de [id, contexto, textoEmIngles] ou [id, contexto, textoEmIngles, inglêsAntigo, traduçãoAntiga]. Os dois últimos campos, quando existem, são a versão anterior desse texto no jogo e sua tradução já aprovada: reaproveite a tradução antiga e ajuste só o que mudou no inglês (mesmos termos e estilo). O contexto indica de onde vem o texto (name/label/title/children = interface; desc/description = descrição; call:x/var/return/arrow = mensagens montadas no código, geralmente log ou avisos). Textos vizinhos costumam ser relacionados: use isso como contexto.
3. Para cada lote, escreva `dados\lotes\<nome>.pt.json`: um único objeto JSON {"id": "tradução", ...} com TODOS os ids do lote. Se ficar grande demais para uma escrita, divida em partes e junte com um script node temporário (apague-o depois).
4. Valide cada lote e corrija até dar OK: `node tools\validar.js dados\lotes\<nome>.json`

Regras críticas:
- Preserve exatamente os marcadores {0}, {1}… (pode reordenar), quebras de linha, teclas/atalhos e a pontuação/espaço de borda dos fragmentos.
- Muitos textos são FRAGMENTOS concatenados pelo jogo com nomes ou números ("You found", "is stabled.", "towards the next"). Traduza como fragmento que encaixe numa frase portuguesa natural.
- Não traduza nomes próprios inventados; traduza nomes descritivos.
- Seja conciso. Não deixe nada em inglês, exceto nomes próprios/siglas previstos.
- Não modifique nenhum arquivo além dos seus .pt.json.

Ao terminar, responda em no máximo 4 linhas: textos por lote, resultado da validação, e só as dúvidas de terminologia realmente relevantes.
