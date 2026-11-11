// レンダラ / HDR ポストプロセス / 平面反射
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ACES } from './glsl.js';
import { setAniso } from './textures.js';
import { clamp } from '../core/util.js';

/** 内部レンダリング解像度 (縦ピクセル数)。0 = 端末の最大解像度 */
export const RES = { 540: '540p', 720: '720p', 1080: '1080p', 0: '最大' };
/** 描画距離の倍率 */
export const DIST = { near: ['近い', 0.6], mid: ['標準', 1], far: ['遠い', 1.6] };
export const QUALITY = {
  low: { label: 'ロー', cap: 1, msaa: 0, sky: 512, pNear: 512, pFar: 256, shadow: 0, mirror: 0, bloom: 0.5 },
  medium: { label: 'ミドル', cap: 1.5, msaa: 0, sky: 1024, pNear: 1024, pFar: 256, shadow: 1024, mirror: 0.4, bloom: 0.5 },
  high: { label: 'ハイ', cap: 2, msaa: 4, sky: 1024, pNear: 1024, pFar: 512, shadow: 2048, mirror: 0.5, bloom: 0.5 },
  ultra: { label: 'ウルトラ', cap: 3, msaa: 4, sky: 2048, pNear: 2048, pFar: 512, shadow: 4096, mirror: 0.75, bloom: 0.5 },
};

