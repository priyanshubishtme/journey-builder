import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Scroll-driven 3D bus journey.
 *
 * One flat-shaded, near-monochrome world: the bus drives forward along a
 * straight road while roadside scenery is recycled through a fixed window in
 * front of the camera (each object is placed at a camera-relative distance, so
 * it approaches the bus, passes it and reappears deep in the fog). The sky,
 * ground and foliage drift from dawn to dusk as `progressRef` goes 0 → 1.
 *
 * Plain three.js rather than react-three-fiber: scroll only ever writes to a
 * ref, and React never re-renders because of the animation.
 */

/** Length of the recycling window, just beyond the fog so nothing pops in view. */
const WORLD_LENGTH = 180;
const TRAVEL_DISTANCE = 840;

/** Dawn → midday → afternoon → dusk, all in the same near-monochrome family. */
const TIME_STOPS = [
  { t: 0, sky: "#e8e5df", ground: "#dedbd4", road: "#c6c2bb", tree: "#6f7369" },
  { t: 0.4, sky: "#f4f3f0", ground: "#e9e6e0", road: "#cfcbc4", tree: "#777b6f" },
  { t: 0.72, sky: "#ddd8d1", ground: "#cdc9c2", road: "#b4b0a9", tree: "#5a5f56" },
  { t: 1, sky: "#8c8985", ground: "#807d79", road: "#5f5d5a", tree: "#3b3d3b" },
].map((stop) => ({
  t: stop.t,
  sky: new THREE.Color(stop.sky),
  ground: new THREE.Color(stop.ground),
  road: new THREE.Color(stop.road),
  tree: new THREE.Color(stop.tree),
}));

const INK = "#1c1c20";
const BODY = "#f3f1ed";
const CLAY = "#b4694a";

type TintKey = "sky" | "ground" | "road" | "tree";

/** Deterministic pseudo-random so the scenery is identical on every load. */
function seededRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function sampleTime(progress: number, key: TintKey, out: THREE.Color) {
  const p = Math.min(Math.max(progress, 0), 1);
  let i = 0;
  while (i < TIME_STOPS.length - 2 && p > TIME_STOPS[i + 1].t) i += 1;
  const a = TIME_STOPS[i];
  const b = TIME_STOPS[i + 1];
  const span = b.t - a.t || 1;
  const local = Math.min(Math.max((p - a.t) / span, 0), 1);
  return out.copy(a[key]).lerp(b[key], local);
}

function createBus() {
  const bus = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: BODY });
  const inkMat = new THREE.MeshLambertMaterial({ color: INK });
  const glassMat = new THREE.MeshLambertMaterial({ color: "#2c2c33" });
  const lightMat = new THREE.MeshLambertMaterial({ color: "#fbfaf7" });
  const tailMat = new THREE.MeshLambertMaterial({ color: CLAY });

  const body = new THREE.Mesh(new RoundedBoxGeometry(2.6, 2.2, 6.4, 3, 0.28), bodyMat);
  body.position.y = 1.42;
  bus.add(body);

  const windows = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.64, 5.1), glassMat);
  windows.position.y = 1.92;
  bus.add(windows);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 0.12), glassMat);
  windshield.position.set(0, 1.94, 3.24);
  bus.add(windshield);

  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.72, 0.1), glassMat);
  rearWindow.position.set(0, 1.96, -3.22);
  bus.add(rearWindow);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.1, 5.9), inkMat);
  roof.position.y = 2.53;
  bus.add(roof);

  for (const z of [3.24, -3.24]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.26, 0.2), inkMat);
    bumper.position.set(0, 0.62, z);
    bus.add(bumper);
  }

  for (const x of [-0.86, 0.86]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.1), lightMat);
    head.position.set(x, 1.14, 3.28);
    bus.add(head);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.1), tailMat);
    tail.position.set(x, 1.2, -3.28);
    bus.add(tail);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.44, 14);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshLambertMaterial({ color: "#6d6d72" });
  const wheels: THREE.Mesh[] = [];

  for (const x of [-1.3, 1.3]) {
    for (const z of [1.95, -1.95]) {
      const wheel = new THREE.Mesh(wheelGeo, inkMat);
      wheel.position.set(x, 0.52, z);
      bus.add(wheel);
      wheels.push(wheel);

      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.position.set(x, 0.52, z);
      bus.add(hub);
    }
  }

  // Contact shadow keeps the bus visually planted on the road.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 28),
    new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.16 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.05, 2.05, 1);
  shadow.position.y = 0.02;
  bus.add(shadow);

  return { bus, wheels };
}

