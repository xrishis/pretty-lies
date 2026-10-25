import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PINK = '#ee7e9e';
const CREAM = '#fff0d9';

// The outline is inflated in depth, so the sides and back are as rounded as the front.
function makeHeartGeometry() {
  const around = 192;
  const across = 64;
  const positions = [];
  const indices = [];
  for (let row = 0; row <= across; row += 1) {
    const latitude = -Math.PI / 2 + (row / across) * Math.PI;
    const radius = Math.cos(latitude);
    for (let column = 0; column <= around; column += 1) {
      const t = (column / around) * Math.PI * 2;
      const x = 1.5 * Math.sin(t) ** 3;
      const y = (1.56 / 16) * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + 0.2;
      positions.push(x * radius, y * radius, 0.8 * Math.sin(latitude));
      if (row < across && column < around) {
        const a = row * (around + 1) + column;
        const b = a + around + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// The plaster follows the actual domed surface instead of hovering over a flat face.
const outlineRadii = Array.from({ length: 768 }, (_, i) => {
  const t = (i / 768) * Math.PI * 2;
  const x = 1.5 * Math.sin(t) ** 3;
  const y = (1.56 / 16) * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + 0.2;
  return { angle: Math.atan2(y, x), radius: Math.hypot(x, y) };
}).sort((a, b) => a.angle - b.angle);

function heartSurface(x, y) {
  const angle = Math.atan2(y, x);
  let low = 0;
  let high = outlineRadii.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (outlineRadii[middle].angle < angle) low = middle + 1;
    else high = middle;
  }
  const after = outlineRadii[low];
  const before = outlineRadii[Math.max(0, low - 1)];
  const amount = (angle - before.angle) / (after.angle - before.angle || 1);
  const radius = THREE.MathUtils.lerp(before.radius, after.radius, THREE.MathUtils.clamp(amount, 0, 1));
  return 0.8 * Math.sqrt(Math.max(0.02, 1 - (Math.hypot(x, y) / radius) ** 2));
}

const plasterAngle = -0.28;
function plasterPoint(x, y, lift = 0.038) {
  const worldX = x * Math.cos(plasterAngle) - y * Math.sin(plasterAngle);
  const worldY = x * Math.sin(plasterAngle) + y * Math.cos(plasterAngle) - 0.075;
  return [worldX, worldY, heartSurface(worldX, worldY) + lift];
}

function makePlasterGeometry(width, height, lift, puff = 0.008) {
  const columns = 64;
  const rows = 12;
  const radius = height / 2;
  const straight = width / 2 - radius;
  const positions = [];
  const indices = [];
  for (let column = 0; column <= columns; column += 1) {
    const x = (column / columns - 0.5) * width;
    const edgeDistance = Math.max(0, Math.abs(x) - straight);
    const extent = Math.sqrt(Math.max(0, radius ** 2 - edgeDistance ** 2));
    for (let row = 0; row <= rows; row += 1) {
      const v = (row / rows) * 2 - 1;
      positions.push(...plasterPoint(x, extent * v, lift + puff * (1 - v * v)));
      if (column < columns && row < rows) {
        const a = column * (rows + 1) + row;
        const b = a + rows + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeSparkleGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.18);
  shape.quadraticCurveTo(0.035, 0.035, 0.14, 0);
  shape.quadraticCurveTo(0.035, -0.035, 0, -0.18);
  shape.quadraticCurveTo(-0.035, -0.035, -0.14, 0);
  shape.quadraticCurveTo(-0.035, 0.035, 0, 0.18);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.025, bevelEnabled: true, bevelThickness: 0.018,
    bevelSize: 0.012, bevelSegments: 3, curveSegments: 12,
  });
}

function createFallback(container, onLove) {
  container.dataset.renderer = 'fallback';
  const fallback = document.createElement('div');
  fallback.setAttribute('aria-hidden', 'true');
  Object.assign(fallback.style, {
    width: '100%', height: '100%', display: 'grid', placeItems: 'center',
    color: PINK, fontFamily: 'Georgia, serif', fontSize: 'clamp(190px, 28vw, 290px)',
    lineHeight: '1', filter: 'drop-shadow(0 22px 24px rgba(194,112,142,.16))',
    transform: 'rotate(-10deg)', cursor: 'pointer', userSelect: 'none',
  });
  fallback.textContent = '♥';
  container.append(fallback);
  const activate = () => onLove?.();
  const keydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) activate();
    }
  };
  fallback.addEventListener('click', activate);
  container.addEventListener('keydown', keydown);
  return {
    setPaused() {},
    dispose() {
      fallback.removeEventListener('click', activate);
      container.removeEventListener('keydown', keydown);
      fallback.remove();
    },
  };
}

