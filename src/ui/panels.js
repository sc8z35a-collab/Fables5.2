// メニュー / 端末 UI (星図・市場・造船所・任務・酒場・カジノ ほか)
import { G, el, fmtCr, fmtDist, clamp } from '../core/util.js';
import { BODIES, STATIONS, ENEMIES, SHIPS, COMMODITIES, UPGRADES, BASES, station, body } from '../world/defs.js';
import { QUALITY, RES, DIST } from '../gfx/renderer.js';
import { stats, save, wipe, newGame, load, price, cargoUsed, addCargo, takeCargo, earn, commodity, missionBoard, accept, event, remaining } from '../game/state.js';

const SFX = (n) => G.audio?.sfx(n);
export class UI {
  constructor(app) { this.app = app; this.cur = null; }
  get isOpen() { return !!this.cur; }
  close() { if (!this.cur) return; const c = this.cur; this.cur = null; c.wrap.remove(); c.onClose?.(); }
  /** build(body, api) で中身を作る。api.refresh() で再描画 */
  open(title, sub, build, o = {}) {
    this.close();
    const wrap = el('div', 'panel-wrap', '', this.app), p = el('div', 'panel' + (o.small ? ' small' : ''), '', wrap), ph = el('div', 'ph', '', p);
    el('h2', '', `${title}<small>${sub || ''}</small>`, ph); const cr = el('div', 'cr', '', ph);
    if (!o.noClose) { const x = el('button', 'px', '×', ph); x.onclick = () => { SFX('ui'); this.close(); }; }
    const tabsEl = o.tabs ? el('div', 'tabs', '', p) : null, bodyEl = el('div', 'pb', '', p);
    const api = { wrap, body: bodyEl, tab: 0, onClose: o.onClose, refresh: () => { cr.textContent = G.p ? fmtCr(G.p.credits) : ''; const y = bodyEl.scrollTop; bodyEl.innerHTML = ''; (o.tabs ? o.tabs[api.tab].build : build)(bodyEl, api); bodyEl.scrollTop = y; } };
    if (o.tabs) o.tabs.forEach((t, i) => { const b = el('button', 'tab' + (i ? '' : ' on'), t.name, tabsEl); b.onclick = () => { SFX('ui'); api.tab = i; [...tabsEl.children].forEach((c, k) => c.classList.toggle('on', k === i)); bodyEl.scrollTop = 0; api.refresh(); }; });
    this.cur = api; api.refresh();
    return api;
  }
  row(parent, title, sub, right, btns = []) {
    const r = el('div', 'row', '', parent); el('div', 'g', `${title}${sub ? `<small>${sub}</small>` : ''}`, r);
    if (right != null) el('div', 'n', right, r);
    for (const b of btns) { const e = el('button', 'bt ' + (b.cls || '') + (b.off ? ' off' : ''), b.label, r); e.onclick = () => { b.fn(); }; }
    return r;
  }
  note(parent, html) { return el('p', 'note', html, parent); }

