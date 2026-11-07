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

# ---------------------------------------------------------------- enemy archetypes
# The same grey disc with red brows and a jagged mouth as the enemy token, plus one prop or silhouette change that
# names its job in a fight. Each disc gets a soft shadow crescent and a highlight, a step more detail than `enemy`.
RED = '#e5322d'; STEEL = '#9aa1ad'; WOOD = '#8a5a2b'; GOLD = '#ffb951'
L = f'stroke="{INK}" stroke-width="2" stroke-linejoin="round"'

def face(cx=50, cy=50, r=40, fill='#8a8f9c', eyes=RED, mouth=True, shade=True):
    """Enemy disc of radius r at (cx, cy): body, shading, brows and mouth (all drawn in the 100-unit base and scaled)."""
    s = r / 40
    body = f'<circle cx="50" cy="50" r="40" fill="{fill}" stroke="{INK}" stroke-width="{3 / s:.2f}"/>'
    if shade:
        body += (f'<path d="M18 74 A40 40 0 0 0 82 74 A44 30 0 0 1 18 74 Z" fill="{INK}" opacity=".16"/>'
                 f'<ellipse cx="36" cy="26" rx="10" ry="5" transform="rotate(-30 36 26)" fill="#fff" opacity=".35"/>')
    sw = f'stroke="{INK}" stroke-width="{2 / s:.2f}" stroke-linejoin="round"'
    body += (f'<polygon points="{pts([(22, 38), (46, 44), (42, 52), (26, 48)])}" fill="{eyes}" {sw}/>'
             f'<polygon points="{pts([(78, 38), (54, 44), (58, 52), (74, 48)])}" fill="{eyes}" {sw}/>')
    if mouth:
        body += f'<polygon points="{pts([(34, 64), (66, 64), (62, 72), (56, 68), (50, 73), (44, 68), (38, 72)])}" fill="{eyes}" {sw}/>'
    return f'<g transform="translate({cx} {cy}) scale({s:.3f}) translate(-50 -50)">{body}</g>'

def disc_only(cx, cy, r, fill):  # a body with no face, for things drawn on top
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{INK}" stroke-width="3"/>'

def speed(x, y, n=3, gap=9, w=16):
    return ''.join(f'<line x1="{x}" y1="{y + i * gap}" x2="{x - w + (i % 2) * 6}" y2="{y + i * gap}" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>' for i in range(n))

