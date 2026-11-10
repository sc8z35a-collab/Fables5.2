// 惑星地表の環境: 地球 (ネオン巨大都市) / 溶岩 / 砂漠 / 氷 / ガス巨星の雲海デッキ
import * as THREE from 'three';
import { Builder, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow, texSet, signMesh, screenMat } from '../gfx/textures.js';
import { rng, rr, fbm, ridge, smooth, clamp, pick } from '../core/util.js';
import { fxTime, makeGlowSprite } from '../gfx/fx.js';
import { BASES } from './defs.js';

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
  if(uStars>0.){vec3 p=d*260.,id=floor(p);float s=step(.985,h31(id))*smoothstep(.45,0.,length(fract(p)-.5));col+=vec3(.8,.9,1.)*s*uStars*(1.-t)*2.5;}
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
function terrain(H, colorFn, o = {}) {
  const size = o.size || 11000, seg = o.seg || 200, g = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-HP), p = g.attributes.position, col = new Float32Array(p.count * 3), uv = g.attributes.uv, c = [0, 0, 0];
  for (let i = 0; i < p.count; i++) {
    // 中心ほど細かく (頂点を中心へ寄せる)
    let x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z) / (size / 2), k = 0.35 + 0.65 * Math.min(1, r) ** 1.4; x *= k; z *= k;
    const h = H(x, z), e = 6, sl = Math.hypot(H(x + e, z) - h, H(x, z + e) - h) / e;
    p.setXYZ(i, x, h, z); colorFn(x, z, h, sl, c); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; uv.setXY(i, x * (o.uv || 0.045), z * (o.uv || 0.045));
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const s = texSet(o.tex || 'rock'), m = new THREE.MeshStandardMaterial({ vertexColors: true, map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: o.rough ?? 1, metalness: o.metal ?? 0.05 });
  m.normalScale.setScalar(o.ns ?? 1.2); m.envMapIntensity = o.env ?? 0.5;
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true;
  return mesh;
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

