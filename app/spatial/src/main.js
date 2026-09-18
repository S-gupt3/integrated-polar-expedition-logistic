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

/* ---------------- Post-processing (tuned bloom) ---------------- */
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

/* ---------------- Neon shell builder ---------------- */
const exteriorShells = [];

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

  exteriorShells.push({ fill, edges, baseOpacity: opacity });
  return group;
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

/* ---------------- Himadri base (snowfield cabins) ---------------- */
const himadri = new THREE.Group();
himadri.name = "Himadri";
himadri.position.set(38, 0, -2);
scene.add(himadri);

const snowField = new THREE.Mesh(
  new THREE.CircleGeometry(16, 48),
  new THREE.MeshBasicMaterial({ color: 0x0f3346, transparent: true, opacity: 0.5 })
);
snowField.rotation.x = -Math.PI / 2;
snowField.position.y = 0.02;
himadri.add(snowField);

const snowRim = new THREE.Mesh(
  new THREE.RingGeometry(15.7, 16, 48),
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

function createCabin({ w = 3.2, h = 2.2, d = 4.4, position = [0, 0, 0], rotation = 0, name = "" }) {
  const cabin = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const body = new THREE.Mesh(bodyGeo, cabinFill);
  body.position.y = h / 2;
  body.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), cabinEdgeMat));
  cabin.add(body);

  const r = w / 1.732 + 0.25;
  const pitch = r * 0.62;
  const roofGeo = new THREE.CylinderGeometry(r, r, d + 0.4, 3, 1);
  roofGeo.rotateZ(Math.PI / 2);
  roofGeo.rotateX(-Math.PI / 2);
  roofGeo.scale(1, 0.62, 1);

  const roof = new THREE.Mesh(roofGeo, cabinFill);
  roof.position.y = h + pitch * 0.5;
  roof.add(new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), cabinEdgeMat));
  cabin.add(roof);

  cabin.rotation.y = rotation;
  cabin.position.set(...position);
  cabin.name = name;
  return cabin;
}

const cabinLayout = [
  { position: [0, 0, 0], rotation: 0.15, name: "himadri-main-hut", w: 4.2, h: 2.6, d: 5.6 },
  { position: [-6.5, 0, -4.5], rotation: -0.35, name: "himadri-lab-hut" },
  { position: [5.5, 0, -6], rotation: 0.5, name: "himadri-store-hut" },
  { position: [7, 0, 3.5], rotation: -0.15, name: "himadri-gen-hut" },
  { position: [-5, 0, 5], rotation: 0.8, name: "himadri-comms-hut" }
];
for (const c of cabinLayout) himadri.add(createCabin(c));

const pathPoints = cabinLayout.map((c) => new THREE.Vector3(c.position[0], 0.06, c.position[2]));
const walkway = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(pathPoints),
  new THREE.LineBasicMaterial({ color: 0xffd9a8, transparent: true, opacity: 0.5 })
);
himadri.add(walkway);

const mast = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.1, 7, 8),
  new THREE.MeshStandardMaterial({ color: 0x33404d, metalness: 0.7, roughness: 0.35 })
);
mast.position.set(-5, 3.5, 5);
himadri.add(mast);

const beacon = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff5577, transparent: true, opacity: 0.9 })
);
beacon.position.set(-5, 7.1, 5);
himadri.add(beacon);

/* ---------------- Store room (right wing) ---------------- */

/* ---------------- Instanced crates ---------------- */
const WARNING_INDEX = 10;
const CRITICAL_INDEX = 23;

const crateGeometry = new THREE.BoxGeometry(0.62, 0.62, 0.62);
const crateMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
const crateCount = 54;
const crates = new THREE.InstancedMesh(crateGeometry, crateMaterial, crateCount);

const dummy = new THREE.Object3D();
const originalColors = [];
const normalColor = new THREE.Color(0x0d9db8);
const warningColor = new THREE.Color(0xd99a2b);
const criticalColor = new THREE.Color(0xe02c4c);

