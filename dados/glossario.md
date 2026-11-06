# Glossário e estilo — Roguefort em português do Brasil

Roguefort é um roguelike/colony sim de fantasia sobre fazer e curar queijos, com masmorras, colonos e guildas queijeiras.

## Estilo
- Português do Brasil, natural, de jogo. Trate o jogador por "você".
- Botões e ações curtas: infinitivo ("Salvar", "Cancelar", "Construir", "Abrir mapa").
- Títulos: só a primeira palavra e nomes próprios com maiúscula ("Modo de jogo", não "Modo De Jogo").
- Seja conciso: o texto aparece em botões e painéis estreitos. Evite ficar muito mais longo que o original.
- Preserve EXATAMENTE os marcadores `{0}`, `{1}`… (podem mudar de posição na frase, mas todos devem aparecer).
- Preserve quebras de linha (\n), teclas e atalhos (Shift+P, Esc, LMB, RMB, Tab), números, unidades, símbolos (•, →, ×, %, /), emojis.
- Muitos textos são FRAGMENTOS que o jogo concatena com outros (ex.: "is stabled.", "towards the next", "Can't build here:"). Traduza como fragmento, mantendo a pontuação final/inicial equivalente.
- Mantenha siglas e termos técnicos de jogo comuns: HP, XP, FPS, UI, Steam, Steam Deck, Discord, FAQ, Hardcore, Terroir.
- NÃO traduza nomes próprios inventados (lugares, pessoas, facções): Hearthmere, Thymerock, Brinehold, Grasse-Verdenne, Fennmarche, Siltwater, Gideon etc. Mas traduza nomes descritivos de lugares/itens compostos por palavras comuns ("The Mossy Cave" → "A Caverna Musgosa"; "Water Pouch" → "Cantil de água").

## Termos fixos
| Inglês | Português |
|---|---|
| settler(s) | colono(s) |
| colony | colônia |
| settlement | povoado |
| cheese | queijo |
| wheel (de queijo) | peça |
| curd | coalhada |
| whey | soro |
| rind | casca |
| brine / washed (rind) | salmoura / lavada |
| culture (de queijo) | cultura |
| rennet | coalho |
| vat / cheese vat | tina / tina de queijo |
| press (substantivo) | prensa |
| cellar / aging cellar | adega / adega de cura |
| affineur | afinador |
| aging / to age | maturação / maturar |
| terroir | terroir |
| guild / standing | guilda / reputação |
| mastery | maestria |
| perk | vantagem |
| upgrade | melhoria |
| recipe | receita |
| reserve (queijo) | reserva |
| dungeon | masmorra |
| delve (lugar) / to delve | incursão / explorar |
| vault | câmara |
| cave / cavern | caverna |
| pit | fosso |
| den / lair | toca / covil |
| hollow (lugar) | grota |
| cleft | fenda |
| chamber | câmara |
| fen / mire / bog | charco / lamaçal / brejo |
| tile | casa |
| stockpile | estoque |
| storage | armazenamento |
| hauler / hauling | carregador / transporte |
| supplies | suprimentos |
| goods | mercadorias |
| materials | materiais |
| timber / planks / nails | madeira / tábuas / pregos |
| fuel | combustível |
| work order / order | ordem de trabalho / ordem |
| job / task | tarefa |
| morale | moral |
| companion | companheiro |
| spell / cast | feitiço / lançar |
| damage | dano |
| armour | armadura |
| weapon | arma |
| health | vida |
| quest / quest giver | missão / quem deu a missão |
| notice board | quadro de avisos |
| Elder | Ancião |
| hearth | lareira |
| forge | forja |
| camp | acampamento |
| pack (mochila) | mochila |
| slot | espaço |
| panel | painel |
| Settings | Configurações |
| Save / Load / Quit / Resume | Salvar / Carregar / Sair / Continuar |
| Survival Mode | Modo Sobrevivência |
| the deep | as profundezas |
| Changed (criaturas mutadas) | Alterado(s) |
| craft (verbo) | fabricar |
| build / demolish / repair | construir / demolir / consertar |
| inspect | inspecionar |
| waystone / riftstone | pedra-guia / pedra-fenda |
| Mana | Mana |
| affinage | afinação |
| armoury | arsenal |
| draft / undraft (colonos) | convocar / dispensar |
| warband | bando de guerra |
| blight | praga |
| keep (lugar) | fortaleza |
| lattice / ember / bloom / brine (famílias) | treliça / brasa / floração / salmoura |
| dread | pavor |
| raid | ataque |
| town / village | vila / aldeia |
| Fortress (modo de jogo) | Fortaleza |
| The Crossing / The Wilds (modos) | A Travessia / Os Ermos |
| Level / Lv | Nível / Nv |
| Step {0} of {1} | Passo {0} de {1} |

## Consistência com o que já foi traduzido
O arquivo `dados\pt-BR.json` contém as traduções já feitas (inglês → português). Antes de traduzir nomes de itens, lugares, criaturas, habilidades ou termos recorrentes, procure-os nele (por exemplo `grep -i "\"Water Pouch\"" dados/pt-BR.json`) e reutilize a mesma tradução.
