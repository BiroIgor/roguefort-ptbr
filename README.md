# Roguefort em Português do Brasil (v0.36.0)

Tradução não oficial do **Roguefort** para português do Brasil: menus, interface, tutorial, log, itens, criaturas, diálogos e lore.

> Feita para a versão **0.36.0** do jogo. Em outras versões o patch ainda funciona, mas textos novos ou alterados ficam em inglês.

## Instalação
1. Instale o [Node.js](https://nodejs.org) (versão 22 ou superior).
2. Copie esta pasta para dentro da pasta do jogo, ao lado da pasta `resources`:
   ```
   Roguefort\
     resources\
     roguefort.exe
     Roguefort-PTBR-v0.36.0\   <- esta pasta
   ```
3. Feche o jogo e rode `APLICAR-TRADUCAO.bat`.

Na primeira vez, o script guarda uma cópia do `app.asar` original em `backup\`.

Para voltar ao inglês, use `RESTAURAR-ORIGINAL.bat`.

## Como funciona
O jogo é feito em Electron/React e não tem sistema de idiomas: os textos ficam no código JavaScript dentro de `resources\app.asar`. O script:
- lê o código com um parser JavaScript ([acorn](https://github.com/acornjs/acorn)) e identifica as strings exibidas ao jogador;
- pula strings usadas como chave ou em comparações, valores CSS e ids internos, para não quebrar a lógica do jogo;
- troca as strings pelas traduções de `dados\pt-BR.json`, valida a sintaxe de cada arquivo e reempacota o `app.asar`.

Nenhum arquivo do jogo é distribuído aqui, só o dicionário de tradução e as ferramentas.

## Arquivos
| Caminho | Conteúdo |
|---|---|
| `dados\pt-BR.json` | Dicionário inglês → português (cerca de 47 mil textos) |
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
