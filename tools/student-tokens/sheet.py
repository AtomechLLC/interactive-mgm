import sys, json, os
from PIL import Image, ImageDraw, ImageFont
OUT, dest = sys.argv[1], sys.argv[2]; themes = sys.argv[3].split(',') if len(sys.argv) > 3 else None
idx = json.load(open(f'{OUT}/index.json'))
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11); H = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception: F = H = ImageFont.load_default()
T, COLS = 96, 16
order = []; [order.append(i['theme']) for i in idx if i['theme'] not in order]
if themes: order = [t for t in order if t in themes]
rows = []
for th in order:
    items = [i for i in idx if i['theme'] == th]
    rows.append(('h', th, len(items))); 
    for k in range(0, len(items), COLS): rows.append(('r', items[k:k + COLS], 0))
h = sum(32 if r[0] == 'h' else T + 18 for r in rows) + 10
sh = Image.new('RGB', (COLS * (T + 8) + 10, h), '#ffffff'); d = ImageDraw.Draw(sh); y = 5
for kind, v, n in rows:
    if kind == 'h': d.text((8, y + 8), f'{v}  ({n})', font=H, fill='#1c2440'); y += 32; continue
    for c, it in enumerate(v):
        f = it['files'][1] if len(it['files']) > 1 else it['files'][0]
        im = Image.open(f"{OUT}/256px/{it['theme']}/{f}").resize((T, T), Image.LANCZOS)
        x = 8 + c * (T + 8); sh.paste(im, (x, y), im); d.text((x, y + T + 2), it['name'][:16], font=F, fill='#333')
    y += T + 18
sh.save(dest); print(sh.size)
