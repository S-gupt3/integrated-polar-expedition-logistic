// Constants
const SIM_DAYS = 365;
const SIM_STEP = 5;
const TARGET_SPAN = 180;
const SHEET_SIZE = 240;

// Simulation state
const simState = {
    path: [],
    meta: null,
    frame: 0,
    playing: true,
    speed: 1,
    exaggeration: 1,
    metresPerUnit: 1
};

// Helper: Build ice sheet mesh
function buildSheet(THREE) {
    const geometry = new THREE.PlaneGeometry(SHEET_SIZE, SHEET_SIZE, 32, 32);
    geometry.rotateX(-Math.PI / 2);
    
    const position = geometry.attributes.position;
    const base = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
        base[i * 3] = position.array[i * 3];
        base[i * 3 + 1] = position.array[i * 3 + 1];
        base[i * 3 + 2] = position.array[i * 3 + 2];
    }
    
    const material = new THREE.MeshStandardMaterial({
        color: 0xdbe7f5,
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    
    return { mesh, geometry, base };
}

// Helper: Create marker mesh (pin)
function markerMesh(THREE, color, size) {
    const group = new THREE.Group();
    
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(size * 0.3, 16, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 })
    );
    sphere.position.y = size * 0.5;
    
    const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.08, size * 0.08, size, 8),
        new THREE.MeshStandardMaterial({ color })
    );
    
    group.add(sphere, cylinder);
    return group;
}

// Helper: Generate ridge height for ice surface animation
function ridgeHeight(x, z, phase) {
    const dist = Math.sqrt(x * x + z * z);
    const ridge = Math.sin(dist * 0.05 + phase) * 2;
    const noise = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 1.5;
    return ridge + noise;
}

// Helper: Convert drift series to local meter coordinates
function toLocalMetres(series) {
    if (!series || series.length === 0) return [];
    
    const first = series[0];
    const result = [];
    
    series.forEach((point, index) => {
        // Convert lat/lon to local easting/northing meters (simplified projection)
        const latDiff = point.lat - first.lat;
        const lonDiff = point.lon - first.lon;
        
        // Approximate meters: 1 degree lat ≈ 111,111 m, 1 degree lon varies with latitude
        const north = latDiff * 111111;
        const east = lonDiff * 111111 * Math.cos((first.lat * Math.PI) / 180);
        
        const metres = point.displacement_m || Math.sqrt(north * north + east * east);
        
        result.push({
            day: point.day || index * SIM_STEP,
            lat: point.lat || point.corrected_lat || first.lat,
            lon: point.lon || point.corrected_lon || first.lon,
            north,
            east,
            metres
        });
    });
    
    return result;
}

