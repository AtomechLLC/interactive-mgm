"""Build the student token folder from the art already used in the interactive-mgm decks.
Usage: python3 compose.py <repo> <build dir> <out dir>"""
import sys, os, re, json, glob, shutil
from PIL import Image, ImageDraw, ImageFilter, ImageChops

REPO, BUILD, OUT = sys.argv[1:4]
SS = 1024                      # supersampled canvas, downscaled to each output size
SIZES = [512, 256]

RING = {  # ring colours by side
    'enemy': '#ef5a55', 'player': '#8b1cf0', 'ally': '#2fae63',
    'ability': '#3d8bff', 'object': '#7b8496', 'hazard': '#f08c1a', 'role': '#c8aa6e',
}
NAVY, PARCH, GOLDLINE, EDGE = '#1c2440', '#f3ead7', '#6b4a12', '#151826'

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def kind_of(im):
    if im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getchannel('A').getextrema()[0] < 250:
        return 'pixel' if max(im.size) <= 96 else 'cutout'
    return 'square'

def trim(im):
    bb = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(bb) if bb else im

def fit(im, box, nearest):
    w, h = im.size; k = box / max(w, h)
    if nearest and k >= 1: k = max(1, int(k))  # whole-number scale keeps pixel art crisp
    return im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.NEAREST if nearest else Image.LANCZOS)

def circle_mask(size, r, cx=None):
    m = Image.new('L', (size, size), 0); c = size / 2 if cx is None else cx
    ImageDraw.Draw(m).ellipse((c - r, c - r, c + r, c + r), fill=255); return m

