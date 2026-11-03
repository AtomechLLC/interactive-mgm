"""Simple vector tokens for laying out combat scenarios: player and enemy tokens, arrows, telegraph shapes in two team
colours, status and condition badges, and props. Writes one SVG per token (100 x 100 viewBox) into <out>/svg/<group>/.
Usage: python3 vector_basics.py <out dir>"""
import os, sys, math

OUT = sys.argv[1]
INK = '#1d2433'
ALLY, ALLY_LT = '#8fdbe0', '#d0eff2'      # teal team (players' side)
FOE, FOE_LT = '#e3ad8c', '#f2dccf'        # peach team (enemy side)
PLAYER = {'1': '#2aa7e0', '2': '#2fb36a', '3': '#e2d62b', '4': '#8a4fd6'}
files = {}

def svg(group, name, body):
    files[f'{group}/{name}'] = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">'
                                f'{body}</svg>')

def pts(p): return ' '.join(f'{x:.1f},{y:.1f}' for x, y in p)
def spiral(cx, cy, r, turns=2.6, w=8, col='#33363f'):
    n = 160; P = [(cx + r * (i / n) * math.cos(i / n * turns * 2 * math.pi), cy + r * (i / n) * math.sin(i / n * turns * 2 * math.pi)) for i in range(n + 1)]
    return f'<polyline points="{pts(P)}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'

def star(cx, cy, n, r1, r2, rot=-90):
    return pts([(cx + (r1 if i % 2 == 0 else r2) * math.cos(math.radians(rot + i * 180 / n)),
                 cy + (r1 if i % 2 == 0 else r2) * math.sin(math.radians(rot + i * 180 / n))) for i in range(2 * n)])

# ---------------------------------------------------------------- tokens
def player(col, label=None):
    t = f'<text x="50" y="96" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="17" text-anchor="middle" fill="{INK}">{label}</text>' if label else ''
    cy = 44 if label else 50; r = 34 if label else 42; k = r / 42
    tri = pts([(50, cy - 26 * k), (50 + 24 * k, cy + 17 * k), (50 - 24 * k, cy + 17 * k)])
    inner = pts([(50, cy + 3 * k), (50 + 11 * k, cy + 17 * k), (50 - 11 * k, cy + 17 * k)])
    return (f'<circle cx="50" cy="{cy}" r="{r}" fill="{col}" stroke="{INK}" stroke-width="3"/>'
            f'<polygon points="{tri}" fill="#fff" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>'
            f'<polygon points="{inner}" fill="{col}" opacity=".55"/>' + t)
for k, c in PLAYER.items():
    svg('tokens', f'player-{k}', player(c, f'P{k}'))
    svg('tokens', f'player-{k}-unlabelled', player(c))

def foe_face(fill, r=40, extra=''):
    return (f'<circle cx="50" cy="50" r="{r}" fill="{fill}" stroke="{INK}" stroke-width="3"/>'
            f'<polygon points="{pts([(22, 38), (46, 44), (42, 52), (26, 48)])}" fill="#e5322d" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>'
            f'<polygon points="{pts([(78, 38), (54, 44), (58, 52), (74, 48)])}" fill="#e5322d" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>'
            f'<polygon points="{pts([(34, 64), (66, 64), (62, 72), (56, 68), (50, 73), (44, 68), (38, 72)])}" fill="#e5322d" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>' + extra)
