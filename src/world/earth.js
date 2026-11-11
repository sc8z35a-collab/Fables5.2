// 地球: 不規則な街区を持つ巨大都市 (河川・大通り・公園・港) + 農園地帯 + 雪国 + ジャングル + 海
import * as THREE from 'three';
import { Builder, mx, rockGeo, loft } from '../gfx/builder.js';
import { mat, glow, texSet, signMesh } from '../gfx/textures.js';
import { rng, rr, fbm, ridge, smooth, clamp, lerp, pick } from '../core/util.js';
import { fxTime, makeGlowSprite } from '../gfx/fx.js';
import { HP, V3, COL, N2, makeSky, gridTerrain, scatter, pad, node, beacon, forest, colorGeo, ocean, VegField, propGeo, landmarks, hs2 } from './surfkit.js';

// ── 地域マスク (CPU と GLSL で同じ式を使う) ──
const coast = (x) => 1650 + 260 * Math.sin(x * 0.0011) + 140 * Math.sin(x * 0.0027 + 1);
const riverX = (z) => -420 + 180 * Math.sin(z * 0.0016) + 90 * Math.sin(z * 0.0041 + 1);
const mSea = (x, z) => smooth(coast(x) - 60, coast(x) + 140, z);
const mSnow = (x, z) => smooth(-3300 + 500 * Math.sin(x * 0.0008), -4500 + 500 * Math.sin(x * 0.0008), z);
const mJungle = (x, z) => smooth(-2500 + 400 * Math.sin(z * 0.0009), -3500 + 400 * Math.sin(z * 0.0009), x) * (1 - mSnow(x, z));
const mFarm = (x, z) => smooth(2600 + 300 * Math.sin(z * 0.0012), 3600 + 300 * Math.sin(z * 0.0012), x) * (1 - mSnow(x, z));
const mCity = (x, z) => smooth(2650, 2450, Math.hypot(x * 0.9, z + 500)) * (1 - smooth(coast(x) - 46, coast(x) - 18, z));
const VILLAGE = [420, -5300], LAKE = [-360, -5450], TEMPLE = [-4400, 250], jr = (z) => -4150 + 300 * Math.sin(z * 0.0015), SEA = -1.2, EDGE = 12000;
/** 農地の区画座標 (シェーダと同じ式)。畦 (区画の縁) なら true */
const fieldEdge = (x, z) => { const fx = (0.955 * x + 0.296 * z) / 190, fz = (-0.296 * x + 0.955 * z) / 130; return Math.abs(fx - Math.floor(fx) - 0.5) > 0.465 || Math.abs(fz - Math.floor(fz) - 0.5) > 0.465; };
// 畑ごとの作物の種類。同じ表をシェーダにも渡すので、地面の色と立体の作物が必ず一致する
const FN = 128, FIELD = new Uint8Array(FN * FN); for (let j = 0; j < FN; j++) for (let i = 0; i < FN; i++) FIELD[j * FN + i] = Math.floor(hs2(i - FN / 2, j - FN / 2, 5) * 255);
const fieldType = (x, z) => { const cx = Math.floor((0.955 * x + 0.296 * z) / 190), cz = Math.floor((-0.296 * x + 0.955 * z) / 130); return FIELD[(((cz + FN / 2) % FN + FN) % FN) * FN + ((cx + FN / 2) % FN + FN) % FN] / 255; };
function H(x, z) {
  const sea = mSea(x, z), sn = mSnow(x, z), ju = mJungle(x, z), fa = mFarm(x, z), c = coast(x);
  let h = 3 + fbm(x * 0.0005, z * 0.0005, 4, 2) * 26 + ridge(x * 0.0017, z * 0.0017, 3, 9) * 15 + fbm(x * 0.003, z * 0.003, 3, 19) * 8; // なだらかな丘と小さな起伏
  h += fa * (fbm(x * 0.0007, z * 0.0007, 4, 5) * 44 - 12);
  h += ju * (fbm(x * 0.0009, z * 0.0009, 5, 8) * 250 + ridge(x * 0.003, z * 0.003, 3, 4) * 36);
  h += sn * (ridge(x * 0.00042, z * 0.00042, 5, 11) * 1500 + fbm(x * 0.0016, z * 0.0016, 4, 6) * 200 + 90);
  h = lerp(h, 150, smooth(900, 420, Math.hypot(x - VILLAGE[0], z - VILLAGE[1])) * sn);
  h = lerp(h, 148, smooth(430, 250, Math.hypot(x - LAKE[0], z - LAKE[1])) * sn);
  h = lerp(h, -4.5, smooth(270, 95, Math.abs(x - jr(z))) * ju);
  h = lerp(h, 46, smooth(280, 130, Math.hypot(x - TEMPLE[0], z - TEMPLE[1])) * ju);
  h = lerp(h, -0.35, smooth(2950, 2520, Math.hypot(x * 0.9, z + 500)));
  h = lerp(h, 1.6, smooth(c - 520, c - 70, z) * (1 - smooth(2950, 2520, Math.hypot(x * 0.9, z + 500))));
  if (z > -3300 && z < c + 260) h = Math.min(h, lerp(-7, h, smooth(40, 80, Math.abs(x - riverX(z)))));
  h = lerp(h, -30 - fbm(x * 0.0011, z * 0.0011, 3, 14) * 16, sea);
  h += sea * Math.max(0, fbm(x * 0.0011, z * 0.0011, 4, 31) - 0.6) * 520;
  return lerp(h, -42, smooth(EDGE - 1900, EDGE - 250, Math.max(Math.abs(x), Math.abs(z)))); // 四方を海に囲まれた大地
}
// 地形の追加シェーダ: 農地の区画・雪線・砂浜・凍った湖
const TERRA_HEAD = 'uniform float uCan;uniform sampler2D uField;';
const TERRA_FRAG = /* glsl */`
float slope=1.-vTn.y,cst=1650.+260.*sin(vTw.x*.0011)+140.*sin(vTw.x*.0027+1.);
float sSn=smoothstep(-3300.+500.*sin(vTw.x*.0008),-4500.+500.*sin(vTw.x*.0008),vTw.z);
float sFa=smoothstep(2600.+300.*sin(vTw.z*.0012),3600.+300.*sin(vTw.z*.0012),vTw.x)*(1.-sSn);
if(sFa>.02&&vTw.y>1.){vec2 fp=mat2(.955,-.296,.296,.955)*vTw.xz;vec2 fc=floor(fp/vec2(190.,130.)),ff=fract(fp/vec2(190.,130.));float fh=texture2D(uField,(fc+vec2(64.5))/128.).r;
  vec3 crop=fh<.22?vec3(.5,.42,.13):fh<.45?vec3(.12,.3,.06):fh<.62?vec3(.26,.17,.09):fh<.78?vec3(.62,.56,.08):vec3(.17,.34,.1);
  float rows=.8+.2*sin((fh>.5?fp.x:fp.y)*1.7);
  crop=mix(crop,vec3(.1,.36,.08),step(.84,fh)*smoothstep(.47,.45,length(ff-.5)));
  float ed=smoothstep(0.,.035,min(min(ff.x,1.-ff.x),min(ff.y,1.-ff.y)));
  diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.2,.16,.1),crop*rows,ed)*(.75+.5*tn2),sFa*smoothstep(1.,4.,vTw.y)*(1.-smoothstep(.2,.4,slope)));}
if(sSn>.02){float line=smoothstep(40.,150.,vTw.y+tn1*90.);vec3 sc=mix(vec3(.82,.87,.95),vec3(.2,.19,.2)*(.7+.6*tn2),smoothstep(.34,.62,slope+tn2*.12));
  diffuseColor.rgb=mix(diffuseColor.rgb,sc,sSn*line);
  float pf=smoothstep(uCan*.72,uCan*1.02,td)*sSn*step(20.,vTw.y)*smoothstep(560.,470.,vTw.y)*smoothstep(.6,.4,slope);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.075,.055),pf*smoothstep(.5,.66,vn2(vTw.xz*.045))*.7);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.46,.64,.78)*(.8+.3*tn2),smoothstep(250.,205.,length(vTw.xz-vec2(-360.,-5450.))));}
float sJu=smoothstep(-2500.+400.*sin(vTw.z*.0009),-3500.+400.*sin(vTw.z*.0009),vTw.x)*(1.-sSn);
if(sJu>.02){float cf=smoothstep(uCan*.72,uCan*1.02,td)*smoothstep(.75,.45,slope);float cb=vn2(vTw.xz*.085)*.6+vn2(vTw.xz*.23+9.)*.4;
  vec3 can=mix(vec3(.012,.045,.014),vec3(.05,.17,.04),smoothstep(.2,.8,cb))*(.8+.5*tn1),flo=vec3(.06,.075,.035)*(.6+.8*tn2);
  diffuseColor.rgb=mix(diffuseColor.rgb,mix(flo,can,cf),sJu*smoothstep(.4,1.6,vTw.y));}
float bch=smoothstep(5.,1.4,vTw.y)*smoothstep(-4.,.5,vTw.y)*smoothstep(cst-760.,cst-160.,vTw.z);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.54,.38)*(.8+.4*tn2),bch);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.22,.2,.18)*(.7+.6*tn2),smoothstep(.45,.7,slope)*(1.-sSn));`;

// ── 街区座標: 道路がゆるやかに曲がり、区画の大きさも不揃いになる写像 ──
const BS = 96, _o = [0, 0], _o2 = [0, 0];
function Q(x, z, o) {
  const wx = x + 70 * Math.sin(z * 0.0019 + 0.5) + 30 * Math.sin(z * 0.0052 + x * 0.0012), wz = z + 60 * Math.sin(x * 0.0017 + 1.1) + 26 * Math.sin(x * 0.0046 - z * 0.0011);
  o[0] = wx + 24 * Math.sin(wx * 0.0105) + 10 * Math.sin(wx * 0.034 + 1.3); o[1] = wz + 22 * Math.sin(wz * 0.0118 + 2) + 9 * Math.sin(wz * 0.031); return o;
}
function invQ(qx, qz, o) { let x = qx, z = qz; for (let i = 0; i < 9; i++) { Q(x, z, o); x += (qx - o[0]) * 0.8; z += (qz - o[1]) * 0.8; } o[0] = x; o[1] = z; return o; }
const hwid = (i) => (((i % 4) + 4) % 4 === 0 ? 15 : 9.5), cellKind = (ix, iz) => { const k = (((ix * 7 + iz * 13) % 17) + 17) % 17; return k === 3 ? 'park' : k === 9 ? 'plaza' : ''; };
const nB = [-Math.sin(0.55), Math.cos(0.55)], blvD = (x, z) => Math.abs((x - 300) * nB[0] + (z + 300) * nB[1]);
const cbd = (x, z) => Math.exp(-((x - 250) ** 2 + (z + 1000) ** 2) / 520000) + 0.62 * Math.exp(-((x + 1150) ** 2 + (z + 300) ** 2) / 230000) + 0.5 * Math.exp(-((x - 1350) ** 2 + (z + 150) ** 2) / 200000);

