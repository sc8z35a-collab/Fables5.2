// 遠景 (星空・太陽・惑星・大気・リング)。1/SCALE の縮尺で別シーンに描く
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { NOISE, FACE, FSQ_VS } from './glsl.js';
import { rng } from '../core/util.js';

export const SCALE = 1000;

// ───────────────────────── ベイク用シェーダ ─────────────────────────
const BAKE_FS = /* glsl */`
precision highp float;
uniform int uFace,uType,uPass; uniform float uSeed; varying vec2 vUv;
${NOISE}
${FACE}
vec3 warp(vec3 p,float f,float a){return p+a*(vec3(fbm(p*f+1.3,4),fbm(p*f+5.7,4),fbm(p*f+9.1,4))-.5);}
// ── 地球 ──
float hE(vec3 p){vec3 q=warp(p,1.6,.5);float c=fbm(q*1.15+uSeed,8);float h=(c-.52)*2.4;float m=ridged(q*4.5+3.,6);h+=m*.3*smoothstep(-.02,.22,h);return h;}
vec4 albE(vec3 p){
  float h=hE(p),lat=abs(p.y),n1=fbm(p*6.+11.,5),n2=fbm(p*22.+3.,4);
  if(h<0.){float d=-h;vec3 c=mix(vec3(.02,.2,.3),vec3(.004,.028,.1),smoothstep(0.,.28,d));
    c=mix(c,vec3(.05,.34,.38),smoothstep(.035,0.,d)*.8);
    float ice=smoothstep(.80,.88,lat+(n1-.5)*.14);c=mix(c,vec3(.85,.9,.95),ice);return vec4(c,1.-ice*.7);}
  float temp=1.-lat*1.15-h*.55+(n1-.5)*.25;
  float moist=fbm(p*3.2+27.,5)+(1.-abs(lat-.05)*2.)*.15;
  moist-=smoothstep(.15,.3,lat)*smoothstep(.52,.34,lat)*.3;
  vec3 desert=mix(vec3(.72,.58,.36),vec3(.55,.36,.2),n2);
  vec3 grass=mix(vec3(.2,.32,.1),vec3(.34,.38,.16),n2);
  vec3 forest=mix(vec3(.03,.13,.04),vec3(.07,.2,.06),n2);
  vec3 c=mix(desert,grass,smoothstep(.36,.5,moist));c=mix(c,forest,smoothstep(.5,.66,moist));
  c=mix(c,vec3(.36,.33,.26),smoothstep(.42,.25,temp));
  c=mix(c,mix(vec3(.3,.25,.2),vec3(.44,.38,.32),n2),smoothstep(.3,.52,h));
  c=mix(c,vec3(.92,.94,.97),clamp(smoothstep(.2,.08,temp)+smoothstep(.55,.7,h),0.,1.));
  c=mix(c,vec3(.75,.68,.5),smoothstep(.015,0.,h)*.6);
  return vec4(c,0.);}
float emE(vec3 p){float h=hE(p);if(h<.002)return 0.;float lat=abs(p.y);
  float pop=smoothstep(.5,.7,fbm(p*5.+61.,5))*smoothstep(.3,.02,h)*smoothstep(.85,.6,lat);
  pop+=smoothstep(.06,0.,h)*.4*smoothstep(.45,.6,fbm(p*9.+3.,4));
  float sp=pow(vnoise(p*260.),2.)*1.6+pow(vnoise(p*90.+7.),3.)*1.5;
  return clamp(pop*sp,0.,1.);}
float clE(vec3 p){vec3 q=warp(p+uSeed,2.2,.5);q=warp(q,7.,.12);float c=fbm(q*3.2,8);float lat=abs(p.y);
  float cov=.47-.07*cos(lat*9.);float d=smoothstep(cov,cov+.26,c);d*=.6+.8*fbm(q*14.,4);return clamp(d,0.,1.);}
// ── 溶岩 ──
float baseL(vec3 p){return fbm(p*2.3+uSeed,8);}
float hL(vec3 p){float c=baseL(p);vec2 w=worley2(p*6.+(c-.5)*2.);return c*.7+smoothstep(0.,.14,w.y-w.x)*.25+ridged(p*7.,5)*.15;}
vec4 albL(vec3 p){float c=baseL(p),n=fbm(p*18.,5);vec3 col=mix(vec3(.03,.026,.026),vec3(.15,.11,.09),c*n*2.);col=mix(col,vec3(.28,.09,.04),smoothstep(.6,.8,c)*.5);return vec4(col,.15);}
float emL(vec3 p){float c=baseL(p);vec2 w=worley2(p*6.+(c-.5)*2.);float cr=1.-smoothstep(0.,.1,w.y-w.x);
  float pools=smoothstep(.4,.3,c);float e=cr*cr*(.35+.65*smoothstep(.58,.36,c))+pools*(.45+.55*fbm(p*30.,4));
  vec2 w2=worley2(p*24.);e+=(1.-smoothstep(0.,.07,w2.y-w2.x))*.3*smoothstep(.62,.4,c);return clamp(e,0.,1.);}
// ── 氷 ──
float baseI(vec3 p){return fbm(p*2.6+uSeed,8);}
float hI(vec3 p){float c=baseI(p);vec2 w=worley2(p*8.+(c-.5)*3.);return c*.55+smoothstep(0.,.05,w.y-w.x)*.12+ridged(p*9.,5)*.18;}
vec4 albI(vec3 p){float c=baseI(p);vec2 w=worley2(p*8.+(c-.5)*3.);float cr=1.-smoothstep(0.,.05,w.y-w.x);float n=fbm(p*20.,5);
  vec3 col=mix(vec3(.6,.77,.9),vec3(.93,.96,1.),smoothstep(.3,.65,c+n*.2));col=mix(col,vec3(.2,.44,.68),cr*.8);
  col=mix(col,vec3(.3,.34,.4),smoothstep(.66,.8,c)*.6);float sea=smoothstep(.36,.3,c);col=mix(col,vec3(.04,.18,.33),sea*.85);
  return vec4(col,.25+sea*.6);}
// ── 砂漠 ──
float baseD(vec3 p){return fbm(p*1.9+uSeed,8);}
float canD(vec3 p){return smoothstep(.56,.72,fbm(p*3.3+50.,6));}
float hD(vec3 p){float c=baseD(p);float r=ridged(p*5.+c*2.,6);vec2 w=worley2(p*11.);float crater=smoothstep(.0,.3,w.x)*.12;return c*.6+r*.28-canD(p)*.3+crater;}
vec4 albD(vec3 p){float c=baseD(p),n=fbm(p*14.,5),can=canD(p),lat=abs(p.y);
  vec3 col=mix(vec3(.7,.4,.19),vec3(.86,.62,.36),smoothstep(.3,.7,c));col=mix(col,vec3(.42,.2,.12),smoothstep(.45,.75,n)*.5);
  col=mix(col,vec3(.3,.16,.12),can*.75);col=mix(col,vec3(.24,.2,.2),smoothstep(.68,.82,c)*.6);
  float cap=smoothstep(.86,.93,lat+(n-.5)*.1);col=mix(col,vec3(.95,.93,.9),cap);return vec4(col,cap*.2);}
// ── ガス巨星 ──
vec4 albG(vec3 p){
  vec3 w=p+.07*vec3(fbm(p*3.+uSeed,5)-.5,0.,fbm(p*3.+7.,5)-.5);
  float turb=fbm(vec3(w.x*2.,w.y*13.,w.z*2.)+uSeed,7);
  float y=w.y+(turb-.5)*.16;
  float bands=sin(y*26.)*.5+.5,b2=sin(y*61.+turb*4.)*.5+.5;
  vec3 c1=vec3(.2,.5,.66),c2=vec3(.09,.14,.42),c3=vec3(.82,.88,.92),c4=vec3(.46,.26,.62);
  vec3 col=mix(c1,c2,smoothstep(.2,.8,bands));col=mix(col,c4,smoothstep(.55,.95,b2)*.45);
  col=mix(col,c3,smoothstep(.56,.9,fbm(vec3(p.x*3.,p.y*22.,p.z*3.)+3.,6))*.65);
  vec3 sc=normalize(vec3(.55,-.32,.77));vec3 dd=(p-sc)*vec3(1.,2.3,1.);float sd=length(dd);
  float swirl=fbm(p*14.+vec3(atan(dd.z,dd.x)*2.,sd*20.,0.),5);
  col=mix(col,mix(vec3(.9,.86,.8),vec3(.6,.2,.5),swirl),smoothstep(.2,.04,sd)*.85);
  col*=.75+.5*fbm(p*40.,4);
  return vec4(col,0.);}
float height(vec3 p){if(uType==0)return max(hE(p),0.);if(uType==1)return hL(p);if(uType==2)return hI(p);if(uType==3)return hD(p);return 0.;}
void main(){
  vec3 p=normalize(faceDir(uFace,vUv*2.-1.));vec4 o=vec4(0.);
  if(uPass==0){
    if(uType==0)o=albE(p);else if(uType==1)o=albL(p);else if(uType==2)o=albI(p);else if(uType==3)o=albD(p);else o=albG(p);
    o.rgb=sqrt(clamp(o.rgb,0.,1.));
  }else if(uPass==1){
    vec3 n=p;
    if(uType!=4){float e=.0016;vec3 t1=normalize(cross(p,abs(p.y)>.99?vec3(1.,0.,0.):vec3(0.,1.,0.)));vec3 t2=cross(p,t1);
      float h0=height(p),h1=height(normalize(p+t1*e)),h2=height(normalize(p+t2*e));
      float k=uType==0?.035:.05;n=normalize(p-k*((h1-h0)/e*t1+(h2-h0)/e*t2));}
    float em=0.;if(uType==0)em=emE(p);else if(uType==1)em=emL(p);
    o=vec4(n*.5+.5,em);
  }else{
    float c=0.;
    if(uType==0)c=clE(p);
    else if(uType==1){vec3 q=warp(p+uSeed,2.,.5);c=smoothstep(.5,.78,fbm(q*2.6,7));}
    else if(uType==2){vec3 q=warp(p+uSeed,2.,.6);c=smoothstep(.5,.8,fbm(vec3(q.x*2.,q.y*6.,q.z*2.),7));}
    else if(uType==3){vec3 q=warp(p+uSeed,1.6,.6);c=smoothstep(.56,.86,fbm(q*2.2,7));}
    o=vec4(c);
  }
  gl_FragColor=o;
}`;

