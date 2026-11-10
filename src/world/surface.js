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
attribute vec3 aSize;attribute float aSeed;varying vec3 vL,vN,vW;flat varying vec3 vS;flat varying float vSeed;
void main(){vL=position*aSize;vS=aSize;vSeed=aSeed;vN=normal;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
// ファサード: 窓の奥に部屋が見える「インテリアマッピング」+ 1 階店舗 + 屋上設備
const CITY_FS = /* glsl */`
precision highp float;
uniform vec3 uFogCol,uAmb,uSunDir,uSunCol,uSkyA,uSkyB;uniform float uFogDen,uTime;
varying vec3 vL,vN,vW;flat varying vec3 vS;flat varying float vSeed;
float h1(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}
vec3 sky(vec3 d){return mix(uSkyB,uSkyA,clamp(d.y*1.6+.1,0.,1.))+uSunCol*pow(max(dot(d,uSunDir),0.),10.)*.35;}
void main(){
  vec3 n=normalize(vN),V=normalize(vW-cameraPosition);float dist=length(vW-cameraPosition);
  float mat=h1(vec2(vSeed,1.));
  vec3 base=mix(vec3(.05,.055,.07),vec3(.16,.15,.15),mat);base=mix(base,vec3(.09,.11,.14),step(.7,h1(vec2(vSeed,2.))));
  vec3 neon=.5+.5*cos(6.2832*(h1(vec2(vSeed,9.))+vec3(0.,.33,.67)));neon=mix(neon,vec3(1.,.2,.8),.3);
  float ndl=max(dot(n,uSunDir),0.);vec3 lightC=uAmb*1.5+uSunCol*ndl*.55;vec3 col;
  if(vS.x<5.){ // マスト・尖塔
    col=vec3(.05,.055,.06)*lightC*3.+vec3(1.,.12,.05)*smoothstep(vS.y-3.,vS.y-.5,vL.y)*(step(.5,fract(uTime*.7+vSeed))*5.+.5);
  }else if(n.y>.5){ // 屋上
    vec2 q=vL.xz;float rim=max(abs(q.x)/(vS.x*.5),abs(q.y)/(vS.z*.5));
    col=base*lightC*(.7+.3*vn(q*.6));
    vec2 uc=floor(q/5.);float unit=step(.72,h1(uc+vSeed))*step(abs(fract(q.x/5.)-.5),.36)*step(abs(fract(q.y/5.)-.5),.36);col=mix(col,vec3(.02,.022,.026)+uAmb*.4,unit);
    col+=vec3(1.,.2,.1)*step(.93,h1(uc+vSeed+4.))*smoothstep(.2,0.,length(fract(q/5.)-.5))*3.;
    col=mix(col,base*lightC*1.5,smoothstep(.93,.95,rim));col+=neon*smoothstep(.955,.975,rim)*step(.5,h1(vec2(vSeed,11.)))*2.2;
  }else if(n.y<-.5){col=vec3(.01);}
  else{
    bool xf=abs(n.x)>.5;vec2 uv=xf?vec2(vL.z,vL.y):vec2(vL.x,vL.y);vec3 tg=xf?vec3(0.,0.,1.):vec3(1.,0.,0.);
    float style=h1(vec2(vSeed,7.)),ground=step(vL.y,4.6);
    vec2 cs=mix(vec2(3.2+style*1.2,3.6),vec2(6.4,4.6),ground);
    vec2 cell=floor(uv/cs),f=fract(uv/cs);
    // 枠 (方立・腰壁) とガラス
    float mx=mix(.07,.03,ground),sill=mix(style>.6?.1:.26,.1,ground),hd=mix(.06,.14,ground);
    float glass=smoothstep(mx,mx+.02,f.x)*smoothstep(1.-mx,1.-mx-.02,f.x)*smoothstep(sill,sill+.015,f.y)*smoothstep(1.-hd,1.-hd-.015,f.y);
    // 室内 (レイと箱の交差)
    float D=mix(5.,9.,ground);vec3 rd=vec3(dot(V,tg),V.y,-dot(V,n));rd.z=max(rd.z,.001);
    vec3 ro=vec3(f*cs,0.),tA=(vec3(cs,D)*step(0.,rd)-ro)/rd;float tH=min(min(tA.x,tA.y),tA.z);vec3 hp=ro+rd*tH;
    float rr=h1(cell+vSeed*13.);vec3 wall=mix(vec3(.62,.58,.5),vec3(.5,.58,.66),h1(cell*1.3+vSeed));vec3 room;
    if(tH==tA.z){room=wall*.85;float fu=step(hp.y,cs.y*(.25+.2*h1(cell+5.)))*step(.15,fract(hp.x/cs.x*2.+rr));room=mix(room,wall*.25,fu);
      if(ground>.5){vec2 sh=vec2(hp.x*1.9,hp.y*2.1),si=floor(sh),sf=fract(sh);float shelf=step(sf.y,.12);vec3 prod=.35+.45*cos(6.2832*(h1(si+vSeed)+vec3(0.,.33,.67)));room=mix(wall*.7,prod,step(.12,sf.y)*step(sf.y,.12+.6*h1(si+3.))*step(.08,sf.x)*step(sf.x,.92)*step(.25,h1(si+7.)));room=mix(room,wall*.3,shelf);}
      room=mix(room,vec3(.9,.95,1.)*1.6,step(.8,h1(cell+9.))*step(abs(hp.x/cs.x-.5),.25)*step(abs(hp.y/cs.y-.55),.16));}
    else if(tH==tA.y){room=rd.y>0.?wall*1.1+vec3(1.4)*step(abs(fract(hp.z/2.2)-.5),.12)*step(abs(hp.x/cs.x-.5),.3):wall*.38;}
    else room=wall*.6;
    room*=mix(1.,.5,hp.z/D);
    float lit=step(mix(.56+.3*h1(vec2(vSeed,3.)),.12,ground),rr);
    vec3 lc=mix(vec3(1.,.72,.42),vec3(.62,.82,1.),step(.62,h1(cell*1.7+vSeed)));lc=mix(lc,vec3(1.,.25,.7),step(.95,h1(cell*2.3+vSeed*5.)));
    lc=mix(lc,mix(vec3(1.,.92,.8),.6+.4*cos(6.2832*(h1(cell+vSeed)+vec3(0.,.33,.67))),.3),ground);
    float inten=mix(.25+1.1*pow(h1(cell+3.+vSeed),2.),.75+.5*h1(cell+3.),ground);
    vec3 interior=room*lc*inten*lit+room*.012*(1.-lit);
    float blind=step(.72,h1(cell+7.+vSeed))*(1.-ground)*step(1.-(.3+.6*h1(cell+8.)),f.y);interior=mix(interior,lc*inten*lit*.28*(.8+.2*step(.5,fract(f.y*18.))),blind);
    float fres=.04+.96*pow(1.-max(dot(-V,n),0.),5.);vec3 gcol=interior*(1.-fres)+sky(reflect(V,n))*fres*.9;
    // 枠の質感
    vec3 frame=base*lightC*(.75+.25*vn(uv*vec2(.7,3.)))*(.6+.4*smoothstep(0.,.06,min(f.y,1.-f.y)));
    frame=mix(frame,frame*.55,ground*(1.-glass));
    col=mix(frame,gcol,glass);
    // 1 階の看板帯・庇
    float band=ground*step(.86,f.y);col=mix(col,(.5+.5*cos(6.2832*(h1(vec2(cell.x,vSeed))+vec3(0.,.33,.67))))*(1.6+1.2*step(.5,h1(vec2(cell.x+2.,vSeed)))),band*step(.25,h1(vec2(cell.x,vSeed+3.))));
    // 遠景ではディテールを平均色へ
    float px=max(fwidth(uv.x)/cs.x,fwidth(uv.y)/cs.y),k=smoothstep(.5,.18,px);
    vec3 avg=frame*.5+mix(vec3(1.,.74,.5),vec3(.7,.8,1.),h1(vec2(vSeed,5.)))*(.05+.1*(1.-h1(vec2(vSeed,3.))))*(.5+h1(vec2(cell.y,vSeed))*mix(0.,1.,smoothstep(.9,.3,fwidth(uv.y)/cs.y)));col=mix(avg,col,k);
    // ネオンの縁取り
    float top=smoothstep(vS.y-2.2,vS.y-.7,vL.y);col+=neon*top*step(.5,h1(vec2(vSeed,11.)))*2.4;
    float edge=xf?abs(vL.z)/(vS.z*.5):abs(vL.x)/(vS.x*.5);col+=neon*smoothstep(.978,.992,edge)*step(.72,h1(vec2(vSeed,13.)))*2.;
    float bd=step(.8,h1(vec2(vSeed,17.)))*smoothstep(0.,.012,abs(fract(vL.y/41.)-.5)-.478)*step(5.,vL.y);col+=neon.zxy*bd*2.2;
    col+=vec3(1.,.7,.45)*.035*exp(-vL.y/9.); // 街路灯の照り返し
  }
  col=mix(col,uFogCol,1.-exp(-uFogDen*uFogDen*dist*dist));
  gl_FragColor=vec4(col,1.);
}`;
// 路面: 車線・横断歩道・歩道・水たまり・街灯の光だまりを手続き的に描く
const ROAD_A = /* glsl */`
vec2 rq=mod(vRw.xz+46.,92.)-46.,ra=abs(rq);float inX=step(33.,ra.x),inZ=step(33.,ra.y),dcx=46.-ra.x,dcz=46.-ra.y,onRoad=max(inX,inZ);
float plaza=smoothstep(214.,200.,length(vRw.xz)),rn=fbm2(vRw.xz*.55),pud=smoothstep(.5,.66,fbm2(vRw.xz*.043+3.))*max(onRoad,plaza);
float mk=inX*(1.-inZ)*(smoothstep(.17,.1,dcx)*step(.45,fract(vRw.z/7.))+smoothstep(.13,.07,abs(dcx-9.6))*.8)+inZ*(1.-inX)*(smoothstep(.17,.1,dcz)*step(.45,fract(vRw.x/7.))+smoothstep(.13,.07,abs(dcz-9.6))*.8);
mk+=inX*(1.-inZ)*step(27.5,ra.y)*step(ra.y,32.)*step(.5,fract(dcx/1.3))*step(dcx,9.8)+inZ*(1.-inX)*step(27.5,ra.x)*step(ra.x,32.)*step(.5,fract(dcz/1.3))*step(dcz,9.8);
mk=clamp(mk,0.,1.)*(1.-plaza)*(.5+.5*vn2(vRw.xz*2.7));
vec3 asph=diffuseColor.rgb*(.7+.6*rn)*mix(1.,.5,pud);
vec2 tl=fract(vRw.xz/2.4);float joint=1.-smoothstep(.0,.03,min(min(tl.x,1.-tl.x),min(tl.y,1.-tl.y)));
vec3 walk=diffuseColor.rgb*vec3(1.75,1.7,1.6)*(.8+.4*vn2(floor(vRw.xz/2.4)*1.7))*(1.-joint*.45);walk=mix(walk,walk*.5,smoothstep(1.2,0.,33.-max(ra.x,ra.y)));
float pr=length(vRw.xz);vec3 apron=diffuseColor.rgb*(.95+.4*rn)*mix(1.,.55,pud);apron=mix(apron,vec3(.85,.7,.2),smoothstep(.35,.2,abs(pr-60.))*.8);apron=mix(apron,vec3(.7),smoothstep(.2,.1,min(abs(fract(vRw.x/40.)-.5),abs(fract(vRw.z/40.)-.5))*40.)*.25*step(64.,pr));
diffuseColor.rgb=mix(mix(mix(walk,asph,onRoad),vec3(.78,.78,.72),mk*.9),apron,plaza);
vec2 l1=vec2(ra.x-34.6,mod(vRw.z,46.)-23.),l2=vec2(ra.y-34.6,mod(vRw.x,46.)-23.);float pool=(exp(-dot(l1,l1)/46.)+exp(-dot(l2,l2)/46.))*(1.-plaza);`;
const ROAD_R = /* glsl */`roughnessFactor=mix(mix(.92,roughnessFactor*.9+.25,max(onRoad,plaza)),.035,pud);roughnessFactor=mix(roughnessFactor,.55,mk*(1.-pud));`;
function roadPatch(m) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRw;').replace('#include <project_vertex>', '#include <project_vertex>\nvRw=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRw;\n' + N2).replace('#include <map_fragment>', '#include <map_fragment>\n' + ROAD_A)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + ROAD_R).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(1.,.72,.44)*pool*2.2;');
  };
  m.customProgramCacheKey = () => 'road';
}
function terra() {
  const r = rng(2077), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [];
  const sunDir = V3(-0.82, 0.13, 0.55).normalize(), fog = [COL('#1a1230'), 0.0005];
  const sky = makeSky({ sun: sunDir, zen: '#04061c', hor: '#7a2a52', ground: '#0a0612', sunCol: '#ff7a3a', cloudCol: '#c05a8a', cloud: 0.55, stars: 0.8, haze: 0.9, sunSize: 0.9993 });
  const H = (x, z) => { const d = Math.hypot(x, z), hills = smooth(1700, 3600, -z + Math.abs(x) * 0.25) * (fbm(x * 0.0009, z * 0.0009, 5, 3) * 420 + ridge(x * 0.002, z * 0.002, 4, 9) * 160); return hills * smooth(1500, 2400, d) - smooth(1500, 2300, z) * 14 - 0.4; };
  grp.add(terrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.004, z * 0.004, 3, 5); if (h < -1.5) { c[0] = 0.03; c[1] = 0.03; c[2] = 0.04; } else { c[0] = 0.05 + n * 0.04 + sl * 0.06; c[1] = 0.07 + n * 0.05; c[2] = 0.06 + n * 0.03; } }, { rough: 0.9 }));
  // 濡れた路面 (平面反射 + 手続き型マーキング)
  const road = mat('concrete', { color: 0x3a3c44, rough: 0.6, metal: 0.25, uvs: 0.08, floor: 1 }); roadPatch(road);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3400, 3400).rotateX(-HP), road); ground.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 420; }); ground.position.y = 0.02; ground.receiveShadow = true; grp.add(ground);
  const water = mat('water', { color: 0x0a1626, rough: 0.5, metal: 0.9, uvs: 0, env: 2.2 }), wm = new THREE.Mesh(new THREE.PlaneGeometry(12000, 6000).rotateX(-HP), water); wm.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 160; }); wm.position.set(0, -1.6, 4700); grp.add(wm);
  anim.push((dt, t) => { water.normalMap.offset.set(t * 0.004, t * 0.007); });
  // ビル群
  const cu = { uFogCol: { value: fog[0] }, uFogDen: { value: fog[1] }, uTime: fxTime, uAmb: { value: COL('#2a2440') }, uSunDir: { value: sunDir }, uSunCol: { value: COL('#ff7a3a') }, uSkyA: { value: COL('#0a0c2a') }, uSkyB: { value: COL('#6a2648') } };
  const bg = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), sizes = [], seeds = [], list = [], block = 92, lot = 58;
  for (let gx = -16; gx <= 16; gx++) for (let gz = -18; gz <= 14; gz++) {
    const cx = gx * block, cz = gz * block; if (Math.hypot(cx, cz) < 215 || cz > 1340 || Math.hypot(cx, cz + 150) > 1580 || r() < 0.05) continue;
    if (cx > 40 && cx < 130 && Math.abs(cz) < 60) continue;
    const cbd = Math.exp(-((cx - 150) ** 2 + (cz + 880) ** 2) / 420000) + 0.5 * Math.exp(-((cx + 560) ** 2 + (cz + 420) ** 2) / 160000), n = r() < 0.45 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const w = lot / n - (n > 1 ? 3 : 0), d = lot - rr(r, 0, 10), h = 24 + r() * 64 + cbd * (130 + r() * 290) + (r() < 0.05 ? 150 : 0), x = cx + (n > 1 ? (k - 0.5) * (w + 6) : 0);
      list.push([x, cz, w, h, d]); rects.push([x - w / 2, cz - d / 2, x + w / 2, cz + d / 2]);
      if (h > 140 && r() < 0.75) { const k2 = rr(r, 0.55, 0.7), h2 = h * rr(r, 1.16, 1.42); list.push([x, cz, w * k2, h2, d * k2]); if (r() < 0.6) list.push([x, cz, 2.2, h2 + rr(r, 30, 80), 2.2]); }
      else if (h > 70 && r() < 0.35) list.push([x + rr(r, -8, 8), cz + rr(r, -8, 8), 1.6, h + rr(r, 12, 34), 1.6]);
    }
  }
  const city = new THREE.InstancedMesh(bg, new THREE.ShaderMaterial({ uniforms: cu, vertexShader: CITY_VS, fragmentShader: CITY_FS }), list.length), o3 = new THREE.Object3D();
  list.forEach(([x, z, w, h, d], i) => { o3.position.set(x, 0, z); o3.scale.set(w, h, d); o3.updateMatrix(); city.setMatrixAt(i, o3.matrix); sizes.push(w, h, d); seeds.push(r() * 100); });
  bg.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(sizes), 3)); bg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1)); city.frustumCulled = false; grp.add(city);
  // 街灯 (柱 + 光点)
  const lp = []; for (let g = -9; g <= 9; g++) for (const s of [-34.6, 34.6]) for (let t = -805; t <= 820; t += 46) { const a = [g * block + s, t], b = [t, g * block + s]; for (const [x, z] of [a, b]) { if (Math.hypot(x, z) < 205 || Math.hypot(x, z) > 860) continue; const q = [((x + 46) % 92 + 92) % 92 - 46, ((z + 46) % 92 + 92) % 92 - 46]; if (Math.abs(q[0]) < 33 && Math.abs(q[1]) < 33) continue; lp.push(x, 8.2, z); } }
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.16, 8.2, 6).translate(0, 4.1, 0), mat('flat', { color: 0x30343c, rough: 0.6, metal: 0.7 }), lp.length / 3);
  for (let i = 0; i < lp.length / 3; i++) { o3.position.set(lp[i * 3], 0, lp[i * 3 + 2]); o3.scale.setScalar(1); o3.rotation.set(0, 0, 0); o3.updateMatrix(); pole.setMatrixAt(i, o3.matrix); } pole.frustumCulled = false; grp.add(pole);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lamps = new THREE.Points(lg, new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uS: { value: 900 } }, vertexShader: 'uniform float uS;varying float vF;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(uS/-mv.z,2.,90.);vF=exp(-mv.z*mv.z*-0.0+0.)*exp(-pow(length(mv.xyz)*.0005,2.)*1.);gl_Position=projectionMatrix*mv;}', fragmentShader: 'varying float vF;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;gl_FragColor=vec4(vec3(1.,.74,.46)*(exp(-d*7.)*5.+exp(-d*2.)*.5)*vF,1.);}' })); lamps.frustumCulled = false; grp.add(lamps);
  // ネオン看板 (縦書き)
  const words = ['ラ\nー\nメ\nン', '電\n脳', 'ホ\nテ\nル', '酒\n場', 'カ\nラ\nオ\nケ', '薬', '宇\n宙\n港', 'NOVA', 'CYBER', '寿\n司', '質', 'ネ\nオ\nン\nベ\nイ', 'ゲ\nー\nム', '夜\n市', 'BAR', '銀\n河\n銀\n行'], cs = ['#ff3df0', '#4df0ff', '#ffe14d', '#ff5a3a', '#6dffb0', '#b58cff'];
  const big = list.map((b, i) => [Math.hypot(b[0], b[1]), i]).filter(([, i]) => list[i][2] > 10).sort((a, b) => a[0] - b[0]).slice(0, 54);
  big.forEach(([, i], k) => {
    const [x, z, w, h, d] = list[i], txt = words[k % words.length], vert = txt.includes('\n'), hz = vert ? Math.min(h * 0.5, 22 + r() * 18) : 5 + r() * 4, s = signMesh(txt, cs[k % cs.length], hz, { double: true, intensity: 2.6, frame: r() < 0.5 });
    const fx = Math.abs(x) > Math.abs(z) ? -Math.sign(x) : 0, fz = fx ? 0 : -Math.sign(z || 1), y = Math.min(h - hz / 2 - 3, 9 + hz / 2 + r() * 20);
    s.position.set(x + fx * (w / 2 + 0.5) + (fx ? 0 : rr(r, -w / 3, w / 3)), y, z + fz * (d / 2 + 0.5) + (fz ? 0 : rr(r, -d / 3, d / 3))); s.rotation.y = fx ? fx * HP : fz > 0 ? 0 : Math.PI; grp.add(s);
    if (k % 4 === 0) anim.push((dt, t) => { s.material.color.setScalar(Math.sin(t * 11 + k) > 0.95 ? 0.8 : 2.6); });
  });
  // 巨大ホログラム & 光柱
  const hm = new THREE.LineBasicMaterial({ color: COL('#4df0ff').multiplyScalar(1.8), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const holo = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(70, 16, 120, 10, 2, 3)), hm); holo.position.set(150, 600, -880); grp.add(holo);
  const globe = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(60, 2)), new THREE.LineBasicMaterial({ color: COL('#ff3df0').multiplyScalar(1.8), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); globe.position.set(-560, 360, -420); grp.add(globe);
  anim.push((dt) => { holo.rotation.y += dt * 0.25; holo.rotation.x += dt * 0.1; globe.rotation.y -= dt * 0.3; });
  const beamM = (c) => new THREE.ShaderMaterial({ uniforms: { uCol: { value: COL(c) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, vertexShader: 'varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}', fragmentShader: 'uniform vec3 uCol;varying vec2 vUv;varying vec3 vN,vV;void main(){float a=pow(abs(dot(vN,vV)),1.5)*pow(1.-vUv.y,1.3);gl_FragColor=vec4(uCol*a*.5,1.);}' });
  [[150, -880, '#4df0ff'], [-560, -420, '#ff3df0'], [620, -300, '#ffe14d'], [-200, -1200, '#b58cff'], [760, -1000, '#4df0ff']].forEach(([x, z, c], i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(22, 4, 1500, 16, 1, true), beamM(c)); m.position.set(x, 900, z); grp.add(m); anim.push((dt, t) => { m.rotation.z = Math.sin(t * 0.2 + i * 2) * 0.16; m.rotation.x = Math.cos(t * 0.17 + i) * 0.14; });
  });
  // 車: 空の車列 + 地上の交通 (ヘッドライトが濡れた路面に映る)
  const carGeo = (() => { const mk = (g, c) => { const q = g.toNonIndexed(), n = q.attributes.position.count, cc = new Float32Array(n * 3); for (let i = 0; i < n; i++) cc.set(c, i * 3); q.setAttribute('color', new THREE.BufferAttribute(cc, 3)); q.deleteAttribute('uv'); q.deleteAttribute('normal'); return q; };
    const parts = [mk(new THREE.BoxGeometry(2.0, 0.7, 4.8).translate(0, 0.1, 0), [0.03, 0.035, 0.05]), mk(new THREE.BoxGeometry(1.7, 0.55, 2.4).translate(0, 0.7, 0.2), [0.012, 0.014, 0.02]), mk(new THREE.BoxGeometry(0.5, 0.18, 0.1).translate(-0.62, 0.16, -2.42), [14, 13, 11]), mk(new THREE.BoxGeometry(0.5, 0.18, 0.1).translate(0.62, 0.16, -2.42), [14, 13, 11]), mk(new THREE.BoxGeometry(1.7, 0.14, 0.1).translate(0, 0.22, 2.42), [8, 0.4, 0.2])];
    const g = new THREE.BufferGeometry(), ps = [], cl = []; for (const p of parts) { ps.push(...p.attributes.position.array); cl.push(...p.attributes.color.array); } g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); return g; })();
  const NC = 300, cars = new THREE.InstancedMesh(carGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), NC), lanes = [];
  for (let i = 0; i < NC; i++) { const air = i < 130, ax = r() < 0.5, g = Math.floor(rr(r, -9, 9)), dir = r() < 0.5 ? 1 : -1; lanes.push({ ax, lane: g * block + 46 + dir * (air ? 5 : 3.2 + (r() < 0.5 ? 3.6 : 0)), alt: air ? pick(r, [42, 78, 120, 170]) + rr(r, -3, 3) : 0.55, dir, off: r() * 3200, sp: air ? rr(r, 38, 70) : rr(r, 11, 22) }); }
  cars.frustumCulled = false; grp.add(cars);
  anim.push((dt, t) => { for (let i = 0; i < NC; i++) { const l = lanes[i], s = ((t * l.sp + l.off) % 3200) - 1600; let x = l.ax ? s * l.dir : l.lane, z = l.ax ? l.lane : s * l.dir; const hide = l.alt < 2 && (Math.hypot(x, z) < 212 || Math.hypot(x, z) > 1500); o3.position.set(x, hide ? -50 : l.alt, z); o3.rotation.set(0, l.ax ? (l.dir > 0 ? -HP : HP) : l.dir > 0 ? Math.PI : 0, 0); o3.scale.setScalar(1); o3.updateMatrix(); cars.setMatrixAt(i, o3.matrix); } cars.instanceMatrix.needsUpdate = true; });
  // 宇宙港: パッド / 管制塔 / ターミナルビル
  const D = mat('hull', { color: 0x3a3f48, rough: 0.7, metal: 0.6 }), W = mat('wall', { color: 0x4a5262, rough: 0.6, metal: 0.5 }), GLS = mat('flat', { color: 0x0a1420, rough: 0.05, metal: 1, env: 2 });
  pad(B, 1.0, 36, '#4df0ff');
  B.cyl(D, 5, 7, 70, -78, 35, 46, 'y', 12); B.cyl(W, 13, 9, 10, -78, 75, 46, 'y', 12); B.cyl(GLS, 13.4, 12, 4, -78, 77.5, 46, 'y', 12, true); B.cyl(glow('#4df0ff', 3), 13.5, 13.5, 0.5, -78, 80.4, 46, 'y', 12, true); B.cyl(D, 14, 13, 1.2, -78, 81, 46, 'y', 12); B.cyl(D, 0.5, 0.5, 30, -78, 96, 46, 'y', 6);
  B.box(W, 64, 16, 30, 86, 8, 30); B.box(D, 68, 1.5, 34, 86, 16.7, 30); B.box(glow('#ff3df0', 3), 64.2, 0.4, 30.2, 86, 15.4, 30); B.box(GLS, 0.4, 9, 24, 53.9, 6, 30); B.box(glow('#cfe0ff', 1.2), 0.2, 8.6, 5.2, 54.0, 5.2, 30); B.box(D, 1.2, 0.6, 26, 53.4, 10.9, 30); B.box(D, 5, 0.4, 9, 51.5, 5.6, 30);
  for (const z of [18.5, 23, 37, 41.5]) B.box(D, 0.5, 9, 0.5, 53.7, 6, z);
  rects.push([54, 15, 118, 45]); cols.push({ x: -78, z: 46, r: 8 });
  const s1 = signMesh('ネオン・ベイ宇宙港', '#4df0ff', 4.2, { double: true, intensity: 2.6 }); s1.position.set(53.5, 13.6, 30); s1.rotation.y = -HP; grp.add(s1);
  items.push({ x: 52, z: 30, r: 5, label: 'ターミナルビルに入る', act: 'outpost' });
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + 0.26, x = Math.cos(a) * 64, z = Math.sin(a) * 64; if (x > 38 && Math.abs(z - 30) < 24) continue; B.cyl(D, 0.2, 0.36, 12, x, 6, z, 'y', 8); B.box(D, 3.2, 0.25, 0.5, x - Math.cos(a) * 1.5, 12, z - Math.sin(a) * 1.5, -a); B.box(glow('#dfe8ff', 6), 1.2, 0.08, 0.34, x - Math.cos(a) * 2.5, 11.84, z - Math.sin(a) * 2.5, -a); beacon(beacons, x - Math.cos(a) * 2.5, 11.6, z - Math.sin(a) * 2.5, '#cfe0ff', 7); cols.push({ x, z, r: 0.6 }); }
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28, x = Math.cos(a) * 196, z = Math.sin(a) * 196; if (Math.abs(((a * 4 / 6.28) % 1) - 0.5) > 0.4) continue; B.box(D, 2.6, 1.0, 0.5, x, 0.5, z, -a + HP); B.box(glow(i % 2 ? '#ff3df0' : '#4df0ff', 2.5), 2.4, 0.08, 0.52, x, 0.92, z, -a + HP); cols.push({ x, z, r: 1.4 }); }
  beacon(beacons, -78, 111.5, 46, '#f33', 14, 0.6);
  const nodes = []; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.5, d = 96 + (i % 3) * 32, n = node('#4df0ff', 0.8, 30 + i); n.position.set(Math.cos(a) * d - 20, 0, Math.sin(a) * d + 6); grp.add(n); nodes.push({ g: n, x: n.position.x, z: n.position.z, item: 'elec', label: '電子廃材を回収する' }); }
  grp.add(B.build());
  return { id: 'terra', group: grp, sky, H, sunDir, sunCol: '#ff8a50', sunInt: 1.6, hemi: ['#4a3a7a', '#1a1024', 1.0], fog, cols, rects, items, anim, beacons, nodes, padY: 1.1, mirror: [road, 1.6], rain: [V3(6, -46, 2), 0.5, '#9fb8ff'], walkR: 1500, door: [50, 30, -HP], foot: [0, 42], look: [0.42, 1.15, 0.95], music: 'neon', water: -1.6 };
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
