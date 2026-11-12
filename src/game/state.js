// プレイヤーデータ・セーブ・経済・任務
import { G, rng, pick } from '../core/util.js';
import { SHIPS, COMMODITIES, PRICES, ENEMIES, STATIONS, BODIES, BASES, RESCUE, DISASTERS } from '../world/defs.js';

const KEY = 'starfable-save-v1';
export function newGame(ship = 'hayate') {
  return {
    v: 1, credits: 6000, ship, cargo: {}, missions: [], done: {}, last: 'haven', hp: 100, day: 1, flags: {}, quality: null, invertY: false, sound: true,
    ships: Object.fromEntries(Object.keys(SHIPS).map((k) => [k, { hull: 1, up: { laser: 0, shield: 0, armor: 0, engine: 0, cargo: 0, missile: 0 } }])),
    stats: { kills: 0, captures: 0, docks: {}, lands: {}, earned: 0 },
  };
}
export function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) { /* 保存なし */ } return null; }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(G.p)); } catch (e) { /* プライベートモード等 */ } }
export function wipe() { try { localStorage.removeItem(KEY); } catch (e) { /* noop */ } }

export function stats(id = G.p.ship) {
  const s = SHIPS[id], u = G.p.ships[id].up;
  return { ...s, dmg: s.dmg * (1 + 0.18 * u.laser), shield: s.shield * (1 + 0.2 * u.shield), hull: s.hull * (1 + 0.2 * u.armor), maxSpeed: s.maxSpeed * (1 + 0.1 * u.engine), accel: s.accel * (1 + 0.1 * u.engine),
    cargo: Math.round(s.cargo * (1 + 0.3 * u.cargo)), missiles: s.missiles + 4 * u.missile };
}
export const cargoUsed = () => Object.values(G.p.cargo).reduce((a, b) => a + b, 0);
export function addCargo(id, n) { const k = Math.max(0, Math.min(n, stats().cargo - cargoUsed())); if (k > 0) G.p.cargo[id] = (G.p.cargo[id] || 0) + k; return k; }
export function takeCargo(id, n) { const h = G.p.cargo[id] || 0, k = Math.min(h, n); if (k > 0) { G.p.cargo[id] = h - k; if (!G.p.cargo[id]) delete G.p.cargo[id]; } return k; }
export const commodity = (id) => COMMODITIES.find((c) => c.id === id);
export function price(sid, cid) {
  const c = commodity(cid), m = PRICES[sid]?.[cid]; if (m == null) return null;
  return Math.max(1, Math.round(c.base * m * (1 + 0.08 * Math.sin(G.p.day * 1.7 + c.base + sid.length * 3))));
}
export function earn(n) { G.p.credits += n; if (n > 0) G.p.stats.earned += n; }
export const remaining = () => ENEMIES.filter((e) => !G.p.done[e.id]).length;

// ── 任務 ──
export function missionBoard(sid) {
  const r = rng(G.p.day * 131 + sid.length * 977 + sid.charCodeAt(0)), out = [], others = STATIONS.filter((s) => s.id !== sid), planets = BODIES.filter((b) => b.type !== 'sun');
  const left = remaining();
  if (left > 0) { const n = Math.min(left, 1 + Math.floor(r() * 3)); out.push({ id: `b${G.p.day}${sid}`, type: 'bounty', title: `ヴォイド艦 ${n} 隻の無力化`, desc: '撃沈・拿捕のどちらでも可。星図の「敵影」から位置を確認できる。', need: n, prog: 0, reward: 2600 * n }); }
  const to = pick(r, others), c = pick(r, COMMODITIES.slice(0, 8)), q = 2 + Math.floor(r() * 4);
  out.push({ id: `d${G.p.day}${sid}`, type: 'deliver', title: `${to.name} へ ${c.name} ×${q} を輸送`, desc: `積荷は受注時に積み込まれる。${to.name} にドッキングすると納品完了。`, to: to.id, cargo: c.id, qty: q, need: 1, prog: 0, reward: 1800 + q * 350 });
  const pl = pick(r, planets);
  out.push({ id: `s${G.p.day}${sid}`, type: 'survey', title: `${pl.name} の地表調査`, desc: `${BASES[pl.id].name} に着陸し、地表で資源サンプルを 2 つ採取する。`, body: pl.id, need: 2, prog: 0, reward: 3200 });
  if (left > 0 && r() < 0.8) out.push({ id: `c${G.p.day}${sid}`, type: 'capture', title: '敵艦の拿捕', desc: '航行不能にした敵艦へ接舷して乗り込み、艦橋の制御コアを掌握する。', need: 1, prog: 0, reward: 7000 });
  return out.filter((m) => !G.p.missions.some((x) => x.id === m.id) && !G.p.flags['m' + m.id]);
}
export function accept(m) {
  if (m.type === 'deliver' && addCargo(m.cargo, m.qty) < m.qty) { takeCargo(m.cargo, m.qty); return false; }
  G.p.missions.push(m); return true;
}
/** ゲーム内イベントで任務を進める */
export function event(type, data = {}) {
  for (const m of [...G.p.missions]) {
    let hit = false;
    if (m.type === 'bounty' && (type === 'kill' || type === 'capture')) hit = true;
    else if (m.type === 'capture' && type === 'capture') hit = true;
    else if (m.type === 'survey' && type === 'sample' && data.body === m.body) hit = true;
    else if (m.type === 'deliver' && type === 'dock' && data.station === m.to && (G.p.cargo[m.cargo] || 0) >= m.qty) { takeCargo(m.cargo, m.qty); hit = true; }
    if (!hit) continue;
    m.prog++;
    if (m.prog >= m.need) {
      G.p.missions.splice(G.p.missions.indexOf(m), 1); G.p.flags['m' + m.id] = 1; earn(m.reward);
      G.hud?.msg(`任務達成：${m.title}　報酬 ${m.reward.toLocaleString()} Cr`, 'good', 7); G.audio?.sfx('reward');
    } else G.hud?.msg(`任務進行：${m.title} (${m.prog}/${m.need})`, 'good');
  }
}

// ── 救助船ミケーネの出動 (アトラス救難基地) ──
const hsh = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const rescueState = () => (G.p.flags.rescue || (G.p.flags.rescue = { n: 0, day: 0 }));
/** いま地球で起きている災害 (4 日ごとに入れ替わる)。なければ null */
export function disaster(day = G.p.day) {
  const blk = Math.floor(day / 4); if (day < 2 || hsh(blk * 3 + 1) > 0.62) return null;
  return { ...DISASTERS[Math.floor(hsh(blk * 7 + 5) * DISASTERS.length) % DISASTERS.length], blk, done: !!G.p.flags['dz' + blk] };
}
/** 救助船 n 機を地球の都市へ出動させる */
export function dispatch(n) { const st = rescueState(); st.n = Math.max(0, Math.min(RESCUE.max, n)); st.day = G.p.day; G.rescueLaunch = true; save(); return st.n; }
/** 全機を呼び戻す。活動日数ぶんの報奨金と、災害を収拾できたときの特別報奨を返す */
export function recall() {
  const st = rescueState(), n = st.n, days = Math.max(0, G.p.day - st.day), dz = disaster(), pay = n * 260 * Math.min(days, 3);
  let bonus = 0; if (dz && !dz.done && n >= dz.need && days >= 1) { bonus = dz.need * 1400; G.p.flags['dz' + dz.blk] = 1; }
  st.n = 0; st.day = G.p.day; G.rescueLaunch = false; earn(pay + bonus); save();
  return { n, days, pay, bonus, name: bonus ? dz.name : '' };
}