const SKY_FS = /* glsl */`
precision highp float;
uniform int uFace; varying vec2 vUv;
${NOISE}
${FACE}
void main(){
  vec3 d=normalize(faceDir(uFace,vUv*2.-1.));
  vec3 ax=normalize(vec3(.25,.9,.35));float b=dot(d,ax),band=exp(-b*b*9.);
  vec3 w=d*2.+.6*vec3(fbm(d*2.+3.,5),fbm(d*2.+11.,5),fbm(d*2.+19.,5));
  float n=fbm(w*1.6,7),dust=fbm(w*3.+40.,6);
  vec3 col=vec3(.55,.5,.68)*band*(.2+1.1*n)*.16;
  col+=vec3(1.,.8,.55)*pow(band,3.)*n*.05;
  col*=1.-smoothstep(.45,.68,dust)*band*.9;
  float n1=fbm(d*1.5+5.,6),n2=fbm(d*2.2+w*.3+13.,6);
  float m1=smoothstep(.52,.85,n1),m2=smoothstep(.5,.8,n2)*smoothstep(.4,.7,fbm(d*.9+21.,4));
  col+=vec3(.1,.22,.7)*pow(m1,1.6)*.42*(.4+ridged(w*2.,5));
  col+=vec3(.8,.14,.42)*pow(m2,1.8)*.4*(.3+n);
  col+=vec3(.08,.55,.5)*pow(smoothstep(.55,.9,fbm(d*1.8+31.,6)),2.)*.22;
  col+=vec3(.9,.45,.12)*pow(smoothstep(.6,.92,fbm(d*2.6+47.,6)),2.2)*.2*(1.-band);
  for(int l=0;l<3;l++){
    float sc=170.+float(l)*190.;vec3 p=d*sc,id=floor(p),h=hash33(id);
    float thr=mix(.9,.55,band*n)+float(l)*.02;
    if(h.x>thr){vec3 sp=id+.2+.6*hash33(id+3.1);float dist=length(p-sp);
      float br=pow(hash13(id+7.7),10.)*3.+.06;
      vec3 sc2=mix(vec3(.6,.75,1.),vec3(1.,.72,.45),hash13(id+1.9));sc2=mix(sc2,vec3(1.),.45);
      col+=sc2*br*smoothstep(.14,0.,dist)*(.5+band*.8);}
  }
  gl_FragColor=vec4(sqrt(clamp(col*.9,0.,1.)),1.);
}`;

