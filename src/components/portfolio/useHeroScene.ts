import { useEffect, type RefObject } from "react";
import * as THREE from "three";

import {
  createBirdFlock,
  createCloudField,
  createDust,
  createMistPatch,
  createSilhouetteWall,
  createSkyDome,
  createSun,
} from "./three/atmosphere";
import { createBus } from "./three/createBus";
import { createSkySampler, seededRandom } from "./three/palette";

/**
 * The hero's living backdrop: a valley at golden hour — rolling hills fading
 * into mist, a low sun behind them, a forest either side of the road, and a
 * small bus driving away up it. It breathes on its own, leans with the
 * pointer, and slides toward dusk as the page scrolls out of the hero.
 */

const ROAD_ANGLE = -0.055;
const ROAD_ORIGIN = new THREE.Vector3(-13, 0, 30);
const BUS_TRAVEL = 340;

export function useHeroScene(
  hostRef: RefObject<HTMLElement | null>,
  progressRef: { current: number },
) {
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const random = seededRandom(7788);
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
    renderer.toneMappingExposure = 1.06;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.5, 2600);
    camera.position.set(0, 4.5, 20);

    const hemi = new THREE.HemisphereLight("#ffe0b0", "#b5724f", 0.9);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);
    const key = new THREE.DirectionalLight("#ffd9a0", 1.25);
    key.position.set(-80, 60, -60);
    scene.add(key);

    // --- valley floor and road ----------------------------------------------
    const groundMaterial = new THREE.MeshLambertMaterial({ color: "#e3bd8e" });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2800), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -500);
    scene.add(ground);

    const roadMaterial = new THREE.MeshLambertMaterial({ color: "#9d7566" });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 760), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = ROAD_ANGLE;
    road.position.set(ROAD_ORIGIN.x, 0.01, ROAD_ORIGIN.z - 360);
    scene.add(road);

    const laneMaterial = new THREE.MeshLambertMaterial({ color: "#ffe1bd" });
    for (let i = 0; i < 16; i += 1) {
      const s = 6 + i * 20;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 3.4), laneMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = ROAD_ANGLE;
      dash.position.set(
        ROAD_ORIGIN.x - Math.sin(ROAD_ANGLE) * s,
        0.02,
        ROAD_ORIGIN.z - Math.cos(ROAD_ANGLE) * s,
      );
      scene.add(dash);
    }

    // --- rolling hills, four depths -----------------------------------------
    // Fog is on: each ridge fades a little further into the haze than the one
    // in front of it, which is what reads as depth rather than stacked paper.
    const hills = [
      createSilhouetteWall({
        axis: "x",
        span: 2400,
        distance: 320,
        baseHeight: 22,
        amplitude: 18,
        color: "#a8663f",
        seed: 11,
        fog: true,
      }),
      createSilhouetteWall({
        axis: "x",
        span: 3000,
        distance: 520,
        baseHeight: 38,
        amplitude: 26,
        color: "#8d4a48",
        seed: 29,
        fog: true,
      }),
      createSilhouetteWall({
        axis: "x",
        span: 3600,
        distance: 780,
        baseHeight: 58,
        amplitude: 36,
        color: "#6d3a55",
        seed: 47,
        fog: true,
      }),
      createSilhouetteWall({
        axis: "x",
        span: 4400,
        distance: 1060,
        baseHeight: 88,
        amplitude: 52,
        color: "#4c2c52",
        seed: 71,
        fog: true,
      }),
    ];
    for (const hill of hills) scene.add(hill.mesh);

    // --- forest either side of the road --------------------------------------
    const makeTreeBand = (count: number, zNear: number, zFar: number, tint: string, scale: number) => {
      const items: { x: number; z: number; s: number }[] = [];
      let guard = 0;
      while (items.length < count && guard < count * 12) {
        guard += 1;
        const x = -320 + random() * 640;
        // Keep the road corridor clear.
        if (Math.abs(x - ROAD_ORIGIN.x) < 18) continue;
        items.push({ x, z: zNear + random() * (zFar - zNear), s: (0.8 + random() * 1.5) * scale });
      }

      const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.26, 3, 6);
      const canopyGeometry = new THREE.ConeGeometry(1.8, 5.6, 7);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: "#4a2f2f" });
      const canopyMaterial = new THREE.MeshLambertMaterial({ color: tint });

      const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, items.length);
      const canopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, items.length);
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

        position.set(item.x, 1.5 * item.s, item.z);
        matrix.compose(position, quaternion, scaleVector);
        trunks.setMatrixAt(index, matrix);

        position.set(item.x, 5.4 * item.s, item.z);
        matrix.compose(position, quaternion, scaleVector);
        canopies.setMatrixAt(index, matrix);
      });
      trunks.instanceMatrix.needsUpdate = true;
      canopies.instanceMatrix.needsUpdate = true;

      scene.add(trunks, canopies);
      return canopyMaterial;
    };

    const nearCanopies = makeTreeBand(isWide ? 120 : 60, -70, -170, "#39512f", 1);
    const farCanopies = makeTreeBand(isWide ? 150 : 70, -180, -330, "#4a4358", 1.1);

    // --- mist between the layers --------------------------------------------
    // Planes are left facing the viewer with a small yaw, and sit low so they
    // pool in the valley instead of floating across the ridges.
    const mistMaterials: THREE.MeshBasicMaterial[] = [];
    const mistPatches: THREE.Mesh[] = [];
    for (let i = 0; i < 13; i += 1) {
      const patch = createMistPatch(
        i % 3 === 0 ? 380 : 260,
        "#ffe2c0",
        0.05 + random() * 0.05,
      );
      patch.position.set(-280 + random() * 560, 6 + random() * 16, -150 - random() * 520);
      patch.rotation.y = (random() - 0.5) * 0.5;
      mistMaterials.push(patch.material as THREE.MeshBasicMaterial);
      mistPatches.push(patch);
      scene.add(patch);
    }

    // --- sky and weather -----------------------------------------------------
    const skyDome = createSkyDome(1200);
    scene.add(skyDome.mesh);
    const sun = createSun(900);
    scene.add(sun.group);
    const clouds = createCloudField(isWide ? 16 : 8, random);
    scene.add(clouds.group);
    const birds = createBirdFlock(isWide ? 8 : 4, random);
    scene.add(birds.group);
    const dust = createDust(isWide ? 110 : 60, random);
    scene.add(dust.points);

    const busModel = createBus({ detail: "low" });
    const bus = busModel.group;
    scene.add(bus);

    // Wide, gentle haze so the ground melts into the horizon and the far
    // ridges sit back in the air instead of reading as flat cut-outs.
    scene.fog = new THREE.Fog("#f2b183", 150, 1700);

    let aspect = 1;
    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      aspect = width / height;
      camera.aspect = aspect;
      camera.fov = aspect < 0.9 ? 66 : aspect < 1.5 ? 56 : 52;
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

    const focus = new THREE.Vector3(0, 4.2, 0);
    const desiredFocus = new THREE.Vector3();
    const scratch = new THREE.Color();

    let elapsed = 0;
    let last = performance.now();
    let running = false;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      elapsed += reducedMotion ? 0 : dt;

      // Golden hour that deepens toward sunset as the hero scrolls away.
      const progress = Math.min(Math.max(0.28 + progressRef.current * 0.4, 0), 1);
      const current = sampler.sample(progress);
      const time = elapsed;

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

      const targetX = reducedMotion ? 0 : pointerX * 3.6 + Math.sin(time * 0.2) * 0.6;
      const targetY = 4.5 - (reducedMotion ? 0 : pointerY * 1.4) + Math.sin(time * 0.34) * 0.2;
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.position.z = 20 + progressRef.current * 26;

      desiredFocus.set(
        pointerX * 1.4,
        4.2 - progressRef.current * 5,
        -40 - progressRef.current * 70,
      );
      focus.lerp(desiredFocus, 0.05);
      camera.lookAt(focus);

      skyDome.mesh.position.copy(camera.position);
      skyDome.update(current);
      sun.update(current, camera.position);
      sun.group.position.set(150, 24 + current.sunHeight * 190, camera.position.z - 820);
      clouds.update(dt, camera.position.z, scratch.copy(current.mid).lerp(current.sun, 0.35));
      birds.update(time, camera.position.z);
      dust.points.position.set(0, 0, camera.position.z);
      dust.update(dt, 0.3);

      groundMaterial.color.copy(current.ground);
      roadMaterial.color.copy(current.road).lerp(current.ridgeNear, 0.3);
      laneMaterial.color.copy(current.rail);
      hills[0].material.color.copy(current.ridgeNear).lerp(current.foliage, 0.22);
      hills[1].material.color.copy(current.ridgeNear).lerp(current.ridgeMid, 0.55);
      hills[2].material.color.copy(current.ridgeMid);
      hills[3].material.color.copy(current.ridgeMid).lerp(current.ridgeFar, 0.75);
      nearCanopies.color.copy(current.foliage).lerp(scratch.set("#1f2a1d"), 0.45);
      farCanopies.color.copy(current.ridgeMid).lerp(current.ridgeFar, 0.35);
      for (let i = 0; i < mistMaterials.length; i += 1) {
        mistMaterials[i].color.copy(current.horizon).lerp(scratch.set("#fff0dc"), 0.5);
        // Drift the haze slowly sideways so the valley breathes.
        mistPatches[i].position.x += reducedMotion ? 0 : dt * 1.6;
        if (mistPatches[i].position.x > 300) mistPatches[i].position.x = -300;
      }
      hemi.color.copy(current.hemiSky);
      hemi.groundColor.copy(current.hemiGround);
      hemi.intensity = 0.7 + current.ambient * 0.4;
      key.color.copy(current.keyColor);
      key.intensity = current.key * 1.05;
      ambient.intensity = current.ambient * 0.9;
      busModel.glass.color.copy(current.sun).lerp(scratch.set("#fff3e2"), 0.4);
      if (scene.fog) scene.fog.color.copy(current.horizon);

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