export function useBusScene(
  hostRef: RefObject<HTMLElement | null>,
  progressRef: { current: number },
  /** One signpost is placed at each scene boundary along the route. */
  sceneCount = 6,
) {
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;
    const sceneSpacing = TRAVEL_DISTANCE / Math.max(sceneCount, 1);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const random = seededRandom(20260925);
    const isWide = window.innerWidth >= 900;

    const scene = new THREE.Scene();
    const sky = new THREE.Color(TIME_STOPS[0].sky);
    const groundColor = new THREE.Color(TIME_STOPS[0].ground);
    const roadColor = new THREE.Color(TIME_STOPS[0].road);
    const treeColor = new THREE.Color(TIME_STOPS[0].tree);
    scene.background = sky.clone();
    scene.fog = new THREE.Fog(sky.clone(), 24, isWide ? 125 : 96);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 600);
    camera.position.set(0.5, 4.5, 12);

    // Without WebGL the section still needs to render as a quiet empty panel.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("[journey] WebGL unavailable, skipping 3D scene", error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    // --- lights -------------------------------------------------------------
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cc, 1.1));
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(-14, 22, 10);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(12, 8, -18);
    scene.add(fill);

    // --- static world -------------------------------------------------------
    const groundMat = new THREE.MeshLambertMaterial({ color: groundColor.clone() });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 1900), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -820;
    scene.add(ground);

    const roadMat = new THREE.MeshLambertMaterial({ color: roadColor.clone() });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 1500), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, -700);
    scene.add(road);

    const lineMat = new THREE.MeshLambertMaterial({ color: "#f7f5f1" });
    for (const x of [-4.5, 4.5]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1500), lineMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(x, 0.014, -700);
      scene.add(edge);
    }

    // --- recycled scenery ---------------------------------------------------
    /** Objects placed a fixed distance ahead of the camera; recycled on wrap. */
    const recycled: { mesh: THREE.Object3D; offset: number }[] = [];
    const track = (mesh: THREE.Object3D, offset: number) => {
      recycled.push({ mesh, offset });
      scene.add(mesh);
    };

    const dashGeo = new THREE.PlaneGeometry(0.22, 2.6);
    const dashMat = new THREE.MeshLambertMaterial({ color: "#f7f5f1" });
    for (let i = 0; i < 20; i += 1) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.016, 0);
      track(dash, i * 9);
    }

    const postGeo = new THREE.BoxGeometry(0.12, 0.95, 0.12);
    const postMat = new THREE.MeshLambertMaterial({ color: "#e7e4de" });
    for (let i = 0; i < 20; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(side * 5.4, 0.48, 0);
      track(post, i * 9 + 4.5);
    }

    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.3, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: "#4a4640" });
    const coneGeo = new THREE.ConeGeometry(1.5, 4.2, 7);
    const canopyMat = new THREE.MeshLambertMaterial({ color: treeColor.clone() });
    const treeCount = isWide ? 36 : 22;
    for (let i = 0; i < treeCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (11 + random() * 30);
      const tree = new THREE.Group();

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.65;
      tree.add(trunk);
      const canopy = new THREE.Mesh(coneGeo, canopyMat);
      canopy.position.y = 3.3;
      tree.add(canopy);

      tree.position.set(x, 0, 0);
      tree.scale.setScalar(0.75 + random() * 0.85);
      track(tree, (i / treeCount) * WORLD_LENGTH + random() * 5);
    }

    // Far hills, drifting through the fog like the trees.
    const hillMat = new THREE.MeshLambertMaterial({ color: "#b6b2ab" });
    for (let i = 0; i < 12; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const radius = 26 + random() * 34;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(radius, radius * 0.45, 5), hillMat);
      hill.position.set(side * (58 + random() * 95), 0, 0);
      hill.rotation.y = random() * Math.PI;
      track(hill, (i / 12) * WORLD_LENGTH + random() * 8);
    }

    // Signposts sit at fixed points along the route — one per scene boundary.
    const poleGeo = new THREE.BoxGeometry(0.26, 4.6, 0.26);
    const poleMat = new THREE.MeshLambertMaterial({ color: "#8d8a85" });
    const panelGeo = new THREE.BoxGeometry(0.16, 2.2, 3.8);
    const panelMat = new THREE.MeshLambertMaterial({ color: "#f4f2ee" });
    const bandMat = new THREE.MeshLambertMaterial({ color: INK });
    for (let i = 0; i < sceneCount; i += 1) {
      const sign = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.3;
      sign.add(pole);
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.y = 5.1;
      sign.add(panel);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.36, 2.8), bandMat);
      band.position.y = 4.5;
      sign.add(band);
      sign.position.set(8.2, 0, -(i * sceneSpacing + sceneSpacing * 0.55));
      scene.add(sign);
    }

    const { bus, wheels } = createBus();
    scene.add(bus);

    // --- sizing -------------------------------------------------------------
    let aspect = 1;
    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      aspect = width / height;
      camera.aspect = aspect;
      camera.fov = aspect < 0.9 ? 62 : aspect < 1.4 ? 52 : 46;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    // --- loop ---------------------------------------------------------------
    let eased = 0;
    let elapsed = 0;
    let last = performance.now();
    let running = false;

    const updateWorld = (progress: number, time: number) => {
      const travel = progress * TRAVEL_DISTANCE;

      bus.position.z = -travel;
      bus.position.y = reducedMotion ? 0 : Math.sin(time * 3.1) * 0.035;
      bus.rotation.z = reducedMotion ? 0 : Math.sin(time * 1.7) * 0.006;
      bus.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.6) * 0.012;
      const wheelSpin = travel / 0.52;
      for (const wheel of wheels) wheel.rotation.x = -wheelSpin;

      const followDistance = aspect < 0.9 ? 14 : aspect < 1.4 ? 13 : 12.5;
      const drift = isWide ? 0.5 : 0.2;
      camera.position.x = reducedMotion ? 0.5 : 0.5 + Math.sin(time * 0.45) * drift;
      camera.position.y = 4.5 + (reducedMotion ? 0 : Math.sin(time * 0.8) * 0.12);
      camera.position.z = bus.position.z + followDistance;
      camera.lookAt(0, 1.5, bus.position.z - 17);

      // Each object keeps a fixed distance ahead of the camera, which shrinks
      // as the bus travels; on wrapping it returns to the far edge of the fog.
      for (const item of recycled) {
        const distance =
          (((item.offset - travel) % WORLD_LENGTH) + WORLD_LENGTH) % WORLD_LENGTH;
        item.mesh.position.z = camera.position.z - distance;
      }

      sampleTime(progress, "sky", sky);
      sampleTime(progress, "ground", groundColor);
      sampleTime(progress, "road", roadColor);
      sampleTime(progress, "tree", treeColor);

      (scene.background as THREE.Color).copy(sky);
      if (scene.fog) scene.fog.color.copy(sky).lerp(groundColor, 0.22);
      groundMat.color.copy(groundColor);
      roadMat.color.copy(roadColor);
      canopyMat.color.copy(treeColor);
      hillMat.color.copy(groundColor).lerp(treeColor, 0.35);
      lineMat.color.copy(groundColor).lerp(sky, 0.8);
      dashMat.color.copy(lineMat.color);
    };

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.06);
      last = now;
      elapsed += reducedMotion ? 0 : delta;

      const target = Math.min(Math.max(progressRef.current, 0), 1);
      // Ease toward the scroll position so fast scrolls still read as motion.
      eased += (target - eased) * (reducedMotion ? 1 : 0.075);

      updateWorld(eased, elapsed);
      renderer.render(scene, camera);
    };

    // Paint one frame immediately so the canvas is never a black rectangle.
    updateWorld(0, elapsed);
    renderer.render(scene, camera);

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      renderer.setAnimationLoop(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      renderer.setAnimationLoop(null);
    };

    // Only render while the section is actually on screen.
    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { rootMargin: "120px" },
    );
    visibility.observe(host);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    return () => {
      stop();
      visibility.disconnect();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);

      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [hostRef, progressRef, sceneCount]);
}
