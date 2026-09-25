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

/** One evening: late afternoon → golden hour → sunset → dusk. */
const KEYFRAMES: SkyKeyframe[] = [
  {
    t: 0,
    zenith: "#ffdca6",
    mid: "#ffc286",
    horizon: "#ffa462",
    sun: "#ffe8bb",
    keyColor: "#ffdda8",
    sunHeight: 0.46,
    sunOpacity: 1,
    key: 1.25,
    ambient: 0.46,
    hemiSky: "#ffdcb2",
    hemiGround: "#a97a4c",
    fog: "#f7b681",
    ground: "#d9b47e",
    foliage: "#77883f",
    ridgeNear: "#9c6440",
    ridgeMid: "#b87f58",
    ridgeFar: "#d2a077",
    road: "#a98d74",
    rail: "#fff0d6",
    lamp: 0.05,
    stars: 0,
    headlight: 0.3,
    bloom: 0.55,
  },
  {
    t: 0.42,
    zenith: "#ffcf96",
    mid: "#ffab73",
    horizon: "#ff8a5c",
    sun: "#ffc484",
    keyColor: "#ffc085",
    sunHeight: 0.22,
    sunOpacity: 1,
    key: 1.15,
    ambient: 0.44,
    hemiSky: "#ffcb9e",
    hemiGround: "#8a5a3c",
    fog: "#eb9a6a",
    ground: "#c99f74",
    foliage: "#5f6c37",
    ridgeNear: "#7c4a39",
    ridgeMid: "#96574a",
    ridgeFar: "#b0756a",
    road: "#93786a",
    rail: "#ffe7c8",
    lamp: 0.35,
    stars: 0.06,
    headlight: 0.6,
    bloom: 0.75,
  },
  {
    t: 0.74,
    zenith: "#d9636d",
    mid: "#bf4368",
    horizon: "#f2794c",
    sun: "#ff9a58",
    keyColor: "#ff9a63",
    sunHeight: 0.02,
    sunOpacity: 1,
    key: 0.85,
    ambient: 0.42,
    hemiSky: "#d1646f",
    hemiGround: "#5f3a45",
    fog: "#a85268",
    ground: "#a6795f",
    foliage: "#414a33",
    ridgeNear: "#5e3441",
    ridgeMid: "#6f3d4c",
    ridgeFar: "#8b4f5d",
    road: "#6f5a60",
    rail: "#f3c5a6",
    lamp: 0.85,
    stars: 0.35,
    headlight: 0.9,
    bloom: 1,
  },
  {
    t: 1,
    zenith: "#241c4a",
    mid: "#3b2a63",
    horizon: "#6b4269",
    sun: "#ff8a5c",
    keyColor: "#8f6ba0",
    sunHeight: -0.32,
    sunOpacity: 0,
    key: 0.26,
    ambient: 0.4,
    hemiSky: "#332a58",
    hemiGround: "#1d1830",
    fog: "#31264a",
    ground: "#3b3448",
    foliage: "#26302f",
    ridgeNear: "#2b2144",
    ridgeMid: "#33294c",
    ridgeFar: "#403455",
    road: "#38303f",
    rail: "#7d6f85",
    lamp: 1,
    stars: 1,
    headlight: 1,
    bloom: 0.85,
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