const CITY_VS = /* glsl */`
attribute vec3 aSize;attribute float aSeed;attribute vec2 aRot;varying vec3 vL,vN,vW;flat varying vec3 vS;flat varying float vSeed;flat varying vec2 vRot;
void main(){vL=position*aSize;vS=aSize;vSeed=aSeed;vRot=aRot;vN=normal;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
// ファサード: 窓の奥に部屋が見える「インテリアマッピング」+ 1 階店舗 + 屋上設備
const CITY_FS = /* glsl */`
precision highp float;
uniform vec3 uFogCol,uAmb,uSunDir,uSunCol,uSkyA,uSkyB;uniform float uFogDen,uTime;
varying vec3 vL,vN,vW;flat varying vec3 vS;flat varying float vSeed;flat varying vec2 vRot;
vec3 toL(vec3 v){return vec3(v.x*vRot.x+v.z*vRot.y,v.y,-v.x*vRot.y+v.z*vRot.x);}
float h1(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}
vec3 sky(vec3 d,vec3 s){return mix(uSkyB,uSkyA,clamp(d.y*1.6+.1,0.,1.))+uSunCol*pow(max(dot(d,s),0.),10.)*.35;}
void main(){
  vec3 n=normalize(vN),V=toL(normalize(vW-cameraPosition)),sunL=toL(uSunDir);float dist=length(vW-cameraPosition);
  float mat=h1(vec2(vSeed,1.));
  vec3 base=mix(vec3(.05,.055,.07),vec3(.16,.15,.15),mat);base=mix(base,vec3(.09,.11,.14),step(.7,h1(vec2(vSeed,2.))));
  vec3 neon=.5+.5*cos(6.2832*(h1(vec2(vSeed,9.))+vec3(0.,.33,.67)));neon=mix(neon,vec3(1.,.2,.8),.3);
  float ndl=max(dot(n,sunL),0.);vec3 lightC=uAmb*1.5+uSunCol*ndl*.55;vec3 col;
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
    float fres=.04+.96*pow(1.-max(dot(-V,n),0.),5.);vec3 gcol=interior*(1.-fres)+sky(reflect(V,n),sunL)*fres*.9;
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

// 路面: 曲がる街路に沿った車線・横断歩道・歩道・公園・広場・橋・水たまり・街灯の光だまり
const ROAD_A = /* glsl */`
vec2 P=vRw.xz;float cz_=1650.+260.*sin(P.x*.0011)+140.*sin(P.x*.0027+1.);
float cityM=smoothstep(2650.,2450.,length(vec2(P.x*.9,P.y+500.)))*(1.-smoothstep(cz_-46.,cz_-18.,P.y));
if(cityM<.5)discard;
float rd=abs(P.x-(-420.+180.*sin(P.y*.0016)+90.*sin(P.y*.0041+1.)));
vec2 w_=P+vec2(70.*sin(P.y*.0019+.5)+30.*sin(P.y*.0052+P.x*.0012),60.*sin(P.x*.0017+1.1)+26.*sin(P.x*.0046-P.y*.0011));
vec2 q=vec2(w_.x+24.*sin(w_.x*.0105)+10.*sin(w_.x*.034+1.3),w_.y+22.*sin(w_.y*.0118+2.)+9.*sin(w_.y*.031)),id=floor(q/96.),l=q-id*96.-48.;
float hl=mod(id.x,4.)==0.?15.:9.5,hr=mod(id.x+1.,4.)==0.?15.:9.5,hn=mod(id.y,4.)==0.?15.:9.5,hs=mod(id.y+1.,4.)==0.?15.:9.5;
float dxl=l.x+48.,dxr=48.-l.x,dzn=l.y+48.,dzs=48.-l.y,sx=min(dxl-hl,dxr-hr),sz=min(dzn-hn,dzs-hs),inX=step(sx,0.),inZ=step(sz,0.);
float dcx=min(dxl,dxr),hwx=dxl<dxr?hl:hr,dcz=min(dzn,dzs),hwz=dzn<dzs?hn:hs;
float bd=abs(dot(P-vec2(300.,-300.),vec2(-.5227,.8525))),blv=step(bd,16.),onRoad=max(max(inX,inZ),blv);
float plaza=smoothstep(214.,200.,length(P)),river=step(rd,46.)*(1.-plaza);
float bridge=max(step(dzn-hn,0.)*step(mod(id.y,2.),.5),step(dzs-hs,0.)*step(mod(id.y+1.,2.),.5));
if(river>.5&&bridge<.5&&blv<.5)discard;
float kk=mod(id.x*7.+id.y*13.,17.),park=(1.-onRoad)*step(abs(kk-3.),.5),plz=(1.-onRoad)*step(abs(kk-9.),.5);
float rn=fbm2(P*.55),pud=smoothstep(.5,.66,fbm2(P*.043+3.))*max(onRoad,plaza)*(1.-river);
float mk=inX*(1.-inZ)*(smoothstep(.2,.1,dcx)*step(.45,fract(q.y/7.))+smoothstep(.14,.07,abs(dcx-(hwx-1.2)))*.8+step(12.,hwx)*smoothstep(.14,.07,abs(dcx-5.))*step(.4,fract(q.y/5.))*.7)
 +inZ*(1.-inX)*(smoothstep(.2,.1,dcz)*step(.45,fract(q.x/7.))+smoothstep(.14,.07,abs(dcz-(hwz-1.2)))*.8+step(12.,hwz)*smoothstep(.14,.07,abs(dcz-5.))*step(.4,fract(q.x/5.))*.7);
mk+=inX*(1.-inZ)*step(sz,5.)*step(1.,sz)*step(.5,fract(dcx/1.3))*step(dcx,hwx-1.4)+inZ*(1.-inX)*step(sx,5.)*step(1.,sx)*step(.5,fract(dcz/1.3))*step(dcz,hwz-1.4);
mk+=blv*(1.-max(inX,inZ))*(smoothstep(.2,.1,bd)*step(.45,fract(dot(P,vec2(.8525,.5227))/7.))+smoothstep(.14,.07,abs(bd-14.5))*.8);
mk=clamp(mk,0.,1.)*(1.-plaza)*(.5+.5*vn2(P*2.7));
vec3 asph=diffuseColor.rgb*(.7+.6*rn)*mix(1.,.5,pud);float edge=min(sx,sz);
vec2 tl=fract(q/2.4);float joint=1.-smoothstep(0.,.03,min(min(tl.x,1.-tl.x),min(tl.y,1.-tl.y)));
vec3 walk=diffuseColor.rgb*vec3(1.75,1.7,1.6)*(.8+.4*vn2(floor(q/2.4)*1.7))*(1.-joint*.45);
vec3 lot=mix(walk,walk*.5,smoothstep(4.3,4.7,edge));lot=mix(lot,walk*1.3,smoothstep(.4,.2,edge));
vec3 grs=vec3(.07,.2,.05)*(.7+.9*fbm2(P*.3));grs=mix(grs,vec3(.44,.38,.27),step(min(abs(l.x-l.y),abs(l.x+l.y)),1.7));lot=mix(lot,grs,park*smoothstep(4.,5.,edge));
float pr2=length(l);vec3 pav=diffuseColor.rgb*vec3(2.,1.9,1.7)*(.8+.3*step(.5,fract(pr2/3.)))*(.9+.2*step(.5,fract(atan(l.y,l.x)*2.546)));lot=mix(lot,pav,plz*smoothstep(4.,5.,edge));
float pr=length(P);vec3 apron=diffuseColor.rgb*(.95+.4*rn)*mix(1.,.55,pud);apron=mix(apron,vec3(.85,.7,.2),smoothstep(.35,.2,abs(pr-60.))*.8);apron=mix(apron,vec3(.7),smoothstep(.2,.1,min(abs(fract(P.x/40.)-.5),abs(fract(P.y/40.)-.5))*40.)*.25*step(64.,pr));
diffuseColor.rgb=mix(mix(mix(lot,asph,onRoad),vec3(.78,.78,.72),mk*.9),apron,plaza);
vec2 l1=vec2(dcx-(hwx+.4),mod(q.y,46.)-23.),l2=vec2(dcz-(hwz+.4),mod(q.x,46.)-23.);float pool=(exp(-dot(l1,l1)/46.)+exp(-dot(l2,l2)/46.))*(1.-plaza)*(1.-park);`;
const ROAD_R = /* glsl */`roughnessFactor=mix(mix(.92,roughnessFactor*.9+.25,max(onRoad,plaza)),.035,pud);roughnessFactor=mix(roughnessFactor,.55,mk*(1.-pud));roughnessFactor=mix(roughnessFactor,1.,park);`;
function roadPatch(m) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRw;').replace('#include <project_vertex>', '#include <project_vertex>\nvRw=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRw;\n' + N2).replace('#include <map_fragment>', '#include <map_fragment>\n' + ROAD_A)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + ROAD_R).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(1.,.72,.44)*pool*2.2;');
  };
  m.customProgramCacheKey = () => 'road2';
}
/** 街の川の水面か (橋は 1 本おきの通りと大通りだけに架かる) */
function cityBlocked(x, z) { if (mCity(x, z) < 0.5 || Math.hypot(x, z) < 214) return false; if (Math.abs(x - riverX(z)) > 46 || blvD(x, z) < 16) return false; Q(x, z, _o); const iz = Math.floor(_o[1] / BS), lz = _o[1] - iz * BS - 48, ev = (n) => ((n % 2) + 2) % 2 === 0; return !((lz + 48 - hwid(iz) <= 0 && ev(iz)) || (48 - lz - hwid(iz + 1) <= 0 && ev(iz + 1))); }

