// 共有 GLSL チャンク
export const NOISE = /* glsl */`
float hash13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
vec3 hash33(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
float vnoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p,int oct){float a=.5,s=0.,t=0.;for(int i=0;i<oct;i++){s+=a*vnoise(p);t+=a;p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s/t;}
float ridged(vec3 p,int oct){float a=.5,s=0.,t=0.;for(int i=0;i<oct;i++){float n=1.-abs(vnoise(p)*2.-1.);s+=a*n*n;t+=a;p=p*2.07+vec3(4.1,2.3,7.9);a*=.5;}return s/t;}
vec2 worley2(vec3 p){vec3 i=floor(p),f=fract(p);float d1=9.,d2=9.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){vec3 g=vec3(float(x),float(y),float(z));vec3 o=hash33(i+g);float d=length(g+o-f);
    if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
  return vec2(d1,d2);}
`;

export const FACE = /* glsl */`
vec3 faceDir(int f, vec2 st){
  if(f==0) return vec3(1.,-st.y,-st.x);
  if(f==1) return vec3(-1.,-st.y,st.x);
  if(f==2) return vec3(st.x,1.,st.y);
  if(f==3) return vec3(st.x,-1.,-st.y);
  if(f==4) return vec3(st.x,-st.y,1.);
  return vec3(-st.x,-st.y,-1.);
}`;

export const FSQ_VS = /* glsl */`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;

export const ACES = /* glsl */`
vec3 aces(vec3 x){
  const mat3 m1=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777);
  const mat3 m2=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602);
  vec3 v=m1*x; vec3 a=v*(v+.0245786)-.000090537; vec3 b=v*(.983729*v+.4329510)+.238081;
  return clamp(m2*(a/b),0.,1.);
}`;
