/**
 * The landing page's WebGL backdrop: procedural ridged-noise terrain shaded as a
 * topographic contour field, a stacked cairn of five displaced icosahedra lit by a
 * single accent orb, a night sky, and drifting motes.
 *
 * Ported from the Claude Design source (`cairn-scene.js`, a custom element that
 * lazy-loaded three.js from a CDN). Here it is a plain class with no framework and
 * no network dependency - three comes from the bundle, pinned to the same 0.184.0
 * the design rendered against, because the shaders below are sensitive to three's
 * color-management defaults. `CairnScene.tsx` is the thin React wrapper that owns
 * its lifetime.
 *
 * Cost: one draw call per object per frame (terrain, five rocks, orb, moon, two
 * point clouds, five sprites), all trivially GPU-bound. The terrain is a single
 * 220x220 PlaneGeometry displaced in the vertex shader, so the height field is
 * evaluated on the GPU and never touches the CPU or a per-frame buffer upload; the
 * only per-frame CPU work is a handful of uniform writes. Contour lines are
 * computed analytically from the same height function in the fragment shader with
 * a screen-space-derivative-free line width (`uPixelScale` times depth times a
 * grazing-angle term), which keeps line weight roughly constant in pixels instead
 * of collapsing into aliasing at the horizon.
 */
import * as THREE from "three";

const NOISE = `
  float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i), b = hash21(i+vec2(1.0,0.0)), c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float ridged(vec2 p){
    float s = 0.0, a = 0.5;
    mat2 m = mat2(0.80,0.60,-0.60,0.80);
    for(int i=0;i<5;i++){
      float n = vnoise(p)*2.0-1.0;
      s += a*(1.0-abs(n));
      p = m*p*2.03; a *= 0.5;
    }
    return s;
  }`;

const HEIGHT = `
  uniform float uTime, uDrift, uPointerAmt, uRelief;
  uniform vec2 uPointer;
  float terrainHeight(vec2 xz){
    vec2 q = xz*0.042 + vec2(uDrift*0.010, uDrift*0.006);
    float h = ridged(q);
    h = pow(max(h*0.60, 0.0), 1.70) * 9.5 * uRelief;
    float d = length(xz);
    h *= smoothstep(11.0, 36.0, d);                // wide clearing around the cairn
    h *= 1.0 - 0.30*smoothstep(95.0, 165.0, d);
    h *= 1.0 + 0.035*sin(uTime*0.09 + d*0.045);    // breathing
    vec2 pd = xz - uPointer;
    h += uPointerAmt * 0.85 * exp(-dot(pd,pd)*0.016) * smoothstep(9.0, 22.0, d);
    return h;
  }`;

