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
  createHeadlightBeams,
  createLightPool,
  createRidgeLayer,
  createSkyDome,
  createStarField,
  createSun,
} from "./three/atmosphere";
import { createBus } from "./three/createBus";
import { SUNSET, createGlowTexture, createSkySampler, seededRandom } from "./three/palette";

/**
 * The cinematic bus journey.
 *
 * A single three.js scene carries the whole section: the bus drives forward
 * while the world is recycled through a fogged window in front of the camera.
 * Scroll position drives both the bus and the atmosphere — a golden morning
 * becomes a violet dusk with the lamps and headlights coming on — and the
 * camera changes shot between stops (wide establishing, low chase, drone,
 * profile, head-on, wheel level, pull-back).
 *
 * Everything animates outside React: scroll writes to a ref, the render loop
 * reads it, and re-renders are limited to the caption index.
 */

const WORLD_LENGTH = 280;
const TRAVEL_DISTANCE = 900;
const DASH_COUNT = 32;
const POST_COUNT = 34;
const TREE_COUNT = 68;
const ROCK_COUNT = 42;
const LAMP_COUNT = 26;
const LAMP_SPACING = 64;

const SIGN_COLORS = [
  SUNSET.orange,
  SUNSET.coral,
  SUNSET.rose,
  SUNSET.magenta,
  SUNSET.plum,
  SUNSET.gold,
  SUNSET.cream,
];

type CameraPreset = {
  /** Distance behind the bus (negative values put the camera in front). */
  dist: number;
  height: number;
  side: number;
  lookHeight: number;
  lookAhead: number;
  fov: number;
  roll: number;
};

/** One shot per stop — the journey is cut like a film. */
const CAMERA_PRESETS: CameraPreset[] = [
  { dist: 17, height: 7, side: -3.6, lookHeight: 2.2, lookAhead: -22, fov: 50, roll: 0.01 },
  { dist: 11.5, height: 2.9, side: 0.8, lookHeight: 1.8, lookAhead: -17, fov: 47, roll: -0.012 },
  { dist: 19, height: 12.5, side: 5.5, lookHeight: 1.4, lookAhead: -20, fov: 42, roll: 0.02 },
  { dist: 12.5, height: 3.4, side: 7.5, lookHeight: 2, lookAhead: -5, fov: 44, roll: 0.016 },
  { dist: -18, height: 3.6, side: 3.2, lookHeight: 2, lookAhead: 26, fov: 44, roll: -0.02 },
  { dist: 9.5, height: 1.7, side: -1.6, lookHeight: 1.6, lookAhead: -15, fov: 49, roll: 0.01 },
  { dist: 26, height: 15, side: -9, lookHeight: 1.2, lookAhead: -26, fov: 40, roll: -0.014 },
];

const smoothstep = (value: number) => {
  const t = Math.min(Math.max(value, 0), 1);
  return t * t * (3 - 2 * t);
};

function lerpPreset(a: CameraPreset, b: CameraPreset, t: number): CameraPreset {
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    dist: mix(a.dist, b.dist),
    height: mix(a.height, b.height),
    side: mix(a.side, b.side),
    lookHeight: mix(a.lookHeight, b.lookHeight),
    lookAhead: mix(a.lookAhead, b.lookAhead),
    fov: mix(a.fov, b.fov),
    roll: mix(a.roll, b.roll),
  };
}

