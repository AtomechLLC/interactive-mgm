/* Mewgenics cat puppet for slide 1: composes one front-facing cat from the game's own part sprites (kitten-art.js),
   posed with the catanis.swf idle rig and tinted through the coat palette LUT. A trimmed port of the renderer in the
   Mewgenics Kitten Share (atomechllc.github.io/mewgenics-kitten-share, renderPortrait): no items, scars or animation.
   KITTEN.svg(pick) takes { eye, leg, ear, tail, mouth, body, head, eyebrow, fur } as art frames
   (undefined/null = base kitten part, -1 = part removed) and returns an SVG string. */
(function () {
  const PARTS = window.KIT_PARTS, SOCK = window.KIT_SOCKETS, TEX = window.KIT_TEXTURES, LUT = window.KIT_LUT;
  const matStr = m => `matrix(${m.sx == null ? 1 : m.sx} ${m.r0 || 0} ${m.r1 || 0} ${m.sy == null ? 1 : m.sy} ${m.tx || 0} ${m.ty || 0})`;
  // idle-pose rig from catanis.swf (back to front); legs share one CatLeg sprite
  const RIG = {
    group: { sx: 1, sy: 1, tx: 3.85, ty: -47.95 }, viewBox: '-84 -110 176 147',
    layers: [
      { slot: 'tail', sprite: 'CatTail', m: { sx: 0.59964, r0: 0.162415, r1: -0.162415, sy: 0.59964, tx: -24.45, ty: 10.05 } },
      { slot: 'leg', sprite: 'CatLeg', m: { sx: 0.621262, r1: -0.047958, sy: 0.621262, tx: -9.85, ty: 23.65 } },
      { slot: 'leg', sprite: 'CatLeg', m: { sx: 0.621262, sy: 0.621262, tx: 17.15, ty: 32.45 } },
      { slot: 'body', sprite: 'CatBody', m: { sx: 0.621307, r0: 0.004456, r1: -0.01178, sy: 0.621109, tx: -0.4, ty: 16.35 } },
      { slot: 'leg', sprite: 'CatLeg', m: { sx: 0.621262, r1: -0.088364, sy: 0.621262, tx: -32.1, ty: 27.1 } },
      { slot: 'leg', sprite: 'CatLeg', m: { sx: 0.621262, sy: 0.621262, tx: -4.7, ty: 37.25 } },
      { slot: 'head', sprite: 'CatHead', m: { sx: 0.621262, sy: 0.621262, tx: 10.95, ty: 2.3 } },
    ],
  };
  const TEXTURED = { CatBody: 1, CatHead: 1, CatTail: 1, CatLeg: 1, CatEar: 1 };
  let uid = 0;
  // suffix every mask/gradient id per instance: ~14 parts share one <svg>, and duplicate ids mis-clip
  function namespace(defs, body) {
    const ids = [...new Set((defs.match(/id="([^"]+)"/g) || []).map(s => s.slice(4, -1)))];
    if (!ids.length) return { defs, body };
    const suf = '_k' + (uid++);
    for (const id of ids) {
      defs = defs.split('id="' + id + '"').join('id="' + id + suf + '"');
      for (const end of [')', '"']) { defs = defs.split('#' + id + end).join('#' + id + suf + end); body = body.split('#' + id + end).join('#' + id + suf + end); }
    }
    return { defs, body };
  }
  function part(sprite, frame) {
    const p = PARTS[sprite]; if (!p) return { defs: '', body: '' };
    let f = p.frames[frame] || p.frames[0];
    // a maskless textured frame would draw as a solid box: fall back to the masked base frame
    if (f && TEXTURED[sprite] && !f.defs && p.frames[0] && p.frames[0].defs) f = p.frames[0];
    if (!f) return { defs: '', body: '' };
    return f.defs ? namespace(f.defs, f.body) : { defs: '', body: f.body };
  }
  // grey pixels go through the coat LUT (the game's paletted shader); coloured art keeps its colour
  function tint(svg) {
    const shade = v => LUT[Math.max(0, Math.min(15, Math.round(v / 255 * 15)))];
    svg = svg.replace(/(fill|stroke)="rgb\((\d+),(\d+),(\d+)\)"/g, (m, a, r, g, b) => {
      r = +r; g = +g; b = +b;
      return Math.max(r, g, b) - Math.min(r, g, b) > 24 ? m : `${a}="${shade((r + g + b) / 3)}"`;
    });
    return svg.replace(/stop-color="rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)"/g, (m, r, g, b, al) => {
      r = +r; g = +g; b = +b;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 24) return m;
      const h = shade((r + g + b) / 3);
      return al === undefined ? `stop-color="${h}"` : `stop-color="rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${al})"`;
    });
  }
  const toHex = s => s.replace(/(fill|stroke)="rgb\((\d+),\s*(\d+),\s*(\d+)\)"/g,
    (m, a, r, g, b) => `${a}="#${[r, g, b].map(x => (+x).toString(16).padStart(2, '0')).join('')}"`);
  const FUR = /<g data-fur="1"[^>]*>[\s\S]*?<\/g>/;

  function svg(pick) {
    const fr = k => { const v = pick[k]; return v == null ? 0 : v < 0 ? null : v; };
    let defs = '', out = '';
    // the fur pattern replaces each furred part's placeholder fur rect, so the part's own mask clips it
    const pat = pick.fur != null && pick.fur >= 0 && TEX[pick.fur] ? pick.fur : null;
    const furred = body => {
      if (pat == null || !FUR.test(body)) return body;
      const t = namespace(TEX[pat].defs || '', TEX[pat].body || ''); defs += t.defs;
      return body.replace(FUR, t.body);
    };
    function head(m) {
      const hf = fr('head') ?? 0, so = SOCK[hf] || SOCK[0] || {};
      let h = '';
      const hp = part('CatHead', hf); defs += hp.defs;
      for (const s of [so.earL, so.earR]) if (s && fr('ear') !== null) { const e = part('CatEar', fr('ear')); defs += e.defs; h += `<g transform="${matStr(s)}">${furred(e.body)}</g>`; }
      h += furred(hp.body);
      const add = (s, k, sprite, draw) => { if (!s || fr(k) === null) return; const p = part(sprite, fr(k)); defs += p.defs; h += draw(s, p.body); };
      const mir = s => (s.sx != null && s.sx < 0) ? -1 : 1;
      add(so.mouth, 'mouth', 'CatMouth', (s, b) => `<g transform="matrix(1 0 0 1 ${s.tx} ${s.ty})">${b}</g>`);
      for (const s of [so.eyeL, so.eyeR]) add(s, 'eye', 'CatEye', (s, b) => `<g transform="matrix(${mir(s)} 0 0 1 ${s.tx || 0} ${s.ty || 0})">${toHex(b)}</g>`);
      for (const s of [so.browL, so.browR]) add(s, 'eyebrow', 'CatEyebrow', (s, b) => `<g transform="matrix(${mir(s)} 0 0 1 ${s.tx || 0} ${(s.ty || 0) - 16})">${b}</g>`);
      out += `<g transform="${matStr(m)}">${h}</g>`;
    }
    for (const L of RIG.layers) {
      if (L.slot === 'head') { head(L.m); continue; }
      const f = fr(L.slot); if (f === null) continue;
      const p = part(L.sprite, f); defs += p.defs;
      out += `<g transform="${matStr(L.m)}">${furred(p.body)}</g>`;
    }
    return tint(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${RIG.viewBox}"><defs>${defs}</defs><g transform="${matStr(RIG.group)}">${out}</g></svg>`);
  }
  window.KITTEN = { svg, aspect: 176 / 147 };
})();