  // ───────────────────────── タイトル ─────────────────────────
  title() {
    const t = el('div', 'title', '', this.app), saved = load(); let ship = saved?.ship || 'hayate';
    el('div', 'logo', '<h1>STARFABLE</h1><p>星海の果て</p>', t);
    const sel = el('div', 'shipsel', '', t);
    const pickShip = (id) => { ship = id; [...sel.children].forEach((c) => c.classList.toggle('on', c.dataset.id === id)); G.p.ship = id; G.space.setShip(id); };
    for (const s of Object.values(SHIPS)) { const b = el('button', s.id === ship ? 'on' : '', `<b>${s.name} <span style="opacity:.6">${s.kanji}</span></b>${s.cls}`, sel); b.dataset.id = s.id; b.onclick = () => { G.audio?.unlock(); SFX('ui'); pickShip(s.id); }; }
    const menu = el('div', 'menu', '', t);
    const go = (fresh) => {
      G.audio?.unlock(); SFX('nav'); G.fullscreen();
      if (fresh) { const q = G.p.quality; wipe(); G.p = newGame(ship); G.p.quality = q; } else { G.p = saved; G.p.ship = ship; }
      t.classList.add('fadeout'); setTimeout(() => t.remove(), 900);
      G.start(fresh);
    };
    if (saved) { const c = el('button', 'cb', 'つづきから', menu); c.onclick = () => go(false); }
    const n = el('button', 'cb ' + (saved ? 'alt' : ''), 'はじめから', menu); n.onclick = () => go(true);
    const s = el('button', 'cb alt', '画質：' + QUALITY[G.gfx.qName].label, menu);
    s.onclick = () => { const k = Object.keys(QUALITY), nx = k[(k.indexOf(G.gfx.qName) + 1) % k.length]; G.setQuality(nx); s.textContent = '画質：' + QUALITY[nx].label; SFX('ui'); };
    const rs = el('button', 'cb alt', '解像度：' + RES[G.gfx.res], menu);
    rs.onclick = () => { const k = [540, 720, 1080, 0], nx = k[(k.indexOf(G.gfx.res) + 1) % k.length]; G.setRes(nx); rs.textContent = '解像度：' + RES[nx]; SFX('ui'); };
    el('div', 'hint', '機体を選んで出撃。5 つの宇宙ステーション、着陸できる 5 つの星、乗り込める敵艦 20 隻が待っている。<br>スマホは横向き全画面推奨（ホーム画面に追加すると完全な全画面で遊べます）', t);
  }

