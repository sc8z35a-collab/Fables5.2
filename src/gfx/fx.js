// 視覚エフェクト: 噴射炎 / パーティクル / レーザー / 爆発 / シールド / 流線
import * as THREE from 'three';
import { glowTex } from './textures.js';

export const fxTime = { value: 0 };
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

// ── エンジン噴射炎 ──
const PLUME_VS = 'varying vec2 vUv;varying float vF;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);vF=abs(dot(n,normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}';
const PLUME_FS = `uniform vec3 uCol;uniform float uPow,uTime;varying vec2 vUv;varying float vF;
void main(){float v=vUv.y;float fl=.82+.18*sin(uTime*53.+v*31.)*sin(uTime*37.+v*13.);
float a=pow(1.-v,1.7)*pow(vF,1.6)*fl;float dia=pow(.5+.5*sin(v*46.-uTime*24.),3.);
vec3 col=mix(vec3(1.),uCol,smoothstep(0.,.3,v))*(1.+dia*max(uPow-1.,0.)*1.5);
gl_FragColor=vec4(col*a*min(uPow,1.6)*6.,1.);}`;
export function makePlume(r, color, len) {
  const g = new THREE.CylinderGeometry(r * 0.12, r, len, 20, 1, true); g.translate(0, len / 2, 0); g.rotateX(Math.PI / 2);
  const m = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(color) }, uPow: { value: 0.5 }, uTime: fxTime }, vertexShader: PLUME_VS, fragmentShader: PLUME_FS, side: THREE.DoubleSide, ...ADD });
  const mesh = new THREE.Mesh(g, m); mesh.userData.plume = true;
  return mesh;
}
export function makeGlowSprite(color, size, intensity = 2.5) {
  const m = new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(color).multiplyScalar(intensity), ...ADD, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.setScalar(size);
  return s;
}

// ── パーティクル ──
export class Particles {
  constructor(max = 3000) {
    this.max = max; this.i = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.data = new Float32Array(max * 2);
    this.life = new Float32Array(max); this.ml = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', (this.aP = new THREE.BufferAttribute(this.pos, 3))); g.setAttribute('aColor', (this.aC = new THREE.BufferAttribute(this.col, 3))); g.setAttribute('aData', (this.aD = new THREE.BufferAttribute(this.data, 2)));
    this.aP.setUsage(THREE.DynamicDrawUsage); this.aD.setUsage(THREE.DynamicDrawUsage);
    this.u = { uScale: { value: 600 } };
    this.obj = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.u, ...ADD,
      vertexShader: 'attribute vec3 aColor;attribute vec2 aData;uniform float uScale;varying vec3 vC;varying float vL;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vL=aData.y;vC=aColor;gl_PointSize=min(aData.x*uScale/max(-mv.z,.2),300.);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec3 vC;varying float vL;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.||vL<=0.)discard;float a=exp(-d*2.6)*smoothstep(0.,.25,vL);vec3 c=mix(vec3(1.,.16,.02)*dot(vC,vec3(.4)),vC,smoothstep(0.,.55,vL));gl_FragColor=vec4(c*a,1.);}',
    }));
    this.obj.frustumCulled = false;
  }
  emit(x, y, z, vx, vy, vz, r, g, b, size, life, drag = 0.5, grav = 0) {
    const i = this.i; this.i = (i + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b; this.data[i * 2] = size; this.data[i * 2 + 1] = 1;
    this.life[i] = this.ml[i] = life; this.drag[i] = drag; this.grav[i] = grav; this.aC.needsUpdate = true;
  }
  burst(p, n, speed, color, size, life, v0, drag = 0.6, grav = 0) {
    const c = color;
    for (let k = 0; k < n; k++) {
      const u = Math.random() * 2 - 1, a = Math.random() * 6.2832, s = Math.sqrt(1 - u * u), sp = speed * (0.25 + Math.random() * 0.75);
      this.emit(p.x, p.y, p.z, s * Math.cos(a) * sp + (v0?.x ?? 0), u * sp + (v0?.y ?? 0), s * Math.sin(a) * sp + (v0?.z ?? 0), c.r, c.g, c.b, size * (0.5 + Math.random()), life * (0.5 + Math.random() * 0.5), drag, grav);
    }
  }
  update(dt, pxScale) {
    this.u.uScale.value = pxScale;
    const { pos, vel, life, ml, data, drag, grav } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) { data[i * 2 + 1] = 0; continue; }
      const k = Math.exp(-drag[i] * dt), j = i * 3;
      vel[j] *= k; vel[j + 1] = vel[j + 1] * k - grav[i] * dt; vel[j + 2] *= k;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      data[i * 2 + 1] = life[i] / ml[i];
    }
    this.aP.needsUpdate = true; this.aD.needsUpdate = true;
  }
  shift(d) { const p = this.pos; for (let i = 0; i < this.max; i++) { if (this.life[i] <= 0) continue; p[i * 3] -= d.x; p[i * 3 + 1] -= d.y; p[i * 3 + 2] -= d.z; } }
  clear() { this.life.fill(0); for (let i = 0; i < this.max; i++) this.data[i * 2 + 1] = 0; this.aD.needsUpdate = true; }
}

