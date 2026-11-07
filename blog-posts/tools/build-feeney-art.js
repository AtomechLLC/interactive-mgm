// Builds blog-posts/feeney-items/catalog-art.js from art-map.txt (item name|game-icons name). Needs: npm i @iconify-json/game-icons
const path=require('path');const D=path.join(__dirname,'../feeney-items');
const j=require('@iconify-json/game-icons/icons.json');const fs=require('fs');
global.window={};require(path.join(D,'catalog-data.js'));
const m={};fs.readFileSync(path.join(D,'art-map.txt'),'utf8').trim().split('\n').forEach(l=>{const [a,b]=l.split('|');m[a.trim()]=b.trim()});
// effect badges: first rule whose words appear in the description wins
const R=[
 ['fire','#d9532b',/\b(fire|flame|flaming|burn|inferno|blaze)/i],
 ['snowflake-1','#3c8fd1',/\b(cold damage|ice|frost|freez|frozen|chill|hail)/i],
 ['focused-lightning','#c99a00',/\b(lightning|thunder|electric|shock)/i],
 ['poison','#4f9a3a',/\b(poison|venom|toxi|acid)/i],
 ['teleport','#7a4bc4',/\bteleport/i],
 ['invisible','#6c7393',/\binvisib/i],
 ['skull-crossed-bones','#55506b',/\b(necrotic|undead|corpse|zombie|reanimat|dies|death)/i],
 ['heart-plus','#cf3f6a',/\b(heal|hit points|temporary hp|regain)/i],
 ['feathered-wing','#4a9cb0',/\b(fly|flying|flight|soar|glide|fall)/i],
 ['terror','#8a3d8f',/\b(frighten|fear|terrif)/i],
 ['lips','#d0508a',/\b(charm|charisma|persua|decei)/i],
 ['water-drop','#2f7fc1',/\b(water|swim|breath|underwater)/i],
 ['night-sleep','#3d4f8f',/\b(sleep|slumber|long rest|short rest|dream)/i],
 ['two-coins','#b8860b',/\b(gold|coin|gp\b|platinum)/i],
 ['paw-print','#8a6a3a',/\b(animal|beast|creature you summon|summon)/i],
 ['sun','#e09a1f',/\b(radiant|sunlight|light)/i],
 
];
const rnd=s=>{let o='',last=0;for(const m of s.matchAll(/-?\d*\.\d+|-?\d+/g)){o+=s.slice(last,m.index);let v=Math.round(parseFloat(m[0])*10)/10;if(Object.is(v,-0))v=0;let t=v.toString().replace(/^0\./,'.').replace(/^-0\./,'-.');if(/[\d.]$/.test(o)&&t[0]!=='-')t=' '+t;o+=t;last=m.index+m[0].length}return o+s.slice(last)};
const icons={},items={};
const pathOf=n=>{const b=j.icons[n].body;const ds=[...b.matchAll(/ d="([^"]+)"/g)].map(x=>x[1]);if(!ds.length)throw n;return rnd(ds.join(''))};
window.FEENEY_ALL.forEach(i=>{const ic=m[i.n];const r=R.find(r=>r[2].test(i.n+" "+i.d));icons[ic]=icons[ic]||pathOf(ic);if(r)icons[r[0]]=icons[r[0]]||pathOf(r[0]);items[i.n]=r?[ic,r[0]]:[ic]});
const N={fire:'Fire','snowflake-1':'Cold','focused-lightning':'Lightning',poison:'Poison',teleport:'Teleport',invisible:'Invisible','skull-crossed-bones':'Death','heart-plus':'Healing','feathered-wing':'Flight or falling',terror:'Fear',lips:'Charm',  'water-drop':'Water or breath','night-sleep':'Sleep',  'two-coins':'Money','paw-print':'Animals',sun:'Light'};const B={};R.forEach(r=>B[r[0]]=[r[1],N[r[0]]]);
const out=`/* Illustrations for every item in Brian Feeney's (Riot Games) "D&D Magic Items Megasheet": one game-icons.net icon for the item
   (CC BY 3.0, game-icons.net: Lorc, Delapouite and other contributors, from the @iconify-json/game-icons set, 512 x 512, rounded to
   0.1) plus a small badge for the item's main effect, picked from the words of its description. The icon picks are this page's own. */
window.FEENEY_ART = { icons: ${JSON.stringify(icons)},\n  badge: ${JSON.stringify(B)},\n  items: ${JSON.stringify(items)} };\n`;
fs.writeFileSync(path.join(D,'catalog-art.js'),out);
console.log(out.length);const c={};Object.values(items).forEach(x=>c[x[1]]=(c[x[1]]||0)+1);console.log(c);
