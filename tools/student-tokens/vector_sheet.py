"""Contact sheet for the vector-basics tokens. Usage: python3 vector_sheet.py <vector-basics dir>"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
V = sys.argv[1]
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11); H = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception: F = H = ImageFont.load_default()
groups = ['tokens', 'arrows', 'telegraphs', 'status', 'props']; T, C = 84, 16; rows = []
for g in groups:
    fs = sorted(glob.glob(f'{V}/256px/{g}/*.png')); rows.append(('h', g, len(fs)))
    for i in range(0, len(fs), C): rows.append(('r', fs[i:i + C], 0))
h = sum(30 if r[0] == 'h' else T + 18 for r in rows) + 10
sh = Image.new('RGB', (C * (T + 10) + 10, h), 'white'); d = ImageDraw.Draw(sh); y = 5
for k, v, n in rows:
    if k == 'h': d.text((8, y + 6), f'{v}  ({n})', font=H, fill='#1c2440'); y += 30; continue
    for c, f in enumerate(v):
        im = Image.open(f).convert('RGBA').resize((T, T), Image.LANCZOS); x = 8 + c * (T + 10); sh.paste(im, (x, y), im)
        d.text((x, y + T + 2), os.path.basename(f)[:-4][:15], font=F, fill='#333')
    y += T + 18
sh.save(f'{V}/contact-sheet.png')
