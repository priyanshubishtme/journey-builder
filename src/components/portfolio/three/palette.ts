import * as THREE from "three";

/**
 * Warm sunset palette shared by the CSS theme and every 3D scene.
 *
 * The journey runs from a golden morning to a violet dusk; `createSkySampler`
 * interpolates the whole atmosphere (sky, sun, lights, fog, foliage, lamp
 * glow, stars, headlights, bloom) from a single scroll progress value.
 */

export const SUNSET = {
  cream: "#fff6ea",
  gold: "#ffc46b",
  amber: "#ff9f45",
  orange: "#f0703a",
  coral: "#e8564a",
  rose: "#d4466e",
  magenta: "#ab3f7c",
  plum: "#6d3a7b",
  dusk: "#3c2a5c",
  night: "#1d1730",
  ink: "#2b1a2a",
  sand: "#f2d3a6",
  ochre: "#c9863f",
  russet: "#8d4a33",
  olive: "#7c7b45",
  pine: "#3f5a45",
} as const;

type SkyKeyframe = {
  t: number;
  zenith: string;
  mid: string;
  horizon: string;
  sun: string;
  keyColor: string;
  sunHeight: number;
  sunOpacity: number;
  key: number;
  ambient: number;
  hemiSky: string;
  hemiGround: string;
  fog: string;
  ground: string;
  foliage: string;
  ridgeNear: string;
  ridgeMid: string;
  ridgeFar: string;
  road: string;
  rail: string;
  lamp: number;
  stars: number;
  headlight: number;
  bloom: number;
};

/** Dawn → midday → golden hour → sunset → dusk. */
const KEYFRAMES: SkyKeyframe[] = [
  {
    t: 0,
    zenith: "#ffe6b0",
    mid: "#ffd08f",
    horizon: "#ffb37a",
    sun: "#ffdf9e",
    keyColor: "#ffdba6",
    sunHeight: 0.55,
    sunOpacity: 1,
    key: 1.1,
    ambient: 0.4,
    hemiSky: "#ffe3bb",
    hemiGround: "#d9a97d",
    fog: "#ffc79a",
    ground: "#f0cfa4",
    foliage: "#8a9350",
    ridgeNear: "#b8794f",
    ridgeMid: "#c98f66",
    ridgeFar: "#e0ac86",
    road: "#cdb28f",
    rail: "#fff2e0",
    lamp: 0,
    stars: 0,
    headlight: 0.12,
    bloom: 0.3,
  },
  {
    t: 0.38,
    zenith: "#b9d6ea",
    mid: "#ffe4bd",
    horizon: "#ffcf9f",
    sun: "#fff3cf",
    keyColor: "#fff0cf",
    sunHeight: 0.88,
    sunOpacity: 1,
    key: 1.45,
    ambient: 0.5,
    hemiSky: "#dfeaf2",
    hemiGround: "#e3c095",
    fog: "#eddfc6",
    ground: "#f4dcb6",
    foliage: "#7f8a4c",
    ridgeNear: "#a9724a",
    ridgeMid: "#bf8b63",
    ridgeFar: "#d9ab86",
    road: "#d3b795",
    rail: "#fff7ea",
    lamp: 0,
    stars: 0,
    headlight: 0.1,
    bloom: 0.28,
  },
  {
    t: 0.62,
    zenith: "#ffd9a4",
    mid: "#ffb27a",
    horizon: "#ff8a5c",
    sun: "#ffc07a",
    keyColor: "#ffc78a",
    sunHeight: 0.3,
    sunOpacity: 1,
    key: 1.3,
    ambient: 0.45,
    hemiSky: "#ffd0a4",
    hemiGround: "#b8834f",
    fog: "#f7a274",
    ground: "#eabd8c",
    foliage: "#71793f",
    ridgeNear: "#9c5f43",
    ridgeMid: "#b3714f",
    ridgeFar: "#cf8f6a",
    road: "#c2a283",
    rail: "#fff0dc",
    lamp: 0.35,
    stars: 0.05,
    headlight: 0.5,
    bloom: 0.6,
  },
  {
    t: 0.82,
    zenith: "#df6f6d",
    mid: "#d4496c",
    horizon: "#f4804f",
    sun: "#ff9a58",
    keyColor: "#ff9c63",
    sunHeight: 0.05,
    sunOpacity: 1,
    key: 1.0,
    ambient: 0.4,
    hemiSky: "#e8737a",
    hemiGround: "#7d4a52",
    fog: "#c85a6a",
    ground: "#c8886a",
    foliage: "#5c5c44",
    ridgeNear: "#7b3f48",
    ridgeMid: "#8f4a55",
    ridgeFar: "#a75a63",
    road: "#9c7a72",
    rail: "#f6cdb4",
    lamp: 0.8,
    stars: 0.25,
    headlight: 0.85,
    bloom: 0.95,
  },
  {
    t: 1,
    zenith: "#271e4d",
    mid: "#43306a",
    horizon: "#7a4a72",
    sun: "#ff8a5c",
    keyColor: "#9a6ba8",
    sunHeight: -0.3,
    sunOpacity: 0,
    key: 0.3,
    ambient: 0.42,
    hemiSky: "#3b2f60",
    hemiGround: "#241d38",
    fog: "#3b2d51",
    ground: "#4a3f57",
    foliage: "#2f3a3d",
    ridgeNear: "#33284a",
    ridgeMid: "#3b2f52",
    ridgeFar: "#4a3b60",
    road: "#443a48",
    rail: "#8d7f92",
    lamp: 1,
    stars: 1,
    headlight: 1,
    bloom: 0.75,
  },
];

