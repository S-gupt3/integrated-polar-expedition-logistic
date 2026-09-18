import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import gsap from "gsap";

/* ---------------- Unified palette (dark blue identity) ---------------- */
const NEON = 0x4da8ff;
const LIT = 0xbfd9ff;
const STEEL = 0x16283f;
const PAD = 0x081a2e;
const DOOR = 0x12233a;
const SHELF_FILL = 0x12304f;

/* ---------------- Scene / Camera / Renderer ---------------- */
const app = document.querySelector("#app");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070f);
scene.fog = new THREE.FogExp2(0x05070f, 0.005);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
camera.position.set(26, 18, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 4.2, 0);
controls.enableDamping = true;
controls.maxDistance = 220;
controls.minDistance = 1.5;

/* ---------------- Post-processing ---------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.35, 0.4);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ---------------- Lights & ground ---------------- */
scene.add(new THREE.AmbientLight(0x88aaff, 0.4));
const keyLight = new THREE.DirectionalLight(0xcfe4ff, 0.9);
keyLight.position.set(20, 30, 14);
scene.add(keyLight);

const grid = new THREE.GridHelper(260, 260, NEON, 0x0d2440);
grid.material.transparent = true;
grid.material.opacity = 0.25;
grid.position.x = 46;
scene.add(grid);

/* ---------------- Shell registry (peel-away) ---------------- */
const exteriorShells = [];
function registerShell(fill, edges, baseOpacity) {
  exteriorShells.push({ fill, edges, baseOpacity });
}

function createNeonBox({ width = 1, height = 1, depth = 1, color = NEON, opacity = 0.16, position = [0, 0, 0], name = "" }) {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(width, height, depth);

  const fillMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color).multiplyScalar(0.15),
    transparent: true,
    opacity,
    roughness: 0.2,
    metalness: 0.05,
    emissive: new THREE.Color(color).multiplyScalar(0.05),
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const edgeMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });

  const fill = new THREE.Mesh(geometry, fillMaterial);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);
  fill.add(edges);
  group.add(fill);

  group.position.set(...position);
  group.name = name;

  registerShell(fill, edges, opacity);
  return group;
}

/* ---------------- Crate set factory ---------------- */
const CRATE_SETS = [];
const normalColor = new THREE.Color(0x2e86d4);
const warningColor = new THREE.Color(0xd99a2b);
const criticalColor = new THREE.Color(0xe02c4c);

function makeCrateSet(positions, size, { warning, critical, perLevel, label, prefix }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);

  const dummy = new THREE.Object3D();
  positions.forEach((p, i) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    let color = normalColor;
    if (i === warning) color = warningColor;
    if (i === critical) color = criticalColor;
    mesh.setColorAt(i, color);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const set = { mesh, warning, critical, perLevel, label, prefix, count: positions.length };
  CRATE_SETS.push(set);
  return set;
}

/* ---------------- Shared materials ---------------- */
const steelMat = new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.65, roughness: 0.32, emissive: 0x081422 });
const ringMat = new THREE.MeshBasicMaterial({ color: NEON });
const shelfEdgeMat = new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.85 });
const shelfFillMat = new THREE.MeshBasicMaterial({ color: SHELF_FILL, transparent: true, opacity: 0.5 });
const litMat = new THREE.MeshBasicMaterial({ color: LIT, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
const doorMat = new THREE.MeshBasicMaterial({ color: DOOR, transparent: true, opacity: 0.9, side: THREE.DoubleSide });

function makePad(radius, segments) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, segments),
    new THREE.MeshBasicMaterial({ color: PAD, transparent: true, opacity: 0.55 })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  g.add(disc);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.3, radius, segments),
    new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.03;
  g.add(rim);
  return g;
}

function gableRoof(widthSpan, length, pitchScale) {
  const r = widthSpan / 1.732;
  const geo = new THREE.CylinderGeometry(r, r, length, 3, 1);
  geo.rotateZ(Math.PI / 2);
  geo.rotateX(-Math.PI / 2);
  geo.scale(1, pitchScale, 1);
  return geo;
}

/* ================= MAITRI ================= */
const maitri = new THREE.Group();
maitri.name = "Maitri";
scene.add(maitri);
maitri.add(makePad(14, 48));

const baseY = 4.2;

