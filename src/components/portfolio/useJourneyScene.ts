import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import {
  createBirdFlock,
  createCloudField,
  createDust,
  createFireflies,
  createHeadlightBeams,
  createLightPool,
  createMistPatch,
  createSilhouetteWall,
  createSkyDome,
  createStarField,
  createSun,
} from "./three/atmosphere";
import { createBus } from "./three/createBus";
import { SUNSET, createGlowTexture, createSkySampler, seededRandom } from "./three/palette";

/**
 * The journey, shot from the roadside.
 *
 * The camera rides beside the bus at a fixed lateral distance, so the whole
 * forest streams past from right to left while the bus holds its place in the
 * frame — a side-on tracking shot through an evening forest. The passenger is
 * visible at the window, lamps light up as the sun drops behind the hills, and
 * fireflies come out over the last stretch.
 *
 * Scroll drives everything; nothing here re-renders React.
 */

const WORLD_LENGTH = 280;
const TRAVEL_DISTANCE = 900;
const CAMERA_LOOK_AHEAD = 0.8;

/** Keep in sync with DWELL in JourneyScene.tsx: the bus parks exactly while a
 * story panel holds still, then glides to the next stop as the panel slides. */
const PANEL_DWELL = 0.24;

/** Ease-in-out with a fast middle: pull away smoothly, brake smoothly. */
const easeInOutCubic = (raw: number) =>
  raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;

/**
 * Scroll value (0..1) → position along the day, in stops.
 *
 * The bus is parked while a panel holds (|u − stop| ≤ dwell), then travels the
 * middle of each segment on an eased curve — so the world moves in deliberate
 * cinematic beats instead of tracking raw scroll 1:1.
 */
function stopCurve(value: number, total: number) {
  const u = Math.min(Math.max(value, 0), 1) * total;
  const index = Math.min(Math.floor(u), total - 1);
  const local = u - index;
  if (local <= PANEL_DWELL) return index;
  if (local >= 1 - PANEL_DWELL) return index + 1;
  return index + easeInOutCubic((local - PANEL_DWELL) / (1 - 2 * PANEL_DWELL));
}

type Shot = {
  /** Lateral distance from the bus. */
  distance: number;
  height: number;
  /** How far behind the bus the camera aims — sets the bus's screen position. */
  aimBehind: number;
  aimHeight: number;
  fov: number;
};

/**
 * One framing per stop, all side-on so the journey reads as one continuous
 * shot. The presets stay inside a narrow band — gentle reframes, not swoops —
 * and never come closer than ~9.6 units, which is the keep-out line for
 * roadside props (rocks, trees, mist all stay inside x ≤ 7.8).
 */
const SHOTS: Shot[] = [
  { distance: 10.6, height: 3.4, aimBehind: 0.4, aimHeight: 2.0, fov: 52 },
  { distance: 9.8, height: 3.1, aimBehind: 0.2, aimHeight: 1.9, fov: 53 },
  { distance: 12.8, height: 4.6, aimBehind: 0.8, aimHeight: 2.2, fov: 48 },
  { distance: 9.6, height: 3.0, aimBehind: 0.0, aimHeight: 1.9, fov: 54 },
  { distance: 11.6, height: 4.0, aimBehind: 0.6, aimHeight: 2.1, fov: 50 },
  { distance: 10.2, height: 3.3, aimBehind: 0.2, aimHeight: 2.0, fov: 52 },
  { distance: 13.2, height: 5.0, aimBehind: 1.2, aimHeight: 2.3, fov: 46 },
];

type Item = { offset: number; x: number; scale: number; rotation: number };
type Layer = {
  mesh: THREE.InstancedMesh;
  items: Item[];
  yFactor: number;
  flat?: boolean;
};

