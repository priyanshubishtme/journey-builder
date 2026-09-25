import { useEffect, type RefObject } from "react";
import * as THREE from "three";

import {
  createBirdFlock,
  createCloudField,
  createDust,
  createRidgeLayer,
  createSkyDome,
  createSun,
} from "./three/atmosphere";
import { createBus } from "./three/createBus";
import { createSkySampler, seededRandom } from "./three/palette";

/**
 * The hero's living backdrop: a sunset vista with layered ridges, a low sun,
 * drifting clouds and birds, and a small bus driving away up the road on the
 * left. It breathes on its own and leans with the pointer, then sinks toward
 * dusk as the page scrolls out of the hero.
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
    renderer.toneMappingExposure = 1.05;
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

    // Ground + the road the bus drives away on.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2200, 2400),
      new THREE.MeshLambertMaterial({ color: "#e7bf92" }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -400);
    scene.add(ground);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(8.6, 760),
      new THREE.MeshLambertMaterial({ color: "#a97f6e" }),
    );
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

    // Ridges running across the horizon.
    const ridges = [
      createRidgeLayer({
        count: 26,
        axis: "x",
        from: -900,
        to: 900,
        offset: -400,
        minHeight: 40,
        maxHeight: 86,
        minRadius: 60,
        maxRadius: 120,
        color: "#8d4a33",
        random,
      }),
      createRidgeLayer({
        count: 22,
        axis: "x",
        from: -1100,
        to: 1100,
        offset: -620,
        minHeight: 78,
        maxHeight: 150,
        minRadius: 110,
        maxRadius: 200,
        color: "#6d3a55",
        random,
      }),
      createRidgeLayer({
        count: 18,
        axis: "x",
        from: -1400,
        to: 1400,
        offset: -880,
        minHeight: 130,
        maxHeight: 240,
        minRadius: 180,
        maxRadius: 300,
        color: "#4a2b4c",
        random,
      }),
    ];
    for (const ridge of ridges) {
      ridge.material.fog = false;
      scene.add(ridge.mesh);
    }

    const skyDome = createSkyDome(700);
    scene.add(skyDome.mesh);
    const sun = createSun(520);
    scene.add(sun.group);
    const clouds = createCloudField(isWide ? 14 : 8, random);
    scene.add(clouds.group);
    const birds = createBirdFlock(isWide ? 7 : 4, random);
    scene.add(birds.group);
    const dust = createDust(isWide ? 110 : 60, random);
    scene.add(dust.points);

    const busModel = createBus({ detail: "low" });
    const bus = busModel.group;
    scene.add(bus);

    scene.fog = new THREE.Fog("#ffc79a", 80, 520);

    let aspect = 1;
    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      aspect = width / height;
      camera.aspect = aspect;
      camera.fov = aspect < 0.9 ? 64 : aspect < 1.5 ? 56 : 52;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    // Pointer parallax.
    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const focus = new THREE.Vector3(0, 4.2, 0);
    const desiredFocus = new THREE.Vector3();
    const skyTint = new THREE.Color();

    let elapsed = 0;
    let last = performance.now();
    let running = false;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      elapsed += reducedMotion ? 0 : dt;

      // The hero starts in golden hour and slides toward sunset as it leaves.
      const progress = Math.min(Math.max(0.5 + progressRef.current * 0.34, 0), 1);
      const current = sampler.sample(progress);
      const time = elapsed;

      // Bus driving away along the road, fading out before it wraps.
      const s = ((time * 7.5) % BUS_TRAVEL + BUS_TRAVEL) % BUS_TRAVEL;
      bus.position.set(
        ROAD_ORIGIN.x - Math.sin(ROAD_ANGLE) * s,
        reducedMotion ? 0 : Math.sin(time * 3) * 0.05,
        ROAD_ORIGIN.z - Math.cos(ROAD_ANGLE) * s,
      );
      bus.rotation.y = ROAD_ANGLE + (reducedMotion ? 0 : Math.sin(time * 0.7) * 0.01);
      for (const wheel of busModel.wheels) wheel.rotation.x = -s / 0.55;
      const fadeStart = BUS_TRAVEL * 0.74;
      const fade = Math.min(Math.max((BUS_TRAVEL - s) / (BUS_TRAVEL - fadeStart), 0), 1);
      bus.scale.setScalar(fade * fade);
      bus.visible = fade > 0.02;

      // Pointer-leaning camera with a slow idle drift.
      const targetX = reducedMotion ? 0 : pointerX * 3.4 + Math.sin(time * 0.2) * 0.6;
      const targetY = 4.5 - (reducedMotion ? 0 : pointerY * 1.4) + Math.sin(time * 0.34) * 0.2;
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.position.z = 20 + progressRef.current * 22;

      desiredFocus.set(
        pointerX * 1.4,
        4.2 - progressRef.current * 5.5,
        -30 - progressRef.current * 60,
      );
      focus.lerp(desiredFocus, 0.05);
      camera.lookAt(focus);

      skyDome.mesh.position.copy(camera.position);
      skyDome.update(current);
      sun.update(current, camera.position);
      sun.group.position.x = 130;
      sun.group.position.y = 20 + current.sunHeight * 150;
      clouds.update(dt, camera.position.z, skyTint.copy(current.mid).lerp(current.sun, 0.35));
      birds.update(time, camera.position.z);
      dust.points.position.set(0, 0, camera.position.z);
      dust.update(dt, 0.35);

      ground.material.color.copy(current.ground);
      (road.material as THREE.MeshLambertMaterial).color
        .copy(current.road)
        .lerp(current.ridgeNear, 0.35);
      laneMaterial.color.copy(current.rail);
      ridges[0].material.color.copy(current.ridgeNear);
      ridges[1].material.color.copy(current.ridgeMid);
      ridges[2].material.color.copy(current.ridgeFar);
      busModel.glass.color.copy(current.sun).lerp(skyTint.set("#fff3e2"), 0.4);
      hemi.color.copy(current.hemiSky);
      hemi.groundColor.copy(current.hemiGround);
      key.color.copy(current.keyColor);
      key.intensity = current.key * 1.1;
      ambient.intensity = current.ambient * 0.9;
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
