import * as THREE from 'three'

// Bruno-Simon fake-bounce: a matcap material that adds warm pools of light from
// candle points and a soft floor-bounce, entirely in the fragment shader. No
// real-time lights, near-zero cost. This is the #1 lighting tell: surfaces near
// a flame read as lit by it; everything else falls to true black.

// Floor treatments. A flat floor has ONE matcap normal, so its base tone is
// uniform and view-dependent gloss cannot vary across it (proven by the
// baluster: maps that need directional light wash out). So these are all
// VALUE-modulation patterns over a tone matcap, kept MATTE. Seams use fwidth()
// for derivative-aware width -> ~1px at any distance, which kills the grazing-
// angle shimmer/moire that reads as a game-engine grid. `s` returns the GLSL.
// An original Persian/Savonnerie-idiom runner, built as colour+value albedo over
// the matte wool matcap (the matcap gives constant floor shading; the candle
// bounce adds warm pools; this `col` carries the rug's own palette). Two detail
// tiers so max-intricacy and a clean-reading version can be compared. cfg knobs
// drive motif scale/density; everything seams with kbAA so it antialiases.
const RUG_MAX = { border: 0.56, lattice: true, lp: 0.50, petals: 8.0, petalR: 0.085, petalAmp: 0.05, coreR: 0.026, mp: 6.0, medR: 0.95, medAmp: 0.10, lobes: 12.0, medInner: 0.55, medPetals: 12.0, borderRep: 0.62, guards: true, gain: 1.55 }
const RUG_CLEAN = { border: 0.60, lattice: true, lp: 0.98, petals: 6.0, petalR: 0.17, petalAmp: 0.07, coreR: 0.05, mp: 6.0, medR: 1.00, medAmp: 0.12, lobes: 8.0, medInner: 0.60, medPetals: 8.0, borderRep: 1.10, guards: false, gain: 1.55 }
function rugGLSL(cfg, RUN) {
  const f = (n) => n.toFixed(3)
  const fieldHW = RUN - cfg.border
  const bandMid = (fieldHW + RUN) * 0.5
  return `
    float ax=abs(vWPos.x); float ez=vWPos.z;
    vec3 cField=vec3(0.42,0.10,0.10);   // burgundy field
    vec3 cBord =vec3(0.10,0.13,0.34);   // navy border / medallion ground
    vec3 cGold =vec3(0.70,0.52,0.20);
    vec3 cIv   =vec3(0.85,0.78,0.60);
    vec3 col=cField;
    float fieldHW=${f(fieldHW)};
    float inField=1.0-kbAA(ax-fieldHW);
    float inRug=1.0-kbAA(ax-${f(RUN)});
    ${cfg.lattice ? `
    // offset-row rosette lattice filling the field
    float lp=${f(cfg.lp)};
    float rrow=floor(ez/lp); float offx=mod(rrow,2.0)*0.5*lp;
    vec2 gc=(fract(vec2((vWPos.x+offx)/lp, ez/lp))-0.5)*lp;
    float rr=length(gc); float ga=atan(gc.y,gc.x);
    float petal=${f(cfg.petalR)}+${f(cfg.petalAmp)}*cos(${f(cfg.petals)}*ga);
    col=mix(col,cGold,(1.0-kbAA(rr-petal))*inField*0.95);
    col=mix(col,cIv,(1.0-kbAA(rr-${f(cfg.coreR)}))*inField);
    ` : ''}
    // medallion sequence down the centreline
    float mp=${f(cfg.mp)};
    float mz=ez-(floor(ez/mp)+0.5)*mp;
    vec2 q=vec2(vWPos.x,mz); float mr=length(q); float ma=atan(q.y,q.x);
    float lobe=${f(cfg.medR)}+${f(cfg.medAmp)}*cos(${f(cfg.lobes)}*ma);
    float med=(1.0-kbAA(mr-lobe))*inField;
    col=mix(col,cBord,med);
    col=mix(col,cGold,(1.0-kbAA(abs(mr-(lobe-0.05))-0.02))*med);
    col=mix(col,cField,(1.0-kbAA(mr-${f(cfg.medInner)}))*med);
    float petc=${f(cfg.medInner - 0.05)}+0.05*cos(${f(cfg.medPetals)}*ma);
    col=mix(col,cIv,(1.0-kbAA(mr-petc))*med*0.92);
    col=mix(col,cGold,(1.0-kbAA(mr-0.045))*med);
    // multi-band border frame down the long edges
    float bord=inRug*kbAA(ax-fieldHW);
    col=mix(col,cBord,bord);
    float bcz=ez-(floor(ez/${f(cfg.borderRep)})+0.5)*${f(cfg.borderRep)};
    float bdist=abs(ax-${f(bandMid)})+abs(bcz);          // L1 diamond row
    col=mix(col,cGold,(1.0-kbAA(bdist-0.11))*bord);
    col=mix(col,cIv,(1.0-kbAA(bdist-0.045))*bord);
    // guard stripes at the band boundaries
    col=mix(col,cIv,(1.0-kbAA(abs(ax-(fieldHW+0.03))-0.016))*inRug);
    col=mix(col,cGold,(1.0-kbAA(abs(ax-(${f(RUN)}-0.045))-0.013))*inRug);
    ${cfg.guards ? `col=mix(col,cIv,(1.0-kbAA(abs(ax-(${f(RUN)}-0.10))-0.009))*inRug);` : ''}
    col=mix(cField,col,inRug);
    float pile=0.90+0.10*kbN(vec3(vWPos.x*8.0,ez*8.0,3.0));
    gl_FragColor.rgb *= col*pile*${f(cfg.gain)};`
}

