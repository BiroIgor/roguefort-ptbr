// Encontra, nos bundles JS do jogo, as strings que são texto exibido ao jogador.
const acorn = require('acorn');
const walk = require('acorn-walk');

// Propriedades cujo valor nunca é texto para o jogador (ids, CSS, caminhos, metadados).
const SKIP_PROPS = new Set([
  'id', 'key', 'type', 'kind', 'className', 'class', 'src', 'href', 'path', 'file', 'url', 'icon',
  'canon', 'notes', 'source', 'event', 'role', 'mode', 'variant', 'slot', 'family', 'stat', 'tag',
  'padding', 'margin', 'border', 'borderTop', 'borderBottom', 'borderLeft', 'borderRight', 'boxShadow',
  'textShadow', 'transform', 'transition', 'animation', 'background', 'backgroundColor', 'color',
  'font', 'fontFamily', 'fontSize', 'fontWeight', 'gridTemplateColumns', 'gridTemplateRows',
  'gridTemplateAreas', 'gridArea', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight',
  'maxHeight', 'inset', 'outline', 'filter', 'backdropFilter', 'clipPath', 'mask', 'cursor',
  'lineHeight', 'letterSpacing', 'flex', 'gap', 'top', 'left', 'right', 'bottom', 'position',
  'display', 'alignItems', 'justifyContent', 'textAlign', 'whiteSpace', 'overflow', 'zIndex',
  'borderRadius', 'boxSizing', 'imageRendering', 'objectFit', 'transformOrigin', 'willChange',
  'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom',
  'marginLeft', 'marginRight', 'outlineOffset', 'borderColor', 'borderWidth', 'borderStyle',
  'textTransform', 'fontVariant', 'pointerEvents', 'userSelect', 'opacity', 'dangerouslySetInnerHTML',
  'd', 'viewBox', 'fill', 'stroke', 'points', 'shape', 'easing', 'channel', 'sound', 'sfx', 'music',
]);

// Chamadas cujos argumentos são técnicos (log, erros internos, DOM, comparações de string).
const SKIP_CALLS = /^(console\.|.*\.(includes|indexOf|lastIndexOf|startsWith|endsWith|has|get|getItem|setItem|removeItem|querySelector|querySelectorAll|getElementById|setAttribute|getAttribute|addEventListener|removeEventListener|postMessage|split|replace|replaceAll|match|matchAll|test|localeCompare|send|invoke|on|once|emit|delete|setProperty|getPropertyValue|createElement|fetch|require|warn|error|log|debug|info|trace|mark|measure)$|fetch$|require$|RegExp$|Symbol$|Error$|TypeError$|RangeError$|import$)/;

const ID_KEYS = new Set(['id', 'type', 'key', 'spriteKey']);
const JSX_TEXT_PROPS = new Set(['label', 'title', 'text', 'heading', 'header', 'placeholder', 'tooltip',
  'hint', 'subtitle', 'caption', 'description', 'summary', 'message', 'emptyText', 'confirmLabel', 'cancelLabel']);
// Destinos que vão direto para a tela: podem ser traduzidos mesmo se o valor for comparado em outro ponto.
const RENDER_SINK = /^prop:(children|aria-label|data-tip|placeholder)$|^uicall:|^jsxprop:|^idlabel:/;
const CREATURE_KEYS =new Set(['health', 'hp', 'maxHealth', 'damage', 'attack']);
const UI_CALL_PROPS =new Set(['children', 'data-tip', 'title', 'aria-label', 'label']);

function calleeName(node) {
  if (!node) return '';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const prop = node.computed ? '[]' : node.property.name;
    return calleeName(node.object) + '.' + prop;
  }
  if (node.type === 'Import') return 'import';
  return '?';
}

function keyName(prop) {
  if (prop.computed) return '[]';
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'Literal') return String(prop.key.value);
  return '?';
}

