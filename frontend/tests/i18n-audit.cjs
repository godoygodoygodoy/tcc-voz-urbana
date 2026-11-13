const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const parser=require('@babel/parser');
const traverse=require('@babel/traverse').default;
const root=path.resolve(__dirname,'../src');
const source=fs.readFileSync(path.join(root,'i18n.js'),'utf8');
const ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
let core;
traverse(ast,{VariableDeclarator(p){if(p.node.id.name==='translations')core=vm.runInNewContext('('+source.slice(p.node.init.start,p.node.init.end)+')');}});
const extra=require('../src/locales/interface.json');
for(const [language,values]of Object.entries(extra))for(const [key,value]of Object.entries(values))assert.doesNotMatch(value,/[A-Za-zÀ-ž]\?+[A-Za-zÀ-ž]|\uFFFD/u,`${language}.${key}: corrupted text encoding`);
const catalogs=Object.fromEntries(['pt-BR','en','es'].map(lang=>[lang,{...core[lang],...extra[lang]}]));
for(const lang of ['en','es'])assert.deepEqual(Object.keys(catalogs[lang]).sort(),Object.keys(catalogs['pt-BR']).sort(),`${lang}: catalog keys`);
const failures=[];
const exempt=/^(Voz Urbana|VOZ URBANA|VOZ|Voz|URBANA|VU|Feed|WhatsApp|© OpenStreetMap contributors|Christmas Version|[\d\s.,()+#@:/—×✓-]+)$/;
for(const file of fs.readdirSync(root,{recursive:true}).filter(file=>/\.(js|jsx)$/.test(file)&&file!=='i18n.js')){
 const code=fs.readFileSync(path.join(root,file),'utf8');
 traverse(parser.parse(code,{sourceType:'module',plugins:['jsx']}),{
  JSXText(p){const text=p.node.value.replace(/\s+/g,' ').trim();if(/[A-Za-zÀ-ž]/.test(text)&&!exempt.test(text))failures.push(`${file}:${p.node.loc.start.line}: untranslated JSX text: ${text}`);},
  JSXAttribute(p){if(!['placeholder','aria-label','title','description','label','detail','count','alt'].includes(p.node.name.name))return;const text=p.node.value?.value;if(typeof text==='string'&&/[A-Za-zÀ-ž]/.test(text)&&!exempt.test(text)&&!/^Ex: -[\d.]+$/.test(text))failures.push(`${file}:${p.node.loc.start.line}: untranslated attribute: ${text}`);},
  CallExpression(p){if(!['t','_tr','tr','translate'].includes(p.node.callee.name))return;const key=p.node.arguments[0];if(key?.type==='StringLiteral'&&!catalogs['pt-BR'][key.value])failures.push(`${file}:${p.node.loc.start.line}: missing translation key: ${key.value}`);},
 });
}
assert.deepEqual(failures,[],'Internationalization audit');
console.log(`i18n audit passed: ${Object.keys(catalogs['pt-BR']).length} keys × 3 languages; JSX text, attributes and literal translation calls checked.`);