ARCH = {
    # holds the line: thick helmet and a tower shield
    'tank': face(46, 54, 36, '#6f7686')
        + f'<path d="M12 50 A34 34 0 0 1 80 50 L80 44 H12 Z" fill="{STEEL}" {L}/>'
        + f'<path d="M14 46 A32 32 0 0 1 78 46" fill="none" stroke="{INK}" stroke-width="2"/><rect x="43" y="16" width="6" height="30" fill="#7b8496" {L}/>'
        + ''.join(f'<circle cx="{x}" cy="44" r="1.8" fill="{INK}"/>' for x in (20, 32, 60, 72))
        + f'<path d="M64 52 H94 V78 Q94 92 79 98 Q64 92 64 78 Z" fill="{STEEL}" {L}/><path d="M79 56 V94 M68 70 H90" stroke="#7b8496" stroke-width="4"/><circle cx="79" cy="70" r="4" fill="{GOLD}" {L}/>',
    # many small bodies that arrive together
    'swarm': face(30, 36, 20, '#b3b7c2') + face(72, 34, 18, '#b3b7c2') + face(52, 70, 22, '#a3a8b4') + face(20, 74, 13, '#c3c6cf') + face(84, 70, 12, '#c3c6cf'),
    # hits from range: hood and bow
    'archer': face(44, 54, 34, '#8a8f9c')
        + f'<path d="M10 58 Q8 16 44 14 Q80 16 78 58 Q70 30 44 28 Q18 30 10 58 Z" fill="#4f6b3a" {L}/>'
        + f'<path d="M78 12 Q98 50 78 92" fill="none" stroke="{WOOD}" stroke-width="6" stroke-linecap="round"/><line x1="78" y1="12" x2="78" y2="92" stroke="{INK}" stroke-width="1.5"/>'
        + f'<line x1="68" y1="52" x2="94" y2="52" stroke="{INK}" stroke-width="2.5"/><polygon points="{pts([(95, 52), (87, 47), (87, 57)])}" fill="{STEEL}" {L}/>',
    # one long, telegraphed shot: scope over one eye and a laser line
    'sniper': face(42, 56, 34, '#8a8f9c')
        + f'<line x1="56" y1="50" x2="100" y2="10" stroke="{RED}" stroke-width="2.5" stroke-dasharray="5 3"/>'
        + f'<circle cx="56" cy="50" r="11" fill="#fff" fill-opacity=".55" stroke="{INK}" stroke-width="4"/><path d="M56 41 V59 M47 50 H65" stroke="{RED}" stroke-width="2"/>'
        + f'<rect x="10" y="20" width="44" height="7" rx="2" fill="#4a4f5c" {L}/><polygon points="{pts([(10, 20), (4, 18), (4, 29), (10, 27)])}" fill="{INK}"/>',
    # keeps the others alive: green cross and a soft glow
    'healer': f'<circle cx="50" cy="56" r="42" fill="#2fb36a" opacity=".18"/>' + face(50, 56, 34, '#8a8f9c')
        + f'<circle cx="50" cy="16" r="14" fill="#fff" {L}/><path d="M45 6 H55 V11 H60 V21 H55 V26 H45 V21 H40 V11 H45 Z" fill="#2fb36a" {L}/>'
        + f'<path d="M86 40 l3 -6 l3 6 l-3 6 Z M10 72 l3 -6 l3 6 l-3 6 Z" fill="#2fb36a" stroke="{INK}" stroke-width="1"/>',
    # brings more enemies: hood, and two small minions climbing out of portals
    'summoner': face(50, 42, 30, '#7d7590')
        + f'<path d="M18 52 Q16 6 50 6 Q84 6 82 52 Q74 22 50 22 Q26 22 18 52 Z" fill="#4a2c7a" {L}/>'
        + f'<ellipse cx="22" cy="86" rx="18" ry="6" fill="#8a4fd6" {L}/><ellipse cx="78" cy="86" rx="18" ry="6" fill="#8a4fd6" {L}/>'
        + face(22, 78, 10, '#b3b7c2', shade=False) + face(78, 78, 10, '#b3b7c2', shade=False)
        + f'<rect x="12" y="84" width="20" height="8" fill="#8a4fd6"/><rect x="68" y="84" width="20" height="8" fill="#8a4fd6"/>'
        + f'<path d="M12 84 Q22 92 32 84 M68 84 Q78 92 88 84" fill="none" stroke="{INK}" stroke-width="2"/>',
    # dies loudly: bomb body, lit fuse, warning ring
    'exploder': f'<circle cx="48" cy="56" r="44" fill="none" stroke="{RED}" stroke-width="2.5" stroke-dasharray="6 5"/>' + face(48, 56, 34, '#4a4f5c', eyes=GOLD)
        + f'<rect x="58" y="16" width="14" height="10" rx="2" fill="#7b8496" transform="rotate(35 65 21)" {L}/>'
        + f'<path d="M70 16 Q78 4 88 10" fill="none" stroke="{WOOD}" stroke-width="3.5"/><polygon points="{star(89, 9, 7, 9, 3.5)}" fill="{GOLD}" stroke="{INK}" stroke-width="1"/>',
    # closes distance in a straight line: horns and speed lines
    'charger': face(56, 54, 34, '#8f7a6a')
        + f'<path d="M30 34 Q14 28 12 8 Q24 22 38 24 Z" fill="#efe6d2" {L}/><path d="M82 34 Q96 28 96 8 Q86 22 74 24 Z" fill="#efe6d2" {L}/>'
        + speed(18, 48, 4, 9, 14) + f'<path d="M44 86 Q56 92 68 86" fill="none" stroke="{INK}" stroke-width="2"/>',
    # strikes the back line: mask across the eyes, dagger
    'assassin': face(48, 52, 36, '#5d6170')
        + f'<path d="M12 40 Q48 32 84 40 L84 56 Q48 50 12 56 Z" fill="#262c3a" {L}/>'
        + f'<polygon points="{pts([(22, 42), (42, 46), (40, 52), (24, 50)])}" fill="{RED}"/><polygon points="{pts([(74, 42), (54, 46), (56, 52), (72, 50)])}" fill="{RED}"/>'
        + f'<path d="M84 44 Q96 50 98 62" fill="none" stroke="#262c3a" stroke-width="5" stroke-linecap="round"/>'
        + f'<polygon points="{pts([(80, 96), (76, 72), (80, 64), (84, 72)])}" fill="{STEEL}" {L}/><rect x="72" y="72" width="16" height="4" fill="{INK}"/>',
    # casts spells: pointed hat and an orb
    'caster': face(46, 60, 32, '#8a8f9c')
        + f'<path d="M14 40 L58 2 L56 18 L64 36 Z" fill="#3d5fb0" {L}/><path d="M8 42 Q46 28 84 40 Q46 46 8 42 Z" fill="#2c467f" {L}/>'
        + f'<polygon points="{star(46, 22, 5, 5, 2)}" fill="{GOLD}"/>'
        + f'<circle cx="86" cy="74" r="10" fill="#57b6ff" {L}/><circle cx="83" cy="71" r="3" fill="#fff" opacity=".8"/>'
        + f'<path d="M74 60 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 Z" fill="#fff" stroke="{INK}" stroke-width="1"/>',
    # makes the others stronger: war banner with up arrows
    'buffer': face(40, 58, 32, '#8a8f9c')
        + f'<rect x="70" y="6" width="5" height="90" fill="{WOOD}" {L}/><path d="M75 8 H95 V44 L85 38 L75 44 Z" fill="{RED}" {L}/>'
        + f'<path d="M81 30 L85 24 L89 30 M81 22 L85 16 L89 22" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
        + f'<path d="M10 22 L18 12 L26 22 M30 14 L38 4 L46 22" fill="none" stroke="{GOLD}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    # protects others: a bubble around itself and an ally slot
    'shielder': f'<circle cx="50" cy="52" r="46" fill="#57b6ff" fill-opacity=".22" stroke="#3d8bff" stroke-width="3"/>'
        + f'<path d="M16 40 A38 38 0 0 1 40 12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>'
        + face(50, 56, 30, '#8a8f9c')
        + f'<path d="M50 4 l6 3 V13 Q56 19 50 22 Q44 19 44 13 V7 Z" fill="#3d8bff" {L}/>',
    # breaks into smaller copies when hit
    'splitter': face(36, 40, 30, '#8a8f9c')
        + f'<polyline points="{pts([(40, 10), (32, 26), (42, 36), (30, 52), (38, 70)])}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
        + f'<path d="M66 66 L74 74 M60 74 L66 80" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>'
        + face(80, 78, 14, '#b3b7c2') + face(62, 92, 8, '#c3c6cf', shade=False),
    # ignores the ground: bat wings and a shadow below
    'flyer': f'<ellipse cx="50" cy="94" rx="22" ry="4" fill="{INK}" opacity=".25"/>'
        + f'<path d="M30 46 Q14 22 2 30 Q10 38 6 48 Q14 44 16 54 Q22 46 30 56 Z" fill="#5d6170" {L}/>'
        + f'<path d="M70 46 Q86 22 98 30 Q90 38 94 48 Q86 44 84 54 Q78 46 70 56 Z" fill="#5d6170" {L}/>'
        + face(50, 50, 28, '#8a8f9c'),
    # hides underground and pops up: half-buried with dirt
    'burrower': face(50, 58, 34, '#8f7a6a', mouth=False)
        + f'<path d="M2 74 Q14 62 26 70 Q38 58 50 68 Q62 58 74 70 Q86 62 98 74 V98 H2 Z" fill="#7a6250" {L}/>'
        + f'<circle cx="20" cy="84" r="3" fill="#a08a78"/><circle cx="56" cy="88" r="4" fill="#a08a78"/><circle cx="82" cy="82" r="2.5" fill="#a08a78"/>'
        + f'<path d="M14 54 L8 44 M86 54 L92 44 M50 26 V16" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>',
    # does not move, covers an area: bolted base and a barrel
    'turret': f'<rect x="14" y="72" width="72" height="22" rx="4" fill="#4a4f5c" {L}/>'
        + ''.join(f'<circle cx="{x}" cy="83" r="2.5" fill="{STEEL}"/>' for x in (24, 40, 60, 76))
        + f'<rect x="56" y="34" width="42" height="14" rx="3" fill="#4a4f5c" {L}/><rect x="92" y="32" width="6" height="18" rx="2" fill="{INK}"/>'
        + face(44, 46, 30, '#7b8496'),
    # controls space: sets snares around it
    'trapper': face(50, 40, 30, '#7d8a72')
        + f'<path d="M6 86 H42 M58 86 H94" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
        + f'<path d="M8 86 L12 76 L16 86 L20 76 L24 86 L28 76 L32 86 L36 76 L40 86" fill="none" stroke="{STEEL}" stroke-width="3" stroke-linejoin="round"/>'
        + f'<path d="M60 86 L64 76 L68 86 L72 76 L76 86 L80 76 L84 86 L88 76 L92 86" fill="none" stroke="{STEEL}" stroke-width="3" stroke-linejoin="round"/>'
        + f'<circle cx="24" cy="90" r="3" fill="{INK}"/><circle cx="76" cy="90" r="3" fill="{INK}"/>'
        + f'<path d="M50 70 V80" stroke="{INK}" stroke-width="2" stroke-dasharray="3 2"/>',
    # pulls you in: chain and hook
    'grappler': face(36, 54, 32, '#8a8f9c')
        + ''.join(f'<ellipse cx="{66 + i * 8}" cy="{50 - i * 8}" rx="5" ry="3.2" transform="rotate(-45 {66 + i * 8} {50 - i * 8})" fill="none" stroke="#7b8496" stroke-width="2.5"/>' for i in range(4))
        + f'<path d="M94 14 V24 Q94 34 84 34 Q76 34 76 26" fill="none" stroke="{STEEL}" stroke-width="5" stroke-linecap="round"/><polygon points="{pts([(76, 26), (72, 20), (80, 22)])}" fill="{STEEL}" {L}/>',
    # hits harder as it gets hurt: red tint, rage marks, axe
    'berserker': face(44, 56, 34, '#b06a64')
        + f'<path d="M18 22 L24 30 M30 14 L32 24 M8 34 L18 38" stroke="{RED}" stroke-width="4" stroke-linecap="round"/>'
        + f'<path d="M36 30 l4 -6 l4 6 M50 28 l4 -6 l4 6" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>'
        + f'<rect x="80" y="16" width="6" height="80" rx="2" fill="{WOOD}" {L}/><path d="M86 18 Q98 22 96 42 Q91 36 86 38 Z M80 18 Q68 22 70 42 Q75 36 80 38 Z" fill="{STEEL}" {L}/>',
    # heals itself over time: green tint and a loop arrow
    'regenerator': face(50, 54, 34, '#6f9a6a')
        + f'<path d="M14 30 A40 40 0 0 1 82 20" fill="none" stroke="#2fb36a" stroke-width="5" stroke-linecap="round"/><polygon points="{pts([(90, 26), (76, 12), (74, 28)])}" fill="#2fb36a" {L}/>'
        + f'<path d="M86 66 H92 V60 H98 V66 H104 V72 H98 V78 H92 V72 H86 Z" transform="translate(-10 0)" fill="#fff" {L}/>'
        + f'<path d="M12 68 H16 V64 H20 V68 H24 V72 H20 V76 H16 V72 H12 Z" fill="#fff" {L}/>',
    # unseen until it strikes: dashed, faded outline
    'stalker': f'<g opacity=".45">{face(50, 50, 38, "#8a8f9c", shade=False)}</g>'
        + f'<circle cx="50" cy="50" r="40" fill="none" stroke="{INK}" stroke-width="3" stroke-dasharray="7 6"/>'
        + f'<polygon points="{pts([(22, 38), (46, 44), (42, 52), (26, 48)])}" fill="{RED}" {L}/><polygon points="{pts([(78, 38), (54, 44), (58, 52), (74, 48)])}" fill="{RED}" {L}/>',
    # looks like loot: a chest with the face inside the lid
    'mimic': f'<rect x="12" y="52" width="76" height="40" rx="3" fill="#c08a4a" {L}/><path d="M12 64 H88" stroke="#8a5a2b" stroke-width="4"/>'
        + f'<path d="M12 52 L18 46 L24 52 L30 46 L36 52 L42 46 L48 52 L54 46 L60 52 L66 46 L72 52 L78 46 L84 52 L88 48" fill="#fff" {L}/>'
        + f'<path d="M14 40 Q10 8 50 6 Q90 8 86 40 Z" fill="#a8743a" {L}/>'
        + f'<path d="M16 40 L22 46 L28 40 L34 46 L40 40 L46 46 L52 40 L58 46 L64 40 L70 46 L76 40 L82 46 L86 40" fill="#fff" {L}/>'
        + f'<polygon points="{pts([(26, 22), (44, 28), (40, 34), (28, 30)])}" fill="{RED}" {L}/><polygon points="{pts([(74, 22), (56, 28), (60, 34), (72, 30)])}" fill="{RED}" {L}/>'
        + f'<rect x="44" y="60" width="12" height="14" fill="#ffd23f" {L}/><path d="M40 44 Q50 54 60 44" fill="none" stroke="#8a3a52" stroke-width="5" stroke-linecap="round"/>',
    # steals health: fangs and a drop
    'leech': face(46, 50, 36, '#7d6a82', mouth=False)
        + f'<path d="M30 64 Q46 74 62 64" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
        + f'<polygon points="{pts([(36, 66), (40, 80), (44, 68)])}" fill="#fff" {L}/><polygon points="{pts([(48, 68), (52, 80), (56, 66)])}" fill="#fff" {L}/>'
        + f'<path d="M86 60 C80 72 76 78 76 84 C76 90 81 94 86 94 C91 94 96 90 96 84 C96 78 92 72 86 60 Z" fill="#a8201c" {L}/>'
        + f'<path d="M84 50 L86 42 L88 50" fill="none" stroke="#a8201c" stroke-width="2"/>',
    # a structure that keeps producing enemies until destroyed
    'spawner': f'<path d="M8 94 Q6 40 30 22 Q50 6 70 22 Q94 40 92 94 Z" fill="#7a6250" {L}/>'
        + f'<path d="M14 60 Q50 50 86 60 M10 78 Q50 68 90 78 M20 40 Q50 30 80 40" fill="none" stroke="#5e4a3c" stroke-width="2.5"/>'
        + f'<ellipse cx="50" cy="86" rx="16" ry="9" fill="{INK}"/><ellipse cx="28" cy="50" rx="6" ry="4" fill="{INK}"/><ellipse cx="70" cy="46" rx="6" ry="4" fill="{INK}"/>'
        + face(50, 80, 9, '#b3b7c2', shade=False)
        + f'<polygon points="{pts([(36, 32), (46, 36), (44, 40), (38, 38)])}" fill="{RED}" {L}/><polygon points="{pts([(64, 32), (54, 36), (56, 40), (62, 38)])}" fill="{RED}" {L}/>',
}
for n, b in ARCH.items(): svg('archetypes', f'enemy-{n}', b)

