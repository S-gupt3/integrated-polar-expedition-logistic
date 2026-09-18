import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import gsap from "gsap";

/* ---------------- Scene / Camera / Renderer ---------------- */
const app = document.querySelector("#app");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030614);
scene.fog = new THREE.FogExp2(0x030614, 0.01);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);
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
controls.maxDistance = 120;
controls.minDistance = 1.5;

/* ---------------- Post-processing ---------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.35, 0.4);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ---------------- Lights & ground ---------------- */
scene.add(new THREE.AmbientLight(0x88bbff, 0.4));
const keyLight = new THREE.DirectionalLight(0xcfefff, 0.9);
keyLight.position.set(20, 30, 14);
scene.add(keyLight);

const grid = new THREE.GridHelper(180, 180, 0x33f6ff, 0x0e3a5a);
grid.material.transparent = true;
grid.material.opacity = 0.3;
scene.add(grid);

/* ---------------- Shell registry (peel-away) ---------------- */
const exteriorShells = [];
function registerShell(fill, edges, baseOpacity) {
  exteriorShells.push({ fill, edges, baseOpacity });
}

function createNeonBox({ width = 1, height = 1, depth = 1, color = 0x33f6ff, opacity = 0.16, position = [0, 0, 0], name = "" }) {
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
const normalColor = new THREE.Color(0x0d9db8);
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

/* ---------------- Maitri base ---------------- */
const maitri = new THREE.Group();
maitri.name = "Maitri";
scene.add(maitri);

const baseY = 4.2;

maitri.add(createNeonBox({ width: 15, height: 3.2, depth: 4.2, position: [0, baseY, -2.4], name: "maitri-main-hall" }));
maitri.add(createNeonBox({ width: 4.6, height: 3.2, depth: 10.5, position: [-6.2, baseY, 2.4], name: "maitri-left-wing" }));
maitri.add(createNeonBox({ width: 4.6, height: 3.2, depth: 10.5, position: [6.2, baseY, 2.4], name: "maitri-right-wing" }));

const stiltGeometry = new THREE.CylinderGeometry(0.18, 0.22, baseY, 12);
const stiltMaterial = new THREE.MeshStandardMaterial({ color: 0x1d3a55, metalness: 0.65, roughness: 0.32, emissive: 0x0a1e30 });
const ringGeometry = new THREE.TorusGeometry(0.34, 0.035, 12, 32);
const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x33f6ff });

const stiltPositions = [
  [-7.2, baseY / 2, -4.2],
  [7.2, baseY / 2, -4.2],
  [-7.2, baseY / 2, 7.2],
  [7.2, baseY / 2, 7.2],
  [-4.2, baseY / 2, 7.2],
  [4.2, baseY / 2, 7.2]
];

for (const [x, y, z] of stiltPositions) {
  const stilt = new THREE.Mesh(stiltGeometry, stiltMaterial);
  stilt.position.set(x, y, z);
  maitri.add(stilt);

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0.6, z);
  maitri.add(ring);
}

/* ---------------- Maitri store room (right wing) ---------------- */
const store = new THREE.Group();
store.name = "maitri-right-store";
store.position.set(6.2, baseY - 1.45, 2.4);
maitri.add(store);

const shelfMaterial = new THREE.MeshBasicMaterial({ color: 0x1b5a7a, transparent: true, opacity: 0.5 });
const shelfEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x2fd0f5, transparent: true, opacity: 0.9 });

for (let level = 0; level < 3; level++) {
  const shelfGeometry = new THREE.BoxGeometry(3.8, 0.08, 7.2);
  const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
  shelf.position.set(0, 0.55 + level * 1.05, 0);
  store.add(shelf);

  const shelfEdges = new THREE.LineSegments(new THREE.EdgesGeometry(shelfGeometry), shelfEdgeMaterial);
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

/* ---------------- Himadri base (house-like main building) ----------------
   LOCKED SPEC:
   Total built-up = 2400 sq ft = 222.97 m²
     -> 2 floors x (13.4m x 8.3m) = 2 x 111.2 m² = 222.4 m² = 2394 sq ft (~2400 ✓)
   Ground-floor store room = 120 sq ft = 11.15 m²
     -> 4.0m x 2.8m = 11.2 m² = 120.6 sq ft (~120 ✓)
   Entrance: gable end (+X face), per station sketches
   Dormers: CENTERED on each slope (x = 0), mirrored across the ridge
   Window grid: identical on front and back facades; glazing double-sided
   NO flag, NO antenna/mast, NO annex building
------------------------------------------------------------------------- */
const himadri = new THREE.Group();
himadri.name = "Himadri";
himadri.position.set(38, 0, -2);
scene.add(himadri);

const snowField = new THREE.Mesh(
  new THREE.CircleGeometry(15, 48),
  new THREE.MeshBasicMaterial({ color: 0x0f3346, transparent: true, opacity: 0.5 })
);
snowField.rotation.x = -Math.PI / 2;
snowField.position.y = 0.02;
himadri.add(snowField);

const snowRim = new THREE.Mesh(
  new THREE.RingGeometry(14.7, 15, 48),
  new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
);
snowRim.rotation.x = -Math.PI / 2;
snowRim.position.y = 0.03;
himadri.add(snowRim);

const cabinFill = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(0xff9a4d).multiplyScalar(0.12),
  transparent: true,
  opacity: 0.14,
  roughness: 0.3,
  metalness: 0.05,
  emissive: new THREE.Color(0xff9a4d).multiplyScalar(0.05),
  side: THREE.DoubleSide,
  depthWrite: false
});
const cabinEdgeMat = new THREE.LineBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.95 });
const litWindowMat = new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
const doorMat = new THREE.MeshBasicMaterial({ color: 0x7a4a22, transparent: true, opacity: 0.9, side: THREE.DoubleSide });

