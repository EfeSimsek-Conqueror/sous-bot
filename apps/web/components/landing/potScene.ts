/*
 * The landing page's 3D hero: a glazed terracotta pot on a warm terracotta-lit
 * stage, with a lid that lifts and swings away, rising steam, and detected
 * ingredients that orbit out of the pot as you move through the scenes.
 *
 * Ported verbatim from the user-authored Claude Design project
 * "Sousbot Landing" (file `Sousbot Landing.dc.html`, project
 * 28f8c00b-5baf-43de-a51c-4fda160f4599, read via the claude_design MCP). The
 * only deliberate changes:
 *   - three.js is a bundled dependency (dynamic `import("three")` → its own
 *     chunk) instead of the design's CDN `import()`, so the page has no
 *     runtime dependency on jsdelivr/unpkg.
 *   - `prefers-reduced-motion` freezes every ambient oscillation, snaps the
 *     camera instead of easing it, drops the steam, and disables the
 *     mouse-parallax — and then stops rendering until something changes.
 *
 * Everything else (geometry profiles, materials, light rig, per-scene camera
 * table) is the design's, unchanged.
 */

import type * as ThreeNS from "three";

/** One row of the design's per-scene camera + staging table. */
export type SceneTargets = {
  /** pot Y-rotation (radians) */
  rot: number;
  /** lid open amount — drives lift, swing-away arc, steam and ingredients */
  lid: number;
  /** camera azimuth (radians) */
  az: number;
  /** camera distance */
  dist: number;
  /** camera height */
  h: number;
  /** steam intensity multiplier */
  steam: number;
  /** ingredients visible (0/1) */
  ing: number;
  /** the paprika "Pro" uplight (0/1) */
  pro: number;
  /** pot Y offset — the pot sinks out of frame on the last scenes */
  potY: number;
  /** lid Y offset — the lid flies up and out */
  lidY: number;
  /** ingredient orbit height / radius / scale / Z-offset */
  ingH: number;
  ingR: number;
  ingS: number;
  ingZ: number;
};

export const SCENE_TARGETS: SceneTargets[] = [
  { rot: 0.35, lid: 0, az: 0, dist: 7.4, h: 1.75, steam: 0.55, ing: 0, pro: 0, potY: 0, lidY: 0, ingH: 0.86, ingR: 0.46, ingS: 1, ingZ: 0.36 },
  { rot: 1.55, lid: 1.15, az: 0.3, dist: 6.4, h: 2.1, steam: 1.2, ing: 1, pro: 0, potY: 0, lidY: 0.5, ingH: 0.9, ingR: 0.5, ingS: 1, ingZ: 0.36 },
  { rot: 2.7, lid: 1.35, az: -0.5, dist: 7.2, h: 1.15, steam: 0.75, ing: 1, pro: 0, potY: -0.35, lidY: 0.55, ingH: 0.85, ingR: 0.64, ingS: 1.2, ingZ: 0.22 },
  { rot: 3.85, lid: 1.7, az: 0.15, dist: 7.05, h: 1.8, steam: 0.5, ing: 1, pro: 1, potY: -1.5, lidY: 1.7, ingH: 0.7, ingR: 0.82, ingS: 1.45, ingZ: 0.08 },
  { rot: 5.0, lid: 2.1, az: 0, dist: 7.9, h: 1.5, steam: 0.3, ing: 1, pro: 0, potY: -4.6, lidY: 4.4, ingH: 0.8, ingR: 0.95, ingS: 1.7, ingZ: 0 },
];

export type PotScene = {
  /** Ease (or, under reduced motion, snap) the staging to scene `n`. */
  setScene(n: number): void;
  dispose(): void;
};

type Options = {
  initial: number;
  reduceMotion: boolean;
  /** steam density multiplier (design prop, default 1) */
  steam?: number;
  /** slow continuous pot rotation (design prop, default true) */
  autoDrift?: boolean;
};

