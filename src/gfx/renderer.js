// レンダラ / HDR ポストプロセス / 平面反射
import * as THREE from 'three';
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
  low: { label: 'ロー', cap: 1, aa: false, sky: 512, pNear: 512, pFar: 256, shadow: 0, mirror: 0, bloom: 0.25 },
  medium: { label: 'ミドル', cap: 1.5, aa: false, sky: 1024, pNear: 1024, pFar: 256, shadow: 1024, mirror: 0.4, bloom: 0.5 },
  high: { label: 'ハイ', cap: 2, aa: true, sky: 1024, pNear: 1024, pFar: 512, shadow: 2048, mirror: 0.5, bloom: 0.5 },
  ultra: { label: 'ウルトラ', cap: 3, aa: true, sky: 2048, pNear: 2048, pFar: 512, shadow: 4096, mirror: 0.75, bloom: 0.5 },
};

const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uCA: { value: 0.0007 }, uVig: { value: 0.36 }, uGrain: { value: 0.022 }, uFade: { value: 1 }, uFlash: { value: 0 },
    uRays: { value: 1 }, uSharp: { value: 0.3 }, uFlare: { value: 1 }, uAA: { value: 1 }, uPx: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
    uSun: { value: new THREE.Vector3() }, uAspect: { value: 1.78 }, uExposure: { value: 1 }, uHeat: { value: 0 }, uWarp: { value: 0 }, uDamage: { value: 0 }, uSat: { value: 1.04 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
  },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: /* glsl */`
precision highp float;
uniform sampler2D tDiffuse;uniform float uTime,uCA,uVig,uGrain,uFade,uFlash,uAspect,uExposure,uHeat,uWarp,uDamage,uSat,uRays,uSharp,uFlare,uAA;uniform vec3 uSun,uTint;uniform vec2 uPx;varying vec2 vUv;
${ACES}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 sceneRGB(vec2 uv){
  vec3 rgb=texture2D(tDiffuse,uv).rgb;
  return any(isnan(rgb)) ? vec3(0.) : clamp(rgb,0.,64.);
}
float luma(vec3 rgb){return dot(rgb,vec3(.299,.587,.114));}
vec3 fxaa(vec2 uv,vec3 center){
  float nw=luma(sceneRGB(uv+vec2(-1.,1.)*uPx)), ne=luma(sceneRGB(uv+uPx));
  float sw=luma(sceneRGB(uv-uPx)), se=luma(sceneRGB(uv+vec2(1.,-1.)*uPx));
  float mid=luma(center), lo=min(mid,min(min(nw,ne),min(sw,se))), hi=max(mid,max(max(nw,ne),max(sw,se)));
  if(hi-lo<max(.025,hi*.125))return center;
  vec2 dir=vec2(sw+se-nw-ne,nw+sw-ne-se);
  float reduce=max((nw+ne+sw+se)*.03125,.0078125);
  dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),-8.,8.)*uPx;
  vec3 a=.5*(sceneRGB(uv-dir/6.)+sceneRGB(uv+dir/6.));
  vec3 b=a*.5+.25*(sceneRGB(uv-dir*.5)+sceneRGB(uv+dir*.5));
  float lb=luma(b);return lb<lo||lb>hi?a:b;
}
vec3 flare(vec2 uv,vec2 sp){
  vec2 d=uv-sp;float r=length(d);vec3 c=vec3(0.);
  c+=vec3(.3,.5,1.)*exp(-abs(d.y)*60.)*exp(-abs(d.x)*1.6)*.4;
  float a=atan(d.y,abs(d.x)>1.e-6?d.x:1.e-6);c+=vec3(1.,.9,.75)*(pow(abs(sin(a*3.+.4)),50.)+pow(abs(sin(a*2.-.9)),90.)*.6)*exp(-r*3.2)*.3;
  c+=vec3(.45,.65,1.)*(1.-smoothstep(0.,.035,abs(r-.46)))*.035*(1.-smoothstep(.2,1.6,length(sp)));
  for(int i=0;i<6;i++){float k=float(i);vec2 gp=-sp*(.3+k*.3);float sz=.03+.035*fract(k*.37+.2)+k*.014;float g=1.-smoothstep(sz*.6,sz,length(uv-gp));
    vec3 gc=.5+.5*cos(6.2832*(k*.19+vec3(0.,.33,.67)));c+=gc*g*.03;}
  return c;}
void main(){
  vec2 uv=vUv;vec2 c=uv-.5;float r2=dot(c,c);
  uv-=c*r2*uWarp*.3;
  uv+=uHeat*.0035*vec2(sin(uv.y*90.+uTime*30.),cos(uv.x*70.+uTime*26.));
  vec2 off=c*(uCA+uWarp*.014+uDamage*.004)*(.3+r2*4.);
  vec3 center=sceneRGB(uv);
  vec3 col=vec3(sceneRGB(uv+off).r,center.g,sceneRGB(uv-off).b);
  if(uAA>.5)col=max(vec3(0.),col+fxaa(uv,center)-center);
  if(uSharp>0.){vec3 bl=(sceneRGB(uv+vec2(uPx.x,0.))+sceneRGB(uv-vec2(uPx.x,0.))+sceneRGB(uv+vec2(0.,uPx.y))+sceneRGB(uv-vec2(0.,uPx.y)))*.25;col=max(col+clamp(col-bl,-.4,.4)*uSharp,0.);}
  float sOcc=1.;if(uSun.z>.001){vec2 s0=uSun.xy*.5+.5;sOcc=0.;for(int i=0;i<5;i++){vec2 o=vec2(float(i==1)-float(i==2),float(i==3)-float(i==4))*uPx*4.;sOcc+=smoothstep(1.,3.,dot(sceneRGB(s0+o),vec3(.333)));}sOcc*=.2;} // 太陽が建物などに隠れていれば光条を出さない
  if(uSun.z>.001&&uRays>0.){vec2 sp=uSun.xy*.5+.5,dl=uv-sp;float jit=hash(vUv*913.+fract(uTime)*7.3),w=1.,ws=0.;vec3 acc=vec3(0.);
    for(int i=0;i<14;i++){vec3 sm=sceneRGB(uv-dl*((float(i)+jit)/14.)*.94);acc+=min(max(sm-1.5,0.),vec3(10.))*w;ws+=w;w*=.93;}
    col+=acc/ws*uRays*.2*uSun.z*(.25+.75*sOcc);}
  if(uSun.z>.001&&uFlare>0.){vec2 sp2=uSun.xy*.5+.5;float occ=0.;for(int i=0;i<5;i++){vec2 o=vec2(float(i==1)-float(i==2),float(i==3)-float(i==4))*uPx*3.;occ+=smoothstep(1.2,4.,dot(sceneRGB(sp2+o),vec3(.333)));}
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
    // 浮動小数点ターゲットで MSAA を解決する経路を使わず、最後に FXAA をかける。
    // HDR に描けない端末も、同じ順序で 8 bit ターゲットへ描画する。
    const gl = r.getContext();
    const [maxW, maxH] = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const maxTarget = Math.min(r.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    this.maxWidth = Math.min(maxW, maxTarget); this.maxHeight = Math.min(maxH, maxTarget);
    let rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    let hdr = false;
    if (r.extensions.has('EXT_color_buffer_float') || r.extensions.has('EXT_color_buffer_half_float')) {
      r.setRenderTarget(rt);
      hdr = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      r.setRenderTarget(null);
    }
    if (!hdr) { rt.dispose(); rt = new THREE.WebGLRenderTarget(4, 4); }
    this.target = rt;
    this.pmrem = hdr ? new THREE.PMREMGenerator(r) : null;
    this.bloom = hdr ? new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.72, 1.0) : null;
    this.fx = THREE.UniformsUtils.clone(FINAL.uniforms);
    this.final = new ShaderPass(new THREE.ShaderMaterial({ ...FINAL, uniforms: this.fx, depthTest: false, depthWrite: false }));
    this.final.renderToScreen = true;
    this.W = 1; this.H = 1; this.res = 540; this.time = 0;
    this.setQuality('high', true);
  }
  setQuality(name, init) {
    this.qName = name; this.q = QUALITY[name] || QUALITY.high;
    this.renderer.shadowMap.enabled = this.q.shadow > 0;
    this.fx.uRays.value = this.bloom && this.q.cap > 1 ? 1 : 0;
    this.fx.uSharp.value = this.q.cap > 1 ? (this.q.aa ? 0.15 : 0.3) : 0;
    this.fx.uAA.value = this.q.aa ? 1 : 0;
    if (!init) this.resize(this.W, this.H);
  }
  resize(W, H) {
    if (W <= 0 || H <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const requested = this.res ? Math.min(this.res / H, dpr) : Math.min(dpr, 3);
    const pr = Math.min(Math.max(1 / Math.min(W, H), requested), this.maxWidth / W, this.maxHeight / H);
    if (W !== this.W || H !== this.H || pr !== this.pr) this.renderer.setDrawingBufferSize(W, H, pr);
    this.W = W; this.H = H; this.pr = pr;
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
    this.pw = this.canvas.width; this.ph = this.canvas.height;
    this.target.setSize(this.pw, this.ph);
    const bk = this.q.bloom * 2;
    this.bloom?.setSize(Math.max(16, Math.round(this.pw * bk)), Math.max(16, Math.round(this.ph * bk)));
    this.fx.uAspect.value = W / H; this.fx.uPx.value.set(1 / this.pw, 1 / this.ph);
    this.pxScale = this.ph / 1080;
  }
  setRes(r) { this.res = r; this.resize(this.W, this.H); }
  /** モードごとの画作り: ブルーム強度・しきい値・露出 */
  look(strength = 0.62, threshold = 1.0, exposure = 1) {
    if (this.bloom) { this.bloom.strength = strength; this.bloom.threshold = threshold; }
    this.fx.uExposure.value = exposure;
  }
  envFromScene(scene, blur = 0.02) { return this.pmrem?.fromScene(scene, blur, 0.1, 1000).texture ?? null; }
  render(dt, scene, camera, far) {
    this.time += dt; this.fx.uTime.value = this.time % 1000;
    const r = this.renderer, rt = this.target;
    r.info.reset();
    r.setRenderTarget(rt);
    r.clear(true, true, false);
    if (far) { r.render(far.scene, far.camera); r.clearDepth(); }
    r.render(scene, camera);
    this.bloom?.render(r, null, rt);
    this.final.render(r, null, rt);
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
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: this.gfx.target.texture.type, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
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
    const e = v.projectionMatrix.elements;
    _qv.set((Math.sign(_cl.x) + e[8]) / e[0], (Math.sign(_cl.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    const clip = _cl.dot(_qv);
    if (!Number.isFinite(clip) || clip < 1e-4) { this.u.uMirrorOn.value = 0; return; }
    _cl.multiplyScalar(2 / clip); e[2] = _cl.x; e[6] = _cl.y; e[10] = _cl.z + 1 - 0.003; e[14] = _cl.w;
    v.projectionMatrixInverse.copy(v.projectionMatrix).invert();
    const r = this.gfx.renderer, prev = r.getRenderTarget(), face = r.getActiveCubeFace(), mip = r.getActiveMipmapLevel(), sh = r.shadowMap.autoUpdate;
    const showing = this.hide.filter((o) => o.visible);
    for (const o of showing) o.visible = false;
    this.u.uMirrorOn.value = 0; this.u.tMirror.value = null; r.shadowMap.autoUpdate = false; // 自己参照 (フィードバックループ) を避ける
    try {
      r.setRenderTarget(this.rt); r.clear(true, true, false); r.render(scene, v);
    } finally {
      r.setRenderTarget(prev, face, mip); r.shadowMap.autoUpdate = sh;
      for (const o of showing) o.visible = true;
    }
    this.u.uMirrorOn.value = 1; this.u.tMirror.value = this.rt.texture;
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
        if(uMirrorOn>.5&&vMirror.w>1.e-4){
          vec2 muv=vMirror.xy/vMirror.w+normal.xz*.035;
          float edge=min(min(muv.x,muv.y),1.-max(muv.x,muv.y));
          if(edge>0.){
            float fr=pow(1.-saturate(dot(normal,normalize(vViewPosition))),3.);
            float gl=saturate(1.-roughnessFactor*1.15);
            vec3 rf=textureLod(tMirror,muv,roughnessFactor*7.).rgb;
            rf=any(isnan(rf))?vec3(0.):clamp(rf,0.,3.5);
            outgoingLight+=rf*uMirrorK*gl*mix(.22,1.,fr)*smoothstep(0.,.025,edge);
          }
        }
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => pk + 'mirror' + strength;
    material.needsUpdate = true;
    return material;
  }
  dispose() { this.rt?.dispose(); }
}