maitri.add(createNeonBox({ width: 15, height: 3.2, depth: 4.2, position: [0, baseY, -2.4], name: "maitri-main-hall" }));
maitri.add(createNeonBox({ width: 4.6, height: 3.2, depth: 10.5, position: [-6.2, baseY, 2.4], name: "maitri-left-wing" }));
maitri.add(createNeonBox({ width: 4.6, height: 3.2, depth: 10.5, position: [6.2, baseY, 2.4], name: "maitri-right-wing" }));

const stiltGeometry = new THREE.CylinderGeometry(0.18, 0.22, baseY, 12);
const ringGeometry = new THREE.TorusGeometry(0.34, 0.035, 12, 32);

const stiltPositions = [
  [-7.2, baseY / 2, -4.2],
  [7.2, baseY / 2, -4.2],
  [-7.2, baseY / 2, 7.2],
  [7.2, baseY / 2, 7.2],
  [-4.2, baseY / 2, 7.2],
  [4.2, baseY / 2, 7.2]
];

for (const [x, y, z] of stiltPositions) {
  const stilt = new THREE.Mesh(stiltGeometry, steelMat);
  stilt.position.set(x, y, z);
  maitri.add(stilt);

  const ring = new THREE.Mesh(ringGeometry, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0.6, z);
  maitri.add(ring);
}

/* Maitri store room (right wing) */
const store = new THREE.Group();
store.name = "maitri-right-store";
store.position.set(6.2, baseY - 1.45, 2.4);
maitri.add(store);

for (let level = 0; level < 3; level++) {
  const shelfGeometry = new THREE.BoxGeometry(3.8, 0.08, 7.2);
  const shelf = new THREE.Mesh(shelfGeometry, shelfFillMat);
  shelf.position.set(0, 0.55 + level * 1.05, 0);
  store.add(shelf);

  const shelfEdges = new THREE.LineSegments(new THREE.EdgesGeometry(shelfGeometry), shelfEdgeMat);
  shelfEdges.position.copy(shelf.position);
  store.add(shelfEdges);
}

const maitriCratePositions = [];
for (let level = 0; level < 3; level++) {
  for (let z = 0; z < 6; z++) {
    for (let x = 0; x < 3; x++) {
      maitriCratePositions.push([-1.15 + x * 1.15, 0.98 + level * 1.05, -2.45 + z * 0.98]);
    }
  }
}
const maitriSet = makeCrateSet(maitriCratePositions, 0.62, {
  warning: 10,
  critical: 23,
  perLevel: 18,
  label: "Maitri Right Store",
  prefix: "CRT"
});
store.add(maitriSet.mesh);

/* ================= HIMADRI =================
   LOCKED SPEC: 2400 sq ft total built-up; 120 sq ft ground store;
   gable-end entrance; centered mirrored cross-gable dormers;
   windows ground floor + dormers only; no flag/mast/annex
---------------------------------------------- */
const himadri = new THREE.Group();
himadri.name = "Himadri";
himadri.position.set(38, 0, -2);
scene.add(himadri);
himadri.add(makePad(15, 48));

const cabinFill = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(NEON).multiplyScalar(0.12),
  transparent: true,
  opacity: 0.14,
  roughness: 0.3,
  metalness: 0.05,
  emissive: new THREE.Color(NEON).multiplyScalar(0.05),
  side: THREE.DoubleSide,
  depthWrite: false
});
const cabinEdgeMat = new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.95 });

const bodyGeo = new THREE.BoxGeometry(13.4, 6, 8.3);
const body = new THREE.Mesh(bodyGeo, cabinFill);
body.position.y = 3;
body.name = "himadri-main-body";
const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), cabinEdgeMat);
body.add(bodyEdges);
himadri.add(body);
registerShell(body, bodyEdges, 0.14);

const bandGeo = new THREE.BoxGeometry(13.44, 0.06, 8.34);
const band = new THREE.LineSegments(new THREE.EdgesGeometry(bandGeo), cabinEdgeMat);
band.position.y = 3;
himadri.add(band);

const roofGeo = gableRoof(8.9, 14.1, 0.5);
const roof = new THREE.Mesh(roofGeo, cabinFill);
roof.position.y = 6 + 0.5 * (8.9 / 1.732) * 0.5;
const roofEdges = new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), cabinEdgeMat);
roof.add(roofEdges);
himadri.add(roof);
registerShell(roof, roofEdges, 0.14);

