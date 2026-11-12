const fs=require('fs'),path=require('path');const parser=require('../frontend/node_modules/@babel/parser');const traverse=require('../frontend/node_modules/@babel/traverse').default;
const catalog=require('../frontend/src/locales/interface.json')['pt-BR'];
const files=fs.readdirSync('frontend/src',{recursive:true}).filter(f=>/\.(js|jsx)$/.test(f)&&f!=='i18n.js').map(f=>'frontend/src/'+f.replaceAll('\\','/'));
for(const file of files){let src=fs.readFileSync(file,'utf8'),edits=[];const ast=parser.parse(src,{sourceType:'module',plugins:['jsx']});const add=(n,s)=>edits.push([n.start,n.end,s]);let changed=false;
traverse(ast,{JSXText(p){const raw=p.node.value,s=raw.replace(/\s+/g,' ').trim();if(catalog[s]){add(p.node,( /^\s/.test(raw)?' ':'' )+'{_tr('+JSON.stringify(s)+')}' + (/\s$/.test(raw)?' ':''));changed=true;}},StringLiteral(p){const s=p.node.value;if(!catalog[s])return;const a=p.parent;
if(a.type==='ImportDeclaration'||a.type==='ExportNamedDeclaration'||a.type==='ImportSpecifier'||(a.type==='CallExpression'&&['t','_tr'].includes(a.callee.name))||((a.type==='ObjectProperty'||a.type==='ObjectMethod')&&p.key==='key')||a.type==='BinaryExpression'||a.type==='SwitchCase')return;
if(a.type==='JSXAttribute'&&!['placeholder','title','alt','aria-label','label','detail','count'].includes(a.name.name))return;
if(!p.getFunctionParent())return; // Static arrays retain translation keys, resolved when rendered.
add(p.node,(a.type==='JSXAttribute'?'{':'')+'_tr('+JSON.stringify(s)+')'+(a.type==='JSXAttribute'?'}':''));changed=true;}});
if(!changed)continue;
traverse(ast,{Function(p){let name=p.node.id?.name;if(p.parent.type==='VariableDeclarator')name=p.parent.id.name;if(!name||! /^[A-Z]/.test(name))return;
if(p.node.body.type==='BlockStatement')edits.push([p.node.body.start+1,p.node.body.start+1,'\n  _useLocale();']);else {edits.push([p.node.body.start,p.node.body.start,'{ _useLocale(); return (']);edits.push([p.node.body.end,p.node.body.end,'); }']);}}});
for(const [start,end,value] of edits.sort((a,b)=>b[0]-a[0]||b[1]-a[1]))src=src.slice(0,start)+value+src.slice(end);
const rel=path.relative(path.dirname(file),'frontend/src/i18n').replaceAll('\\','/');src=`import { translate as _tr, useI18n as _useLocale } from '${rel.startsWith('.')?rel:'./'+rel}';\n`+src;fs.writeFileSync(file,src);console.log(file);}