# ---------------------------------------------------------------- modern and sci-fi enemies
# Same disc, brows and mouth as the archetypes, dressed for a modern shooter or a sci-fi setting.
OLIVE, OLIVE_DK, TAN, BLACK = '#5f6b45', '#46512f', '#b39b6b', '#2b2f38'
WHITE_ARM, CYAN, VIOLET = '#dfe4ec', '#3fe0ff', '#8a4fd6'

def helmet(cx, cy, r, col=OLIVE):  # combat helmet dome over a disc of radius r at (cx, cy), leaving the brows visible
    b = cy - r * .3; rx = r + 4; ry = r * .78
    return (f'<path d="M{cx - rx:.1f} {b:.1f} A{rx:.1f} {ry:.1f} 0 0 1 {cx + rx:.1f} {b:.1f} Z" fill="{col}" {L}/>'
            f'<path d="M{cx - rx - 2:.1f} {b:.1f} H{cx + rx + 2:.1f}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
            f'<path d="M{cx - r * .55:.1f} {b - ry * .45:.1f} Q{cx} {b - ry * .65:.1f} {cx + r * .55:.1f} {b - ry * .45:.1f}" fill="none" stroke="{OLIVE_DK if col == OLIVE else INK}" stroke-width="2" opacity=".6"/>')

