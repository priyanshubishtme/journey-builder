import * as THREE from "three";
import {
  SUNSET,
  createGlowTexture,
  seededRandom,
  type SkySample,
} from "./palette";

/**
 * Reusable pieces of the sunset world: a vertex-coloured sky dome, a sun with
 * a soft bloom-friendly glow, drifting clouds, stars that come out at dusk,
 * silhouetted birds, layered mountain ridges, floating dust and warm light
 * pools for lamps and headlights.
 */

type Random = ReturnType<typeof seededRandom>;

const scratchColor = new THREE.Color();
const scratchMatrix = new THREE.Matrix4();
const scratchQuat = new THREE.Quaternion();
const scratchVec = new THREE.Vector3();
const scratchScale = new THREE.Vector3();
const white = new THREE.Color("#ffffff");
const UP = new THREE.Vector3(0, 1, 0);

/** Vertex-coloured hemisphere: horizon → mid sky → zenith, all animated. */
export function createSkyDome(radius = 600) {
  const geometry = new THREE.SphereGeometry(radius, 32, 22);
  const total = geometry.attributes.position.count;
  const colors = new Float32Array(total * 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;

  const position = geometry.attributes.position;
  const colorAttribute = geometry.attributes.color as THREE.BufferAttribute;

  return {
    mesh,
    update(sample: SkySample) {
      for (let i = 0; i < total; i += 1) {
        const t = position.getY(i) / radius;
        if (t <= 0) {
          scratchColor.copy(sample.horizon);
        } else if (t < 0.28) {
          scratchColor.copy(sample.horizon).lerp(sample.mid, t / 0.28);
        } else {
          scratchColor.copy(sample.mid).lerp(sample.zenith, (t - 0.28) / 0.72);
        }
        colorAttribute.setXYZ(i, scratchColor.r, scratchColor.g, scratchColor.b);
      }
      colorAttribute.needsUpdate = true;
    },
  };
}

/** Sun: bright core plus a wide additive glow, kept relative to the camera. */
export function createSun(distance = 460) {
  const group = new THREE.Group();
  const glowTexture = createGlowTexture("rgba(255,255,255,0.95)", "rgba(255,220,170,0.4)");

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  glow.scale.set(230, 230, 1);
  glow.position.z = -1;
  group.add(glow);

  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  core.scale.set(58, 58, 1);
  group.add(core);

  return {
    group,
    update(sample: SkySample, camera: THREE.Vector3) {
      const y = 30 + sample.sunHeight * 230;
      group.position.set(-distance * 0.34, y, camera.z - distance * 0.94);
      const opacity = sample.sunOpacity;
      (glow.material as THREE.SpriteMaterial).opacity = opacity * 0.75;
      (core.material as THREE.SpriteMaterial).opacity = opacity;
      (glow.material as THREE.SpriteMaterial).color.copy(sample.sun);
      (core.material as THREE.SpriteMaterial).color.copy(sample.sun).lerp(white, 0.4);
    },
  };
}

/** Soft clouds that drift sideways and take on the sunset tint. */
export function createCloudField(count: number, random: Random) {
  const group = new THREE.Group();
  const texture = createGlowTexture("rgba(255,255,255,0.85)", "rgba(255,255,255,0.25)");
  const clouds: { sprite: THREE.Sprite; speed: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.3 + random() * 0.2,
        fog: false,
      }),
    );
    const width = 150 + random() * 260;
    sprite.scale.set(width, width * (0.16 + random() * 0.14), 1);
    sprite.position.set(
      -260 + random() * 520,
      70 + random() * 130,
      -120 - random() * 420,
    );
    group.add(sprite);
    clouds.push({ sprite, speed: 3 + random() * 6 });
  }

  return {
    group,
    update(dt: number, cameraZ: number, tint: THREE.Color) {
      for (const cloud of clouds) {
        cloud.sprite.position.x += cloud.speed * dt;
        if (cloud.sprite.position.x > 300) cloud.sprite.position.x = -300;
        (cloud.sprite.material as THREE.SpriteMaterial).color.copy(tint);
      }
      group.position.z = cameraZ;
    },
  };
}