/* Cross-gable dormers: centered, mirrored, ridge perpendicular */
const dormerDefs = [
  { z: 2.2, faceRot: 0 },
  { z: -2.2, faceRot: Math.PI }
];
for (const dd of dormerDefs) {
  const dGeo = new THREE.BoxGeometry(2.6, 2.2, 3.2);
  const dormer = new THREE.Mesh(dGeo, cabinFill);
  dormer.position.set(0, 7.4, dd.z);
  const dEdges = new THREE.LineSegments(new THREE.EdgesGeometry(dGeo), cabinEdgeMat);
  dormer.add(dEdges);
  himadri.add(dormer);

  const drGeo = gableRoof(3.0, 3.8, 0.45);
  drGeo.rotateY(Math.PI / 2);
  const dRoof = new THREE.Mesh(drGeo, cabinFill);
  dRoof.position.set(0, 8.5 + 0.5 * (3.0 / 1.732) * 0.45, dd.z);
  const dRoofEdges = new THREE.LineSegments(new THREE.EdgesGeometry(drGeo), cabinEdgeMat);
  dRoof.add(dRoofEdges);
  himadri.add(dRoof);

  for (const wx of [-0.4, 0.4]) {
    const dWin = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.4), litMat);
    dWin.position.set(wx, 7.5, dd.z + (dd.z > 0 ? 1.61 : -1.61));
    dWin.rotation.y = dd.faceRot;
    himadri.add(dWin);
  }
}

function addWindow(x, y, z, rotY, w, h, mat) {
  const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat || litMat);
  win.position.set(x, y, z);
  win.rotation.y = rotY || 0;
  himadri.add(win);
}

addWindow(-5.2, 1.6, 4.16, 0, 1.1, 1.3);
addWindow(-2.6, 1.6, 4.16, 0, 1.1, 1.3);
addWindow(2.6, 1.6, 4.16, 0, 1.1, 1.3);
addWindow(5.2, 1.6, 4.16, 0, 1.1, 1.3);
addWindow(-5.2, 1.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(-2.6, 1.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(2.6, 1.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(5.2, 1.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(6.71, 1.6, 2.8, Math.PI / 2, 1.1, 1.3);
addWindow(6.71, 1.6, -2.8, Math.PI / 2, 1.1, 1.3);
addWindow(-6.71, 1.6, 2.8, -Math.PI / 2, 1.1, 1.3);
addWindow(-6.71, 1.6, -2.8, -Math.PI / 2, 1.1, 1.3);
addWindow(6.71, 1.1, 0, Math.PI / 2, 1.4, 2.2, doorMat);

const canopyGeo = new THREE.BoxGeometry(1.5, 0.12, 2.6);
const canopy = new THREE.Mesh(canopyGeo, cabinFill);
canopy.position.set(7.3, 2.75, 0);
const canopyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(canopyGeo), cabinEdgeMat);
canopy.add(canopyEdges);
himadri.add(canopy);

for (const pz of [-1.1, 1.1]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.7, 8), steelMat);
  post.position.set(7.7, 1.35, pz);
  himadri.add(post);
}

const stepDefs = [
  [0.6, 0.16, 2.4, 0.4, 7.05],
  [0.7, 0.16, 2.6, 0.24, 7.4],
  [0.8, 0.16, 2.8, 0.08, 7.75]
];
for (const [dx, h, dz, y, x] of stepDefs) {
  const stepGeo = new THREE.BoxGeometry(dx, h, dz);
  const step = new THREE.Mesh(stepGeo, cabinFill);
  step.position.set(x, y, 0);
  const stepEdges = new THREE.LineSegments(new THREE.EdgesGeometry(stepGeo), cabinEdgeMat);
  step.add(stepEdges);
  himadri.add(step);
}

const walkway = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(8.3, 0.06, 0),
    new THREE.Vector3(11, 0.06, 2),
    new THREE.Vector3(13.5, 0.06, 3)
  ]),
  new THREE.LineBasicMaterial({ color: 0x9fc3ff, transparent: true, opacity: 0.5 })
);
himadri.add(walkway);

/* Himadri ground store: 120 sq ft (west half) */
const hStore = new THREE.Group();
hStore.name = "himadri-ground-store";
hStore.position.set(-4.5, 0, 0);
himadri.add(hStore);

const roomOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(4.0, 2.8, 2.8)),
  new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.55 })
);
roomOutline.position.y = 1.4;
hStore.add(roomOutline);

const rackRowsZ = [-0.75, 0.75];
const levelYs = [0.5, 1.3, 2.1];

for (const rz of rackRowsZ) {
  for (const ly of levelYs) {
    const sGeo = new THREE.BoxGeometry(3.6, 0.06, 0.8);
    const shelf = new THREE.Mesh(sGeo, shelfFillMat);
    shelf.position.set(0, ly, rz);
    hStore.add(shelf);

    const sEdges = new THREE.LineSegments(new THREE.EdgesGeometry(sGeo), shelfEdgeMat);
    sEdges.position.copy(shelf.position);
    hStore.add(sEdges);
  }
}

const himadriCratePositions = [];
for (const ly of levelYs) {
  for (const rz of rackRowsZ) {
    for (let slot = 0; slot < 4; slot++) {
      himadriCratePositions.push([-1.35 + slot * 0.9, ly + 0.3, rz]);
    }
  }
}
const himadriSet = makeCrateSet(himadriCratePositions, 0.5, {
  warning: 5,
  critical: 17,
  perLevel: 8,
  label: "Himadri Ground Store • 120 sq ft",
  prefix: "HMS"
});
hStore.add(himadriSet.mesh);

/* ================= BHARATI =================
   Elevated chamfered hull on pilotis + V-struts; ribbon glazing;
   H4 penthouse with sloped end + chimneys; roof terrace railing;
   ground base block; external stairs; first-floor store (section 1.5)
------------------------------------------------ */
const bharati = new THREE.Group();
bharati.name = "Bharati";
bharati.position.set(92, 0, -2);
scene.add(bharati);
bharati.add(makePad(36, 64));

const bharatiFill = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(NEON).multiplyScalar(0.12),
  transparent: true,
  opacity: 0.14,
  roughness: 0.25,
  metalness: 0.1,
  emissive: new THREE.Color(NEON).multiplyScalar(0.05),
  side: THREE.DoubleSide,
  depthWrite: false
});
const bharatiEdgeMat = new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.95 });
const bharatiEdgeDim = new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.5 });

/* Chamfered hull: extruded cross-section profile */
const hullProfile = new THREE.Shape();
hullProfile.moveTo(-5, 2);
hullProfile.lineTo(5, 2);
hullProfile.lineTo(7, 4);
hullProfile.lineTo(7, 6.6);
hullProfile.lineTo(-7, 6.6);
hullProfile.lineTo(-7, 4);
hullProfile.closePath();

const hullGeo = new THREE.ExtrudeGeometry(hullProfile, { depth: 66, bevelEnabled: false });
hullGeo.rotateY(Math.PI / 2);
hullGeo.translate(-33, 0, 0);

const hull = new THREE.Mesh(hullGeo, bharatiFill);
hull.name = "bharati-main-body";
const hullEdges = new THREE.LineSegments(new THREE.EdgesGeometry(hullGeo, 20), bharatiEdgeMat);
hull.add(hullEdges);
bharati.add(hull);
registerShell(hull, hullEdges, 0.14);

/* Roof slab */
const roofSlabGeo = new THREE.BoxGeometry(66.8, 0.3, 14.8);
const roofSlab = new THREE.Mesh(roofSlabGeo, bharatiFill);
roofSlab.position.y = 6.75;
const roofSlabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(roofSlabGeo), bharatiEdgeMat);
roofSlab.add(roofSlabEdges);
bharati.add(roofSlab);
registerShell(roofSlab, roofSlabEdges, 0.14);

/* Ribbon glazing */
for (const s of [1, -1]) {
  const upperBand = new THREE.Mesh(new THREE.PlaneGeometry(59, 1.0), litMat);
  upperBand.position.set(0, 5.3, s * 7.02);
  upperBand.rotation.y = s > 0 ? 0 : Math.PI;
  bharati.add(upperBand);

  const lowerBand = new THREE.Mesh(new THREE.PlaneGeometry(59, 0.8), litMat);
  lowerBand.position.set(0, 3.0, s * 6.02);
  lowerBand.rotation.x = s > 0 ? -Math.PI / 4 : Math.PI / 4;
  bharati.add(lowerBand);
}