// ───────────────────────── 地球: ネオン・ベイ ─────────────────────────
const CITY_VS = /* glsl */`
attribute vec3 aSize;attribute float aSeed;varying vec3 vL,vN,vW,vS;varying float vSeed;
void main(){vL=position*aSize;vS=aSize;vSeed=aSeed;vN=normal;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const CITY_FS = /* glsl */`
precision highp float;
uniform vec3 uFogCol,uAmb,uSunDir,uSunCol;uniform float uFogDen,uTime;
varying vec3 vL,vN,vW,vS;varying float vSeed;
float h1(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec3 n=normalize(vN);vec3 base=mix(vec3(.03,.035,.05),vec3(.085,.09,.11),h1(vec2(vSeed,1.)));vec3 col;
  vec3 neon=.5+.5*cos(6.2832*(h1(vec2(vSeed,9.))+vec3(0.,.33,.67)));neon=mix(neon,vec3(1.,.2,.8),.35);
  if(n.y>.5){col=base*.5*(uAmb*3.+.3);vec2 q=vL.xz/7.;float v=step(.9,h1(floor(q)+vSeed));col+=vec3(1.,.25,.15)*v*smoothstep(.25,0.,length(fract(q)-.5))*4.;
    float rim=max(abs(vL.x)/(vS.x*.5),abs(vL.z)/(vS.z*.5));col+=neon*smoothstep(.93,.97,rim)*step(.45,h1(vec2(vSeed,11.)))*2.;}
  else{
    vec2 uv=abs(n.x)>.5?vec2(vL.z,vL.y):vec2(vL.x,vL.y);vec2 cs=vec2(3.3,3.7);float style=h1(vec2(vSeed,7.));
    vec2 cell=floor(uv/cs),f=fract(uv/cs);
    float lit=step(.55+.3*h1(vec2(vSeed,3.)),h1(cell+vSeed*13.));
    float win=smoothstep(.1,.16,f.x)*smoothstep(.9,.84,f.x)*smoothstep(.2,.26,f.y)*smoothstep(.8,.74,f.y);
    if(style>.66){win=smoothstep(.24,.3,f.y)*smoothstep(.76,.7,f.y);lit=step(.45,h1(vec2(cell.y,vSeed)))*(.3+.7*step(.5,h1(cell+vSeed)));}
    vec3 wc=mix(vec3(1.,.66,.32),vec3(.4,.7,1.),step(.6,h1(cell*1.7+vSeed)));wc=mix(wc,vec3(1.,.2,.7),step(.94,h1(cell*2.3+vSeed*5.)));
    float inten=.15+1.0*pow(h1(cell+3.+vSeed),2.);
    float px=max(fwidth(uv.x)/cs.x,fwidth(uv.y)/cs.y),k=smoothstep(.55,.2,px);
    col=base*(uAmb*1.6+uSunCol*max(dot(n,uSunDir),0.)*.5);
    vec3 em=wc*win*lit*inten+vec3(.03,.04,.08)*win*(1.-lit);
    col+=mix(vec3(1.,.72,.5)*.05,em,k);
    float top=smoothstep(vS.y-2.2,vS.y-.6,vL.y);col+=neon*top*step(.45,h1(vec2(vSeed,11.)))*2.6;
    float edge=abs(n.x)>.5?abs(vL.z)/(vS.z*.5):abs(vL.x)/(vS.x*.5);col+=neon*smoothstep(.975,.992,edge)*step(.7,h1(vec2(vSeed,13.)))*2.2;
    float band=step(.82,h1(vec2(vSeed,17.)))*smoothstep(.06,0.,abs(fract(vL.y/38.)-.5)-.44);col+=neon.zxy*band*2.;
    col*=.55+.45*smoothstep(0.,14.,vL.y);
  }
  float d=length(vW-cameraPosition);col=mix(col,uFogCol,1.-exp(-uFogDen*uFogDen*d*d));
  gl_FragColor=vec4(col,1.);
}`;
function terra() {
  const r = rng(2077), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [];
  const sunDir = V3(-0.82, 0.13, 0.55).normalize(), fog = [COL('#1c1230'), 0.00052];
  const sky = makeSky({ sun: sunDir, zen: '#04061c', hor: '#7a2a52', ground: '#0a0612', sunCol: '#ff7a3a', cloudCol: '#c05a8a', cloud: 0.55, stars: 0.8, haze: 0.9, sunSize: 0.9993 });
  const sea = (x, z) => smooth(1500, 2300, z);
  const H = (x, z) => { const d = Math.hypot(x, z), hills = smooth(1700, 3600, -z + Math.abs(x) * 0.25) * (fbm(x * 0.0009, z * 0.0009, 5, 3) * 420 + ridge(x * 0.002, z * 0.002, 4, 9) * 160); return hills * smooth(1500, 2400, d) - sea(x, z) * 14 - 0.4; };
  grp.add(terrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.004, z * 0.004, 3, 5); if (h < -1.5) { c[0] = 0.03; c[1] = 0.03; c[2] = 0.04; } else { c[0] = 0.035 + n * 0.03 + sl * 0.05; c[1] = 0.05 + n * 0.04; c[2] = 0.05 + n * 0.02; } }, { rough: 0.9 }));
  // 濡れた路面 (平面反射)
  const road = mat('concrete', { color: 0x30323a, rough: 0.5, metal: 0.4, uvs: 0.08, floor: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3400, 3400).rotateX(-HP), road); ground.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 280; }); ground.position.y = 0.02; ground.receiveShadow = true; grp.add(ground);
  const water = mat('water', { color: 0x0a1626, rough: 0.5, metal: 0.9, uvs: 0, env: 2.2 }), wm = new THREE.Mesh(new THREE.PlaneGeometry(12000, 6000).rotateX(-HP), water); wm.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 160; }); wm.position.set(0, -1.6, 4700); grp.add(wm);
  anim.push((dt, t) => { water.normalMap.offset.set(t * 0.004, t * 0.007); });
  // ビル群 (インスタンシング + 手続き型ファサード)
  const cu = { uFogCol: { value: fog[0] }, uFogDen: { value: fog[1] }, uTime: fxTime, uAmb: { value: COL('#2a2440') }, uSunDir: { value: sunDir }, uSunCol: { value: COL('#ff7a3a') } };
  const bg = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), sizes = [], seeds = [], list = [], block = 92, street = 26;
  for (let gx = -15; gx <= 15; gx++) for (let gz = -15; gz <= 15; gz++) {
    const cx = gx * block, cz = gz * block - 260; if (Math.hypot(cx, cz + 260) < 250 || cz > 1350 || Math.hypot(cx, cz) > 1560 || r() < 0.06) continue;
    const cbd = Math.exp(-((cx - 150) ** 2 + (cz + 900) ** 2) / 420000), n = r() < 0.45 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const w = (block - street) / n - (n > 1 ? 4 : 0), d = block - street - rr(r, 0, 12), h = 26 + r() * 70 + cbd * (120 + r() * 300) + (r() < 0.05 ? 160 : 0);
      const x = cx + (n > 1 ? (k - 0.5) * (w + 6) : 0); list.push([x, cz, w, h, d]);
      if (h > 150 && r() < 0.7) list.push([x, cz, w * 0.62, h * rr(r, 1.18, 1.45), d * 0.62]);
    }
  }
  const city = new THREE.InstancedMesh(bg, new THREE.ShaderMaterial({ uniforms: cu, vertexShader: CITY_VS, fragmentShader: CITY_FS }), list.length), o3 = new THREE.Object3D();
  list.forEach(([x, z, w, h, d], i) => { o3.position.set(x, 0, z); o3.scale.set(w, h, d); o3.updateMatrix(); city.setMatrixAt(i, o3.matrix); sizes.push(w, h, d); seeds.push(r() * 100); rects.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]); });
  bg.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(sizes), 3)); bg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1)); city.frustumCulled = false; grp.add(city);
  // ネオン看板 (縦書き)
  const words = ['ラ\nー\nメ\nン', '電\n脳', 'ホ\nテ\nル', '酒\n場', 'カ\nラ\nオ\nケ', '薬', '宇\n宙\n港', 'NOVA', 'CYBER', '寿\n司', '質', 'ネ\nオ\nン\nベ\nイ', 'ゲ\nー\nム', '夜\n市', 'BAR', '銀\n河\n銀\n行'], cs = ['#ff3df0', '#4df0ff', '#ffe14d', '#ff5a3a', '#6dffb0', '#b58cff'];
  const near = list.map((b, i) => [Math.hypot(b[0], b[1]), i]).sort((a, b) => a[0] - b[0]).slice(0, 46);
  near.forEach(([, i], k) => {
    const [x, z, w, h, d] = list[i], txt = words[k % words.length], hz = txt.includes('\n') ? Math.min(h * 0.6, 34 + r() * 22) : 9 + r() * 6, s = signMesh(txt, cs[k % cs.length], hz, { double: true, intensity: 3.2, frame: r() < 0.5 });
    const fx = Math.abs(x) > Math.abs(z) ? -Math.sign(x) : 0, fz = fx ? 0 : -Math.sign(z || 1), y = Math.min(h - hz / 2 - 3, 14 + hz / 2 + r() * 24);
    s.position.set(x + fx * (w / 2 + 0.6) + (fx ? 0 : rr(r, -w / 3, w / 3)), y, z + fz * (d / 2 + 0.6) + (fz ? 0 : rr(r, -d / 3, d / 3))); s.rotation.y = fx ? fx * HP : fz > 0 ? 0 : Math.PI; grp.add(s);
    if (k % 3 === 0) anim.push((dt, t) => { s.material.color.setScalar(Math.sin(t * 11 + k) > 0.94 ? 1 : 3.2); });
  });
  // 巨大ホログラム & 光柱
  const hm = new THREE.LineBasicMaterial({ color: COL('#4df0ff').multiplyScalar(2.2), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const holo = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(70, 16, 120, 10, 2, 3)), hm); holo.position.set(150, 560, -900); grp.add(holo);
  const globe = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(60, 2)), new THREE.LineBasicMaterial({ color: COL('#ff3df0').multiplyScalar(2.2), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); globe.position.set(-520, 330, -520); grp.add(globe);
  anim.push((dt) => { holo.rotation.y += dt * 0.25; holo.rotation.x += dt * 0.1; globe.rotation.y -= dt * 0.3; });
  const beamM = (c) => new THREE.ShaderMaterial({ uniforms: { uCol: { value: COL(c) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, vertexShader: 'varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}', fragmentShader: 'uniform vec3 uCol;varying vec2 vUv;varying vec3 vN,vV;void main(){float a=pow(abs(dot(vN,vV)),1.5)*pow(1.-vUv.y,1.3);gl_FragColor=vec4(uCol*a*.9,1.);}' });
  [[150, -900, '#4df0ff'], [-520, -520, '#ff3df0'], [600, -300, '#ffe14d'], [-200, -1200, '#b58cff'], [760, -1000, '#4df0ff']].forEach(([x, z, c], i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(26, 5, 1500, 16, 1, true), beamM(c)); m.position.set(x, 900, z); grp.add(m); anim.push((dt, t) => { m.rotation.z = Math.sin(t * 0.2 + i * 2) * 0.16; m.rotation.x = Math.cos(t * 0.17 + i) * 0.14; });
  });
  // 空飛ぶ車の車列
  const cb = new Builder(), vc = (c, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: COL(c).multiplyScalar(k), toneMapped: false }); m.userData.uvs = 0; return m; };
  const carG = (() => { const b2 = new Builder(), bm = vc('#10131a'); b2.box(bm, 2.2, 0.9, 5.2, 0, 0, 0); b2.box(bm, 1.8, 0.6, 2.6, 0, 0.7, 0.2); const g = b2.build().children[0].geometry, n = g.attributes.position.count, c = new Float32Array(n * 3).fill(0.04);
    const add = (geo, col) => { const q = geo.toNonIndexed(), m2 = q.attributes.position.count, cc = new Float32Array(m2 * 3); for (let i = 0; i < m2; i++) cc.set(col, i * 3); q.setAttribute('color', new THREE.BufferAttribute(cc, 3)); q.deleteAttribute('uv'); q.deleteAttribute('normal'); return q; };
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); g.deleteAttribute('normal');
    return [g, add(new THREE.BoxGeometry(2.0, 0.3, 0.2).translate(0, 0, -2.65), [9, 9, 8]), add(new THREE.BoxGeometry(2.0, 0.3, 0.2).translate(0, 0, 2.65), [9, 0.6, 0.3])]; })();
  const merged = new THREE.BufferGeometry(); { const ps = [], cl = []; for (const g of carG) { ps.push(...g.attributes.position.array); cl.push(...g.attributes.color.array); } merged.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); merged.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); }
  const NC = 170, cars = new THREE.InstancedMesh(merged, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), NC), lanes = [];
  for (let i = 0; i < NC; i++) { const ax = r() < 0.5, lane = (Math.floor(rr(r, -9, 9)) + 0.5) * block - (ax ? 260 : 0), alt = pick(r, [42, 78, 120, 170]) + rr(r, -3, 3), dir = r() < 0.5 ? 1 : -1; lanes.push({ ax, lane: lane + dir * 5, alt, dir, off: r() * 3200, sp: rr(r, 38, 70) }); }
  cars.frustumCulled = false; grp.add(cars);
  anim.push((dt, t) => { for (let i = 0; i < NC; i++) { const l = lanes[i], s = ((t * l.sp + l.off) % 3200) - 1600; if (l.ax) o3.position.set(s * l.dir, l.alt, l.lane); else o3.position.set(l.lane, l.alt, s * l.dir - 260); o3.rotation.set(0, l.ax ? (l.dir > 0 ? -HP : HP) : l.dir > 0 ? Math.PI : 0, 0); o3.scale.setScalar(1); o3.updateMatrix(); cars.setMatrixAt(i, o3.matrix); } cars.instanceMatrix.needsUpdate = true; });
  // 宇宙港: パッド / 管制塔 / ターミナルビル
  const D = mat('hull', { color: 0x3a3f48, rough: 0.7, metal: 0.6 }), W = mat('wall', { color: 0x4a5262, rough: 0.6, metal: 0.5 });
  pad(B, 1.0, 36, '#4df0ff');
  B.cyl(D, 5, 7, 70, -70, 35, 40, 'y', 12); B.cyl(W, 13, 9, 10, -70, 75, 40, 'y', 12); B.cyl(glow('#4df0ff', 3), 13.2, 13.2, 1.2, -70, 76, 40, 'y', 12, true); B.cyl(D, 0.5, 0.5, 30, -70, 95, 40, 'y', 6);
  B.box(W, 64, 16, 30, 86, 8, 30); B.box(D, 68, 1.5, 34, 86, 16.5, 30); B.box(glow('#ff3df0', 3), 64.2, 0.5, 30.2, 86, 15, 30); B.box(glow('#cfe0ff', 1.4), 0.3, 9, 22, 53.9, 6.5, 30); B.box(D, 2, 5, 7, 53.6, 2.5, 30);
  rects.push([54, 15, 118, 45]); cols.push({ x: -70, z: 40, r: 8 });
  const s1 = signMesh('ネオン・ベイ宇宙港', '#4df0ff', 5, { double: true, intensity: 3 }); s1.position.set(53.5, 13, 30); s1.rotation.y = -HP; grp.add(s1);
  const s2 = signMesh('ARRIVALS →', '#ff3df0', 2, { double: true, intensity: 3 }); s2.position.set(53.5, 8.6, 30); s2.rotation.y = -HP; grp.add(s2);
  items.push({ x: 52, z: 30, r: 5, label: 'ターミナルビルに入る', act: 'outpost' });
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + 0.3, x = Math.cos(a) * 62, z = Math.sin(a) * 62; if (x > 40 && Math.abs(z - 30) < 22) continue; B.cyl(D, 0.25, 0.4, 12, x, 6, z, 'y', 8); B.box(D, 3, 0.3, 0.6, x - Math.cos(a) * 1.4, 12, z - Math.sin(a) * 1.4, -a); beacon(beacons, x - Math.cos(a) * 2.6, 11.7, z - Math.sin(a) * 2.6, '#cfe0ff', 9); cols.push({ x, z, r: 0.6 }); }
  beacon(beacons, -70, 111, 40, '#f33', 14, 0.6);
  // 資源サンプル (電子廃材)
  const nodes = []; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.5, d = 90 + (i % 3) * 38, n = node('#4df0ff', 0.8, 30 + i); n.position.set(Math.cos(a) * d - 20, 0, Math.sin(a) * d + 6); grp.add(n); nodes.push({ g: n, x: n.position.x, z: n.position.z, item: 'elec', label: '電子廃材を回収する' }); }
  grp.add(B.build());
  return { id: 'terra', group: grp, sky, H, sunDir, sunCol: '#ff8a50', sunInt: 1.6, hemi: ['#4a3a7a', '#1a1024', 1.1], fog, cols, rects, items, anim, beacons, nodes, padY: 1.1, mirror: [road, 1.5], rain: [V3(6, -46, 2), 0.5, '#9fb8ff'], walkR: 1500, door: [50, 30, -HP], foot: [0, 42], look: [0.5, 1.1, 0.95], music: 'neon', water: -1.6 };
}

// ───────────────────────── 溶岩の星 ─────────────────────────
const LAVA_FS = /* glsl */`
precision highp float;uniform float uTime;varying vec3 vW;
${N2}
void main(){vec2 p=vW.xz*.02;float n=fbm2(p+vec2(uTime*.02,0.)+fbm2(p*2.-uTime*.03)*1.2);float c=smoothstep(.35,.75,n);
  vec3 col=mix(vec3(.5,.04,0.),vec3(4.,1.1,.12),c)+vec3(6.,4.,1.5)*pow(c,6.);float crust=smoothstep(.42,.3,n);col=mix(col,vec3(.03,.02,.02),crust*.9);
  float d=length(vW-cameraPosition);col=mix(col,vec3(.16,.04,.02),1.-exp(-d*d*2.5e-7));gl_FragColor=vec4(col,1.);}`;
function ignis() {
  const r = rng(303), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(0.4, 0.22, -0.6).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#0a0302', hor: '#5a1608', ground: '#1a0502', sunCol: '#ff5a1e', cloudCol: '#3a1810', cloud: 0.7, stars: 0.2, haze: 1.2, sunSize: 0.9988 });
  const H = (x, z) => { const d = Math.hypot(x, z), flat = smooth(70, 240, d), riv = Math.abs(fbm(x * 0.0016 + 3, z * 0.0016, 4, 11) - 0.5), base = fbm(x * 0.0012, z * 0.0012, 5, 2) * 90 + ridge(x * 0.004, z * 0.004, 4, 5) * 34;
    const vol = Math.exp(-((x + 2600) ** 2 + (z + 1900) ** 2) / 1.3e6) * 1150 - Math.exp(-((x + 2600) ** 2 + (z + 1900) ** 2) / 6e4) * 330;
    return (base - smooth(0.085, 0.0, riv) * 70 - 18) * flat + 8 * (1 - flat) + vol; };
  grp.add(terrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.01, z * 0.01, 3, 8), hot = smooth(6, -6, h); c[0] = 0.05 + n * 0.05 + hot * 0.5 + sl * 0.03; c[1] = 0.04 + n * 0.035 + hot * 0.08; c[2] = 0.04 + n * 0.03; }, { rough: 0.75, metal: 0.25, ns: 1.8, env: 0.8 }));
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000).rotateX(-HP), new THREE.ShaderMaterial({ uniforms: { uTime: fxTime }, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}', fragmentShader: LAVA_FS })); lava.position.y = -4; grp.add(lava);
  const RK = mat('rock', { color: 0x2a2220, rough: 0.8, metal: 0.2, uvs: 0, ns: 1.5 });
  grp.add(scatter(rockGeo(1, 2, 5, 0.45), RK, 420, (o) => { const a = r() * 6.28, d = rr(r, 90, 2600), x = Math.cos(a) * d, z = Math.sin(a) * d, h = H(x, z); if (h < 0) return false; const s = Math.pow(r(), 3) * 16 + 1.2; o.position.set(x, h - s * 0.3, z); o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.set(s, s * rr(r, 0.7, 1.6), s); if (s > 3 && d < 700) cols.push({ x, z, r: s * 0.8 }); }));
  // 精錬基地
  const D = mat('hull', { color: 0x3a3430, rough: 0.8, metal: 0.6 }), RB = mat('rib', { color: 0x7a5a48, metal: 0.5 }), W = mat('wall', { color: 0x6a5648, rough: 0.7, metal: 0.5 }), G = glow('#ff6a1e', 4);
  pad(B, 8.1, 32, '#ff8a2a');
  B.box(W, 34, 12, 22, 70, 14, -10); B.box(D, 36, 1.4, 24, 70, 20.6, -10); B.box(glow('#ffc890', 2), 0.3, 4, 14, 52.9, 13, -10); B.box(D, 2, 4.4, 5, 52.5, 10.2, -10); B.box(G, 34.2, 0.4, 22.2, 70, 19, -10);
  for (const [x, z, h] of [[82, -34, 46], [92, -30, 60], [74, -40, 34]]) { B.cyl(RB, 3, 4.5, h, x, 8 + h / 2, z, 'y', 14); B.cyl(G, 3.1, 3.1, 0.8, x, 8 + h - 1, z, 'y', 14, true); beacon(beacons, x, 8 + h + 2, z, '#ff8a2a', 16); }
  for (let i = 0; i < 4; i++) { B.sph(RB, 7, 100, 15, -2 + i * 15, 1, 1, 1, 18); B.cyl(D, 0.6, 0.6, 15, 100, 11, 6 + i * 15 - 8, 'z', 8); }
  B.box(D, 60, 8.2, 40, 76, 4, -4); rects.push([52, -22, 108, 52]); items.push({ x: 51, z: -10, r: 5, label: '精錬管制室に入る', act: 'outpost' });
  const s1 = signMesh('フォージ採掘基地', '#ff8a2a', 3.2, { double: true, intensity: 3 }); s1.position.set(52.6, 17.4, -10); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.2, d = 110 + (i % 3) * 60; let x = Math.cos(a) * d - 30, z = Math.sin(a) * d; const n = node('#ff5a1e', 1.2, 60 + i); n.position.set(x, Math.max(H(x, z), -3), z); grp.add(n); nodes.push({ g: n, x, z, item: 'magma', label: 'マグマ晶を採取する' }); }
  grp.add(B.build());
  return { id: 'ignis', group: grp, sky, H, sunDir, sunCol: '#ff7a40', sunInt: 2.2, hemi: ['#6a2a18', '#3a0c04', 1.2], fog: [COL('#280a05'), 0.00042], cols, rects, items, anim, beacons, nodes, padY: 8.2, rain: [V3(3, 9, 1), 0.5, '#ff8a4a'], walkR: 900, door: [49, -10, -HP], foot: [0, 40], look: [0.7, 0.95, 1.0], heat: 0.12, music: 'hostile', smoke: [-2600, 760, -1900], hazard: (x, z, h) => h < -2.5 };
}

// ───────────────────────── 砂漠の星 ─────────────────────────
function sahar() {
  const r = rng(404), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(0.5, 0.52, 0.4).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#3a6aa8', hor: '#e8b888', ground: '#b88a5a', sunCol: '#fff0d0', cloudCol: '#f4dcc0', cloud: 0.28, stars: 0, haze: 0.5, sunSize: 0.9994 });
  const H = (x, z) => { const d = Math.hypot(x, z), flat = smooth(60, 260, d), dune = Math.pow(Math.abs(Math.sin(x * 0.006 + fbm(x * 0.001, z * 0.001, 3, 4) * 6) ), 1.6) * 26 + fbm(x * 0.0007, z * 0.0007, 4, 9) * 60;
    const mesa = smooth(0.56, 0.62, fbm(x * 0.0006 + 9, z * 0.0006, 4, 21)) * (230 + fbm(x * 0.004, z * 0.004, 3, 2) * 50) * smooth(500, 1100, d);
    return (dune + mesa) * flat; };
  grp.add(terrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.008, z * 0.008, 3, 6), rock = smooth(0.35, 0.9, sl) + smooth(120, 200, h) * 0.5; c[0] = 0.62 + n * 0.16 - rock * 0.3; c[1] = 0.36 + n * 0.1 - rock * 0.2; c[2] = 0.17 + n * 0.05 - rock * 0.07; if (h > 150 && sl < 0.3) { c[0] *= 0.8; c[1] *= 0.72; c[2] *= 0.7; } }, { rough: 1, ns: 0.8, uv: 0.06 }));
  const RK = mat('rock', { color: 0xb07048, rough: 1, metal: 0, uvs: 0 });
  grp.add(scatter(rockGeo(1, 2, 9, 0.4), RK, 360, (o) => { const a = r() * 6.28, d = rr(r, 80, 2400), x = Math.cos(a) * d, z = Math.sin(a) * d, s = Math.pow(r(), 3) * 12 + 0.8; o.position.set(x, H(x, z) - s * 0.3, z); o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.set(s, s * rr(r, 0.6, 1.8), s); if (s > 3 && d < 700) cols.push({ x, z, r: s * 0.8 }); }));
  // オアシス・コロニー (ドーム群)
  const Wt = mat('flat', { color: 0xeee4d0, rough: 0.6, metal: 0.05 }), D = mat('hull', { color: 0x6a5a48, rough: 0.8, metal: 0.4 }), S = mat('solar', { metal: 0.9, env: 1.6 }), GL = new THREE.MeshStandardMaterial({ color: 0x9fe0d0, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, emissive: 0x3a8a6a, emissiveIntensity: 0.6, side: THREE.DoubleSide }); GL.userData.uvs = 0;
  pad(B, 0.1, 32, '#ffcf6a');
  B.add(GL, new THREE.SphereGeometry(22, 32, 16, 0, 6.2832, 0, HP), mx(80, 0, 0), 0); B.cyl(Wt, 22.6, 23.4, 3, 80, 1.5, 0, 'y', 32);
  for (let i = 0; i < 8; i++) B.add(Wt, new THREE.TorusGeometry(22.1, 0.25, 6, 24, Math.PI), mx(80, 0, 0, 0, i * Math.PI / 8, 0), 0);
  for (let i = 0; i < 9; i++) { const a = i * 0.7; B.add(mat('flat', { color: 0x2c7a31, rough: 0.9, metal: 0 }), rockGeo(rr(r, 2.4, 4.2), 1, i, 0.4), mx(80 + Math.cos(a) * rr(r, 3, 14), rr(r, 3, 8), Math.sin(a) * rr(r, 3, 14)), 0); }
  B.add(GL, new THREE.SphereGeometry(11, 24, 12, 0, 6.2832, 0, HP), mx(108, 0, 26), 0); B.cyl(Wt, 11.4, 12, 2.4, 108, 1.2, 26, 'y', 24); B.add(GL, new THREE.SphereGeometry(9, 24, 12, 0, 6.2832, 0, HP), mx(104, 0, -26), 0); B.cyl(Wt, 9.4, 10, 2.4, 104, 1.2, -26, 'y', 24);
  B.cyl(Wt, 3.4, 3.4, 4.6, 56, 2.3, 0, 'x', 16); B.box(D, 0.5, 4, 3, 54.2, 2, 0); B.box(glow('#ffcf6a', 3), 0.2, 0.3, 3.2, 54.1, 4.2, 0);
  for (let i = 0; i < 6; i++) { B.box(S, 9, 0.2, 5, 60 + (i % 3) * 11, 3.2, 44 + Math.floor(i / 3) * 8, 0, -0.5); B.cyl(D, 0.15, 0.15, 3, 60 + (i % 3) * 11, 1.5, 44 + Math.floor(i / 3) * 8, 'y', 6); }
  B.cyl(D, 0.3, 0.5, 34, 120, 17, -4, 'y', 8); beacon(beacons, 120, 35, -4, '#f33', 12, 0.6);
  cols.push({ x: 80, z: 0, r: 23.5 }, { x: 108, z: 26, r: 12 }, { x: 104, z: -26, r: 10 }); rects.push([56, 40, 90, 56]); items.push({ x: 53, z: 0, r: 5, label: 'コロニーのドームに入る', act: 'outpost' });
  const s1 = signMesh('オアシス・コロニー', '#ffcf6a', 2.6, { double: true, intensity: 2.6 }); s1.position.set(54, 6.6, 0); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 1.2, d = 100 + (i % 3) * 70, x = Math.cos(a) * d - 30, z = Math.sin(a) * d, n = node('#ffb347', 1, 80 + i); n.position.set(x, H(x, z), z); grp.add(n); nodes.push({ g: n, x, z, item: 'spice', label: '砂漠香料を採取する' }); }
  grp.add(B.build());
  return { id: 'sahar', group: grp, sky, H, sunDir, sunCol: '#fff2dc', sunInt: 4.2, hemi: ['#9ab8e0', '#a87a4a', 1.0], fog: [COL('#d8b088'), 0.00022], cols, rects, items, anim, beacons, nodes, padY: 0.2, rain: [V3(34, -1, 9), 0.35, '#f0d0a0'], walkR: 900, door: [51, 0, -HP], foot: [0, 40], look: [0.5, 1.05, 1.0], music: 'surface' };
}

// ───────────────────────── 氷の星 ─────────────────────────
function glacies() {
  const r = rng(505), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(-0.5, 0.1, -0.8).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#01040e', hor: '#0e2a4a', ground: '#0a1420', sunCol: '#9fc8ff', cloudCol: '#5a7a9a', cloud: 0.2, stars: 1.6, aurora: 1.5, haze: 0.5, sunSize: 0.9997 });
  const H = (x, z) => { const d = Math.hypot(x, z), flat = smooth(60, 240, d), cr = Math.abs(fbm(x * 0.002 + 5, z * 0.002, 4, 13) - 0.5); return (fbm(x * 0.0009, z * 0.0009, 5, 7) * 110 + ridge(x * 0.003, z * 0.003, 4, 3) * 60 - smooth(0.03, 0.0, cr) * 46 + ridge(x * 0.0004, z * 0.0004, 3, 17) * 420 * smooth(1200, 3200, d)) * flat; };
  grp.add(terrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.006, z * 0.006, 3, 4), deep = smooth(0.2, 0.9, sl); c[0] = 0.62 + n * 0.2 - deep * 0.42; c[1] = 0.74 + n * 0.16 - deep * 0.3; c[2] = 0.86 + n * 0.1 - deep * 0.08; }, { rough: 0.38, metal: 0.1, ns: 0.9, env: 1.6, uv: 0.03 }));
  const ICE = new THREE.MeshStandardMaterial({ color: 0x8fd8ff, emissive: 0x1a6aa8, emissiveIntensity: 0.7, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.88 });
  grp.add(scatter(new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0), ICE, 300, (o) => { const a = r() * 6.28, d = rr(r, 70, 2200), x = Math.cos(a) * d, z = Math.sin(a) * d, s = Math.pow(r(), 2.5) * 9 + 1; o.position.set(x, H(x, z) - 0.5, z); o.rotation.set(rr(r, -0.25, 0.25), r() * 6, rr(r, -0.25, 0.25)); o.scale.set(s, s * rr(r, 2.5, 6), s); if (d < 700) cols.push({ x, z, r: s * 0.8 }); }, false));
  const D = mat('hull', { color: 0x3a4048, rough: 0.7, metal: 0.6 }), Wd = mat('wood', { color: 0xc8a888, rough: 0.8, metal: 0 }), Wt = mat('flat', { color: 0xdfe8f0, rough: 0.5, metal: 0.1 }), WG = glow('#ffcf8a', 2.6);
  pad(B, 0.1, 30, '#a6f0ff');
  B.box(Wd, 26, 7, 16, 66, 4.5, 0); B.add(Wt, new THREE.CylinderGeometry(9.2, 9.2, 26.4, 20, 1, false, 0, Math.PI).rotateZ(HP), mx(66, 8, 0), 0.1); for (let i = 0; i < 5; i++) { B.box(WG, 0.2, 2, 2.6, 52.9, 4.6, -6 + i * 3); if (i !== 2) B.box(WG, 2.6, 2, 0.2, 58 + i * 4, 4.6, 8.05); }
  B.box(D, 1.6, 4.2, 3, 52.6, 3.1, 0); for (const [x, z] of [[55, -7], [77, -7], [55, 7], [77, 7]]) B.cyl(D, 0.4, 0.5, 2, x, 0.6, z, 'y', 8);
  B.cyl(D, 0.3, 0.4, 16, 84, 8, -10, 'y', 8); B.add(Wt, new THREE.SphereGeometry(5, 20, 12, 0, 6.2832, 0, 1.2), mx(84, 17, -10, -2.3, 0.4, 0), 0); B.cyl(D, 0.2, 0.3, 26, 88, 13, 12, 'y', 6); beacon(beacons, 88, 26.5, 12, '#f33', 10, 0.6); beacon(beacons, 52.6, 6.4, 0, '#ffcf8a', 7);
  rects.push([52, -9, 80, 9]); cols.push({ x: 84, z: -10, r: 1.2 }); items.push({ x: 51, z: 0, r: 5, label: '研究所に入る', act: 'outpost' });
  const s1 = signMesh('氷床研究所', '#a6f0ff', 2.2, { double: true, intensity: 2.6 }); s1.position.set(52.7, 9, 0); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 2.2, d = 100 + (i % 3) * 65, x = Math.cos(a) * d - 30, z = Math.sin(a) * d, n = node('#6fe8ff', 1.3, 90 + i); n.position.set(x, H(x, z), z); grp.add(n); nodes.push({ g: n, x, z, item: 'ice', label: '氷晶を採取する' }); }
  grp.add(B.build());
  return { id: 'glacies', group: grp, sky, H, sunDir, sunCol: '#a8c8ff', sunInt: 1.1, hemi: ['#2a5a8a', '#16263a', 1.5], fog: [COL('#0c1c30'), 0.00026], cols, rects, items, anim, beacons, nodes, padY: 0.2, rain: [V3(4, -7, 2), 0.7, '#ffffff'], walkR: 900, door: [50, 0, -HP], foot: [0, 38], look: [0.6, 1.0, 1.05], music: 'surface' };
}

// ───────────────────────── ガス巨星: 雲海デッキ ─────────────────────────
const CLOUD_FS = /* glsl */`
precision highp float;uniform float uTime;uniform vec3 uSun,uA,uB,uC;varying vec3 vW;
${N2}
float hgt(vec2 p){return fbm2(p*.0011+vec2(uTime*.006,0.))*.7+fbm2(p*.004-uTime*.01)*.3;}
void main(){vec2 p=vW.xz;float h=hgt(p),e=14.;vec3 n=normalize(vec3(hgt(p+vec2(e,0.))-h,.085,hgt(p+vec2(0.,e))-h)*vec3(-1.,1.,-1.));
  float l=max(dot(n,uSun),0.),v=smoothstep(.3,.75,h);vec3 col=mix(uB,uA,v)*(.35+l*1.25)+uC*pow(1.-v,2.)*.4;
  vec3 V=normalize(cameraPosition-vW);col+=uA*pow(1.-max(dot(n,V),0.),3.)*.35;
  float fl=step(.9965,fract(sin(floor(uTime*3.)*91.7)*4371.))*smoothstep(900.,0.,length(p-vec2(sin(floor(uTime*3.)*7.)*2600.,cos(floor(uTime*3.)*5.)*2600.)));col+=vec3(.8,.85,1.)*fl*6.;
  float d=length(vW-cameraPosition);col=mix(col,vec3(.86,.6,.42),1.-exp(-d*d*4.5e-8));gl_FragColor=vec4(col,1.);}`;
function zephyr() {
  const r = rng(606), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(0.7, 0.2, -0.5).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#1a2a5a', hor: '#f0a060', ground: '#c88a5a', sunCol: '#ffd9a0', cloudCol: '#ffd0b0', cloud: 0.35, stars: 0.35, ring: 1.3, ringN: V3(0.25, 0.42, 0.87), haze: 1.0, sunSize: 0.99965 });
  const R = 150, H = (x, z) => (Math.hypot(x, z) < R ? 0 : -400);
  const cu = { uTime: fxTime, uSun: { value: sunDir }, uA: { value: COL('#ffe0b8') }, uB: { value: COL('#6a4a7a') }, uC: { value: COL('#2a6a8a') } };
  const cl = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-HP), new THREE.ShaderMaterial({ uniforms: cu, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}', fragmentShader: CLOUD_FS })); cl.position.y = -420; grp.add(cl);
  // 巨大デッキ
  const D = mat('hull', { color: 0x3a4a50, rough: 0.6, metal: 0.6 }), GD = mat('flat', { color: 0xd4a84a, rough: 0.25, metal: 1 }), P = mat('hex', { color: 0xd8c090, rough: 0.3, metal: 0.6, uvs: 0.12, floor: 1 }), Wt = mat('wall', { color: 0x2c4a50, rough: 0.5, metal: 0.5 }), GL = new THREE.MeshStandardMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.3, emissive: 0xffb050, emissiveIntensity: 0.5, side: THREE.DoubleSide }); GL.userData.uvs = 0;
  B.cyl(P, R, R, 0.3, 0, -0.15, 0, 'y', 72); B.cyl(D, R + 2, R * 0.55, 34, 0, -17.4, 0, 'y', 72); B.cyl(D, R * 0.5, 8, 90, 0, -79, 0, 'y', 32); B.tor(GD, R + 1, 0.8, 0, 0.2, 0, HP, 0, 0, 96, 8); B.tor(glow('#ffd27a', 3), R - 0.5, 0.15, 0, 0.12, 0, HP, 0, 0, 96, 5);
  for (let i = 0; i < 48; i++) { const a = i * Math.PI / 24; B.cyl(GD, 0.12, 0.12, 1.3, Math.cos(a) * (R - 1.5), 0.65, Math.sin(a) * (R - 1.5), 'y', 6); }
  B.tor(GD, R - 1.5, 0.08, 0, 1.3, 0, HP, 0, 0, 96, 5);
  pad(B, 0.1, 34, '#ffd27a');
  // ラウンジ棟 (ガラスドーム)
  B.cyl(Wt, 26, 28, 9, 86, 4.5, 0, 'y', 40); B.add(GL, new THREE.SphereGeometry(26, 40, 16, 0, 6.2832, 0, HP), mx(86, 9, 0), 0); B.tor(GD, 26.2, 0.5, 86, 9, 0, HP, 0, 0, 64, 8);
  for (let i = 0; i < 10; i++) B.add(GD, new THREE.TorusGeometry(26.1, 0.2, 6, 24, Math.PI), mx(86, 9, 0, 0, i * Math.PI / 10, 0), 0);
  B.box(D, 1.2, 4.4, 3.4, 59.4, 2.2, 0); B.box(glow('#ffd27a', 3), 0.2, 0.3, 3.6, 59.3, 4.6, 0); cols.push({ x: 86, z: 0, r: 28.5 }); items.push({ x: 57.5, z: 0, r: 5, label: 'スカイラウンジに入る', act: 'outpost' });
  // 採取マスト & 気球
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.52, x = Math.cos(a) * 118, z = Math.sin(a) * 118; if (x > 60) continue; B.cyl(D, 1.2, 2, 70, x, 35, z, 'y', 10); B.sph(GD, 7, x, 74, z, 1, 1.25, 1, 20); B.tor(glow('#ffd27a', 3), 7.2, 0.15, x, 74, z, HP, 0, 0, 32, 5); B.cyl(D, 2.6, 2.6, 6, x, 3, z, 'y', 12); cols.push({ x, z, r: 3 }); beacon(beacons, x, 84, z, '#f33', 12, 0.6); }
  const bal = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe8c890, roughness: 0.4, metalness: 0.5 }), 26), o3 = new THREE.Object3D(), bp = [];
  for (let i = 0; i < 26; i++) bp.push([rr(r, -1, 1) * 1800, rr(r, -120, 380), rr(r, -1, 1) * 1800, rr(r, 14, 46), r() * 6]);
  bal.frustumCulled = false; grp.add(bal);
  anim.push((dt, t) => { bp.forEach(([x, y, z, s, ph], i) => { if (Math.hypot(x, z) < 320) x += 500; o3.position.set(x + Math.sin(t * 0.05 + ph) * 40, y + Math.sin(t * 0.2 + ph) * 8, z); o3.scale.set(s, s * 1.2, s); o3.updateMatrix(); bal.setMatrixAt(i, o3.matrix); }); bal.instanceMatrix.needsUpdate = true; });
  const s1 = signMesh('クラウドデッキ', '#ffd27a', 2.8, { double: true, intensity: 2.6 }); s1.position.set(59.2, 7.4, 0); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 6; i++) { const a = i * 1.047, x = Math.cos(a) * 128 - (Math.cos(a) > 0.4 ? 40 : 0), z = Math.sin(a) * 128, n = node('#b58cff', 0.9, 120 + i); n.position.set(x, 0, z); grp.add(n); nodes.push({ g: n, x, z, item: 'gas', label: '希ガス凝縮体を採取する' }); }
  grp.add(B.build());
  return { id: 'zephyr', group: grp, sky, H, sunDir, sunCol: '#ffd8a8', sunInt: 3.6, hemi: ['#8aa0e0', '#c88a5a', 1.2], fog: [COL('#dc9a6a'), 0.00012], cols, rects, items, anim, beacons, nodes, padY: 0.2, rain: [V3(22, 2, 6), 0.25, '#ffe8c8'], walkR: R - 2.5, door: [56, 0, -HP], foot: [0, 42], look: [0.55, 1.05, 1.0], mirror: [P, 0.9], music: 'surface', floor: -420 };
}

const ENV = { terra, ignis, sahar, glacies, zephyr };
export function buildSurface(id) { const e = ENV[id](); e.name = BASES[id].name; e.sub = BASES[id].sub; return e; }