/** Stars fade in as the sun goes down. */
export function createStarField(count: number, random: Random) {
  const positions = new Float32Array(count * 3);
  const radius = 420;
  for (let i = 0; i < count; i += 1) {
    const theta = random() * Math.PI * 2;
    const phi = random() * 0.42 + 0.05;
    positions[i * 3] = Math.cos(theta) * Math.cos(phi) * radius;
    positions[i * 3 + 1] = Math.sin(phi) * radius;
    positions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: "#fff3e0",
      size: 1.9,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  points.frustumCulled = false;

  return {
    points,
    update(sample: SkySample, camera: THREE.Vector3) {
      (points.material as THREE.PointsMaterial).opacity = sample.stars * 0.95;
      points.visible = sample.stars > 0.01;
      points.position.set(camera.x, camera.y, camera.z);
    },
  };
}

/** Simple silhouetted birds drifting across the sky. */
export function createBirdFlock(count: number, random: Random) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: "#3b2438" });
  const birds: {
    body: THREE.Group;
    left: THREE.Mesh;
    right: THREE.Mesh;
    radius: number;
    speed: number;
    phase: number;
    height: number;
  }[] = [];

  for (let i = 0; i < count; i += 1) {
    const bird = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.16), material);
    bird.add(torso);
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.22), material);
    left.position.x = -0.6;
    bird.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.22), material);
    right.position.x = 0.6;
    bird.add(right);
    group.add(bird);

    birds.push({
      body: bird,
      left,
      right,
      radius: 40 + random() * 90,
      speed: 0.05 + random() * 0.06,
      phase: random() * Math.PI * 2,
      height: 45 + random() * 70,
    });
  }

  return {
    group,
    update(time: number, cameraZ: number) {
      for (const bird of birds) {
        const angle = bird.phase + time * bird.speed;
        bird.body.position.set(
          Math.cos(angle) * bird.radius,
          bird.height + Math.sin(angle * 2.3) * 6,
          Math.sin(angle) * bird.radius * 0.5 - 60,
        );
        bird.body.rotation.y = -angle;
        const flap = Math.sin(time * 7 + bird.phase) * 0.55;
        bird.left.rotation.z = flap;
        bird.right.rotation.z = -flap;
      }
      group.position.z = cameraZ;
    },
  };
}

/**
 * Low-poly deer for the valley. The neck is on a pivot so it can graze — dip
 * to the grass, lift to look around — on its own slow cycle.
 */
export function createDeer(color: string, buck = false) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5, 0.44), mat);
  body.position.y = 0.82;
  group.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat);
  chest.position.set(0.45, 0.86, 0);
  chest.scale.set(1, 0.95, 0.8);
  group.add(chest);

  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), mat);
  rump.position.set(-0.45, 0.88, 0);
  rump.scale.set(0.9, 1, 0.8);
  group.add(rump);

  for (const [x, z] of [
    [0.38, 0.14],
    [0.38, -0.14],
    [-0.38, 0.14],
    [-0.38, -0.14],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.09), mat);
    leg.position.set(x, 0.31, z);
    group.add(leg);
  }

  // Neck and head on a pivot; rotation.z lifts the head, negative grazes.
  const neck = new THREE.Group();
  neck.position.set(0.5, 1.02, 0);
  const neckMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.16), mat);
  neckMesh.position.set(0.08, 0.2, 0);
  neckMesh.rotation.z = -0.5;
  neck.add(neckMesh);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.16), mat);
  head.position.set(0.3, 0.46, 0);
  neck.add(head);
  const earGeometry = new THREE.ConeGeometry(0.05, 0.16, 6);
  for (const z of [0.07, -0.07]) {
    const ear = new THREE.Mesh(earGeometry, mat);
    ear.position.set(0.18, 0.58, z);
    ear.rotation.z = -0.6;
    neck.add(ear);
  }
  if (buck) {
    for (const z of [0.07, -0.07]) {
      const antler = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.045), mat);
      antler.position.set(0.16, 0.68, z);
      antler.rotation.z = 0.7;
      antler.rotation.y = z > 0 ? 0.4 : -0.4;
      neck.add(antler);
    }
  }
  group.add(neck);

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat);
  tail.position.set(-0.58, 0.94, 0);
  group.add(tail);

  return {
    group,
    update(time: number, phase: number) {
      neck.rotation.z = -0.35 + Math.sin(time * 0.35 + phase) * 0.55;
      group.rotation.y += Math.sin(time * 0.1 + phase) * 0.0004;
    },
  };
}