/* Penthouse H4 */
const pentProfile = new THREE.Shape();
pentProfile.moveTo(-20, 6.9);
pentProfile.lineTo(4, 6.9);
pentProfile.lineTo(4, 9.2);
pentProfile.lineTo(-16, 9.2);
pentProfile.closePath();

const pentGeo = new THREE.ExtrudeGeometry(pentProfile, { depth: 8, bevelEnabled: false });
pentGeo.translate(0, 0, -4);

const pent = new THREE.Mesh(pentGeo, bharatiFill);
pent.name = "bharati-penthouse";
const pentEdges = new THREE.LineSegments(new THREE.EdgesGeometry(pentGeo, 20), bharatiEdgeMat);
pent.add(pentEdges);
bharati.add(pent);
registerShell(pent, pentEdges, 0.14);

const chimneyGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.2, 10);
for (const cx of [-17.5, -16.5, -15.5]) {
  const chimney = new THREE.Mesh(chimneyGeo, steelMat);
  chimney.position.set(cx, 9.8, 0);
  bharati.add(chimney);
}

const louverMat = new THREE.MeshBasicMaterial({ color: 0x1d3a63, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
for (const lx of [-14, -9, -4, 1]) {
  for (const s of [1, -1]) {
    const louver = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.5), louverMat);
    louver.position.set(lx, 8.1, s * 4.02);
    louver.rotation.y = s > 0 ? 0 : Math.PI;
    bharati.add(louver);
  }
}

/* Roof terrace railing */
const railGeo = new THREE.BoxGeometry(26, 1, 12);
const railing = new THREE.LineSegments(new THREE.EdgesGeometry(railGeo), bharatiEdgeDim);
railing.position.set(17, 7.45, 0);
bharati.add(railing);

/* Pilotis grid */
const pilotisGeo = new THREE.CylinderGeometry(0.22, 0.22, 2, 10);
for (let px = -30; px <= 30; px += 6) {
  for (const pz of [-4, 4]) {
    const p = new THREE.Mesh(pilotisGeo, steelMat);
    p.position.set(px, 1, pz);
    bharati.add(p);
  }
}

/* V-struts */
const legGeo = new THREE.CylinderGeometry(0.16, 0.16, 3.4, 8);
for (const vx of [-12, 12]) {
  const legA = new THREE.Mesh(legGeo, steelMat);
  legA.position.set(vx, 1.2, 1.8);
  legA.rotation.x = -Math.PI / 4;
  bharati.add(legA);

  const legB = new THREE.Mesh(legGeo, steelMat);
  legB.position.set(vx, 1.2, -1.8);
  legB.rotation.x = Math.PI / 4;
  bharati.add(legB);
}

/* Ground base block */
const baseBlockGeo = new THREE.BoxGeometry(16, 2.2, 9);
const baseBlock = new THREE.Mesh(
  baseBlockGeo,
  new THREE.MeshPhysicalMaterial({ color: 0x0a1626, transparent: true, opacity: 0.55, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false })
);
baseBlock.position.set(-24, 1.1, 0);
const baseBlockEdges = new THREE.LineSegments(new THREE.EdgesGeometry(baseBlockGeo), bharatiEdgeDim);
baseBlock.add(baseBlockEdges);
bharati.add(baseBlock);

/* Entrance door on chamfer + external stair */
const bDoor = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.8), doorMat);
bDoor.position.set(-6, 3.0, 6.0);
bDoor.rotation.x = -Math.PI / 4;
bharati.add(bDoor);

for (let i = 0; i < 8; i++) {
  const stGeo = new THREE.BoxGeometry(2.2, 0.22, 0.4);
  const st = new THREE.Mesh(stGeo, bharatiFill);
  st.position.set(-6, 0.14 + i * 0.26, 8.8 - i * 0.32);
  const stEdges = new THREE.LineSegments(new THREE.EdgesGeometry(stGeo), bharatiEdgeDim);
  st.add(stEdges);
  bharati.add(st);
}

/* End stairs */
for (const s of [-1, 1]) {
  const esGeo = new THREE.BoxGeometry(7, 0.15, 1.4);
  const es = new THREE.LineSegments(new THREE.EdgesGeometry(esGeo), bharatiEdgeDim);
  es.position.set(s * 36.5, 1.1, 0);
  es.rotation.z = -s * 0.35;
  bharati.add(es);
}