function floorBranchGLSL(style, S, RUN) {
  const f = (n) => n.toFixed(3)
  if (style === 'rugmax') return rugGLSL(RUG_MAX, RUN)
  if (style === 'rugclean') return rugGLSL(RUG_CLEAN, RUN)
  if (style === 'planks') {
    // boards run down the hall (Z), staggered end joints, per-board tone
    return `float pw=${f(0.62)}, pl=${f(3.6)};
      float bx=vWPos.x/pw; float board=floor(bx);
      float stag=kbN(vec3(board*1.7,5.0,2.0))*pl;
      float bz=(vWPos.z+stag)/pl; float zc=floor(bz);
      float ex=min(fract(bx),1.0-fract(bx))*pw;
      float ez=min(fract(bz),1.0-fract(bz))*pl;
      float seam=kbAA(min(ex,ez)-0.010);
      float tone=0.74+0.26*kbN(vec3(board*2.3,zc*1.9,7.0));
      float grain=0.94+0.06*sin((vWPos.z+stag)*22.0);
      gl_FragColor.rgb *= mix(0.30,1.0,seam)*tone*grain;`
  }
  if (style === 'parquet') {
    // basket-weave squares, grain direction alternating per square
    return `float sq=${f(1.15)}; float ux=vWPos.x/sq, uz=vWPos.z/sq;
      float ix=floor(ux), iz=floor(uz); float chk=mod(ix+iz,2.0);
      float ex=min(fract(ux),1.0-fract(ux))*sq;
      float ez=min(fract(uz),1.0-fract(uz))*sq;
      float seam=kbAA(min(ex,ez)-0.010);
      float gdir = chk>0.5 ? vWPos.x : vWPos.z;
      float strips=0.91+0.09*sin(gdir*34.0);
      float tone=0.80+0.20*kbN(vec3(ix*1.7,iz*2.1,3.0));
      gl_FragColor.rgb *= mix(0.32,1.0,seam)*strips*tone;`
  }
  if (style === 'marble') {
    // honed (not polished) slabs with subtle warped veining
    return `float S=${f(S)};
      float ex=min(fract(vWPos.x/S),1.0-fract(vWPos.x/S))*S;
      float ez=min(fract(vWPos.z/S),1.0-fract(vWPos.z/S))*S;
      float seam=kbAA(min(ex,ez)-0.015);
      float vn=kbN(vec3(vWPos.x*0.35,vWPos.z*0.35,0.0))*0.6+kbN(vec3(vWPos.x*1.3+4.0,vWPos.z*1.3,2.0))*0.4;
      float vein=1.0-kbAA(abs(fract(vn*2.5)-0.5)-0.02);
      gl_FragColor.rgb *= mix(0.66,1.0,seam)*(0.93+0.07*vn);
      gl_FragColor.rgb += gl_FragColor.rgb*vein*0.16;`
  }
  if (style === 'carpet') {
    // matte wool pile + fine weave + an inset woven border near the runner edge
    return `float pile=0.84+0.16*kbN(vec3(vWPos.x*7.0,vWPos.z*7.0,4.0));
      float weave=0.97+0.03*sin(vWPos.x*38.0)*sin(vWPos.z*38.0);
      gl_FragColor.rgb *= pile*weave;
      float bord=1.0-kbAA(abs(abs(vWPos.x)-(${f(RUN)}-0.22))-0.02);
      gl_FragColor.rgb += gl_FragColor.rgb*bord*0.30;`
  }
  if (style === 'paleslab') {
    // large severe ashlar slabs for the pale Return floor: matte, value-only seams
    // (no colour - colour is rug vocabulary, wrong for Register 3 stone). Big slabs
    // + faint grout give a readable ground plane and scale without reading busy.
    return `float S=${f(S)};
      float ex=min(fract(vWPos.x/S),1.0-fract(vWPos.x/S))*S;
      float ez=min(fract(vWPos.z/S),1.0-fract(vWPos.z/S))*S;
      float seam=kbAA(min(ex,ez)-0.020);
      float wear=0.93+0.07*kbN(vec3(vWPos.x*0.6,vWPos.z*0.6,5.0));
      gl_FragColor.rgb *= mix(0.60,1.0,seam)*wear;`
  }
  // flagstone (default): square slabs, AA grout, gentle wear
  return `float S=${f(S)};
    float ex=min(fract(vWPos.x/S),1.0-fract(vWPos.x/S))*S;
    float ez=min(fract(vWPos.z/S),1.0-fract(vWPos.z/S))*S;
    float seam=kbAA(min(ex,ez)-0.014);
    float wear=0.86+0.14*sin(vWPos.x*1.7)*sin(vWPos.z*1.3);
    gl_FragColor.rgb *= mix(0.42,1.0,seam)*wear;`
}

