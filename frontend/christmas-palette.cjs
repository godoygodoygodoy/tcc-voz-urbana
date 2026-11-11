const postcss = require('postcss');
// Generate scoped overrides after Tailwind, leaving the normal edition untouched.
function recolor(value) {
  return value.replace(/#[\da-f]{6}\b|#[\da-f]{3}\b|rgba?\(\s*[\d.]+(?:\s*[, ]\s*[\d.]+){2}(?:\s*[,/]\s*[^)]+)?\)/gi, token => {
    let rgb, alpha = '';
    if (token[0] === '#') {
      let hex = token.slice(1); if(hex.length === 3) hex = [...hex].map(c=>c+c).join('');
      rgb = [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    } else {
      const parts = token.slice(token.indexOf('(')+1,-1).split(/\s*[,/]\s*|\s+/).filter(Boolean);
      rgb = parts.slice(0,3).map(n=>Number(n)/255);
      if(parts[3]) alpha = ' / '+parts.slice(3).join(' ');
    }
    const [r,g,b]=rgb, max=Math.max(...rgb), min=Math.min(...rgb), delta=max-min;
    if(!delta) return token;
    let hue = max===r ? ((g-b)/delta)%6 : max===g ? (b-r)/delta+2 : (r-g)/delta+4;
    hue=(hue*60+360)%360;
    if(hue<245 || hue>315) return token;
    const light=(max+min)/2, saturation=delta/(1-Math.abs(2*light-1));
    return `hsl(${light>.72 ? 43 : light<.18 ? 150 : 355} ${(Math.min(saturation,.65)*100).toFixed(2)}% ${(light*100).toFixed(2)}%${alpha})`;
  });
}
module.exports = () => ({
  postcssPlugin:'voz-urbana-seasonal-palette',
  OnceExit(root) {
    const additions=[];
    root.walkRules(rule=>{
      if(/christmas|nativity|pigeon-santa/.test(rule.selector)) return;
      for(let p=rule.parent;p && p!==root;p=p.parent) if(p.type==='atrule' && /keyframes/.test(p.name)) return;
      const declarations=rule.nodes.filter(n=>n.type==='decl' && recolor(n.value)!==n.value).map(n=>n.clone({value:recolor(n.value)}));
      if(!declarations.length) return;
      // Scope without raising specificity: component transparency/focus rules
      // must still override generic input styles in the seasonal palette.
      const clone=postcss.rule({selector:rule.selectors.map(s=>s.startsWith(':root') ? s.replace(':root', ':root[data-site-theme="christmas"]') : ':where(:root[data-site-theme="christmas"]) '+s).join(',\n')});
      clone.append(declarations);
      let wrapped=clone;
      for(let p=rule.parent;p && p!==root;p=p.parent) { const wrapper=p.clone({nodes:[]});wrapper.append(wrapped);wrapped=wrapper; }
      additions.push(wrapped);
    });
    root.append(additions);
  },
});
module.exports.postcss=true;
module.exports.recolor=recolor;