/**
 * Smooth rolling hills as a single shaped silhouette wall.
 *
 * Stacked cones read as spikes; a wall whose top edge is a sum of slow sine
 * waves reads as landscape. `axis` decides which way it runs: "x" across the
 * view (hero), "z" alongside the road (journey).
 */
export function createSilhouetteWall({
  axis,
  span,
  center = 0,
  distance,
  segments = 140,
  baseHeight,
  amplitude,
  color,
  seed,
  fillTo = -60,
  fog = false,
}: {
  axis: "x" | "z";
  span: number;
  center?: number;
  distance: number;
  segments?: number;
  baseHeight: number;
  amplitude: number;
  color: string;
  seed: number;
  fillTo?: number;
  /** Let the scene fog haze distant ridges. Off for close, road side hills. */
  fog?: boolean;
}) {
  const random = seededRandom(seed);
  const p1 = random() * Math.PI * 2;
  const p2 = random() * Math.PI * 2;
  const p3 = random() * Math.PI * 2;
  const f1 = 0.9 + random() * 0.7;
  const f2 = 2.2 + random() * 1.3;
  const f3 = 4.6 + random() * 2.4;

  const positions = new Float32Array((segments + 1) * 6);
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const along = center + (t - 0.5) * span;
    const height =
      baseHeight +
      amplitude *
        (0.5 +
          0.34 * Math.sin(t * Math.PI * f1 + p1) +
          0.2 * Math.sin(t * Math.PI * f2 + p2) +
          0.1 * Math.sin(t * Math.PI * f3 + p3));

    const offset = i * 6;
    if (axis === "x") {
      positions[offset] = along;
      positions[offset + 1] = height;
      positions[offset + 2] = -distance;
      positions[offset + 3] = along;
      positions[offset + 4] = fillTo;
      positions[offset + 5] = -distance;
    } else {
      positions[offset] = distance;
      positions[offset + 1] = height;
      positions[offset + 2] = along;
      positions[offset + 3] = distance;
      positions[offset + 4] = fillTo;
      positions[offset + 5] = along;
    }

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    color,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  material.fog = fog;

  return { mesh: new THREE.Mesh(geometry, material), material };
}

/** Warm fireflies drifting beside the road as the light goes. */
export function createFireflies(count: number, random: Random) {
  const base = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  const radius = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    base[i * 3] = -6 + random() * 40;
    base[i * 3 + 1] = 0.6 + random() * 4.4;
    base[i * 3 + 2] = -random() * 160;
    phase[i] = random() * Math.PI * 2;
    speed[i] = 0.4 + random() * 1.1;
    radius[i] = 0.6 + random() * 2.2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: createGlowTexture("rgba(255,236,180,1)", "rgba(255,196,107,0.35)"),
      color: "#ffd98a",
      size: 1.4,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  points.frustumCulled = false;
  const attribute = geometry.attributes.position as THREE.BufferAttribute;

  return {
    points,
    update(time: number, cameraZ: number, intensity: number) {
      for (let i = 0; i < count; i += 1) {
        const wobble = time * speed[i] + phase[i];
        attribute.setXYZ(
          i,
          base[i * 3] + Math.cos(wobble) * radius[i],
          base[i * 3 + 1] + Math.sin(wobble * 1.7) * 0.5,
          base[i * 3 + 2] + Math.sin(wobble * 0.8) * radius[i],
        );
      }
      attribute.needsUpdate = true;
      (points.material as THREE.PointsMaterial).opacity = intensity;
      points.visible = intensity > 0.02;
      points.position.z = cameraZ;
    },
  };
}