export function terra() {
  const r = rng(2077), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], obbs = [], decks = [], items = [], beacons = [], tiles = [];
  const sunDir = V3(-0.78, 0.27, 0.6).normalize(), fog = [COL('#4a3046'), 0.00016], fogDen = { value: fog[1] }, canU = { value: 1250 }, SKY = { zen: '#0a1238', hor: '#c8603a', sunCol: '#ffb070' };
  const sky = makeSky({ sun: sunDir, zen: SKY.zen, hor: SKY.hor, ground: '#141018', sunCol: '#ff9a50', cloudCol: '#e08a6a', cloud: 0.5, stars: 0.5, haze: 0.9, sunSize: 0.9993 });
  const tm = gridTerrain(H, (x, z, h, sl, c) => {
    const n = fbm(x * 0.004, z * 0.004, 3, 5), ju = mJungle(x, z), fa = mFarm(x, z), sn = mSnow(x, z);
    let R = 0.09 + n * 0.05, G2 = 0.17 + n * 0.07, B2 = 0.05 + n * 0.02;
    R = lerp(R, 0.14 + n * 0.05, fa); G2 = lerp(G2, 0.2 + n * 0.05, fa); B2 = lerp(B2, 0.06, fa);
    R = lerp(R, 0.025 + n * 0.02, ju); G2 = lerp(G2, 0.1 + n * 0.05, ju); B2 = lerp(B2, 0.025, ju);
    R = lerp(R, 0.16 + n * 0.05, sn); G2 = lerp(G2, 0.19 + n * 0.05, sn); B2 = lerp(B2, 0.13, sn);
    if (h < -1.2) { R = 0.05; G2 = 0.07; B2 = 0.07; }
    c[0] = R; c[1] = G2; c[2] = B2;
  }, { size: EDGE * 2, seg: 340, rough: 0.95, frag: TERRA_FRAG, head: TERRA_HEAD, uniforms: { uCan: canU, uField: { value: (() => { const t = new THREE.DataTexture(FIELD, FN, FN, THREE.RedFormat); t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })() } }, key: 'terra', uv: 0.05 });
  grp.add(tm);
  const hAt = tm.heightAt, heightAt = (x, z) => { const h = hAt(x, z); return mCity(x, z) >= 0.5 && !cityBlocked(x, z) ? Math.max(h, 0.02) : h; };
  grp.add(ocean((x, z) => (Math.abs(x) >= EDGE || Math.abs(z) >= EDGE ? -42 : hAt(x, z)), { sun: sunDir, sunCol: SKY.sunCol, zen: SKY.zen, hor: SKY.hor, fog, fogDen, size: 46000, seg: 170, level: SEA, shallow: '#0f3a44', deep: '#020f1e' }));
  // ── 都市の地面 (濡れた路面・平面反射) ──
  const road = mat('concrete', { color: 0x3a3c44, rough: 0.6, metal: 0.25, uvs: 0.08, floor: 1 }); roadPatch(road); road.polygonOffset = true; road.polygonOffsetFactor = 0; road.polygonOffsetUnits = -6; // 遠景でも地形とちらつかない
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6400, 6400).rotateX(-HP), road); ground.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 790; }); ground.position.set(0, 0.02, -500); ground.receiveShadow = true; ground.frustumCulled = false; grp.add(ground);
  { // 護岸: 川の両岸と海沿いの岸壁 (路面の縁から水面下まで)
    const P = [], quad = (x1, z1, x2, z2) => { P.push(x1, 0.03, z1, x2, 0.03, z2, x2, -6, z2, x1, 0.03, z1, x2, -6, z2, x1, -6, z1); };
    for (const sd of [-1, 1]) for (let z = -3100; z < 2100; z += 10) { const xa = riverX(z) + sd * 46, xb = riverX(z + 10) + sd * 46; if (mCity(xa, z) >= 0.5 && mCity(xb, z + 10) >= 0.5 && Math.hypot(xa, z) > 214) quad(xa, z, xb, z + 10); }
    for (let x = -2900; x < 2900; x += 10) { const za = coast(x) - 32, zb = coast(x + 10) - 32; if (Math.hypot(x * 0.9, za + 500) < 2550 && Math.abs(x - riverX(za)) > 46) quad(x, za, x + 10, zb); }
    const g = new THREE.BufferGeometry(), uv = []; g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); for (let i = 0; i < P.length; i += 3) uv.push((P[i] + P[i + 2]) * 0.08, P[i + 1] * 0.08); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const wm = mat('concrete', { color: 0x565a62, rough: 0.9, metal: 0.1 }).clone(); wm.side = THREE.DoubleSide; const wall = new THREE.Mesh(g, wm); wall.frustumCulled = false; grp.add(wall);
  }
  // ── ビル群: 街区ごとに敷地を割り、地区の密度に応じて高さと分割数を変える ──
  const cu = { uFogCol: { value: fog[0] }, uFogDen: fogDen, uTime: fxTime, uAmb: { value: COL('#4a4666') }, uSunDir: { value: sunDir }, uSunCol: { value: COL('#ff9a58') }, uSkyA: { value: COL('#141a44') }, uSkyB: { value: COL('#a8503a') } };
  const cityMat = new THREE.ShaderMaterial({ uniforms: cu, vertexShader: CITY_VS, fragmentShader: CITY_FS }), list = [], parks = [], plazas = [];
  const add = (x, z, w, h, d, th) => { list.push([x, z, w, h, d, th]); if (w > 5) obbs.push([x, z, w / 2, d / 2, Math.cos(th), Math.sin(th), h]); };
  for (let ix = -34; ix <= 34; ix++) for (let iz = -40; iz <= 26; iz++) {
    const c = invQ((ix + 0.5) * BS, (iz + 0.5) * BS, _o), cx = c[0], cz = c[1]; if (mCity(cx, cz) < 0.62 || Math.hypot(cx, cz) < 262 || (cx > 30 && cx < 140 && Math.abs(cz - 30) < 60)) continue;
    const kind = cellKind(ix, iz); if (kind === 'park') { parks.push([cx, cz]); continue; } if (kind === 'plaza') { plazas.push([cx, cz]); continue; }
    const x0 = -48 + hwid(ix) + 5, x1 = 48 - hwid(ix + 1) - 5, z0 = -48 + hwid(iz) + 5, z1 = 48 - hwid(iz + 1) - 5, den = cbd(cx, cz) + (r() - 0.5) * 0.16;
    const nx = den > 0.55 ? 1 : den > 0.25 ? 2 : r() < 0.5 ? 2 : 3, nz = den > 0.55 ? 1 : den > 0.25 ? (r() < 0.5 ? 1 : 2) : 2;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (den < 0.25 && r() < 0.12) continue;
      const lw = (x1 - x0) / nx, ld = (z1 - z0) / nz, w = lw - 2.5 - r() * lw * 0.18, d = ld - 2.5 - r() * ld * 0.18, qx = (ix + 0.5) * BS + x0 + (i + 0.5) * lw, qz = (iz + 0.5) * BS + z0 + (j + 0.5) * ld;
      const p = invQ(qx, qz, _o), x = p[0], z = p[1], rad = Math.hypot(w, d) * 0.5; if (Math.abs(x - riverX(z)) < 50 + rad * 0.8 || blvD(x, z) < 17 + rad * 0.8 || mCity(x, z) < 0.6 || Math.hypot(x, z) < 240) continue;
      const p2 = invQ(qx + 3, qz, _o2), th = Math.atan2(p2[1] - z, p2[0] - x);
      const h = den > 0.55 ? 150 + den * 260 * (0.6 + r() * 0.5) : den > 0.25 ? 36 + den * 190 * (0.5 + r()) : 9 + r() * 30 + (r() < 0.04 ? 60 : 0);
      if (den > 0.55) { const ph = 16 + r() * 14, k = rr(r, 0.6, 0.76); add(x, z, w, ph, d, th); add(x, z, w * k, h, d * k, th); if (r() < 0.7) { const k2 = k * rr(r, 0.55, 0.7); add(x, z, w * k2, h * rr(r, 1.15, 1.35), d * k2, th); } if (r() < 0.6) add(x, z, 2.2, h * 1.35 + rr(r, 20, 70), 2.2, th); }
      else { add(x, z, w, h, d, th); if (h > 60 && r() < 0.4) add(x + rr(r, -4, 4), z + rr(r, -4, 4), 1.6, h + rr(r, 10, 30), 1.6, th); }
    }
  }
  { // タイル分割 (視界外・遠方のタイルは描画しない)
    const TS = 640, map = new Map(), o3 = new THREE.Object3D(); for (const b of list) { const k = Math.floor(b[0] / TS) + ',' + Math.floor(b[1] / TS); let a = map.get(k); if (!a) map.set(k, (a = [])); a.push(b); }
    for (const a of map.values()) { const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), im = new THREE.InstancedMesh(g, cityMat, a.length), S = [], SD = [], RT = []; let sx = 0, sz = 0, mh = 0;
      a.forEach(([x, z, w, h, d, th], i) => { o3.position.set(x, 0, z); o3.rotation.set(0, -th, 0); o3.scale.set(w, h, d); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); S.push(w, h, d); SD.push(r() * 100); RT.push(Math.cos(th), Math.sin(th)); sx += x; sz += z; mh = Math.max(mh, h); });
      g.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(S), 3)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(SD), 1)); g.setAttribute('aRot', new THREE.InstancedBufferAttribute(new Float32Array(RT), 2));
      im.computeBoundingSphere(); grp.add(im); tiles.push({ o: im, x: sx / a.length, y: mh / 2, z: sz / a.length, r: 2900 + mh * 9 }); }
  }
  // ── 公園の木々・広場の記念碑 ──
  const cityTrees = []; for (const [cx, cz] of parks) for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 30; cityTrees.push([cx + Math.cos(a) * d, 0, cz + Math.sin(a) * d, 9 + r() * 7, 8 + r() * 4]); }
  tiles.push(...forest(grp, cityTrees, 'oak', 900, 2600));
  const D = mat('hull', { color: 0x3a3f48, rough: 0.7, metal: 0.6 }), W = mat('wall', { color: 0x4a5262, rough: 0.6, metal: 0.5 }), GLS = mat('flat', { color: 0x0a1420, rough: 0.05, metal: 1, env: 2 }), ST = mat('marble', { color: 0xd8d4cc, rough: 0.5, metal: 0.05, uvs: 0.2 });
  for (const [cx, cz] of plazas) { B.cyl(ST, 7, 8, 1.2, cx, 0.6, cz, 'y', 24); B.add(ST, new THREE.CylinderGeometry(0.4, 1.6, 26, 4), mx(cx, 14, cz, 0, 0.78, 0)); B.tor(glow('#4df0ff', 2.6), 7.6, 0.12, cx, 1.25, cz, HP, 0, 0, 40, 5); cols.push({ x: cx, z: cz, r: 8 }); }
  // ── 街灯 ──
  const lp = [], gp = [], lr = [];
  for (let k = -11; k <= 11; k++) for (let s = -1050; s <= 1050; s += 46) for (const ax of [0, 1]) { const side = (Math.round(s / 46) + k) % 2 ? 1 : -1, off = side * (hwid(k) + 1.6), p = ax ? invQ(k * BS + off, s + 23, _o) : invQ(s + 23, k * BS + off, _o), x = p[0], z = p[1];
    if (Math.hypot(x, z) < 210 || Math.hypot(x, z) > 1150 || mCity(x, z) < 0.6 || Math.abs(x - riverX(z)) < 46 || blvD(x, z) < 16) continue; Q(x, z, _o2); const lx = _o2[0] - Math.floor(_o2[0] / BS) * BS - 48, lz = _o2[1] - Math.floor(_o2[1] / BS) * BS - 48, jx = Math.floor(_o2[0] / BS), jz = Math.floor(_o2[1] / BS);
    if (Math.min(lx + 48 - hwid(jx), 48 - lx - hwid(jx + 1)) < 0.5 || Math.min(lz + 48 - hwid(jz), 48 - lz - hwid(jz + 1)) < 0.5) continue; const q2 = ax ? invQ(k * BS + off - side * 1.2, s + 23, _o2) : invQ(s + 23, k * BS + off - side * 1.2, _o2); lp.push(x, 0, z); gp.push(q2[0], 7.72, q2[1]); lr.push(Math.atan2(q2[0] - x, q2[1] - z)); } // 腕木を車道側へ伸ばし、その先に灯具
  { const o3 = new THREE.Object3D(), pole = new THREE.InstancedMesh(colorGeo([[new THREE.CylinderGeometry(0.09, 0.15, 8.0, 6).translate(0, 4.0, 0), 0x30343c], [new THREE.BoxGeometry(0.08, 0.08, 1.3).translate(0, 7.95, 0.6), 0x30343c], [new THREE.CylinderGeometry(0.34, 0.24, 0.16, 10).translate(0, 7.95, 1.2), 0x30343c], [new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10).translate(0, 7.86, 1.2), new THREE.Color(6, 4.4, 2.6)]]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.6 }), lp.length / 3); // 支柱 + 笠 + 発光面 (光の中心を支柱がふさがないように)
    for (let i = 0; i < lp.length / 3; i++) { o3.position.set(lp[i * 3], 0, lp[i * 3 + 2]); o3.rotation.set(0, lr[i], 0); o3.updateMatrix(); pole.setMatrixAt(i, o3.matrix); } pole.frustumCulled = false; grp.add(pole);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    const lamps = new THREE.Points(lg, new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uS: { value: 620 } }, vertexShader: 'uniform float uS;varying float vF;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(uS/-mv.z,2.,44.);vF=exp(-pow(length(mv.xyz)*.0006,2.));gl_Position=projectionMatrix*mv;}', fragmentShader: 'varying float vF;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;gl_FragColor=vec4(vec3(1.,.7,.4)*(exp(-d*9.)*3.2+exp(-d*2.5)*.35)*vF,1.);}' })); lamps.frustumCulled = false; grp.add(lamps);
    tiles.push({ o: pole, x: 0, y: 0, z: 0, r: 2600 }, { o: lamps, x: 0, y: 0, z: 0, r: 3200 }); }
  // ── ネオン看板 (建物の向きに合わせる) ──
  const words = ['ラ\nー\nメ\nン', '電\n脳', 'ホ\nテ\nル', '酒\n場', 'カ\nラ\nオ\nケ', '薬', '宇\n宙\n港', 'NOVA', 'CYBER', '寿\n司', '質', 'ネ\nオ\nン\nベ\nイ', 'ゲ\nー\nム', '夜\n市', 'BAR', '銀\n河\n銀\n行'], cs = ['#ff3df0', '#4df0ff', '#ffe14d', '#ff5a3a', '#6dffb0', '#b58cff'];
  list.map((b, i) => [Math.hypot(b[0], b[1]), i]).filter(([, i]) => list[i][2] > 12 && list[i][3] > 22).sort((a, b) => a[0] - b[0]).slice(0, 60).forEach(([, i], k) => {
    const [x, z, w, h, d, th] = list[i], txt = words[k % words.length], vert = txt.includes('\n'), hz = vert ? Math.min(h * 0.5, 20 + r() * 16) : 5 + r() * 4, s = signMesh(txt, cs[k % cs.length], hz, { double: true, intensity: 2.4, frame: r() < 0.5 });
    const toC = Math.atan2(-z, -x) - th, face = Math.round(toC / HP), fa = face * HP + th, ex = (Math.abs(face) % 2 ? d : w) / 2 + 0.5, y = Math.min(h - hz / 2 - 3, 9 + hz / 2 + r() * 18), lat = rr(r, -0.3, 0.3) * (Math.abs(face) % 2 ? w : d);
    s.position.set(x + Math.cos(fa) * ex - Math.sin(fa) * lat, y, z + Math.sin(fa) * ex + Math.cos(fa) * lat); s.rotation.y = -fa + HP; grp.add(s);
    if (k % 4 === 0) anim.push((dt, t) => { s.material.color.setScalar(Math.sin(t * 11 + k) > 0.95 ? 0.8 : 2.4); });
  });
  // ── 巨大ホログラム & 光柱 (都心) ──
  const hm = new THREE.LineBasicMaterial({ color: COL('#4df0ff').multiplyScalar(1.8), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const holo = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(70, 16, 120, 10, 2, 3)), hm); holo.position.set(250, 640, -1000); grp.add(holo);
  const globe = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(60, 2)), new THREE.LineBasicMaterial({ color: COL('#ff3df0').multiplyScalar(1.8), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); globe.position.set(-1150, 380, -300); grp.add(globe);
  anim.push((dt) => { holo.rotation.y += dt * 0.25; holo.rotation.x += dt * 0.1; globe.rotation.y -= dt * 0.3; });
  const beamM = (c) => new THREE.ShaderMaterial({ uniforms: { uCol: { value: COL(c) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, vertexShader: 'varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}', fragmentShader: 'uniform vec3 uCol;varying vec2 vUv;varying vec3 vN,vV;void main(){float a=pow(abs(dot(vN,vV)),1.5)*pow(1.-vUv.y,1.3);gl_FragColor=vec4(uCol*a*.4,1.);}' });
  [[250, -1000, '#4df0ff'], [-1150, -300, '#ff3df0'], [1350, -150, '#ffe14d'], [-300, -1700, '#b58cff']].forEach(([x, z, c], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(22, 4, 1500, 16, 1, true), beamM(c)); m.position.set(x, 900, z); grp.add(m); anim.push((dt, t) => { m.rotation.z = Math.sin(t * 0.2 + i * 2) * 0.16; m.rotation.x = Math.cos(t * 0.17 + i) * 0.14; }); });
  // ── 交通: 曲がる街路に沿って走る地上の車 + 空の車列 ──
  const carGeo = colorGeo([[new THREE.BoxGeometry(2.0, 0.7, 4.8).translate(0, 0.1, 0), new THREE.Color(0.03, 0.035, 0.05)], [new THREE.BoxGeometry(1.7, 0.55, 2.4).translate(0, 0.7, 0.2), new THREE.Color(0.012, 0.014, 0.02)], [new THREE.BoxGeometry(0.5, 0.18, 0.1).translate(-0.62, 0.16, -2.42), new THREE.Color(14, 13, 11)], [new THREE.BoxGeometry(0.5, 0.18, 0.1).translate(0.62, 0.16, -2.42), new THREE.Color(14, 13, 11)], [new THREE.BoxGeometry(1.7, 0.14, 0.1).translate(0, 0.22, 2.42), new THREE.Color(8, 0.4, 0.2)]]);
  const NC = 280, cars = new THREE.InstancedMesh(carGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), NC), lanes = [], o3 = new THREE.Object3D();
  for (let i = 0; i < NC; i++) { const air = i < 110, ax = r() < 0.5, k = Math.floor(rr(r, -12, 12)), dir = r() < 0.5 ? 1 : -1; lanes.push({ air, ax, k, dir, off: r() * 2600, sp: air ? rr(r, 38, 70) : rr(r, 10, 20), alt: air ? pick(r, [46, 84, 130, 180]) + rr(r, -3, 3) : 0.55, lat: dir * (air ? 5 : 3.2 + (r() < 0.5 && hwid(k) > 12 ? 3.6 : 0)) }); }
  cars.frustumCulled = false; grp.add(cars);
  anim.push((dt, t) => { for (let i = 0; i < NC; i++) { const l = lanes[i], s = ((t * l.sp + l.off) % 2600) - 1300; let x, z, hd;
    if (l.air) { x = l.ax ? s * l.dir : l.k * 110 + l.lat; z = l.ax ? l.k * 110 + l.lat - 500 : s * l.dir - 500; hd = l.ax ? (l.dir > 0 ? -HP : HP) : l.dir > 0 ? Math.PI : 0; }
    else { const qa = l.k * BS - l.lat, qs = s * l.dir, p = l.ax ? invQ(qs, qa, _o) : invQ(qa, qs - 500, _o); x = p[0]; z = p[1]; const p2 = l.ax ? invQ(qs + 3 * l.dir, qa, _o2) : invQ(qa, qs - 500 + 3 * l.dir, _o2); hd = Math.atan2(-(p2[0] - x), -(p2[1] - z)); }
    const hide = !l.air && (Math.hypot(x, z) < 214 || mCity(x, z) < 0.6 || cityBlocked(x, z)); o3.position.set(x, hide ? -60 : l.alt, z); o3.rotation.set(0, hd, 0); o3.updateMatrix(); cars.setMatrixAt(i, o3.matrix); } cars.instanceMatrix.needsUpdate = true; });
  // ── モノレール: 大通りの中央を走る高架。駅と行き交う列車 ──
  { const dir = [Math.cos(0.55), Math.sin(0.55)], MT = mat('concrete', { color: 0x70747e, rough: 0.8, metal: 0.2 }), at = (sv, lat = 0) => [300 + dir[0] * sv - dir[1] * lat, -300 + dir[1] * sv + dir[0] * lat];
    let s0 = -3400, s1 = 3400; while (s0 < 0 && mCity(...at(s0)) < 0.62) s0 += 20; while (s1 > 0 && mCity(...at(s1)) < 0.62) s1 -= 20;
    const L = s1 - s0, mid = (s0 + s1) / 2, TY = 14;
    for (const lat of [-3.2, 3.2]) { const [bx, bz] = at(mid, lat); B.box(MT, L, 1.3, 1.0, bx, TY, bz, -0.55); }
    for (let sv = s0 + 12; sv < s1; sv += 46) { const [px, pz] = at(sv); if (Math.abs(px - riverX(pz)) < 50) continue; B.box(MT, 1.7, TY - 0.6, 1.7, px, (TY - 0.6) / 2, pz, -0.55); B.box(MT, 1.5, 1.1, 8.6, px, TY - 1, pz, -0.55); cols.push({ x: px, z: pz, r: 1.3 }); }
    for (const sv of [-1500, -300, 900, 2000]) { if (sv < s0 + 80 || sv > s1 - 80) continue; const [px, pz] = at(sv); B.box(W, 64, 0.5, 15, px, TY + 0.9, pz, -0.55); B.box(D, 66, 0.5, 16, px, TY + 5.6, pz, -0.55); B.box(glow('#4df0ff', 2.4), 64, 0.16, 0.3, px, TY + 5.25, pz, -0.55);
      for (const lat of [-7.3, 7.3]) { const [gx, gz] = at(sv, lat); B.box(GLS, 64, 3.6, 0.2, gx, TY + 3, gz, -0.55); } for (const d2 of [-28, 0, 28]) { const [cx2, cz2] = at(sv + d2); B.box(D, 0.5, 4.6, 0.5, cx2, TY + 3.3, cz2, -0.55); }
      const [ex, ez] = at(sv, 11); B.box(D, 5, TY + 1, 4, ex, (TY + 1) / 2, ez, -0.55); cols.push({ x: ex, z: ez, r: 3.4 }); const sg = signMesh('モノレール', '#4df0ff', 2.2, { double: true, intensity: 2.2 }); sg.position.set(px, TY + 7.4, pz); sg.rotation.y = -0.55; grp.add(sg); }
    const carG = colorGeo([[new THREE.BoxGeometry(2.7, 2.7, 13).translate(0, 1.9, 0), 0xe6e8ec], [new THREE.BoxGeometry(2.74, 0.9, 12.2).translate(0, 2.4, 0), new THREE.Color(2.6, 2.2, 1.5)], [new THREE.BoxGeometry(2.76, 0.3, 13.02).translate(0, 0.9, 0), new THREE.Color(0.1, 1.6, 2.2)], [new THREE.BoxGeometry(1.2, 0.9, 1.6).translate(0, 0.25, 0), 0x2a2e36]]);
    const NT = 12, tr = new THREE.InstancedMesh(carG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }), NT), o4 = new THREE.Object3D(), ry = Math.atan2(dir[0], dir[1]); tr.frustumCulled = false; grp.add(tr);
    anim.push((dt, t) => { for (let i = 0; i < NT; i++) { const tn = Math.floor(i / 4), sd = tn % 2 ? -1 : 1, sv = s0 + ((((t * 24 * sd + tn * L * 0.37 + (i % 4) * 13.6 * sd) % L) + L) % L), q = at(sv, sd * 3.2); o4.position.set(q[0], TY + 0.6, q[1]); o4.rotation.set(0, ry, 0); o4.updateMatrix(); tr.setMatrixAt(i, o4.matrix); } tr.instanceMatrix.needsUpdate = true; }); }
  // ── 歩行者: カメラの近くの歩道を行き交う (横断歩道を渡り、川と宇宙港の構内には入らない) ──
  { const pedG = (c1, c2, c3) => colorGeo([[new THREE.BoxGeometry(0.44, 0.62, 0.25).translate(0, 1.16, 0), c1], [new THREE.BoxGeometry(0.17, 0.84, 0.19).translate(-0.11, 0.42, 0), c2], [new THREE.BoxGeometry(0.17, 0.84, 0.19).translate(0.11, 0.42, 0), c2], [new THREE.BoxGeometry(0.12, 0.6, 0.15).translate(-0.3, 1.15, 0), c1], [new THREE.BoxGeometry(0.12, 0.6, 0.15).translate(0.3, 1.15, 0), c1], [new THREE.SphereGeometry(0.125, 8, 6).translate(0, 1.63, 0), c3], [new THREE.BoxGeometry(0.27, 0.11, 0.28).translate(0, 1.73, -0.01), 0x16120e]]);
    const PM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }); PM.onBeforeCompile = (sh) => { sh.uniforms.uPT = fxTime; sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(.5,.38,.26);');
      // 歩行アニメーション: 脚と腕を左右逆位相で振る
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uPT;').replace('#include <begin_vertex>', 'vec3 transformed=vec3(position);\n#ifdef USE_INSTANCING\n{float sw=sin(uPT*7.5+instanceMatrix[3].x*.7+instanceMatrix[3].z*.9)*sign(position.x);if(position.y<.84)transformed.z+=sw*(.84-position.y)*.42;else if(abs(position.x)>.2&&position.y<1.46)transformed.z-=sw*(1.46-position.y)*.4;}\n#endif'); }; PM.customProgramCacheKey = () => 'ped';
    const sets = [[0xb8452e, 0x22242a, 0xd8a888], [0x2e5a8a, 0x3a3a40, 0x8a5a3c], [0xd8d4c8, 0x4a3a2a, 0xe0b898], [0x3a3a44, 0x18181c, 0xc89878], [0xe8d030, 0x22242a, 0xd8a888], [0x7a3a8a, 0x2a2a30, 0x6a4830]].map(([a, b2, c]) => { const im = new THREE.InstancedMesh(pedG(a, b2, c), PM, 40); im.frustumCulled = false; im.castShadow = true; grp.add(im); return im; });
    const NP = sets.length * 40, pl = [], qc = [0, 0], o5 = new THREE.Object3D(), Lp = 300; for (let i = 0; i < NP; i++) pl.push({ ax: i % 2, lane: (Math.floor(i / 2) % 5) - 2, dir: r() < 0.5 ? 1 : -1, sd: r() < 0.5 ? 1 : -1, off: r() * Lp, sp: rr(r, 1.1, 1.9), inn: rr(r, 1.3, 4.1), ph: r() * 6, sc: rr(r, 0.92, 1.08) });
    anim.push((dt, t, cam) => { const show = !!cam && cam.y < 330 && mCity(cam.x, cam.z) > 0.3; for (const im of sets) im.visible = show; if (!show) return; Q(cam.x, cam.z, qc); const ck = [Math.round(qc[0] / BS), Math.round(qc[1] / BS)];
      for (let i = 0; i < NP; i++) { const l = pl[i], k = ck[l.ax ? 1 : 0] + l.lane, cs = qc[l.ax ? 0 : 1], sv = ((((t * l.sp * l.dir + l.off - cs) % Lp) + Lp) % Lp) - Lp / 2 + cs, lat = k * BS + l.sd * (hwid(k) + l.inn);
        const q = l.ax ? invQ(sv, lat, _o) : invQ(lat, sv, _o), x = q[0], z = q[1], q2 = l.ax ? invQ(sv + l.dir, lat, _o2) : invQ(lat, sv + l.dir, _o2), hide = Math.hypot(x, z) < 216 || mCity(x, z) < 0.6 || cityBlocked(x, z) || blvD(x, z) < 15;
        o5.position.set(x, hide ? -40 : 0.03 + Math.abs(Math.sin(t * l.sp * 3.4 + l.ph)) * 0.045, z); o5.rotation.set(0, Math.atan2(q2[0] - x, q2[1] - z), Math.sin(t * l.sp * 3.4 + l.ph) * 0.03); o5.scale.setScalar(l.sc); o5.updateMatrix(); sets[i % sets.length].setMatrixAt(Math.floor(i / sets.length), o5.matrix); }
      for (const im of sets) im.instanceMatrix.needsUpdate = true; }); }
  // ── 宇宙港 ──
  pad(B, 1.0, 36, '#4df0ff');
  B.cyl(D, 5, 7, 70, -78, 35, 46, 'y', 12); B.cyl(W, 13, 9, 10, -78, 75, 46, 'y', 12); B.cyl(GLS, 13.4, 12, 4, -78, 77.5, 46, 'y', 12, true); B.cyl(glow('#4df0ff', 3), 13.5, 13.5, 0.5, -78, 80.4, 46, 'y', 12, true); B.cyl(D, 14, 13, 1.2, -78, 81, 46, 'y', 12); B.cyl(D, 0.5, 0.5, 30, -78, 96, 46, 'y', 6);
  B.box(W, 64, 16, 30, 86, 8, 30); B.box(D, 68, 1.5, 34, 86, 16.7, 30); B.box(glow('#ff3df0', 3), 64.2, 0.4, 30.2, 86, 15.4, 30); B.box(GLS, 0.4, 9, 24, 53.9, 6, 30); B.box(glow('#cfe0ff', 1.2), 0.2, 8.6, 5.2, 54.0, 5.2, 30); B.box(D, 1.2, 0.6, 26, 53.4, 10.9, 30); B.box(D, 5, 0.4, 9, 51.5, 5.6, 30);
  for (const z of [18.5, 23, 37, 41.5]) B.box(D, 0.5, 9, 0.5, 53.7, 6, z);
  rects.push([54, 15, 118, 45]); cols.push({ x: -78, z: 46, r: 8 }); obbs.push([86, 30, 34, 17, 1, 0, 17.5], [-78, 46, 9, 9, 1, 0, 111, 1]);
  const s1 = signMesh('ネオン・ベイ宇宙港', '#4df0ff', 4.2, { double: true, intensity: 2.6 }); s1.position.set(53.5, 13.6, 30); s1.rotation.y = -HP; grp.add(s1);
  items.push({ x: 52, z: 30, r: 5, label: 'ターミナルビルに入る', act: 'outpost', name: 'ネオン・ベイ宇宙港' });
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + 0.26, x = Math.cos(a) * 64, z = Math.sin(a) * 64; if (x > 38 && Math.abs(z - 30) < 24) continue; B.cyl(D, 0.2, 0.36, 12, x, 6, z, 'y', 8); B.box(D, 3.2, 0.25, 0.5, x - Math.cos(a) * 1.5, 12, z - Math.sin(a) * 1.5, -a); B.box(glow('#dfe8ff', 6), 1.2, 0.08, 0.34, x - Math.cos(a) * 2.5, 11.84, z - Math.sin(a) * 2.5, -a); beacon(beacons, x - Math.cos(a) * 2.5, 11.62, z - Math.sin(a) * 2.5, '#ffe6c8', 2.6); cols.push({ x, z, r: 0.6 }); }
  beacon(beacons, -78, 111.5, 46, '#f33', 14, 0.6);
  // ── 港: 桟橋・コンテナ・ガントリークレーン・貨物船・灯台 ──
  const CR = mat('hull', { color: 0xe8a020, rough: 0.6, metal: 0.4 }), HU = mat('hull', { color: 0x2a3a4a, rough: 0.7, metal: 0.4 }), cc = [0xb8452e, 0x2e7ab8, 0xc9a22e, 0x3aa86a, 0x7a808a, 0x8a4ab8], PY = 0.4, QC = mat('concrete', { color: 0x6a6c72, rough: 0.9, metal: 0.1 });
  for (const px of [500, 880, 1260]) { const pz = coast(px); B.box(QC, 70, 7, 330, px, PY - 3.5, pz + 120); decks.push([px - 35, pz - 45, px + 35, pz + 285, PY]); obbs.push([px, pz + 120, 35, 165, 1, 0, PY]);
    for (let i = 0; i < 46; i++) { const n = 1 + Math.floor(r() * 3), x = px - 22 + (i % 4) * 9, z = pz - 20 + Math.floor(i / 4) * 16; for (let lv = 0; lv < n; lv++) B.box(mat('rib', { color: cc[(i + lv * 2) % 6], metal: 0.3 }), 6, 2.6, 2.5, x, PY + 1.3 + lv * 2.62, z, HP); rects.push([x - 1.3, z - 3.05, x + 1.3, z + 3.05]); }
    for (const cz2 of [pz + 150, pz + 235]) { for (const sd of [-1, 1]) { B.box(CR, 3, 52, 3, px + sd * 30, PY + 26, cz2 - 9); B.box(CR, 3, 52, 3, px + sd * 30, PY + 26, cz2 + 9); B.box(CR, 3, 3, 21, px + sd * 30, PY + 14, cz2); cols.push({ x: px + sd * 30, z: cz2 - 9, r: 2.2 }, { x: px + sd * 30, z: cz2 + 9, r: 2.2 }); } B.box(CR, 110, 4, 5, px + 16, PY + 51, cz2); B.box(CR, 8, 6, 22, px + 8, PY + 47, cz2); B.cyl(D, 0.2, 0.2, 24, px + 50, PY + 37, cz2, 'y', 5); B.box(D, 3, 2.6, 6.5, px + 50, PY + 24, cz2); beacon(beacons, px + 70, PY + 54, cz2, '#f33', 12, 0.6); obbs.push([px + 16, cz2, 56, 11, 1, 0, PY + 54, 1]); }
    const sx = px + 68, sz = pz + 190; B.add(HU, loft([{ z: -90, w: 3, t: 5, b: 9 }, { z: -70, w: 13, t: 5, b: 10 }, { z: 60, w: 14, t: 5, b: 10 }, { z: 88, w: 10, t: 6, b: 8 }].map((q) => ({ e: 5, ...q })), 16), mx(sx, 4, sz)); B.box(mat('flat', { color: 0xe8e8e2, rough: 0.6, metal: 0.1 }), 20, 16, 14, sx, 17, sz + 66); B.box(glow('#ffe6b0', 2), 20.2, 1.2, 14.2, sx, 21, sz + 66); B.cyl(mat('flat', { color: 0xb8452e, rough: 0.6, metal: 0.2 }), 2.4, 2.8, 9, sx, 29, sz + 70, 'y', 12); obbs.push([sx, sz, 14, 90, 1, 0, 25, 1]);
    for (let i = 0; i < 36; i++) { const n = 1 + Math.floor(r() * 3); for (let lv = 0; lv < n; lv++) B.box(mat('rib', { color: cc[(i * 5 + lv) % 6], metal: 0.3 }), 6, 2.6, 2.5, sx - 8 + (i % 3) * 8, 10.4 + lv * 2.62, sz - 70 + Math.floor(i / 3) * 10, HP); } }
  { const lx = 2350, lz = coast(2350) + 60, ly = 3.2, RK2 = mat('rock', { color: 0x4a463e, rough: 1, metal: 0, uvs: 0, ns: 1.4 }); B.add(RK2, rockGeo(1, 3, 21, 0.28), mx(lx, -14, lz, 0, 0.4, 0, 34, 18.5, 30), 0); B.add(RK2, rockGeo(1, 2, 22, 0.3), mx(lx + 30, -9, lz + 14, 0, 1.4, 0, 16, 10, 20), 0);
    B.cyl(mat('flat', { color: 0xf0f0ea, rough: 0.6, metal: 0.05 }), 4, 6.5, 46, lx, ly + 23, lz, 'y', 16); B.cyl(mat('flat', { color: 0xb8252a, rough: 0.6, metal: 0.1 }), 4.7, 4.9, 5, lx, ly + 30, lz, 'y', 16); B.cyl(D, 5.6, 5.6, 0.8, lx, ly + 46.4, lz, 'y', 16); B.cyl(GLS, 3.2, 3.2, 5, lx, ly + 49.4, lz, 'y', 12); B.add(D, new THREE.ConeGeometry(4.2, 4, 12), mx(lx, ly + 54, lz)); obbs.push([lx, lz, 6, 6, 1, 0, ly + 56, 1]);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 26, 900, 12, 1, true).rotateZ(HP).translate(450, 0, 0), beamM('#fff2c8')); lb.position.set(lx, ly + 49.4, lz); grp.add(lb); const ls = makeGlowSprite('#fff2c8', 30, 3); ls.position.set(lx, ly + 49.4, lz); ls.material.fog = false; grp.add(ls); anim.push((dt) => { lb.rotation.y += dt * 0.5; }); }
  // ── 農園地帯: 農家・納屋・サイロ・干し草・風力発電 ──
  const farmHouse = colorGeo([[new THREE.BoxGeometry(11, 5.5, 8).translate(0, 2.75, 0), 0xe8e2d4], [new THREE.CylinderGeometry(0.01, 7.2, 4.4, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.74).translate(0, 7.7, 0), 0x8a3a2a], [new THREE.BoxGeometry(1.2, 3.4, 1.2).translate(3.4, 8.6, 1), 0x6a5a50], [new THREE.BoxGeometry(1.3, 2.3, 0.12).translate(0, 1.15, 4.02), 0x4a3020], [new THREE.BoxGeometry(11.6, 0.5, 8.6).translate(0, 0.1, 0), 0x8a8478]]);
  const farmWin = colorGeo([[new THREE.BoxGeometry(1.5, 1.3, 0.1).translate(-3, 3, 4.03), new THREE.Color(4.4, 3, 1.3)], [new THREE.BoxGeometry(1.5, 1.3, 0.1).translate(3, 3, 4.03), new THREE.Color(4.4, 3, 1.3)], [new THREE.BoxGeometry(0.1, 1.3, 1.5).translate(5.53, 3, -1), new THREE.Color(4.4, 3, 1.3)], [new THREE.BoxGeometry(0.1, 1.3, 1.5).translate(-5.53, 3, 1.4), new THREE.Color(1.2, 1.6, 2.2)]]);
  const barn = colorGeo([[new THREE.BoxGeometry(14, 7, 22).translate(0, 3.5, 0), 0x8a2a20], [new THREE.CylinderGeometry(0.01, 9.4, 5.6, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 1.66).translate(0, 9.8, 0), 0x4a4a50], [new THREE.BoxGeometry(5, 5, 0.3).translate(0, 2.5, 11.1), 0xd8d0c0], [new THREE.BoxGeometry(14.2, 0.4, 0.4).translate(0, 7, 11.05), 0xd8d0c0], [new THREE.BoxGeometry(0.4, 7, 0.4).translate(-7, 3.5, 11.05), 0xd8d0c0], [new THREE.BoxGeometry(0.4, 7, 0.4).translate(7, 3.5, 11.05), 0xd8d0c0]]);
  const silo = colorGeo([[new THREE.CylinderGeometry(3.2, 3.2, 17, 14).translate(0, 8.5, 0), 0xb8bcc2], [new THREE.SphereGeometry(3.2, 14, 8, 0, 6.2832, 0, HP).translate(0, 17, 0), 0x8a9098], [new THREE.CylinderGeometry(3.26, 3.26, 0.3, 14).translate(0, 6, 0), 0x7a8088], [new THREE.CylinderGeometry(3.26, 3.26, 0.3, 14).translate(0, 12, 0), 0x7a8088]]);
  const tractor = colorGeo([[new THREE.BoxGeometry(1.7, 1.1, 3.4).translate(0, 1.5, 0), 0x2a7a2e], [new THREE.BoxGeometry(1.5, 1.5, 1.5).translate(0, 2.6, 0.8), 0x1a2228], [new THREE.CylinderGeometry(0.95, 0.95, 0.5, 12).rotateZ(HP).translate(-1.05, 0.95, 0.9), 0x111214], [new THREE.CylinderGeometry(0.95, 0.95, 0.5, 12).rotateZ(HP).translate(1.05, 0.95, 0.9), 0x111214], [new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10).rotateZ(HP).translate(-0.95, 0.55, -1.2), 0x111214], [new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10).rotateZ(HP).translate(0.95, 0.55, -1.2), 0x111214]]);
  const fence = colorGeo([[new THREE.BoxGeometry(0.14, 1.2, 0.14).translate(-2, 0.6, 0), 0x9a8468], [new THREE.BoxGeometry(0.14, 1.2, 0.14).translate(2, 0.6, 0), 0x9a8468], [new THREE.BoxGeometry(4, 0.1, 0.06).translate(0, 1.0, 0), 0x9a8468], [new THREE.BoxGeometry(4, 0.1, 0.06).translate(0, 0.55, 0), 0x9a8468]]);
  const bale = new THREE.CylinderGeometry(1.3, 1.3, 1.6, 12).rotateZ(HP), FM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }), GM = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), fh = [], fb = [], fs = [], hay = [], trac = [], fen = [], farmTrees = [];
  const obbR = (x, z, hw, hd, ry, h) => obbs.push([x, z, hw, hd, Math.cos(ry), -Math.sin(ry), h, 1]);
  for (let i = 0; i < 60; i++) { const x = rr(r, 3500, 9800), z = rr(r, -3000, 1200), h = hAt(x, z); if (mFarm(x, z) < 0.9 || h < 3 || mSea(x, z) > 0.05 || fh.some((f) => Math.hypot(f[0] - x, f[2] - z) < 240)) continue; const a = r() * 6.28; fh.push([x, h, z, a]); obbR(x, z, 5.6, 4.1, a, h + 9);
    const bx = x + Math.cos(a) * 32, bz = z + Math.sin(a) * 32; fb.push([bx, hAt(bx, bz), bz, a + HP]); obbR(bx, bz, 7.1, 11.1, a + HP, h + 12.5);
    if (r() < 0.75) { const sx2 = x + Math.cos(a + 1) * 30, sz2 = z + Math.sin(a + 1) * 30; fs.push([sx2, hAt(sx2, sz2), sz2, 0]); cols.push({ x: sx2, z: sz2, r: 3.4 }); }
    { const tx = x + Math.cos(a - 1.2) * 20, tz = z + Math.sin(a - 1.2) * 20; trac.push([tx, hAt(tx, tz), tz, r() * 6.28]); cols.push({ x: tx, z: tz, r: 1.8 }); }
    for (let k = 0; k < 5; k++) { const ta = a + 2.2 + k * 0.5, td = 30 + r() * 26, tx = x + Math.cos(ta) * td, tz = z + Math.sin(ta) * td; farmTrees.push([tx, hAt(tx, tz) - 0.3, tz, 10 + r() * 6, 9 + r() * 4]); cols.push({ x: tx, z: tz, r: 0.7 }); }
    for (let k = 0; k < 6; k++) { const bx2 = x + rr(r, -110, 110), bz2 = z + rr(r, -110, 110); if (Math.hypot(bx2 - x, bz2 - z) < 22 || Math.hypot(bx2 - bx, bz2 - bz) < 18) continue; hay.push([bx2, hAt(bx2, bz2) + 1.25, bz2, r() * 6.28]); cols.push({ x: bx2, z: bz2, r: 1.5 }); }
    for (let k = 0; k < 18; k++) { const fa2 = a + HP, c0 = Math.cos(fa2), s0 = Math.sin(fa2), ox = x - Math.cos(a) * 16 + c0 * (k - 8.5) * 4, oz = z - Math.sin(a) * 16 + s0 * (k - 8.5) * 4; fen.push([ox, hAt(ox, oz), oz, -fa2]); } }
  const inst = (geo, material, arr, sc = 1) => { if (!arr.length) return; const im = new THREE.InstancedMesh(geo, material, arr.length), o = new THREE.Object3D(); arr.forEach(([x, y, z, a], i) => { o.position.set(x, y, z); o.rotation.set(0, a, 0); o.scale.setScalar(sc); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.computeBoundingSphere(); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; grp.add(im); tiles.push({ o: im, x: im.boundingSphere.center.x, y: 0, z: im.boundingSphere.center.z, r: im.boundingSphere.radius + 4200 }); };
  inst(farmHouse, FM, fh); inst(farmWin, GM, fh); inst(barn, FM, fb); inst(silo, FM, fs); inst(tractor, FM, trac); inst(fence, FM, fen); inst(bale, new THREE.MeshStandardMaterial({ color: 0xc8a850, roughness: 1 }), hay);
  tiles.push(...forest(grp, farmTrees, 'oak', 1200, 4200));
  const tw = [], TWM = mat('flat', { color: 0xf0f2f4, rough: 0.5, metal: 0.2 }); for (let i = 0; i < 14; i++) { const x = 4200 + (i % 7) * 620 + rr(r, -80, 80), z = -2600 + Math.floor(i / 7) * 1500 + rr(r, -200, 200), h = hAt(x, z); if (h < 3 || mFarm(x, z) < 0.5) continue; tw.push([x, h, z, 0]); const hub = new THREE.Group(); for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 34, 0.5).translate(0, 17, 0), TWM); bl.rotation.z = k * 2.094; hub.add(bl); } hub.position.set(x, h + 62, z + 2.6); grp.add(hub); anim.push((dt) => { hub.rotation.z += dt * (0.5 + (i % 3) * 0.12); }); beacon(beacons, x, h + 65, z, '#f33', 8, 0.5); cols.push({ x, z, r: 3 }); obbs.push([x, z, 3, 3, 1, 0, h + 96, 1]); }
  inst(new THREE.CylinderGeometry(1.1, 2.2, 62, 10).translate(0, 31, 0), TWM, tw);
  // ── 雪国: 丸太小屋の村・凍った湖 (針葉樹の森は植生フィールドが生成) ──
  const cabin = colorGeo([[new THREE.BoxGeometry(9, 4.2, 7).translate(0, 2.1, 0), 0x5a3a26], [new THREE.CylinderGeometry(0.01, 6.6, 3.6, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.8).translate(0, 6, 0), 0xe8eef6], [new THREE.BoxGeometry(1, 3, 1).translate(2.6, 7, 0.6), 0x4a4038], [new THREE.BoxGeometry(9.6, 0.5, 7.6).translate(0, 0, 0), 0x8a8a8e], [new THREE.BoxGeometry(3, 0.3, 1.6).translate(0, 0.15, 4.3), 0x6a4a34]]);
  const cabWin = colorGeo([[new THREE.BoxGeometry(1.4, 1.2, 0.1).translate(-2.2, 2.3, 3.56), new THREE.Color(5, 3.2, 1.3)], [new THREE.BoxGeometry(1.4, 1.2, 0.1).translate(2.2, 2.3, 3.56), new THREE.Color(5, 3.2, 1.3)], [new THREE.BoxGeometry(0.1, 1.2, 1.4).translate(4.56, 2.3, 0), new THREE.Color(5, 3.2, 1.3)], [new THREE.BoxGeometry(1.1, 2.2, 0.1).translate(0, 1.1, 3.56), new THREE.Color(0.2, 0.1, 0.05)]]);
  const cab = [], vy = hAt(VILLAGE[0], VILLAGE[1]); for (let i = 0; i < 40; i++) { const a = i * 0.74 + r() * 0.3, d = 54 + (i % 5) * 34 + r() * 14, x = VILLAGE[0] + Math.cos(a) * d, z = VILLAGE[1] + Math.sin(a) * d, ry = -a - HP; cab.push([x, hAt(x, z), z, ry]); obbR(x, z, 4.8, 3.8, ry, hAt(x, z) + 8.5); if (i % 3 === 0) beacon(beacons, x - Math.cos(a) * 6, hAt(x, z) + 3.4, z - Math.sin(a) * 6, '#ffcf8a', 7); }
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4, d = rr(r, 60, 150), x = LAKE[0] + Math.cos(a) * d, z = LAKE[1] + Math.sin(a) * d; cab.push([x, hAt(x, z), z, a]); obbR(x, z, 4.8, 3.8, a, hAt(x, z) + 8.5); beacon(beacons, x, hAt(x, z) + 3.4, z, '#ffcf8a', 6); } // 凍った湖の釣り小屋
  inst(cabin, FM, cab); inst(cabWin, GM, cab);
  { const WD = mat('wood', { color: 0x5a3a26, rough: 0.9, metal: 0 }), RK3 = mat('rock', { color: 0x5a5a60, rough: 1, metal: 0, uvs: 0 }); B.cyl(WD, 0.5, 0.6, 16, VILLAGE[0] + 9, vy + 8, VILLAGE[1] - 4, 'y', 8); B.sph(glow('#ffe2a8', 4), 0.9, VILLAGE[0] + 9, vy + 16.6, VILLAGE[1] - 4); beacon(beacons, VILLAGE[0] + 9, vy + 16.6, VILLAGE[1] - 4, '#ffe2a8', 26); cols.push({ x: VILLAGE[0] + 9, z: VILLAGE[1] - 4, r: 1.2 });
    for (let k = 0; k < 9; k++) { const a = k * 0.698; B.add(RK3, rockGeo(0.42, 1, 40 + k, 0.3), mx(VILLAGE[0] + Math.cos(a) * 1.5, vy + 0.2, VILLAGE[1] + Math.sin(a) * 1.5), 0); } for (let k = 0; k < 4; k++) B.cyl(WD, 0.14, 0.16, 1.9, VILLAGE[0], vy + 0.6, VILLAGE[1], k % 2 ? 'x' : 'z', 6);
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; B.box(WD, 3.4, 0.5, 0.7, VILLAGE[0] + Math.cos(a) * 4.4, vy + 0.4, VILLAGE[1] + Math.sin(a) * 4.4, -a + HP); }
    const fire = makeGlowSprite('#ff9a3a', 7, 2.2); fire.position.set(VILLAGE[0], vy + 1.3, VILLAGE[1]); grp.add(fire); anim.push((dt, t) => { fire.scale.setScalar(6 + Math.sin(t * 13) * 0.8 + Math.sin(t * 7.3) * 0.6); }); beacon(beacons, VILLAGE[0], vy + 1.2, VILLAGE[1], '#ff8a2a', 12); cols.push({ x: VILLAGE[0], z: VILLAGE[1], r: 1.7 });
    const s2 = signMesh('雪見の里', '#ffe2a8', 3, { double: true, intensity: 2.2, frame: true }); s2.position.set(VILLAGE[0] + 14, vy + 7, VILLAGE[1] + 30); grp.add(s2); items.push({ x: VILLAGE[0], z: VILLAGE[1], r: 6.5, label: '村の焚き火で暖まる', act: 'rest', name: '雪見の里' }); }
  // ── ジャングル: 古代遺跡 (密林は植生フィールドが生成) ──
  { const STN = mat('rock', { color: 0x7a7468, rough: 1, metal: 0, uvs: 0.12 }), ty = hAt(TEMPLE[0], TEMPLE[1]); for (let i = 0; i < 6; i++) B.box(STN, 70 - i * 10, 6, 70 - i * 10, TEMPLE[0], ty + 3 + i * 6, TEMPLE[1]); B.box(STN, 16, 10, 16, TEMPLE[0], ty + 41, TEMPLE[1]); B.box(glow('#6dffb0', 3), 4, 6, 0.4, TEMPLE[0], ty + 40, TEMPLE[1] + 8.1);
    for (let i = 0; i < 14; i++) B.box(STN, 12, 2, 3, TEMPLE[0], ty + 1 + i * 2.6, TEMPLE[1] + 38 - i * 2.9); for (const [dx, dz] of [[-50, 50], [50, 50], [-50, -50], [50, -50]]) { B.cyl(STN, 3, 3.6, 22, TEMPLE[0] + dx, ty + 11, TEMPLE[1] + dz, 'y', 8); B.sph(glow('#6dffb0', 2.5), 1.2, TEMPLE[0] + dx, ty + 23.4, TEMPLE[1] + dz); cols.push({ x: TEMPLE[0] + dx, z: TEMPLE[1] + dz, r: 3.8 }); beacon(beacons, TEMPLE[0] + dx, ty + 23.4, TEMPLE[1] + dz, '#6dffb0', 9); }
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 44 + r() * 50, x = TEMPLE[0] + Math.cos(a) * d, z = TEMPLE[1] + Math.sin(a) * d, sc = 1 + r() * 2.6; if (Math.abs(x - TEMPLE[0]) < 9 && z > TEMPLE[1]) continue; B.add(STN, rockGeo(1, 1, 60 + i, 0.3), mx(x, hAt(x, z) + sc * 0.2, z, r(), r() * 6, r(), sc * 1.4, sc * 0.8, sc), 0); if (sc > 1.6) cols.push({ x, z, r: sc }); }
    rects.push([TEMPLE[0] - 35, TEMPLE[1] - 35, TEMPLE[0] + 35, TEMPLE[1] + 35]); obbs.push([TEMPLE[0], TEMPLE[1], 35, 35, 1, 0, ty + 46, 1]); items.push({ x: TEMPLE[0], z: TEMPLE[1] + 42, r: 9, label: '古代遺跡を調べる', act: 'ruins', name: '古代遺跡' }); beacon(beacons, TEMPLE[0], ty + 50, TEMPLE[1], '#6dffb0', 30); }
  // ── 植生: カメラの周囲だけに木々と下草を生成する (密林・針葉樹林・畦の並木・浜のヤシ・疎林) ──
  let hf = null;
  const vegAt = (x, z, u, v, o) => {
    if (Math.abs(x) > EDGE - 300 || Math.abs(z) > EDGE - 300 || mSea(x, z) > 0.02 || mCity(x, z) > 0.25) return false;
    const h = hAt(x, z); if (h < 0.7) return false; const c = coast(x);
    if (h < 5 && z > c - 300 && z < c - 20) { if (u > 0.32) return false; o[0] = 1; o[1] = 9 + v * 6; o[2] = 7 + v * 3; o[3] = h - 0.3; return true; }
    const sn = mSnow(x, z), ju = mJungle(x, z);
    if (ju > 0.3) { if (u > ju * 0.93 || Math.hypot(x - TEMPLE[0], z - TEMPLE[1]) < 108) return false; const big = v > 0.93; if (v < 0.09) { o[0] = 1; o[1] = 12 + u * 9; o[2] = 8 + u * 4; } else { o[0] = 2; o[1] = big ? 44 + u * 20 : 17 + v * 22; o[2] = big ? 30 + u * 6 : 13 + v * 11; } o[3] = h - 0.6; return true; }
    if (sn > 0.3) { if (u > 0.44 * sn || h > 560 || h < 20 || Math.hypot(x - VILLAGE[0], z - VILLAGE[1]) < 222 || Math.hypot(x - LAKE[0], z - LAKE[1]) < 255) return false; if (Math.abs(hAt(x + 8, z) - h) > 6 || Math.abs(hAt(x, z + 8) - h) > 6) return false; o[0] = 0; o[1] = 13 + v * 13; o[2] = 7 + v * 4; o[3] = h - 0.5; return true; }
    if (mFarm(x, z) > 0.5) { if (u > (fieldEdge(x, z) ? 0.5 : 0.006)) return false; for (const f of fh) if (Math.abs(f[0] - x) < 60 && Math.abs(f[2] - z) < 60) return false; o[0] = 3; o[1] = 9 + v * 8; o[2] = 8 + v * 5; o[3] = h - 0.3; return true; }
    if (u > (fbm(x * 0.0021, z * 0.0021, 2, 77) > 0.55 ? 0.62 : 0.06) || (hf && hf.hit(x, z))) return false; o[0] = 3; o[1] = 10 + v * 9; o[2] = 9 + v * 6; o[3] = h - 0.3; return true;
  };
  const underAt = (x, z, u, v, o) => {
    if (mSea(x, z) > 0.02 || mCity(x, z) > 0.25 || mSnow(x, z) > 0.3) return false; const ju = mJungle(x, z);
    if (ju > 0.3) { if (u > 0.66 || Math.hypot(x - TEMPLE[0], z - TEMPLE[1]) < 62) return false; const h = hAt(x, z); if (h < 0.5) return false; o[0] = 4; o[1] = 1.5 + v * 2.8; o[2] = 2.6 + v * 3.2; o[3] = h - 0.12; return true; }
    if (mFarm(x, z) > 0.5 && !fieldEdge(x, z)) { if (fieldType(x, z) < 0.78 || u > 0.3) return false; } else if (u > 0.2) return false; const h = hAt(x, z); if (h < 1.2) return false; o[0] = 5; o[1] = 1.1 + v * 1.7; o[2] = 1.8 + v * 2.6; o[3] = h - 0.1; return true;
  };
  const vf = new VegField(grp, vegAt, { tile: 400, step: 14, range: 1250, sway: 0.012, solid: true }), uf = new VegField(grp, underAt, { tile: 90, step: 4.5, range: 165, sway: 0.03 }); vf.u = canU;
  // ── 何もない場所をなくす ──
  const env2 = { grp, obbs, cols }, sample = (n, ok) => { const L = []; for (let i = 0; i < n * 10 && L.length < n; i++) { const x = rr(r, -EDGE + 900, EDGE - 900), z = rr(r, -EDGE + 900, EDGE - 900); if (ok(x, z)) L.push([x, z]); } return L; };
  const RKT = mat('rock', { color: 0x6a665e, rough: 1, metal: 0, uvs: 0 }), RKS = mat('rock', { color: 0xd4dce8, rough: 0.7, metal: 0, uvs: 0 }), RKM = mat('rock', { color: 0x46563a, rough: 1, metal: 0, uvs: 0 }), RKD = mat('rock', { color: 0x4a463e, rough: 1, metal: 0, uvs: 0, ns: 1.4 });
  // 海: 岩礁の尖塔 (航路は避ける)・灯浮標・洋上プラットフォーム・洋上風車
  landmarks(env2, propGeo('spire'), RKD, sample(110, (x, z) => hAt(x, z) < -14 && !(Math.abs(x) < 3900 && z > coast(x) + 250 && z < coast(x) + 2750) && Math.hypot(x - 320, z - 4300) > 500).map(([x, z]) => { const hh = rr(r, 44, 120); return [x, Math.max(hAt(x, z), -36) - 4, z, hh * rr(r, 0.9, 1.6), hh, r() * 6.28, rr(r, -0.12, 0.12)]; }), { solid: 0.2 });
  { const buoy = colorGeo([[new THREE.CylinderGeometry(0.9, 1.2, 1.6, 10).translate(0, 0.3, 0), 0xc8382a], [new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6).translate(0, 2.4, 0), 0xd8d8d8], [new THREE.SphereGeometry(0.3, 8, 6).translate(0, 4.1, 0), 0xffe14d]]), pts = sample(40, (x, z) => hAt(x, z) < -8 && Math.abs(x) < 9000 && Math.abs(z) < 9000); inst(buoy, FM, pts.map(([x, z]) => [x, SEA, z, 0])); pts.forEach(([x, z], i) => { if (i % 2 === 0) beacon(beacons, x, SEA + 4.2, z, i % 4 ? '#6dffb0' : '#f33', 7, 0.5 + (i % 3) * 0.2); }); }
  for (const [x, z] of [[-2600, 4300], [2700, 5200], [-6800, 2600]]) { const RG = mat('hull', { color: 0x6a6258, rough: 0.7, metal: 0.5 }), YL = mat('hull', { color: 0xd8a020, rough: 0.6, metal: 0.4 }); // 洋上プラットフォーム (甲板に着陸できる)
    for (const [dx, dz] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) B.cyl(RG, 2.4, 2.8, 74, x + dx, -8, z + dz, 'y', 12); B.box(RG, 50, 5, 50, x, 29, z); B.box(YL, 50.4, 0.6, 50.4, x, 31.6, z); B.box(RG, 16, 9, 12, x - 12, 36.4, z - 14); B.box(glow('#ffe6b0', 2), 16.2, 1.4, 12.2, x - 12, 37.6, z - 14);
    for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) B.box(YL, 0.7, 52, 0.7, x + 14 + dx, 58, z + 12 + dz, 0, dz * 0.012, -dx * 0.012); B.box(YL, 6.4, 0.8, 6.4, x + 14, 50, z + 12); B.box(YL, 6.4, 0.8, 6.4, x + 14, 68, z + 12); B.cyl(RG, 0.5, 0.5, 46, x - 22, 55, z + 20, 'y', 8, false); B.box(YL, 34, 1.2, 1.2, x + 2, 44, z - 22, 0.4, 0, 0.3);
    beacon(beacons, x - 22, 80, z + 20, '#ff8a2a', 30); beacon(beacons, x + 14, 85, z + 12, '#f33', 12, 0.6); obbs.push([x, z, 25, 25, 1, 0, 31.9], [x - 12, z - 14, 8, 6, 1, 0, 41, 1], [x + 14, z + 12, 3.6, 3.6, 1, 0, 84, 1]); cols.push({ x: x - 22, z: z + 20, r: 1 }); }
  { const off = []; for (let i = 0; i < 12; i++) { const x = 3900 + (i % 4) * 520 + rr(r, -60, 60), z = coast(x) + 900 + Math.floor(i / 4) * 520 + rr(r, -60, 60); if (hAt(x, z) > -6) continue; off.push([x, SEA - 2, z, 0]); const hub = new THREE.Group(); for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 34, 0.5).translate(0, 17, 0), TWM); bl.rotation.z = k * 2.094; hub.add(bl); } hub.position.set(x, SEA + 60, z + 2.6); grp.add(hub); anim.push((dt) => { hub.rotation.z += dt * (0.5 + (i % 3) * 0.12); }); if (i % 2 === 0) beacon(beacons, x, SEA + 63, z, '#f33', 8, 0.5); obbs.push([x, z, 3, 3, 1, 0, SEA + 96, 1]); } inst(new THREE.CylinderGeometry(1.1, 2.2, 62, 10).translate(0, 31, 0), TWM, off); }
  // 雪山の岩峰・密林の奇岩 (カルストの塔)・丘の露岩
  landmarks(env2, propGeo('spire2'), RKS, sample(110, (x, z) => mSnow(x, z) > 0.6 && hAt(x, z) > 120 && Math.hypot(x - VILLAGE[0], z - VILLAGE[1]) > 320 && Math.hypot(x - LAKE[0], z - LAKE[1]) > 330).map(([x, z]) => { const hh = 14 + Math.pow(r(), 2) * 80; return [x, hAt(x, z) - hh * 0.08, z, hh * rr(r, 0.8, 1.5), hh, r() * 6.28, rr(r, -0.15, 0.15)]; }), { solid: 0.2 });
  landmarks(env2, propGeo('spire'), RKM, sample(90, (x, z) => mJungle(x, z) > 0.6 && hAt(x, z) > 2 && Math.hypot(x - TEMPLE[0], z - TEMPLE[1]) > 260).map(([x, z]) => { const hh = 40 + Math.pow(r(), 1.6) * 110; return [x, hAt(x, z) - hh * 0.06, z, hh * rr(r, 1.1, 1.9), hh, r() * 6.28, rr(r, -0.08, 0.08)]; }), { solid: 0.2 });
  landmarks(env2, propGeo('butte'), RKT, sample(46, (x, z) => mSea(x, z) < 0.02 && mCity(x, z) < 0.05 && mSnow(x, z) < 0.3 && hAt(x, z) > 4 && !fh.some((f) => Math.hypot(f[0] - x, f[2] - z) < 160) && Math.hypot(x - TEMPLE[0], z - TEMPLE[1]) > 260).map(([x, z]) => { const w = rr(r, 14, 46), hh = rr(r, 6, 22); return [x, hAt(x, z) - hh * 0.3, z, w, hh, r() * 6.28, rr(r, -0.06, 0.06)]; }), { solid: 0.4, land: 1 });
  // 足元: 岩・雪をかぶった岩・苔むした岩・牛の群れ・干し草・遺跡の石柱 / 郊外の住宅地 (窓に明かり)
  const cow = colorGeo([[new THREE.BoxGeometry(0.78, 0.9, 2.0).translate(0, 1.12, 0), 0xe8e4dc], [new THREE.BoxGeometry(0.8, 0.5, 0.8).translate(0, 1.3, 0.3), 0x1c1a1a], [new THREE.BoxGeometry(0.8, 0.4, 0.5).translate(0.01, 1.0, -0.6), 0x1c1a1a], [new THREE.BoxGeometry(0.42, 0.44, 0.56).translate(0, 0.86, -1.32), 0xe8e4dc], [new THREE.BoxGeometry(0.3, 0.2, 0.22).translate(0, 0.72, -1.62), 0xd8a898], [new THREE.BoxGeometry(0.16, 0.7, 0.16).translate(-0.26, 0.35, -0.76), 0xd8d4cc], [new THREE.BoxGeometry(0.16, 0.7, 0.16).translate(0.26, 0.35, -0.76), 0xd8d4cc], [new THREE.BoxGeometry(0.16, 0.7, 0.16).translate(-0.26, 0.35, 0.8), 0xd8d4cc], [new THREE.BoxGeometry(0.16, 0.7, 0.16).translate(0.26, 0.35, 0.8), 0xd8d4cc], [new THREE.BoxGeometry(0.06, 0.6, 0.06).translate(0, 1.0, 1.06), 0x1c1a1a]]);
  const baleG = colorGeo([[new THREE.CylinderGeometry(1.3, 1.3, 1.6, 12).rotateZ(HP).translate(0, 1.25, 0), 0xc8a850]]), pillarG = colorGeo([[new THREE.CylinderGeometry(0.32, 0.38, 2.4, 8).translate(0, 1.2, 0), 0x8a8474], [new THREE.BoxGeometry(0.9, 0.3, 0.9).translate(0, 2.5, 0), 0x7a7468], [new THREE.BoxGeometry(1, 0.3, 1).translate(0, 0.15, 0), 0x7a7468]]);
  const propAt = (x, z, u, v, o) => {
    if (Math.abs(x) > EDGE - 300 || Math.abs(z) > EDGE - 300 || mSea(x, z) > 0.02 || mCity(x, z) > 0.25) return false; const h = hAt(x, z); if (h < 0.6) return false;
    const sn = mSnow(x, z), ju = mJungle(x, z); let k, d, s0 = 0.5, s1 = 4.5;
    if (sn > 0.4) { if (Math.hypot(x - VILLAGE[0], z - VILLAGE[1]) < 225 || Math.hypot(x - LAKE[0], z - LAKE[1]) < 245) return false; k = v < 0.7 ? 1 : 2; d = h > 520 ? 0.5 : 0.2; s1 = 7; }
    else if (ju > 0.4) { if (Math.hypot(x - TEMPLE[0], z - TEMPLE[1]) < 60) return false; k = v < 0.8 ? 3 : 6; d = 0.14; s0 = k === 6 ? 0.8 : 0.5; s1 = k === 6 ? 2.6 : 5; }
    else if (mFarm(x, z) > 0.5) { for (const f of fh) if (Math.abs(f[0] - x) < 50 && Math.abs(f[2] - z) < 50) return false;
      const t = fieldType(x, z), ed = fieldEdge(x, z); if (t >= 0.78 && !ed) { if (u > 0.1) return false; o[0] = 4; o[1] = 0.9 + v * 0.3; o[2] = o[1]; o[3] = h; return true; } if (ed) { k = 0; d = 0.05; s0 = 0.4; s1 = 1.6; } else if (t >= 0.45 && t < 0.62) { k = 5; d = 0.05; s0 = 1; s1 = 1.01; } else return false; }
    else { if (hf && hf.hit(x, z)) return false; k = v < 0.6 ? 0 : 2; d = 0.1; }
    if (u >= d) return false; const q = u / d, sz = s0 + q * q * q * (s1 - s0); o[0] = k; o[1] = sz * (0.8 + v * 0.4); o[2] = sz; o[3] = h; return true;
  };
  const CM = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.02 });
  const pf = new VegField(grp, propAt, { sets: [{ g: propGeo('boulder'), m: RKT, tumble: 1, sink: 0.3, key: 'a' }, { g: propGeo('boulder2'), m: RKS, tumble: 1, sink: 0.25, key: 'b' }, { g: propGeo('slab'), m: RKT, tumble: 0.12, sink: 0.3, key: 'c' }, { g: propGeo('boulder'), m: RKM, tumble: 1, sink: 0.3, key: 'd' }, { g: cow, m: CM(), key: 'v' }, { g: baleG, m: CM(), key: 'v' }, { g: pillarG, m: CM(), tumble: 0.05, key: 'v' }], tile: 260, step: 15, range: 520, solid: 0.8 });
  const WIN = new THREE.Color(4.4, 3, 1.3), WIN2 = new THREE.Color(1.6, 2.2, 3.2);
  const houseA = colorGeo([[new THREE.BoxGeometry(11, 5.5, 8).translate(0, 2.75, 0), 0xd8d2c4], [new THREE.CylinderGeometry(0.01, 7.2, 4.4, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.74).translate(0, 7.7, 0), 0x5a4a4a], [new THREE.BoxGeometry(1.2, 3.4, 1.2).translate(3.4, 8.6, 1), 0x6a5a50], [new THREE.BoxGeometry(1.3, 2.3, 0.12).translate(0, 1.15, 4.02), 0x4a3020], [new THREE.BoxGeometry(1.5, 1.3, 0.1).translate(-3, 3, 4.03), WIN], [new THREE.BoxGeometry(1.5, 1.3, 0.1).translate(3, 3, 4.03), WIN], [new THREE.BoxGeometry(0.1, 1.3, 1.5).translate(5.53, 3, -1), WIN], [new THREE.BoxGeometry(1.5, 1.3, 0.1).translate(2, 3, -4.03), WIN2], [new THREE.BoxGeometry(12, 0.5, 9).translate(0, 0.05, 0), 0x8a8478]]);
  const houseB = colorGeo([[new THREE.BoxGeometry(9, 8, 9).translate(0, 4, 0), 0xb8b0a4], [new THREE.BoxGeometry(9.6, 0.5, 9.6).translate(0, 8.2, 0), 0x3a3a40], [new THREE.BoxGeometry(5, 3.2, 4).translate(6.4, 1.6, 1), 0xa89c8c], [new THREE.BoxGeometry(5.4, 0.3, 4.4).translate(6.4, 3.3, 1), 0x3a3a40], [new THREE.BoxGeometry(1.3, 2.3, 0.12).translate(-1.6, 1.15, 4.52), 0x3a2a20], [new THREE.BoxGeometry(1.6, 1.4, 0.1).translate(2, 2.6, 4.53), WIN], [new THREE.BoxGeometry(1.6, 1.4, 0.1).translate(-2, 6, 4.53), WIN], [new THREE.BoxGeometry(1.6, 1.4, 0.1).translate(2, 6, 4.53), WIN2], [new THREE.BoxGeometry(0.1, 1.4, 1.6).translate(-4.53, 6, 0), WIN], [new THREE.BoxGeometry(0.1, 1.4, 1.6).translate(4.53, 6, -2), WIN], [new THREE.BoxGeometry(10, 0.5, 10).translate(0, 0.05, 0), 0x8a8478]]);
  const houseAt = (x, z, u, v, o) => { if (u > 0.55 || mSea(x, z) > 0.02 || mCity(x, z) > 0.3 || mSnow(x, z) > 0.2 || mJungle(x, z) > 0.2 || mFarm(x, z) > 0.3 || fbm(x * 0.0021, z * 0.0021, 2, 77) > 0.5) return false; const h = hAt(x, z); if (h < 1.6 || Math.abs(hAt(x + 7, z) - h) > 2.2 || Math.abs(hAt(x, z + 7) - h) > 2.2 || Math.abs(hAt(x - 7, z) - h) > 2.2) return false; o[0] = v < 0.55 ? 0 : 1; o[1] = 1; o[2] = 1; o[3] = h - 0.25; return true; };
  // 畑の作物: 麦ととうもろこしを足元に立体で生やす (種類は地面の色と同じ表から決まる)
  const cropAt = (x, z, u, v, o) => { if (mFarm(x, z) < 0.6 || fieldEdge(x, z)) return false; const t = fieldType(x, z); if ((t >= 0.45 && t < 0.62) || t >= 0.78) return false; const h = hAt(x, z); if (h < 2) return false; for (const f of fh) if (Math.abs(f[0] - x) < 46 && Math.abs(f[2] - z) < 46) return false;
    if (t < 0.22 || t >= 0.62) { o[0] = 6; o[1] = 1.0 + v * 0.35; o[2] = 3.1; } else { o[0] = 7; o[1] = 2.1 + v * 0.5; o[2] = 3.0; } o[3] = h - 0.05; return true; };
  const cf = new VegField(grp, cropAt, { tile: 78, step: 2.6, range: 120, sway: 0.03 });
  hf = new VegField(grp, houseAt, { sets: [{ g: houseA, m: CM(), key: 'v' }, { g: houseB, m: CM(), key: 'v' }], tile: 340, step: 34, range: 1700, solid: 7 });
  // ── 海を行く小型船 (航行灯つき) と、各地の空を舞う鳥の群れ ──
  { const boatG = colorGeo([[new THREE.BoxGeometry(3.4, 1.7, 9).translate(0, 0.35, 0.6), 0xe8e4da], [new THREE.ConeGeometry(1.7, 3.6, 4).rotateY(Math.PI / 4).scale(1, 1, 0.47).rotateX(-HP).translate(0, 0.35, -5.6), 0xe8e4da], [new THREE.BoxGeometry(3.5, 0.3, 9.1).translate(0, -0.2, 0.6), 0x8a2a20], [new THREE.BoxGeometry(2.5, 1.7, 3.4).translate(0, 2.0, 2), 0xf4f2ec], [new THREE.BoxGeometry(2.56, 0.6, 3.46).translate(0, 2.3, 2), new THREE.Color(1.6, 1.3, 0.8)], [new THREE.CylinderGeometry(0.06, 0.06, 4.4, 5).translate(0, 5, 1.4), 0x888888], [new THREE.SphereGeometry(0.24, 6, 5).translate(0, 7.2, 1.4), new THREE.Color(7, 6, 4)], [new THREE.SphereGeometry(0.16, 6, 5).translate(-1.6, 1.4, -3), new THREE.Color(6, 0.3, 0.2)], [new THREE.SphereGeometry(0.16, 6, 5).translate(1.6, 1.4, -3), new THREE.Color(0.3, 6, 0.6)]]);
    const NBt = 14, boats = new THREE.InstancedMesh(boatG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 }), NBt), o6 = new THREE.Object3D(), bl = []; boats.frustumCulled = false; grp.add(boats);
    for (let i = 0; i < NBt; i++) bl.push({ off: rr(r, 400, 2600), dir: r() < 0.5 ? 1 : -1, sp: rr(r, 5, 11), ph: r() * 6000, sc: rr(r, 0.9, 1.7) });
    anim.push((dt, t) => { for (let i = 0; i < NBt; i++) { const b = bl[i], x = ((((t * b.sp * b.dir + b.ph) % 7000) + 7000) % 7000) - 3500, z = coast(x) + b.off, z2 = coast(x + b.dir * 4) + b.off; o6.position.set(x, hAt(x, z) > SEA - 2.5 ? -60 : SEA + 0.25 + Math.sin(t * 0.9 + i) * 0.12, z); o6.rotation.set(Math.sin(t * 0.8 + i) * 0.03, Math.atan2(-b.dir * 4, -(z2 - z)), Math.sin(t * 1.1 + i * 2) * 0.05); o6.scale.setScalar(b.sc); o6.updateMatrix(); boats.setMatrixAt(i, o6.matrix); } boats.instanceMatrix.needsUpdate = true; });
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.4, -1.2, 0.14, 0.28, 0, 0, 0.12, 0, 0, -0.4, 0, 0, 0.12, 1.2, 0.14, 0.28], 3));
    const NBd = 72, birds = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: 0x1c1614, side: THREE.DoubleSide }), NBd), cen = [[TEMPLE[0], hAt(TEMPLE[0], TEMPLE[1]) + 85, TEMPLE[1]], [VILLAGE[0], vy + 70, VILLAGE[1]], fh[0] ? [fh[0][0], fh[0][1] + 60, fh[0][2]] : [5600, 80, -900], [880, 60, coast(880) + 160]]; birds.frustumCulled = false; grp.add(birds);
    anim.push((dt, t) => { for (let i = 0; i < NBd; i++) { const f = i % 4, c = cen[f], sg = f % 2 ? 1 : -1, a = t * (0.15 + (i % 5) * 0.012) * sg + i * 0.9, rad = 60 + (i % 7) * 17 + Math.sin(t * 0.3 + i) * 12; o6.position.set(c[0] + Math.cos(a) * rad, c[1] + Math.sin(t * 0.5 + i * 1.3) * 9 + (i % 6) * 5, c[2] + Math.sin(a) * rad); o6.rotation.set(0, sg > 0 ? Math.PI - a : -a, 0); o6.scale.set(1.25, Math.sin(t * 8.5 + i * 1.7) * 2.6, 1.25); o6.updateMatrix(); birds.setMatrixAt(i, o6.matrix); } birds.instanceMatrix.needsUpdate = true; }); }
  // ── 資源 ──
  const nodes = []; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.5, d = 96 + (i % 3) * 32, n = node('#4df0ff', 0.8, 30 + i); n.position.set(Math.cos(a) * d - 20, 0, Math.sin(a) * d + 6); grp.add(n); nodes.push({ g: n, x: n.position.x, z: n.position.z, item: 'elec', label: '電子廃材を回収する' }); }
  const extra = (cx, cz, n, d0, col, item, label, seed) => { for (let i = 0; i < n; i++) { const a = i * 6.283 / n + seed, d = d0 + (i % 2) * d0 * 0.4, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, h = hAt(x, z); if (h < 0.8) continue; const g = node(col, 1, seed * 10 + i); g.position.set(x, h, z); grp.add(g); nodes.push({ g, x, z, item, label }); } };
  extra(TEMPLE[0], TEMPLE[1] + 20, 5, 62, '#6dffb0', 'med', '薬効樹脂を採取する', 3); extra(VILLAGE[0], VILLAGE[1], 4, 34, '#a6f0ff', 'water', '氷河の純水を採取する', 5); if (fh[0]) extra(fh[0][0], fh[0][2], 4, 46, '#ffe14d', 'food', '収穫物を分けてもらう', 7);
  grp.add(B.build());
  /** 地域ごとの天候: 都市=雨 / ジャングル=強い雨 / 雪国=雪 / 農園・海=晴れ */
  const RAIN = V3(6, -46, 2), SNOWV = V3(4, -7, 2), zone = (x, z) => { const sn = mSnow(x, z), ju = mJungle(x, z), ci = mCity(x, z); return sn > 0.4 ? [SNOWV, 0.75 * sn, '#ffffff'] : ju > 0.4 ? [RAIN, 0.7 * ju, '#9fb8c8'] : [RAIN, 0.45 * ci, '#9fb8ff']; };
  const region = (x, z) => (mSnow(x, z) > 0.5 ? '雪国' : mJungle(x, z) > 0.5 ? 'ジャングル' : mFarm(x, z) > 0.5 ? '農園地帯' : mCity(x, z) > 0.5 ? '巨大都市' : mSea(x, z) > 0.5 || Math.max(Math.abs(x), Math.abs(z)) > EDGE - 1300 ? '大洋' : '郊外');
  /** いまいる場所の呼び名 (HUD の見出し) */
  const place = (x, z) => { if (Math.hypot(x, z) < 260) return 'ネオン・ベイ宇宙港'; if (Math.hypot(x - VILLAGE[0], z - VILLAGE[1]) < 420) return '雪見の里'; if (Math.hypot(x - TEMPLE[0], z - TEMPLE[1]) < 320) return '古代遺跡'; if (mSnow(x, z) > 0.5) return '白嶺山地'; if (mJungle(x, z) > 0.5) return '翠の密林'; if (mFarm(x, z) > 0.5) return 'みのり平原';
    if (mCity(x, z) > 0.5) return z > coast(x) - 260 && x > 300 && x < 1500 ? 'ネオン・ベイ港' : 'ネオン・ベイ市街'; return mSea(x, z) > 0.5 || Math.max(Math.abs(x), Math.abs(z)) > EDGE - 1300 ? '大洋' : 'ネオン・ベイ郊外'; };
  const pois = [{ x: 880, y: 40, z: coast(880) + 80, name: '港' }, ...(fh[0] ? [{ x: fh[0][0], y: fh[0][1] + 30, z: fh[0][2], name: '農園地帯' }] : []), { x: VILLAGE[0], y: vy + 40, z: VILLAGE[1], name: '雪見の里' }, { x: TEMPLE[0], y: hAt(TEMPLE[0], TEMPLE[1]) + 70, z: TEMPLE[1], name: '古代遺跡' }];
  return { id: 'terra', group: grp, sky, H, heightAt, sunDir, sunCol: '#ffb078', sunInt: 3.0, hemi: ['#6a6aa8', '#2a2030', 1.25], expo: (x, z) => lerp(1.2, 1.02, mCity(x, z)), fog, fogDen, cols, rects, obbs, decks, items, anim, beacons, nodes, tiles, veg: [vf, uf, pf, hf, cf], zone, region, place, pois, blocked: cityBlocked, padY: 1.1, mirror: [road, 1.6], mirrorOn: (x, y, z) => y < 700 && mCity(x, z) > 0.2, rain: [RAIN, 0.45, '#9fb8ff'], walkR: 1e9, bounds: EDGE - 800, far: 34000, safeAlt: 780, door: [50, 30, -HP], foot: [0, 42], look: [0.42, 1.15, 0.95], music: 'neon', water: SEA, start: [320, 1500, 4300] };
}
