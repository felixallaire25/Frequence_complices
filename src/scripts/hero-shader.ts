/**
 * Hero de l'accueil : relief de lignes d'ondes en perspective (WebGL, OGL).
 *
 * - Un terrain noir (invisible) cache les lignes situées derrière les crêtes,
 *   ce qui donne l'impression de relief.
 * - Chaque ligne est un ruban fin dessiné à l'écran (épaisseur en pixels).
 * - Quatre bandes de couleur (les accents de la charte) traversent le relief
 *   en serpentant et se mélangent là où elles se croisent.
 * - Le curseur soulève doucement le relief et crée une petite onde.
 */
import { Renderer, Camera, Geometry, Program, Mesh, Transform } from 'ogl';

type Options = {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Appelé au premier rendu (pour faire apparaître le canvas). */
  onReady?: () => void;
  /** Appelé si l'appareil est trop lent : on repasse à l'image. */
  onTooSlow?: () => void;
};

// Bruit simplex 3D — Ian McEwan, Ashima Arts (licence MIT)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// Relief, couleurs et brouillard, partagés par le terrain et les lignes.
// p.x = position horizontale, p.y = profondeur (z du monde, négatif = loin)
const FIELD = /* glsl */ `
uniform float uTime;
uniform vec3 uMouse;     // x, z dans le monde ; intensité
uniform float uNear;
uniform float uFar;

float height(vec2 p){
  float t = uTime;
  float depth = clamp((uNear - p.y) / (uNear - uFar), 0.0, 1.0); // 0 devant, 1 au fond
  // grandes ondulations lentes
  float n = snoise(vec3(p.x * 0.22, p.y * 0.26 + t * 0.045, t * 0.05)) * 0.62
          + snoise(vec3(p.x * 0.55 + 3.1, p.y * 0.5 - t * 0.03, t * 0.08)) * 0.22;
  // « onde sonore » : oscillation fine dont l'enveloppe se déplace
  float env = smoothstep(-0.2, 0.9, snoise(vec3(p.x * 0.16 - t * 0.07, p.y * 0.2, 4.2)));
  float wave = sin(p.x * 4.2 - t * 1.25 + p.y * 0.9) * (0.5 + 0.5 * sin(p.x * 0.9 + t * 0.4)) * 0.16 * env;
  // plus de relief au centre, plus calme sur les bords
  float centre = 0.55 + 0.75 * exp(-p.x * p.x * 0.028);
  float h = (n + wave) * centre * mix(0.45, 1.25, smoothstep(0.0, 0.6, depth));
  // le curseur soulève le relief et propage une petite onde
  vec2 d = p - uMouse.xy;
  float r2 = dot(d, d);
  h += uMouse.z * (0.42 * exp(-r2 * 0.75) + 0.07 * sin(sqrt(r2) * 4.5 - t * 2.6) * exp(-r2 * 0.22));
  return h;
}

const vec3 C0 = vec3(1.0, 0.361, 0.541);   // #FF5C8A
const vec3 C1 = vec3(1.0, 0.702, 0.278);   // #FFB347
const vec3 C2 = vec3(0.310, 0.890, 0.824); // #4FE3D2
const vec3 C3 = vec3(0.541, 0.580, 1.0);   // #8A94FF

float band(vec2 p, float k){
  float t = uTime;
  float zc = mix(uNear - 1.2, uFar * 0.62, (k + 0.5) / 4.0)
           + sin(p.x * 0.23 + t * 0.21 + k * 1.9) * 1.9
           + sin(p.x * 0.09 - t * 0.12 + k * 4.1) * 1.4;
  float w = 1.35 + 0.45 * sin(t * 0.3 + k * 2.3 + p.x * 0.15);
  float g = (p.y - zc) / w;
  return exp(-g * g);
}

// Mélange des bandes : là où elles se croisent, les teintes se fondent
// (moyenne pondérée) au lieu de s'additionner vers le blanc.
vec4 bands(vec2 p){
  float w0 = band(p, 0.0), w1 = band(p, 1.0), w2 = band(p, 2.0), w3 = band(p, 3.0);
  float total = w0 + w1 + w2 + w3;
  vec3 c = (C0 * w0 + C1 * w1 + C2 * w2 + C3 * w3) / max(total, 1e-4);
  return vec4(c, clamp(total, 0.0, 1.0));
}

// atténuation avec la distance (et sur les bords gauche/droite)
float fog(vec2 p){
  float depth = clamp((uNear - p.y) / (uNear - uFar), 0.0, 1.0);
  return (1.0 - smoothstep(0.55, 1.0, depth)) * smoothstep(0.0, 0.12, depth);
}
`;

const TERRAIN_VS = /* glsl */ `
precision highp float;
attribute vec2 aPos;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
${NOISE}
${FIELD}
varying vec2 vP;
void main(){
  vP = aPos;
  vec3 pos = vec3(aPos.x, height(aPos), aPos.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const TERRAIN_FS = /* glsl */ `
