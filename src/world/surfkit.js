// 地表シーンの共通部品: 空・地形グリッド・地形シェーダ・散布・着陸パッド・資源結晶・森林タイル・海
import * as THREE from 'three';
import { Builder, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow, texSet, signMesh, screenMat, cv, ctex } from '../gfx/textures.js';
import { rng, rr, fbm, ridge, smooth, clamp, pick } from '../core/util.js';
import { fxTime, makeGlowSprite } from '../gfx/fx.js';

const HP = Math.PI / 2, V3 = (x, y, z) => new THREE.Vector3(x, y, z), COL = (c) => new THREE.Color(c);
const N2 = /* glsl */`
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}
float fbm2(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn2(p);p=p*2.03+vec2(3.1,1.7);a*=.5;}return s;}`;

// ───────────────────────── 空 ─────────────────────────
const SKY_FS = /* glsl */`
precision highp float;
uniform vec3 uSun,uZen,uHor,uGround,uSunCol,uCloudCol,uRingN;uniform float uTime,uCloud,uStars,uAurora,uRing,uHaze,uSunSize;
varying vec3 vDir;
${N2}
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
void main(){
  vec3 d=normalize(vDir);float y=d.y,t=pow(1.-max(y,0.),3.2);
  vec3 col=mix(uZen,uHor,t);
  float sd=max(dot(d,uSun),0.);
  col+=uSunCol*pow(sd,3.)*t*uHaze;
  if(uStars>0.){vec3 p=d*420.,id=floor(p);float hh=h31(id);float s=step(.988,hh)*smoothstep(.3,0.,length(fract(p)-.5))*(.4+2.4*fract(hh*71.3));col+=mix(vec3(.75,.85,1.),vec3(1.,.9,.75),fract(hh*13.7))*s*uStars*(1.-t)*2.;}
  if(uRing>0.){float a=dot(d,uRingN),r=abs(a);float band=smoothstep(.2,.03,r)*smoothstep(.0,.012,r);float fine=.55+.45*sin(r*260.)*sin(r*71.+1.);
    col+=vec3(1.,.86,.6)*band*fine*uRing*smoothstep(-.05,.15,y)*(.35+.65*smoothstep(-.2,.5,dot(d,uSun)+.4));}
  if(uAurora>0.&&y>0.){vec2 p=d.xz/(y+.3);float w=fbm2(p*1.3+uTime*.02);float cur=smoothstep(.55,1.,sin(p.x*2.2+w*7.+uTime*.05)*.5+.5)*smoothstep(.04,.3,y)*smoothstep(1.,.45,y);
    float rays=.4+.6*fbm2(vec2(p.x*18.+w*4.,uTime*.25));col+=mix(vec3(.08,1.,.5),vec3(.55,.2,1.),clamp(y*1.5,0.,1.))*cur*rays*uAurora;
    float cur2=smoothstep(.6,1.,sin(p.y*1.7-w*5.+1.+uTime*.03)*.5+.5)*smoothstep(.1,.4,y)*smoothstep(.9,.5,y);col+=vec3(.1,.7,1.)*cur2*rays*uAurora*.5;}
  if(uCloud>0.&&y>-.02){vec2 uv=d.xz/(max(y,0.)+.14)*1.3+uTime*.003;float c=fbm2(uv*1.4);c=smoothstep(1.-uCloud,1.-uCloud+.4,c)*smoothstep(-.02,.2,y);
    float lit=fbm2(uv*3.1+5.);vec3 cc=mix(uCloudCol*.35,uCloudCol*1.15+uSunCol*.5*pow(sd,4.),lit);col=mix(col,cc,c*.92);}
  col+=uSunCol*(pow(sd,48.)*.5+pow(sd,600.)*2.+smoothstep(uSunSize,uSunSize+.00012,sd)*30.);
  col=mix(col,uGround,smoothstep(0.,-.12,y));
  gl_FragColor=vec4(col,1.);
}`;
function makeSky(c) {
  const u = { uSun: { value: c.sun.clone().normalize() }, uZen: { value: COL(c.zen) }, uHor: { value: COL(c.hor) }, uGround: { value: COL(c.ground) }, uSunCol: { value: COL(c.sunCol) }, uCloudCol: { value: COL(c.cloudCol || '#fff') },
    uRingN: { value: (c.ringN || V3(0, 1, 0)).clone().normalize() }, uTime: fxTime, uCloud: { value: c.cloud ?? 0 }, uStars: { value: c.stars ?? 0 }, uAurora: { value: c.aurora ?? 0 }, uRing: { value: c.ring ?? 0 }, uHaze: { value: c.haze ?? 0.6 }, uSunSize: { value: c.sunSize ?? 0.9996 } };
  const m = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: SKY_FS }));
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