type Recycled = { offset: number; x: number; scale: number; rotation: number };

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
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4200);
    camera.position.set(-3.6, 7, 17);

    // --- lights ---------------------------------------------------------------
    const hemi = new THREE.HemisphereLight(sky.hemiSky.getHex(), sky.hemiGround.getHex(), 0.85);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, sky.ambient);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(sky.keyColor.getHex(), sky.key);
    key.position.set(-90, 70, -40);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#ffb98a", 0.4);
    fill.position.set(70, 30, 60);
    scene.add(fill);

    // --- static world ---------------------------------------------------------
    const groundMaterial = new THREE.MeshLambertMaterial({ color: sky.ground.clone() });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 2400), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -900;
    scene.add(ground);

    const roadMaterial = new THREE.MeshLambertMaterial({ color: sky.road.clone() });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 1800), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, -850);
    scene.add(road);

    const lineMaterial = new THREE.MeshLambertMaterial({ color: sky.rail.clone() });
    for (const x of [-4.6, 4.6]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1800), lineMaterial);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(x, 0.014, -850);
      scene.add(edge);
    }

    // Guardrails run continuously along the route.
    const railMaterial = new THREE.MeshLambertMaterial({ color: sky.rail.clone() });
    for (const x of [-5.6, 5.6]) {
      for (const y of [0.62, 0.82]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 1800), railMaterial);
        rail.position.set(x, y, -850);
        scene.add(rail);
      }
    }

    // --- recycled scenery (instanced, repositioned every frame) --------------
    const recycled: { mesh: THREE.InstancedMesh; items: Recycled[]; yFactor: number; flat: boolean }[] = [];
    const scratchMatrix = new THREE.Matrix4();
    const scratchQuat = new THREE.Quaternion();
    const scratchVec = new THREE.Vector3();
    const scratchScale = new THREE.Vector3();
    const flatQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const UP = new THREE.Vector3(0, 1, 0);

    const registerRecycled = (
      mesh: THREE.InstancedMesh,
      items: Recycled[],
      yFactor: number,
      flat = false,
    ) => {
      mesh.frustumCulled = false;
      recycled.push({ mesh, items, yFactor, flat });
      scene.add(mesh);
    };

    const dashes = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.24, 3),
      new THREE.MeshLambertMaterial({ color: sky.road.clone() }),
      DASH_COUNT,
    );
    registerRecycled(
      dashes,
      Array.from({ length: DASH_COUNT }, (_, i) => ({
        offset: i * (WORLD_LENGTH / DASH_COUNT),
        x: 0,
        scale: 1,
        rotation: 0,
      })),
      0.016,
      true,
    );

    const posts = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.12, 1, 0.12),
      new THREE.MeshLambertMaterial({ color: sky.rail.clone() }),
      POST_COUNT,
    );
    registerRecycled(
      posts,
      Array.from({ length: POST_COUNT }, (_, i) => ({
        offset: i * (WORLD_LENGTH / POST_COUNT) + 3,
        x: i % 2 === 0 ? -5.6 : 5.6,
        scale: 1,
        rotation: 0,
      })),
      0.5,
    );

    const treeItems: Recycled[] = Array.from({ length: TREE_COUNT }, (_, i) => ({
      offset: (i / TREE_COUNT) * WORLD_LENGTH + random() * 4,
      x: (i % 2 === 0 ? -1 : 1) * (12 + random() * 34),
      scale: 0.8 + random() * 0.9,
      rotation: random() * Math.PI,
    }));
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.18, 0.26, 1.4, 6),
      new THREE.MeshLambertMaterial({ color: "#5b3a2c" }),
      TREE_COUNT,
    );
    registerRecycled(trunks, treeItems, 0.7);
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: sky.foliage.clone() });
    const canopies = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.7, 5, 7),
      canopyMaterial,
      TREE_COUNT,
    );
    registerRecycled(canopies, treeItems, 3.6);

    const rockItems: Recycled[] = Array.from({ length: ROCK_COUNT }, (_, i) => ({
      offset: (i / ROCK_COUNT) * WORLD_LENGTH + random() * 5,
      x: (i % 2 === 0 ? -1 : 1) * (8 + random() * 26),
      scale: 0.5 + random() * 1.3,
      rotation: random() * Math.PI,
    }));
    const rocks = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshLambertMaterial({ color: SUNSET.ochre }),
      ROCK_COUNT,
    );
    registerRecycled(rocks, rockItems, 0.4);

    // --- street lamps (static along the route, light up at dusk) -------------
    const lampPole = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.09, 0.13, 6.4, 6),
      new THREE.MeshLambertMaterial({ color: "#7b5a54" }),
      LAMP_COUNT,
    );
    const lampArm = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.6, 0.12, 0.12),
      new THREE.MeshLambertMaterial({ color: "#7b5a54" }),
      LAMP_COUNT,
    );
    const lampHeadMaterial = new THREE.MeshBasicMaterial({ color: SUNSET.gold, opacity: 0.2, transparent: true });
    const lampHead = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.34, 12, 8),
      lampHeadMaterial,
      LAMP_COUNT,
    );
    const lampPoolMaterial = new THREE.MeshBasicMaterial({
      map: createGlowTexture("rgba(255,226,170,0.95)", "rgba(255,180,110,0.3)"),
      color: SUNSET.gold,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const lampPools = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(13, 13),
      lampPoolMaterial,
      LAMP_COUNT,
    );
    lampPools.frustumCulled = false;
    lampPole.frustumCulled = false;
    lampArm.frustumCulled = false;
    lampHead.frustumCulled = false;

    for (let i = 0; i < LAMP_COUNT; i += 1) {
      const z = 90 - i * LAMP_SPACING;
      scratchVec.set(5.9, 3.2, z);
      scratchQuat.identity();
      scratchScale.set(1, 1, 1);
      scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
      lampPole.setMatrixAt(i, scratchMatrix);

      scratchVec.set(5.1, 6.3, z);
      scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
      lampArm.setMatrixAt(i, scratchMatrix);

      scratchVec.set(4.35, 6.24, z);
      scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
      lampHead.setMatrixAt(i, scratchMatrix);

      scratchVec.set(4.35, 0.03, z);
      scratchScale.set(1, 1, 1);
      scratchMatrix.compose(scratchVec, flatQuat, scratchScale);
      lampPools.setMatrixAt(i, scratchMatrix);
    }
    lampPole.instanceMatrix.needsUpdate = true;
    lampArm.instanceMatrix.needsUpdate = true;
    lampHead.instanceMatrix.needsUpdate = true;
    lampPools.instanceMatrix.needsUpdate = true;
    scene.add(lampPole, lampArm, lampHead, lampPools);

    // --- mountains -----------------------------------------------------------
    const ridges = [
      createRidgeLayer({
        count: 34,
        axis: "z",
        from: 260,
        to: -1800,
        offset: 170,
        side: -1,
        minHeight: 42,
        maxHeight: 105,
        minRadius: 34,
        maxRadius: 62,
        color: sky.ridgeNear.getHexString(),
        random,
      }),
      createRidgeLayer({
        count: 34,
        axis: "z",
        from: 260,
        to: -1800,
        offset: 190,
        side: 1,
        minHeight: 38,
        maxHeight: 96,
        minRadius: 32,
        maxRadius: 58,
        color: sky.ridgeNear.getHexString(),
        random,
      }),
      createRidgeLayer({
        count: 40,
        axis: "z",
        from: 320,
        to: -2200,
        offset: 360,
        side: -1,
        minHeight: 70,
        maxHeight: 165,
        minRadius: 60,
        maxRadius: 110,
        color: sky.ridgeMid.getHexString(),
        random,
      }),
      createRidgeLayer({
        count: 40,
        axis: "z",
        from: 320,
        to: -2200,
        offset: 400,
        side: 1,
        minHeight: 66,
        maxHeight: 158,
        minRadius: 58,
        maxRadius: 104,
        color: sky.ridgeMid.getHexString(),
        random,
      }),
      createRidgeLayer({
        count: 34,
        axis: "z",
        from: 400,
        to: -2800,
        offset: 640,
        side: -1,
        minHeight: 120,
        maxHeight: 250,
        minRadius: 120,
        maxRadius: 210,
        color: sky.ridgeFar.getHexString(),
        random,
      }),
      createRidgeLayer({
        count: 34,
        axis: "z",
        from: 400,
        to: -2800,
        offset: 690,
        side: 1,
        minHeight: 115,
        maxHeight: 240,
        minRadius: 115,
        maxRadius: 200,
        color: sky.ridgeFar.getHexString(),
        random,
      }),
    ];
    for (const ridge of ridges) {
      // Ridges are painted with their own atmospheric fade instead of fog, so
      // the horizon stays readable however far away they sit.
      ridge.material.fog = false;
      scene.add(ridge.mesh);
    }

    // --- billboards marking each stop ---------------------------------------
    const panelMaterials: THREE.MeshLambertMaterial[] = [];
    const signPoleMaterial = new THREE.MeshLambertMaterial({ color: "#8a6a5e" });
    const spacing = TRAVEL_DISTANCE / Math.max(sceneCount, 1);
    for (let i = 0; i < sceneCount; i += 1) {
      const sign = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.4, 0.28), signPoleMaterial);
      pole.position.y = 2.7;
      sign.add(pole);
      const panelMat = new THREE.MeshLambertMaterial({ color: SIGN_COLORS[i % SIGN_COLORS.length] });
      panelMaterials.push(panelMat);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 4.2), panelMat);
      panel.position.y = 6.2;
      sign.add(panel);
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.4, 3),
        new THREE.MeshLambertMaterial({ color: SUNSET.ink }),
      );
      band.position.y = 5.4;
      sign.add(band);
      sign.position.set(9, 0, -(i * spacing + spacing * 0.5));
      scene.add(sign);
    }

    // --- atmosphere ----------------------------------------------------------
    const skyDome = createSkyDome(600);
    scene.add(skyDome.mesh);
    const sun = createSun();
    scene.add(sun.group);
    const clouds = createCloudField(isWide ? 16 : 9, random);
    scene.add(clouds.group);
    const stars = createStarField(isWide ? 260 : 150, random);
    scene.add(stars.points);
    const birds = createBirdFlock(isWide ? 6 : 3, random);
    scene.add(birds.group);
    const dust = createDust(isWide ? 150 : 80, random);
    scene.add(dust.points);

    // --- bus -----------------------------------------------------------------
    const busModel = createBus({ detail: "high" });
    const bus = busModel.group;
    bus.scale.setScalar(1.05);
    scene.add(bus);

    const beams = createHeadlightBeams(26);
    beams.group.position.set(0, 1.3, -3.5);
    bus.add(beams.group);

    const headPoolA = createLightPool(22, SUNSET.gold);
    const headPoolB = createLightPool(15, SUNSET.cream);
    headPoolA.position.set(-0.9, 0.05, -16);
    headPoolB.position.set(0.9, 0.05, -13);
    bus.add(headPoolA, headPoolB);

    // --- sizing ---------------------------------------------------------------
    let aspect = 1;
    let composer: EffectComposer | null = null;
    let bloom: UnrealBloomPass | null = null;

    if (isWide) {
      try {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.85, 0.82);
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

    // --- loop ----------------------------------------------------------------
    const cameraPosition = new THREE.Vector3(-3.6, 7, 17);
    const cameraTarget = new THREE.Vector3(0, 2, 0);
    const desiredPosition = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();
    const busColor = new THREE.Color();

    let eased = 0;
    let elapsed = 0;
    let last = performance.now();
    let running = false;

    const updateWorld = (progress: number, dt: number, time: number) => {
      const travel = progress * TRAVEL_DISTANCE;
      const current = sampler.sample(progress);

      // Bus.
      bus.position.z = -travel;
      bus.position.y = reducedMotion ? 0 : Math.sin(time * 3.1) * 0.04;
      bus.rotation.z = reducedMotion ? 0 : Math.sin(time * 1.7) * 0.008;
      bus.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.55) * 0.014;
      const wheelSpin = travel / 0.55;
      for (const wheel of busModel.wheels) wheel.rotation.x = -wheelSpin;

      // Cinematic camera: eased between per-stop presets.
      const shot = Math.min(Math.max(progress, 0) * sceneCount, sceneCount - 1);
      const shotIndex = Math.min(Math.floor(shot), sceneCount - 2);
      const shotBlend = smoothstep(shot - shotIndex);
      const preset = lerpPreset(
        CAMERA_PRESETS[shotIndex % CAMERA_PRESETS.length],
        CAMERA_PRESETS[(shotIndex + 1) % CAMERA_PRESETS.length],
        shotBlend,
      );

      const breathing = reducedMotion ? 0 : Math.sin(time * 0.42) * 0.9;
      desiredPosition.set(
        preset.side + (reducedMotion ? 0 : Math.sin(time * 0.31) * 0.5),
        preset.height + (reducedMotion ? 0 : Math.sin(time * 0.77) * 0.18),
        bus.position.z + preset.dist,
      );
      desiredTarget.set(0, preset.lookHeight, bus.position.z + preset.lookAhead);
      cameraPosition.lerp(desiredPosition, reducedMotion ? 1 : 0.085);
      cameraTarget.lerp(desiredTarget, reducedMotion ? 1 : 0.085);
      camera.position.copy(cameraPosition);
      camera.lookAt(cameraTarget);
      if (!reducedMotion) camera.rotateZ(preset.roll + breathing * 0.002);
      if (Math.abs(camera.fov - preset.fov) > 0.05) {
        camera.fov += (preset.fov - camera.fov) * 0.06;
        camera.updateProjectionMatrix();
      }

      // Recycling: every object keeps a fixed distance ahead of the camera.
      for (const group of recycled) {
        for (let i = 0; i < group.items.length; i += 1) {
          const item = group.items[i];
          const distance =
            (((item.offset - travel) % WORLD_LENGTH) + WORLD_LENGTH) % WORLD_LENGTH;
          scratchVec.set(item.x, group.yFactor * item.scale, camera.position.z - distance);
          if (group.flat) {
            scratchQuat.copy(flatQuat);
          } else {
            scratchQuat.setFromAxisAngle(UP, item.rotation);
          }
          scratchScale.setScalar(item.scale);
          scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
          group.mesh.setMatrixAt(i, scratchMatrix);
        }
        group.mesh.instanceMatrix.needsUpdate = true;
      }

      // Living atmosphere.
      skyDome.mesh.position.copy(camera.position);
      skyDome.update(current);
      sun.update(current, camera.position);
      stars.update(current, camera.position);
      birds.update(time, camera.position.z);
      dust.points.position.set(0, 0, camera.position.z);
      dust.update(dt, 0.35 + current.lamp * 0.65);
      clouds.update(dt, camera.position.z, current.mid);

      // Lamp glow and bus lights follow the time of day.
      lampHeadMaterial.opacity = 0.16 + current.lamp * 0.9;
      lampHeadMaterial.color.copy(current.sun).lerp(busColor.set(SUNSET.gold), 0.5);
      lampPoolMaterial.opacity = current.lamp * 0.55;
      busModel.glass.color.copy(busColor.set("#7d6b7a")).lerp(current.sun, 0.35 + current.lamp * 0.5);
      beams.setIntensity(current.headlight);
      (headPoolA.material as THREE.MeshBasicMaterial).opacity = current.headlight * 0.5;
      (headPoolB.material as THREE.MeshBasicMaterial).opacity = current.headlight * 0.6;

      // Materials and lights.
      groundMaterial.color.copy(current.ground);
      roadMaterial.color.copy(current.road);
      lineMaterial.color.copy(current.rail);
      railMaterial.color.copy(current.rail);
      (dashes.material as THREE.MeshLambertMaterial).color.copy(current.rail);
      (posts.material as THREE.MeshLambertMaterial).color.copy(current.rail);
      canopyMaterial.color.copy(current.foliage);
      ridges[0].material.color.copy(current.ridgeNear);
      ridges[1].material.color.copy(current.ridgeNear);
      ridges[2].material.color.copy(current.ridgeMid);
      ridges[3].material.color.copy(current.ridgeMid);
      ridges[4].material.color.copy(current.ridgeFar);
      ridges[5].material.color.copy(current.ridgeFar);
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
      eased += (target - eased) * (reducedMotion ? 1 : 0.09);

      updateWorld(eased, delta, elapsed);
      if (composer) composer.render();
      else renderer.render(scene, camera);
    };

    // Scenery recycles beyond this fog wall, so nothing ever pops into view.
    scene.fog = new THREE.Fog(sky.fog.clone(), 30, isWide ? 265 : 230);

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
      panelMaterials.forEach((material) => material.dispose());
      composer?.dispose();
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [hostRef, progressRef, sceneCount]);
}