const TERRAIN_VERT =
  NOISE +
  HEIGHT +
  `
  varying vec3 vWorld;
  varying vec3 vNormal2;
  varying float vH, vRad, vDepth, vGrad;
  varying vec2 vLocal;
  void main(){
    vec3 p = position;
    vLocal = position.xy;
    float h = terrainHeight(p.xy);
    p.z = h;
    vec4 world = modelMatrix * vec4(p,1.0);
    float e = 0.55;
    float hx = terrainHeight(position.xy + vec2(e,0.0));
    float hy = terrainHeight(position.xy + vec2(0.0,e));
    vec3 tx = vec3(e, 0.0, hx-h);
    vec3 ty = vec3(0.0, e, hy-h);
    vec3 nLocal = normalize(cross(tx,ty));
    vGrad = length(vec2(hx-h, hy-h))/e;
    vNormal2 = normalize(mat3(modelMatrix) * nLocal);
    vWorld = world.xyz;
    vH = h;
    vRad = length(position.xy);
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

const TERRAIN_FRAG =
  `
  precision highp float;` +
  NOISE +
  HEIGHT +
  `
  uniform vec3 uAccent, uPurple, uBg, uOrb;
  uniform float uDensity, uPixelScale;
  varying vec3 vWorld;
  varying vec3 vNormal2;
  varying float vH, vRad, vDepth, vGrad;
  varying vec2 vLocal;
  void main(){
    vec3 N = normalize(vNormal2);
    vec3 L = normalize(vec3(-0.45, 0.62, -0.72));
    float lam = max(dot(N,L), 0.0);
    vec3 col = vec3(0.036,0.039,0.024) + uPurple * 0.115 * pow(lam, 1.4);
    col += uPurple * 0.05 * pow(max(N.y, 0.0), 3.0);

    vec3 toOrb = uOrb - vWorld;
    float od = length(toOrb);
    float atten = 1.0/(1.0 + od*od*0.30);
    float olam = max(dot(N, toOrb/od), 0.0);
    col += uAccent * olam * atten * 0.46;

    // world footprint of one pixel here, widened at grazing angles
    vec3 Vv = normalize(cameraPosition - vWorld);
    float graze = 1.0 / max(dot(N, Vv), 0.09);
    float pw = max(vDepth * uPixelScale * graze, 1e-4);

    float hf = terrainHeight(vLocal);
    float hv = hf*uDensity - uDrift*0.030;
    float lw = max(vGrad*uDensity*pw, 1e-4);
    float line = 1.0 - smoothstep(0.35, 1.25, abs(fract(hv)-0.5)/lw);
    line *= smoothstep(0.035, 0.30, vGrad) * (1.0 - smoothstep(70.0, 140.0, vDepth));

    float rr = vRad*0.26 - uDrift*0.045;
    float rw = max(0.26*pw*sqrt(1.0+vGrad*vGrad), 1e-4);
    float ring = 1.0 - smoothstep(0.6, 1.9, abs(fract(rr)-0.5)/rw);
    ring *= smoothstep(2.2, 7.0, vRad) * (1.0 - smoothstep(18.0, 46.0, vRad));

    float near = 1.0/(1.0 + od*od*0.030);
    col += uAccent * line * (0.10 + 0.46*near);
    col += mix(uAccent, uPurple, 0.45) * ring * 0.19;

    vec2 pd = vLocal - uPointer;
    col += uAccent * line * uPointerAmt * exp(-dot(pd,pd)*0.010) * 0.45;

    float fog = smoothstep(46.0, 178.0, vDepth);
    col = mix(col, uBg, fog);
    gl_FragColor = vec4(col, 1.0);
  }`;

const ROCK_VERT = `
  varying vec3 vNw, vWp;
  void main(){
    vNw = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWp = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const ROCK_FRAG = `
  precision highp float;
  uniform vec3 uAccent, uPurple, uOrb, uBg;
  varying vec3 vNw, vWp;
  void main(){
    vec3 N = normalize(vNw);
    vec3 V = normalize(cameraPosition - vWp);
    float lam = max(dot(N, normalize(vec3(-0.45,0.62,-0.72))), 0.0);
    vec3 col = vec3(0.037,0.040,0.025) + uPurple * 0.13 * lam;
    vec3 toOrb = uOrb - vWp;
    float od = length(toOrb);
    float atten = 1.0/(1.0 + od*od*0.20);
    col += uAccent * max(dot(N, toOrb/od), 0.0) * atten * 1.15;
    col += uPurple * 0.11 * max(N.y, 0.0);
    float fres = pow(1.0 - max(dot(N,V), 0.0), 3.2);
    col += mix(uAccent, vec3(0.90,0.93,0.78), 0.20) * fres * 0.34;
    col += uAccent * 0.16 * pow(max(N.y, 0.0), 1.4) * atten * 1.6;
    col += uPurple * 0.05 * smoothstep(0.0, 4.0, vWp.y);
    gl_FragColor = vec4(col, 1.0);
  }`;

const PART_VERT = `
  attribute float seed;
  uniform float uTime, uSize;
  varying float vA;
  void main(){
    vec3 p = position;
    p.y += sin(uTime*0.05 + seed*6.283)*0.7;
    p.x += cos(uTime*0.031 + seed*4.1)*0.5;
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    gl_PointSize = (0.45 + seed*0.9) * uSize / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
    vA = 0.18 + 0.55*abs(sin(uTime*0.17 + seed*11.0));
  }`;

const PART_FRAG = `
  precision mediump float;
  uniform vec3 uAccent;
  varying float vA;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = (1.0 - smoothstep(0.18, 0.5, d)) * vA;
    vec3 col = mix(vec3(0.90,0.93,0.78), uAccent, 0.55);
    gl_FragColor = vec4(col, a);
  }`;

const STAR_VERT = `
  attribute float seed;
  attribute float mag;
  uniform float uTime, uSize;
  varying float vA;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = mag * uSize / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
    vA = mag * (0.55 + 0.45 * sin(uTime * 0.5 + seed * 24.0));
  }`;

const STAR_FRAG = `
  precision mediump float;
  varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.10, 0.5, d)) * clamp(vA, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.93, 0.95, 0.86), a);
  }`;

/** Five stones, largest at the base, each nudged off-axis so the stack leans. */
const ROCK_SPECS = [
  { r: 1.0, y: 0.4, s: [1.22, 0.62, 1.02], rot: 0.4, seed: 1.7, det: 0 },
  { r: 0.8, y: 1.1, s: [1.14, 0.7, 0.96], rot: 2.1, seed: 3.3, det: 0 },
  { r: 0.64, y: 1.74, s: [1.08, 0.76, 0.92], rot: 0.9, seed: 5.1, det: 1 },
  { r: 0.47, y: 2.28, s: [1.04, 0.8, 0.9], rot: 3.6, seed: 7.4, det: 0 },
  { r: 0.32, y: 2.68, s: [1.0, 0.88, 0.88], rot: 1.4, seed: 9.2, det: 1 },
] as const;

const GLOW_SCALES = [0.62, 2.4, 7.5] as const;
const MOON_POSITION = new THREE.Vector3(-38, 27, -96);

type Uniform<T> = THREE.IUniform<T>;

/** The shared uniform block: the terrain and rock materials read the same objects,
 *  so an accent or orb-position write lands in both without a second assignment.
 *  The index signature is what three's `ShaderMaterial` asks for; the named members
 *  are what the rest of this file reads, so both sides stay checked. */
interface SceneUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: Uniform<number>;
  uDrift: Uniform<number>;
  uDensity: Uniform<number>;
  uRelief: Uniform<number>;
  uPointer: Uniform<THREE.Vector2>;
  uPointerAmt: Uniform<number>;
  uPixelScale: Uniform<number>;
  uAccent: Uniform<THREE.Color>;
  uPurple: Uniform<THREE.Color>;
  uBg: Uniform<THREE.Color>;
  uOrb: Uniform<THREE.Vector3>;
}

