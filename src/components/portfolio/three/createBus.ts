import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SUNSET } from "./palette";

export type BusModel = {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  /** Semi-transparent glazing; tint it warmer as the evening comes on. */
  glass: THREE.MeshBasicMaterial;
  /** Warm interior surface seen through the windows. */
  interior: THREE.MeshBasicMaterial;
  headlights: THREE.Mesh[];
  /** Passenger silhouette; scenes can bob or sway it. */
  rider: THREE.Group | null;
  /** Half length of the bus, handy for framing. */
  length: number;
};

const WIDTH = 2.6;
const LENGTH = 6.6;
const SILL = 1.78;
const HEAD = 2.58;

/**
 * A stylised coach built as an open frame — lower body, pillars and roof — so
 * the illuminated interior and the passenger at the window are actually
 * visible through the glazing. `detail: "low"` keeps a closed, simpler body
 * for background buses.
 */
export function createBus({ detail = "high" }: { detail?: "high" | "low" } = {}): BusModel {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: SUNSET.cream });
  const inkMat = new THREE.MeshLambertMaterial({ color: SUNSET.ink });
  const frameMat = new THREE.MeshLambertMaterial({ color: "#e8dbc7" });
  const stripeMat = new THREE.MeshLambertMaterial({ color: SUNSET.orange });
  const headMat = new THREE.MeshBasicMaterial({ color: "#fff3d6" });
  const tailMat = new THREE.MeshBasicMaterial({ color: "#ff6a4d" });
  const glass = new THREE.MeshBasicMaterial({
    color: "#ffe0ae",
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const interior = new THREE.MeshBasicMaterial({ color: "#ffb877" });

  const detailed = detail === "high";
  const halfLength = LENGTH / 2;

  // Lower body.
  const lower = new THREE.Mesh(new RoundedBoxGeometry(WIDTH, 1.5, LENGTH, 3, 0.3), bodyMat);
  lower.position.y = 1.03;
  group.add(lower);

  // Amber waist stripe.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.05, 0.16, LENGTH - 0.5), stripeMat);
  stripe.position.y = 1.5;
  group.add(stripe);

  // Roof.
  const roof = new THREE.Mesh(new RoundedBoxGeometry(WIDTH, 0.5, LENGTH, 3, 0.18), bodyMat);
  roof.position.y = 2.75;
  group.add(roof);

  // Interior: a lit inner wall the passenger is silhouetted against, plus a
  // warm strip under the roof.
  let rider: THREE.Group | null = null;
  if (detailed) {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, LENGTH - 0.6), interior);
    cabin.position.y = 2.05;
    group.add(cabin);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(WIDTH - 0.5, 0.06, LENGTH - 1.2),
      new THREE.MeshBasicMaterial({ color: "#fff0c4" }),
    );
    glow.position.y = 2.66;
    group.add(glow);
  } else {
    const band = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.04, 0.8, LENGTH - 1.4), inkMat);
    band.position.y = 2.16;
    group.add(band);
  }

  // Pillars and glazing: five uprights a side, panes between them.
  const pillarZ = [-2.45, -1.22, 0, 1.22, 2.45];
  for (const side of [-1, 1]) {
    for (const z of pillarZ) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, HEAD - SILL, 0.15), frameMat);
      pillar.position.set(side * (WIDTH / 2 - 0.01), (SILL + HEAD) / 2, z);
      group.add(pillar);
    }

    if (detailed) {
      for (let i = 0; i < pillarZ.length - 1; i += 1) {
        const z = (pillarZ[i] + pillarZ[i + 1]) / 2;
        const pane = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, HEAD - SILL - 0.1, 1.03),
          glass,
        );
        pane.position.set(side * (WIDTH / 2 - 0.01), (SILL + HEAD) / 2, z);
        group.add(pane);
      }
    }
  }

  // Sill rail and roof rail close the glass band.
  for (const y of [SILL, HEAD]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.03, 0.12, LENGTH - 0.1), frameMat);
    rail.position.y = y;
    group.add(rail);
  }

  // Windscreen and rear window.
  const windscreen = new THREE.Mesh(new THREE.BoxGeometry(WIDTH - 0.34, HEAD - SILL - 0.1, 0.05), glass);
  windscreen.position.set(0, (SILL + HEAD) / 2, halfLength - 0.02);
  group.add(windscreen);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(WIDTH - 0.5, HEAD - SILL - 0.2, 0.05), glass);
  rear.position.set(0, (SILL + HEAD) / 2, -halfLength + 0.02);
  group.add(rear);

  if (detailed) {
    // Passenger at the window, backlit by the lit cabin wall.
    const passenger = new THREE.Group();
    const riderMat = new THREE.MeshBasicMaterial({ color: "#3a2233" });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.56, 0.42), riderMat);
    torso.position.y = 1.7;
    passenger.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), riderMat);
    head.position.y = 2.08;
    passenger.add(head);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.46), riderMat);
    arm.position.set(0.1, 1.6, 0.36);
    passenger.add(arm);
    passenger.position.set(1.02, 0, 0.5);
    group.add(passenger);
    rider = passenger;

    // Wing mirrors.
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.45), inkMat);
      post.position.set(side * (WIDTH / 2 + 0.2), 2.5, halfLength - 0.6);
      group.add(post);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.22), inkMat);
      mirror.position.set(side * (WIDTH / 2 + 0.32), 2.44, halfLength - 0.78);
      group.add(mirror);
    }

    // Roof vents.
    for (const z of [0.9, -0.8]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.8), frameMat);
      vent.position.set(0, 3.03, z);
      group.add(vent);
    }

    // Door on the kerb side.
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 1.1), inkMat);
    door.position.set(WIDTH / 2 - 0.02, 1.4, 2.05);
    group.add(door);
  }

  if (detail === "low") {
    const windscreenLow = new THREE.Mesh(
      new THREE.BoxGeometry(WIDTH - 0.3, HEAD - SILL, 0.06),
      inkMat,
    );
    windscreenLow.position.set(0, (SILL + HEAD) / 2, halfLength + 0.01);
    group.add(windscreenLow);
    const rearLow = windscreenLow.clone();
    rearLow.position.z = -halfLength - 0.01;
    group.add(rearLow);
  }

  // Bumpers and lights.
  for (const z of [halfLength + 0.02, -halfLength - 0.02]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.06, 0.3, 0.24), inkMat);
    bumper.position.set(0, 0.62, z);
    group.add(bumper);
  }

  const headlights: THREE.Mesh[] = [];
  for (const x of [-0.84, 0.84]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.1), headMat);
    head.position.set(x, 1.16, halfLength + 0.03);
    group.add(head);
    headlights.push(head);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.1), tailMat);
    tail.position.set(x, 1.24, -halfLength - 0.03);
    group.add(tail);
  }

  // Wheels with arches.
  const wheelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.42, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.45, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const tyreMat = new THREE.MeshLambertMaterial({ color: "#241a24" });
  const hubMat = new THREE.MeshLambertMaterial({ color: "#d8ccb8" });
  const wheels: THREE.Mesh[] = [];

  for (const x of [-1.28, 1.28]) {
    for (const z of [2.05, -2.05]) {
      const arch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 1.5), inkMat);
      arch.position.set(x * 1.005, 0.72, z);
      group.add(arch);

      const wheel = new THREE.Mesh(wheelGeo, tyreMat);
      wheel.position.set(x, 0.56, z);
      group.add(wheel);
      wheels.push(wheel);

      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.position.set(x, 0.56, z);
      group.add(hub);
    }
  }

  // Contact shadow.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 30),
    new THREE.MeshBasicMaterial({ color: SUNSET.ink, transparent: true, opacity: 0.24 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.05, 2.1, 1);
  shadow.position.y = 0.02;
  group.add(shadow);

  return {
    group,
    wheels,
    glass,
    interior,
    headlights,
    rider,
    length: LENGTH,
  };
}