/* Bharati first-floor store (section 1.5) */
const bStore = new THREE.Group();
bStore.name = "bharati-first-floor-store";
bStore.position.set(6, 0, 0);
bharati.add(bStore);

const bRoomOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(12, 1.8, 6)),
  new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.55 })
);
bRoomOutline.position.y = 2.9;
bStore.add(bRoomOutline);

const bRackRowsZ = [-2, 0, 2];
const bLevelYs = [2.4, 3.2];

for (const rz of bRackRowsZ) {
  for (const ly of bLevelYs) {
    const sGeo = new THREE.BoxGeometry(10, 0.06, 0.8);
    const shelf = new THREE.Mesh(sGeo, shelfFillMat);
    shelf.position.set(0, ly, rz);
    bStore.add(shelf);

    const sEdges = new THREE.LineSegments(new THREE.EdgesGeometry(sGeo), shelfEdgeMat);
    sEdges.position.copy(shelf.position);
    bStore.add(sEdges);
  }
}

const bharatiCratePositions = [];
for (const ly of bLevelYs) {
  for (const rz of bRackRowsZ) {
    for (let slot = 0; slot < 8; slot++) {
      bharatiCratePositions.push([-4.2 + slot * 1.2, ly + 0.3, rz]);
    }
  }
}
const bharatiSet = makeCrateSet(bharatiCratePositions, 0.5, {
  warning: 13,
  critical: 35,
  perLevel: 24,
  label: "Bharati First-Floor Store • Section 1.5",
  prefix: "BHR"
});
bStore.add(bharatiSet.mesh);

/* ---------------- Selection cage ---------------- */
const selectionCage = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(0.65, 0.65, 0.65)),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
);
selectionCage.visible = false;
scene.add(selectionCage);

/* ---------------- Peel-away exterior ---------------- */
const peelSlider = document.getElementById("peel");

function setPeel(t) {
  for (const shell of exteriorShells) {
    shell.fill.material.opacity = shell.baseOpacity * (1 - t);
    shell.edges.material.opacity = 0.95 - 0.85 * t;
  }
}
peelSlider.addEventListener("input", () => setPeel(peelSlider.value / 100));

/* ---------------- Camera sweeps + home screen flow ---------------- */
const VIEWS = {
  overview: { pos: new THREE.Vector3(46, 42, 108), target: new THREE.Vector3(46, 2, 0) },
  maitri: { pos: new THREE.Vector3(26, 18, 28), target: new THREE.Vector3(0, 4.2, 0) },
  store: { pos: new THREE.Vector3(13.5, 7.5, 12.0), target: new THREE.Vector3(6.2, 3.2, 2.2) },
  himadri: { pos: new THREE.Vector3(54, 10, 16), target: new THREE.Vector3(38, 3.5, -2) },
  himadriStore: { pos: new THREE.Vector3(38, 4.5, 8), target: new THREE.Vector3(33.5, 1.3, -2) },
  bharati: { pos: new THREE.Vector3(132, 18, 46), target: new THREE.Vector3(92, 4, -2) },
  bharatiStore: { pos: new THREE.Vector3(108, 6, 12), target: new THREE.Vector3(98, 2.9, -2) }
};

let currentStation = null;

const STATION_META = {
  maitri: { label: "MAITRI", assets: 54 },
  himadri: { label: "HIMADRI", assets: 24 },
  bharati: { label: "BHARATI", assets: 48 }
};

const homeScreen = document.getElementById("home-screen");
const stationChip = document.getElementById("station-chip");

function updateChip() {
  const meta = STATION_META[currentStation];
  stationChip.textContent = meta ? `${meta.label} • ${meta.assets} ASSETS` : "NO STATION SELECTED";
}

function flyTo(view, duration = 1.8) {
  gsap.to(camera.position, { x: view.pos.x, y: view.pos.y, z: view.pos.z, duration, ease: "power2.inOut" });
  gsap.to(controls.target, { x: view.target.x, y: view.target.y, z: view.target.z, duration, ease: "power2.inOut", onUpdate: () => controls.update() });
}

function enterStation(st) {
  currentStation = st;
  updateChip();
  homeScreen.classList.add("hidden");
  flyTo(VIEWS[st]);
}