precision highp float;
${FIELD.replace(/float height[\s\S]*?\n}\n/, '')}
varying vec2 vP;
void main(){
  // léger halo coloré sur la surface, entre les lignes
  vec4 b = bands(vP);
  vec3 c = b.rgb * b.a * 0.05 * fog(vP);
  gl_FragColor = vec4(vec3(0.0235) + c, 1.0);
}
`;

const LINES_VS = /* glsl */ `
precision highp float;
attribute vec2 aPos;
attribute float aSide;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uRes;      // taille du canvas en pixels réels
uniform float uWidth;   // demi-épaisseur de base, en pixels réels
uniform float uStep;    // pas horizontal entre deux points
${NOISE}
${FIELD}
varying vec2 vP;
varying float vEdge;
varying float vHalf;
varying float vH;
void main(){
  vP = aPos;
  float h = height(aPos);
  vH = h;
  vec2 pn = aPos + vec2(uStep, 0.0);
  vec4 c0 = projectionMatrix * modelViewMatrix * vec4(aPos.x, h, aPos.y, 1.0);
  vec4 c1 = projectionMatrix * modelViewMatrix * vec4(pn.x, height(pn), pn.y, 1.0);
  vec2 s0 = c0.xy / c0.w * uRes * 0.5;
  vec2 s1 = c1.xy / c1.w * uRes * 0.5;
  vec2 dir = normalize(s1 - s0 + vec2(1e-5, 0.0));
  vec2 nrm = vec2(-dir.y, dir.x);
  float depth = clamp((uNear - aPos.y) / (uNear - uFar), 0.0, 1.0);
  float hw = uWidth * mix(1.45, 0.55, depth);  // plus fin au loin
  vHalf = hw;
  vEdge = aSide;
  c0.xy += nrm * aSide * (hw + 1.0) / (uRes * 0.5) * c0.w;
  c0.z -= 0.0015 * c0.w; // passe juste devant le terrain
  gl_Position = c0;
}
`;

const LINES_FS = /* glsl */ `
precision highp float;
${FIELD.replace(/float height[\s\S]*?\n}\n/, '')}
varying vec2 vP;
varying float vEdge;
varying float vHalf;
varying float vH;
void main(){
  // anticrénelage : bord doux sur 1 pixel
  float d = abs(vEdge) * (vHalf + 1.0);
  float a = clamp(vHalf + 0.5 - d, 0.0, 1.0);
  vec4 b = bands(vP);
  vec3 base = vec3(0.17, 0.165, 0.155);
  vec3 col = mix(base, b.rgb * 0.95, b.a);
  col *= 0.78 + 0.3 * clamp(vH + 0.4, 0.0, 1.2);  // crêtes un peu plus lumineuses
  col *= fog(vP);
  // un peu de lumière près du curseur
  vec2 dm = vP - uMouse.xy;
  col *= 1.0 + 0.5 * uMouse.z * exp(-dot(dm, dm) * 0.5);
  gl_FragColor = vec4(col * a, a);
}
`;

export function startHero(opts: Options) {
  const { container, canvas, onReady, onTooSlow } = opts;
  const smallScreen = () => container.clientWidth < 700;

  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    antialias: false,
    powerPreference: 'low-power',
  });
  const gl = renderer.gl;
  gl.clearColor(0.0235, 0.0235, 0.0235, 1);

  const NEAR = 1.6;
  const FAR = -13;
  let X = 12; // demi-largeur du relief (adaptée à l'écran)

  const camera = new Camera(gl, { fov: 38, near: 0.1, far: 40 });
  const scene = new Transform();

  const uniforms = {
    uTime: { value: 18 },
    uMouse: { value: [0, -3, 0] },
    uNear: { value: NEAR },
    uFar: { value: FAR },
    uRes: { value: [1, 1] },
    uWidth: { value: 1 },
    uStep: { value: 0.1 },
  };

  let terrain: Mesh | null = null;
  let lines: Mesh | null = null;

  function build() {
    const small = smallScreen();
    const LINES = small ? 46 : 60;
    // un point tous les ~7 cm du relief, plafonné
    const SEG = Math.min(240, Math.ceil((2 * X) / 0.08));
    const step = (2 * X) / SEG;
    uniforms.uStep.value = step;

    // Terrain : grille plus fine en profondeur que les lignes
    const TZ = LINES * 3;
    const tPos = new Float32Array((SEG + 1) * (TZ + 1) * 2);
    let k = 0;
    for (let iz = 0; iz <= TZ; iz++) {
      const z = NEAR + ((FAR - NEAR) * iz) / TZ;
      for (let ix = 0; ix <= SEG; ix++) {
        tPos[k++] = -X + ix * step;
        tPos[k++] = z;
      }
    }
    const tIdx = new Uint16Array(SEG * TZ * 6);
    k = 0;
    for (let iz = 0; iz < TZ; iz++) {
      for (let ix = 0; ix < SEG; ix++) {
        const a = iz * (SEG + 1) + ix;
        const b = a + SEG + 1;
        tIdx.set([a, b, a + 1, b, b + 1, a + 1], k);
        k += 6;
      }
    }

    // Lignes : rubans de 2 sommets par point
    const lPos = new Float32Array(LINES * (SEG + 1) * 2 * 2);
    const lSide = new Float32Array(LINES * (SEG + 1) * 2);
    const lIdx = new Uint16Array(LINES * SEG * 6);
    let p = 0;
    let s = 0;
    k = 0;
    for (let il = 0; il < LINES; il++) {
      const z = NEAR + ((FAR - NEAR) * (il + 0.5)) / LINES;
      const base = il * (SEG + 1) * 2;
      for (let ix = 0; ix <= SEG; ix++) {
        const x = -X + ix * step;
        lPos.set([x, z, x, z], p);
        p += 4;
        lSide[s++] = -1;
        lSide[s++] = 1;
        if (ix < SEG) {
          const a = base + ix * 2;
          lIdx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], k);
          k += 6;
        }
      }
    }

    terrain?.setParent(null);
    lines?.setParent(null);

    terrain = new Mesh(gl, {
      geometry: new Geometry(gl, {
        aPos: { size: 2, data: tPos },
        index: { data: tIdx },
      }),
      program: new Program(gl, { vertex: TERRAIN_VS, fragment: TERRAIN_FS, uniforms, cullFace: false }),
      frustumCulled: false,
    });
    terrain.setParent(scene);

    const lineProgram = new Program(gl, {
      vertex: LINES_VS,
      fragment: LINES_FS,
      uniforms,
      cullFace: false,
      transparent: true,
      depthWrite: false,
    });
    lineProgram.setBlendFunc(gl.ONE, gl.ONE); // les couleurs s'additionnent
    lines = new Mesh(gl, {
      geometry: new Geometry(gl, {
        aPos: { size: 2, data: lPos },
        aSide: { size: 1, data: lSide },
        index: { data: lIdx },
      }),
      program: lineProgram,
      frustumCulled: false,
    });
    lines.setParent(scene);
  }

  let built = '';
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    uniforms.uWidth.value = 0.75 * renderer.dpr;
    camera.perspective({ aspect: w / h });
    // cadrage : sur mobile on recule un peu pour garder du relief à l'écran
    const small = smallScreen();
    const camZ = small ? 4.4 : 3.6;
    camera.position.set(0, small ? 2.5 : 2.2, camZ);
    camera.lookAt([0, -0.7, -5]);
    // largeur visible au fond de la scène → largeur du relief à construire
    const halfFar = Math.tan((38 / 2) * (Math.PI / 180)) * (w / h) * (camZ - FAR);
    X = Math.min(12, Math.max(3.5, Math.ceil(halfFar * 1.1)));
    const key = `${small}-${X}`;
    if (built !== key) {
      build();
      built = key;
    }
  }

  // ---- Souris (amortie) ----
  const target = { x: 0, z: -3, s: 0 };
  const mouse = { x: 0, z: -3, s: 0 };
  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch') return;
    const r = container.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) {
      target.s = 0;
      return;
    }
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = (e.clientY - r.top) / r.height;
    // approximation simple de l'écran vers le relief
    target.x = nx * X * 0.5 * (1.2 - ny * 0.5);
    target.z = NEAR - 0.8 - (1 - Math.min(ny / 0.75, 1)) * 9;
    target.s = 1;
  }
  function onPointerLeave() {
    target.s = 0;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);

  // ---- Boucle d'animation ----
  let raf = 0;
  let running = false;
  let last = performance.now();
  let first = true;
  const slow = { frames: 0, total: 0 };

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    uniforms.uTime.value += dt;

    const ease = 1 - Math.exp(-dt * 3);
    mouse.x += (target.x - mouse.x) * ease;
    mouse.z += (target.z - mouse.z) * ease;
    mouse.s += (target.s - mouse.s) * (1 - Math.exp(-dt * 1.5));
    uniforms.uMouse.value = [mouse.x, mouse.z, mouse.s];

    renderer.render({ scene, camera, sort: false });

    if (first) {
      first = false;
      onReady?.();
    } else if (slow.frames < 90) {
      // garde-fou : si l'appareil peine (< 20 images/s), on arrête
      slow.frames++;
      slow.total += dt;
      if (slow.frames === 90 && slow.total / 90 > 0.05) {
        destroy();
        onTooSlow?.();
      }
    }
  }

  function play() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !document.hidden) play();
    else pause();
  });
  io.observe(container);
  const onVisibility = () => (document.hidden || !visible ? pause() : play());
  document.addEventListener('visibilitychange', onVisibility);

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  function destroy() {
    pause();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  return { destroy };
}