// ── レーザーボルト ──
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
export class Bolts {
  constructor(max = 320) {
    this.max = max; this.list = [];
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1); g.rotateX(Math.PI / 2);
    this.obj = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ ...ADD, toneMapped: false }), max);
    this.obj.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.obj.frustumCulled = false; this.obj.count = 0;
    this.obj.setColorAt(0, _c.set(1, 1, 1));
  }
  fire(pos, dir, speed, color, dmg, owner, life = 2.4, len = 16, w = 0.28, baseVel) {
    if (this.list.length >= this.max) return null;
    const b = { p: pos.clone(), v: dir.clone().multiplyScalar(speed), d: dir.clone(), color, dmg, owner, life, len, w };
    if (baseVel) b.v.add(baseVel);
    this.list.push(b);
    return b;
  }
  /** hit(prevPos, bolt) が true を返すと消滅 */
  update(dt, hit) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const b = L[i]; _p.copy(b.p);
      b.p.addScaledVector(b.v, dt); b.life -= dt;
      if (b.life <= 0 || (hit && hit(_p, b))) { L[i] = L[L.length - 1]; L.pop(); }
    }
    const n = (this.obj.count = L.length);
    for (let i = 0; i < n; i++) {
      const b = L[i]; _q.setFromUnitVectors(_z, b.d); _s.set(b.w, b.w, b.len);
      _m.compose(b.p, _q, _s); this.obj.setMatrixAt(i, _m); this.obj.setColorAt(i, b.color);
    }
    this.obj.instanceMatrix.needsUpdate = true; if (this.obj.instanceColor) this.obj.instanceColor.needsUpdate = true;
  }
  shift(d) { for (const b of this.list) b.p.sub(d); }
  clear() { this.list.length = 0; this.obj.count = 0; }
}

// ── 衝撃波リング & 閃光 ──
export class Shocks {
  constructor(n = 10) {
    this.obj = new THREE.Group(); this.items = [];
    const g = new THREE.PlaneGeometry(2, 2);
    for (let i = 0; i < n; i++) {
      const u = { uT: { value: 1 }, uCol: { value: new THREE.Color() }, uKind: { value: 0 } };
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, ...ADD, side: THREE.DoubleSide, vertexShader: 'varying vec2 vUv;void main(){vUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'uniform float uT,uKind;uniform vec3 uCol;varying vec2 vUv;void main(){float r=length(vUv);float ring=smoothstep(.12,0.,abs(r-.85))*(1.-uT);float fl=exp(-r*r*5.)*pow(1.-uT,3.);gl_FragColor=vec4(uCol*mix(ring*2.,fl*14.,uKind),1.);}' }));
      m.visible = false; m.frustumCulled = false; this.obj.add(m); this.items.push({ m, u, t: 1, dur: 1, size: 1, grow: 1 });
    }
    this.k = 0;
  }
  spawn(pos, color, size, dur, kind = 0) {
    const it = this.items[this.k]; this.k = (this.k + 1) % this.items.length;
    it.m.position.copy(pos); it.u.uCol.value.set(color); it.u.uKind.value = kind; it.t = 0; it.dur = dur; it.size = size; it.m.visible = true;
  }
  update(dt, camQuat) {
    for (const it of this.items) {
      if (!it.m.visible) continue;
      it.t += dt / it.dur; if (it.t >= 1) { it.m.visible = false; continue; }
      it.u.uT.value = it.t; it.m.quaternion.copy(camQuat);
      it.m.scale.setScalar(it.size * (it.u.uKind.value > 0.5 ? 1 : 0.15 + 0.85 * Math.pow(it.t, 0.5)));
    }
  }
  shift(d) { for (const it of this.items) it.m.position.sub(d); }
}