function goHome() {
  currentStation = null;
  updateChip();
  peelSlider.value = 0;
  setPeel(0);
  hideAsset();
  homeScreen.classList.remove("hidden");
  flyTo(VIEWS.overview);
}

function enterStore() {
  if (!currentStation) return;
  if (currentStation === "himadri") flyTo(VIEWS.himadriStore);
  else if (currentStation === "bharati") flyTo(VIEWS.bharatiStore);
  else flyTo(VIEWS.store);
  peelSlider.value = 90;
  setPeel(0.9);
}

document.querySelectorAll("[data-station]").forEach((card) => {
  card.addEventListener("click", () => enterStation(card.dataset.station));
});
document.getElementById("btn-home").addEventListener("click", goHome);
document.getElementById("btn-store").addEventListener("click", enterStore);
document.getElementById("btn-reset").addEventListener("click", () => {
  if (!currentStation) return;
  flyTo(VIEWS[currentStation]);
  peelSlider.value = 0;
  setPeel(0);
  hideAsset();
});

/* ---------------- Asset HUD panel ---------------- */
const panel = document.getElementById("asset-panel");
const assetIdEl = document.getElementById("asset-id");
const assetStatusEl = document.getElementById("asset-status");
const assetBodyEl = document.getElementById("asset-body");

const CATALOG = ["Pasta Rations", "Medical Kit", "Fuel Canister", "Battery Pack", "Spare Filters", "Science Samples"];

function assetFor(set, i) {
  const status = i === set.warning ? "warning" : i === set.critical ? "critical" : "normal";
  return {
    id: `${set.prefix}-${1000 + i}`,
    name: CATALOG[i % CATALOG.length],
    status,
    expiry: status === "critical" ? "2026-10-15" : status === "warning" ? "2026-12-02" : "2027-03-01",
    location: `${set.label} • Level ${Math.floor(i / set.perLevel) + 1} • Slot ${(i % set.perLevel) + 1}`
  };
}

function showAsset(set, i) {
  const a = assetFor(set, i);
  assetIdEl.textContent = a.id;
  assetStatusEl.textContent = a.status.toUpperCase();
  assetStatusEl.className = "status " + a.status;
  assetBodyEl.innerHTML =
    `<div><b>Item:</b> ${a.name}</div>` +
    `<div><b>Expiry:</b> ${a.expiry}</div>` +
    `<div><b>Position:</b> ${a.location}</div>`;
  panel.classList.remove("hidden");
}

function hideAsset() {
  panel.classList.add("hidden");
  selectionCage.visible = false;
  selectedInstance = null;
}
document.getElementById("asset-close").addEventListener("click", hideAsset);

/* ---------------- Picking ---------------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedInstance = null;
let downX = 0, downY = 0;

renderer.domElement.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;

  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  for (const set of CRATE_SETS) {
    const hits = raycaster.intersectObject(set.mesh, false);
    if (hits.length && hits[0].instanceId !== undefined) {
      selectedInstance = hits[0].instanceId;

      const m = new THREE.Matrix4();
      set.mesh.getMatrixAt(selectedInstance, m);
      const world = set.mesh.localToWorld(new THREE.Vector3().setFromMatrixPosition(m));

      selectionCage.position.copy(world);
      selectionCage.visible = true;

      showAsset(set, selectedInstance);
      return;
    }
  }

  const shellHits = raycaster.intersectObjects(exteriorShells.map((s) => s.fill), false);
  if (shellHits.length) {
    const name = shellHits[0].object.name || shellHits[0].object.parent.name;
    if (name === "maitri-right-wing") { currentStation = "maitri"; updateChip(); enterStore(); }
    if (name === "himadri-main-body") { currentStation = "himadri"; updateChip(); enterStore(); }
    if (name === "bharati-main-body") { currentStation = "bharati"; updateChip(); enterStore(); }
  }
});

/* ---------------- Resize ---------------- */
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ---------------- Animate ---------------- */
const clock = new THREE.Clock();
const tmpColor = new THREE.Color();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4));
  for (const set of CRATE_SETS) {
    tmpColor.copy(criticalColor).multiplyScalar(pulse);
    set.mesh.setColorAt(set.critical, tmpColor);
    set.mesh.instanceColor.needsUpdate = true;
  }

  if (selectionCage.visible) selectionCage.rotation.y = t * 0.8;

  controls.update();
  composer.render();
}
animate();