// ───────────────────────── 実行時シェーダ ─────────────────────────
const PLANET_VS = /* glsl */`
varying vec3 vObj,vWorld;
void main(){vObj=position;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const PLANET_FS = /* glsl */`
precision highp float;
uniform samplerCube tA,tB,tC;
uniform vec3 uSun,uSunObj,uAtmo,uCloudCol,uEmis;
uniform float uCloudAmt,uCloudRot,uSpec,uNightOnly,uAtmoK,uDetail,uGas;
uniform mat3 uRot;
varying vec3 vObj,vWorld;
${NOISE}
vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
vec3 bump(vec3 pos,vec3 N,float h,float sc){vec3 dx=dFdx(pos),dy=dFdy(pos);float hx=dFdx(h),hy=dFdy(h);vec3 r1=cross(dy,N),r2=cross(N,dx);float det=dot(dx,r1);
  vec3 gr=sign(det)*(hx*r1+hy*r2);return normalize(abs(det)*N-sc*gr);}
void main(){
  vec3 od=normalize(vObj);
  vec4 A=textureCube(tA,od),B=textureCube(tB,od);
  vec3 alb=A.rgb*A.rgb;
  vec3 Ng=normalize(uRot*od);
  vec3 N=normalize(uRot*normalize(B.xyz*2.-1.));
  float px=length(fwidth(od));
  float w1=smoothstep(.0009,.0003,px)*uDetail,w2=smoothstep(.00022,.00008,px)*uDetail,w3=smoothstep(.00006,.00002,px)*uDetail;
  float dk=w1;
  if(w1>.001){
    float n=(fbm(od*300.,3)-.5)*w1+(fbm(od*1200.,3)-.5)*w2*.6+(vnoise(od*5000.)-.5)*w3*.4;
    float land=1.-A.a*.85;
    alb*=1.+n*1.1*land;
    N=bump(vWorld,N,n*land,.08);
  }
  vec3 V=normalize(cameraPosition-vWorld);
  float gdl=dot(Ng,uSun),ndl=dot(N,uSun);
  float day=smoothstep(-.1,.2,gdl);
  float diff=max(ndl,0.)*smoothstep(-.06,.12,gdl);
  vec3 sunC=mix(mix(vec3(1.),vec3(1.,.42,.18),uAtmoK),vec3(1.),smoothstep(-.05,.4,gdl))*1.12;
  vec3 col=alb*diff*sunC+alb*.004;
  vec3 Hh=normalize(uSun+V);float nh=max(dot(normalize(mix(Ng,N,.35)),Hh),0.);
  col+=sunC*(pow(nh,320.)*1.5+pow(nh,40.)*.1)*A.a*uSpec*day;
  float c=0.;
  if(uCloudAmt>0.){
    vec3 cd=rotY(od,uCloudRot);c=textureCube(tC,cd).r;
    float cs=textureCube(tC,rotY(normalize(od+uSunObj*.014),uCloudRot)).r;
    col*=1.-cs*.6*uCloudAmt*day;
    float cl=max(gdl,0.)*(.5+.5*smoothstep(-.1,.5,c-cs+.25))+.015;
    c=clamp(c*uCloudAmt*(1.+dk*(fbm(cd*500.,3)-.5)*1.2),0.,1.);
    col=mix(col,uCloudCol*cl*sunC*1.05,c);
  }
  col+=uEmis*B.a*mix(1.,1.-day,uNightOnly)*(1.-c*.8);
  float fr=pow(1.-max(dot(Ng,V),0.),2.5);
  col=mix(col,uAtmo*(day+.015),fr*uAtmoK*.4);
  if(uGas>.5){float lim=pow(max(dot(Ng,V),0.),.45);col*=lim;}
  gl_FragColor=vec4(col,1.);
}`;
const ATMO_FS = /* glsl */`
precision highp float;
uniform vec3 uCenter,uSun,uCol,uSunset;uniform float uRp,uRa,uDens;
varying vec3 vWorld;
vec2 rsi(vec3 ro,vec3 rd,float r){float b=dot(ro,rd),c=dot(ro,ro)-r*r,h=b*b-c;if(h<0.)return vec2(1e9,-1e9);h=sqrt(h);return vec2(-b-h,-b+h);}
void main(){
  vec3 ro=cameraPosition-uCenter,rd=normalize(vWorld-cameraPosition);
  vec2 ta=rsi(ro,rd,uRa);if(ta.x>ta.y||ta.y<0.)discard;
  vec2 tp=rsi(ro,rd,uRp);
  float t0=max(ta.x,0.),t1=ta.y;if(tp.x<tp.y&&tp.x>0.)t1=tp.x;
  float H=uRa-uRp,dt=(t1-t0)/10.;vec3 acc=vec3(0.);float od=0.;
  for(int i=0;i<10;i++){
    vec3 p=ro+rd*(t0+(float(i)+.5)*dt);float r=length(p);float h=clamp((r-uRp)/H,0.,1.);
    float d=exp(-h*4.2)*(1.-h);
    float mu=dot(p/r,uSun);float lit=smoothstep(-.28,.22,mu);
    vec3 tint=mix(uSunset,uCol,smoothstep(-.12,.35,mu));
    acc+=d*lit*tint*dt;od+=d*dt;
  }
  float k=uDens/H;float mu=dot(rd,uSun);
  float phase=.55+.45*mu*mu+pow(max(mu,0.),10.)*1.4;
  vec3 col=vec3(1.3)*(1.-exp(-acc*k*phase*.8));
  float a=1.-exp(-od*k*.9);
  gl_FragColor=vec4(col,a*.5);
}`;
const RING_FS = /* glsl */`
precision highp float;
uniform vec3 uCenter,uSun,uTint;uniform float uRp,uIn,uOut;
varying vec3 vWorld,vObj;
float h1(float x){return fract(sin(x*127.1)*43758.5453);}
float n1(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h1(i),h1(i+1.),f);}
void main(){
  float r=length(vObj.xz);float t=(r-uIn)/(uOut-uIn);if(t<0.||t>1.)discard;
  float d=.5*n1(t*13.)+.28*n1(t*47.)+.16*n1(t*170.)+.12*n1(t*700.)+.06*n1(t*2900.);
  d*=1.-smoothstep(.022,.008,abs(t-.61))*.95;d*=1.-smoothstep(.012,.004,abs(t-.34))*.8;
  float a=smoothstep(0.,.03,t)*smoothstep(1.,.94,t)*clamp(d*1.7-.2,0.,1.);
  vec3 ro=cameraPosition-uCenter,rd=vWorld-cameraPosition;float L=length(rd);rd/=L;
  float b=dot(ro,rd),cc=dot(ro,ro)-uRp*uRp,h=b*b-cc;
  if(h>0.){float t0=-b-sqrt(h);if(t0>0.&&t0<L)discard;}
  vec3 pr=vWorld-uCenter;float bs=dot(pr,uSun);float ds=length(pr-uSun*bs);
  float sh=bs<0.?smoothstep(uRp*.985,uRp*1.02,ds):1.;
  vec3 col=mix(uTint*.7,vec3(1.,.96,.88),n1(t*29.+5.))*(.06+sh);
  col+=pow(max(dot(rd,uSun),0.),5.)*.6*sh;
  gl_FragColor=vec4(col*a,a);
}`;
const SUN_FS = /* glsl */`
precision highp float;
uniform float uTime;varying vec2 vUv;
${NOISE}
void main(){
  vec2 p=vUv*2.-1.;float r=length(p)*8.;float a=atan(p.y,p.x);
  float disc=smoothstep(1.015,.97,r);
  vec3 sp=vec3(p*8.,uTime*.02);
  float gran=fbm(sp*3.,5)*.5+fbm(sp*9.+3.,4)*.5;
  vec3 col=mix(vec3(1.,.55,.2),vec3(1.,.95,.8),smoothstep(.2,.8,gran))*disc*(30.+20.*gran)*(1.-.45*pow(r,3.)*disc);
  float co=max(r-1.,0.);
  float fl=fbm(vec3(cos(a)*2.5,sin(a)*2.5,uTime*.04)+co*.6,5);
  col+=vec3(1.,.62,.28)*exp(-co*2.4)*(1.-disc)*(2.+7.*fl);
  col+=vec3(1.,.8,.55)*(1.-disc)*.5/(1.+co*co*3.)*smoothstep(8.,2.,r);
  float fade=smoothstep(8.,5.,r);
  gl_FragColor=vec4(col*fade,1.);
}`;

// ───────────────────────── ベイカー ─────────────────────────
class CubeBaker {
  constructor(renderer) {
    this.r = renderer;
    this.pm = new THREE.ShaderMaterial({ vertexShader: FSQ_VS, fragmentShader: BAKE_FS, uniforms: { uFace: { value: 0 }, uType: { value: 0 }, uPass: { value: 0 }, uSeed: { value: 0 } }, depthTest: false, depthWrite: false });
    this.sm = new THREE.ShaderMaterial({ vertexShader: FSQ_VS, fragmentShader: SKY_FS, uniforms: { uFace: { value: 0 } }, depthTest: false, depthWrite: false });
    this.fsq = new FullScreenQuad(this.pm);
  }
  target(size) {
    const rt = new THREE.WebGLCubeRenderTarget(size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    rt.texture.anisotropy = 4;
    return rt;
  }
  face(rt, mat, f) {
    const prev = this.r.getRenderTarget();
    mat.uniforms.uFace.value = f; this.fsq.material = mat;
    this.r.setRenderTarget(rt, f); this.fsq.render(this.r); this.r.setRenderTarget(prev);
  }
  sky(size) { const rt = this.target(size); for (let f = 0; f < 6; f++) this.face(rt, this.sm, f); return rt; }
}

const TYPE = { earth: 0, lava: 1, ice: 2, desert: 3, gas: 4 };
const LOOK = {
  earth: { atmo: [0.28, 0.52, 1.0], sunset: [1.0, 0.42, 0.16], dens: 0.9, th: 0.036, cloud: [1, 1, 1], cloudAmt: 1, emis: [2.6, 1.9, 0.9], night: 1, spec: 1, k: 1 },
  lava: { atmo: [1.0, 0.32, 0.1], sunset: [1.0, 0.2, 0.05], dens: 0.55, th: 0.03, cloud: [0.1, 0.085, 0.085], cloudAmt: 0.75, emis: [5.0, 1.5, 0.22], night: 0, spec: 0.3, k: 0.7 },
  ice: { atmo: [0.4, 0.78, 1.0], sunset: [0.9, 0.5, 0.7], dens: 0.7, th: 0.032, cloud: [1, 1, 1], cloudAmt: 0.5, emis: [0, 0, 0], night: 0, spec: 0.8, k: 0.8 },
  desert: { atmo: [0.95, 0.6, 0.34], sunset: [0.35, 0.5, 1.0], dens: 0.5, th: 0.028, cloud: [0.9, 0.7, 0.5], cloudAmt: 0.55, emis: [0, 0, 0], night: 0, spec: 0.1, k: 0.6 },
  gas: { atmo: [0.4, 0.68, 0.98], sunset: [0.8, 0.4, 0.9], dens: 0.8, th: 0.022, cloud: [1, 1, 1], cloudAmt: 0, emis: [0, 0, 0], night: 0, spec: 0, k: 0.9 },
};
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion();

class Planet {
  constructor(def, baker) {
    this.def = def; this.baker = baker; this.look = LOOK[def.type]; this.res = 0; this.job = null;
    this.pos = new THREE.Vector3().fromArray(def.pos); this.R = def.R;
    this.group = new THREE.Group();
    const L = this.look, v3 = (a) => new THREE.Vector3().fromArray(a);
    this.u = {
      tA: { value: null }, tB: { value: null }, tC: { value: null }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uSunObj: { value: new THREE.Vector3(1, 0, 0) },
      uAtmo: { value: v3(L.atmo) }, uCloudCol: { value: v3(L.cloud) }, uEmis: { value: v3(L.emis) }, uCloudAmt: { value: L.cloudAmt }, uCloudRot: { value: 0 },
      uSpec: { value: L.spec }, uNightOnly: { value: L.night }, uAtmoK: { value: L.k }, uDetail: { value: 1 }, uGas: { value: def.type === 'gas' ? 1 : 0 }, uRot: { value: new THREE.Matrix3() },
    };
    const off = { depthTest: false, depthWrite: false };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 96), new THREE.ShaderMaterial({ vertexShader: PLANET_VS, fragmentShader: PLANET_FS, uniforms: this.u, ...off, transparent: true, blending: THREE.NoBlending }));
    this.mesh.frustumCulled = false; this.group.add(this.mesh);
    this.au = { uCenter: { value: new THREE.Vector3() }, uSun: this.u.uSun, uCol: { value: v3(L.atmo) }, uSunset: { value: v3(L.sunset) }, uRp: { value: 1 }, uRa: { value: 1 }, uDens: { value: L.dens } };
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(1 + L.th, 96, 48), new THREE.ShaderMaterial({
      vertexShader: PLANET_VS, fragmentShader: ATMO_FS, uniforms: this.au, side: THREE.BackSide, transparent: true, ...off,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    this.atmo.frustumCulled = false; this.group.add(this.atmo);
    if (def.ring) {
      this.ru = { uCenter: this.au.uCenter, uSun: this.u.uSun, uTint: { value: new THREE.Vector3(0.95, 0.78, 0.5) }, uRp: this.au.uRp, uIn: { value: def.ring[0] }, uOut: { value: def.ring[1] } };
      const rg = new THREE.RingGeometry(def.ring[0], def.ring[1], 256, 1); rg.rotateX(-Math.PI / 2);
      this.ring = new THREE.Mesh(rg, new THREE.ShaderMaterial({ vertexShader: PLANET_VS, fragmentShader: RING_FS, uniforms: this.ru, side: THREE.DoubleSide, transparent: true, ...off, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
      this.ring.frustumCulled = false; this.ring.rotation.set(def.tilt ?? 0.2, 0, 0.08);
      this.group.add(this.ring);
    }
    this.spin = def.spin ?? 0.004;
  }
  /** 解像度 res で再ベイクを予約 (1 フレーム 1 面ずつ処理) */
  request(res) {
    if (res === this.res || (this.job && this.job.res === res)) return;
    const n = this.look.cloudAmt > 0 ? 3 : 2;
    if (this.job) this.job.rts.forEach((r) => r.dispose());
    this.job = { res, rts: Array.from({ length: n }, (_, i) => this.baker.target(i === 2 ? Math.max(256, res / 2) : res)), step: 0, n };
  }
  /** ベイクを 1 ステップ進める。作業したら true */
  tick(all = false) {
    const j = this.job; if (!j) return false;
    const pm = this.baker.pm;
    do {
      const pass = Math.floor(j.step / 6), f = j.step % 6;
      pm.uniforms.uType.value = TYPE[this.def.type]; pm.uniforms.uPass.value = pass; pm.uniforms.uSeed.value = this.def.seed ?? 0;
      this.baker.face(j.rts[pass], pm, f); j.step++;
    } while (all && j.step < j.n * 6);
    if (j.step >= j.n * 6) {
      if (this.rts) this.rts.forEach((r) => r.dispose());
      this.rts = j.rts; this.u.tA.value = j.rts[0].texture; this.u.tB.value = j.rts[1].texture; this.u.tC.value = (j.rts[2] || j.rts[0]).texture;
      this.res = j.res; this.job = null;
    }
    return true;
  }
  update(cam, sunPos, time, order) {
    const s = 1 / SCALE, R = this.R * s, g = this.group;
    g.position.set((this.pos.x - cam.x) * s, (this.pos.y - cam.y) * s, (this.pos.z - cam.z) * s);
    this.mesh.scale.setScalar(R); this.atmo.scale.setScalar(R);
    this.mesh.rotation.y = time * this.spin + (this.def.rot0 ?? 0);
    this.mesh.updateMatrixWorld(); _m4.extractRotation(this.mesh.matrixWorld); this.u.uRot.value.setFromMatrix4(_m4);
    const sun = this.u.uSun.value.copy(sunPos).sub(this.pos).normalize();
    _q.setFromRotationMatrix(_m4).invert(); this.u.uSunObj.value.copy(sun).applyQuaternion(_q);
    this.u.uCloudRot.value = time * this.spin * 0.6;
    this.au.uCenter.value.copy(g.position); this.au.uRp.value = R; this.au.uRa.value = R * (1 + this.look.th);
    this.mesh.renderOrder = order; this.atmo.renderOrder = order + 1;
    if (this.ring) { this.ring.scale.setScalar(s); this.ring.renderOrder = order + 2; }
    this.dist = _v.copy(this.pos).sub(cam).length();
  }
}

export class Backdrop {
  constructor(renderer, bodies, q) {
    this.r = renderer; this.q = q;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.5, 4e5);
    this.baker = new CubeBaker(renderer);
    this.time = 0;
    const off = { depthTest: false, depthWrite: false };
    // 星雲スカイボックス
    this.skyRT = this.baker.sky(q.sky);
    this.skyU = { tSky: { value: this.skyRT.texture }, uI: { value: 1 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2e5, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, ...off, transparent: true, blending: THREE.NoBlending,
      vertexShader: `varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform samplerCube tSky;uniform float uI;varying vec3 vD;void main(){vec3 c=textureCube(tSky,normalize(vD)).rgb;gl_FragColor=vec4(c*c*uI,1.);}`,
    }));
    this.sky.renderOrder = -100; this.sky.frustumCulled = false; this.scene.add(this.sky);
    // シャープな恒星 (点スプライト)
    const N = 7000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), siz = new Float32Array(N), rnd = rng(4242), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const u = rnd() * 2 - 1, a = rnd() * 6.2832, s = Math.sqrt(1 - u * u), m = Math.pow(rnd(), 5);
      pos.set([s * Math.cos(a) * 1.9e5, u * 1.9e5, s * Math.sin(a) * 1.9e5], i * 3);
      c.setHSL(rnd() < 0.6 ? 0.58 + rnd() * 0.08 : 0.04 + rnd() * 0.08, 0.5 * rnd() + 0.1, 0.72); const b = 0.5 + m * 9;
      col.set([c.r * b, c.g * b, c.b * b], i * 3); siz[i] = 1 + m * 2.6;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3)); sg.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    this.starU = { uPx: { value: 1 }, uStretch: { value: 0 } };
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.starU, transparent: true, blending: THREE.AdditiveBlending, ...off,
      vertexShader: `attribute float aSize;attribute vec3 color;uniform float uPx;varying vec3 vC;void main(){vC=color;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);gl_PointSize=aSize*uPx;}`,
      fragmentShader: `varying vec3 vC;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;gl_FragColor=vec4(vC*exp(-d*3.5),1.);}`,
    }));
    this.stars.renderOrder = -99; this.stars.frustumCulled = false; this.scene.add(this.stars);
    // 太陽
    const sd = bodies.find((b) => b.type === 'sun');
    this.sunPos = new THREE.Vector3().fromArray(sd.pos); this.sunR = sd.R;
    this.sunU = { uTime: { value: 0 } };
    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: this.sunU, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`, fragmentShader: SUN_FS, transparent: true, blending: THREE.AdditiveBlending, ...off }));
    this.sun.frustumCulled = false; this.scene.add(this.sun);
    this.planets = bodies.filter((b) => b.type !== 'sun').map((b) => new Planet(b, this.baker));
    for (const p of this.planets) { this.scene.add(p.group); p.request(q.pFar); }
    this.sunDir = new THREE.Vector3(1, 0, 0);
    this.sunScreen = new THREE.Vector3();
  }
  /** 初回ベイク。onStep で進捗通知 (同期・1 惑星ずつ) */
  bakeNext() { for (const p of this.planets) if (p.job) { p.tick(true); return true; } return false; }
  planet(id) { return this.planets.find((p) => p.def.id === id); }
  /** 環境マップ (PMREM) 用: 星空だけのシーン */
  envScene() { const s = new THREE.Scene(); const m = this.sky.clone(); m.scale.setScalar(2e-4); s.add(m); return s; }
  update(camPos, camQuat, fov, aspect, dt, pxScale) {
    this.time += dt;
    const c = this.camera; c.quaternion.copy(camQuat); c.fov = fov; c.aspect = aspect; c.updateProjectionMatrix(); c.position.set(0, 0, 0); c.updateMatrixWorld();
    this.starU.uPx.value = pxScale; this.sunU.uTime.value = this.time;
    const s = 1 / SCALE;
    this.sun.position.set((this.sunPos.x - camPos.x) * s, (this.sunPos.y - camPos.y) * s, (this.sunPos.z - camPos.z) * s);
    this.sun.scale.setScalar(this.sunR * s * 16); this.sun.quaternion.copy(camQuat);
    this.sunDir.copy(this.sunPos).sub(camPos).normalize();
    const sunDist = _v.copy(this.sunPos).sub(camPos).length();
    // 奥→手前の順に描画順を決める
    const list = [...this.planets]; let near = null;
    for (const p of list) { p.dist = _v.copy(p.pos).sub(camPos).length(); if (!near || p.dist - p.R < near.dist - near.R) near = p; }
    list.sort((a, b) => b.dist - a.dist);
    let order = 0, sunPlaced = false;
    for (const p of list) {
      if (!sunPlaced && sunDist > p.dist) { this.sun.renderOrder = order; order += 5; sunPlaced = true; }
      p.update(camPos, this.sunPos, this.time, order); order += 5;
    }
    if (!sunPlaced) this.sun.renderOrder = order;
    this.near = near; this.nearAlt = near.dist - near.R;
    // 近い惑星は高解像度に再ベイク
    for (const p of this.planets) p.request(p === near && this.nearAlt < p.R * 14 ? this.q.pNear : this.q.pFar);
    for (const p of this.planets) if (p.tick()) break;
    // 太陽の可視率 (惑星による食) とスクリーン座標
    let vis = 1;
    for (const p of this.planets) {
      _v.copy(p.pos).sub(camPos); const t = _v.dot(this.sunDir);
      if (t > 0 && t < sunDist) { const d = Math.sqrt(Math.max(_v.lengthSq() - t * t, 0)), ang = this.sunR / sunDist * t; vis = Math.min(vis, THREE.MathUtils.smoothstep(d, p.R - ang, p.R + ang)); } // 太陽より奥の惑星は食を起こさない
    }
    this.sunVis = vis;
    _v2.copy(this.sun.position).project(c);
    this.sunScreen.set(_v2.x, _v2.y, _v2.z < 1 && Math.abs(_v2.x) < 1.6 && Math.abs(_v2.y) < 1.6 ? vis : 0);
  }
  /** 視線が惑星に遮られるか (near シーンの物体のカリング用) */
  occluded(camPos, objPos, objR = 0) {
    for (const p of this.planets) {
      _v.copy(objPos).sub(camPos); const L = _v.length(); _v.multiplyScalar(1 / L);
      _v2.copy(p.pos).sub(camPos); const t = _v2.dot(_v);
      if (t > 0 && t < L) { const d2 = _v2.lengthSq() - t * t; if (d2 < (p.R - objR) * (p.R - objR) && p.R > objR) return true; }
    }
    return false;
  }
}