function gableRoof(widthSpan, length, pitchScale) {
  const r = widthSpan / 1.732;
  const geo = new THREE.CylinderGeometry(r, r, length, 3, 1);
  geo.rotateZ(Math.PI / 2);
  geo.rotateX(-Math.PI / 2);
  geo.scale(1, pitchScale, 1);
  return geo;
}

/* Main house body: two storeys, 13.4m x 8.3m footprint (1200 sq ft per floor) */
const bodyGeo = new THREE.BoxGeometry(13.4, 6, 8.3);
const body = new THREE.Mesh(bodyGeo, cabinFill);
body.position.y = 3;
body.name = "himadri-main-body";
const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), cabinEdgeMat);
body.add(bodyEdges);
himadri.add(body);
registerShell(body, bodyEdges, 0.14);

/* Floor band line between ground and first floor */
const bandGeo = new THREE.BoxGeometry(13.44, 0.06, 8.34);
const band = new THREE.LineSegments(new THREE.EdgesGeometry(bandGeo), cabinEdgeMat);
band.position.y = 3;
himadri.add(band);

/* Steep pitched roof */
const roofGeo = gableRoof(8.9, 14.1, 0.5);
const roof = new THREE.Mesh(roofGeo, cabinFill);
roof.position.y = 6 + 0.5 * (8.9 / 1.732) * 0.5;
const roofEdges = new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), cabinEdgeMat);
roof.add(roofEdges);
himadri.add(roof);
registerShell(roof, roofEdges, 0.14);

/* Dormers: CENTERED (x = 0), one per slope, mirrored across the ridge */
const dormerDefs = [
  { x: 0, z: 2.6, winRot: 0 },
  { x: 0, z: -2.6, winRot: Math.PI }
];
for (const dd of dormerDefs) {
  const dGeo = new THREE.BoxGeometry(2.2, 1.6, 1.6);
  const dormer = new THREE.Mesh(dGeo, cabinFill);
  dormer.position.set(dd.x, 7.7, dd.z);
  const dEdges = new THREE.LineSegments(new THREE.EdgesGeometry(dGeo), cabinEdgeMat);
  dormer.add(dEdges);
  himadri.add(dormer);

  const drGeo = gableRoof(2.4, 2.0, 0.6);
  const dRoof = new THREE.Mesh(drGeo, cabinFill);
  dRoof.position.set(dd.x, 8.5 + 0.5 * (2.4 / 1.732) * 0.6, dd.z);
  const dRoofEdges = new THREE.LineSegments(new THREE.EdgesGeometry(drGeo), cabinEdgeMat);
  dRoof.add(dRoofEdges);
  himadri.add(dRoof);

  const dWin = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), litWindowMat);
  dWin.position.set(dd.x, 7.7, dd.z + (dd.z > 0 ? 0.81 : -0.81));
  dWin.rotation.y = dd.winRot;
  himadri.add(dWin);
}

/* Windows */
function addWindow(x, y, z, rotY, w, h, mat) {
  const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat || litWindowMat);
  win.position.set(x, y, z);
  win.rotation.y = rotY || 0;
  himadri.add(win);
}

/* Front facade (z+) : ground 4 + upper 5 */
addWindow(-5.2, 1.6, 4.16, 0, 1.1, 1.3);
addWindow(-2.6, 1.6, 4.16, 0, 1.1, 1.3);
addWindow(2.6, 1.6, 4.16, 0, 1.1, 1.3);
addWindow(5.2, 1.6, 4.16, 0, 1.1, 1.3);
addWindow(-5.2, 4.6, 4.16, 0, 1.1, 1.3);
addWindow(-2.6, 4.6, 4.16, 0, 1.1, 1.3);
addWindow(0, 4.6, 4.16, 0, 1.1, 1.3);
addWindow(2.6, 4.6, 4.16, 0, 1.1, 1.3);
addWindow(5.2, 4.6, 4.16, 0, 1.1, 1.3);

