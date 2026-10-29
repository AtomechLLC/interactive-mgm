"""Builds ../shared/icons.js from game-icons.net (CC BY 3.0) SVGs, fetched from github.com/game-icons/icons.
Usage: python build-icons.py   (edits NAMES below to add icons; each name is tried under the authors in AUTHORS).
The output has the same GI API as ../../depth/shared/icons.js: GI.draw(g, name, x, y, size, colour, angle), GI.credit(names)."""
import os, re, json, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'shared', 'icons.js')
CACHE = os.path.join(os.path.expanduser('~'), '.cache', 'mgm-game-icons.json')
AUTHORS = ['lorc', 'delapouite', 'skoll', 'sbed', 'carl-olsen', 'caro-asercion', 'cathelineau', 'john-colburn', 'quoting',
           'faithtoken', 'heavenly-dog', 'darkzaitzev', 'felbrigg', 'guard13007', 'lucasms', 'zajkonur', 'viscious-speed',
           'willdabeast', 'sparker', 'priorblue', 'irongamer', 'pepijn-poolman', 'kier-heyl', 'rihlsul', 'aussiesim', 'various-artists']
NAMES = open(os.path.join(HERE, 'icon-names.txt')).read().split()
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
def fetch(name):
    if name in cache: return cache[name]
    for a in AUTHORS:
        try:
            svg = urllib.request.urlopen(f'https://raw.githubusercontent.com/game-icons/icons/master/{a}/{name}.svg', timeout=20).read().decode()
        except Exception:
            continue
        ds = [d for d in re.findall(r'<path[^>]*\sd="([^"]+)"', svg) if d.strip() not in ('M0 0h512v512H0z',)]
        cache[name] = [a, ' '.join(ds)]
        return cache[name]
    cache[name] = None
    return None
missing = []
rows = []
for n in NAMES:
    r = fetch(n)
    if not r: missing.append(n); continue
    rows.append(f"  '{n}': ['{r[0]}', '{r[1]}'],")
json.dump(cache, open(CACHE, 'w'))
js = """/* game-icons.net icons (CC BY 3.0, game-icons.net; authors named per icon), drawn on a canvas. Built by ../tools/build-icons.py.
   GI.draw(g, name, x, y, size, colour, angle) draws one icon centred on x, y. GI.credit(names) lists the authors for a page's
   source note. The paths are the icons' own 512 x 512 paths, copied as-is. */
(function () {
  const P = {
""" + "\n".join(rows) + """
  };
  const cache = {};
  const path = n => cache[n] || (cache[n] = new Path2D(P[n][1]));
  const nice = a => a.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  window.GI = {
    has: n => !!P[n],
    draw(g, n, x, y, size, col = '#fff', ang = 0) {
      if (!P[n]) return; g.save(); g.translate(x, y); if (ang) g.rotate(ang); const k = size / 512; g.scale(k, k); g.translate(-256, -256);
      g.fillStyle = col; g.fill(path(n)); g.restore();
    },
    credit: names => 'Icons from game-icons.net (CC BY 3.0) by ' + [...new Set((names || Object.keys(P)).map(n => P[n] && P[n][0]).filter(Boolean))].map(nice).join(', ') + '.',
  };
})();
"""
open(OUT, 'w').write(js)
print(len(rows), 'icons;', 'missing:', ' '.join(missing))
