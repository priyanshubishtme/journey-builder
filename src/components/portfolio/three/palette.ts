import * as THREE from "three";

/** Shared keys for the warm-to-dusk sky this portfolio is built around. */
export const SUNSET = {
  cream: "#fff6ea",
  gold: "#ffc46b",
  amber: "#ff9f45",
  orange: "#f0703a",
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
  indigo: "#4a4080",
  brass: "#c9863f",
  warm: "#ff7a2c",
  clay: "#e35a3a",
  mauve: "#cf4a78",
  paper: "#f7efe6",
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
  windows: string;
  marker: string;
  bloom: number;
};

/** One evening: late afternoon → golden hour → sunset → dusk. */
const KEYFRAMES: SkyKeyframe[] = [
  {
    t: 0,
    zenith: "#c9daea",
    mid: "#e2b6a3",
    horizon: "#f5cf9a",
    sun: "#ffe9c4",
    keyColor: "#ffd9a8",
    sunHeight: 0.48,
    sunOpacity: 1,
    key: 1.3,
    ambient: 0.5,
    hemiSky: "#dfe6f2",
    hemiGround: "#b0896a",
    fog: "#f3d9b8",
    ground: "#c9b18a",
    foliage: "#7f8a4d",
    ridgeNear: "#b08258",
    ridgeMid: "#d7a877",
    ridgeFar: "#e6cdb4",
    road: "#b39c7e",
    rail: "#ffe7c6",
    lamp: 0.06,
    stars: 0,
    headlight: 0.32,
    windows: "#ffd99a",
    marker: "#ffd99a",
    bloom: 0.5,
  },
  {
    t: 0.45,
    zenith: "#ffcba4",
    mid: "#ff9c6a",
    horizon: "#ff7b46",
    sun: "#ffd98a",
    keyColor: "#ffb87a",
    sunHeight: 0.16,
    sunOpacity: 1,
    key: 1.15,
    ambient: 0.44,
    hemiSky: "#ffc794",
    hemiGround: "#8c5a3c",
    fog: "#e08f5e",
    ground: "#b8946d",
    foliage: "#5f6c36",
    ridgeNear: "#8c5a44",
    ridgeMid: "#a86a58",
    ridgeFar: "#c79286",
    road: "#9c8470",
    rail: "#ffd9a8",
    lamp: 0.32,
    stars: 0.06,
    headlight: 0.6,
    windows: "#ffe6b8",
    marker: "#ffd99a",
    bloom: 0.72,
  },
  {
    t: 0.78,
    zenith: "#9c4a6a",
    mid: "#bf5070",
    horizon: "#f28a4e",
    sun: "#ffae66",
    keyColor: "#ff9a58",
    sunHeight: 0.02,
    sunOpacity: 1,
    key: 0.85,
    ambient: 0.42,
    hemiSky: "#c06372",
    hemiGround: "#5d3a48",
    fog: "#a85268",
    ground: "#9d7862",
    foliage: "#434a30",
    ridgeNear: "#5e3441",
    ridgeMid: "#6f3d4c",
    ridgeFar: "#88505e",
    road: "#725a64",
    rail: "#f3c5a6",
    lamp: 0.82,
    stars: 0.34,
    headlight: 0.9,
    windows: "#ffb975",
    marker: "#ffae66",
    bloom: 1,
  },
  {
    t: 1,
    zenith: "#1f1a52",
    mid: "#312a66",
    horizon: "#6a426a",
    sun: "#ff7a46",
    keyColor: "#8f6ba0",
    sunHeight: -0.34,
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
    windows: "#ffb975",
    marker: "#ff7a46",
    bloom: 0.8,
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
  windows: THREE.Color;
  marker: THREE.Color;
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

const COLOR_KEYS_AFTER = ["windows", "marker"] as const;

/** Pre-allocated atmosphere sampler — safe to call every frame. */
export function createSkySampler() {
  const sample = {} as SkySample;
  for (const key of COLOR_KEYS) sample[key] = new THREE.Color(KEYFRAMES[0][key]);
  for (const key of NUMBER_KEYS) sample[key] = KEYFRAMES[0][key];
  for (const key of COLOR_KEYS_AFTER) sample[key] = new THREE.Color(KEYFRAMES[0][key]);

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
      for (const key of COLOR_KEYS_AFTER) {
        from.set(a[key]);
        to.set(b[key]);
        sample[key].copy(from).lerp(to, local);
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