export function makeEstateMatcap(matcapTex, lights, opts = {}) {
  const warm = new THREE.Color(opts.warm || '#ff9436')
  const range = opts.range ?? 7.0
  const strength = opts.strength ?? 2.6
  const floorBounce = opts.floorBounce ?? 0.13
  const N = Math.max(1, lights.length)
  const floor = !!opts.floor
  const flagSize = opts.flagSize ?? 3.2
  const floorStyle = opts.floorStyle || 'flagstone'
  const runnerHalf = opts.runnerHalf ?? 2.0

  const mat = new THREE.MeshMatcapMaterial({ matcap: matcapTex, fog: true })
  // Optional baked maps for dropped-in models: a colour map mottles the matcap
  // result; a tangent normalMap perturbs the normal the matcap is sampled by, so
  // baked surface relief reads even with no real-time lights. Existing estate
  // callers pass neither, so their material (and cache key) are unchanged.
  if (opts.map) {
    opts.map.colorSpace = THREE.SRGBColorSpace
    mat.map = opts.map
  }
  if (opts.normalMap) {
    mat.normalMap = opts.normalMap
    if (opts.normalScale) mat.normalScale = opts.normalScale
  }
  const uniforms = {
    uLights: { value: lights.map((l) => new THREE.Vector3(l[0], l[1], l[2])) },
    uWarm: { value: warm },
    uRange: { value: range },
    uStrength: { value: strength },
    uFloor: { value: floorBounce },
    uTime: { value: 0 },
  }
  mat.userData.uniforms = uniforms

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWNrm;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  vWNrm = normalize(mat3(modelMatrix) * objectNormal);',
    )
    shader.fragmentShader =
      `varying vec3 vWPos;
       varying vec3 vWNrm;
       uniform vec3 uLights[${N}];
       uniform vec3 uWarm;
       uniform float uRange;
       uniform float uStrength;
       uniform float uFloor;
       uniform float uTime;
       float kbHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
       float kbN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
         return mix(mix(mix(kbHash(i),kbHash(i+vec3(1,0,0)),f.x),mix(kbHash(i+vec3(0,1,0)),kbHash(i+vec3(1,1,0)),f.x),f.y),
                    mix(mix(kbHash(i+vec3(0,0,1)),kbHash(i+vec3(1,0,1)),f.x),mix(kbHash(i+vec3(0,1,1)),kbHash(i+vec3(1,1,1)),f.x),f.y),f.z); }
       // derivative-aware edge: ~1px seams at any distance, no mip shimmer
       float kbAA(float d){ return smoothstep(0.0, fwidth(d)*1.6 + 1e-5, d); }\n` +
      shader.fragmentShader.replace(
        '#include <fog_fragment>',
        `vec3 bounce = vec3(0.0);
         for (int i = 0; i < ${N}; i++) {
           vec3 lp = uLights[i];
           float d = distance(vWPos, lp);
           float fl = 0.84 + 0.16 * sin(uTime * 8.0 + lp.x * 3.1 + lp.z * 0.7);
           bounce += uWarm * exp(-(d * d) / (uRange * uRange)) * fl;
         }
         // Bruno-Simon indirect tint: warm floor-bounce concentrated on
         // down-facing surfaces near the floor (under capitals, beams, arch
         // soffits) where real radiosity from a warm floor would land.
         float down = clamp(-vWNrm.y * 1.5 + 0.55, 0.0, 1.0);
         bounce += uWarm * uFloor * smoothstep(9.0, 0.0, vWPos.y) * (0.35 + 1.0 * down);
         ${floor ? floorBranchGLSL(floorStyle, flagSize, runnerHalf) : ''}
         // tarnish: mottled aging on every surface, worked-surface density
         float tar = kbN(vWPos * 0.55) * 0.6 + kbN(vWPos * 2.4) * 0.4;
         gl_FragColor.rgb *= 0.74 + 0.26 * tar;
         gl_FragColor.rgb += gl_FragColor.rgb * bounce * uStrength + bounce * 0.1;
         #include <fog_fragment>`,
      )
  }
  // Each floor style injects a different fragment shader; without encoding it
  // here three would compile one program for this key and reuse it for every
  // style (and for the walls), silently rendering the wrong pattern.
  mat.customProgramCacheKey = () =>
    'estate-matcap-' + N + (mat.map ? '-m' : '') + (mat.normalMap ? '-n' : '') +
    (floor ? '-f-' + floorStyle : '')
  return mat
}