def rifle(x, y, ln=40, col=BLACK):  # a horizontal rifle with its muzzle at x + ln
    return (f'<rect x="{x}" y="{y}" width="{ln}" height="6" rx="1.5" fill="{col}" {L}/>'
            f'<rect x="{x + 6}" y="{y + 6}" width="6" height="10" fill="{col}" {L}/><rect x="{x + 18}" y="{y + 6}" width="5" height="8" fill="{col}" {L}/>'
            f'<rect x="{x - 8}" y="{y + 1}" width="10" height="8" rx="2" fill="{WOOD}" {L}/>')

def visor(cx, cy, w, h, col=CYAN, rx=6):  # glowing sci-fi visor band; the red brows sit inside it
    return f'<rect x="{cx - w / 2}" y="{cy - h / 2}" width="{w}" height="{h}" rx="{rx}" fill="{BLACK}" {L}/>'

def brows(cx, cy, s=1, col=RED):  # the enemy brows alone, scaled around (cx, cy) like face()
    return (f'<g transform="translate({cx} {cy}) scale({s}) translate(-50 -50)">'
            f'<polygon points="{pts([(24, 40), (44, 45), (41, 51), (27, 48)])}" fill="{col}"/>'
            f'<polygon points="{pts([(76, 40), (56, 45), (59, 51), (73, 48)])}" fill="{col}"/></g>')

