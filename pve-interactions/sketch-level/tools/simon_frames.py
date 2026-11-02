# Builds the player's animation frames from the student's own drawing of him (sketch.png, first figure),
# cutting the linework into body, fist and legs and posing them after Castlevania 1's Simon silhouettes.
# Usage: python3 simon_frames.py img/sketch.png img/simon.png simon.json preview.png   (needs Pillow, numpy, scipy)
# Sketch x 65 lands on the frame's centre and the ground line (y 437) on its feet, so frames line up with the level.
import numpy as np, math, json, sys
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
K = 4                                   # work at 4x the sketch's pixels
X0, Y0, X1, Y1 = 30, 340, 100, 437
CUTX, CUTY = 92, 435             # right of 92 is the dashed jump arc; 436 down is the ledge's ground line      # crop round the first figure; the ground line is at 437
src = Image.open(sys.argv[1]).convert('L').crop((X0, Y0, X1, Y1))
big = src.resize(((X1 - X0) * K, (Y1 - Y0) * K), Image.BICUBIC)
L = np.asarray(big).astype(float)
ink = np.clip((165 - L) / 85, 0, 1)                  # pencil darkness -> opacity; the grey grid falls away
ink[ink < 0.12] = 0
ink[(CUTY - Y0) * K:, :] = 0; ink[:, (CUTX - X0) * K:] = 0
solid = ndimage.binary_dilation(ink > 0.35, iterations=K)   # close little gaps in the outline
outside = ndimage.binary_fill_holes(solid) == 0
# the figure is the inside of its outline: paper-coloured, so it hides the grid behind it
fill = ~outside
fill = ndimage.binary_erosion(fill, iterations=1)
H, W = L.shape
rgba = np.zeros((H, W, 4))
paper = np.array([238, 240, 242]); inkc = np.array([34, 34, 38])
a = np.maximum(ink, fill * 1.0)
col = paper[None, None, :] * (1 - ink[..., None]) + inkc[None, None, :] * ink[..., None]
rgba[..., :3] = col; rgba[..., 3] = a * 255
base = Image.fromarray(rgba.astype('uint8'), 'RGBA')

def P(x, y): return ((x - X0) * K, (y - Y0) * K)
def part(poly):
    m = Image.new('L', base.size, 0); ImageDraw.Draw(m).polygon([P(*p) for p in poly], fill=255)
    out = Image.new('RGBA', base.size, (0, 0, 0, 0)); out.paste(base, (0, 0), m); return out
SEAM = 397
BODY = [(30, 340), (100, 340), (100, 372), (77, 372), (77, 394), (100, 394), (100, SEAM + 3), (30, SEAM + 3)]
FIST = [(77, 371), (96, 371), (96, 395), (77, 395)]
BACK = [(30, SEAM - 3), (64, SEAM - 3), (64, 405), (63.5, 437), (30, 437)]
FRONT = [(64, SEAM - 3), (100, SEAM - 3), (100, 437), (63.5, 437), (64, 405)]
KNEE = 417
parts = {k: part(v) for k, v in dict(body=BODY, fist=FIST, back=BACK, front=FRONT,
    backT=[(30, SEAM - 3), (64, SEAM - 3), (64, KNEE + 2), (30, KNEE + 2)], backS=[(30, KNEE - 2), (63.8, KNEE - 2), (63.5, 437), (30, 437)],
    frontT=[(64, SEAM - 3), (100, SEAM - 3), (100, KNEE + 2), (64, KNEE + 2)], frontS=[(64, KNEE - 2), (100, KNEE - 2), (100, 437), (63.8, 437)]).items()}
KNEE_B, KNEE_F = (51, KNEE), (75, KNEE)
HIP_B, HIP_F, SHOULDER = (55, 399), (70, 399), (75, 377)

FW, FH = 76, 100                      # one frame, in sketch pixels; feet at FH - 3, figure centre at FW / 2
FOOT, CX = FH - 3, FW / 2 + 1
def place(img, ang=0, pivot=(65, 400), dx=0, dy=0, sy=1.0):
    """rotate a part about a pivot (degrees, + is clockwise on screen), squash it vertically about the pivot, then move it"""
    px, py = P(*pivot)
    im = img
    if sy != 1.0:
        w, h = im.size; im2 = im.resize((w, max(1, int(h * sy))), Image.BICUBIC)
        canvas = Image.new('RGBA', im.size, (0, 0, 0, 0)); canvas.paste(im2, (0, int(py - py * sy))); im = canvas
    im = im.rotate(-ang, resample=Image.BICUBIC, center=(px, py))
    tmp = Image.new('RGBA', (FW * K, FH * K), (0, 0, 0, 0))
    tmp.paste(im, (int(round((X0 - 65 + CX + dx) * K)), int(round((Y0 - 437 + FOOT + dy) * K))), im)
    return tmp
