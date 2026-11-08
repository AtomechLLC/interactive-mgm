/* Zoning and Spacing (MGM C4 M4, part 5): the Ashe vs Zed lane fight as one deterministic 1D simulation.
   Distances are League of Legends units. Ranges, move speeds and cooldowns are Data Dragon 16.22.1 values
   (Ashe 600 range, 325 move speed; Zed 125 range, 345 move speed; Living Shadow 650, Death Mark 625);
   health, damage and attack speed are rounded mid-game numbers so the fight resolves in a few seconds.
   The rules live here so the lane, the charts and the GIF recorder can never disagree. */
(function (root) {
  const DT = 1 / 60, T_MAX = 12;
  const ASHE = { hp: 1100, aa: 110, period: 0.9, wind: 0.25, speed: 325, frost: 0.25, frostT: 2, volley: 70, volleyRange: 1200, volleySlow: 0.4, volleyT: 2 };
  const ZED = { hp: 1100, aa: 120, period: 1.0, range: 125, wRange: 650, rRange: 625, markT: 3 };
  const START_GAP = 1100;

  // p: { range, zspd, room, frost, volley, w, r }
  function simulate(p) {
    let a = p.room, z = p.room + START_GAP, hpA = ASHE.hp, hpZ = ZED.hp;
    let aCd = 0, aWind = 0, zCd = 0.2, slowT = 0, slow = 0, vCd = 0, wUsed = false, rUsed = false, markT = 0;
    let tIn = 0, tAsheIn = 0, dealtA = 0, dealtZ = 0, winner = null, tEnd = T_MAX;
    const frames = [], ev = [];
    for (let i = 0; i <= T_MAX / DT; i++) {
      const t = i * DT;
      let d = z - a;
      // ---- Ashe: attack when Zed is in range, otherwise back off to keep him at the edge of it ----
      if (aWind > 0) {
        aWind -= DT;
        if (aWind <= 0) {
          hpZ -= ASHE.aa; dealtA += ASHE.aa; ev.push({ t, k: 'aa', dmg: ASHE.aa });
          if (p.frost) { slow = Math.max(slowT > 0 ? slow : 0, ASHE.frost); slowT = Math.max(slowT, ASHE.frostT); }
        }
      } else if (p.volley && vCd <= 0 && d <= ASHE.volleyRange) {
        hpZ -= ASHE.volley; dealtA += ASHE.volley; vCd = 11; aWind = 0; slow = Math.max(slow, ASHE.volleySlow); slowT = Math.max(slowT, ASHE.volleyT);
        ev.push({ t, k: 'volley', dmg: ASHE.volley });
      } else if (d <= p.range && aCd <= 0) {
        aWind = ASHE.wind; aCd = ASHE.period;
      } else if (d < p.range * 0.95) {
        a = Math.max(0, a - ASHE.speed * DT);
      }
      aCd -= DT; vCd -= DT;
      d = z - a;
      if (d <= p.range) tAsheIn += DT;
      // ---- Zed: walk in, use a gap closer as soon as the target is inside its reach ----
      if (d > ZED.range) {
        if (p.r && !rUsed && d <= ZED.rRange) {
          rUsed = true; markT = ZED.markT; z = a + 90; ev.push({ t, k: 'r', from: d });
        } else if (p.w && !wUsed && d <= ZED.wRange) {
          wUsed = true; z = Math.max(a + 90, z - ZED.wRange); ev.push({ t, k: 'w', from: d });
        } else {
          const spd = p.zspd * (slowT > 0 ? 1 - slow : 1);
          z = Math.max(a + 90, z - spd * DT);
        }
      }
      d = z - a;
      if (d <= ZED.range) {
        tIn += DT;
        if (zCd <= 0) {
          const dmg = ZED.aa * (markT > 0 ? 2 : 1);
          hpA -= dmg; dealtZ += dmg; zCd = ZED.period; ev.push({ t, k: 'zhit', dmg, mark: markT > 0 });
        }
      }
      zCd -= DT; markT -= DT; slowT -= DT;
      frames.push({ t, a, z, hpA: Math.max(0, hpA), hpZ: Math.max(0, hpZ), slowed: slowT > 0, mark: markT > 0, wind: aWind > 0 });
      if (hpA <= 0 || hpZ <= 0) { winner = hpA <= 0 ? 'zed' : 'ashe'; tEnd = t; break; }
    }
    if (!winner) winner = 'none';
    return { frames, ev, winner, tEnd, tIn, tAsheIn, dealtA, dealtZ, capZ: tIn / tEnd, capA: tAsheIn / tEnd, reached: tIn > 0 };
  }
  const frameAt = (r, t) => r.frames[Math.min(r.frames.length - 1, Math.max(0, Math.round(t / DT)))];

  const api = { simulate, frameAt, ASHE, ZED, START_GAP, DT, T_MAX };
  if (typeof module !== 'undefined') module.exports = api; else root.ZoneSim = api;
})(this);