  // ───────────────────────── ポーズ / 設定 ─────────────────────────
  pause() {
    if (!G.p || G.titleOn) return;
    this.open('メニュー', 'PAUSE', (b, api) => {
      this.row(b, '解像度', `現在：${RES[G.gfx.res]}（固定。重いときは下げ、きれいにしたいときは上げてください。ディテールは変わりません）`, null, Object.keys(RES).map((k) => ({ label: RES[k], cls: +k === G.gfx.res ? 'gold' : '', fn: () => { G.setRes(+k); api.refresh(); } })).sort((a, b2) => (a.label === '最大') - (b2.label === '最大')));
      this.row(b, '描画距離', `現在：${DIST[G.distName][0]}（遠くの建物や木々を描く範囲）`, null, Object.keys(DIST).map((k) => ({ label: DIST[k][0], cls: k === G.distName ? 'gold' : '', fn: () => { G.setDist(k); api.refresh(); } })));
      this.row(b, '画質', `現在：${QUALITY[G.gfx.qName].label}（影・反射・アンチエイリアスの品質。星空・惑星の解像度は再起動後に反映）`, null, Object.keys(QUALITY).map((k) => ({ label: QUALITY[k].label, cls: k === G.gfx.qName ? 'gold' : '', fn: () => { G.setQuality(k); api.refresh(); } })));
      this.row(b, '操縦の上下', G.p.invertY ? 'フライトスティック式（上で機首下げ）' : '標準（上で機首上げ）', null, [{ label: '切り替え', fn: () => { G.p.invertY = !G.p.invertY; save(); api.refresh(); } }]);
      this.row(b, 'サウンド', G.p.sound ? 'ON' : 'OFF', null, [{ label: '切り替え', fn: () => { G.p.sound = !G.p.sound; G.audio?.setOn(G.p.sound); save(); api.refresh(); } }]);
      this.row(b, '全画面表示', '横向き全画面に切り替えます', null, [{ label: '全画面', fn: () => G.fullscreen(true) }]);
      this.row(b, '機体と積荷', `${SHIPS[G.p.ship].name}／積荷 ${cargoUsed()}/${stats().cargo}`, null, [{ label: '確認', fn: () => this.status() }]);
      this.row(b, '遊び方', '操作方法と目的', null, [{ label: '見る', fn: () => this.help() }]);
      this.row(b, 'セーブデータ', 'ドッキング・着陸時に自動保存されます', null, [{ label: '今すぐ保存', fn: () => { save(); G.hud.msg('保存しました', 'good'); this.close(); } }, { label: '最初から', cls: 'red', fn: () => { wipe(); location.reload(); } }]);
    }, { small: true });
  }
  help() {
    this.open('遊び方', 'HOW TO PLAY', (b) => {
      this.note(b, '<b>目的</b>：星系を荒らす <em>ヴォイド艦隊 20 隻</em> を撃沈または拿捕し、5 つのステーションと 5 つの星を巡って交易・任務・探索を楽しもう。');
      this.note(b, '<b>操縦</b>：左スティックで旋回、右端のスライダーで推力。<em>発射</em>・<em>ミサイル</em>（要ロック）・<em>ブースト</em>。⟲⟳ でロール。<br><b>超巡航</b>：惑星間の高速移動。<b>星図</b>で目的地を選び <em>自動航行</em> を押すと、到着まで自動で飛ぶ。');
      this.note(b, '<b>ドッキング</b>：ステーションに 3.5km まで近づき <em>ドッキング要請</em>。自動誘導で接続後、ステーション内を歩いて各施設を利用できる。<br><b>着陸</b>：惑星へ降下すると大気圏に突入。地表では <em>▲▼</em> で昇降し、<em>着陸</em> ボタンで接地。降りて歩ける。');
      this.note(b, '<b>敵艦への乗り込み</b>：船体を削ると <em>航行不能</em> になる。<em>接舷する</em> → <em>敵艦に突入</em> で艦内へ。警備ドローンを倒し、艦橋の制御コアを掌握すれば拿捕成功。');
      this.note(b, '<b>PC</b>：WASD/矢印=旋回、R/C=推力、Space=発射、F=ミサイル、Shift=ブースト、T=照準、J=超巡航、G=自動航行、V=視点、歩行時は E=調べる・クリックで視点。');
    }, { small: true });
  }
  status() {
    const st = stats(), s = SHIPS[G.p.ship];
    this.open(`${s.name} ${s.kanji}`, s.cls, (b) => {
      this.note(b, `船体 <b>${Math.round(st.hull)}</b>　シールド <b>${Math.round(st.shield)}</b>　最高速 <b>${Math.round(st.maxSpeed)} m/s</b>　主砲 <b>${st.dmg.toFixed(1)}×${st.guns}</b>　ミサイル <b>${st.missiles}</b>　積載 <b>${cargoUsed()}/${st.cargo}</b>`);
      el('h3', '', '積荷', b); const ks = Object.keys(G.p.cargo);
      if (!ks.length) this.note(b, '積荷はありません。'); for (const k of ks) this.row(b, commodity(k).name, '', '×' + G.p.cargo[k]);
      el('h3', '', '受注中の任務', b); if (!G.p.missions.length) this.note(b, '受注中の任務はありません。各ステーションの任務端末で受注できます。');
      for (const m of G.p.missions) this.row(b, m.title, m.desc, `${m.prog}/${m.need}`);
      el('h3', '', '戦績', b); this.note(b, `撃沈 <b>${G.p.stats.kills}</b>　拿捕 <b>${G.p.stats.captures}</b>　残存敵艦 <b>${remaining()}</b>　総収入 <b>${fmtCr(G.p.stats.earned)}</b>`);
    });
  }