def paste_center(dst, im):
    dst.alpha_composite(im, ((dst.width - im.width) // 2, (dst.height - im.height) // 2))

def glyph_layer(name, colour, box):
    a = Image.open(f'{BUILD}/raw/gi/{name}.png').getchannel('A')
    a = a.crop(a.getbbox()); a = fit(a.convert('L'), box, False)
    lay = Image.new('RGBA', a.size, hexrgb(colour) + (0,)); lay.putalpha(a); return lay

def src_image(e):
    if e['kind'] == 'glyph': return None
    im = Image.open(e['src']).convert('RGBA')
    if e.get('crop'): w, h = im.size; c = e['crop']; im = im.crop((round(w * c), round(h * c), round(w * (1 - c)), round(h * (1 - c))))
    return im

def plain(e):
    S = SS; out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); im = src_image(e)
    if e['kind'] == 'glyph':
        g = glyph_layer(e['src'], NAVY, int(S * .84))
        halo = Image.new('RGBA', (S, S), (255, 255, 255, 0)); a = Image.new('L', (S, S), 0)
        a.paste(g.getchannel('A'), ((S - g.width) // 2, (S - g.height) // 2)); a = a.filter(ImageFilter.MaxFilter(13))
        halo.putalpha(a); out.alpha_composite(halo); paste_center(out, g)
    elif e['kind'] == 'square':
        im = im.resize((int(S * .94), int(S * .94)), Image.LANCZOS)
        m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=int(S * .1), fill=255)
        im.putalpha(ImageChops.multiply(im.getchannel('A'), m)); paste_center(out, im)
    else:
        paste_center(out, fit(trim(im), int(S * .9), e['kind'] == 'pixel'))
    return out

def token(e, side):
    S = SS; R = S * .48; RW = S * .075; inner = R - RW
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(out); c = S / 2
    # outer dark edge, coloured ring
    d.ellipse((c - R - S * .008, c - R - S * .008, c + R + S * .008, c + R + S * .008), fill=EDGE)
    d.ellipse((c - R, c - R, c + R, c + R), fill=RING[side])
    content = Image.new('RGBA', (S, S), (0, 0, 0, 0)); im = src_image(e)
    if e['kind'] == 'square':
        sq = im.resize((int(inner * 2) + 2, int(inner * 2) + 2), Image.LANCZOS); paste_center(content, sq)
    else:
        bg = NAVY if e['kind'] == 'glyph' or e.get('dark') else PARCH
        ImageDraw.Draw(content).ellipse((c - inner, c - inner, c + inner, c + inner), fill=bg)
        if e['kind'] == 'glyph': paste_center(content, glyph_layer(e['src'], '#ffffff', int(inner * 2 * .66)))
        else: paste_center(content, fit(trim(im), int(inner * 2 * .74), e['kind'] == 'pixel'))
    content.putalpha(ImageChops.multiply(content.getchannel('A'), circle_mask(S, inner)))
    out.alpha_composite(content)
    lw = S * .014; d.ellipse((c - inner - lw / 2, c - inner - lw / 2, c + inner + lw / 2, c + inner + lw / 2), outline=GOLDLINE, width=int(lw))
    return out

def blank_ring(side):
    S = SS; R = S * .48; RW = S * .075; c = S / 2
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(out)
    d.ellipse((c - R - S * .008,) * 2 + (c + R + S * .008,) * 2, fill=EDGE); d.ellipse((c - R,) * 2 + (c + R,) * 2, fill=RING[side])
    d.ellipse((c - R + RW + S * .008,) * 2 + (c + R - RW - S * .008,) * 2, fill=EDGE)
    hole = c - R + RW; d.ellipse((hole, hole, S - hole, S - hole), fill=(0, 0, 0, 0))
    return out

# ---------------------------------------------------------------- manifest
E = []
def add(theme, name, src, sides, kind=None, **kw):
    if kind is None: kind = kind_of(Image.open(src))
    E.append(dict(theme=theme, name=name, src=src, sides=sides, kind=kind, **kw))
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
R = REPO
BOTH = ['enemy', 'player']

# Mario (Super Mario Bros. and Super Mario World sprites, plus the hi-res cast from the co-op interactions deck)
SKIP = re.compile(r'(-step|walk[23]|run\d|cape-walk\d|squish|piranha-shut|bowser-fire|vine$|ground$)')
MPLAYER = {'mario', 'mario-jump', 'mario-walk1', 'fire-mario', 'fire-mario-jump', 'cape-mario', 'cape-fly', 'smw-mario', 'smw-mario-jump', 'smw-mario-walk1', 'luigi', 'peach'}
MOBJ = {'coin', 'mushroom', 'star', 'qblock', 'feather', 'dragon-coin', 'hard-block', 'used-block', 'trampoline', 'smw-qblock', 'vine-top'}
MHAZ = {'fireball', 'spiny-egg', 'koopa-shell', 'red-shell', 'buzzy-shell', 'hammer'}
seen = set()
for f in sorted(glob.glob(f'{R}/composition/shared/img/smb-*.png') + glob.glob(f'{R}/mechanics-tools/*/img/sm[bw]-*.png') + glob.glob(f'{R}/understand-mechanics/img/smb-*.png')):
    b = os.path.basename(f)[:-4]
    if SKIP.search(b): continue
    n = b.split('-', 1)[1]
    if b.startswith('smw-') and n in ('mario', 'mario-jump', 'mario-walk1', 'qblock'): n = 'smw-' + n
    n = n.replace('walk1', 'walk')
    if n in seen: continue
    seen.add(n)
    key = n.replace('smw-', '') if n.startswith('smw-') and n not in MPLAYER else n
    side = ['player'] if n.replace('-walk', '-walk1') in MPLAYER or n in MPLAYER else ['object'] if key in MOBJ else ['hazard'] if key in MHAZ else ['enemy']
    add('mario', n, f, side)
for b in ['mario', 'luigi', 'peach', 'bobomb', 'boo', 'goomba', 'koopa', 'piranha', 'hammer']:
    n = b + '-hd'; side = ['player'] if b in ('mario', 'luigi', 'peach') else ['hazard'] if b == 'hammer' else ['enemy']
    add('mario', n, f'{R}/coop-interactions/interactions/img/{b}.png', side)

# Pokémon
seen = set()
for f in sorted(glob.glob(f'{R}/*/img/pk-*.png') + glob.glob(f'{R}/*/*/img/pk-*.png') + glob.glob(f'{R}/understand-mechanics/img/pikachu.png') + glob.glob(f'{R}/understand-mechanics/img/squirtle.png')):
    n = os.path.basename(f)[:-4].replace('pk-', '')
    if n in seen: continue
    seen.add(n); add('pokemon', n, f, ['object'] if n.endswith('-ball') else BOTH)

# World of Warcraft icons
seen = set()
wow = sorted(glob.glob(f'{R}/composition/shared/img/wow-*.jpg') + glob.glob(f'{R}/understand-mechanics/img/*.jpg') + glob.glob(f'{R}/pve-interactions/permutations/img/*.jpg')
             + glob.glob(f'{R}/mechanics-tools/reverse-map/img/wow-*.jpg') + glob.glob(f'{R}/coop-interactions/keywords/img/wow-*.jpg'))
for f in wow:
    n = slug(os.path.basename(f)[:-4].replace('wow-', ''))
    if n in seen: continue
    seen.add(n)
    if n.startswith('classicon'): add('wow-classes-and-bosses', n.replace('classicon-', 'class-'), f, ['player'], crop=.06)
    elif 'boss' in n: add('wow-classes-and-bosses', n.replace('achievement-', ''), f, ['enemy'], crop=.06)
    elif n.startswith('inv-') or n == 'wow-token01': add('wow-items', n, f, ['object'], crop=.06)
    else: add('wow-abilities', n, f, ['ability'], crop=.06)

# League of Legends
for f in sorted(glob.glob(f'{R}/coop-interactions/team-roles/img/*.png')):
    b = os.path.basename(f)[:-4]
    if b.startswith('champ-'): add('league-of-legends', b, f, BOTH)
    else: add('roles-and-classes', 'lol-' + b, f, ['role'], dark=True)
for f in sorted(glob.glob(f'{R}/pvp/counter-cycles/img/moba-*.jpg')):
    add('league-of-legends', 'champ-' + {'assassin': 'zed', 'bruiser': 'darius', 'mage': 'lux', 'marksman': 'jinx', 'tank': 'malphite'}[os.path.basename(f)[5:-4]], f, BOTH)
for f in sorted(glob.glob(f'{R}/composition/shared/img/lol-*.png') + glob.glob(f'{R}/mechanics-tools/contrapositive-rules/img/lol-*.png')):
    b = os.path.basename(f)[4:-4]
    if b.startswith('champ-'): add('league-of-legends', slug(b), f, BOTH)
    elif b.startswith('item'): add('league-of-legends', 'item-dorans-blade', f, ['object'])
    elif b in ('ashe', 'pyke'): add('league-of-legends', 'champ-' + b, f, BOTH)
    else: add('league-of-legends', 'ability-' + slug(re.sub(r'([a-z])([A-Z])', r'\1-\2', b.replace('Wrapper', ''))), f, ['ability'])
for f in sorted(glob.glob(f'{R}/pvp/counter-cycles/img/rts-*.jpg')):
    add('starcraft', 'opening-' + os.path.basename(f)[4:-4], f, ['ability'])

# StarCraft II co-op
for f in sorted(glob.glob(f'{R}/pve-interactions/mutators/img/sc2-*.png')):
    b = os.path.basename(f)[4:-4]
    if b.startswith('mut-'): add('starcraft', 'mutator-' + b[4:], f, ['hazard'])
    else: add('starcraft', b, f, ['enemy'] if b in ('broodling', 'roach', 'zergling') else BOTH)

# Enter the Gungeon
for f in sorted(glob.glob(f'{R}/pve-interactions/gungeon-variants/img/*.png')):
    b = os.path.basename(f)[:-4]
    if b.startswith('card-') or b == 'logo': continue
    add('enter-the-gungeon', b, f, ['player'] if b == 'pilot' else ['object'] if b == 'table' else ['enemy'])

# Zelda
for b, side in [('colgera', ['enemy']), ('gibdo', ['enemy']), ('mucktorok', ['enemy']), ('riju-icon', ['ally']), ('sidon-icon', ['ally']), ('tulin-icon', ['ally']), ('yunobo-icon', ['ally'])]:
    add('zelda', b.replace('-icon', ''), f'{R}/pve-interactions/lessons/img/{b}.png', side, kind='square' if b in ('colgera', 'gibdo', 'mucktorok') else None)
add('zelda', 'gohma', f'{R}/pve-interactions/lessons/img/gohma-portrait.jpg', ['enemy'])
for b in ('tloz-link', 'tloz-link-red'): add('zelda', b.replace('tloz-', ''), f'{R}/understand-mechanics/img/{b}.png', ['player'])

# Game audits (Celeste, Cyberpunk 2077, Deadlock, Expedition 33, Factorio, God of War, Runeterra, Minecraft, Mario Kart 8, Portal 2, StarCraft, Subnautica, Slay the Spire)
GAME = {'cel': 'celeste', 'cp': 'cyberpunk-2077', 'dl': 'deadlock', 'e33': 'expedition-33', 'fac': 'factorio', 'gow': 'god-of-war', 'lor': 'legends-of-runeterra',
        'mc': 'minecraft', 'mk': 'mario-kart-8', 'p2': 'portal-2', 'sc': 'starcraft-brood-war', 'sn': 'subnautica', 'sts': 'slay-the-spire'}
CHAR = {'cel-badeline', 'cel-madeline', 'cp-v', 'dl-abrams', 'e33-gustave', 'e33-lune', 'e33-maelle', 'e33-sciel', 'fac-biter', 'gow-atreus', 'gow-kratos', 'gow-kratos-greek',
        'lor-draven', 'lor-draven2', 'lor-teemo', 'lor-teemo2', 'mc-steve', 'mk-mario', 'p2-chell', 'p2-wheatley', 'sc-marine', 'sc-medic', 'sc-tank', 'sc-vulture', 'sc-vessel',
        'sc-lurker', 'sts-ironclad', 'sts-nob'}
for f in sorted(glob.glob(f'{R}/composition/audits/img/*.png')):
    b = os.path.basename(f)[:-4]; p, n = b.split('-', 1)
    add('more-games', f'{GAME[p]}-{n}', f, BOTH if b in CHAR else ['ability'])

# game-icons.net glyphs, grouped by what they stand for on a map
GI = json.load(open(f'{BUILD}/gi.json'))
GROUPS = {
    'creatures': ('enemy', 'bat-wing brute charging-bull crab crowned-skull cyborg-face cyclops daemon-skull dragon-head evil-minion fire-silhouette ghost horned-skull imp imp-laugh mole ogre owl robot-golem rock-golem shambling-zombie skull-crossed-bones snail spider-alt spider-bot spider-face troll turtle wizard-face wolf-head egg-clutch swordman fencer heavy-helm visored-helm skull-shield'),
    'weapons': ('object', 'battle-axe bow-arrow broadsword chainsaw claw-hammer crossed-swords curvy-knife dripping-blade flail flat-hammer halberd hand-saw high-shot katana mace-head minigun plain-dagger pocket-bow pointy-sword reaper-scythe relic-blade rocket saw-claw scythe shotgun spear-feather spear-hook spiked-mace stiletto sword-brandish thrown-daggers two-handed-sword warhammer whip wizard-staff zeus-sword wood-axe arrow-flights missile-swarm round-shield templar-shield checked-shield crab-claw'),
    'items-and-pickups': ('object', 'chest locked-chest potion-ball round-potion round-bottom-flask poison-bottle heart-bottle heart-plus heart-organ health-increase healing sticking-plaster meat steak cherry two-coins gem-chain crown trophy scroll-unfurled spell-book treasure-map lantern lantern-flame dice-six-faces-four dice-twenty-faces-twenty card-play card-random cauldron mushroom-gills sprout lyre hourglass sands-of-time'),
    'elements-and-hazards': ('hazard', 'acid biohazard drop water-drop water-splash wave-crest flame small-fire fire-bowl fire-bomb fire-ray frozen-orb ice-cube snowflake-1 lightning-arc lightning-helix lightning-storm bolt-spell-cast raining tornado whirlwind leaf-swirl grass earth-crack explosion-rays spiky-explosion unlit-bomb smoke-bomb trap-mask rolling-energy pentacle wind-slap sound-waves dna1'),
    'obstacles-and-terrain': ('object', 'brick-wall stone-block stone-pile rock log wood-beam wood-pile wooden-crate barrel oil-drum castle tower-flag door padlock portal campfire tree-branch metal-bar anvil spawn-node jeep hang-glider'),
    'actions-and-keywords': ('ability', 'anticlockwise-rotation clockwise-rotation boot-kick broken-bone broken-shield bullseye cape conversation crosshair cycle dodge dodging eye-target fist grab grapple hand heavy-fall high-kick hook magic-shield mirror-mirror punch punch-blast return-arrow shield-bash shield-impact shield-reflect fire-shield split-arrows sprint sword-clash target-arrows teleport scales stopwatch plain-arrow pin round-star radar-sweep magnifying-glass brain spinning-sword turtle-shell'),
    'design-tools': ('object', 'cog gears game-console joystick video-camera paint-brush pencil puzzle checkbox-tree spade'),
}
placed = set()
for theme, (side, names) in GROUPS.items():
    for n in names.split():
        if n in GI and n not in placed: placed.add(n); E.append(dict(theme='icons-' + theme, name=n, src=n, sides=[side], kind='glyph', author=GI[n][0]))
missing = sorted(set(GI) - placed)
if missing: print('unplaced glyphs:', missing)

# ---------------------------------------------------------------- write
if os.path.exists(OUT): shutil.rmtree(OUT)
def save(im, theme, fname):
    for s in SIZES:
        d = f'{OUT}/{s}px/{theme}'; os.makedirs(d, exist_ok=True)
        im.resize((s, s), Image.LANCZOS).save(f'{d}/{fname}.png', optimize=True)

index = []
for e in E:
    save(plain(e), e['theme'], e['name'])
    files = [e['name'] + '.png']
    for side in e['sides']:
        sfx = f'-token-{side}' if len(e['sides']) > 1 or side in ('enemy', 'player') else '-token'
        save(token(e, side), e['theme'], e['name'] + sfx); files.append(e['name'] + sfx + '.png')
    index.append(dict(theme=e['theme'], name=e['name'], sides=e['sides'], files=files, source=os.path.relpath(e['src'], R) if e['kind'] != 'glyph' else f"game-icons.net / {e['author']}"))

# map markers: the Forsaken mockup telegraphs and the top-down kit discs, kept as-is (no ring)
FORS = 'Acid Circle_Friendly Circle_Hostile Circle_Transparent Cone_Friendly Cone_Hostile Dizzy_Swirl Earth Hit_Friendly Hit_Hostile Mana_Crystal Missile_Friendly Missile_Hostile Monster Not_Symbol Plague Protect_Friendly Protect_Hostile Rock ShieldBreak_Left_Hostile ShieldBreak_Right_Hostile Shielded_Friendly Shielded_Hostile Spear Storm Swoosh_Friendly Swoosh_Hostile Sword Hammer Dagger Target_Reticule Token_Player1 Token_Player2 Token_Player3 Trapezoid_Friendly Trapezoid_Hostile Zap_Friendly Zap_Hostile Zone_Friendly Zone_Hostile Arrow'.split()
for b in FORS:
    f = f'{R}/assets/img/forsaken/{b}.png'; n = slug(b.replace('Friendly', 'ally').replace('Hostile', 'enemy').replace('_', '-'))
    save(plain(dict(src=f, kind='cutout')), 'map-markers', n)
    index.append(dict(theme='map-markers', name=n, sides=[], files=[n + '.png'], source=os.path.relpath(f, R)))
for f in sorted(glob.glob(f'{BUILD}/raw/td/*.png')):
    n = 'disc-' + os.path.basename(f)[:-4]; im = Image.open(f).convert('RGBA'); im = im.resize((SS, SS), Image.LANCZOS)
    save(plain(dict(src=f, kind='cutout')), 'map-markers', n)
    index.append(dict(theme='map-markers', name=n, sides=[], files=[n + '.png'], source='blog-posts/shared/topdown.js (TD.player / TD.foe)'))
for side in RING:
    n = f'blank-ring-{side}'; save(blank_ring(side), 'map-markers', n)
    index.append(dict(theme='map-markers', name=n, sides=[side], files=[n + '.png'], source='ring only, drop it over any image'))

json.dump(index, open(f'{OUT}/index.json', 'w'), indent=1)
print(len(E), 'icons,', sum(len(i['files']) for i in index), 'files per size')