const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uCA: { value: 0.0007 }, uVig: { value: 0.36 }, uGrain: { value: 0.022 }, uFade: { value: 1 }, uFlash: { value: 0 },
    uRays: { value: 1 }, uSharp: { value: 0.3 }, uFlare: { value: 1 }, uPx: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
    uSun: { value: new THREE.Vector3() }, uAspect: { value: 1.78 }, uExposure: { value: 1 }, uHeat: { value: 0 }, uWarp: { value: 0 }, uDamage: { value: 0 }, uSat: { value: 1.04 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
  },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: /* glsl */`
precision highp float;
uniform sampler2D tDiffuse;uniform float uTime,uCA,uVig,uGrain,uFade,uFlash,uAspect,uExposure,uHeat,uWarp,uDamage,uSat,uRays,uSharp,uFlare;uniform vec3 uSun,uTint;uniform vec2 uPx;varying vec2 vUv;
${ACES}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 flare(vec2 uv,vec2 sp){
  vec2 d=uv-sp;float r=length(d);vec3 c=vec3(0.);
  c+=vec3(.3,.5,1.)*exp(-abs(d.y)*60.)*exp(-abs(d.x)*1.6)*.4;
  float a=atan(d.y,d.x);c+=vec3(1.,.9,.75)*(pow(abs(sin(a*3.+.4)),50.)+pow(abs(sin(a*2.-.9)),90.)*.6)*exp(-r*3.2)*.3;
  c+=vec3(.45,.65,1.)*smoothstep(.035,0.,abs(r-.46))*.035*smoothstep(1.6,.2,length(sp));
  for(int i=0;i<6;i++){float k=float(i);vec2 gp=-sp*(.3+k*.3);float sz=.03+.035*fract(k*.37+.2)+k*.014;float g=smoothstep(sz,sz*.6,length(uv-gp));
    vec3 gc=.5+.5*cos(6.2832*(k*.19+vec3(0.,.33,.67)));c+=gc*g*.03;}
  return c;}
void main(){
  vec2 uv=vUv;vec2 c=uv-.5;float r2=dot(c,c);
  uv-=c*r2*uWarp*.3;
  uv+=uHeat*.0035*vec2(sin(uv.y*90.+uTime*30.),cos(uv.x*70.+uTime*26.));
  vec2 off=c*(uCA+uWarp*.014+uDamage*.004)*(.3+r2*4.);
  vec3 col=vec3(texture2D(tDiffuse,uv+off).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-off).b);
  if(uSharp>0.){vec3 bl=(texture2D(tDiffuse,uv+vec2(uPx.x,0.)).rgb+texture2D(tDiffuse,uv-vec2(uPx.x,0.)).rgb+texture2D(tDiffuse,uv+vec2(0.,uPx.y)).rgb+texture2D(tDiffuse,uv-vec2(0.,uPx.y)).rgb)*.25;col=max(col+clamp(col-bl,-.4,.4)*uSharp,0.);}
  float sOcc=1.;if(uSun.z>.001){vec2 s0=uSun.xy*.5+.5;sOcc=0.;for(int i=0;i<5;i++){vec2 o=vec2(float(i==1)-float(i==2),float(i==3)-float(i==4))*uPx*4.;sOcc+=smoothstep(1.,3.,dot(texture2D(tDiffuse,clamp(s0+o,0.,1.)).rgb,vec3(.333)));}sOcc*=.2;} // 太陽が建物などに隠れていれば光条を出さない
  if(uSun.z>.001&&uRays>0.){vec2 sp=uSun.xy*.5+.5,dl=uv-sp;float jit=hash(vUv*913.+fract(uTime)*7.3),w=1.,ws=0.;vec3 acc=vec3(0.);
    for(int i=0;i<14;i++){vec3 sm=texture2D(tDiffuse,uv-dl*((float(i)+jit)/14.)*.94).rgb;acc+=min(max(sm-1.5,0.),vec3(10.))*w;ws+=w;w*=.93;}
    col+=acc/ws*uRays*.2*uSun.z*(.25+.75*sOcc);}
  if(uSun.z>.001&&uFlare>0.){vec2 sp2=uSun.xy*.5+.5;float occ=0.;for(int i=0;i<5;i++){vec2 o=vec2(float(i==1)-float(i==2),float(i==3)-float(i==4))*uPx*3.;occ+=smoothstep(1.2,4.,dot(texture2D(tDiffuse,clamp(sp2+o,0.,1.)).rgb,vec3(.333)));}
    vec2 a=vec2(uAspect,1.);col+=flare(c*2.*a,uSun.xy*a)*uSun.z*uFlare*occ*.2;}
  col+=uHeat*vec3(1.,.33,.07)*pow(r2*2.6,1.2)*1.6;
  col+=uWarp*vec3(.25,.45,1.)*pow(r2*2.4,1.6)*.5;
  col=aces(col*uExposure);
  col=pow(col,vec3(1./2.2));
  float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,uSat)*uTint;
  col*=1.-uVig*pow(r2*2.,1.3);
  col+=(hash(vUv*vec2(1733.,977.)+fract(uTime)*91.7)-.5)*uGrain;
  col=mix(col,vec3(.85,.06,.04),uDamage*smoothstep(.12,.5,r2)*.55);
  col=mix(col*uFade,vec3(1.),uFlash);
  gl_FragColor=vec4(col,1.);
}`,
};