// ───────────────────────── 地形 ─────────────────────────
/** 中心ほど細かい非一様グリッド (軸ごとに分離可能なので高さの逆引きが正確にできる) */
const warp1 = (g, half) => g * (0.3 + 0.7 * Math.pow(Math.min(1, Math.abs(g) / half), 1.3));
/**
 * 地形メッシュ。mesh.heightAt(x,z) は描画されている三角形と完全に一致する高さを返す
 * (歩行・着陸の接地がメッシュからずれない)
 */
function gridTerrain(H, colorFn, o = {}) {
  const size = o.size || 11000, seg = o.seg || 200, half = size / 2, n = seg + 1, xs = new Float32Array(n), hs = new Float32Array(n * n), pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), idx = new Uint32Array(seg * seg * 6), c = [0, 0, 0], us = o.uv || 0.045;
  for (let i = 0; i < n; i++) xs[i] = warp1(-half + i * size / seg, half);
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) hs[iz * n + ix] = H(xs[ix], xs[iz]);
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) { // 傾斜は格子の隣接点から求める (高さ関数の呼び出しを 1 頂点 1 回に抑える)
    const k = iz * n + ix, x = xs[ix], z = xs[iz], h = hs[k], a0 = Math.max(ix - 1, 0), a1 = Math.min(ix + 1, seg), b0 = Math.max(iz - 1, 0), b1 = Math.min(iz + 1, seg), sl = Math.hypot((hs[iz * n + a1] - hs[iz * n + a0]) / (xs[a1] - xs[a0]), (hs[b1 * n + ix] - hs[b0 * n + ix]) / (xs[b1] - xs[b0]));
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; colorFn(x, z, h, sl, c); col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2]; uv[k * 2] = x * us; uv[k * 2 + 1] = z * us;
  }
  let q = 0; for (let iz = 0; iz < seg; iz++) for (let ix = 0; ix < seg; ix++) { const a = iz * n + ix, b = a + 1, cc = a + n, d = cc + 1; idx[q++] = a; idx[q++] = cc; idx[q++] = b; idx[q++] = b; idx[q++] = cc; idx[q++] = d; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  const s = texSet(o.tex || 'rock'), m = new THREE.MeshStandardMaterial({ vertexColors: true, map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: o.rough ?? 1, metalness: o.metal ?? 0.05 });
  m.normalScale.setScalar(o.ns ?? 1.2); m.envMapIntensity = o.env ?? 0.5; m.color.setScalar(o.gain ?? 2.3); terrainPatch(m, o.frag || '', o.key || 'std', o.head || '', o.uniforms);
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.frustumCulled = false;
  const find = (v) => { let lo = 0, hi = seg; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= v) lo = mid; else hi = mid; } return lo; };
  mesh.heightAt = (x, z) => {
    if (x <= xs[0] || x >= xs[seg] || z <= xs[0] || z >= xs[seg]) return H(x, z);
    const ix = find(x), iz = find(z), fx = (x - xs[ix]) / (xs[ix + 1] - xs[ix]), fz = (z - xs[iz]) / (xs[iz + 1] - xs[iz]), a = hs[iz * n + ix], b = hs[iz * n + ix + 1], cc = hs[(iz + 1) * n + ix], d = hs[(iz + 1) * n + ix + 1];
    return fx + fz < 1 ? a + (b - a) * fx + (cc - a) * fz : d + (cc - d) * (1 - fx) + (b - d) * (1 - fz);
  };
  return mesh;
}
/** 地形マテリアルの拡張: 多重スケールの色むら・近接ディテール法線・惑星別の追加シェーダ */
function terrainPatch(m, frag, key, head = '', uniforms = null) {
  const nf = THREE.ShaderChunk.normal_fragment_maps.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;', 'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0; { float tdn = length( vViewPosition ); vec3 mN2 = texture2D( normalMap, vNormalMapUv * 7.3 ).xyz * 2.0 - 1.0; vec3 mN3 = texture2D( normalMap, vNormalMapUv * 0.17 ).xyz * 2.0 - 1.0; mapN = normalize( vec3( mapN.xy * smoothstep( 1400.0, 80.0, tdn ) + mN2.xy * smoothstep( 160.0, 8.0, tdn ) * 0.9 + mN3.xy * 0.7, mapN.z ) ); }');
  m.onBeforeCompile = (sh) => {
    if (uniforms) Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTw,vTn;').replace('#include <project_vertex>', '#include <project_vertex>\nvTw=(modelMatrix*vec4(transformed,1.)).xyz;vTn=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTw,vTn;\n' + N2 + head)
      .replace('#include <color_fragment>', '#include <color_fragment>\n{float td=length(vViewPosition);float tn1=fbm2(vTw.xz*.011),tn2=fbm2(vTw.xz*.17+7.);vec3 tfar=texture2D(map,vMapUv*.093).rgb;\ndiffuseColor.rgb*=(.74+.52*tn1)*(.88+.24*tn2)*mix(vec3(1.),tfar*2.3,.4*smoothstep(40.,500.,td));\n' + frag + '}')
      .replace('#include <normal_fragment_maps>', nf);
  };
  m.customProgramCacheKey = () => 'terrain' + key;
}
function scatter(geo, material, n, place, shadow = true) {
  const im = new THREE.InstancedMesh(geo, material, n), o = new THREE.Object3D(); let k = 0;
  for (let i = 0; i < n; i++) { if (place(o, i) === false) continue; o.updateMatrix(); im.setMatrixAt(k++, o.matrix); }
  im.count = k; im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false;
  return im;
}
/** 着陸パッド */
function pad(B, y = 0, r = 34, col = '#fc4') {
  const D = mat('hull', { color: 0x3a3f48, rough: 0.7, metal: 0.6 }), P = mat('plate', { color: 0x8a9099, rough: 0.5, metal: 0.6, uvs: 0.25 });
  B.cyl(D, r + 1.5, r + 3, 1.2, 0, y - 0.6, 0, 'y', 48); B.cyl(P, r, r, 0.12, 0, y + 0.02, 0, 'y', 48);
  B.add(glow(col, 2.4), new THREE.RingGeometry(r - 2.2, r - 1.6, 64).rotateX(-HP), mx(0, y + 0.1, 0), 0); B.add(glow(col, 2.4), new THREE.RingGeometry(r * 0.45, r * 0.45 + 0.5, 48).rotateX(-HP), mx(0, y + 0.1, 0), 0);
  for (const a of [0, HP, Math.PI, -HP]) B.add(glow(col, 2.2), new THREE.PlaneGeometry(0.7, r * 0.42).rotateX(-HP), mx(Math.cos(a) * r * 0.72, y + 0.1, Math.sin(a) * r * 0.72, 0, -a + HP, 0), 0);
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; B.box(D, 0.4, 0.5, 0.4, Math.cos(a) * (r + 0.6), y + 0.25, Math.sin(a) * (r + 0.6)); B.sph(glow(i % 2 ? '#4f8' : '#fff', 5), 0.16, Math.cos(a) * (r + 0.6), y + 0.6, Math.sin(a) * (r + 0.6), 1, 1, 1, 8); }
}
/** 採取できる資源結晶 */
function node(color, s = 1, seed = 1) {
  const g = new THREE.Group(), r = rng(seed), b = new Builder(), m = new THREE.MeshStandardMaterial({ color: COL(color).multiplyScalar(0.5), emissive: COL(color), emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.2 }); m.userData.uvs = 0;
  for (let i = 0; i < 6; i++) { const h = rr(r, 0.8, 2.6) * s, a = r() * 6.28, d = i ? rr(r, 0.3, 0.9) * s : 0; b.add(m, new THREE.CylinderGeometry(0.02, rr(r, 0.18, 0.34) * s, h, 5), mx(Math.cos(a) * d, h * 0.42, Math.sin(a) * d, rr(r, -0.4, 0.4), a, rr(r, -0.4, 0.4)), 0); }
  g.add(b.build({ shadow: false })); const sp = makeGlowSprite(color, 5 * s, 0.9); sp.position.y = 1.2 * s; g.add(sp);
  return g;
}
const beacon = (list, x, y, z, c, s = 6, blink = 0) => list.push({ p: V3(x, y, z), c, s, blink });