export function createHeartScene(container, { onLove } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return createFallback(container, onLove);
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0.12, 6.6);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', cursor: 'grab' });
  container.append(canvas);
  container.dataset.renderer = 'webgl';

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.045);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight('#fff7f1', '#bba4c4', 1.15));
  const key = new THREE.DirectionalLight('#fff4e9', 2.5);
  key.position.set(-3.5, 5.5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#f3dcff', 1.1);
  fill.position.set(4, 1.2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffc9e0', 2.0);
  rim.position.set(1, 3, -4);
  scene.add(rim);

  const heartGeometry = makeHeartGeometry();
  const heartMaterial = new THREE.MeshPhysicalMaterial({
    color: PINK, roughness: 0.24, metalness: 0.02, clearcoat: 1,
    clearcoatRoughness: 0.13, sheen: 0.25, sheenColor: new THREE.Color('#ffcfe0'),
    sheenRoughness: 0.5, envMapIntensity: 0.85,
  });
  const creamMaterial = new THREE.MeshPhysicalMaterial({
    color: CREAM, roughness: 0.58, metalness: 0, clearcoat: 0.18,
    clearcoatRoughness: 0.5, envMapIntensity: 0.45, side: THREE.DoubleSide,
  });
  const patchMaterial = creamMaterial.clone();
  patchMaterial.color.set('#fbe2c5');
  const embossMaterial = new THREE.MeshPhysicalMaterial({
    color: '#ea8ca5', roughness: 0.35, clearcoat: 0.5, envMapIntensity: 0.6,
  });

  const floatingHeart = new THREE.Group();
  floatingHeart.rotation.set(-0.055, -0.12, -0.13);
  floatingHeart.position.set(-0.055, 0.055, 0);
  scene.add(floatingHeart);
  floatingHeart.add(new THREE.Mesh(heartGeometry, heartMaterial));
  floatingHeart.add(new THREE.Mesh(makePlasterGeometry(1.92, 0.54, 0.038, 0.012), creamMaterial));
  floatingHeart.add(new THREE.Mesh(makePlasterGeometry(0.62, 0.43, 0.058, 0.008), patchMaterial));

  const embossedHeart = new THREE.Mesh(heartGeometry, embossMaterial);
  embossedHeart.scale.set(0.105, 0.105, 0.041);
  embossedHeart.rotation.z = plasterAngle;
  embossedHeart.position.set(0, -0.075, 0.88);
  floatingHeart.add(embossedHeart);

  const perforationGeometry = new THREE.CircleGeometry(0.014, 12);
  const perforationMaterial = new THREE.MeshBasicMaterial({ color: '#c9a989', transparent: true, opacity: 0.55 });
  for (const side of [-1, 1]) {
    for (let column = 0; column < 3; column += 1) {
      for (const y of [-0.105, 0.105]) {
        const x = side * (0.47 + column * 0.14);
        const dot = new THREE.Mesh(perforationGeometry, perforationMaterial);
        dot.position.set(...plasterPoint(x, y, 0.058));
        const epsilon = 0.002;
        const normal = new THREE.Vector3(
          heartSurface(dot.position.x - epsilon, dot.position.y) - heartSurface(dot.position.x + epsilon, dot.position.y),
          heartSurface(dot.position.x, dot.position.y - epsilon) - heartSurface(dot.position.x, dot.position.y + epsilon),
          epsilon * 2,
        ).normalize();
        dot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        floatingHeart.add(dot);
      }
    }
  }

  const lavenderMaterial = new THREE.MeshPhysicalMaterial({
    color: '#b9a2df', roughness: 0.24, metalness: 0.02, clearcoat: 1,
    clearcoatRoughness: 0.15, envMapIntensity: 0.8,
  });
  const littleHeart = new THREE.Mesh(heartGeometry, lavenderMaterial);
  littleHeart.scale.setScalar(0.235);
  littleHeart.position.set(1.42, 1.02, -0.12);
  littleHeart.rotation.set(0.02, -0.28, 0.28);
  scene.add(littleHeart);

  const pearlGeometry = new THREE.SphereGeometry(0.1, 32, 24);
  const pearlMaterial = new THREE.MeshPhysicalMaterial({
    color: '#fff7ed', roughness: 0.2, metalness: 0.08, clearcoat: 1,
    iridescence: 0.4, iridescenceIOR: 1.3, envMapIntensity: 0.8,
  });
  const pearlSpecs = [[-1.63, 0.86, -0.2, 0.8], [1.66, -0.6, 0.3, 1.0], [-1.21, -1.25, 0.0, 0.55]];
  const pearls = pearlSpecs.map(([x, y, z, scale]) => {
    const pearl = new THREE.Mesh(pearlGeometry, pearlMaterial);
    pearl.position.set(x, y, z);
    pearl.scale.setScalar(scale);
    scene.add(pearl);
    return { mesh: pearl, y };
  });

  const sparkleGeometry = makeSparkleGeometry();
  const sparkleMaterial = new THREE.MeshPhysicalMaterial({
    color: '#e7bc7d', roughness: 0.28, metalness: 0.25, clearcoat: 0.7,
  });
  const sparkleSpecs = [[-1.53, -0.42, 0.25, 0.8, -0.2], [0.96, -1.21, 0.1, 0.65, 0.2], [-0.9, 1.45, -0.25, 0.5, 0.12]];
  const sparkles = sparkleSpecs.map(([x, y, z, scale, angle]) => {
    const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
    sparkle.position.set(x, y, z);
    sparkle.scale.setScalar(scale);
    sparkle.rotation.set(0, 0.15, angle);
    scene.add(sparkle);
    return { mesh: sparkle, y, angle };
  });

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  let shadowTexture;
  if (context) {
    const gradient = context.createRadialGradient(128, 64, 0, 128, 64, 120);
    gradient.addColorStop(0, 'rgba(122,75,100,.28)');
    gradient.addColorStop(0.5, 'rgba(122,75,100,.10)');
    gradient.addColorStop(1, 'rgba(122,75,100,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 128);
    shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.48), new THREE.MeshBasicMaterial({
      map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.7,
    }));
    shadow.position.set(0, -1.67, -0.8);
    scene.add(shadow);
  }

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.03, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.65;
  controls.minAzimuthAngle = -0.48;
  controls.maxAzimuthAngle = 0.48;
  controls.minPolarAngle = Math.PI / 2 - 0.23;
  controls.maxPolarAngle = Math.PI / 2 + 0.2;
  controls.update();
  canvas.style.touchAction = 'pan-y';

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  let paused = false;
  let inView = true;
  let disposed = false;
  let contextLost = false;
  let frameId = null;
  let previousTime = 0;
  let elapsed = 0;
  let pulseStarted = -10;
  let pointerStart = null;

  const canAnimate = () => !disposed && !contextLost && !paused && !reducedMotion && !document.hidden && inView;
  const draw = () => {
    if (!disposed && !contextLost) renderer.render(scene, camera);
  };
  const onControlsChange = () => {
    if (frameId === null) draw();
  };
  controls.addEventListener('change', onControlsChange);

  function animate(time) {
    frameId = null;
    if (!canAnimate()) return;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    elapsed += delta;
    floatingHeart.position.y = 0.055 + Math.sin(elapsed * 0.92) * 0.065;
    floatingHeart.rotation.z = -0.13 + Math.sin(elapsed * 0.57) * 0.023;
    floatingHeart.rotation.y = -0.12 + Math.sin(elapsed * 0.47) * 0.035;
    const pulseProgress = (elapsed - pulseStarted) / 0.62;
    const pulse = pulseProgress >= 0 && pulseProgress <= 1 ? Math.sin(pulseProgress * Math.PI) * 0.095 : 0;
    floatingHeart.scale.setScalar(1 + pulse);
    littleHeart.position.y = 1.02 + Math.sin(elapsed * 0.85 + 1.4) * 0.075;
    littleHeart.rotation.z = 0.28 + Math.sin(elapsed * 0.7) * 0.06;
    pearls.forEach(({ mesh, y }, index) => { mesh.position.y = y + Math.sin(elapsed * 0.8 + index * 1.9) * 0.045; });
    sparkles.forEach(({ mesh, y, angle }, index) => {
      mesh.position.y = y + Math.sin(elapsed * 0.65 + index * 1.8) * 0.028;
      mesh.rotation.z = angle + Math.sin(elapsed * 0.6 + index) * 0.075;
    });
    controls.update();
    draw();
    frameId = requestAnimationFrame(animate);
  }

  function updateAnimation() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    previousTime = 0;
    controls.enableDamping = canAnimate();
    if (canAnimate()) frameId = requestAnimationFrame(animate);
    else draw();
  }

  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    // Keep the ornament composition inside the canvas in narrow cards, too.
    camera.position.setLength(camera.aspect < 0.95 ? 6.6 * (0.95 / camera.aspect) : 6.6);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    draw();
  }

  function activate() {
    if (disposed) return;
    if (canAnimate()) pulseStarted = elapsed;
    onLove?.();
  }
  const onPointerDown = (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
    canvas.style.cursor = 'grabbing';
  };
  const onPointerMove = (event) => {
    if (pointerStart?.id === event.pointerId && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) {
      pointerStart.moved = true;
    }
  };
  const onPointerUp = (event) => {
    const start = pointerStart;
    pointerStart = null;
    canvas.style.cursor = 'grab';
    if (start?.id === event.pointerId && !start.moved && performance.now() - start.time < 650) activate();
  };
  const onPointerCancel = () => { pointerStart = null; canvas.style.cursor = 'grab'; };
  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) activate();
    }
  };
  const onMotionChange = (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) floatingHeart.scale.setScalar(1);
    updateAnimation();
  };
  const onVisibilityChange = () => updateAnimation();
  const onContextLost = (event) => {
    event.preventDefault();
    contextLost = true;
    updateAnimation();
  };
  const onContextRestored = () => { contextLost = false; updateAnimation(); };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  container.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibilityChange);
  motionPreference.addEventListener('change', onMotionChange);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateAnimation();
  }, { rootMargin: '80px' }) : null;
  intersectionObserver?.observe(container);
  resize();
  updateAnimation();

  return {
    setPaused(value) {
      paused = Boolean(value);
      updateAnimation();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      container.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionPreference.removeEventListener('change', onMotionChange);
      const geometries = new Set();
      const materials = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      shadowTexture?.dispose();
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
