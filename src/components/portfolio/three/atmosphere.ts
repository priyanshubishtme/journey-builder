import * as THREE from "three";
import {
  SUNSET,
  createGlowTexture,
  type SkySample,
  type seededRandom,
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