/* Back facade (z-) : exact mirror of front */
addWindow(-5.2, 1.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(-2.6, 1.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(2.6, 1.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(5.2, 1.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(-5.2, 4.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(-2.6, 4.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(0, 4.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(2.6, 4.6, -4.16, Math.PI, 1.1, 1.3);
addWindow(5.2, 4.6, -4.16, Math.PI, 1.1, 1.3);

/* Gable ends: identical set on both */
addWindow(6.71, 4.6, 0, Math.PI / 2, 1.2, 1.4);
addWindow(6.71, 7.6, 0, Math.PI / 2, 0.9, 0.9);
addWindow(-6.71, 4.6, 0, -Math.PI / 2, 1.2, 1.4);
addWindow(-6.71, 7.6, 0, -Math.PI / 2, 0.9, 0.9);

/* ENTRANCE: door on the gable-end front face (+X) */
addWindow(6.71, 1.1, 0, Math.PI / 2, 1.4, 2.2, doorMat);

/* Porch on the front (gable end): canopy, posts, steps */
const canopyGeo = new THREE.BoxGeometry(1.5, 0.12, 2.6);
const canopy = new THREE.Mesh(canopyGeo, cabinFill);
canopy.position.set(7.3, 2.75, 0);
const canopyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(canopyGeo), cabinEdgeMat);
canopy.add(canopyEdges);
himadri.add(canopy);

for (const pz of [-1.1, 1.1]) {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 2.7, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, metalness: 0.3, roughness: 0.6 })
  );
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

/* Walkway from front steps */
const walkway = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(8.3, 0.06, 0),
    new THREE.Vector3(11, 0.06, 2),
    new THREE.Vector3(13.5, 0.06, 3)
  ]),
  new THREE.LineBasicMaterial({ color: 0xffd9a8, transparent: true, opacity: 0.5 })
);
himadri.add(walkway);

/* ---------------- Himadri ground-floor store: 120 sq ft (west half) -------
   Interior 4.0m x 2.8m = 11.2 m² = 120.6 sq ft
   Racking: 2 rows x 4 slots x 3 levels = 24 crate slots
------------------------------------------------------------------------- */
const hStore = new THREE.Group();
hStore.name = "himadri-ground-store";
hStore.position.set(-4.5, 0, 0);
himadri.add(hStore);

const roomOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(4.0, 2.8, 2.8)),
  new THREE.LineBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.55 })
);
roomOutline.position.y = 1.4;
hStore.add(roomOutline);

const hShelfMat = new THREE.MeshBasicMaterial({ color: 0x5a3a1e, transparent: true, opacity: 0.5 });
const hShelfEdgeMat = new THREE.LineBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.7 });

const rackRowsZ = [-0.75, 0.75];
const levelYs = [0.5, 1.3, 2.1];

for (const rz of rackRowsZ) {
  for (const ly of levelYs) {
    const sGeo = new THREE.BoxGeometry(3.6, 0.06, 0.8);
    const shelf = new THREE.Mesh(sGeo, hShelfMat);
    shelf.position.set(0, ly, rz);
    hStore.add(shelf);

    const sEdges = new THREE.LineSegments(new THREE.EdgesGeometry(sGeo), hShelfEdgeMat);
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

/* ---------------- Selection cage (scene-level) ---------------- */
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

/* ---------------- Camera sweeps (GSAP) ---------------- */
const VIEWS = {
  overview: { pos: new THREE.Vector3(18, 26, 58), target: new THREE.Vector3(18, 2.5, 0) },
  maitri: { pos: new THREE.Vector3(26, 18, 28), target: new THREE.Vector3(0, 4.2, 0) },
  store: { pos: new THREE.Vector3(13.5, 7.5, 12.0), target: new THREE.Vector3(6.2, 3.2, 2.2) },
  himadri: { pos: new THREE.Vector3(54, 10, 16), target: new THREE.Vector3(38, 3.5, -2) },
  himadriStore: { pos: new THREE.Vector3(38, 4.5, 8), target: new THREE.Vector3(33.5, 1.3, -2) }
};

let currentStation = "maitri";

function flyTo(view, duration = 1.8) {
  gsap.to(camera.position, { x: view.pos.x, y: view.pos.y, z: view.pos.z, duration, ease: "power2.inOut" });
  gsap.to(controls.target, { x: view.target.x, y: view.target.y, z: view.target.z, duration, ease: "power2.inOut", onUpdate: () => controls.update() });
}

function enterStore() {
  flyTo(currentStation === "himadri" ? VIEWS.himadriStore : VIEWS.store);
  peelSlider.value = 90;
  setPeel(0.9);
}

document.getElementById("btn-store").addEventListener("click", enterStore);
document.getElementById("btn-maitri").addEventListener("click", () => { currentStation = "maitri"; flyTo(VIEWS.maitri); });
document.getElementById("btn-himadri").addEventListener("click", () => { currentStation = "himadri"; flyTo(VIEWS.himadri); });
document.getElementById("btn-reset").addEventListener("click", () => {
  currentStation = "maitri";
  flyTo(VIEWS.overview);
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

/* ---------------- Picking (click, not drag) ---------------- */
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
    if (name === "maitri-right-wing") { currentStation = "maitri"; enterStore(); }
    if (name === "himadri-main-body") { currentStation = "himadri"; enterStore(); }
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
