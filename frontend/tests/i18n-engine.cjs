const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const catalog=require('../src/locales/interface.json');
let source=fs.readFileSync(require.resolve('../src/i18n.js'),'utf8').replace(/^import .*;\r?\n/gm,'');
const start=source.indexOf('const I18nContext =');
const end=source.indexOf('export const useI18n =');
source=source.slice(0,start)+source.slice(source.indexOf(';',end)+1);
source=source.replace(/export /g,'');
function engine(language){return vm.runInNewContext(source+';({translate,translateSystemText,translateApiError,getLanguage})',{interfaceMessages:catalog,localStorage:{getItem:()=>language}});}

test('translated system templates keep their data across language changes',()=>{
 const es=engine('es');
 assert.equal(es.translateSystemText('Up to 8 file(s)'), 'Hasta 8 archivo(s)');
 assert.equal(es.translateSystemText('Alex comentou no seu problema'),'Alex comentó en tu problema');
 assert.equal(es.translateSystemText('Alex commented on your problem'),'Alex comentó en tu problema');
 assert.equal(es.translateSystemText('Status changed to Open'),'Estado cambiado a Abierto');
 assert.equal(es.translateSystemText('5 file(s): Rua.png'),'5 archivo(s): Rua.png');
});
test('invalid locales fall back and unknown API errors use a localized message',()=>{
 assert.equal(engine('unknown').getLanguage(),'pt-BR');
 for(const lang of ['pt-BR','en','es'])assert.equal(engine(lang).translateApiError('Unrecognized server diagnostic'),catalog[lang].requestFailed);
});
test('ordinary content and interpolation values are preserved',()=>{
 const en=engine('en');
 assert.equal(en.translateSystemText('Texto livre do sistema legado'),'Texto livre do sistema legado');
 assert.equal(en.translate('Remover {name}',{name:'São Paulo {file}.png'}),'Remove São Paulo {file}.png');
});

test('Portuguese navigation instructions do not retain English copy',()=>{
 assert.equal(engine('pt-BR').translate('SCROLL'),'DESLIZE');
 assert.equal(engine('pt-BR').translate('SCROLL / EXPLORE'),'DESLIZE / EXPLORE');
});

test('follow relationship labels and backend notification keys use the shared catalogs',async()=>{
 const {followButtonKey}=await import('../src/utils/social.js');
 for(const lang of ['pt-BR','en','es']){
  const i18n=engine(lang);
  for(const relation of [null,{pending:true},{following:true},{followedBy:true},{following:true,followedBy:true,mutual:true}]){
   const key=followButtonKey(relation);assert.notEqual(i18n.translate(key),key);
  }
  for(const key of ['followRequestTitle','followAcceptedTitle','newFollowerTitle','chatLimitReached'])assert.equal(i18n.translateSystemText(key),catalog[lang][key]);
 }
});