export function useJourneyScene(
  hostRef: RefObject<HTMLElement | null>,
  progressRef: { current: number },
  sceneCount = 7,
) {
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const random = seededRandom(20260925);
    const isWide = window.innerWidth >= 900;
    const density = isWide ? 1 : 0.6;

    const scene = new THREE.Scene();
    const sampler = createSkySampler();
    const sky = sampler.sample(0);
    scene.background = new THREE.Color().copy(sky.fog);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("[journey] WebGL unavailable, skipping the 3D scene", error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isWide ? 2 : 1.6));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4200);

    // --- lights --------------------------------------------------------------
    const hemi = new THREE.HemisphereLight(sky.hemiSky.getHex(), sky.hemiGround.getHex(), 0.85);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, sky.ambient);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(sky.keyColor.getHex(), sky.key);
    key.position.set(-120, 60, -30);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#ffb27a", 0.5);
    rim.position.set(60, 24, 40);
    scene.add(rim);

    // --- ground and road -----------------------------------------------------
    const groundMaterial = new THREE.MeshLambertMaterial({ color: sky.ground.clone() });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 2800), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -1100;
    scene.add(ground);

    const roadMaterial = new THREE.MeshLambertMaterial({ color: sky.road.clone() });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 2200), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, -900);
    scene.add(road);

    const edgeMaterial = new THREE.MeshLambertMaterial({ color: sky.rail.clone() });
    for (const x of [-4.6, 4.6]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2200), edgeMaterial);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(x, 0.03, -900);
      scene.add(edge);
    }

    const railMaterial = new THREE.MeshLambertMaterial({ color: sky.rail.clone() });
    for (const x of [-5.5, 5.5]) {
      for (const y of [0.6, 0.8]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 2200), railMaterial);
        rail.position.set(x, y, -900);
        scene.add(rail);
      }
    }

    // --- recycled scenery ----------------------------------------------------
    const layers: Layer[] = [];
    const scratchMatrix = new THREE.Matrix4();
    const scratchQuat = new THREE.Quaternion();
    const scratchVec = new THREE.Vector3();
    const scratchScale = new THREE.Vector3();
    const flatQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const UP = new THREE.Vector3(0, 1, 0);

    const register = (mesh: THREE.InstancedMesh, items: Item[], yFactor: number, flat = false) => {
      mesh.frustumCulled = false;
      layers.push({ mesh, items, yFactor, flat });
      scene.add(mesh);
      return mesh;
    };

    // Centre-line dashes.
    const dashCount = Math.round(30 * density);
    const dashes = register(
      new THREE.InstancedMesh(
        new THREE.PlaneGeometry(0.24, 3),
        new THREE.MeshLambertMaterial({ color: sky.rail.clone() }),
        dashCount,
      ),
      Array.from({ length: dashCount }, (_, i) => ({
        offset: i * (WORLD_LENGTH / dashCount),
        x: 0,
        scale: 1,
        rotation: 0,
      })),
      0.03,
      true,
    );

    // Forest: three bands of trees, near ones sweeping past the lens.
    const makeForestBand = ({
      count,
      xMin,
      xMax,
      scaleMin,
      scaleMax,
      trunkHeight,
      trunkRadius,
      canopyHeight,
      canopyRadius,
      trunkColor,
      canopyColor,
      broadleaf,
    }: {
      count: number;
      xMin: number;
      xMax: number;
      scaleMin: number;
      scaleMax: number;
      trunkHeight: number;
      trunkRadius: number;
      canopyHeight: number;
      canopyRadius: number;
      trunkColor: string;
      canopyColor: string;
      broadleaf: boolean;
    }) => {
      const scaled = Math.max(Math.round(count * density), 4);
      const items: Item[] = Array.from({ length: scaled }, (_, i) => ({
        offset: (i / scaled) * WORLD_LENGTH + random() * 6,
        x: xMin + random() * (xMax - xMin),
        scale: scaleMin + random() * (scaleMax - scaleMin),
        rotation: random() * Math.PI * 2,
      }));

      const trunkMaterial = new THREE.MeshLambertMaterial({ color: trunkColor });
      const canopyMaterial = new THREE.MeshLambertMaterial({ color: canopyColor });
      const canopyGeometry = broadleaf
        ? new THREE.IcosahedronGeometry(canopyRadius, 1)
        : new THREE.ConeGeometry(canopyRadius, canopyHeight, 7);

      register(
        new THREE.InstancedMesh(
          new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 6),
          trunkMaterial,
          scaled,
        ),
        items,
        trunkHeight / 2,
      );
      register(
        new THREE.InstancedMesh(canopyGeometry, canopyMaterial, scaled),
        items,
        broadleaf ? trunkHeight + canopyRadius * 0.8 : trunkHeight + canopyHeight * 0.45,
      );

      return { canopyMaterial, trunkMaterial };
    };

    // Kept clear of the camera lane: the closest framing is 9.6 units out, so
    // near-side props stay inside x ≤ 7.8 and frame the shot without ever
    // crossing the lens.
    const foregroundTrees = makeForestBand({
      count: 9,
      xMin: 6.6,
      xMax: 7.8,
      scaleMin: 1,
      scaleMax: 1.4,
      trunkHeight: 2.9,
      trunkRadius: 0.22,
      canopyHeight: 2.7,
      canopyRadius: 1.4,
      trunkColor: "#33222c",
      canopyColor: "#243a2c",
      broadleaf: true,
    });

    const roadsideTrees = makeForestBand({
      count: 46,
      xMin: -34,
      xMax: -7.5,
      scaleMin: 0.95,
      scaleMax: 1.75,
      trunkHeight: 2.6,
      trunkRadius: 0.2,
      canopyHeight: 4.6,
      canopyRadius: 1.6,
      trunkColor: "#3d2a2a",
      canopyColor: sky.foliage.clone().getHexString(),
      broadleaf: false,
    });

    const distantTrees = makeForestBand({
      count: 42,
      xMin: -150,
      xMax: -36,
      scaleMin: 0.8,
      scaleMax: 1.5,
      trunkHeight: 2.2,
      trunkRadius: 0.18,
      canopyHeight: 6.4,
      canopyRadius: 2.4,
      trunkColor: "#463038",
      canopyColor: sky.ridgeNear.clone().getHexString(),
      broadleaf: false,
    });

    // Rocks along the verge.
    const rockCount = Math.round(26 * density);
    const rockItems: Item[] = Array.from({ length: rockCount }, (_, i) => ({
      offset: (i / rockCount) * WORLD_LENGTH + random() * 7,
      x: (i % 2 === 0 ? -1 : 1) * (5.8 + random() * 1.4),
      scale: 0.4 + random() * 0.8,
      rotation: random() * Math.PI,
    }));
    register(
      new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.MeshLambertMaterial({ color: SUNSET.ochre }),
        rockCount,
      ),
      rockItems,
      0.36,
    );

    // Mist patches drifting through the forest on the far side of the bus.
    // They never sit between the camera and the bus: additive planes that
    // close would wash the whole frame out. The yaw turns each plane to face
    // the roadside camera, otherwise it would be an invisible sliver.
    const mistCount = Math.round(10 * density);
    const mistItems: Item[] = Array.from({ length: mistCount }, (_, i) => ({
      offset: (i / mistCount) * WORLD_LENGTH + random() * 9,
      x: -9 - random() * 70,
      scale: 0.6 + random() * 0.7,
      rotation: -Math.PI / 2,
    }));
    const mistTemplate = createMistPatch(48, "#ffe0bd", 0.1);
    const mistMaterial = mistTemplate.material as THREE.MeshBasicMaterial;
    register(
      new THREE.InstancedMesh(mistTemplate.geometry, mistMaterial, mistItems.length),
      mistItems,
      1.6,
    );

    // --- street lamps on the far verge (they light up as the sun sets) -------
    const lampCount = 24;
    const lampSpacing = 66;
    const poleMaterial = new THREE.MeshLambertMaterial({ color: "#6d5560" });
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 6.6, 6), poleMaterial, lampCount);
    const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.1, 0.1), poleMaterial, lampCount);
    const headMaterial = new THREE.MeshBasicMaterial({ color: SUNSET.gold, transparent: true, opacity: 0.2 });
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 12, 8), headMaterial, lampCount);
    const poolMaterial = new THREE.MeshBasicMaterial({
      map: createGlowTexture("rgba(255,226,170,0.95)", "rgba(255,180,110,0.3)"),
      color: SUNSET.gold,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(13, 13), poolMaterial, lampCount);

    for (let i = 0; i < lampCount; i += 1) {
      const z = 120 - i * lampSpacing;
      scratchScale.set(1, 1, 1);
      scratchQuat.identity();

      scratchVec.set(-6.6, 3.4, z);
      scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
      poles.setMatrixAt(i, scratchMatrix);

      scratchVec.set(-5.8, 6.6, z);
      scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
      arms.setMatrixAt(i, scratchMatrix);

      scratchVec.set(-5.0, 6.54, z);
      scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
      heads.setMatrixAt(i, scratchMatrix);

      scratchVec.set(-5.0, 0.04, z);
      scratchMatrix.compose(scratchVec, flatQuat, scratchScale);
      pools.setMatrixAt(i, scratchMatrix);
    }
    for (const mesh of [poles, arms, heads, pools]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      scene.add(mesh);
    }

    // --- landscape -----------------------------------------------------------
    const hills = [
      createSilhouetteWall({
        axis: "z",
        span: 3400,
        center: -1000,
        distance: -210,
        baseHeight: 34,
        amplitude: 26,
        color: sky.ridgeNear.getHexString(),
        seed: 51,
      }),
      createSilhouetteWall({
        axis: "z",
        span: 3800,
        center: -1100,
        distance: -340,
        baseHeight: 46,
        amplitude: 34,
        color: sky.ridgeMid.getHexString(),
        seed: 97,
      }),
      createSilhouetteWall({
        axis: "z",
        span: 4400,
        center: -1300,
        distance: -520,
        baseHeight: 60,
        amplitude: 46,
        color: sky.ridgeFar.getHexString(),
        seed: 143,
      }),
    ];
    for (const hill of hills) scene.add(hill.mesh);

    // --- atmosphere ----------------------------------------------------------
    const skyDome = createSkyDome(900);
    scene.add(skyDome.mesh);
    const sun = createSun(760);
    scene.add(sun.group);
    const clouds = createCloudField(isWide ? 15 : 8, random);
    scene.add(clouds.group);
    const stars = createStarField(isWide ? 260 : 150, random);
    scene.add(stars.points);
    const birds = createBirdFlock(isWide ? 6 : 3, random);
    scene.add(birds.group);
    const fireflies = createFireflies(isWide ? 60 : 30, random);
    scene.add(fireflies.points);
    const dust = createDust(isWide ? 130 : 70, random);
    scene.add(dust.points);

    // --- bus -----------------------------------------------------------------
    const busModel = createBus({ detail: "high" });
    const bus = busModel.group;
    scene.add(bus);

    const beams = createHeadlightBeams(28);
    beams.group.position.set(0, 1.2, -3.6);
    bus.add(beams.group);

    const poolAhead = createLightPool(24, SUNSET.gold);
    const poolNear = createLightPool(16, SUNSET.cream);
    poolAhead.position.set(0, 0.06, -17);
    poolNear.position.set(0, 0.06, -12);
    bus.add(poolAhead, poolNear);

    // --- sizing --------------------------------------------------------------
    let aspect = 1;
    let composer: EffectComposer | null = null;
    let bloom: UnrealBloomPass | null = null;

    if (isWide) {
      try {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.85, 0.8);
        composer.addPass(bloom);
        composer.addPass(new OutputPass());
      } catch (error) {
        console.warn("[journey] bloom unavailable, rendering without post-processing", error);
        composer = null;
        bloom = null;
      }
    }

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      composer?.setSize(width, height);
      aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    // Scenery recycles beyond this fog wall, so nothing ever pops into view.
    scene.fog = new THREE.Fog(sky.fog.clone(), 26, isWide ? 270 : 230);

    // --- loop ----------------------------------------------------------------
    const cameraPosition = new THREE.Vector3(11.4, 3.7, 2.2);
    const cameraTarget = new THREE.Vector3(0.5, 2, 6);
    const desiredPosition = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();
    const scratchColor = new THREE.Color();

    let eased = 0;
    let elapsed = 0;
    let last = performance.now();
    let running = false;

    const updateWorld = (progress: number, dt: number, time: number) => {
      // Cinematic beats: parked at each stop while its panel reads, eased
      // travel between them.
      const stops = stopCurve(progress, sceneCount - 1);
      const travel = (stops / (sceneCount - 1)) * TRAVEL_DISTANCE;
      const current = sampler.sample(progress);

      // Bus: holds its lane, bounces gently, wheels turning with distance.
      bus.position.z = -travel;
      bus.position.x = reducedMotion ? 0 : Math.sin(time * 0.8) * 0.06;
      bus.position.y = reducedMotion ? 0 : Math.sin(time * 3.4) * 0.045;
      bus.rotation.z = reducedMotion ? 0 : Math.sin(time * 2.6) * 0.006;
      bus.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.7) * 0.008;
      const wheelSpin = travel / 0.56;
      for (const wheel of busModel.wheels) wheel.rotation.x = -wheelSpin;

      // Passenger leaning to the window.
      if (busModel.rider && !reducedMotion) {
        busModel.rider.rotation.y = Math.sin(time * 0.5) * 0.35;
        busModel.rider.position.y = Math.sin(time * 1.6) * 0.02;
      }

      // Camera rides the same eased stop curve, so reframes happen between
      // stops and the framing holds still while the bus does. ceil − 1 makes a
      // parked bus land fully on its own framing instead of the next one;
      // clamped so the first stop never indexes SHOTS[-1].
      const stopIndex = Math.min(Math.max(Math.ceil(stops) - 1, 0), SHOTS.length - 2);
      const blend = Math.min(Math.max(stops - stopIndex, 0), 1);
      const a = SHOTS[stopIndex];
      const b = SHOTS[stopIndex + 1];
      const distance = a.distance + (b.distance - a.distance) * blend;
      const height = a.height + (b.height - a.height) * blend;
      const aimBehind = a.aimBehind + (b.aimBehind - a.aimBehind) * blend;
      const aimHeight = a.aimHeight + (b.aimHeight - a.aimHeight) * blend;
      const fov = a.fov + (b.fov - a.fov) * blend;

      desiredPosition.set(
        distance + (reducedMotion ? 0 : Math.sin(time * 0.38) * 0.22),
        height + (reducedMotion ? 0 : Math.sin(time * 0.82) * 0.08),
        bus.position.z + CAMERA_LOOK_AHEAD,
      );
      desiredTarget.set(0.5, aimHeight, bus.position.z + aimBehind);
      cameraPosition.lerp(desiredPosition, reducedMotion ? 1 : 0.12);
      cameraTarget.lerp(desiredTarget, reducedMotion ? 1 : 0.12);
      camera.position.copy(cameraPosition);
      camera.lookAt(cameraTarget);
      if (!reducedMotion) camera.rotateZ(Math.sin(time * 0.5) * 0.006);
      if (Math.abs(camera.fov - fov) > 0.05) {
        camera.fov += (fov - camera.fov) * 0.07;
        camera.updateProjectionMatrix();
      }

      // Recycling: everything keeps a fixed distance ahead of the camera.
      for (const layer of layers) {
        for (let i = 0; i < layer.items.length; i += 1) {
          const item = layer.items[i];
          const distanceBehind =
            (((item.offset - travel) % WORLD_LENGTH) + WORLD_LENGTH) % WORLD_LENGTH;
          scratchVec.set(item.x, layer.yFactor * item.scale, camera.position.z - distanceBehind);
          if (layer.flat) scratchQuat.copy(flatQuat);
          else scratchQuat.setFromAxisAngle(UP, item.rotation);
          scratchScale.setScalar(item.scale);
          scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
          layer.mesh.setMatrixAt(i, scratchMatrix);
        }
        layer.mesh.instanceMatrix.needsUpdate = true;
      }

      // Atmosphere.
      skyDome.mesh.position.copy(camera.position);
      skyDome.update(current);
      sun.update(current, camera.position);
      // Low and ahead of the bus, so the drive reads as heading into the sun.
      sun.group.position.set(camera.position.x - 700, 30 + current.sunHeight * 200, camera.position.z - 110);
      clouds.update(dt, camera.position.z, current.mid);
      stars.update(current, camera.position);
      birds.update(time, camera.position.z);
      fireflies.update(time, camera.position.z, Math.min(1, current.lamp * 0.9 + 0.1));
      dust.points.position.set(0, 0, camera.position.z);
      dust.update(dt, 0.3 + current.lamp * 0.5);

      // Lamps, windows and headlights respond to the light.
      headMaterial.opacity = 0.15 + current.lamp * 0.95;
      headMaterial.color.copy(current.sun).lerp(scratchColor.set(SUNSET.gold), 0.55);
      poolMaterial.opacity = current.lamp * 0.5;
      busModel.glass.opacity = 0.2 + current.lamp * 0.2;
      busModel.glass.color.copy(scratchColor.set("#8d7a86")).lerp(current.sun, 0.3 + current.lamp * 0.45);
      busModel.interior.color.copy(scratchColor.set("#c98a5f")).lerp(current.sun, 0.25 + current.lamp * 0.6);
      beams.setIntensity(current.headlight);
      (poolAhead.material as THREE.MeshBasicMaterial).opacity = current.headlight * 0.45;
      (poolNear.material as THREE.MeshBasicMaterial).opacity = current.headlight * 0.55;

      // Landscape tinting.
      groundMaterial.color.copy(current.ground);
      roadMaterial.color.copy(current.road);
      edgeMaterial.color.copy(current.rail);
      railMaterial.color.copy(current.rail);
      (dashes.material as THREE.MeshLambertMaterial).color.copy(current.rail);
      roadsideTrees.canopyMaterial.color.copy(current.foliage);
      foregroundTrees.canopyMaterial.color.copy(current.foliage).lerp(scratchColor.set("#1b2a22"), 0.55);
      distantTrees.canopyMaterial.color.copy(current.ridgeNear).lerp(current.ridgeFar, 0.45);
      hills[0].material.color.copy(current.ridgeNear);
      hills[1].material.color.copy(current.ridgeMid);
      hills[2].material.color.copy(current.ridgeFar);
      mistMaterial.color.copy(current.fog).lerp(scratchColor.set("#ffe9d2"), 0.45);
      mistMaterial.opacity = 0.06 + current.lamp * 0.09;
      hemi.color.copy(current.hemiSky);
      hemi.groundColor.copy(current.hemiGround);
      hemi.intensity = 0.7 + current.ambient * 0.4;
      ambient.intensity = current.ambient;
      key.color.copy(current.keyColor);
      key.intensity = current.key;
      (scene.background as THREE.Color).copy(current.fog);
      if (scene.fog) scene.fog.color.copy(current.fog);
      if (bloom) bloom.strength = current.bloom;
    };

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.06);
      last = now;
      elapsed += reducedMotion ? 0 : delta;

      const target = Math.min(Math.max(progressRef.current, 0), 1);
      // Tighter than a cinematic lag: the bus should answer the scroll directly.
      eased += (target - eased) * (reducedMotion ? 1 : 0.14);

      updateWorld(eased, delta, elapsed);
      if (composer) composer.render();
      else renderer.render(scene, camera);
    };

    updateWorld(0, 0.016, 0);
    if (composer) composer.render();
    else renderer.render(scene, camera);

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

    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { rootMargin: "140px" },
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
      composer?.dispose();
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [hostRef, progressRef, sceneCount]);
}