  // ───────────────────────── 星図 ─────────────────────────
  map() {
    if (!G.p || G.titleOn) return; const sp = G.space; let sel = sp.nav ? { type: sp.nav.type, id: sp.nav.id } : null;
    const me = sp.uni(sp.pl.pos), dist = (p) => Math.hypot(p[0] - me.x, p[1] - me.y, p[2] - me.z);
    this.open('星図', 'SOL SYSTEM', (b, api) => {
      b.style.display = 'flex'; b.style.overflow = 'hidden';
      const left = el('div', '', '', b); left.style.cssText = 'flex:1;min-width:0;position:relative';
      const cv = el('canvas', 'mapc', '', left), side = el('div', 'mapside', '', b);
      const items = [...STATIONS.map((s) => ({ type: 'station', id: s.id, name: s.name, sub: `${s.sub}／${body(s.body).name}軌道`, pos: s.pos, col: s.color })),
        ...BODIES.filter((x) => x.type !== 'sun').map((x) => ({ type: 'body', id: x.id, name: x.name, sub: `${x.sub}／着陸地：${BASES[x.id].name}`, pos: x.pos, col: x.color, R: x.R })),
        ...sp.enemies.filter((e) => e.state !== 'gone').map((e) => ({ type: 'enemy', id: e.def.id, name: e.def.name, sub: `敵影${e.state === 'disabled' ? '（航行不能）' : ''}／${body(e.def.body).name}宙域　賞金 ${e.def.bounty.toLocaleString()} Cr`, pos: e.uni.toArray(), col: '#ff5a4a' }))];
      const draw = () => {
        const r = left.getBoundingClientRect(), W = G.portrait ? r.height : r.width, H = G.portrait ? r.width : r.height, s = Math.min(window.devicePixelRatio || 1, 2);
        if (W < 60 || H < 60) return;
        cv.width = W * s; cv.height = H * s; const x = cv.getContext('2d'); x.scale(s, s);
        const cx = W / 2, cy = H / 2, k = (Math.min(W, H) / 2 - 16) / 7.7e7, P = (p) => [cx + p[0] * k, cy + p[2] * k];
        const gr = x.createRadialGradient(cx, cy, 0, cx, cy, 40); gr.addColorStop(0, '#fff6d0'); gr.addColorStop(0.3, '#ffb040'); gr.addColorStop(1, 'rgba(255,120,0,0)'); x.fillStyle = gr; x.fillRect(cx - 40, cy - 40, 80, 80);
        x.textAlign = 'center'; x.font = `${G.H * 0.022}px sans-serif`;
        for (const bd of BODIES) { if (bd.type === 'sun') continue; const rr = Math.hypot(bd.pos[0], bd.pos[2]) * k, [px, py] = P(bd.pos);
          x.strokeStyle = 'rgba(111,232,255,.22)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.stroke();
          x.fillStyle = bd.color; x.shadowColor = bd.color; x.shadowBlur = 12; x.beginPath(); x.arc(px, py, 4 + Math.log10(bd.R / 1e4) * 4, 0, 7); x.fill(); x.shadowBlur = 0;
          if (bd.ring) { x.strokeStyle = '#e8c890'; x.beginPath(); x.ellipse(px, py, 16, 5, -0.3, 0, 7); x.stroke(); }
          x.fillStyle = '#dff6ff'; x.fillText(bd.name, px, py - 16);
          const n = sp.enemies.filter((e) => e.def.body === bd.id && e.state !== 'gone').length; if (n) { x.fillStyle = '#ff5a4a'; x.fillText(`敵 ${n}`, px, py + 26); } }
        for (const st of STATIONS) { const [px, py] = P(st.pos); x.strokeStyle = st.color; x.lineWidth = 1.5; x.strokeRect(px + 9, py - 3, 6, 6); }
        if (sel) { const it = items.find((i) => i.type === sel.type && i.id === sel.id); if (it) { const [px, py] = P(it.pos); x.strokeStyle = '#ffd27a'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, 20, 0, 7); x.stroke(); const [mx, my] = P([me.x, 0, me.z]); x.setLineDash([5, 5]); x.beginPath(); x.moveTo(mx, my); x.lineTo(px, py); x.stroke(); x.setLineDash([]); } }
        const [mx, my] = P([me.x, 0, me.z]); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(mx, my - 8); x.lineTo(mx + 6, my + 6); x.lineTo(mx - 6, my + 6); x.fill(); x.fillText('現在地', mx, my + 22);
      };
      const list = () => {
        side.innerHTML = '';
        for (const [label, type] of [['ステーション', 'station'], ['惑星（着陸可能）', 'body'], ['敵影', 'enemy']]) {
          el('div', 'note', `<b>${label}</b>`, side);
          for (const it of items.filter((i) => i.type === type).sort((a, b2) => dist(a.pos) - dist(b2.pos))) {
            const on = sel && sel.type === it.type && sel.id === it.id, r = el('div', 'row', `<div class="g" style="color:${on ? '#ffd27a' : it.col}">${it.name}<small>${it.sub}<br>距離 ${fmtDist(Math.max(0, dist(it.pos) - (it.R || 0)))}</small></div>`, side);
            if (on) { const bt = el('button', 'bt gold', '航路設定', r); bt.onclick = () => { sp.setNav(it.type, it.id); G.tip = ''; this.close(); if (G.modeName === 'space' && !sp.pl.docked) G.hud.msg('「自動航行」を押すと目的地まで自動で飛行します。', 'good'); }; }
            r.onclick = (e) => { if (e.target.tagName === 'BUTTON') return; SFX('ui'); sel = { type: it.type, id: it.id }; list(); draw(); };
          }
        }
      };
      list(); requestAnimationFrame(draw);
    });
  }

  // ───────────────────────── 市場 ─────────────────────────
  market(sid, title = '交易市場') {
    const st = station(sid) || { name: BASES[sid]?.name || sid };
    this.open(title, st.name, (b, api) => {
      const cap = stats().cargo; this.note(b, `積載 <b>${cargoUsed()} / ${cap}</b>　価格は拠点ごとに異なる。<em>安く買って高く売る</em>のが交易の基本。`);
      for (const c of COMMODITIES) {
        const pr = price(sid, c.id); if (pr == null) continue; const have = G.p.cargo[c.id] || 0, ratio = pr / c.base;
        this.row(b, c.name, `所持 ×${have}　<span class="${ratio < 0.92 ? 'up' : ratio > 1.08 ? 'dn' : ''}">${ratio < 0.92 ? '安値 ▼' : ratio > 1.08 ? '高値 ▲' : '相場並み'}</span>`, fmtCr(pr), [
          { label: '買う', off: G.p.credits < pr || cargoUsed() >= cap, fn: () => { if (addCargo(c.id, 1)) { G.p.credits -= pr; SFX('buy'); } api.refresh(); } },
          { label: '売る', cls: 'gold', off: !have, fn: () => { if (takeCargo(c.id, 1)) { earn(Math.round(pr * 0.96)); SFX('buy'); } api.refresh(); } },
          { label: '全売', cls: 'gold', off: !have, fn: () => { const n = takeCargo(c.id, 999); earn(Math.round(pr * 0.96) * n); SFX('reward'); api.refresh(); } }]);
      }
    });
  }

  // ───────────────────────── 造船所 / 格納庫 ─────────────────────────
  shipyard(sid, disc = 1) {
    const st = station(sid);
    const swap = (id) => { G.p.ship = id; G.space.setShip(id); G.space.refit(); G.mode.refreshShip?.(); save(); SFX('reward'); G.hud.msg(`${SHIPS[id].name} に乗り換えた`, 'good'); };
    this.open(disc < 1 ? '造船廠ドック' : '格納庫サービス', st?.name || '', null, { tabs: [
      { name: '艦船', build: (b, api) => {
        this.note(b, '3 隻すべてがあなたの所有機。いつでも無料で回送・乗り換えができる。');
        const g = el('div', 'grid', '', b);
        for (const s of Object.values(SHIPS)) {
          const e = stats(s.id), cur = G.p.ship === s.id, c = el('div', 'card' + (cur ? ' sel' : ''), `<h3>${s.name}<small>${s.kanji}／${s.cls}</small></h3><p>${s.desc}</p>`, g);
          for (const [n, v] of [['速度', e.maxSpeed / 520], ['旋回', s.turn / 2.2], ['装甲', e.hull / 400], ['シールド', e.shield / 380], ['火力', e.dmg * s.guns * s.rof / 500], ['積載', e.cargo / 90]]) el('div', 'stat', `<span>${n}</span><i><b style="width:${clamp(v, 0.05, 1) * 100}%"></b></i>`, c);
          const bt = el('button', 'bt ' + (cur ? 'off' : 'gold'), cur ? '搭乗中' : '乗り換える', c); bt.style.marginTop = '1em'; bt.onclick = () => { swap(s.id); api.refresh(); };
        }
      } },
      { name: '改修', build: (b, api) => {
        const u = G.p.ships[G.p.ship].up; this.note(b, `対象：<b>${SHIPS[G.p.ship].name}</b>${disc < 1 ? '　<em>造船廠割引 −25%</em>' : ''}`);
        for (const up of UPGRADES) { const lv = u[up.id], cost = Math.round(up.base * Math.pow(1.7, lv) * disc);
          this.row(b, `${up.name}　Lv.${lv}${lv >= 5 ? ' MAX' : ''}`, up.desc, lv >= 5 ? '—' : fmtCr(cost), [{ label: '改修', off: lv >= 5 || G.p.credits < cost, fn: () => { G.p.credits -= cost; u[up.id]++; G.space.refit(); save(); SFX('reward'); api.refresh(); } }]); }
      } },
      { name: '整備', build: (b, api) => {
        const sh = G.p.ships[G.p.ship], full = stats(), cost = Math.round((1 - sh.hull) * full.hull * 6 * disc), pl = G.space.pl, mis = (full.missiles - pl.missiles) * 60;
        this.row(b, '船体修理', `船体 ${Math.round(sh.hull * 100)}%`, cost ? fmtCr(cost) : '損傷なし', [{ label: '修理する', off: !cost || G.p.credits < cost, fn: () => { G.p.credits -= cost; sh.hull = 1; G.space.rebuildShip(); G.space.refit(); G.mode.refreshShip?.(); save(); SFX('buy'); G.hud.msg('船体を完全に修復した。凹みも傷も元通りだ。', 'good'); api.refresh(); } }]);
        this.row(b, 'ミサイル補給', `残弾 ${pl.missiles}/${full.missiles}`, mis ? fmtCr(mis) : '満載', [{ label: '補給する', off: !mis || G.p.credits < mis, fn: () => { G.p.credits -= mis; pl.missiles = full.missiles; SFX('buy'); api.refresh(); } }]);
      } }] });
  }

  // ───────────────────────── 任務 ─────────────────────────
  missions(sid) {
    this.open('任務端末', station(sid)?.name, (b, api) => {
      el('h3', '', '募集中', b); const L = missionBoard(sid);
      if (!L.length) this.note(b, '現在募集中の任務はありません。別の拠点を訪ねるか、時間を置いてください。');
      for (const m of L) this.row(b, m.title, m.desc, fmtCr(m.reward), [{ label: '受注', off: G.p.missions.length >= 4, fn: () => { if (accept(m)) { SFX('nav'); G.hud.msg(`任務受注：${m.title}`, 'good'); } else { SFX('deny'); G.hud.msg('貨物室に空きがありません', 'warn'); } api.refresh(); } }]);
      el('h3', '', `受注中 (${G.p.missions.length}/4)`, b);
      for (const m of G.p.missions) this.row(b, m.title, m.desc, `${m.prog}/${m.need}`, [{ label: '破棄', cls: 'red', fn: () => { if (m.type === 'deliver') takeCargo(m.cargo, m.qty); G.p.missions.splice(G.p.missions.indexOf(m), 1); api.refresh(); } }]);
    });
  }
  /** 賞金首リスト (バスティオン司令部) */
  bounty() {
    this.open('戦術司令部', 'ヴォイド艦隊 追跡リスト', (b) => {
      this.note(b, `残存 <b>${remaining()} / 20</b> 隻。行を選ぶと航路を設定できる。全艦を無力化すれば星系は解放される。`);
      for (const e of ENEMIES) { const d = G.p.done[e.id];
        this.row(b, `<span class="${d ? 'dim' : ''}">${e.name}</span>`, `${body(e.body).name}宙域／脅威度 ${'★'.repeat(e.tier)}`, d ? (d === 'captured' ? '<span class="up">拿捕済</span>' : '<span class="dim">撃沈済</span>') : fmtCr(e.bounty), d ? [] : [{ label: '航路設定', fn: () => { G.space.setNav('enemy', e.id); this.close(); } }]); }
    });
  }

  // ───────────────────────── 会話・酒場・カジノ ─────────────────────────
  talk(name, text, opts = []) {
    this.open(name, '', (b) => { this.note(b, text); const r = el('div', 'row', '<div class="g"></div>', b); for (const o of opts) { const e = el('button', 'bt ' + (o.cls || ''), o.label, r); e.onclick = () => { SFX('ui'); if (o.keep) o.fn(); else { this.close(); o.fn?.(); } }; } if (!opts.length) { const e = el('button', 'bt', '閉じる', r); e.onclick = () => this.close(); } }, { small: true });
  }
  bar(sid) {
    const rumors = ['「グラキエスの氷晶は、ヘイヴンに持っていけば倍近い値がつくぜ」', '「造船廠で船を改修するなら、ヴァルカンが一番安い。割引が効くからな」', '「敵艦は沈めるより、動けなくして乗り込む方が儲かる。度胸があればの話だがな」',
      '「ゼファーの雲海に浮かぶクラウドデッキを見たか？ あの夕焼けは一生モノだ」', '「イグニスのマグマ晶は危険だが高く売れる。耐熱装備を忘れるな」', '「バスティオンの司令部には賞金首の位置が全部載ってる」', '「オーロラ天文台は探査データを高値で買ってくれるそうだ」', '「アマツの庭園で採れた野菜は、サハルのコロニーで飛ぶように売れる」'];
    this.talk('バーテンダー', '「いらっしゃい。何にする？ ……それとも、噂話が聞きたいのかい」', [
      { label: '一杯やる (30 Cr)', keep: true, fn: () => { if (G.p.credits < 30) return SFX('deny'); G.p.credits -= 30; G.p.hp = 100; SFX('buy'); this.talk('バーテンダー', '「はいよ、特製ネビュラ・サワーだ」<br>体力が全快した。' + rumors[Math.floor(Math.random() * rumors.length)]); } },
      { label: '噂を聞く', keep: true, fn: () => this.talk('バーテンダー', rumors[Math.floor(Math.random() * rumors.length)]) }, { label: 'やめておく' }]);
  }
  casino() {
    const sym = ['🍒', '⭐', '💎', '🚀', '7️⃣'], pay = [3, 5, 12, 25, 60]; let bet = 100, spin = false;
    this.open('スロット', "ROGUE'S FORTUNE", (b, api) => {
      this.note(b, '絵柄が 3 つ揃えば大当たり、2 つでも小当たり。賭け金を選んで回そう。');
      const reels = el('div', 'slots', '', b), R = [0, 1, 2].map(() => el('div', 'reel', sym[Math.floor(Math.random() * 5)], reels)), res = el('p', 'note', '&nbsp;', b); res.style.textAlign = 'center';
      const r = el('div', 'row', '<div class="g"></div>', b);
      for (const v of [100, 500, 2000]) { const e = el('button', 'bt' + (v === bet ? ' gold' : ''), `賭け ${v}`, r); e.onclick = () => { bet = v; api.refresh(); }; }
      const go = el('button', 'bt red', '回す！', r);
      go.onclick = () => {
        if (spin || G.p.credits < bet) return SFX('deny'); spin = true; G.p.credits -= bet; const out = [0, 1, 2].map(() => { const x = Math.random(); return x < 0.34 ? 0 : x < 0.6 ? 1 : x < 0.8 ? 2 : x < 0.93 ? 3 : 4; }); let n = 0;
        const iv = setInterval(() => { n++; R.forEach((e, i) => { if (n < 10 + i * 6) { e.textContent = sym[Math.floor(Math.random() * 5)]; SFX('slot'); } else e.textContent = sym[out[i]]; });
          if (n > 24) { clearInterval(iv); spin = false; let win = 0; if (out[0] === out[1] && out[1] === out[2]) win = bet * pay[out[0]]; else if (out[0] === out[1] || out[1] === out[2] || out[0] === out[2]) win = Math.round(bet * 1.5);
            if (win) { earn(win); SFX('reward'); res.innerHTML = `<b class="up">当たり！ +${win.toLocaleString()} Cr</b>`; } else { SFX('deny'); res.innerHTML = 'はずれ…'; } this.cur && (this.cur.wrap.querySelector('.cr').textContent = fmtCr(G.p.credits)); } }, 70);
      };
    }, { small: true });
  }
  broker() {
    this.talk('情報屋', '「500 クレジットで、いちばん手負いの敵艦の居場所を教えてやる。どうだ？」', [{ label: '買う (500 Cr)', fn: () => {
      if (G.p.credits < 500) return SFX('deny'); const e = G.space.enemies.filter((x) => x.state !== 'gone').sort((a, b) => a.hull / a.maxHull - b.hull / b.maxHull || a.def.tier - b.def.tier)[0];
      if (!e) return G.hud.msg('「もう獲物は残っちゃいねえよ」', 'comm'); G.p.credits -= 500; G.space.setNav('enemy', e.def.id); G.hud.msg(`情報屋：「${e.def.name} だ。${body(e.def.body).name}の近くにいる」`, 'comm'); } }, { label: '断る' }]);
  }
  lab(sid) {
    this.open('研究ラボ', station(sid)?.name || '', (b, api) => {
      this.note(b, '惑星で採取したサンプルを解析し、<em>探査データ</em>に変換します。探査データはここで最も高く売れます。');
      for (const id of ['magma', 'ice', 'spice', 'gas']) { const have = G.p.cargo[id] || 0; this.row(b, `${commodity(id).name} の解析`, `所持 ×${have}　→ 探査データ ×1 ＋ 研究協力金 400 Cr`, '', [{ label: '解析する', off: !have, fn: () => { takeCargo(id, 1); addCargo('data', 1); earn(400); SFX('reward'); api.refresh(); } }]); }
      const d = G.p.cargo.data || 0, pr = price(sid, 'data') || 900; this.row(b, '探査データの売却', `所持 ×${d}`, fmtCr(pr), [{ label: 'すべて売る', cls: 'gold', off: !d, fn: () => { earn(pr * takeCargo('data', 999)); SFX('reward'); api.refresh(); } }]);
      el('h3', '', '探査記録', b); for (const x of BODIES.filter((q) => q.type !== 'sun')) this.row(b, x.name, x.desc, G.p.stats.lands[x.id] ? `<span class="up">着陸 ${G.p.stats.lands[x.id]} 回</span>` : '<span class="dim">未踏</span>');
    });
  }
  rest(where = '') {
    this.talk('休憩', `${where}ひと休みして体力を回復し、航海日誌を記録しますか？`, [{ label: '休む', fn: () => { G.p.hp = 100; G.p.day++; save(); G.fade(0, 0.5).then(() => G.fade(1, 0.8)); G.hud.msg(`よく休んだ。体力全快・記録完了（${G.p.day} 日目）`, 'good'); SFX('reward'); } }, { label: 'やめる' }]);
  }
  /** 敵艦の制御コア掌握 */
  hack(e, done) {
    const loot = 3000 + e.def.tier * 2500;
    this.talk('制御コア', `<b>${e.def.name}</b> の制御コアに接続した。艦の処遇を選択してください。`, [
      { label: `拿捕して引き渡す (+${(e.def.bounty * 2).toLocaleString()} Cr)`, cls: 'gold', fn: () => done('capture', e.def.bounty * 2) },
      { label: `積荷を奪って自沈 (+${loot.toLocaleString()} Cr 相当)`, cls: 'red', fn: () => done('loot', loot) }]);
  }
  victory() {
    this.open('星系解放', 'MISSION COMPLETE', (b) => {
      this.note(b, `ヴォイド艦隊 20 隻すべてを無力化した。星系に平和が戻った。<br>撃沈 <b>${G.p.stats.kills}</b>　拿捕 <b>${G.p.stats.captures}</b>　総収入 <b>${fmtCr(G.p.stats.earned)}</b>`);
      this.note(b, '星海はまだ広い。交易も探索も、気の済むまで続けられる。防衛軍から特別報奨金 <em>50,000 Cr</em> が贈られた。');
      this.row(b, '敵艦隊を再出現させて戦い続ける', '増援として 20 隻が再配置されます', null, [{ label: '再配置', cls: 'red', fn: () => { G.p.done = {}; save(); location.reload(); } }]);
    }, { small: true });
  }
}