let instanceIndex = 0;
for (let level = 0; level < 3; level++) {
  for (let z = 0; z < 6; z++) {
    for (let x = 0; x < 3; x++) {
      dummy.position.set(-1.15 + x * 1.15, 0.98 + level * 1.05, -2.45 + z * 0.98);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      crates.setMatrixAt(instanceIndex, dummy.matrix);

      let color = normalColor;
      if (instanceIndex === WARNING_INDEX) color = warningColor;
      if (instanceIndex === CRITICAL_INDEX) color = criticalColor;

      crates.setColorAt(instanceIndex, color);
      originalColors.push(color.clone());
      instanceIndex++;
    }
  }
}
crates.instanceMatrix.needsUpdate = true;
if (crates.instanceColor) crates.instanceColor.needsUpdate = true;
store.add(crates);

const selectionCage = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.8, 0.8)),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
);
selectionCage.visible = false;
store.add(selectionCage);

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
  overview: { pos: new THREE.Vector3(16, 22, 50), target: new THREE.Vector3(16, 2.5, 0) },
  maitri: { pos: new THREE.Vector3(26, 18, 28), target: new THREE.Vector3(0, 4.2, 0) },
  store: { pos: new THREE.Vector3(13.5, 7.5, 12.0), target: new THREE.Vector3(6.2, 3.2, 2.2) },
  himadri: { pos: new THREE.Vector3(52, 14, 22), target: new THREE.Vector3(38, 2, -2) }
};

function flyTo(view, duration = 1.8) {
  gsap.to(camera.position, { x: view.pos.x, y: view.pos.y, z: view.pos.z, duration, ease: "power2.inOut" });
  gsap.to(controls.target, { x: view.target.x, y: view.target.y, z: view.target.z, duration, ease: "power2.inOut", onUpdate: () => controls.update() });
}

function enterStore() {
  flyTo(VIEWS.store);
  peelSlider.value = 90;
  setPeel(0.9);
}

document.getElementById("btn-store").addEventListener("click", enterStore);
document.getElementById("btn-maitri").addEventListener("click", () => flyTo(VIEWS.maitri));
document.getElementById("btn-himadri").addEventListener("click", () => flyTo(VIEWS.himadri));
document.getElementById("btn-reset").addEventListener("click", () => {
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

function assetFor(i) {
  const status = i === WARNING_INDEX ? "warning" : i === CRITICAL_INDEX ? "critical" : "normal";
  return {
    id: `CRT-${1000 + i}`,
    name: CATALOG[i % CATALOG.length],
    status,
    expiry: status === "critical" ? "2026-10-15" : status === "warning" ? "2026-12-02" : "2027-03-01",
    location: `Right Store • Level ${Math.floor(i / 18) + 1} • Slot ${(i % 18) + 1}`
  };
}

function showAsset(i) {
  const a = assetFor(i);
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

  const crateHits = raycaster.intersectObject(crates, false);
  if (crateHits.length && crateHits[0].instanceId !== undefined) {
    selectedInstance = crateHits[0].instanceId;

    const m = new THREE.Matrix4();
    crates.getMatrixAt(selectedInstance, m);
    const p = new THREE.Vector3().setFromMatrixPosition(m);

    selectionCage.position.copy(p);
    selectionCage.visible = true;

    showAsset(selectedInstance);
    return;
  }

  const shellHits = raycaster.intersectObjects(exteriorShells.map((s) => s.fill), false);
  if (shellHits.length && shellHits[0].object.parent.name === "maitri-right-wing") {
    enterStore();
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

  if (selectedInstance !== CRITICAL_INDEX) {
      const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4));
      tmpColor.copy(criticalColor).multiplyScalar(pulse);
      crates.setColorAt(CRITICAL_INDEX, tmpColor);
      crates.instanceColor.needsUpdate = true;
  }

  if (selectionCage.visible) selectionCage.rotation.y = t * 0.8;

  beacon.material.opacity = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.2));

  controls.update();
  composer.render();
}
animate();
