const fs=require('fs'),path=require('path');
const parser=require('../frontend/node_modules/@babel/parser');
const traverse=require('../frontend/node_modules/@babel/traverse').default;
const files=fs.readdirSync('frontend/src',{recursive:true}).filter(f=>/\.(js|jsx)$/.test(f)&&f!=='i18n.js').map(f=>'frontend/src/'+f.replaceAll('\\','/'));
const entries=new Map();
for(const file of files){const src=fs.readFileSync(file,'utf8');const ast=parser.parse(src,{sourceType:'module',plugins:['jsx']});traverse(ast,{JSXText(p){const s=p.node.value.replace(/\s+/g,' ').trim();if(/[a-zA-ZÀ-ž]/.test(s))add(s,file,'text');},StringLiteral(p){const s=p.node.value;const parent=p.parent; if(parent.type==='ImportDeclaration'||parent.type==='ExportNamedDeclaration'||parent.type==='ImportSpecifier')return;if(parent.type==='CallExpression'&&parent.callee.name==='t')return;
const attr=parent.type==='JSXAttribute'?parent.name.name:'';
if(['className','style','to','href','src','type','id','name','key','value','role','target','rel','d','viewBox','fill','stroke','color','position','height','width'].includes(attr))return;
if(attr&&['placeholder','title','alt','aria-label','label','detail'].includes(attr))return add(s,file,'attr');
if((/[À-ž]/.test(s)||/\s/.test(s))&&!/^(https?:|\/|\.|#)/.test(s)&&!/[{};=]|\b(px|rgba|translate|linear-gradient)\b/.test(s)&&!/(?:^|\s)(?:[a-z]+:)?(?:text|bg|border|flex|grid|p|m|w|h|rounded|shadow|items|gap|absolute|relative|font|opacity|transition|overflow|top|left|right|bottom|z|pointer|cursor|duration|hover|space|tracking|leading|justify|select|object|inset|min|max|group|hidden|block|inline|sm|lg|md|xl)[-:]/.test(s))add(s,file,'literal');}})}
function add(s,f,k){if(!s)return;if(!entries.has(s))entries.set(s,{text:s,files:[],kind:k});entries.get(s).files.push(f)}
fs.writeFileSync('scripts/i18n-audit.json',JSON.stringify([...entries.values()],null,2));
console.log([...entries.keys()].map((s,i)=>i+' '+s).join('\n'));