interface MoteUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: Uniform<number>;
  uAccent: Uniform<THREE.Color>;
  uSize: Uniform<number>;
}

interface StarUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: Uniform<number>;
  uSize: Uniform<number>;
}

export interface CairnSceneOptions {
  /** Hex accent, e.g. "#afc9a5". Drives the orb, its light, and the contour ink. */
  accent?: string;
  /** Contour lines per world unit of elevation. The design ships 3.0. */
  density?: number;
  /** "still" freezes drift, parallax, and the orb's pulse. */
  motion?: "breathing" | "still";
}

function hexToRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Radial white falloff, used as the sprite map for every bloom in the scene. */
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.18, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.55, "rgba(255,255,255,0.10)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class CairnScene {
  private readonly host: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;

  private readonly uniforms: SceneUniforms;
  private readonly partUniforms: MoteUniforms;
  private readonly starUniforms: StarUniforms;

  private readonly orb: THREE.Mesh;
  private readonly orbLight: THREE.PointLight;
  private readonly orbHome = new THREE.Vector3(0, 2.95 * 1.2, 0);
  private readonly glowSprites: THREE.Sprite[] = [];
  private readonly glowTexture: THREE.CanvasTexture;
  private readonly look = new THREE.Vector3(0, 5.2, 0);
  private readonly camBase = new THREE.Vector3(0, 2.8, 25);

  /** Smoothed cursor: `t*` are the targets, the rest ease toward them each frame. */
  private readonly ptr = { x: 0, y: 0, tx: 0, ty: 0, amt: 0, tamt: 0 };
  private ptrTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly resizeObserver: ResizeObserver;
  private raf = 0;
  private stopped = false;
  private hidden = false;
  private still: boolean;
  private lastFrame = 0;

  constructor(host: HTMLElement, options: CairnSceneOptions = {}) {
    this.host = host;
    this.still = options.motion === "still";

    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
    });
    host.appendChild(this.canvas);

    const [w, h] = this.measure();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    // Cap DPR: the contour shader is fill-rate bound, and a 3x retina buffer buys
    // nothing visible over 1.75x here.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(w, h, false);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearAlpha(0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 400);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.look);

    const accent = hexToRgb(options.accent, [0.686, 0.788, 0.647]);
    const ACC = new THREE.Color(accent[0], accent[1], accent[2]);

    this.uniforms = {
      uTime: { value: 0 },
      uDrift: { value: 0 },
      uDensity: { value: options.density ?? 3.0 },
      uRelief: { value: 1.0 },
      uPointer: { value: new THREE.Vector2(0, -60) },
      uPointerAmt: { value: 0 },
      uPixelScale: { value: 0.002 },
      uAccent: { value: ACC.clone() },
      uPurple: { value: new THREE.Color(0.541, 0.478, 0.322) },
      uBg: { value: new THREE.Color(0.078, 0.086, 0.047) },
      uOrb: { value: new THREE.Vector3(0, 2.75, 0) },
    };

    /* --- terrain -------------------------------------------------------- */
    const seg = w < 760 ? 150 : 220;
    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 260, seg, seg),
      new THREE.ShaderMaterial({
        vertexShader: TERRAIN_VERT,
        fragmentShader: TERRAIN_FRAG,
        uniforms: this.uniforms,
        depthWrite: true,
      }),
    );
    terrain.rotation.x = -Math.PI / 2;
    this.scene.add(terrain);

    /* --- cairn ---------------------------------------------------------- */
    const cairn = new THREE.Group();
    const rockMat = new THREE.ShaderMaterial({
      vertexShader: ROCK_VERT,
      fragmentShader: ROCK_FRAG,
      uniforms: {
        uAccent: this.uniforms.uAccent,
        uPurple: this.uniforms.uPurple,
        uOrb: this.uniforms.uOrb,
        uBg: this.uniforms.uBg,
      },
    });
    ROCK_SPECS.forEach((sp, i) => {
      // Deterministic lumpiness: three interfering sinusoids per vertex, seeded per
      // stone, so every rock is distinct but the stack is identical on every load.
      // Already non-indexed (three builds polyhedra that way), so displacing the
      // position buffer in place and recomputing normals yields the faceted,
      // flat-shaded look the design wants without a de-index pass.
      const g = new THREE.IcosahedronGeometry(sp.r, sp.det);
      const pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k),
          y = pos.getY(k),
          z = pos.getZ(k);
        const n = Math.sin(x * 2.9 + sp.seed) * Math.cos(y * 3.4 - sp.seed * 1.3) * Math.sin(z * 3.1 + sp.seed * 0.7);
        const n2 = Math.sin(x * 6.1 - sp.seed * 2.2) * Math.sin(z * 5.4 + sp.seed);
        const f = 1 + 0.3 * n + 0.1 * n2;
        pos.setXYZ(k, x * f, y * f, z * f);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, rockMat);
      m.scale.set(sp.s[0], sp.s[1], sp.s[2]);
      m.position.set((i % 2 ? 1 : -1) * 0.05 * i, sp.y, (i % 3 === 0 ? -1 : 1) * 0.04 * i);
      m.rotation.set(0.13 * Math.sin(sp.seed), sp.rot, 0.1 * Math.cos(sp.seed * 1.7));
      cairn.add(m);
    });

    const orbMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(
        Math.min(1, accent[0] + 0.1),
        Math.min(1, accent[1] + 0.16),
        Math.min(1, accent[2] + 0.14),
      ),
    });
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), orbMat);
    this.orb.position.set(0, 3.05, 0);
    cairn.add(this.orb);

    const glowTex = (this.glowTexture = makeGlowTexture());
    GLOW_SCALES.forEach((size, i) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: ACC.clone(),
          transparent: true,
          opacity: [0.6, 0.1, 0.03][i],
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      s.scale.set(size, size, 1);
      s.position.copy(this.orbHome);
      this.scene.add(s);
      this.glowSprites.push(s);
    });

    cairn.scale.setScalar(1.2);
    this.scene.add(cairn);

    /* --- sky ------------------------------------------------------------ */
    [
      [13, 0.18],
      [38, 0.055],
    ].forEach(([size, op]) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: new THREE.Color(0.86, 0.89, 0.76),
          transparent: true,
          opacity: op,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      s.scale.set(size, size, 1);
      s.position.copy(MOON_POSITION);
      this.scene.add(s);
    });

    const moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 32, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.91, 0.93, 0.8) }),
    );
    moonDisc.position.copy(MOON_POSITION);
    this.scene.add(moonDisc);

    const starCount = w < 760 ? 180 : 320;
    const sPos = new Float32Array(starCount * 3);
    const sSeed = new Float32Array(starCount);
    const sMag = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const az = Math.random() * Math.PI * 2;
      const el = 0.06 + Math.pow(Math.random(), 0.85) * 0.62;
      const R = 120 + Math.random() * 55;
      sPos[i * 3] = Math.cos(az) * Math.cos(el) * R;
      sPos[i * 3 + 1] = Math.sin(el) * R * 0.8 + 9;
      sPos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * R;
      sSeed[i] = Math.random();
      // Magnitudes skew faint (pow 2.6) so a handful of bright stars stand out.
      sMag[i] = 0.42 + Math.pow(Math.random(), 2.6) * 1.05;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    starGeo.setAttribute("seed", new THREE.BufferAttribute(sSeed, 1));
    starGeo.setAttribute("mag", new THREE.BufferAttribute(sMag, 1));
    this.starUniforms = {
      uTime: this.uniforms.uTime,
      uSize: { value: this.renderer.getPixelRatio() * 210 },
    };
    this.scene.add(
      new THREE.Points(
        starGeo,
        new THREE.ShaderMaterial({
          vertexShader: STAR_VERT,
          fragmentShader: STAR_FRAG,
          uniforms: this.starUniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );

    /* --- lighting ------------------------------------------------------- */
    this.scene.add(new THREE.AmbientLight(new THREE.Color(0.13, 0.14, 0.09), 0.9));
    const moonLight = new THREE.DirectionalLight(new THREE.Color(0.72, 0.77, 0.62), 0.55);
    moonLight.position.set(-9, 7, -12);
    this.scene.add(moonLight);

    this.orbLight = new THREE.PointLight(ACC.clone(), 4.0, 14, 2.0);
    this.orbLight.position.copy(this.orbHome);
    this.uniforms.uOrb.value.copy(this.orbHome);
    this.scene.add(this.orbLight);

    const fill = new THREE.PointLight(new THREE.Color(0.44, 0.39, 0.26), 2.2, 22, 2.0);
    fill.position.set(4, 3.2, 6);
    this.scene.add(fill);

    /* --- motes ---------------------------------------------------------- */
    const moteCount = w < 760 ? 70 : 130;
    const pPos = new Float32Array(moteCount * 3);
    const pSeed = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 10 + Math.pow(Math.random(), 0.55) * 60;
      pPos[i * 3] = Math.cos(a) * r;
      pPos[i * 3 + 1] = 2.0 + Math.pow(Math.random(), 1.4) * 34;
      pPos[i * 3 + 2] = -Math.abs(Math.sin(a)) * r;
      pSeed[i] = Math.random();
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("seed", new THREE.BufferAttribute(pSeed, 1));
    this.partUniforms = {
      uTime: this.uniforms.uTime,
      uAccent: this.uniforms.uAccent,
      uSize: { value: this.renderer.getPixelRatio() * 90 },
    };
    this.scene.add(
      new THREE.Points(
        pGeo,
        new THREE.ShaderMaterial({
          vertexShader: PART_VERT,
          fragmentShader: PART_FRAG,
          uniforms: this.partUniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );

    /* --- wiring --------------------------------------------------------- */
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    // Observing the host rather than `window` also catches the layout reflows the
    // window resize event never fires for (a scrollbar appearing, a zoom change).
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);

    this.resize();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Freeze drift, parallax, and the orb pulse without tearing the scene down. */
  setMotion(motion: "breathing" | "still") {
    this.still = motion === "still";
  }

  dispose() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.ptrTimer);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.resizeObserver.disconnect();
    // Walk the graph once: three does not free GPU buffers or programs on its own,
    // and React Strict Mode mounts this twice in development.
    this.scene.traverse((obj) => {
      const withGeo = obj as THREE.Mesh;
      withGeo.geometry?.dispose?.();
      const mat = (obj as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose?.();
    });
    this.glowTexture.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private measure(): [number, number] {
    const r = this.host.getBoundingClientRect();
    const p = this.host.parentElement?.getBoundingClientRect() ?? r;
    return [
      Math.max(r.width || p.width || window.innerWidth, 1),
      Math.max(r.height || p.height || window.innerHeight, 1),
    ];
  }

  private onPointerMove = (e: PointerEvent) => {
    const r = this.host.getBoundingClientRect();
    this.ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    this.ptr.tamt = 1;
    // The terrain bulge decays 2.2s after the cursor stops, so an idle page settles.
    clearTimeout(this.ptrTimer);
    this.ptrTimer = setTimeout(() => {
      this.ptr.tamt = 0;
    }, 2200);
  };

  private onVisibilityChange = () => {
    this.hidden = document.hidden;
  };

  private resize() {
    const [w, h] = this.measure();
    // Short viewports tilt the camera up and pull it back, so the top of the stack
    // still clears the feature strip instead of hiding behind it.
    const t = Math.max(0, Math.min(1, (1000 - h) / 320));
    const pitchDeg = 5.5 + 3.5 * t;
    this.look.y = this.camBase.y + Math.tan((pitchDeg * Math.PI) / 180) * 25.0;
    this.camBase.z = 25.0 + 4.0 * t;
    this.camera.position.z = this.camBase.z;

    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const dpr = this.renderer.getPixelRatio();
    this.partUniforms.uSize.value = dpr * 90;
    this.starUniforms.uSize.value = dpr * 210;
    // World units per device pixel at unit depth: contour line width is derived
    // from this so lines stay ~1px wherever they land.
    this.uniforms.uPixelScale.value =
      (2.0 * Math.tan(((this.camera.fov * Math.PI) / 180) / 2)) / Math.max(h, 1);
  }

  private tick = () => {
    if (this.stopped) return;
    this.raf = requestAnimationFrame(this.tick);
    if (this.hidden) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;

    const frozen = this.still;
    const u = this.uniforms;
    u.uTime.value += dt;
    if (!frozen) u.uDrift.value += dt;

    const p = this.ptr;
    p.x += (p.tx - p.x) * 0.035;
    p.y += (p.ty - p.y) * 0.035;
    p.amt += (p.tamt - p.amt) * 0.02;
    u.uPointerAmt.value = frozen ? 0 : p.amt * 0.9;
    u.uPointer.value.set(p.x * 18.0, 8.0 - p.y * 14.0);

    this.camera.position.set(this.camBase.x + p.x * 0.85, this.camBase.y - p.y * 0.32, this.camBase.z);
    this.camera.lookAt(this.look.x + p.x * 0.42, this.look.y - p.y * 0.16, this.look.z);

    const t = u.uTime.value;
    const breathe = frozen ? 1 : 1 + 0.06 * Math.sin(t * 0.55);
    this.orb.scale.setScalar(breathe);
    this.orbLight.intensity = 4.0 * (frozen ? 1 : 0.9 + 0.14 * Math.sin(t * 0.55));
    this.glowSprites.forEach((s, i) => {
      const base = GLOW_SCALES[i];
      const k = frozen ? 1 : 1 + (0.05 + i * 0.02) * Math.sin(t * 0.42 + i);
      s.scale.set(base * k, base * k, 1);
    });
    if (!frozen) {
      this.orbLight.position.set(
        this.orbHome.x + p.x * 0.5,
        this.orbHome.y + p.y * -0.12,
        this.orbHome.z + p.y * 0.3,
      );
      u.uOrb.value.copy(this.orbLight.position);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