MODERN = {
    # the baseline soldier: helmet and assault rifle
    'rifleman': face(42, 56, 32, '#8a8f9c') + helmet(42, 56, 32) + rifle(52, 70, 44),
    # suppresses an area: big gun and an ammo belt
    'heavy-gunner': face(44, 52, 34, '#7d8288') + helmet(44, 52, 34)
        + f'<path d="M14 62 L74 92" stroke="{GOLD}" stroke-width="7"/><path d="M14 62 L74 92" stroke="{INK}" stroke-width="7" stroke-dasharray="2 4" opacity=".55"/>'
        + f'<rect x="40" y="74" width="58" height="10" rx="2" fill="{BLACK}" {L}/><rect x="86" y="72" width="12" height="14" rx="2" fill="#4a4f5c" {L}/>'
        + ''.join(f'<line x1="{x}" y1="76" x2="{x}" y2="82" stroke="#7b8496" stroke-width="2"/>' for x in (48, 54, 60, 66)),
    # blocks the front: transparent riot shield with a viewing slot
    'riot-shield': face(40, 48, 32, '#8a8f9c') + helmet(40, 48, 32, BLACK)
        + f'<rect x="52" y="20" width="44" height="74" rx="6" fill="#bfe3f2" fill-opacity=".75" {L}/>'
        + f'<rect x="58" y="34" width="32" height="7" rx="2" fill="{BLACK}" opacity=".7"/><text x="74" y="66" font-family="Arial Black,Arial,sans-serif" font-size="11" text-anchor="middle" fill="{INK}" opacity=".7">RIOT</text>',
    # long-range threat: ghillie hood, scope glint
    'marksman': face(46, 56, 32, '#8a8f9c')
        + f'<path d="M10 62 Q6 18 46 14 Q86 18 82 62 Q74 30 46 30 Q18 30 10 62 Z" fill="#6b7a3a" {L}/>'
        + ''.join(f'<path d="M{x} {y} l-3 8 M{x} {y} l3 8" stroke="#4f5a2a" stroke-width="2"/>' for x, y in ((20, 30), (34, 20), (58, 20), (72, 30), (14, 46), (80, 46)))
        + f'<rect x="4" y="80" width="70" height="6" rx="2" fill="{BLACK}" {L}/><rect x="30" y="72" width="22" height="8" rx="3" fill="#4a4f5c" {L}/>'
        + f'<polygon points="{star(26, 76, 4, 8, 2)}" fill="#fff" stroke="{INK}" stroke-width="1"/>',
    # patches up the squad: medic cross armband and a kit
    'medic': face(44, 54, 32, '#8a8f9c') + helmet(44, 54, 32, '#e9e6dc')
        + f'<rect x="38" y="20" width="12" height="12" fill="#fff"/><path d="M41 21 H47 V24 H50 V29 H47 V32 H41 V29 H38 V24 H41 Z" fill="{RED}"/>'
        + f'<rect x="70" y="64" width="28" height="22" rx="4" fill="#fff" {L}/><rect x="80" y="60" width="8" height="5" fill="{INK}"/>'
        + f'<path d="M81 68 H87 V72 H91 V78 H87 V82 H81 V78 H77 V72 H81 Z" fill="{RED}"/>',
    # flushes you out of cover: grenade in hand, arc trail
    'grenadier': face(40, 58, 32, '#8a8f9c') + helmet(40, 58, 32)
        + f'<path d="M66 70 Q72 22 84 36" fill="none" stroke="{INK}" stroke-width="2.5" stroke-dasharray="4 4"/>'
        + f'<ellipse cx="84" cy="26" rx="9" ry="11" fill="{OLIVE}" {L}/><path d="M76 24 H92 M76 30 H92" stroke="{OLIVE_DK}" stroke-width="2"/>'
        + f'<rect x="80" y="11" width="8" height="5" fill="#7b8496" {L}/><path d="M88 14 q6 -4 4 4" fill="none" stroke="#7b8496" stroke-width="2"/>',
    # one big hit on a timer: rocket launcher on the shoulder
    'rocketeer': face(40, 60, 30, '#8a8f9c') + helmet(40, 60, 30)
        + f'<rect x="6" y="20" width="84" height="14" rx="3" fill="#5f6b45" {L}/><rect x="2" y="18" width="10" height="18" rx="2" fill="{BLACK}" {L}/>'
        + f'<polygon points="{pts([(90, 20), (100, 27), (90, 34)])}" fill="{RED}" {L}/><rect x="40" y="34" width="6" height="8" fill="{BLACK}"/>',
    # sends machines in its place: tablet and a quad drone
    'drone-operator': face(36, 60, 30, '#8a8f9c')
        + f'<path d="M6 58 A30 30 0 0 1 66 58" fill="none" stroke="{BLACK}" stroke-width="5"/><rect x="62" y="52" width="10" height="14" rx="3" fill="{BLACK}"/>'
        + f'<rect x="14" y="80" width="26" height="16" rx="2" fill="{BLACK}" {L}/><rect x="17" y="83" width="20" height="10" fill="{CYAN}"/>'
        + f'<path d="M64 22 L92 22 M64 22 l-4 -4 M92 22 l4 -4" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
        + f'<ellipse cx="60" cy="16" rx="8" ry="2.5" fill="#7b8496" {L}/><ellipse cx="96" cy="16" rx="8" ry="2.5" fill="#7b8496" {L}/>'
        + f'<rect x="70" y="20" width="16" height="10" rx="3" fill="#4a4f5c" {L}/><circle cx="78" cy="25" r="2.5" fill="{RED}"/>'
        + f'<path d="M78 34 V44" stroke="{RED}" stroke-width="2" stroke-dasharray="3 2"/>',
    # brings a dog that runs you down
    'k9-handler': face(34, 46, 28, '#8a8f9c') + helmet(34, 46, 28, BLACK)
        + f'<path d="M44 70 Q54 64 64 72" fill="none" stroke="{WOOD}" stroke-width="3"/>'
        + f'<path d="M60 70 Q64 58 74 60 L82 52 L86 62 Q96 66 94 76 Q90 88 76 88 Q62 88 60 80 Z" fill="#8a5a2b" {L}/>'
        + f'<path d="M82 52 L80 62 M74 60 L72 68" stroke="{INK}" stroke-width="1.5"/>'
        + f'<polygon points="{pts([(70, 70), (78, 72), (76, 76)])}" fill="{RED}"/><polygon points="{pts([(88, 70), (82, 72), (84, 76)])}" fill="{RED}"/>'
        + f'<path d="M74 82 L77 86 L80 82 L83 86 L86 82" fill="#fff" stroke="{INK}" stroke-width="1.2"/>',
    # soaks damage: full bomb-suit armour, slow
    'juggernaut': face(50, 54, 40, '#4a4f5c', mouth=False)
        + f'<rect x="20" y="36" width="60" height="22" rx="6" fill="{BLACK}" {L}/>'
        + brows(50, 47, .9)
        + f'<path d="M24 66 H76 M26 74 H74 M30 82 H70" stroke="#6b7180" stroke-width="3"/>'
        + f'<rect x="4" y="44" width="12" height="30" rx="4" fill="#5d6170" {L}/><rect x="84" y="44" width="12" height="30" rx="4" fill="#5d6170" {L}/>',
    # makes the squad sharper: beret, radio, stars
    'commander': face(42, 58, 32, '#8a8f9c')
        + f'<path d="M10 40 Q12 18 42 18 Q76 16 78 34 Q72 42 58 38 Q36 34 10 40 Z" fill="#a8201c" {L}/><circle cx="60" cy="28" r="4" fill="{GOLD}" {L}/>'
        + f'<rect x="76" y="46" width="16" height="30" rx="3" fill="{BLACK}" {L}/><line x1="88" y1="46" x2="94" y2="14" stroke="{INK}" stroke-width="2.5"/>'
        + f'<path d="M78 54 h12 M78 60 h12" stroke="#7b8496" stroke-width="2"/>'
        + f'<path d="M58 6 q10 6 0 14 M64 2 q14 10 0 22" fill="none" stroke="{GOLD}" stroke-width="2.5" stroke-linecap="round"/>',
    # gets behind you: balaclava, suppressed pistol
    'infiltrator': face(44, 52, 34, BLACK, mouth=False)
        + f'<rect x="18" y="38" width="52" height="16" rx="7" fill="#c9a98a" {L}/>' + brows(44, 47, .75)
        + f'<rect x="60" y="76" width="22" height="7" rx="2" fill="#4a4f5c" {L}/><rect x="82" y="76" width="16" height="7" rx="3" fill="{INK}"/><rect x="62" y="83" width="7" height="12" rx="2" fill="#4a4f5c" {L}/>',
}