export type SkySample = {
  zenith: THREE.Color;
  mid: THREE.Color;
  horizon: THREE.Color;
  sun: THREE.Color;
  keyColor: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  fog: THREE.Color;
  ground: THREE.Color;
  foliage: THREE.Color;
  ridgeNear: THREE.Color;
  ridgeMid: THREE.Color;
  ridgeFar: THREE.Color;
  road: THREE.Color;
  rail: THREE.Color;
  sunHeight: number;
  sunOpacity: number;
  key: number;
  ambient: number;
  lamp: number;
  stars: number;
  headlight: number;
  bloom: number;
};

const COLOR_KEYS = [
  "zenith",
  "mid",
  "horizon",
  "sun",
  "keyColor",
  "hemiSky",
  "hemiGround",
  "fog",
  "ground",
  "foliage",
  "ridgeNear",
  "ridgeMid",
  "ridgeFar",
  "road",
  "rail",
] as const;

const NUMBER_KEYS = [
  "sunHeight",
  "sunOpacity",
  "key",
  "ambient",
  "lamp",
  "stars",
  "headlight",
  "bloom",
] as const;

/** Pre-allocated atmosphere sampler — safe to call every frame. */
export function createSkySampler() {
  const sample = {} as SkySample;
  for (const key of COLOR_KEYS) sample[key] = new THREE.Color(KEYFRAMES[0][key]);
  for (const key of NUMBER_KEYS) sample[key] = KEYFRAMES[0][key];

  const from = new THREE.Color();
  const to = new THREE.Color();

  return {
    sample: (progress: number) => {
      const p = Math.min(Math.max(progress, 0), 1);
      let i = 0;
      while (i < KEYFRAMES.length - 2 && p > KEYFRAMES[i + 1].t) i += 1;
      const a = KEYFRAMES[i];
      const b = KEYFRAMES[i + 1];
      const span = b.t - a.t || 1;
      const local = Math.min(Math.max((p - a.t) / span, 0), 1);

      for (const key of COLOR_KEYS) {
        from.set(a[key]);
        to.set(b[key]);
        sample[key].copy(from).lerp(to, local);
      }
      for (const key of NUMBER_KEYS) {
        sample[key] = a[key] + (b[key] - a[key]) * local;
      }
      return sample;
    },
  };
}

/** Deterministic pseudo-random so every scene looks identical on each load. */
export function seededRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** Soft radial sprite used for glows, light pools and dust. */
export function createGlowTexture(inner = "rgba(255,255,255,1)", mid = "rgba(255,255,255,0.35)") {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.45, mid);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Vertical gradient with a bright core, used for headlight beams. */
export function createBeamTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, size, 0, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0.85)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.32)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
