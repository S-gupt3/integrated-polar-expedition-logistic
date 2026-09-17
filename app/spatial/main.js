import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const app = document.querySelector("#app");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030614);
scene.fog = new THREE.FogExp2(0x030614, 0.026);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  400
);
camera.position.set(26, 18, 28);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 4.2, 0);
controls.enableDamping = true;
controls.maxDistance = 120;
controls.minDistance = 3;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.95,
  0.8,
  0.06
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

scene.add(new THREE.AmbientLight(0x88bbff, 0.4));

const keyLight = new THREE.DirectionalLight(0xcfefff, 0.9);
keyLight.position.set(20, 30, 14);
scene.add(keyLight);

const grid = new THREE.GridHelper(180, 180, 0x33f6ff, 0x0e3a5a);
grid.material.transparent = true;
grid.material.opacity = 0.22;
scene.add(grid);

function createNeonBox({
  width = 1,
  height = 1,
  depth = 1,
  color = 0x33f6ff,
  opacity = 0.16,
  position = [0, 0, 0],
  name = ""
}) {
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

  const edgeMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95
  });

  const fill = new THREE.Mesh(geometry, fillMaterial);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);

  fill.add(edges);
  group.add(fill);

  group.position.set(...position);
  group.name = name;

  return group;
}

const maitri = new THREE.Group();
maitri.name = "Maitri";
scene.add(maitri);

const baseY = 4.2;

maitri.add(
  createNeonBox({
    width: 15,
    height: 3.2,
    depth: 4.2,
    position: [0, baseY, -2.4],
    name: "maitri-main-hall"
  })
);

maitri.add(
  createNeonBox({
    width: 4.6,
    height: 3.2,
    depth: 10.5,
    position: [-6.2, baseY, 2.4],
    name: "maitri-left-wing"
  })
);

maitri.add(
  createNeonBox({
    width: 4.6,
    height: 3.2,
    depth: 10.5,
    position: [6.2, baseY, 2.4],
    name: "maitri-right-wing"
  })
);

const stiltGeometry = new THREE.CylinderGeometry(0.18, 0.22, baseY, 12);
const stiltMaterial = new THREE.MeshStandardMaterial({
  color: 0x10253a,
  metalness: 0.65,
  roughness: 0.32,
  emissive: 0x071725
});

const ringGeometry = new THREE.TorusGeometry(0.34, 0.035, 12, 32);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x33f6ff
});

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

const store = new THREE.Group();
store.name = "maitri-right-store";
store.position.set(6.2, baseY - 1.45, 2.4);
maitri.add(store);

const shelfMaterial = new THREE.MeshBasicMaterial({
  color: 0x14405c,
  transparent: true,
  opacity: 0.38
});

const shelfEdgeMaterial = new THREE.LineBasicMaterial({
  color: 0x23b7e8,
  transparent: true,
  opacity: 0.72
});

for (let level = 0; level < 3; level++) {
  const shelfGeometry = new THREE.BoxGeometry(3.8, 0.08, 7.2);

  const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
  shelf.position.set(0, 0.55 + level * 1.05, 0);
  store.add(shelf);

  const shelfEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(shelfGeometry),
    shelfEdgeMaterial
  );
  shelfEdges.position.copy(shelf.position);
  store.add(shelfEdges);
}

const crateGeometry = new THREE.BoxGeometry(0.72, 0.72, 0.72);
const crateMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.92
});

const crateCount = 54;
const crates = new THREE.InstancedMesh(crateGeometry, crateMaterial, crateCount);

const dummy = new THREE.Object3D();
const originalColors = [];

const normalColor = new THREE.Color(0x19e3ff);
const warningColor = new THREE.Color(0xffbf39);
const criticalColor = new THREE.Color(0xff3b5c);

let instanceIndex = 0;

for (let level = 0; level < 3; level++) {
  for (let z = 0; z < 6; z++) {
    for (let x = 0; x < 3; x++) {
      const px = -1.15 + x * 1.15;
      const py = 0.98 + level * 1.05;
      const pz = -2.45 + z * 0.98;

      dummy.position.set(px, py, pz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      crates.setMatrixAt(instanceIndex, dummy.matrix);

      let color = normalColor;

      if (instanceIndex === 10) color = warningColor;
      if (instanceIndex === 23) color = criticalColor;

      crates.setColorAt(instanceIndex, color);
      originalColors.push(color.clone());

      instanceIndex++;
    }
  }
}

crates.instanceMatrix.needsUpdate = true;
if (crates.instanceColor) crates.instanceColor.needsUpdate = true;

store.add(crates);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedInstance = null;
const selectedColor = new THREE.Color(0xffffff);

window.addEventListener("pointerdown", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObject(crates, false);
  if (!hits.length) return;

  const instanceId = hits[0].instanceId;
  if (instanceId === undefined) return;

  if (selectedInstance !== null) {
    crates.setColorAt(selectedInstance, originalColors[selectedInstance]);
  }

  crates.setColorAt(instanceId, selectedColor);
  selectedInstance = instanceId;

  if (crates.instanceColor) crates.instanceColor.needsUpdate = true;

  console.log("Selected crate instance:", instanceId);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}

animate();