SCIFI = {
    # the rank-and-file soldier: white armour, visor, blaster
    'trooper': face(42, 54, 34, WHITE_ARM, mouth=False)
        + f'<path d="M16 40 Q42 28 68 40 L66 56 Q42 50 18 56 Z" fill="{BLACK}" {L}/>' + brows(42, 46, .8, CYAN)
        + f'<path d="M30 70 H54 M34 76 H50" stroke="#9aa1ad" stroke-width="3" stroke-linecap="round"/>'
        + f'<rect x="58" y="70" width="38" height="9" rx="3" fill="#4a4f5c" {L}/><rect x="88" y="68" width="8" height="13" rx="2" fill="{CYAN}" {L}/><rect x="64" y="79" width="7" height="12" rx="2" fill="#4a4f5c" {L}/>',
    # a walking vehicle: square cockpit on legs, arm cannons
    'mech': f'<path d="M34 72 L24 96 M66 72 L76 96" stroke="#5d6170" stroke-width="9" stroke-linecap="round"/>'
        + f'<rect x="20" y="24" width="60" height="50" rx="8" fill="#8a8f9c" {L}/>'
        + f'<rect x="28" y="34" width="44" height="18" rx="4" fill="{BLACK}" {L}/>' + brows(50, 48, .7)
        + f'<path d="M30 62 H70" stroke="#5d6170" stroke-width="3"/>'
        + f'<rect x="2" y="36" width="18" height="12" rx="3" fill="#5d6170" {L}/><rect x="80" y="36" width="18" height="12" rx="3" fill="#5d6170" {L}/>'
        + f'<circle cx="4" cy="42" r="3" fill="{GOLD}"/><circle cx="96" cy="42" r="3" fill="{GOLD}"/><rect x="46" y="12" width="8" height="12" fill="#5d6170" {L}/>',
    # small, fast, fragile: hovering eye-bot with thrusters
    'hover-drone': f'<ellipse cx="50" cy="94" rx="18" ry="3.5" fill="{INK}" opacity=".25"/>'
        + f'<path d="M18 50 H4 M82 50 H96" stroke="#5d6170" stroke-width="5" stroke-linecap="round"/>'
        + f'<ellipse cx="8" cy="44" rx="8" ry="3" fill="#7b8496" {L}/><ellipse cx="92" cy="44" rx="8" ry="3" fill="#7b8496" {L}/>'
        + face(50, 50, 30, '#9aa1ad', mouth=False)
        + f'<circle cx="50" cy="60" r="8" fill="{BLACK}" {L}/><circle cx="50" cy="60" r="4" fill="{RED}"/>'
        + f'<path d="M42 82 L50 90 L58 82" fill="none" stroke="{CYAN}" stroke-width="3" stroke-linecap="round"/>',
    # projects a barrier over others: dish emitter and an energy hex
    'shield-drone': f'<path d="M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z" fill="{CYAN}" fill-opacity=".18" stroke="{CYAN}" stroke-width="3"/>'
        + face(50, 56, 26, '#9aa1ad')
        + f'<path d="M36 26 Q50 14 64 26 Z" fill="#5d6170" {L}/><line x1="50" y1="22" x2="50" y2="10" stroke="{INK}" stroke-width="2.5"/><circle cx="50" cy="9" r="4" fill="{CYAN}" {L}/>',
    # part machine: metal half-face and a glowing eye
    'cyborg': face(50, 52, 38, '#8a8f9c')
        + f'<path d="M50 14 A38 38 0 0 1 50 90 Z" fill="#5d6170" opacity=".85"/>'
        + f'<path d="M50 14 V90" stroke="{INK}" stroke-width="2"/>'
        + ''.join(f'<circle cx="{x}" cy="{y}" r="1.8" fill="{INK}"/>' for x, y in ((58, 24), (80, 36), (82, 66), (60, 82)))
        + f'<circle cx="66" cy="46" r="8" fill="{RED}" {L}/><circle cx="66" cy="46" r="3" fill="#fff"/>'
        + f'<path d="M74 46 H98" stroke="{RED}" stroke-width="2" stroke-dasharray="3 3"/>',
    # alien brood: many small clawed bodies
    'xeno-swarm': ''.join(f'<path d="M{x - r} {y + r * .3} l-{r * .5} {r * .4} M{x + r} {y + r * .3} l{r * .5} {r * .4}" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>' for x, y, r in ((30, 36, 18), (72, 34, 16), (52, 70, 20), (18, 76, 12), (86, 72, 11)))
        + face(30, 36, 18, '#7d8a5a') + face(72, 34, 16, '#7d8a5a') + face(52, 70, 20, '#6f7d4e') + face(18, 76, 12, '#8d9a6a') + face(86, 72, 11, '#8d9a6a'),
    # mind powers: exposed glowing brain and psi waves
    'psion': f'<circle cx="50" cy="58" r="44" fill="{VIOLET}" opacity=".14"/>' + face(50, 60, 32, '#9a8fae')
        + f'<path d="M26 40 Q24 20 40 18 Q50 8 60 18 Q76 20 74 40 Z" fill="#e99cc4" {L}/>'
        + f'<path d="M50 18 V40 M36 26 Q42 30 38 36 M64 26 Q58 30 62 36" fill="none" stroke="#b5638d" stroke-width="2"/>'
        + f'<path d="M12 22 Q6 32 12 42 M88 22 Q94 32 88 42" fill="none" stroke="{VIOLET}" stroke-width="3" stroke-linecap="round"/>',
    # active camouflage: half the disc shimmers away
    'cloaker': face(50, 50, 38, '#8a8f9c')
        + f'<path d="M50 10 A40 40 0 0 1 50 90 Z" fill="#fff" opacity=".7"/>'
        + ''.join(f'<path d="M{54 + i * 8} {18 + (i % 2) * 6} V{82 - (i % 2) * 6}" stroke="{CYAN}" stroke-width="2" stroke-dasharray="6 5" opacity=".9"/>' for i in range(5))
        + f'<path d="M50 10 A40 40 0 0 1 50 90" fill="none" stroke="{INK}" stroke-width="3" stroke-dasharray="6 6"/>',
    # repairs other machines: wrench arm and a spark
    'repair-bot': face(42, 56, 32, '#c9b23a')
        + f'<rect x="30" y="16" width="24" height="10" rx="3" fill="#5d6170" {L}/><circle cx="42" cy="12" r="4" fill="#2fb36a" {L}/>'
        + f'<path d="M72 64 L88 40" stroke="#5d6170" stroke-width="6" stroke-linecap="round"/>'
        + f'<path d="M84 30 a9 9 0 1 0 12 12 l-5 -3 l-2 -6 Z" fill="{STEEL}" {L}/>'
        + f'<polygon points="{star(78, 84, 6, 10, 4)}" fill="{GOLD}" stroke="{INK}" stroke-width="1"/>'
        + f'<path d="M12 70 H16 V66 H20 V70 H24 V74 H20 V78 H16 V74 H12 Z" fill="#2fb36a" {L}/>',
    # teleports short distances: after-image and blink trail
    'blinker': f'<g opacity=".3">{face(24, 66, 22, VIOLET, shade=False)}</g>'
        + f'<path d="M30 52 Q44 34 58 40" fill="none" stroke="{VIOLET}" stroke-width="3" stroke-dasharray="4 4"/>'
        + face(64, 40, 30, '#8f86a8')
        + ''.join(f'<polygon points="{star(x, y, 4, r, r / 3)}" fill="{CYAN}" stroke="{INK}" stroke-width="1"/>' for x, y, r in ((12, 36, 6), (44, 86, 5), (90, 80, 7)))
        + f'<circle cx="24" cy="66" r="24" fill="none" stroke="{VIOLET}" stroke-width="2.5" stroke-dasharray="5 4"/>',
    # fixed emplacement with a charging beam
    'laser-turret': f'<polygon points="{pts([(14, 94), (24, 72), (76, 72), (86, 94)])}" fill="#4a4f5c" {L}/>'
        + f'<path d="M30 84 H70" stroke="{CYAN}" stroke-width="3"/>'
        + f'<rect x="58" y="36" width="26" height="12" rx="4" fill="#5d6170" {L}/><circle cx="88" cy="42" r="6" fill="{CYAN}" {L}/>'
        + f'<path d="M92 32 l3 -5 M95 42 h3 M92 52 l3 5" stroke="{CYAN}" stroke-width="2.5" stroke-linecap="round"/>'
        + face(44, 46, 28, '#9aa1ad'),
    # alien queen: crest, egg sacs, keeps spawning
    'broodmother': f'<ellipse cx="18" cy="84" rx="10" ry="12" fill="#c7d18c" {L}/><ellipse cx="82" cy="84" rx="10" ry="12" fill="#c7d18c" {L}/>'
        + f'<ellipse cx="50" cy="92" rx="8" ry="7" fill="#c7d18c" {L}/>'
        + f'<path d="M14 40 Q10 10 30 4 Q34 22 40 24 Q48 0 50 0 Q52 0 60 24 Q66 22 70 4 Q90 10 86 40 Z" fill="#46512f" {L}/>'
        + face(50, 50, 32, '#6f7d4e')
        + f'<path d="M22 70 l-10 8 M78 70 l10 8 M30 78 l-6 12 M70 78 l6 12" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>',
}
for n, b in MODERN.items(): svg('modern', f'enemy-{n}', b)
for n, b in SCIFI.items(): svg('scifi', f'enemy-{n}', b)

for k, v in files.items():
    p = f'{OUT}/svg/{k}.svg'; os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w').write(v)
print(len(files), 'svgs')