// ───────────────────────── 森林 (板ポリゴンの木をタイル単位でインスタンス描画) ─────────────────────────
const TREES = {};
/** 葉のシェーディング: 両面で法線を反転させず (裏面が真っ黒になるのを防ぐ)、根元ほど暗くする */
const leafFrag = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection=1.;vec3 normal=normalize(vNormal);vec3 nonPerturbedNormal=normal;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb*=.6+.6*vMapUv.y;');
  // 樹冠を上から覆う板は、カメラが樹冠より低いときは畳む (林の中から見上げたときに水平の板が見えないように)
  sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed=vec3(position);\n#ifdef USE_INSTANCING\n{vec3 ip=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;if(uv.x>.5&&cameraPosition.y<ip.y+position.y*length(instanceMatrix[1].xyz)+1.5)transformed=vec3(0.);/*veg*/}\n#endif'); };
/** 木のアトラス (1024×512): 左半分=側面, 右半分=真上から見た樹冠。葉むら・枝・羽状の葉を描き込む */
function treeTex(kind) {
  if (TREES[kind]) return TREES[kind];
  const c = cv(1024, 512), x = c.getContext('2d'), r = rng(kind.length * 97 + kind.charCodeAt(0));
  const PAL = { oak: [['#173a1a', '#1f4a20'], ['#2f6b2a', '#3f8a34', '#58a13f'], ['#7ab653', '#96c866']], jungle: [['#0b2812', '#12381a'], ['#1c5a24', '#2a7a2e', '#3c9436'], ['#5cab46', '#7cc25a']], bush: [['#16361a', '#1e4a1e'], ['#2c6428', '#3f8032', '#55983c'], ['#74ae4e', '#8cc060']] }[kind];
  const clump = (px, py, rad, sq = 0.78) => { // 葉むら: 暗い芯 → 中間色の葉 → 上側に光の当たった葉
    x.fillStyle = PAL[0][(r() * 2) | 0]; x.beginPath(); x.ellipse(px, py, rad, rad * sq, 0, 0, 7); x.fill();
    for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * rad * 1.05, sz = rad * (0.1 + r() * 0.13); x.fillStyle = PAL[1][(r() * 3) | 0]; x.beginPath(); x.ellipse(px + Math.cos(a) * d, py + Math.sin(a) * d * sq, sz, sz * 0.62, r() * 3.1, 0, 7); x.fill(); }
    for (let i = 0; i < 22; i++) { const a = -Math.PI * r(), d = Math.sqrt(r()) * rad, sz = rad * (0.07 + r() * 0.09); x.fillStyle = PAL[2][(r() * 2) | 0]; x.beginPath(); x.ellipse(px + Math.cos(a) * d - rad * 0.12, py + Math.sin(a) * d * sq - rad * 0.08, sz, sz * 0.6, r() * 3.1, 0, 7); x.fill(); }
  };
  const limb = (x0, y0, x1, y1, w0, w1, col) => { const n = 14; x.strokeStyle = col; for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; x.lineWidth = w0 + (w1 - w0) * t0; x.beginPath(); x.moveTo(x0 + (x1 - x0) * t0 + Math.sin(t0 * 3) * 4, y0 + (y1 - y0) * t0); x.lineTo(x0 + (x1 - x0) * t1 + Math.sin(t1 * 3) * 4, y0 + (y1 - y0) * t1); x.stroke(); } };
  const frond = (x0, y0, a, len, bend, cols, w = 5, lf = 26) => { // 羽状の葉 (ヤシ・シダ)
    const n = 22; let px = x0, py = y0;
    for (let i = 1; i <= n; i++) { const t = i / n, ang = a + bend * t * t, nx = px + Math.cos(ang) * len / n, ny = py + Math.sin(ang) * len / n, l = lf * Math.sin(Math.min(1, t * 1.25) * Math.PI) + 3;
      x.strokeStyle = cols[i % cols.length]; x.lineWidth = w * (1 - t * 0.6); for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(nx, ny); x.lineTo(nx + Math.cos(ang + sd * 1.15) * l, ny + Math.sin(ang + sd * 1.15) * l); x.stroke(); }
      x.strokeStyle = cols[0]; x.lineWidth = w * 0.8 * (1 - t * 0.7); x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke(); px = nx; py = ny; }
  };
  const half = (k, fn) => { x.save(); x.beginPath(); x.rect(k * 512 + 2, 2, 508, 508); x.clip(); fn(); x.restore(); };
  x.lineCap = 'round';
  if (kind === 'pine') {
    half(0, () => { limb(256, 512, 256, 60, 20, 4, '#3a2a1c');
      for (let i = 0; i < 9; i++) { const y = 46 + i * 46, w = 34 + i * 23; // 段ごとの枝: 針葉の束 + 上面に積もった雪
        for (let k = 0; k < 70; k++) { const u = r() * 2 - 1, bx = 256 + u * w, by = y + Math.abs(u) * 34 + r() * 22 - 4; x.strokeStyle = ['#12301e', '#1a4428', '#225434'][(r() * 3) | 0]; x.lineWidth = 5 + r() * 4; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + u * 12, by + 14 + r() * 12); x.stroke(); }
        for (let k = 0; k < 34; k++) { const u = (r() * 2 - 1) * 0.86, bx = 256 + u * w, by = y + Math.abs(u) * 34 - 6 + r() * 6; x.strokeStyle = r() < 0.3 ? '#c8d6e6' : '#eef3f9'; x.lineWidth = 6 + r() * 5; x.beginPath(); x.moveTo(bx - 7, by); x.lineTo(bx + 7, by + Math.sign(u) * 2); x.stroke(); } } });
    half(1, () => { for (let i = 0; i < 40; i++) { const a = i * 0.157, l = 150 + r() * 90; x.strokeStyle = i % 3 ? '#1a4428' : '#e8f0f8'; x.lineWidth = 16 + r() * 8; x.beginPath(); x.moveTo(768, 256); x.lineTo(768 + Math.cos(a) * l, 256 + Math.sin(a) * l); x.stroke(); } x.fillStyle = '#f2f6fa'; x.beginPath(); x.arc(768, 256, 70, 0, 7); x.fill(); });
  } else if (kind === 'palm') {
    const G3 = ['#2a6a26', '#3c8a30', '#57a23c'], tx = (t) => 236 + Math.sin(t * 1.4) * 30;
    half(0, () => { for (let i = 0; i < 26; i++) { const t0 = i / 26, t1 = (i + 1) / 26; x.strokeStyle = i % 2 ? '#6a5238' : '#7c6244'; x.lineWidth = 20 - t0 * 8; x.beginPath(); x.moveTo(tx(t0), 512 - t0 * 372); x.lineTo(tx(t1), 512 - t1 * 372); x.stroke(); }
      const hx = tx(1), hy = 140; for (let i = 0; i < 11; i++) { const a = -Math.PI / 2 + (i - 5) * 0.52; frond(hx, hy, a, 190 + r() * 34, (i - 5) * 0.16 + (i > 5 ? 0.9 : i < 5 ? -0.9 : 0), G3, 6, 30); }
      for (let i = 0; i < 4; i++) { x.fillStyle = '#4a3a22'; x.beginPath(); x.arc(hx - 12 + i * 8, hy + 12 + (i % 2) * 6, 9, 0, 7); x.fill(); } });
    half(1, () => { for (let i = 0; i < 12; i++) frond(768, 256, i * 0.5236 + r() * 0.1, 232, 0, G3, 7, 34); });
  } else if (kind === 'fern') {
    const G3 = ['#1c5a20', '#2f8a2a', '#4aa838'];
    half(0, () => { for (let i = 0; i < 13; i++) { const a = -Math.PI / 2 + (i - 6) * 0.2 + (r() - 0.5) * 0.08; frond(256, 512, a, 320 + r() * 150, (i - 6) * 0.13, G3, 5, 30); } });
    half(1, () => { for (let i = 0; i < 12; i++) frond(768, 256, i * 0.5236 + r() * 0.15, 232, 0, G3, 6, 34); });
  } else {
    const jungle = kind === 'jungle', bush = kind === 'bush', bark = jungle ? '#3a2c1c' : '#4a3626';
    half(0, () => {
      if (!bush) { limb(256, 512, 256, 250, jungle ? 30 : 36, 16, bark); for (const [bx, by] of [[150, 190], [362, 200], [206, 130], [310, 120], [256, 100]]) limb(256, 300, bx, by, 14, 5, bark);
        if (jungle) { limb(256, 512, 212, 440, 22, 6, bark); limb(256, 512, 300, 436, 22, 6, bark); x.strokeStyle = '#24401c'; x.lineWidth = 3; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(130 + i * 50, 210); x.quadraticCurveTo(140 + i * 46, 330, 132 + i * 48, 380 + r() * 90); x.stroke(); } } }
      const cy = bush ? 340 : jungle ? 168 : 178, rx = bush ? 190 : jungle ? 200 : 186, ry = bush ? 130 : jungle ? 122 : 140, pts = [];
      for (let i = 0; i < (bush ? 16 : 22); i++) { const a = r() * 6.28, d = Math.sqrt(r()); pts.push([256 + Math.cos(a) * d * rx * 0.8, cy + Math.sin(a) * d * ry * 0.8, 48 + r() * 32]); }
      pts.sort((a, b) => b[1] - a[1]); for (const q of pts) clump(q[0], Math.min(q[1], bush ? 462 : 400), q[2]); });
    half(1, () => { for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 170; clump(768 + Math.cos(a) * d, 256 + Math.sin(a) * d, 44 + r() * 34, 1); } });
  }
  const t = ctex(c, true, false), m = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.42, side: THREE.DoubleSide }); m.color.setScalar(1.75); m.onBeforeCompile = leafFrag; m.customProgramCacheKey = () => 'leaf';
  // 3 枚の板を 60° ずつ交差 + 樹冠を上から覆う板。法線は外向き+上向きに傾け、日の当たる側が明るくなるようにする
  const g = new THREE.BufferGeometry(), P = [], U = [], Nn = [], I = [];
  const quad = (pts, u0) => { const b = P.length / 3; pts.forEach(([px, py, pz, u, v]) => { P.push(px, py, pz); U.push(u0 + u * 0.5, v); const l = Math.hypot(px * 1.7, 0.75, pz * 1.7); Nn.push(px * 1.7 / l, 0.75 / l, pz * 1.7 / l); }); I.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + 0.3, cx = Math.cos(a) * 0.5, sz = Math.sin(a) * 0.5; quad([[-cx, 0, -sz, 0, 0], [cx, 0, sz, 1, 0], [cx, 1, sz, 1, 1], [-cx, 1, -sz, 0, 1]], 0); }
  const ty = kind === 'pine' ? 0.42 : kind === 'palm' ? 0.72 : kind === 'fern' ? 0.36 : kind === 'bush' ? 0.42 : 0.68, ts = kind === 'pine' ? 0.42 : 0.5; quad([[-ts, ty, -ts, 0, 0], [ts, ty, -ts, 1, 0], [ts, ty, ts, 1, 1], [-ts, ty, ts, 0, 1]], 0.5);
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setIndex(I);
  return (TREES[kind] = { g, m });
}
/** pts: [[x,y,z,高さ,幅], ...] をタイルごとの InstancedMesh にまとめる。戻り値はカリング用タイル配列 */
function forest(grp, pts, kind, tile = 900, range = 3800) {
  const { g, m } = treeTex(kind), map = new Map(), o = new THREE.Object3D(), tiles = [], c = new THREE.Color();
  for (const p of pts) { const k = Math.floor(p[0] / tile) + ',' + Math.floor(p[2] / tile); let a = map.get(k); if (!a) map.set(k, (a = [])); a.push(p); }
  for (const a of map.values()) {
    const im = new THREE.InstancedMesh(g, m, a.length); let sx = 0, sz = 0, sy = 0;
    a.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, (p[0] * 1.7 + p[2] * 0.9) % 6.28, 0); o.scale.set(p[4], p[3], p[4]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); const v = 0.72 + ((p[0] * 13.7 + p[2] * 7.3) % 1 + 1) % 1 * 0.5; im.setColorAt(i, c.setRGB(v, v * (0.92 + (i % 5) * 0.03), v * 0.9)); sx += p[0]; sz += p[2]; sy += p[1]; });
    im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = false; grp.add(im); tiles.push({ o: im, x: sx / a.length, y: sy / a.length, z: sz / a.length, r: range });
  }
  return tiles;
}
// ───────────────────────── 植生フィールド (カメラの周囲だけ生成し、遠方・視界外は描画しない) ─────────────────────────
const VEG_KINDS = ['pine', 'palm', 'jungle', 'oak', 'fern', 'bush'];
const hs2 = (a, b, s) => { const n = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const _vo = new THREE.Object3D(), _vc = new THREE.Color(), _vh = [0, 0, 0, 0];
/**
 * at(x, z, u, v, out) → 生える場所なら out=[種類番号, 高さ, 幅, 根元の高さ] を埋めて true。
 * 位置はグローバルな格子から決まるので、タイルを作り直しても同じ木が同じ場所に立つ。
 */
class VegField {
  constructor(grp, at, o = {}) {
    this.grp = grp; this.at = at; this.tile = o.tile || 400; this.step = o.step || 14; this.range = o.range || 1200; this.map = new Map(); this.u = { value: this.range }; this.frame = 0;
    const sway = (o.sway ?? 0.012).toFixed(4);
    this.sets = VEG_KINDS.map((k) => { const { g, m } = treeTex(k), c = m.clone();
      c.onBeforeCompile = (sh) => { leafFrag(sh); sh.uniforms.uVegR = this.u; sh.uniforms.uVegT = fxTime;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uVegR,uVegT;').replace('/*veg*/', 'transformed*=smoothstep(uVegR,uVegR*.8,distance(ip.xz,cameraPosition.xz));transformed.x+=sin(uVegT*1.1+ip.x*.31+ip.z*.17)*position.y*position.y*' + sway + ';'); };
      c.customProgramCacheKey = () => 'veg' + sway; return { g, m: c }; });
    // 各種類を 1 本ずつ地中に置いておき、シェーダを最初の描画でまとめて用意する (歩いている途中で引っかからないように)
    for (const st of this.sets) { const im = new THREE.InstancedMesh(st.g, st.m, 1); _vo.position.set(0, -9000, 0); _vo.rotation.set(0, 0, 0); _vo.scale.setScalar(0.01); _vo.updateMatrix(); im.setMatrixAt(0, _vo.matrix); im.setColorAt(0, _vc.setRGB(1, 1, 1)); im.frustumCulled = false; grp.add(im); }
  }
  _pos(gi, gj, S, o) { o[0] = (gi + 0.15 + hs2(gi, gj, 1) * 0.7) * S; o[1] = (gj + 0.15 + hs2(gi, gj, 2) * 0.7) * S; return o; }
  /** カメラ位置 (cx,cz) の周囲 range×k を満たすようにタイルを生成・破棄する。1 回の呼び出しで作るのは budget 枚まで */
  update(cx, cz, k = 1, budget = 2) {
    const R = this.range * k, T = this.tile, R1 = R + T * 0.15; this.u.value = R; this.frame++;
    const i0 = Math.floor((cx - R1) / T), i1 = Math.floor((cx + R1) / T), j0 = Math.floor((cz - R1) / T), j1 = Math.floor((cz + R1) / T), need = [];
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const dx = Math.max(i * T - cx, 0, cx - (i + 1) * T), dz = Math.max(j * T - cz, 0, cz - (j + 1) * T), d2 = dx * dx + dz * dz; if (d2 > R1 * R1) continue; const key = i * 8192 + j, t = this.map.get(key); if (t) t.f = this.frame; else need.push([d2, i, j, key]); }
    if (need.length) { need.sort((a, b) => a[0] - b[0]); for (let n = 0; n < Math.min(budget, need.length); n++) { const q = need[n]; this.map.set(q[3], this._build(q[1], q[2])); } }
    for (const [key, t] of this.map) if (t.f < this.frame - 20) { for (const m of t.meshes) { this.grp.remove(m); m.dispose(); } this.map.delete(key); }
    return need.length;
  }
  _build(i, j) {
    const T = this.tile, n = Math.max(1, Math.round(T / this.step)), S = T / n, L = VEG_KINDS.map(() => []), out = [0, 0, 0, 0], p = [0, 0];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { const gi = i * n + a, gj = j * n + b; this._pos(gi, gj, S, p); if (!this.at(p[0], p[1], hs2(gi, gj, 3), hs2(gi, gj, 4), out)) continue; L[out[0]].push(p[0], out[3], p[1], out[1], out[2]); }
    const meshes = [];
    L.forEach((P, k) => { const c = P.length / 5; if (!c) return; const s = this.sets[k], im = new THREE.InstancedMesh(s.g, s.m, c);
      for (let q = 0; q < c; q++) { const x = P[q * 5], z = P[q * 5 + 2]; _vo.position.set(x, P[q * 5 + 1], z); _vo.rotation.set(0, (x * 1.7 + z * 0.9) % 6.28, 0); _vo.scale.set(P[q * 5 + 4], P[q * 5 + 3], P[q * 5 + 4]); _vo.updateMatrix(); im.setMatrixAt(q, _vo.matrix); const v = 0.72 + hs2(x, z, 5) * 0.5; im.setColorAt(q, _vc.setRGB(v, v * (0.9 + hs2(x, z, 6) * 0.16), v * 0.88)); }
      im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = false; this.grp.add(im); meshes.push(im); });
    return { meshes, f: this.frame };
  }
  /** (x,z) が幹にぶつかるか (徒歩の当たり判定) */
  hit(x, z, rad = 0.8) {
    const n = Math.max(1, Math.round(this.tile / this.step)), S = this.tile / n, g0 = Math.floor(x / S), h0 = Math.floor(z / S), p = [0, 0];
    for (let gi = g0 - 1; gi <= g0 + 1; gi++) for (let gj = h0 - 1; gj <= h0 + 1; gj++) { this._pos(gi, gj, S, p); const dx = p[0] - x, dz = p[1] - z; if (dx * dx + dz * dz < rad * rad && this.at(p[0], p[1], hs2(gi, gj, 3), hs2(gi, gj, 4), _vh)) return true; }
    return false;
  }
  clear() { for (const t of this.map.values()) for (const m of t.meshes) { this.grp.remove(m); m.dispose(); } this.map.clear(); }
}
/** 部品ごとに色を持つ結合ジオメトリ (頂点カラー)。InstancedMesh で大量配置する小物用 */
function colorGeo(parts) {
  const P = [], Nn = [], Cc = []; for (const [geo, col, matrix] of parts) { const q = geo.index ? geo.toNonIndexed() : geo; if (matrix) q.applyMatrix4(matrix); if (!q.attributes.normal) q.computeVertexNormals(); const c = new THREE.Color(col); P.push(...q.attributes.position.array); Nn.push(...q.attributes.normal.array); for (let i = 0; i < q.attributes.position.count; i++) Cc.push(c.r, c.g, c.b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  return g;
}

// ───────────────────────── 海 (波・空の映り込み・太陽のきらめき・波打ち際の泡) ─────────────────────────
const OCEAN_FS = /* glsl */`
precision highp float;
uniform float uTime,uFogDen;uniform vec3 uSun,uSunCol,uZen,uHor,uFogCol,uDeep,uShallow;
varying vec3 vW;varying float vD;
${N2}
void main(){
  vec2 p=vW.xz;float dist=length(vW-cameraPosition);vec2 g=vec2(0.);
  vec2 d1=vec2(.8,.6),d2=vec2(-.35,.94),d3=vec2(.96,-.28),d4=vec2(.2,1.),d5=vec2(-.7,-.7);
  g+=d1*.018*cos(dot(p,d1)*.018+uTime*.55)*1.6+d2*.041*cos(dot(p,d2)*.041+uTime*.8)*.8+d3*.09*cos(dot(p,d3)*.09+uTime*1.15)*.42+d4*.21*cos(dot(p,d4)*.21+uTime*1.7)*.2+d5*.47*cos(dot(p,d5)*.47+uTime*2.4)*.09;
  float e=.4,n0=fbm2(p*.33+uTime*.11),nx=fbm2((p+vec2(e,0.))*.33+uTime*.11),nz=fbm2((p+vec2(0.,e))*.33+uTime*.11);
  g+=vec2(nx-n0,nz-n0)/e*.7*smoothstep(1100.,20.,dist);
  g*=.25+.75*smoothstep(9000.,200.,dist);
  vec3 N=normalize(vec3(-g.x,1.,-g.y)),V=normalize(cameraPosition-vW);
  float fr=.02+.98*pow(1.-max(dot(N,V),0.),5.);vec3 R=reflect(-V,N);R.y=abs(R.y);
  vec3 skyc=mix(uHor,uZen,pow(clamp(R.y,0.,1.),.42))+uSunCol*pow(max(dot(R,uSun),0.),5.)*.35;
  float depth=max(vD,0.);vec3 water=mix(uShallow,uDeep,smoothstep(0.,26.,depth))*(.3+1.6*max(uSun.y,.08));
  vec3 col=mix(water,skyc,fr);
  col+=uSunCol*pow(max(dot(R,uSun),0.),420.)*22.*smoothstep(0.,.05,uSun.y+.02);
  float crest=smoothstep(.62,.9,n0)*smoothstep(600.,20.,dist)*.25;
  float foam=max(smoothstep(1.3,0.,depth)*smoothstep(.3,.7,fbm2(p*.45+vec2(uTime*.28,uTime*.11))),crest*smoothstep(4.,12.,depth));
  col=mix(col,vec3(.92,.96,1.)*(.35+1.5*max(uSun.y,.05)),foam*step(-.6,vD));
  col=mix(col,uFogCol,1.-exp(-uFogDen*uFogDen*dist*dist));
  gl_FragColor=vec4(col,1.);
}`;
function ocean(H, o) {
  const size = o.size || 40000, seg = o.seg || 150, lvl = o.level ?? 0, half = size / 2, n = seg + 1, xs = new Float32Array(n), pos = new Float32Array(n * n * 3), dep = new Float32Array(n * n), idx = new Uint32Array(seg * seg * 6);
  for (let i = 0; i < n; i++) xs[i] = warp1(-half + i * size / seg, half);
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) { const k = iz * n + ix; pos[k * 3] = xs[ix]; pos[k * 3 + 1] = 0; pos[k * 3 + 2] = xs[iz]; dep[k] = lvl - H(xs[ix], xs[iz]); }
  let q = 0; for (let iz = 0; iz < seg; iz++) for (let ix = 0; ix < seg; ix++) { const a = iz * n + ix, b = a + 1, cc = a + n, d = cc + 1; idx[q++] = a; idx[q++] = cc; idx[q++] = b; idx[q++] = b; idx[q++] = cc; idx[q++] = d; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aDepth', new THREE.BufferAttribute(dep, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const u = { uTime: fxTime, uSun: { value: o.sun }, uSunCol: { value: COL(o.sunCol) }, uZen: { value: COL(o.zen) }, uHor: { value: COL(o.hor) }, uFogCol: { value: o.fog[0] }, uFogDen: o.fogDen || { value: o.fog[1] }, uDeep: { value: COL(o.deep || '#03182c') }, uShallow: { value: COL(o.shallow || '#12464e') } };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: 'attribute float aDepth;varying vec3 vW;varying float vD;void main(){vD=aDepth;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}', fragmentShader: OCEAN_FS, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: 6 }));
  m.frustumCulled = false; m.position.y = lvl;
  return m;
}

export { HP, V3, COL, N2, makeSky, gridTerrain, terrainPatch, scatter, pad, node, beacon, forest, colorGeo, ocean, treeTex, VegField };
