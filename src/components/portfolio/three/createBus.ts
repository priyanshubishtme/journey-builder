import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SUNSET } from "./palette";

export type BusModel = {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  /** Window panes are emissive-looking; tint them as the sun goes down. */
  glass: THREE.MeshBasicMaterial;
  headlights: THREE.Mesh[];
  /** Half length of the bus, handy for camera framing. */
  length: number;
};

/**
 * A stylised coach: rounded cream body, amber waist stripe, glass band, roof
 * vents and twin headlights. `detail: "low"` strips the small parts for the
 * background buses in the hero and route scenes.
 */
export function createBus({ detail = "high" }: { detail?: "high" | "low" } = {}): BusModel {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: SUNSET.cream });
  const inkMat = new THREE.MeshLambertMaterial({ color: SUNSET.ink });
  const stripeMat = new THREE.MeshLambertMaterial({ color: SUNSET.orange });
  const glass = new THREE.MeshBasicMaterial({ color: "#ffd9a0" });
  const paint = new THREE.MeshLambertMaterial({ color: "#f6ead9" });
  const headMat = new THREE.MeshBasicMaterial({ color: "#fff3d6" });
  const tailMat = new THREE.MeshBasicMaterial({ color: "#ff6a4d" });

  const length = 6.6;
  const width = 2.6;

  const body = new THREE.Mesh(new RoundedBoxGeometry(width, 2.3, length, 4, 0.32), bodyMat);
  body.position.y = 1.45;
  group.add(body);

  // Amber waist stripe.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 0.16, length - 0.5), stripeMat);
  stripe.position.y = 1.05;
  group.add(stripe);

  // Glass band with individual panes.
  const band = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.78, length - 1.5), inkMat);
  band.position.y = 2.02;
  group.add(band);

  for (const side of [-1, 1]) {
    const panes = detail === "high" ? 5 : 3;
    for (let i = 0; i < panes; i += 1) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.72), glass);
      pane.position.set(
        side * (width / 2 + 0.03),
        2.04,
        -1.6 + i * ((3.2 + 0.7) / Math.max(panes - 1, 1)),
      );
      group.add(pane);
    }
  }

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.95, 0.12), glass);
  windshield.position.set(0, 2.0, length / 2 - 0.05);
  group.add(windshield);

  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(width - 0.45, 0.7, 0.1), glass);
  rearWindow.position.set(0, 2.02, -length / 2 + 0.05);
  group.add(rearWindow);

  // Roof panel + vents.
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.12, length - 0.6), paint);
  roof.position.y = 2.6;
  group.add(roof);

  if (detail === "high") {
    for (const z of [0.9, -0.6]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.8), inkMat);
      vent.position.set(0, 2.7, z);
      group.add(vent);
    }
    // Door on the kerb side.
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.15), inkMat);
    door.position.set(width / 2 + 0.02, 1.28, 1.5);
    group.add(door);
    // Wing mirrors.
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), inkMat);
      post.position.set(side * (width / 2 + 0.2), 2.35, length / 2 - 0.5);
      group.add(post);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.24), inkMat);
      mirror.position.set(side * (width / 2 + 0.34), 2.3, length / 2 - 0.68);
      group.add(mirror);
    }
    // Driver silhouette behind the windscreen.
    const driver = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.4), inkMat);
    driver.position.set(-0.55, 1.85, length / 2 - 0.75);
    group.add(driver);
  }

  // Front: grille bands, bumpers, headlights.
  for (const z of [length / 2 - 0.02, -length / 2 + 0.02]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 0.3, 0.22), inkMat);
    bumper.position.set(0, 0.6, z);
    group.add(bumper);
  }

  if (detail === "high") {
    for (const y of [0.95, 1.12]) {
      const grille = new THREE.Mesh(new THREE.BoxGeometry(width - 0.5, 0.05, 0.1), paint);
      grille.position.set(0, y, length / 2 + 0.02);
      group.add(grille);
    }
  }

  const headlights: THREE.Mesh[] = [];
  for (const x of [-0.84, 0.84]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.1), headMat);
    head.position.set(x, 1.28, length / 2 + 0.02);
    group.add(head);
    headlights.push(head);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), tailMat);
    tail.position.set(x, 1.35, -length / 2 - 0.02);
    group.add(tail);
  }

  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.44, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.46, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const tyreMat = new THREE.MeshLambertMaterial({ color: "#241a24" });
  const hubMat = new THREE.MeshLambertMaterial({ color: "#cbbfae" });
  const wheels: THREE.Mesh[] = [];

  for (const x of [-1.3, 1.3]) {
    for (const z of [2.05, -2.05]) {
      const wheel = new THREE.Mesh(wheelGeo, tyreMat);
      wheel.position.set(x, 0.55, z);
      group.add(wheel);
      wheels.push(wheel);

      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.position.set(x, 0.55, z);
      group.add(hub);
    }
  }

  // Contact shadow.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 30),
    new THREE.MeshBasicMaterial({ color: SUNSET.ink, transparent: true, opacity: 0.22 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.05, 2.1, 1);
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, wheels, glass, headlights, length };
}
