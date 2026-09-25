import { useEffect, type RefObject } from "react";
import * as THREE from "three";

import { createGlowTexture } from "./three/palette";
import { createBus } from "./three/createBus";

/**
 * 3D layer for the route section.
 *
 * An orthographic camera maps one world unit to one CSS pixel, so the route
 * measured in the DOM can be turned into a real 3D curve. The plane is tilted
 * a few degrees (and the curve pre-compensated for it) so the bus and the stop
 * pins have genuine depth while still landing exactly on their dots.
 */

export type RoutePoint = { x: number; y: number };

const TILT = -0.2;
const COS_TILT = Math.cos(TILT);
const BUS_SCALE = 6.2;
const PIN_HEIGHT = 15;

export function useRouteScene(
  hostRef: RefObject<HTMLElement | null>,
  stopPoints: RoutePoint[],
  pathPoints: RoutePoint[],
  box: { width: number; height: number },
  travelRef: { current: number },
  activeRef: { current: number },
) {
  const key = `${box.width}x${box.height}:${pathPoints
    .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
    .join("|")}`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;
    if (box.width < 2 || box.height < 2 || pathPoints.length < 2) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearAlpha(0);
    } catch (error) {
      console.warn("[route] WebGL unavailable, skipping the 3D route", error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(box.width, box.height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(
      0,
      box.width,
      box.height,
      0,
      -4000,
      4000,
    );
    camera.position.set(0, 0, 1200);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight("#ffe2b8", "#7a4a52", 1.15));
    const key = new THREE.DirectionalLight("#fff0d2", 1.2);
    key.position.set(-1, 1.4, 1);
    scene.add(key);

    // Tilted plane that everything in this section lives on.
    const world = new THREE.Group();
    world.rotation.x = TILT;
    scene.add(world);

    /** Screen pixels → plane coordinates (y up, compensated for the tilt). */
    const toPlane = (point: RoutePoint) =>
      new THREE.Vector3(point.x, (box.height - point.y) / COS_TILT, 0);

    const curve = new THREE.CatmullRomCurve3(
      pathPoints.map(toPlane),
      false,
      "catmullrom",
      0.35,
    );

    // --- stop pins ------------------------------------------------------------
    const rings: THREE.Mesh[] = [];
    const pinBodies: THREE.Mesh[] = [];
    stopPoints.forEach((point, index) => {
      const education = index === 0 || index === 1;
      const tint = education ? "#ff9f45" : "#d4466e";

      const pin = new THREE.Group();
      // Cone apex points down, resting exactly on the stop's dot.
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(6.4, PIN_HEIGHT, 16),
        new THREE.MeshLambertMaterial({ color: tint }),
      );
      body.rotation.x = Math.PI;
      body.position.y = PIN_HEIGHT / 2;
      pin.add(body);
      pinBodies.push(body);

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(4.6, 16, 12),
        new THREE.MeshLambertMaterial({ color: "#fff6ea" }),
      );
      cap.position.y = PIN_HEIGHT + 2.2;
      pin.add(cap);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshBasicMaterial({
          map: createGlowTexture("rgba(43,26,42,0.5)", "rgba(43,26,42,0.12)"),
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        }),
      );
      pin.add(shadow);

      const plane = toPlane(point);
      pin.position.set(plane.x, plane.y, 0);
      world.add(pin);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(11, 13.5, 28),
        new THREE.MeshBasicMaterial({
          color: tint,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      ring.position.set(plane.x, plane.y, 0.5);
      world.add(ring);
      rings.push(ring);
    });

    // --- bus ------------------------------------------------------------------
    const rig = new THREE.Group();
    const busModel = createBus({ detail: "low" });
    const bus = busModel.group;
    bus.rotation.set(Math.PI / 2, Math.PI, 0);
    bus.scale.setScalar(BUS_SCALE);
    rig.add(bus);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlowTexture("rgba(255,214,150,0.75)", "rgba(240,112,58,0.22)"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.7,
      }),
    );
    halo.scale.set(76, 76, 1);
    halo.position.z = -2;
    rig.add(halo);
    world.add(rig);

    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    let eased = 0;

    let elapsed = 0;
    let last = performance.now();
    let running = false;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      const target = Math.min(Math.max(travelRef.current, 0), 1);
      eased += (target - eased) * (reducedMotion ? 1 : 0.085);

      curve.getPointAt(Math.min(Math.max(eased, 0), 0.9999), point);
      curve.getTangentAt(Math.min(Math.max(eased, 0), 0.9999), tangent);
      rig.position.copy(point);
      rig.position.y += reducedMotion ? 0 : Math.sin(elapsed * 3) * 1.4;
      rig.rotation.z = Math.atan2(tangent.x, -tangent.y);
      for (const wheel of busModel.wheels) wheel.rotation.x = -eased * 60;

      const activeIndex = activeRef.current;
      rings.forEach((ring, index) => {
        const isActive = index === activeIndex;
        const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsed * 2.4 + index) * 0.12;
        ring.scale.setScalar(isActive ? pulse * 1.15 : 0.6);
        (ring.material as THREE.MeshBasicMaterial).opacity = isActive
          ? 0.35 + Math.sin(elapsed * 3) * 0.12
          : 0.12;
      });

      if (halo.material instanceof THREE.SpriteMaterial) {
        halo.material.opacity = 0.45 + (reducedMotion ? 0 : Math.sin(elapsed * 2.6) * 0.12);
      }
      pinBodies.forEach((body, index) => {
        const isActive = index === activeRef.current;
        body.scale.setScalar(isActive ? 1.12 : 1);
      });

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
      { rootMargin: "160px" },
    );
    visibility.observe(host);

    start();

    return () => {
      stop();
      visibility.disconnect();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostRef, key, travelRef, activeRef]);
}