// Main initialization function
async function initDriftSim() {
    const stage = document.getElementById('sim-stage');
    if (!stage || typeof THREE === 'undefined') {
        console.error('Three.js not loaded or stage element missing');
        return;
    }

    const select = document.getElementById('sim-station');
    const slider = document.getElementById('sim-slider');
    const playButton = document.getElementById('sim-play');
    const speedButton = document.getElementById('sim-speed');

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x08090a, 220, 520);

    const camera = new THREE.PerspectiveCamera(42, 1, 1, 2000);
    const orbit = { radius: 210, theta: -0.7, phi: 0.92 };

    const hemi = new THREE.HemisphereLight(0xdceaff, 0x0a1622, 1.05);
    const key = new THREE.DirectionalLight(0xffffff, .85);
    key.position.set(120, 180, 90);
    scene.add(hemi, key);

    const grid = new THREE.GridHelper(SHEET_SIZE, 32, 0x2a3140, 0x171b23);
    grid.position.y = -7;
    scene.add(grid);

    const iceGroup = new THREE.Group();
    const sheet = buildSheet(THREE);
    iceGroup.add(sheet.mesh);

    const stationPin = markerMesh(THREE, 0x5e6ad2, 16);
    iceGroup.add(stationPin);

    const assetPins = new THREE.Group();
    [[-26, 18], [31, -12], [12, 34], [-18, -30]].forEach(([x, z]) => {
        const pin = markerMesh(THREE, 0x4cb782, 9);
        pin.position.set(x, 0, z);
        assetPins.add(pin);
    });
    iceGroup.add(assetPins);
    scene.add(iceGroup);

    const anchor = markerMesh(THREE, 0xeb5757, 13);
    scene.add(anchor);

    const trailMaterial = new THREE.LineBasicMaterial({ color: 0xf2c94c });
    const trailGeometry = new THREE.BufferGeometry();
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trail);

    const applyTheme = () => {
        const survival = document.body.dataset.theme === 'emergency';
        sheet.material.color.set(survival ? 0x3a1f00 : 0xdbe7f5);
        sheet.material.wireframe = survival;
        grid.visible = !survival;
        trailMaterial.color.set(survival ? 0xffe600 : 0xf2c94c);
        scene.fog.color.set(0x000000);
    };

    const resize = () => {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    renderer.domElement.addEventListener('pointerdown', (event) => { 
        dragging = true; 
        lastX = event.clientX; 
        lastY = event.clientY; 
        renderer.domElement.setPointerCapture(event.pointerId); 
    });
    renderer.domElement.addEventListener('pointerup', (event) => { 
        dragging = false; 
        renderer.domElement.releasePointerCapture(event.pointerId); 
    });
    renderer.domElement.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        orbit.theta -= (event.clientX - lastX) * .006;
        orbit.phi = Math.max(.22, Math.min(1.42, orbit.phi - (event.clientY - lastY) * .005));
        lastX = event.clientX;
        lastY = event.clientY;
    });
    renderer.domElement.addEventListener('wheel', (event) => {
        event.preventDefault();
        orbit.radius = Math.max(90, Math.min(420, orbit.radius + event.deltaY * .25));
    }, { passive: false });

    const setReadout = (id, value) => { 
        const node = document.getElementById(id); 
        if (node) node.textContent = value; 
    };

    async function loadStation(stationId) {
        setReadout('sim-status', 'Fetching drift series');
        let series;
        try { 
            series = await getDriftSeries(stationId, null, null, SIM_DAYS, SIM_STEP); 
        } catch (error) { 
            setReadout('sim-status', `Drift engine unavailable — ${error.message}`); 
            return; 
        }
        
        if (!series || !series.length) { 
            setReadout('sim-status', 'No drift series returned'); 
            return; 
        }

        simState.path = toLocalMetres(series);
        simState.meta = series[series.length - 1];
        const totalMetres = simState.path[simState.path.length - 1].metres || 1;
        simState.exaggeration = TARGET_SPAN / totalMetres;
        simState.metresPerUnit = 1 / simState.exaggeration;
        simState.frame = 0;
        slider.max = String(simState.path.length - 1);
        slider.value = '0';

        const points = simState.path.map((point) => 
            new THREE.Vector3(point.east * simState.exaggeration, -6, -point.north * simState.exaggeration)
        );
        trailGeometry.setFromPoints(points);
        trailGeometry.setDrawRange(0, 1);

        setReadout('sim-glacier', simState.meta.glacier_name || 'Unknown');
        setReadout('sim-velocity', `${simState.meta.velocity_m_per_yr_used || 0} m/yr`);
        setReadout('sim-bearing', `${simState.meta.bearing_deg || 0}°`);
        setReadout('sim-confidence', simState.meta.confidence || 'Standard');
        setReadout('sim-exaggeration', `×${simState.exaggeration.toFixed(1)}`);
        setReadout('sim-status', 'Precomputed path loaded');
        setReadout('sim-scale-label', `${Math.round(40 * simState.metresPerUnit)} m`);
    }

    function applyFrame() {
        if (!simState.path.length) return;
        const point = simState.path[Math.round(simState.frame)];
        const x = point.east * simState.exaggeration;
        const z = -point.north * simState.exaggeration;
        iceGroup.position.x = x;
        iceGroup.position.z = z;
        trailGeometry.setDrawRange(0, Math.max(2, Math.round(simState.frame) + 1));
        setReadout('sim-day', `Day ${point.day} / ${SIM_DAYS}`);
        setReadout('sim-displacement', `${point.metres.toFixed(2)} m`);
        setReadout('sim-coords', `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`);
        setReadout('sim-elapsed', `${(point.day / 365.25).toFixed(2)} yr`);
        slider.value = String(Math.round(simState.frame));
    }

    let phase = 0;
    function tick() {
        requestAnimationFrame(tick);
        if (!renderer.domElement.clientWidth) return;

        if (document.body.dataset.theme !== 'emergency') {
            phase += .004;
            const position = sheet.geometry.attributes.position;
            for (let i = 0; i < position.count; i += 1) {
                const bx = sheet.base[i * 3];
                const bz = sheet.base[i * 3 + 2];
                position.array[i * 3 + 1] = ridgeHeight(bx, bz, phase);
            }
            position.needsUpdate = true;
            sheet.geometry.computeVertexNormals();
        }

        if (simState.playing && simState.path.length) {
            simState.frame += .18 * simState.speed;
            if (simState.frame >= simState.path.length - 1) simState.frame = 0;
            applyFrame();
        }

        camera.position.set(
            orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
            orbit.radius * Math.cos(orbit.phi),
            orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
        );
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
    }

    slider.addEventListener('input', () => { 
        simState.playing = false; 
        playButton.textContent = 'Play'; 
        simState.frame = Number(slider.value); 
        applyFrame(); 
    });
    
    playButton.addEventListener('click', () => { 
        simState.playing = !simState.playing; 
        playButton.textContent = simState.playing ? 'Pause' : 'Play'; 
    });
    
    speedButton.addEventListener('click', () => {
        simState.speed = simState.speed === 1 ? 3 : simState.speed === 3 ? 8 : 1;
        speedButton.textContent = `${simState.speed}×`;
    });
    
    select.addEventListener('change', () => loadStation(select.value));
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', () => setTimeout(applyTheme, 0));

    applyTheme();
    resize();
    await loadStation(select.value);
    applyFrame();
    tick();
}

initDriftSim();
