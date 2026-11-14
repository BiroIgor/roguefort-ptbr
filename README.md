# Roguefort em Português do Brasil (v0.38.2)

Tradução não oficial do **Roguefort** para português do Brasil: menus, interface, tutorial, log, itens, criaturas, diálogos e lore.

> Feita para a versão **0.38.2** do jogo. Em outras versões o patch ainda funciona, mas textos novos ou alterados ficam em inglês.

## Instalação (recomendado)
1. Baixe `Traducao-Roguefort-PTBR-v0.38.2.exe` em [Releases](../../releases).
2. Feche o jogo e abra o `.exe`. Ele acha o Roguefort na Steam sozinho; se não achar, pede o caminho da pasta.
3. Escolha **1) Instalar / atualizar a tradução**. Em menos de um minuto aparece "Pronto!".

Para voltar ao inglês, abra o mesmo `.exe` e escolha **2) Restaurar o jogo original**.

Não precisa instalar nada. O `.exe` guarda uma cópia do arquivo original em `Roguefort\traducao-ptbr\backup\`. Quando a Steam atualizar o jogo, a tradução some; é só rodar o `.exe` de novo.

> O Windows pode avisar "editor desconhecido" (o `.exe` não é assinado digitalmente). Clique em **Mais informações → Executar assim mesmo**.

## Instalação alternativa (scripts, precisa do Node.js)
1. Instale o [Node.js](https://nodejs.org) (versão 22 ou superior).
2. Copie esta pasta para dentro da pasta do jogo, ao lado da pasta `resources`.
3. Feche o jogo e rode `APLICAR-TRADUCAO.bat` (ou `RESTAURAR-ORIGINAL.bat` para voltar ao inglês).

## Gerar o .exe
Na pasta `tools`: `npm install` e depois `node build-exe.js`. O arquivo sai em `tools\dist\`.

## Como funciona
O jogo é feito em Electron/React e não tem sistema de idiomas: os textos ficam no código JavaScript dentro de `resources\app.asar`. O script:
- lê o código com um parser JavaScript ([acorn](https://github.com/acornjs/acorn)) e identifica as strings exibidas ao jogador;
- pula strings usadas como chave ou em comparações, valores CSS e ids internos, para não quebrar a lógica do jogo;
- troca as strings pelas traduções de `dados\pt-BR.json`, valida a sintaxe de cada arquivo e reempacota o `app.asar`.

Nenhum arquivo do jogo é distribuído aqui, só o dicionário de tradução e as ferramentas.

## Arquivos
| Caminho | Conteúdo |
|---|---|
| `dados\pt-BR.json` | Dicionário inglês → português (cerca de 56 mil textos) |
| `dados\correcoes.json` | Correções pontuais, com prioridade sobre o dicionário |
| `dados\substituicoes.json` | Padronização de termos por regex |
| `dados\patches-codigo.json` | Ajustes no código: ordem material/item ("Espada de cobre") e nomes base dos itens |
| `dados\nomes-base.json` | Nomes em português dos tipos base de itens (sword → Espada, gloves → Luvas) |
| `dados\materiais.json` | Materiais na forma "de X" (Iron → de ferro), usados nos nomes de itens |
| `tools\itens.js` | Renomeia em português, ao carregar o save, os itens criados antes da tradução |
| `dados\glossario.md` | Glossário e guia de estilo |
| `tools\` | Extrator, aplicador e reempacotador de asar |

Detalhes técnicos e o processo para atualizar a tradução quando o jogo mudar de versão estão no [LEIA-ME.md](LEIA-ME.md).

## Limitações conhecidas
- Alguns rótulos ficam em inglês porque o próprio código usa esses valores como chave. Exemplos: Quests, Spells, Speed, períodos do dia e estações.
- Frases que o jogo monta em pedaços podem sair com gênero ou plural estranhos.

## Aviso
Projeto de fã, sem vínculo com os desenvolvedores do Roguefort. Faça backup dos seus saves antes de usar.
