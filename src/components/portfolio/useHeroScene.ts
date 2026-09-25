import { useEffect, type RefObject } from "react";
import * as THREE from "three";

import {
  createBirdFlock,
  createCloudField,
  createDeer,
  createDust,
  createMistPatch,
  createRabbit,
  createSilhouetteWall,
  createSkyDome,
  createSun,
} from "./three/atmosphere";
import { createBus } from "./three/createBus";
import { createSkySampler, seededRandom } from "./three/palette";

/**
 * The hero's living backdrop, composed like a landscape painting:
 *
 *   ┌──────────────────────────────────────────┐
 *   │        sky · sun · birds · clouds        │
 *   │      hazy blue-green far ridges          │
 *   │       greener forested hills             │
 *   │  forest edge · deer · meadow grass       │
 *   │ road sweeping off to the left, bus on it │
 *   └──────────────────────────────────────────┘
 *
 * Deep greens in the landscape, warm light on the meadow, and a bus driving
 * away along the valley road. It breathes on its own, leans gently with the
 * pointer, and eases toward dusk as the page scrolls out of the hero.
 */

const ROAD_ANGLE = -0.5;
const ROAD_ORIGIN = new THREE.Vector3(-11, 0, 24);
const BUS_TRAVEL = 340;

export function useHeroScene(
  hostRef: RefObject<HTMLElement | null>,
  progressRef: { current: number },
) {
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const random = seededRandom(20261);
    const isWide = window.innerWidth >= 900;

    const scene = new THREE.Scene();
    const sampler = createSkySampler();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearAlpha(0);
    } catch (error) {
      console.warn("[hero] WebGL unavailable, skipping the 3D vista", error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isWide ? 2 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 3000);
    camera.position.set(0, 4.6, 20);

    const hemi = new THREE.HemisphereLight("#ffdcae", "#66744e", 0.9);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, 0.38);
    scene.add(ambient);
    const key = new THREE.DirectionalLight("#ffd9a0", 1.12);
    key.position.set(-70, 42, -50);
    scene.add(key);
    const warmFill = new THREE.DirectionalLight("#ff9f5c", 0.38);
    warmFill.position.set(90, 18, 60);
    scene.add(warmFill);
    const warmAmbient = new THREE.AmbientLight("#ffc46b", 0.14);
    scene.add(warmAmbient);

    // --- meadow floor --------------------------------------------------------
    const groundMaterial = new THREE.MeshLambertMaterial({ color: "#b7a35f" });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2800, 2800), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -500);
    scene.add(ground);

    // --- the valley road, sweeping away to the left --------------------------
    const roadMaterial = new THREE.MeshLambertMaterial({ color: "#97806e" });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 780), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = ROAD_ANGLE;
    road.position.set(ROAD_ORIGIN.x, 0.01, ROAD_ORIGIN.z - 340);
    scene.add(road);

    const laneMaterial = new THREE.MeshLambertMaterial({ color: "#ffedcd" });
    for (let i = 0; i < 18; i += 1) {
      const s = 6 + i * 20;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 3.2), laneMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = ROAD_ANGLE;
      dash.position.set(
        ROAD_ORIGIN.x - Math.sin(ROAD_ANGLE) * s,
        0.02,
        ROAD_ORIGIN.z - Math.cos(ROAD_ANGLE) * s,
      );
      scene.add(dash);
    }

    // --- rolling hills: four depths, cooling and blueing with distance ------
    const hills = [
      createSilhouetteWall({
        axis: "x",
        span: 2600,
        distance: 330,
        baseHeight: 18,
        amplitude: 13,
        color: "#5f7a4a",
        seed: 11,
        fog: true,
      }),
      createSilhouetteWall({
        axis: "x",
        span: 3100,
        distance: 560,
        baseHeight: 32,
        amplitude: 22,
        color: "#557052",
        seed: 29,
        fog: true,
      }),
      createSilhouetteWall({
        axis: "x",
        span: 3700,
        distance: 830,
        baseHeight: 54,
        amplitude: 34,
        color: "#576b6b",
        seed: 47,
        fog: true,
      }),
      createSilhouetteWall({
        axis: "x",
        span: 4500,
        distance: 1120,
        baseHeight: 84,
        amplitude: 48,
        color: "#5d6a80",
        seed: 71,
        fog: true,
      }),
    ];
    for (const hill of hills) scene.add(hill.mesh);

    // --- forest wall along the road, and one behind the deer -----------------
    const makeTreeBand = (
      count: number,
      xNear: number,
      xFar: number,
      zNear: number,
      zFar: number,
      tint: string,
      scale: number,
      narrow = false,
    ) => {
      const items: { x: number; z: number; s: number; cone: boolean }[] = [];
      let guard = 0;
      while (items.length < count && guard < count * 14) {
        guard += 1;
        const x = xNear + random() * (xFar - xNear);
        const z = zNear + random() * (zFar - zNear);
        // Keep a meadow clearing between the road and the deer.
        if (!narrow && Math.abs(x - ROAD_ORIGIN.x) < 14 && z > ROAD_ORIGIN.z - 120) continue;
        items.push({ x, z, s: (0.8 + random() * 1.4) * scale, cone: random() > 0.4 });
      }

      const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.24, 2.8, 6);
      const coneGeometry = new THREE.ConeGeometry(1.7, 5.4, 7);
      const ballGeometry = new THREE.IcosahedronGeometry(1.9, 1);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: "#4a3229" });
      const canopyMaterial = new THREE.MeshLambertMaterial({ color: tint });

      const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, items.length);
      const canopies = new THREE.InstancedMesh(coneGeometry, canopyMaterial, items.length);
      trunks.frustumCulled = false;
      canopies.frustumCulled = false;

      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const position = new THREE.Vector3();
      const scaleVector = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);

      items.forEach((item, index) => {
        quaternion.setFromAxisAngle(up, random() * Math.PI * 2);
        scaleVector.setScalar(item.s);

        position.set(item.x, 1.4 * item.s, item.z);
        matrix.compose(position, quaternion, scaleVector);
        trunks.setMatrixAt(index, matrix);

        position.set(item.x, (item.cone ? 5.2 : 5) * item.s, item.z);
        matrix.compose(position, quaternion, scaleVector);
        canopies.setMatrixAt(index, matrix);
      });
      trunks.instanceMatrix.needsUpdate = true;
      canopies.instanceMatrix.needsUpdate = true;

      scene.add(trunks, canopies);
      return canopyMaterial;
    };

    // A treeline arcs around the meadow, denser on the left where the road
    // exits, thinner on the right so the ridges stay visible.
    const forestEdge = makeTreeBand(
      isWide ? 105 : 55,
      -190,
      150,
      -235,
      -95,
      "#41633c",
      1.05,
    );
    makeTreeBand(isWide ? 55 : 28, 95, 320, -250, -120, "#48683e", 1.2, true);
    // A few trees behind the deer on the near right, framing them.
    makeTreeBand(isWide ? 12 : 7, 4, 30, -34, -10, "#4c6b41", 1.35, true);

  // --- rabbits near the meadow edge, away from the road -------------------
    const rabbitGroup = new THREE.Group();
    const rabbits: ReturnType<typeof createRabbit>[] = [];
    const rabbitSpots: { x: number; z: number; s: number }[] = [
      { x: -12, z: -13, s: 1 },
      { x: 22, z: -35, s: 0.85 },
      { x: -26, z: -30, s: 0.9 },
    ];
    for (const spot of rabbitSpots) {
      const rabbit = createRabbit("#a58768");
      rabbit.group.position.set(spot.x, 0, spot.z);
      rabbit.group.rotation.y = -0.6 + random() * 1.2;
      rabbit.group.scale.setScalar(spot.s);
      rabbitGroup.add(rabbit.group);
      rabbits.push(rabbit);
    }
    scene.add(rabbitGroup);

    // --- meadow dressing: grass tufts, bushes, flowers ----------------------
    const tuftGeometry = new THREE.ConeGeometry(0.32, 1.1, 5);
    const tuftMaterial = new THREE.MeshLambertMaterial({ color: "#8fa04e" });
    const tuftCount = isWide ? 240 : 120;
    const tufts = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, tuftCount);
    const flowerGeometry = new THREE.SphereGeometry(0.09, 6, 5);
    const flowerMaterial = new THREE.MeshBasicMaterial({ color: "#ffd9a0" });
    const flowerCount = Math.round(tuftCount * 0.4);
    const flowers = new THREE.InstancedMesh(flowerGeometry, flowerMaterial, flowerCount);
    const bushGeometry = new THREE.IcosahedronGeometry(1, 1);
    const bushMaterial = new THREE.MeshLambertMaterial({ color: "#57713d" });
    const bushCount = isWide ? 26 : 14;
    const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);

    {
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const position = new THREE.Vector3();
      const scaleVector = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      const meadowSpot = () => {
        // Anywhere on the near meadow, clear of the road corridor.
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const x = -70 + random() * 160;
          const z = -46 + random() * 58;
          const roadX = ROAD_ORIGIN.x - (ROAD_ORIGIN.z - z) * Math.tan(ROAD_ANGLE);
          if (Math.abs(x - roadX) > 9) return { x, z };
        }
        return null;
      };

      let placed = 0;
      let flowerIndex = 0;
      for (let i = 0; i < tuftCount; i += 1) {
        const spot = meadowSpot();
        if (!spot) continue;
        quaternion.setFromAxisAngle(up, random() * Math.PI);
        scaleVector.set(1, 0.7 + random() * 1, 1);
        position.set(spot.x, 0.4 * scaleVector.y, spot.z);
        matrix.compose(position, quaternion, scaleVector);
        tufts.setMatrixAt(placed, matrix);
        if (flowerIndex < flowerCount && random() < 0.4) {
          position.set(spot.x + (random() - 0.5) * 1.4, 0.95, spot.z + (random() - 0.5) * 1.4);
          scaleVector.setScalar(1);
          matrix.compose(position, quaternion, scaleVector);
          flowers.setMatrixAt(flowerIndex, matrix);
          flowerIndex += 1;
        }
        placed += 1;
      }
      for (let i = placed; i < tuftCount; i += 1) {
        matrix.compose(position.set(0, -10, 0), quaternion.identity(), scaleVector.setScalar(0.01));
        tufts.setMatrixAt(i, matrix);
      }
      tufts.instanceMatrix.needsUpdate = true;
      for (let i = flowerIndex; i < flowerCount; i += 1) {
        matrix.compose(position.set(0, -10, 0), quaternion.identity(), scaleVector.setScalar(0.01));
        flowers.setMatrixAt(i, matrix);
      }
      flowers.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < bushCount; i += 1) {
        const spot = meadowSpot();
        quaternion.setFromAxisAngle(up, random() * Math.PI * 2);
        if (!spot) {
          matrix.compose(position.set(0, -10, 0), quaternion, scaleVector.setScalar(0.01));
        } else {
          const s = 0.7 + random() * 1.2;
          position.set(spot.x, 0.45 * s, spot.z);
          scaleVector.set(s, s * 0.75, s);
          matrix.compose(position, quaternion, scaleVector);
        }
        bushes.setMatrixAt(i, matrix);
      }
      bushes.instanceMatrix.needsUpdate = true;
    }
    scene.add(tufts, flowers, bushes);

    // --- deer grazing in the meadow -----------------------------------------
    const deerGroup = new THREE.Group();
    const deer: ReturnType<typeof createDeer>[] = [];
    const deerSpots: { x: number; z: number; s: number; buck: boolean }[] = [
      { x: 9, z: -17, s: 1.15, buck: true },
      { x: 16, z: -24, s: 1, buck: false },
      { x: 3.5, z: -28, s: 0.85, buck: false },
    ];
    for (const spot of deerSpots) {
      const deerInstance = createDeer(spot.buck ? "#8a5f3f" : "#96684a", spot.buck);
      deerInstance.group.position.set(spot.x, 0, spot.z);
      deerInstance.group.rotation.y = -0.7 + random() * 1.4;
      deerInstance.group.scale.setScalar(spot.s);
      deerGroup.add(deerInstance.group);
      deer.push(deerInstance);
    }
    scene.add(deerGroup);

    // --- mist pooling between the meadow and the forest ----------------------
    const mistMaterials: THREE.MeshBasicMaterial[] = [];
    const mistPatches: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i += 1) {
      const patch = createMistPatch(i % 3 === 0 ? 360 : 250, "#ffe2c0", 0.045 + random() * 0.04);
      patch.position.set(-280 + random() * 560, 5 + random() * 13, -110 - random() * 380);
      patch.rotation.y = (random() - 0.5) * 0.5;
      mistMaterials.push(patch.material as THREE.MeshBasicMaterial);
      mistPatches.push(patch);
      scene.add(patch);
    }

    // --- sky and weather -----------------------------------------------------
    const skyDome = createSkyDome(1300);
    scene.add(skyDome.mesh);
    const sun = createSun(950);
    scene.add(sun.group);
    const clouds = createCloudField(isWide ? 14 : 8, random);
    scene.add(clouds.group);
    const birds = createBirdFlock(isWide ? 7 : 4, random);
    scene.add(birds.group);
    const dust = createDust(isWide ? 90 : 50, random);
    scene.add(dust.points);

    const busModel = createBus({ detail: "low" });
    const bus = busModel.group;
    scene.add(bus);

    // Wide, gentle haze; greens roll off into the golden horizon.
    scene.fog = new THREE.Fog("#f6c48e", 170, 1800);

    let aspect = 1;
    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      aspect = width / height;
      camera.aspect = aspect;
      camera.fov = aspect < 0.9 ? 64 : aspect < 1.5 ? 55 : 50;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const focus = new THREE.Vector3(2, 3.2, -30);
    const desiredFocus = new THREE.Vector3();
    const scratch = new THREE.Color();

    let elapsed = 0;
    let last = performance.now();
    let running = false;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      elapsed += reducedMotion ? 0 : dt;
      const time = elapsed;

      // A settled late-golden-hour base that eases toward sunset on scroll.
      const progress = Math.min(Math.max(0.3 + progressRef.current * 0.34, 0), 1);
      const current = sampler.sample(progress);

      // Bus heading up the valley to the left, shrinking into the light.
      const s = ((time * 7.5) % BUS_TRAVEL + BUS_TRAVEL) % BUS_TRAVEL;
      bus.position.set(
        ROAD_ORIGIN.x - Math.sin(ROAD_ANGLE) * s,
        reducedMotion ? 0 : Math.sin(time * 3) * 0.05,
        ROAD_ORIGIN.z - Math.cos(ROAD_ANGLE) * s,
      );
      bus.rotation.y = ROAD_ANGLE + (reducedMotion ? 0 : Math.sin(time * 0.7) * 0.01);
      for (const wheel of busModel.wheels) wheel.rotation.x = -s / 0.56;
      const fadeStart = BUS_TRAVEL * 0.74;
      const fade = Math.min(Math.max((BUS_TRAVEL - s) / (BUS_TRAVEL - fadeStart), 0), 1);
      bus.scale.setScalar(fade * fade);
      bus.visible = fade > 0.02;

  // Rabbits idle and hop near the meadow edge.
      for (let i = 0; i < rabbits.length; i += 1) {
        rabbits[i].update(time, i * 3.7, reducedMotion);
      }

      // Deer graze and drift, always in the meadow.
      for (let i = 0; i < deer.length; i += 1) {
        const item = deer[i];
        const spot = deerSpots[i];
        item.update(time, i * 2.1);
        const wander = reducedMotion
          ? 0
          : Math.sin(time * 0.09 + i * 2.4) * 1.3;
        item.group.position.x = spot.x + wander;
        item.group.position.z = spot.z + Math.cos(time * 0.07 + i) * (reducedMotion ? 0 : 0.9);
        item.group.rotation.y += reducedMotion ? 0 : Math.sin(time * 0.13 + i) * 0.0006;
      }

      // Gentle pointer parallax: the valley leans, it never snaps.
      const targetX = reducedMotion ? 0 : pointerX * 2.6 + Math.sin(time * 0.16) * 0.5;
      const targetY = 4.6 - (reducedMotion ? 0 : pointerY * 1.1) + Math.sin(time * 0.3) * 0.16;
      camera.position.x += (targetX - camera.position.x) * 0.035;
      camera.position.y += (targetY - camera.position.y) * 0.035;
      camera.position.z = 20 + progressRef.current * 20;

      desiredFocus.set(
        2 - pointerX * 0.9,
        3.2 - progressRef.current * 3.4,
        -46 - progressRef.current * 55,
      );
      focus.lerp(desiredFocus, 0.04);
      camera.lookAt(focus);

      skyDome.mesh.position.copy(camera.position);
      skyDome.update(current);
      sun.update(current, camera.position);
      // Sun kept low over the far ridges, left of centre where the road exits.
      sun.group.position.set(-260, 26 + current.sunHeight * 200, camera.position.z - 780);
      clouds.update(dt, camera.position.z, scratch.copy(current.mid).lerp(current.sun, 0.3));
      birds.update(time, camera.position.z);
      dust.points.position.set(0, 0, camera.position.z);
      dust.update(dt, 0.25);

      groundMaterial.color.copy(current.ground).lerp(scratch.set("#b7a35f"), 0.72);
      roadMaterial.color.copy(current.road).lerp(scratch.set("#97806e"), 0.6);
      laneMaterial.color.copy(current.rail);
      hills[0].material.color.copy(current.ridgeNear).lerp(scratch.set("#5f7a4a"), 0.6);
      hills[1].material.color.copy(current.ridgeNear).lerp(current.ridgeMid, 0.5).lerp(scratch.set("#557052"), 0.45);
      hills[2].material.color.copy(current.ridgeMid).lerp(scratch.set("#576b6b"), 0.5);
      hills[3].material.color.copy(current.ridgeMid).lerp(current.ridgeFar, 0.5).lerp(scratch.set("#5d6a80"), 0.45);
      forestEdge.color.copy(current.foliage).lerp(scratch.set("#41633c"), 0.62);
      tuftMaterial.color.copy(current.foliage).lerp(scratch.set("#8fa04e"), 0.66);
      bushMaterial.color.copy(current.foliage).lerp(scratch.set("#57713d"), 0.6);
      for (let i = 0; i < mistMaterials.length; i += 1) {
        mistMaterials[i].color.copy(current.horizon).lerp(scratch.set("#fff0dc"), 0.55);
        mistPatches[i].position.x += reducedMotion ? 0 : dt * 1.2;
        if (mistPatches[i].position.x > 300) mistPatches[i].position.x = -300;
      }
      hemi.color.copy(current.hemiSky);
      hemi.groundColor.copy(current.hemiGround);
      hemi.intensity = 0.75 + current.ambient * 0.35;
      key.color.copy(current.keyColor);
      key.intensity = current.key;
      ambient.intensity = current.ambient * 0.9;
      busModel.glass.color.copy(current.sun).lerp(scratch.set("#fff3e2"), 0.4);
      if (scene.fog) scene.fog.color.copy(current.fog).lerp(scratch.set("#f6c48e"), 0.65);

      renderer.render(scene, camera);
    };

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
      { rootMargin: "100px" },
    );
    visibility.observe(host);

    return () => {
      stop();
      visibility.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
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
  }, [hostRef, progressRef]);
}