/**
 * Soft haze patch. The plane is left facing +Z so callers can orient it: the
 * journey passes it a yaw so it faces the roadside camera, the hero leaves it
 * facing the viewer.
 */
export function createMistPatch(size: number, color: string, opacity: number) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(size, size * 0.22),
    new THREE.MeshBasicMaterial({
      map: createGlowTexture("rgba(255,248,236,0.55)", "rgba(255,222,186,0.18)"),
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
}

/** Layered mountain ridges, static and cheap (one instanced draw per layer). */
export function createRidgeLayer({
  count,
  axis,
  from,
  to,
  offset,
  side = 1,
  minHeight,
  maxHeight,
  minRadius,
  maxRadius,
  color,
  random,
}: {
  count: number;
  axis: "x" | "z";
  from: number;
  to: number;
  offset: number;
  side?: number;
  minHeight: number;
  maxHeight: number;
  minRadius: number;
  maxRadius: number;
  color: string;
  random: Random;
}) {
  const geometry = new THREE.ConeGeometry(1, 1, 4, 1);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const along = from + (to - from) * t;
    const jitter = (random() - 0.5) * ((to - from) / count) * 0.8;
    const height = minHeight + random() * (maxHeight - minHeight);
    const radius = minRadius + random() * (maxRadius - minRadius);
    const lateral = offset * side + (random() - 0.5) * 22;

    if (axis === "z") {
      scratchVec.set(lateral, height / 2, along + jitter);
    } else {
      scratchVec.set(along + jitter, height / 2, lateral);
    }
    scratchScale.set(radius, height, radius);
    scratchQuat.setFromAxisAngle(UP, random() * Math.PI);
    scratchMatrix.compose(scratchVec, scratchQuat, scratchScale);
    mesh.setMatrixAt(i, scratchMatrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  return { mesh, material };
}

/** Fine dust drifting past the camera — sells the sense of speed. */
export function createDust(count: number, random: Random) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (random() - 0.5) * 26;
    positions[i * 3 + 1] = random() * 8 + 0.2;
    positions[i * 3 + 2] = -random() * 90;
    speeds[i] = 6 + random() * 22;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: createGlowTexture("rgba(255,240,214,0.9)", "rgba(255,214,168,0.3)"),
      color: SUNSET.cream,
      size: 0.42,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  points.frustumCulled = false;

  const attribute = geometry.attributes.position as THREE.BufferAttribute;

  return {
    points,
    update(dt: number, intensity: number) {
      for (let i = 0; i < count; i += 1) {
        let z = attribute.getZ(i) + speeds[i] * dt * 0.35;
        if (z > 6) {
          z = -90;
          attribute.setX(i, (Math.random() - 0.5) * 26);
          attribute.setY(i, Math.random() * 8 + 0.2);
        }
        attribute.setZ(i, z);
      }
      attribute.needsUpdate = true;
      (points.material as THREE.PointsMaterial).opacity = 0.25 + intensity * 0.45;
    },
  };
}

/** Additive pool of light on the ground (lamps, headlights, windows). */
export function createLightPool(size: number, color: string) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: createGlowTexture("rgba(255,255,255,0.9)", "rgba(255,214,150,0.35)"),
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Two crossed gradient planes reading as headlight beams. */
export function createHeadlightBeams(length: number) {
  const group = new THREE.Group();
  const texture = createGlowTexture("rgba(255,240,210,0.9)", "rgba(255,214,150,0.25)");
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: SUNSET.gold,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  for (const rotation of [0, Math.PI / 2]) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(4.4, length), material);
    beam.rotation.y = rotation;
    beam.rotation.x = -0.06;
    beam.position.z = -length / 2;
    group.add(beam);
  }

  return {
    group,
    setIntensity(value: number) {
      material.opacity = value * 0.5;
      group.visible = value > 0.02;
    },
  };
}