export class Gfx {
  constructor(canvas) {
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }));
    r.toneMapping = THREE.NoToneMapping; r.autoClear = false; r.info.autoReset = false;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    setAniso(Math.min(16, r.capabilities.getMaxAnisotropy()));
    this.pmrem = new THREE.PMREMGenerator(r);
    this.W = 1; this.H = 1; this.res = 540; this.fx = FINAL.uniforms; this.time = 0;
    this.setQuality('high', true);
  }
  setQuality(name, init) {
    this.qName = name; this.q = QUALITY[name] || QUALITY.high;
    this.renderer.shadowMap.enabled = this.q.shadow > 0; FINAL.uniforms.uRays.value = this.q.cap > 1 ? 1 : 0; FINAL.uniforms.uSharp.value = this.q.cap > 1 ? 0.3 : 0;
    this._build();
    if (!init) this.resize(this.W, this.H);
  }
  _build() {
    if (this.composer) { this.composer.dispose(); this.bloom.dispose(); }
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: this.q.msaa, depthBuffer: true });
    const c = (this.composer = new EffectComposer(this.renderer, rt));
    const dummyS = new THREE.Scene(), dummyC = new THREE.PerspectiveCamera();
    this.pFar = new RenderPass(dummyS, dummyC); this.pNear = new RenderPass(dummyS, dummyC);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.72, 1.0);
    this.final = new ShaderPass(FINAL); this.final.uniforms = FINAL.uniforms; this.final.material.uniforms = FINAL.uniforms;
    c.addPass(this.pFar); c.addPass(this.pNear); c.addPass(this.bloom); c.addPass(this.final);
    if (this._look) this.look(...this._look);
  }
  resize(W, H) {
    this.W = W; this.H = H;
    const dpr = window.devicePixelRatio || 1, pr = this.res ? Math.min(this.res / H, dpr) : Math.min(dpr, 3); // 解像度は固定 (自動変更なし)
    this.pr = pr;
    this.renderer.setPixelRatio(pr); this.renderer.setSize(W, H, false);
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
    this.pw = Math.round(W * pr); this.ph = Math.round(H * pr);
    this.composer.setPixelRatio(1); this.composer.setSize(this.pw, this.ph);
    this.fx.uAspect.value = W / H; this.fx.uPx.value.set(1 / this.pw, 1 / this.ph);
    this.pxScale = this.ph / 1080;
  }
  setRes(r) { this.res = r; this.resize(this.W, this.H); }
  /** モードごとの画作り: ブルーム強度・しきい値・露出 */
  look(strength = 0.62, threshold = 1.0, exposure = 1) { this.bloom.strength = strength; this.bloom.threshold = threshold; this.fx.uExposure.value = exposure; this._look = [strength, threshold, exposure]; }
  envFromScene(scene, blur = 0.02) { return this.pmrem.fromScene(scene, blur, 0.1, 1000).texture; }
  render(dt, scene, camera, far) {
    this.time += dt; this.fx.uTime.value = this.time % 1000;
    this.renderer.info.reset();
    if (far) { this.pFar.enabled = true; this.pFar.scene = far.scene; this.pFar.camera = far.camera; this.pFar.clear = true; this.pNear.clear = false; this.pNear.clearDepth = true; }
    else { this.pFar.enabled = false; this.pNear.clear = true; this.pNear.clearDepth = false; }
    this.pNear.scene = scene; this.pNear.camera = camera;
    this.composer.render(dt);
  }
}