export async function createPotScene(
  mount: HTMLElement,
  opts: Options
): Promise<PotScene | null> {
  let THREE: typeof ThreeNS;
  try {
    THREE = await import("three");
  } catch {
    // No three.js (offline chunk fetch, ancient browser): the landing's text
    // layer stands on its own, so fail silently rather than break the page.
    return null;
  }
  if (!mount.isConnected) return null;

  const reduce = opts.reduceMotion;
  /** motion switch: 0 under prefers-reduced-motion, killing every oscillation */
  const MO = reduce ? 0 : 1;
  const steamProp = opts.steam ?? 1;
  const autoDrift = (opts.autoDrift ?? true) && !reduce;

  let renderer: ThreeNS.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return null; // no WebGL
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.cssText =
    "position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.1s ease .15s;";
  mount.appendChild(renderer.domElement);
  requestAnimationFrame(() => {
    renderer.domElement.style.opacity = "1";
  });

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, mount.clientWidth / mount.clientHeight, 0.1, 60);

  // --- environment: four emissive panels baked into an IBL, so the glaze and
  // the cream lid pick up warm studio reflections instead of looking flat ---
  const pmrem = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.background = new THREE.Color(0x120b06);
  const envPanel = (
    c: number, i: number, w: number, h: number,
    x: number, y: number, z: number, rx: number, ry: number
  ) => {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })
    );
    p.position.set(x, y, z);
    p.rotation.set(rx, ry, 0);
    es.add(p);
  };
  envPanel(0xfff1dd, 5, 7, 3.5, 0, 5, 0, Math.PI / 2, 0);
  envPanel(0xd68d50, 2.4, 4, 6, -6, 2, 0, 0, Math.PI / 2);
  envPanel(0xffdcb0, 1.5, 4, 6, 6, 2, 0, 0, -Math.PI / 2);
  envPanel(0xd9673d, 1.3, 9, 3.5, 0, 2, -7, 0, 0);
  scene.environment = pmrem.fromScene(es, 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffe3c4, 0.32));
  scene.add(new THREE.HemisphereLight(0x9a6134, 0x140c06, 0.28));
  const key = new THREE.DirectionalLight(0xffdcb0, 2.1);
  key.position.set(4.5, 7, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.PointLight(0xd68d50, 20, 0, 1.9);
  rim.position.set(-5.5, 3.2, -4.5);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffb27a, 7, 0, 2);
  fill.position.set(0.8, 2.2, 5.5);
  scene.add(fill);
  // Paprika uplight — comes on only for the Pro pricing scene.
  const pro = new THREE.PointLight(0xd9673d, 0, 0, 1.8);
  pro.position.set(0, 2.4, -3.6);
  scene.add(pro);

  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.ShadowMaterial({ opacity: 0.34 }));
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.y = -1.06;
  gnd.receiveShadow = true;
  scene.add(gnd);
  key.shadow.camera.bottom = -14;
  key.shadow.camera.updateProjectionMatrix();

  // Additive pool of terracotta light on the floor under the pot.
  const glowCv = document.createElement("canvas");
  glowCv.width = glowCv.height = 256;
  const gg = glowCv.getContext("2d")!;
  const rg = gg.createRadialGradient(128, 128, 8, 128, 128, 126);
  rg.addColorStop(0, "rgba(214,141,80,.55)");
  rg.addColorStop(0.5, "rgba(214,141,80,.16)");
  rg.addColorStop(1, "rgba(214,141,80,0)");
  gg.fillStyle = rg;
  gg.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(2.7, 48),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(glowCv),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -1.055;
  scene.add(glow);

  const anchor = new THREE.Group();
  anchor.position.set(0, -1.05, 0);
  anchor.scale.setScalar(1.3);
  scene.add(anchor);
  const pot = new THREE.Group();
  anchor.add(pot);

  // --- procedural glaze: a warm vertical gradient speckled with kiln grain,
  // reused as the roughness/bump map so the surface reads as fired clay ---
  const mkTex = (draw: (ctx: CanvasRenderingContext2D, size: number) => void, size?: number) => {
    const c2 = document.createElement("canvas");
    c2.width = c2.height = size || 256;
    draw(c2.getContext("2d")!, c2.width);
    const tx = new THREE.CanvasTexture(c2);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    return tx;
  };
  const glazeMap = mkTex((ctx, S) => {
    const grd = ctx.createLinearGradient(0, 0, 0, S);
    grd.addColorStop(0, "#e0a15d");
    grd.addColorStop(0.45, "#cd8443");
    grd.addColorStop(0.85, "#b06a2c");
    grd.addColorStop(1, "#9c5a22");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,225,190,.05)" : "rgba(90,45,10,.06)";
      ctx.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
  glazeMap.colorSpace = THREE.SRGBColorSpace;
  const roughMap = mkTex((ctx, S) => {
    ctx.fillStyle = "#8a8a8a";
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      const v = 100 + Math.floor(Math.random() * 90);
      ctx.fillStyle = "rgba(" + v + "," + v + "," + v + ",.5)";
      ctx.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });

  const terra = new THREE.MeshPhysicalMaterial({
    color: 0xfaf0e4, map: glazeMap, roughness: 0.55, roughnessMap: roughMap, bumpMap: roughMap,
    bumpScale: 0.012, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.3,
    envMapIntensity: 0.85, side: THREE.DoubleSide,
  });
  const terraDeep = new THREE.MeshPhysicalMaterial({
    color: 0x8f551f, roughness: 0.42, metalness: 0.06, clearcoat: 0.3,
    clearcoatRoughness: 0.35, envMapIntensity: 0.7,
  });
  const cream = new THREE.MeshPhysicalMaterial({
    color: 0xf1e5d1, roughness: 0.3, roughnessMap: roughMap, bumpMap: roughMap, bumpScale: 0.006,
    metalness: 0.02, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 1, side: THREE.DoubleSide,
  });

  // Pot body: a lathe over a hand-tuned silhouette, with the rim rolled outward.
  const prof = new THREE.SplineCurve([
    new THREE.Vector2(0.001, 0.03), new THREE.Vector2(0.36, 0.015), new THREE.Vector2(0.64, 0.055),
    new THREE.Vector2(0.805, 0.17), new THREE.Vector2(0.868, 0.46), new THREE.Vector2(0.878, 0.72),
    new THREE.Vector2(0.845, 0.97),
  ]);
  const pts = prof.getPoints(40);
  pts.push(
    new THREE.Vector2(0.907, 1.015), new THREE.Vector2(0.923, 1.07), new THREE.Vector2(0.897, 1.098),
    new THREE.Vector2(0.8, 1.098), new THREE.Vector2(0.775, 0.96)
  );
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), terra);
  body.castShadow = true;
  body.receiveShadow = true;
  pot.add(body);
  const foot = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 14, 48), terraDeep);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = 0.02;
  foot.castShadow = true;
  pot.add(foot);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.884, 0.016, 12, 96), terraDeep);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.985;
  pot.add(band);

  const stewMat = new THREE.MeshPhysicalMaterial({
    color: 0x63351a, roughness: 0.35, metalness: 0.04, clearcoat: 0.55,
    clearcoatRoughness: 0.25, envMapIntensity: 0.6,
  });
  const stew = new THREE.Mesh(new THREE.CircleGeometry(0.77, 56), stewMat);
  stew.rotation.x = -Math.PI / 2;
  stew.position.y = 0.95;
  pot.add(stew);

  const chunkCols = [0xc8452f, 0xd97a3a, 0xe2a83d, 0xb0866a];
  const chunks = chunkCols.map((c, i) => {
    const ch = new THREE.Mesh(
      new THREE.SphereGeometry(0.06 + (i % 2) * 0.025, 18, 14),
      new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.4, clearcoat: 0.4, envMapIntensity: 0.7 })
    );
    const a = (i * Math.PI) / 2 + 0.6;
    ch.position.set(Math.cos(a) * (0.3 + i * 0.09), 0.955, Math.sin(a) * (0.3 + i * 0.09));
    pot.add(ch);
    return ch;
  });

  for (const sx of [-1, 1]) {
    const mnt = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.05, 20), terraDeep);
    mnt.rotation.z = (sx * Math.PI) / 2;
    mnt.position.set(sx * 0.875, 0.6, 0);
    pot.add(mnt);
    const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.18, 8, 18), cream);
    h.position.set(sx * 0.95, 0.6, 0);
    h.scale.set(1, 1, 0.8);
    h.castShadow = true;
    pot.add(h);
  }

  // --- lid: domed cap + rolled edge + a skirt and underside so it still
  // reads as a lid once it lifts off and you can see beneath it ---
  const lid = new THREE.Group();
  lid.position.y = 1.1;
  anchor.add(lid);
  const lidProf = new THREE.SplineCurve([
    new THREE.Vector2(0.858, 0), new THREE.Vector2(0.83, 0.1), new THREE.Vector2(0.66, 0.245),
    new THREE.Vector2(0.4, 0.33), new THREE.Vector2(0.14, 0.375), new THREE.Vector2(0.001, 0.385),
  ]);
  const cap = new THREE.Mesh(new THREE.LatheGeometry(lidProf.getPoints(28), 96), cream);
  cap.castShadow = true;
  lid.add(cap);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(0.862, 0.026, 14, 96), cream);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.012;
  edge.castShadow = true;
  lid.add(edge);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.862, 0.882, 0.075, 64, 1, true), cream);
  lip.position.y = -0.02;
  lip.castShadow = true;
  lid.add(lip);
  const underCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.86, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    cream
  );
  underCap.scale.set(1, -0.34, 1);
  underCap.position.y = -0.06;
  lid.add(underCap);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.1, 0.045, 24), cream);
  stem.position.y = 0.405;
  lid.add(stem);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.1, 16), terraDeep);
  neck.position.y = 0.45;
  lid.add(neck);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 28, 20),
    new THREE.MeshPhysicalMaterial({
      color: 0xfaf0e4, map: glazeMap, roughness: 0.3, metalness: 0.05,
      clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.9,
    })
  );
  knob.scale.y = 0.85;
  knob.position.y = 0.53;
  knob.castShadow = true;
  lid.add(knob);

  // --- steam: 16 soft radial sprites cycling up out of the pot ---
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const g = cv.getContext("2d")!;
  const gr = g.createRadialGradient(256, 256, 2, 256, 256, 252);
  for (let gi = 0; gi <= 24; gi++) {
    const gf = gi / 24;
    gr.addColorStop(gf, "rgba(255,240,220," + (Math.pow(1 - gf, 2.2) * 0.85).toFixed(4) + ")");
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 512);
  const steamTex = new THREE.CanvasTexture(cv);
  steamTex.colorSpace = THREE.SRGBColorSpace;
  const steamG = new THREE.Group();
  anchor.add(steamG);
  const puffs: { s: ThreeNS.Sprite; ph: number; sp: number; wo: number; dir: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: steamTex, color: 0xffe7c6, transparent: true, opacity: 0, depthWrite: false })
    );
    steamG.add(s);
    puffs.push({ s, ph: i / 16, sp: 0.7 + ((i * 137) % 100) / 140, wo: ((i * 97) % 628) / 100, dir: i % 2 ? 1 : -1 });
  }
  steamG.visible = !reduce;

  // --- the detected ingredients that rise out once the lid is off ---
  const ingG = new THREE.Group();
  anchor.add(ingG);
  const iMat = (c: number, r?: number) =>
    new THREE.MeshPhysicalMaterial({
      color: c, roughness: r ?? 0.38, metalness: 0.04, clearcoat: 0.5,
      clearcoatRoughness: 0.28, envMapIntensity: 0.75,
    });
  const mkIng = (build: (g2: ThreeNS.Group) => void) => {
    const g2 = new THREE.Group();
    build(g2);
    g2.traverse((o) => {
      if ((o as ThreeNS.Mesh).isMesh) o.castShadow = true;
    });
    ingG.add(g2);
    return g2;
  };
  const tomato = mkIng((g2) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.155, 28, 22), iMat(0xc8452f, 0.32));
    b.scale.y = 0.86;
    g2.add(b);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.05, 10), iMat(0x8f551f, 0.6));
    st.position.y = 0.135;
    g2.add(st);
  });
  const mushroom = mkIng((g2) => {
    const cp = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      iMat(0xb0866a, 0.5)
    );
    cp.scale.y = 0.72;
    cp.position.y = 0.04;
    g2.add(cp);
    const gill = new THREE.Mesh(new THREE.CircleGeometry(0.132, 24), iMat(0xe6d7bd, 0.6));
    gill.rotation.x = Math.PI / 2;
    gill.position.y = 0.039;
    g2.add(gill);
    const stp = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 0.16, 14), iMat(0xead9bc, 0.55));
    stp.position.y = -0.04;
    g2.add(stp);
  });
  const carrot = mkIng((g2) => {
    const pr = new THREE.SplineCurve([
      new THREE.Vector2(0.004, -0.2), new THREE.Vector2(0.035, -0.1), new THREE.Vector2(0.062, 0.04),
      new THREE.Vector2(0.07, 0.13), new THREE.Vector2(0.045, 0.19), new THREE.Vector2(0.001, 0.2),
    ]);
    g2.add(new THREE.Mesh(new THREE.LatheGeometry(pr.getPoints(18), 22), iMat(0xd9713a, 0.42)));
  });
  const onion = mkIng((g2) => {
    const pr = new THREE.SplineCurve([
      new THREE.Vector2(0.001, -0.14), new THREE.Vector2(0.1, -0.11), new THREE.Vector2(0.148, -0.02),
      new THREE.Vector2(0.12, 0.08), new THREE.Vector2(0.04, 0.15), new THREE.Vector2(0.012, 0.2),
      new THREE.Vector2(0.001, 0.21),
    ]);
    g2.add(new THREE.Mesh(new THREE.LatheGeometry(pr.getPoints(20), 24), iMat(0xdfbe8d, 0.4)));
  });
  const crouton = mkIng((g2) => {
    g2.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.17), iMat(0xe2a83d, 0.5)));
  });
  const ings = [tomato, mushroom, carrot, onion, crouton];
  const tilts = [
    [0, 0], [0.15, -0.1], [1.2, 0.5], [-0.12, 0.18], [0.5, 0.35],
  ];

  // --- state: T = target row, C = the eased current values ---
  const clampScene = (n: number) => Math.max(0, Math.min(SCENE_TARGETS.length - 1, n));
  const T: SceneTargets = { ...SCENE_TARGETS[clampScene(opts.initial)] };
  const C: SceneTargets = { ...T };
  let dirty = true;

  let mx = 0, my = 0, smx = 0, smy = 0;
  const onMouse = (e: MouseEvent) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!reduce) window.addEventListener("mousemove", onMouse);

  /* The design's camera distances are framed for a wide desktop stage (they
     land perfectly at ~1920). The pot's on-screen size tracks viewport height
     while the flanking copy columns track width, so on narrower viewports the
     pot creeps under the text — pull the camera back to keep the columns clear,
     and much further back in portrait, where the copy stacks over it. */
  let distFactor = 1;
  /* Portrait also needs the pot dropped down the frame: stacked, the copy fills
     the middle, and a pot peeking out of the gap between two cards reads as a
     glitch. Aiming the camera higher settles it low and behind the glass. */
  let lookY = 0.18;
  const computeFactor = () => {
    const w = mount.clientWidth;
    const narrow = w < 900;
    distFactor = narrow ? 2.4 : w < 1200 ? 1.32 : w < 1600 ? 1.14 : 1;
    lookY = narrow ? 1.78 : 0.18;
  };
  computeFactor();

  const onResize = () => {
    if (!mount.clientWidth || !mount.clientHeight) return;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    cam.aspect = mount.clientWidth / mount.clientHeight;
    cam.updateProjectionMatrix();
    computeFactor();
    dirty = true;
  };
  window.addEventListener("resize", onResize);

  const look = new THREE.Vector3(0, 0.18, 0);
  let alive = true;
  let raf = 0;
  let pt: number | null = null;

  const tick = (tm: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    // Reduced motion: nothing moves on its own, so only draw when the staging
    // actually changed (scene switch, resize) instead of every frame.
    if (reduce && !dirty) return;
    dirty = false;

    const t = tm / 1000;
    const dt = pt == null ? 0.016 : Math.min(0.05, t - pt);
    pt = t;

    const k = reduce ? 1 : 1 - Math.exp(-dt * 3.4);
    for (const key2 of Object.keys(T) as (keyof SceneTargets)[]) {
      C[key2] += (T[key2] - C[key2]) * k;
    }
    const k2 = 1 - Math.exp(-dt * 2.6);
    smx += (mx - smx) * k2;
    smy += (my - smy) * k2;

    const drift = autoDrift ? t * 0.05 : 0;
    pot.rotation.y = C.rot + drift + Math.sin(t * 0.4) * 0.02 * MO;
    anchor.position.y = -1.05 + Math.sin(t * 0.85) * 0.018 * MO;
    /* On the closing scenes the pot sinks and the lid flies off past the frame
       edge. Zoomed out for a narrow viewport the frame is far taller, so scale
       those exits by the same factor or they just hover in shot. */
    const potY = C.potY * distFactor;
    const lidY = C.lidY * distFactor;
    pot.position.y = potY;

    // Lid: lifts straight up, then swings back and away on an arc.
    const lo = C.lid;
    const ca = Math.min(1.38, lo * 0.62);
    lid.position.set(0, lidY + 1.1 + 0.84 * Math.sin(ca), -0.84 + 0.84 * Math.cos(ca));
    lid.rotation.x = -ca + Math.sin(t * 0.9) * 0.02 * lo * MO;
    lid.rotation.z = Math.sin(t * 1.1) * 0.015 * lo * MO;

    const open = Math.max(0, Math.min(1, (lo - 0.05) / 0.55));
    if (!reduce) {
      const sm = steamProp * C.steam * (0.3 + 0.7 * open);
      const rr = (1 - open) * 0.84;
      for (const p of puffs) {
        const f = (t * 0.16 * p.sp + p.ph) % 1;
        const drift2 = (0.06 + 0.14 * open) * (f + 0.25);
        p.s.position.set(
          Math.cos(p.wo) * rr + Math.sin(t * 0.8 + p.wo) * drift2,
          potY + 1.04 + f * (0.55 + 1.15 * open),
          Math.sin(p.wo) * rr * 0.9 + open * (0.92 + f * 0.34) + Math.cos(t * 0.7 + p.wo) * drift2 * 0.8
        );
        const sc = (0.24 + f * 1.05) * (0.55 + 0.45 * open);
        p.s.scale.set(sc, sc, 1);
        p.s.material.rotation = p.wo + t * 0.18 * p.dir;
        p.s.material.opacity = Math.sin(f * Math.PI) * 0.5 * sm;
      }
    }

    chunks.forEach((ch, i) => {
      ch.position.y = 0.955 + Math.sin(t * 1.8 + i * 1.9) * 0.012 * (0.4 + Math.min(1, C.lid)) * MO;
    });

    const iv = Math.max(0, Math.min(1, C.ing));
    const clr2 = Math.max(0, Math.min(1, (lo - 0.18) / 0.4));
    const hv = iv * clr2;
    ingG.visible = hv > 0.02;
    const zMix = Math.max(0.4, 1 - 1.6 * C.ingZ);
    ings.forEach((it, i) => {
      const a = t * 0.42 * MO + (i * Math.PI * 2) / ings.length;
      const r = (C.ingR + 0.07 * Math.sin(t * 0.6 + i * 2) * MO) * (0.35 + 0.65 * hv);
      it.position.set(
        Math.cos(a) * r,
        C.ingH + hv * (0.38 + 0.07 * Math.sin(t * 1.1 + i * 1.7) * MO + i * 0.03) * C.ingS,
        C.ingZ + Math.sin(a) * r * zMix
      );
      it.scale.setScalar(Math.max(0.001, hv * C.ingS));
      it.rotation.set(
        tilts[i][0] + Math.sin(t * 0.5 + i) * 0.22 * MO,
        a + i,
        tilts[i][1] + Math.sin(t * 0.4 + i * 2) * 0.18 * MO
      );
    });

    pro.intensity = C.pro * 55;
    const gY = anchor.position.y + potY * 1.3 - 0.01;
    gnd.position.y = gY;
    glow.position.y = gY + 0.005;
    glow.material.opacity = 0.38 + C.steam * 0.16 + C.pro * 0.12;

    const az = C.az + smx * 0.06,
      hh = C.h - smy * 0.3;
    cam.position.set(
      Math.sin(az) * C.dist * distFactor,
      hh * distFactor,
      Math.cos(az) * C.dist * distFactor
    );
    look.y = lookY;
    cam.lookAt(look);
    renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(tick);

  return {
    setScene(n: number) {
      Object.assign(T, SCENE_TARGETS[clampScene(n)]);
      dirty = true;
    },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouse);
      scene.traverse((o) => {
        const mesh = o as ThreeNS.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as unknown as { material?: ThreeNS.Material | ThreeNS.Material[] }).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      glazeMap.dispose();
      roughMap.dispose();
      steamTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