// Sobe pelos nós "transparentes" e devolve o contexto que decide se a string é exibível.
function contextOf(ancestors) {
  for (let i = ancestors.length - 2; i >= 0; i--) {
    const node = ancestors[i];
    const child = ancestors[i + 1];
    switch (node.type) {
      case 'ConditionalExpression':
        if (child === node.test) return { ctx: 'test', unsafe: true };
        continue;
      case 'LogicalExpression':
      case 'ArrayExpression':
      case 'SequenceExpression':
      case 'ParenthesizedExpression':
      case 'SpreadElement':
      case 'TemplateLiteral':
        continue;
      case 'BinaryExpression':
        if (node.operator === '+') continue;
        if (/^[=!]==?$|^in$|^instanceof$/.test(node.operator)) return { ctx: 'cmp', unsafe: true };
        return { ctx: 'bin' + node.operator, unsafe: true };
      case 'SwitchCase':
        return { ctx: 'case', unsafe: true };
      case 'MemberExpression':
        return { ctx: 'member', unsafe: true };
      case 'Property': {
        if (child === node.key) return { ctx: 'key', unsafe: true };
        const k = keyName(node);
        // O jogo deriva ids do nome (name.toLowerCase().replace(/\s+/g,"_")) quando o objeto não tem id próprio.
        if (k === 'name') {
          const obj = ancestors[i - 1];
          const hasId = obj && obj.type === 'ObjectExpression' && obj.properties.some(
            (p) => p.type === 'Property' && ID_KEYS.has(keyName(p)));
          if (!hasId) {
            const props = obj && obj.type === 'ObjectExpression' ? obj.properties : [];
            const hasSpread = props.some((p) => p.type === 'SpreadElement');
            const isCreature = props.some((p) => p.type === 'Property' && CREATURE_KEYS.has(keyName(p)));
            return { ctx: 'name-sem-id', propStart: node.start, hasSpread: hasSpread || !isCreature };
          }
        }
        const obj = ancestors[i - 1];
        const call = ancestors[i - 2];
        // Prop de texto de um componente React: jsx(Comp, {label:"Hunger"}) vai direto para a tela.
        if (JSX_TEXT_PROPS.has(k) && call && call.type === 'CallExpression' && call.arguments[1] === obj
          && /(^|\.)jsxs?$/.test(calleeName(call.callee))) return { ctx: 'jsxprop:' + k };
        // Rótulo de um objeto que já tem id próprio ({id:"armor", label:"Armour"}): é só exibição.
        if ((k === 'label' || k === 'title') && obj && obj.type === 'ObjectExpression'
          && obj.properties.some((p) => p.type === 'Property' && keyName(p) === 'id')) return { ctx: 'idlabel:' + k };
        return { ctx: 'prop:' + k };
      }
      case 'CallExpression':
      case 'NewExpression': {
        if (child === node.callee) return { ctx: 'callee', unsafe: true };
        // Chamada auxiliar usada direto como conteúdo de interface: children:[eP("Items")], "data-tip":IU("Items","[I]").
        for (let j = i - 1; j >= 0; j--) {
          const up = ancestors[j];
          if (['ArrayExpression', 'ConditionalExpression', 'LogicalExpression'].includes(up.type)) continue;
          if (up.type === 'Property' && UI_CALL_PROPS.has(keyName(up))) return { ctx: 'uicall:' + calleeName(node.callee) };
          break;
        }
        return { ctx: 'call:' + calleeName(node.callee) };
      }
      case 'TaggedTemplateExpression':
        return { ctx: 'tagged', unsafe: true };
      case 'ExpressionStatement':
        // Diretivas ("use strict") e expressões soltas não são texto.
        return { ctx: 'stmt', unsafe: true };
      case 'ReturnStatement':
        return { ctx: 'return' };
      case 'ArrowFunctionExpression':
        return { ctx: 'arrow' };
      case 'VariableDeclarator':
        return { ctx: 'var' };
      case 'AssignmentExpression':
        return { ctx: 'assign:' + calleeName(node.left) };
      case 'AssignmentPattern':
        return { ctx: 'default' };
      case 'ImportDeclaration':
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
      case 'ImportExpression':
        return { ctx: 'import', unsafe: true };
      default:
        return { ctx: node.type };
    }
  }
  return { ctx: 'top' };
}