// ───────────────────────── 平面反射 (濡れた路面・磨かれた床) ─────────────────────────
const _pl = new THREE.Plane(), _cl = new THREE.Vector4(), _qv = new THREE.Vector4();
const _n = new THREE.Vector3(0, 1, 0), _cp = new THREE.Vector3(), _look = new THREE.Vector3(), _view = new THREE.Vector3(), _tgt = new THREE.Vector3(), _rot = new THREE.Matrix4(), _pp = new THREE.Vector3();
export class Mirror {
  constructor(gfx, y = 0) {
    this.gfx = gfx; this.y = y; this.cam = new THREE.PerspectiveCamera();
    this.matrix = new THREE.Matrix4(); this.rt = null; this.enabled = gfx.q.mirror > 0;
    this.u = { tMirror: { value: null }, uMirrorMat: { value: this.matrix }, uMirrorOn: { value: 0 } };
    this.hide = [];
  }
  _ensure() {
    const s = this.gfx.q.mirror, w = Math.max(64, Math.round(this.gfx.pw * s)), h = Math.max(64, Math.round(this.gfx.ph * s));
    if (this.rt && this.rt.width === w && this.rt.height === h) return;
    this.rt?.dispose();
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  }
  render(scene, camera) {
    this.enabled = this.gfx.q.mirror > 0;
    this.u.uMirrorOn.value = this.enabled ? 1 : 0;
    if (!this.enabled) return;
    _cp.setFromMatrixPosition(camera.matrixWorld);
    if (_cp.y <= this.y + 0.01) { this.u.uMirrorOn.value = 0; return; }
    this._ensure();
    _pp.set(_cp.x, this.y, _cp.z);
    _view.subVectors(_pp, _cp).reflect(_n).negate().add(_pp);
    _rot.extractRotation(camera.matrixWorld);
    _look.set(0, 0, -1).applyMatrix4(_rot).add(_cp);
    _tgt.subVectors(_pp, _look).reflect(_n).negate().add(_pp);
    const v = this.cam; v.position.copy(_view); v.up.set(0, 1, 0).applyMatrix4(_rot).reflect(_n); v.lookAt(_tgt);
    v.near = camera.near; v.far = camera.far; v.updateMatrixWorld(); v.projectionMatrix.copy(camera.projectionMatrix); v.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    this.matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(v.projectionMatrix).multiply(v.matrixWorldInverse);
    // 斜めの近クリップ面: 鏡面より下 (路面の下の護岸・桟橋・地形) を反射に写さない
    _pl.setFromNormalAndCoplanarPoint(_n, _pp).applyMatrix4(v.matrixWorldInverse); _cl.set(_pl.normal.x, _pl.normal.y, _pl.normal.z, _pl.constant);
    { const e = v.projectionMatrix.elements; _qv.set((Math.sign(_cl.x) + e[8]) / e[0], (Math.sign(_cl.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]); _cl.multiplyScalar(2 / _cl.dot(_qv)); e[2] = _cl.x; e[6] = _cl.y; e[10] = _cl.z + 1 - 0.003; e[14] = _cl.w; v.projectionMatrixInverse.copy(v.projectionMatrix).invert(); }
    const r = this.gfx.renderer, prev = r.getRenderTarget(), sh = r.shadowMap.autoUpdate;
    for (const o of this.hide) o.visible = false;
    this.u.uMirrorOn.value = 0; this.u.tMirror.value = null; r.shadowMap.autoUpdate = false; // 自己参照 (フィードバックループ) を避ける
    r.setRenderTarget(this.rt); r.clear(); r.render(scene, v);
    r.setRenderTarget(prev); r.shadowMap.autoUpdate = sh;
    this.u.uMirrorOn.value = 1; this.u.tMirror.value = this.rt.texture;
    for (const o of this.hide) o.visible = true;
  }
  /** MeshStandardMaterial に反射サンプリングを注入 */
  apply(material, strength = 1) {
    const u = this.u, prev = material.onBeforeCompile, pk = material.customProgramCacheKey?.() || '';
    material.onBeforeCompile = (sh, r) => {
      prev?.call(material, sh, r);
      sh.uniforms.tMirror = u.tMirror; sh.uniforms.uMirrorMat = u.uMirrorMat; sh.uniforms.uMirrorOn = u.uMirrorOn; sh.uniforms.uMirrorK = { value: strength };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uMirrorMat;varying vec4 vMirror;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMirror=uMirrorMat*(modelMatrix*vec4(transformed,1.));');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tMirror;uniform float uMirrorOn,uMirrorK;varying vec4 vMirror;')
        .replace('#include <opaque_fragment>', `
        if(uMirrorOn>.5){
          vec2 muv=vMirror.xy/vMirror.w+normal.xz*.035;
          float fr=pow(1.-saturate(dot(normal,normalize(vViewPosition))),3.);
          float gl=saturate(1.-roughnessFactor*1.15);
          vec3 rf=min(textureLod(tMirror,muv,roughnessFactor*7.).rgb,vec3(3.5)); // 太陽などの映り込みが白飛びしないよう上限
          outgoingLight+=rf*uMirrorK*gl*mix(.22,1.,fr);
        }
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => pk + 'mirror' + strength;
    material.needsUpdate = true;
    return material;
  }
  dispose() { this.rt?.dispose(); }
}