def arm(frame, fist_xy, dy=0):
    # the arm as a pencil tube from the shoulder to where the fist now is: an ink stroke with paper inside it
    d = ImageDraw.Draw(frame)
    sx, sy = ((SHOULDER[0] - 65 + CX) * K, (SHOULDER[1] - 437 + FOOT + dy) * K)
    fx, fy = ((fist_xy[0] - 65 + CX) * K, (fist_xy[1] - 437 + FOOT + dy) * K)
    for w, c in ((int(7.5 * K), (34, 34, 38, 255)), (int(4 * K), (238, 240, 242, 255))):
        d.line([(sx, sy), (fx, fy)], fill=c, width=w)
        for x, y in ((sx, sy), (fx, fy)): d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=c)
def rot(p, c, deg):
    a = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))
def tuck(f, thigh, shin, lift):
    # thighs swing forward about the hips, shins fold back about the knees: Castlevania's knees-up jump
    for T, S, hip, knee, th, sh in (('backT', 'backS', HIP_B, KNEE_B, thigh[0], shin[0]), ('frontT', 'frontS', HIP_F, KNEE_F, thigh[1], shin[1])):
        nk = rot(knee, hip, th)
        f.alpha_composite(place(parts[S], th + sh, knee, nk[0] - knee[0], nk[1] - knee[1] - lift))
        f.alpha_composite(place(parts[T], th, hip, 0, -lift))
def frame(legs=(0, 0), legsy=1.0, body=(0, 0, 0), fist=None, lean=0, tucked=None):
    """legs: (back angle, front angle); body: (dx, dy, angle); fist: (angle about shoulder, dx, dy) or None for at rest"""
    bdx, bdy, bang = body
    f = Image.new('RGBA', (FW * K, FH * K), (0, 0, 0, 0))
    if tucked:
        lift = tucked[2]; tuck(f, tucked[0], tucked[1], lift)
    else:
        f.alpha_composite(place(parts['back'], legs[0], HIP_B, sy=legsy))
        f.alpha_composite(place(parts['front'], legs[1], HIP_F, sy=legsy))
        lift = (1 - legsy) * (437 - 399)
    lift = -lift if tucked else lift
    f.alpha_composite(place(parts['body'], bang, (63, 399), bdx, bdy + lift))
    if fist is None: f.alpha_composite(place(parts['fist'], bang, (63, 399), bdx, bdy + lift))
    else:
        ang, fdx, fdy = fist
        fx = 83 + fdx; fy = 383 + fdy
        arm(f, (fx, fy), bdy + lift)
        f.alpha_composite(place(parts['fist'], ang, (83, 383), bdx + fdx, bdy + lift + fdy))
    if lean: f = f.rotate(-lean, resample=Image.BICUBIC, center=(CX * K, FOOT * K))
    return f
FRAMES = {
    'stand':  frame(),
    'walk1':  frame(legs=(22, -22), body=(0, 1, 0)),                 # stride
    'walk2':  frame(legs=(-4, 5), body=(0, 0, 0)),                    # passing
    'walk3':  frame(legs=(14, -14), body=(0, 1, 0)),                  # stride, the other beat
    'jump':   frame(legs=(-6, -12), legsy=0.55, body=(1, 0, 6)),      # Castlevania's tucked jump: knees up, compact
    'whip1':  frame(fist=(-140, -14, -24), body=(-2, 0, -6)),          # wind-up: fist raised behind the head
    'whip2':  frame(fist=(-60, -2, -20), body=(0, 0, -2)),             # coming over the top
    'whip3':  frame(fist=(0, 10, -3), body=(2, 0, 3), legs=(10, -6)),  # strike: arm straight out
    'hurt':   frame(legs=(-8, 10), body=(-2, 0, 0), lean=-14),         # knocked back
}
names = list(FRAMES)
sheet = Image.new('RGBA', (FW * K * len(names), FH * K), (0, 0, 0, 0))
for i, n in enumerate(names): sheet.alpha_composite(FRAMES[n], (i * FW * K, 0))
sheet.save(sys.argv[2])
json.dump({'names': names, 'w': FW, 'h': FH, 'scale': K, 'foot': FOOT, 'cx': CX}, open(sys.argv[3], 'w'))
# preview on paper
prev = Image.new('RGB', sheet.size, (238, 240, 242)); prev.paste(sheet, (0, 0), sheet)
prev.resize((prev.width // 2, prev.height // 2)).save(sys.argv[4])