// ── シールド被弾 ──
export class ShieldFX {
  constructor(n = 6) {
    this.obj = new THREE.Group(); this.items = [];
    const g = new THREE.SphereGeometry(1, 32, 20);
    for (let i = 0; i < n; i++) {
      const u = { uT: { value: 1 }, uCol: { value: new THREE.Color('#4cf') }, uHit: { value: new THREE.Vector3(0, 0, 1) }, uTime: fxTime };
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, ...ADD, vertexShader: 'varying vec3 vN,vV,vO;void main(){vO=normalize(position);vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
        fragmentShader: `uniform float uT,uTime;uniform vec3 uCol,uHit;varying vec3 vN,vV,vO;
        void main(){float fr=pow(1.-abs(dot(vN,vV)),2.5);float d=acos(clamp(dot(vO,uHit),-1.,1.));float rip=smoothstep(.25,0.,abs(d-uT*2.4))+exp(-d*d*6.)*(1.-uT);
        float hexa=.6+.4*sin(vO.x*40.+uTime*3.)*sin(vO.y*40.)*sin(vO.z*40.);gl_FragColor=vec4(uCol*(fr*.5+rip*1.6)*hexa*(1.-uT)*2.5,1.);}` }));
      m.visible = false; this.obj.add(m); this.items.push({ m, u, t: 1, target: null });
    }
    this.k = 0;
  }
  hit(target, radius, worldHitDir, color = '#4cf') {
    const it = this.items[this.k]; this.k = (this.k + 1) % this.items.length;
    it.target = target; it.t = 0; it.m.visible = true; it.m.scale.setScalar(radius); it.u.uCol.value.set(color); it.u.uHit.value.copy(worldHitDir).normalize();
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.m.visible) continue;
      it.t += dt * 1.8; if (it.t >= 1 || !it.target) { it.m.visible = false; continue; }
      it.u.uT.value = it.t; it.m.position.copy(it.target.position);
    }
  }
}

// ── 宇宙塵の流線 (速度感 / ワープ) ──
export class Streaks {
  constructor(n = 700, box = 600) {
    this.box = box; const pos = new Float32Array(n * 6), end = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const x = Math.random() * box, y = Math.random() * box, z = Math.random() * box; pos.set([x, y, z, x, y, z], i * 6); end[i * 2] = 0; end[i * 2 + 1] = 1; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.u = { uOff: { value: new THREE.Vector3() }, uStreak: { value: new THREE.Vector3() }, uBox: { value: box }, uCol: { value: new THREE.Color(0.6, 0.75, 1) }, uA: { value: 1 } };
    this.obj = new THREE.LineSegments(g, new THREE.ShaderMaterial({ uniforms: this.u, ...ADD,
      vertexShader: 'attribute float aEnd;uniform vec3 uOff,uStreak;uniform float uBox;varying float vA;void main(){vec3 p=mod(position-uOff,uBox)-uBox*.5;float fade=smoothstep(uBox*.5,uBox*.25,length(p))*smoothstep(2.,12.,length(p));p+=uStreak*aEnd;vA=fade*(1.-aEnd*.85);gl_Position=projectionMatrix*viewMatrix*vec4(p+cameraPosition,1.);}',
      fragmentShader: 'uniform vec3 uCol;uniform float uA;varying float vA;void main(){gl_FragColor=vec4(uCol*vA*uA,1.);}' }));
    this.obj.frustumCulled = false; this.off = new THREE.Vector3();
  }
  /** vel: カメラの世界速度 (m/s), streakLen: 流線の長さ係数 */
  update(dt, vel, streakK = 0.03, alpha = 1, maxLen = 60) {
    const b = this.box, o = this.off;
    o.addScaledVector(vel, dt); o.x = ((o.x % b) + b) % b; o.y = ((o.y % b) + b) % b; o.z = ((o.z % b) + b) % b;
    this.u.uOff.value.copy(o);
    const s = this.u.uStreak.value.copy(vel).multiplyScalar(streakK); const l = s.length(); if (l > maxLen) s.multiplyScalar(maxLen / l);
    this.u.uA.value = alpha;
  }
}