// O valor parece frase/rótulo em inglês (e não id, CSS, caminho ou código)?
function looksLikeText(value) {
  const t = value.trim();
  if (t.length < 2 || t.length > 4000) return false;
  if (!/[a-z]/.test(t)) return false;
  // Valores CSS: variáveis, calc(), pilhas de fontes.
  if (/var\(--|calc\(|\bpx\b|(^|,\s*)(monospace|sans-serif|serif|system-ui|cursive|inherit)\s*(,|$)|^['"][^'"]*(['"]|$)\s*(,|$)|Flexi IBM|IBM Plex|Plex Mono|Fusion Pixel|Atkinson Hyperlegible/.test(t)) return false;
  if (/[{}<>;=\\]|=>|\$\(|^\.|\.(png|jpe?g|webp|mp3|ogg|wav|json|js|css|html|md)\b|https?:|\b\d+(px|ms|deg|vh|vw|rem|em)\b|rgba?\(|#[0-9a-fA-F]{3,8}\b|^[a-z0-9]+([_\-.:/][a-z0-9]+)+$|^[a-z]+[A-Z]\w*$/.test(t.replace(/\{\d+\}/g, ''))) return false;
  if (/\s/.test(t)) return /[A-Za-z]{2,}.*[\s].*[A-Za-z]/.test(t) || /^[A-Z]/.test(t);
  // Palavra única: só quando começa com maiúscula (ex.: "Cancel", "Inventory").
  return /^[A-Z][a-zA-Z'’-]+[.!?:…]*$/.test(t);
}

// Contextos onde uma palavra única é aceita (rótulos de interface).
const SINGLE_WORD_OK = /^uicall:|^jsxprop:|^idlabel:|^prop:(group|term|adj|rarityName|prefix|word|short|pad|he|she|they|healer|rank|role_label|children|label|title|name|text|header|heading|tooltip|caption|placeholder|desc|description|hint|tip|action|section|button|cta|confirm|cancel|subtitle|summary|status|tab|category|categoryLabel|shortLabel|verb|noun)$/;

function parse(src) {
  return acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true });
}

// Coleta ocorrências de texto e valores usados como chave/comparação num bundle.
function collect(src) {
  const ast = parse(src);
  const occ = [];
  const unsafeValues = new Set();
  const keys = new Set();
  const apos = [];

  const handle = (node, ancestors, value, exprs) => {
    const { ctx, unsafe, propStart, hasSpread } = contextOf(ancestors);
    if (unsafe) { unsafeValues.add(value.trim()); return; }
    if (ctx.startsWith('prop:') && SKIP_PROPS.has(ctx.slice(5))) return;
    if (/^(ui)?call:/.test(ctx) && SKIP_CALLS.test(ctx.replace(/^(ui)?call:/, ''))) return;
    if (ctx === 'import') return;
    // Títulos em MAIÚSCULAS ("CHARACTER STATS") só são aceitos quando vão direto para a tela.
    const caps = RENDER_SINK.test(ctx) && /^[A-Z][A-Z' ’&·:,.!?()/-]*[A-Z.!?:)]$/.test(value.trim())
      && (value.match(/[A-Z]/g) || []).length >= 3;
    if (!caps && !looksLikeText(value)) return;
    if (!caps && !/\s/.test(value.trim()) && !SINGLE_WORD_OK.test(ctx)) return;
    if (ctx === 'name-sem-id') {
      // O jogo deriva o id do nome; ao traduzir, o patch injeta type:"<id original>" no objeto.
      if (hasSpread || exprs || !/\s/.test(value.trim())) return;
      occ.push({ start: node.start, end: node.end, value, exprs, ctx, propStart, injectType: slugOf(value) });
      return;
    }
    occ.push({ start: node.start, end: node.end, value, exprs, ctx });
  };

  walk.ancestor(ast, {
    // ["or don", "’", "t come back."]: o apóstrofo separado sobra no meio da frase traduzida.
    ArrayExpression(node) {
      const el = node.elements;
      for (let i = 1; i < el.length - 1; i++) {
        const isStr = (n) => n && n.type === 'Literal' && typeof n.value === 'string';
        if (isStr(el[i]) && /^['’]$/.test(el[i].value) && isStr(el[i - 1]) && isStr(el[i + 1])) {
          apos.push({ start: el[i].start, end: el[i].end, prev: el[i - 1].start, next: el[i + 1].start });
        }
      }
    },
    Property(node) {
      const k = !node.computed && (node.key.type === 'Identifier' ? node.key.name : node.key.value);
      if (typeof k === 'string' && /^[a-z][a-z0-9_]*$/.test(k)) keys.add(k);
    },
    Literal(node, _state, ancestors) {
      if (typeof node.value !== 'string') return;
      handle(node, ancestors, node.value, null);
    },
    TemplateLiteral(node, _state, ancestors) {
      if (ancestors.length >= 2 && ancestors[ancestors.length - 2].type === 'TaggedTemplateExpression') return;
      if (node.quasis.some((q) => q.value.cooked == null)) return;
      let value = '';
      const exprs = [];
      node.quasis.forEach((q, i) => {
        value += q.value.cooked.replace(/[{}]/g, (c) => (c === '{' ? '\u0001' : '\u0002'));
        if (i < node.expressions.length) {
          value += '{' + i + '}';
          const e = node.expressions[i];
          exprs.push(src.slice(e.start, e.end));
        }
      });
      if (/[\u0001\u0002]/.test(value)) return; // chaves literais: deixa como está
      handle(node, ancestors, value, exprs);
    },
  });
  return { occ, unsafeValues, keys, apos };
}

// Mesma regra do jogo: name.toLowerCase().replace(/\s+/g,"_").
const slugOf = (name) => name.toLowerCase().replace(/\s+/g, '_');

// Mantém espaços nas pontas fora da tradução.
function splitEdges(value) {
  const m = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return { lead: m[1], core: m[2], trail: m[3] };
}

function escapeChar(c) {
  const code = c.charCodeAt(0);
  return '\\u' + code.toString(16).padStart(4, '0');
}

// Gera o literal JS para o texto traduzido (ASCII puro, acentos como \uXXXX).
function encode(occ, translatedCore) {
  const { lead, trail } = splitEdges(occ.value);
  const text = lead + translatedCore + trail;
  if (!occ.exprs) {
    return JSON.stringify(text).replace(/[^\x20-\x7e]/g, escapeChar);
  }
  let out = '`';
  const parts = text.split(/(\{\d+\})/);
  for (const part of parts) {
    const m = part.match(/^\{(\d+)\}$/);
    if (m && Number(m[1]) < occ.exprs.length) {
      out += '${' + occ.exprs[Number(m[1])] + '}';
    } else {
      out += part.replace(/[\\`]/g, (c) => '\\' + c).replace(/\$\{/g, '\\${')
        .replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/[^\x20-\x7e]/g, escapeChar);
    }
  }
  return out + '`';
}

module.exports = { collect, parse, splitEdges, encode, RENDER_SINK };