svg('tokens', 'enemy', foe_face('#8a8f9c'))
svg('tokens', 'enemy-minion', f'<g transform="translate(50 50) scale(.7) translate(-50 -50)">{foe_face("#b3b7c2")}</g>')
svg('tokens', 'enemy-elite', foe_face('#8a8f9c', 36, '<circle cx="50" cy="50" r="44" fill="none" stroke="#e5322d" stroke-width="5"/>'))
svg('tokens', 'enemy-boss', f'<g transform="translate(0 6)">{foe_face("#5d6170", 38)}</g>'
    f'<polygon points="{pts([(28, 22), (34, 4), (42, 16), (50, 2), (58, 16), (66, 4), (72, 22)])}" fill="#ffb951" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
svg('tokens', 'ally-npc', f'<circle cx="50" cy="50" r="40" fill="#2fae63" stroke="{INK}" stroke-width="3"/>'
    f'<circle cx="50" cy="40" r="11" fill="#fff"/><path d="M28 74 Q50 46 72 74 Z" fill="#fff"/>')
svg('tokens', 'neutral-creature', f'<circle cx="50" cy="50" r="40" fill="#e8e2cf" stroke="{INK}" stroke-width="3"/>'
    f'<circle cx="38" cy="45" r="5" fill="{INK}"/><circle cx="62" cy="45" r="5" fill="{INK}"/><path d="M38 64 Q50 70 62 64" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
svg('tokens', 'facing-marker', f'<circle cx="50" cy="56" r="34" fill="none" stroke="{INK}" stroke-width="3" stroke-dasharray="6 5"/>'
    f'<polygon points="{pts([(50, 4), (64, 26), (36, 26)])}" fill="{INK}"/>')

# ---------------------------------------------------------------- arrows (black, ally teal, enemy peach)
def arrow_straight(c, dash=''):
    return (f'<line x1="50" y1="94" x2="50" y2="26" stroke="{c}" stroke-width="9" {dash}/>'
            f'<polygon points="{pts([(50, 4), (68, 32), (32, 32)])}" fill="{c}"/>')
def arrow_curve(c):
    return (f'<path d="M20 92 Q20 30 70 30" fill="none" stroke="{c}" stroke-width="9"/>'
            f'<polygon points="{pts([(96, 30), (68, 12), (68, 48)])}" fill="{c}"/>')
def arrow_turn(c):  # rotate in place
    return (f'<path d="M80 50 A30 30 0 1 1 62 22" fill="none" stroke="{c}" stroke-width="9"/>'
            f'<polygon points="{pts([(80, 22), (56, 8), (58, 36)])}" fill="{c}"/>')
def arrow_double(c):
    return (f'<line x1="50" y1="26" x2="50" y2="74" stroke="{c}" stroke-width="9"/>'
            f'<polygon points="{pts([(50, 4), (68, 30), (32, 30)])}" fill="{c}"/><polygon points="{pts([(50, 96), (68, 70), (32, 70)])}" fill="{c}"/>')
def arrow_charge(c):
    return (f'<polygon points="{pts([(50, 4), (76, 36), (60, 36), (60, 96), (40, 96), (40, 36), (24, 36)])}" fill="{c}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<line x1="22" y1="56" x2="22" y2="90" stroke="{c}" stroke-width="5" stroke-linecap="round"/><line x1="78" y1="56" x2="78" y2="90" stroke="{c}" stroke-width="5" stroke-linecap="round"/>')
def arrow_knockback(c):
    return (f'<line x1="50" y1="94" x2="50" y2="30" stroke="{c}" stroke-width="9"/><polygon points="{pts([(50, 6), (68, 34), (32, 34)])}" fill="{c}"/>'
            f'<polygon points="{star(50, 88, 7, 14, 6)}" fill="{c}" opacity=".7"/>')
def arrow_pull(c):
    return (f'<line x1="50" y1="8" x2="50" y2="62" stroke="{c}" stroke-width="7" stroke-dasharray="8 6"/>'
            f'<polygon points="{pts([(50, 92), (68, 64), (32, 64)])}" fill="{c}"/>'
            f'<path d="M38 10 Q38 -2 50 -2" fill="none"/><path d="M40 8 a10 10 0 1 0 20 0" fill="none" stroke="{c}" stroke-width="5"/>')
def arrow_jump(c):
    return (f'<path d="M12 88 Q50 -10 80 76" fill="none" stroke="{c}" stroke-width="8" stroke-dasharray="10 7"/>'
            f'<polygon points="{pts([(86, 96), (94, 66), (68, 76)])}" fill="{c}"/>')
ARROWS = {'move': arrow_straight, 'path-dashed': lambda c: arrow_straight(c, 'stroke-dasharray="12 8"'), 'curve': arrow_curve, 'rotate': arrow_turn,
          'two-way': arrow_double, 'charge': arrow_charge, 'knockback': arrow_knockback, 'pull': arrow_pull, 'leap': arrow_jump}
for n, f in ARROWS.items():
    for team, c in (('black', INK), ('ally', '#2aa7c0'), ('enemy', '#d9734a')):
        svg('arrows', f'{n}-{team}', f(c))

# ---------------------------------------------------------------- telegraphs, one per team colour
def tele(c, lt):
    return {
        'circle': f'<circle cx="50" cy="50" r="46" fill="{c}"/>',
        'ring': f'<circle cx="50" cy="50" r="38" fill="none" stroke="{c}" stroke-width="14"/>',
        'half-circle': f'<path d="M4 64 A46 46 0 0 1 96 64 Z" fill="{c}"/>',
        'crescent': f'<circle cx="50" cy="50" r="46" fill="{lt}"/><path d="M50 4 A46 46 0 1 0 82 83 A40 40 0 0 1 82 17 A46 46 0 0 0 50 4 Z" fill="{c}"/>',
        'cone': f'<path d="M50 96 L14 26 A52 52 0 0 1 86 26 Z" fill="{c}"/>',
        'cone-wide': f'<path d="M50 90 L6 40 A64 64 0 0 1 94 40 Z" fill="{c}"/>',
        'line': f'<rect x="36" y="2" width="28" height="96" fill="{c}"/>',
        'trapezoid': f'<polygon points="{pts([(10, 22), (90, 22), (74, 80), (26, 80)])}" fill="{c}"/>',
        'square': f'<rect x="8" y="8" width="84" height="84" fill="{c}"/>',
        'cross': f'<path d="M38 4 H62 V38 H96 V62 H62 V96 H38 V62 H4 V38 H38 Z" fill="{c}"/>',
        'burst': f'<polygon points="{star(50, 50, 14, 46, 26)}" fill="{c}"/>',
        'lightning': f'<polyline points="{pts([(60, 4), (32, 46), (62, 54), (28, 96)])}" fill="none" stroke="{c}" stroke-width="10" stroke-linejoin="miter"/>',
        'sweep-arc': f'<path d="M6 34 Q50 4 94 34 L94 62 Q50 34 6 62 Z" fill="{lt}"/><path d="M6 34 Q50 4 94 34" fill="none" stroke="{c}" stroke-width="6"/>',
        'shield': f'<path d="M20 12 Q50 2 80 12 V54 Q80 84 50 96 Q20 84 20 54 Z" fill="{lt}" stroke="{c}" stroke-width="8"/>',
        'projectile': f'<path d="M50 96 C20 70 30 30 46 10 C52 2 64 6 62 16 C58 34 74 60 50 96 Z" fill="{c}"/>',
        'puddle': f'<path d="M8 66 C8 52 20 40 50 40 C80 40 92 52 92 66 C92 82 74 90 50 90 C26 90 8 82 8 66 Z" fill="{c}"/>'
                  f'<path d="M8 66 C10 40 14 20 22 30 C28 10 34 26 40 14 C46 30 52 4 58 22 C64 10 70 30 76 16 C82 30 90 24 92 66 Z" fill="{lt}"/>',
        'target-circle': f'<circle cx="50" cy="50" r="44" fill="{lt}" stroke="{c}" stroke-width="5" stroke-dasharray="9 6"/><circle cx="50" cy="50" r="8" fill="{c}"/>',
        'safe-spot': f'<circle cx="50" cy="50" r="46" fill="{c}"/><circle cx="62" cy="38" r="16" fill="#fff" stroke="{INK}" stroke-width="2" stroke-dasharray="4 3"/>',
    }
for team, (c, lt) in {'ally': (ALLY, ALLY_LT), 'enemy': (FOE, FOE_LT)}.items():
    for n, body in tele(c, lt).items():
        svg('telegraphs', f'{n}-{team}', body)

# ---------------------------------------------------------------- status and condition badges
def badge(col, glyph):
    return f'<circle cx="50" cy="50" r="44" fill="{col}" stroke="{INK}" stroke-width="3"/>{glyph}'
W = 'fill="#fff"'; S = 'fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"'
STATUS = {
    'stun': ('#ffb951', f'<polygon points="{star(30, 40, 5, 12, 5)}" {W}/><polygon points="{star(66, 34, 5, 10, 4)}" {W}/><polygon points="{star(52, 66, 5, 13, 5)}" {W}/>'),
    'slow': ('#5d7fd6', f'<path d="M34 30 L50 46 L66 30 M34 52 L50 68 L66 52" {S}/>'),
    'haste': ('#2fb36a', f'<path d="M34 50 L50 34 L66 50 M34 72 L50 56 L66 72" {S}/>'),
    'silence': ('#8a4fd6', f'<path d="M22 30 H78 V60 H46 L32 74 V60 H22 Z" {W}/><line x1="24" y1="78" x2="78" y2="24" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'),
    'interrupt': ('#e5322d', f'<polyline points="{pts([(56, 18), (38, 52), (58, 52), (42, 84)])}" {S}/><line x1="24" y1="24" x2="76" y2="76" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'),
    'root': ('#8a5a2b', f'<path d="M50 22 V58 M50 58 L30 78 M50 58 L70 78 M50 64 V82 M38 42 H62" {S}/>'),
    'taunt': ('#e5322d', f'<rect x="44" y="18" width="12" height="42" rx="4" {W}/><circle cx="50" cy="74" r="7" {W}/>'),
    'invulnerable': ('#ffd23f', f'<path d="M30 22 Q50 14 70 22 V48 Q70 70 50 82 Q30 70 30 48 Z" {W}/><polygon points="{star(50, 46, 4, 12, 4, -90)}" fill="#ffd23f"/>'),
    'shield': ('#57b6ff', f'<path d="M30 20 Q50 12 70 20 V48 Q70 70 50 82 Q30 70 30 48 Z" {W}/>'),
    'heal': ('#2fb36a', f'<path d="M42 20 H58 V42 H80 V58 H58 V80 H42 V58 H20 V42 H42 Z" {W}/>'),
    'regen': ('#2fb36a', f'<path d="M44 34 H56 V46 H68 V58 H56 V70 H44 V58 H32 V46 H44 Z" {W}/><path d="M74 30 A30 30 0 1 0 80 56" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'),
    'poison': ('#7cbf2a', f'<path d="M50 16 C40 34 28 46 28 60 C28 74 38 82 50 82 C62 82 72 74 72 60 C72 46 60 34 50 16 Z" {W}/><circle cx="44" cy="62" r="5" fill="#7cbf2a"/><circle cx="58" cy="54" r="4" fill="#7cbf2a"/>'),
    'burn': ('#f08c1a', f'<path d="M50 14 C60 30 74 40 72 60 C70 76 60 84 50 84 C38 84 28 76 28 62 C28 50 36 44 40 34 C44 44 46 48 50 50 C52 40 48 26 50 14 Z" {W}/>'),
    'freeze': ('#57b6ff', ''.join(f'<line x1="50" y1="50" x2="{50 + 32 * math.cos(math.radians(a)):.1f}" y2="{50 + 32 * math.sin(math.radians(a)):.1f}" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' for a in range(-90, 270, 60))
               + ''.join(f'<polyline points="{pts([(50 + 18 * math.cos(math.radians(a - 25)), 50 + 18 * math.sin(math.radians(a - 25))), (50 + 24 * math.cos(math.radians(a)), 50 + 24 * math.sin(math.radians(a))), (50 + 18 * math.cos(math.radians(a + 25)), 50 + 18 * math.sin(math.radians(a + 25)))])}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' for a in range(-90, 270, 60))),
    'bleed': ('#a8201c', f'<path d="M50 16 C40 34 28 46 28 60 C28 74 38 82 50 82 C62 82 72 74 72 60 C72 46 60 34 50 16 Z" {W}/><path d="M50 16 C40 34 28 46 28 60 C28 74 38 82 50 82" fill="none" stroke="#a8201c" stroke-width="0"/><circle cx="72" cy="28" r="7" {W}/>'),
    'vulnerable': ('#e5322d', f'<path d="M30 20 Q50 12 70 20 V48 Q70 70 50 82 Q30 70 30 48 Z" {W}/><polyline points="{pts([(52, 16), (44, 40), (56, 50), (46, 80)])}" fill="none" stroke="#e5322d" stroke-width="5" stroke-linejoin="round"/>'),
    'blind': ('#5d618c', f'<path d="M16 50 Q50 18 84 50 Q50 82 16 50 Z" {W}/><circle cx="50" cy="50" r="11" fill="#5d618c"/><line x1="22" y1="78" x2="78" y2="22" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'),
    'sleep': ('#5d618c', f'<path d="M26 30 H48 L26 56 H48 M54 50 H72 L54 72 H72" {S}/>'),
    'fear': ('#4a2c7a', f'<path d="M36 34 Q36 20 50 20 Q64 20 64 34 Q64 44 50 50 V58" {S}/><circle cx="50" cy="74" r="6" {W}/>'),
    'confuse': ('#d94fa8', spiral(50, 50, 30, 2.4, 6, '#fff')),
    'disarm': ('#7b8496', f'<path d="M30 74 L64 26 L72 20 L70 30 L36 78 Z" {W}/><path d="M28 64 L44 80" {S}/><line x1="22" y1="22" x2="78" y2="78" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'),
    'knocked-down': ('#8a5a2b', f'<path d="M20 70 H80" {S}/><circle cx="30" cy="54" r="9" {W}/><path d="M42 58 H76" {S}/><polygon points="{star(66, 32, 5, 10, 4)}" {W}/>'),
    'marked': ('#e5322d', f'<circle cx="50" cy="50" r="24" fill="none" stroke="#fff" stroke-width="6"/><path d="M50 14 V34 M50 66 V86 M14 50 H34 M66 50 H86" {S}/>'),
    'damage-up': ('#e8780c', f'<path d="M30 74 L64 26 L72 20 L70 30 L36 78 Z" {W}/><path d="M66 60 V84 M54 72 H78" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'),
    'damage-down': ('#7b8496', f'<path d="M30 74 L64 26 L72 20 L70 30 L36 78 Z" {W}/><path d="M54 72 H78" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'),
    'cooldown': ('#3d8bff', f'<circle cx="50" cy="52" r="26" fill="none" stroke="#fff" stroke-width="6"/><path d="M50 36 V52 L62 60" {S}/><path d="M42 16 H58" {S}/>'),
    'channeling': ('#3d8bff', f'<rect x="18" y="58" width="64" height="14" rx="4" fill="none" stroke="#fff" stroke-width="5"/><rect x="22" y="62" width="34" height="6" {W}/><path d="M38 44 L50 24 L62 44" {S}/>'),
    'immune': ('#ffd23f', f'<circle cx="50" cy="50" r="28" fill="none" stroke="#fff" stroke-width="6"/><path d="M38 50 L47 60 L64 40" {S}/>'),
    'cleanse': ('#57b6ff', f'<path d="M50 18 C42 32 32 42 32 56 C32 70 40 78 50 78 C60 78 68 70 68 56 C68 42 58 32 50 18 Z" {W}/><path d="M74 20 L78 30 L88 34 L78 38 L74 48 L70 38 L60 34 L70 30 Z" {W}/>'),
    'dead': ('#262c3a', f'<path d="M28 42 C28 24 72 24 72 42 C72 54 66 58 64 64 H36 C34 58 28 54 28 42 Z" {W}/><circle cx="41" cy="44" r="6" fill="#262c3a"/><circle cx="59" cy="44" r="6" fill="#262c3a"/><rect x="38" y="64" width="24" height="12" {W}/>'),
}
for n, (col, g) in STATUS.items():
    svg('status', n, badge(col, g))

# ---------------------------------------------------------------- props
PROPS = {
    'sword': f'<polygon points="{pts([(50, 4), (58, 14), (58, 64), (42, 64), (42, 14)])}" fill="#8a8f9c" stroke="{INK}" stroke-width="2.5"/><rect x="28" y="64" width="44" height="8" fill="{INK}"/><rect x="45" y="72" width="10" height="22" fill="{INK}"/>',
    'spear': f'<rect x="47" y="24" width="6" height="72" rx="3" fill="{INK}"/><polygon points="{pts([(50, 2), (58, 26), (42, 26)])}" fill="#8a8f9c" stroke="{INK}" stroke-width="2.5"/>',
    'dagger': f'<polygon points="{pts([(50, 18), (58, 30), (58, 62), (42, 62), (42, 30)])}" fill="#8a8f9c" stroke="{INK}" stroke-width="2.5"/><rect x="34" y="62" width="32" height="7" fill="{INK}"/><rect x="45" y="69" width="10" height="16" fill="{INK}"/>',
    'axe': f'<rect x="46" y="10" width="8" height="86" rx="3" fill="#8a5a2b"/><path d="M54 14 Q86 14 88 44 Q70 40 54 44 Z" fill="#8a8f9c" stroke="{INK}" stroke-width="2.5"/>',
    'bow': f'<path d="M34 6 Q86 50 34 94" fill="none" stroke="#8a5a2b" stroke-width="8"/><line x1="34" y1="6" x2="34" y2="94" stroke="{INK}" stroke-width="2"/>',
    'staff': f'<rect x="46" y="22" width="8" height="74" rx="3" fill="#8a5a2b"/><circle cx="50" cy="16" r="12" fill="#8a4fd6" stroke="{INK}" stroke-width="2.5"/>',
    'chain': ''.join(f'<rect x="40" y="{4 + i * 16}" width="20" height="22" rx="9" fill="none" stroke="#7b8496" stroke-width="5"/>' for i in range(6)),
    'rock': f'<polygon points="{pts([(10, 90), (22, 30), (38, 12), (54, 34), (66, 20), (90, 90)])}" fill="#7a6250" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="{pts([(38, 12), (42, 50), (54, 34)])}" fill="#a08a78"/>',
    'pillar': f'<circle cx="50" cy="50" r="38" fill="#8b8fa8" stroke="{INK}" stroke-width="3"/><circle cx="50" cy="50" r="26" fill="none" stroke="#62688a" stroke-width="4"/>',
    'wall': f'<rect x="2" y="30" width="96" height="40" fill="#3d4270" stroke="{INK}" stroke-width="2.5"/><path d="M2 50 H98 M26 30 V50 M58 30 V50 M90 30 V50 M10 50 V70 M42 50 V70 M74 50 V70" stroke="#2a2e55" stroke-width="2.5"/>',
    'crate': f'<rect x="12" y="12" width="76" height="76" fill="#c08a4a" stroke="{INK}" stroke-width="3"/><path d="M12 12 L88 88 M88 12 L12 88" stroke="#8a5a2b" stroke-width="5"/><rect x="12" y="12" width="76" height="76" fill="none" stroke="#8a5a2b" stroke-width="7"/>',
    'barrel': f'<ellipse cx="50" cy="50" rx="36" ry="42" fill="#c08a4a" stroke="{INK}" stroke-width="3"/><path d="M16 34 H84 M16 66 H84" stroke="{INK}" stroke-width="4"/>',
    'spikes': f'<polygon points="{pts([(4, 86), (16, 30), (28, 86), (40, 20), (52, 86), (64, 30), (76, 86), (88, 24), (96, 86)])}" fill="#8a8f9c" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="2" y="84" width="96" height="8" fill="{INK}"/>',
    'vortex': spiral(50, 50, 44, 2.6, 8),
    'flag': f'<rect x="28" y="8" width="6" height="88" fill="{INK}"/><polygon points="{pts([(34, 10), (84, 24), (34, 40)])}" fill="#ffb951" stroke="{INK}" stroke-width="2.5"/>',
    'chest': f'<rect x="12" y="38" width="76" height="46" fill="#c08a4a" stroke="{INK}" stroke-width="3"/><path d="M12 38 Q12 16 50 16 Q88 16 88 38 Z" fill="#a8743a" stroke="{INK}" stroke-width="3"/><rect x="44" y="34" width="12" height="16" fill="#ffd23f" stroke="{INK}" stroke-width="2"/>',
    'key': f'<circle cx="30" cy="50" r="16" fill="none" stroke="#ffb951" stroke-width="8"/><path d="M46 50 H90 M78 50 V64 M88 50 V60" stroke="#ffb951" stroke-width="8"/>',
    'door': f'<rect x="22" y="8" width="56" height="88" rx="4" fill="#8a5a2b" stroke="{INK}" stroke-width="3"/><circle cx="66" cy="54" r="5" fill="#ffd23f"/>',
    'lever': f'<rect x="20" y="70" width="60" height="18" rx="4" fill="#7b8496" stroke="{INK}" stroke-width="2.5"/><line x1="50" y1="76" x2="74" y2="20" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><circle cx="74" cy="20" r="9" fill="#e5322d" stroke="{INK}" stroke-width="2.5"/>',
    'pressure-plate': f'<rect x="12" y="12" width="76" height="76" rx="8" fill="#b3b7c2" stroke="{INK}" stroke-width="3"/><rect x="26" y="26" width="48" height="48" rx="5" fill="#d6d9e0" stroke="{INK}" stroke-width="2"/>',
    'potion': f'<path d="M42 10 H58 V32 Q80 42 80 64 Q80 90 50 90 Q20 90 20 64 Q20 42 42 32 Z" fill="#e5322d" stroke="{INK}" stroke-width="3"/><rect x="40" y="6" width="20" height="8" fill="#8a5a2b"/>',
    'bomb': f'<circle cx="46" cy="58" r="32" fill="#33363f"/><rect x="58" y="18" width="14" height="14" fill="#7b8496" transform="rotate(45 65 25)"/><path d="M70 22 Q80 8 90 14" fill="none" stroke="#8a5a2b" stroke-width="4"/><polygon points="{star(90, 12, 6, 9, 4)}" fill="#ffb951"/>',
    'no-symbol': f'<circle cx="50" cy="50" r="40" fill="none" stroke="#a8201c" stroke-width="10"/><line x1="22" y1="22" x2="78" y2="78" stroke="#a8201c" stroke-width="10"/>',
    'crossed-target': f'<circle cx="50" cy="50" r="38" fill="none" stroke="#e5322d" stroke-width="9"/><path d="M24 24 L42 42 M58 58 L76 76 M76 24 L58 42 M42 58 L24 76" stroke="#e5322d" stroke-width="10" stroke-linecap="square"/>',
    'question': f'<circle cx="50" cy="50" r="42" fill="#fff" stroke="{INK}" stroke-width="4"/><path d="M36 38 Q36 22 50 22 Q64 22 64 36 Q64 46 50 52 V60" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="76" r="6" fill="{INK}"/>',
}
for n, b in PROPS.items(): svg('props', n, b)

for k, v in files.items():
    p = f'{OUT}/svg/{k}.svg'; os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w').write(v)
print(len(files), 'svgs')
