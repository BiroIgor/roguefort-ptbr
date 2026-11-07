// Gera o código que renomeia em português os itens já gravados no save (o jogo guarda o nome pronto).
// O código é injetado depois da função "_decodeSave": ao carregar, cada item gerado tem o nome
// recalculado a partir das partes (baseType, material, afixos), como o jogo faz com itens novos.
const walk = require('acorn-walk');
const { parse } = require('./textos');

const keyName = (p) => (p.key.type === 'Identifier' ? p.key.name : String(p.key.value));
const strProp = (obj, k) => {
  const p = obj.properties.find((x) => x.type === 'Property' && !x.computed && keyName(x) === k);
  return p && p.value.type === 'Literal' && typeof p.value.value === 'string' ? p.value.value : null;
};

// Lê dos bundles originais as tabelas de materiais e de afixos.
function tabelas(bundles) {
  const materiais = {};
  const afixos = {};
  for (const { src } of bundles) {
    walk.simple(parse(src), {
      ObjectExpression(node) {
        // {copper:{tier:1,mult:1,prefix:"Copper",...}, ...}
        for (const p of node.properties) {
          if (p.type !== 'Property' || p.value.type !== 'ObjectExpression') continue;
          const v = p.value;
          const pre = strProp(v, 'prefix');
          const temTier = v.properties.some((x) => x.type === 'Property' && keyName(x) === 'tier');
          if (pre && temTier && !strProp(v, 'id')) materiais[keyName(p)] = pre;
        }
        // {id:"tough",name:"Tough",stats:{...},slots:[...],minLevel:1,weight:10}
        const id = strProp(node, 'id');
        const name = strProp(node, 'name');
        const tem = (k) => node.properties.some((x) => x.type === 'Property' && keyName(x) === k);
        if (id && name && tem('stats') && tem('slots') && tem('weight')) afixos[id] = name;
      },
    });
  }
  return { materiais, afixos };
}

function codigoNormalizador(bundles, dict, nomesBase, materiaisPt = {}) {
  const { materiais, afixos } = tabelas(bundles);
  const tr = (s) => (s && dict[s]) || s;
  const MAT = {};
  for (const [id, en] of Object.entries(materiais)) MAT[id] = materiaisPt[en] || tr(en);
  const AFX = {};
  const AFX_EN = {};
  for (const [id, en] of Object.entries(afixos)) { AFX[id] = tr(en); AFX_EN[en] = tr(en); }
  const dados = JSON.stringify({ MAT, AFX, AFX_EN, BASE: nomesBase });
  // Função pura: recebe o objeto do save, devolve o mesmo objeto com nomes de itens em português.
  const fn = `(function(D){var MAT=D.MAT,AFX=D.AFX,AFX_EN=D.AFX_EN,BASE=D.BASE;
function afixo(it,tipo){var a=(it.affixes||[]).filter(function(x){return x&&x.type===tipo})[0];
if(a&&AFX[a.id])return AFX[a.id];var s=it[tipo];return s?(AFX_EN[s]||s):"";}
function fix(it){if(!it||typeof it!=="object"||typeof it.baseType!=="string"||typeof it.material!=="string")return;
if(!BASE[it.baseType]||!MAT[it.material]||it.legendaryId||it.setId||it.cursed)return;
var base=BASE[it.baseType]+" "+MAT[it.material],pre=afixo(it,"prefix"),suf=afixo(it,"suffix");
if(/^(de|do|da|dos|das) /.test(pre)){suf=[pre,suf].filter(Boolean).join(" ");pre="";}
var full=[pre,base,suf].filter(Boolean).join(" ");
if(typeof it.fullName==="string")it.fullName=full;if(typeof it.unidentifiedName==="string")it.unidentifiedName=base;
if(typeof it.name==="string")it.name=it.identified===false?base:full;}
function visit(o,d){if(!o||typeof o!=="object"||d>40)return;if(Array.isArray(o)){for(var i=0;i<o.length;i++)visit(o[i],d+1);return}
fix(o);for(var k in o)if(Object.prototype.hasOwnProperty.call(o,k)){var v=o[k];if(v&&typeof v==="object")visit(v,d+1)}}
return function(save){try{visit(save,0)}catch(e){}return save}})(${dados})`;
  return { fn: fn.replace(/\n/g, '').replace(/[^\x20-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')), materiais, afixos };
}

// Tabela id -> nome em português (minúsculo), para telas que mostram o id do item ("fox_pelt" -> "fox pelt").
function tabelaIds(bundles, dict) {
  const ids = {};
  const add = (id, name) => {
    if (!/^[a-z][a-z0-9_]*$/.test(id) || !name || !dict[name] || ids[id]) return;
    ids[id] = dict[name].toLowerCase();
  };
  for (const { src } of bundles) {
    walk.simple(parse(src), {
      ObjectExpression(node) {
        add(strProp(node, 'id'), strProp(node, 'name')); // {id:"fox_pelt", name:"Fox Pelt"}
        for (const p of node.properties) { // {fox_pelt:{name:"Fox Pelt", ...}}
          if (p.type === 'Property' && !p.computed && p.value.type === 'ObjectExpression') add(keyName(p), strProp(p.value, 'name'));
        }
      },
    });
  }
  return JSON.stringify(ids).replace(/[^\x20-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

module.exports = { codigoNormalizador, tabelas, tabelaIds };
