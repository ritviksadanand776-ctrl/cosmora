export type DestinationId = 'moon' | 'mercury' | 'venus' | 'mars' | 'titan' | 'europa';

export type GameScreen =
  | 'title'
  | 'levels'
  | 'builder'
  | 'rollout'
  | 'flight'
  | 'earth-orbit'
  | 'transit'
  | 'landing'
  | 'rover'
  | 'quit';

export type CameraMode = 'rear-chase' | 'booster-cam' | 'wide-ascent' | 'free-orbit';
export type FlightMode = 'assisted' | 'simulation';
export type BoosterStyle = 'twin' | 'quad' | 'heavy6' | 'none';
export type FairingStyle = 'ogive' | 'hammerhead' | 'needle' | 'shield';
export type LanderFinish = 'gold' | 'silver' | 'copper' | 'obsidian';
export type PlumeStyle = 'amber' | 'cryo' | 'violet' | 'emerald';

export interface SpacecraftConfig {
  name: string;
  hullColor: string;
  accentColor: string;
  boosterStyle: BoosterStyle;
  fairingStyle: FairingStyle;
  landerFinish: LanderFinish;
  plumeStyle: PlumeStyle;
}

export const DEFAULT_SPACECRAFT: SpacecraftConfig = {
  name: 'Cosmora Mk-IV Explorer',
  hullColor: '#eef2f6',
  accentColor: '#ea580c',
  boosterStyle: 'twin',
  fairingStyle: 'ogive',
  landerFinish: 'gold',
  plumeStyle: 'amber',
};

export interface GameSettings {
  flightMode: FlightMode;
  autoStageAssist: boolean;
  autoLandAssist: boolean;
  shadowsEnabled: boolean;
  muted: boolean;
  screenMode: 'laptop' | 'fullscreen';
}

export const DEFAULT_SETTINGS: GameSettings = {
  flightMode: 'assisted',
  autoStageAssist: true,
  autoLandAssist: true,
  shadowsEnabled: true,
  muted: false,
  screenMode: 'laptop',
};

export interface ScienceSample {
  id: string;
  title: string;
  x: number;
  z: number;
  reading: string;
  points: number;
  creditReward: number;
  isRare?: boolean;
  unlocksItemId?: string;
}

export type ShopCategory = 'hull' | 'accent' | 'booster' | 'fairing' | 'foil' | 'plume';

export interface CatalogItem {
  id: string;
  category: ShopCategory;
  label: string;
  description: string;
  value: string;
  price: number; // 0 = free starter; >0 = shop price
  rarePlanet?: DestinationId; // if set, unlocked by Rare Sample Search on that planet
  swatchHex?: string;
}

export const CATALOG_ITEMS: CatalogItem[] = [
  // Hull Colors
  { id: 'hull-white', category: 'hull', label: 'Aerospace White', description: 'Standard thermal ceramic white', value: '#eef2f6', price: 0, swatchHex: '#eef2f6' },
  { id: 'hull-slate', category: 'hull', label: 'Stealth Graphite', description: 'Low-observable carbon composite', value: '#334155', price: 0, swatchHex: '#334155' },
  { id: 'hull-navy', category: 'hull', label: 'Cobalt Navy', description: 'Deep orbital command blue', value: '#1e3a8a', price: 450, swatchHex: '#1e3a8a' },
  { id: 'hull-crimson', category: 'hull', label: 'Mars Crimson', description: 'Ares expedition hull coat', value: '#991b1b', price: 500, swatchHex: '#991b1b' },
  { id: 'hull-silver', category: 'hull', label: 'Titanium Silver', description: 'Machined cryo-tank alloy', value: '#94a3b8', price: 650, swatchHex: '#94a3b8' },
  { id: 'hull-obsidian', category: 'hull', label: 'Mercury Obsidian', description: 'Rare heat-shielded carbon black', value: '#111827', price: 0, rarePlanet: 'mercury', swatchHex: '#111827' },
  { id: 'hull-gold', category: 'hull', label: 'Solar Sovereign Gold', description: 'Rare reflective gold plating', value: '#ca8a04', price: 0, rarePlanet: 'venus', swatchHex: '#ca8a04' },

  // Accent Colors
  { id: 'acc-amber', category: 'accent', label: 'Launch Amber', description: 'High-visibility gantry orange', value: '#ea580c', price: 0, swatchHex: '#ea580c' },
  { id: 'acc-cyan', category: 'accent', label: 'Telemetry Cyan', description: 'Deep-space optical blue', value: '#0284c7', price: 0, swatchHex: '#0284c7' },
  { id: 'acc-emerald', category: 'accent', label: 'Signal Emerald', description: 'Bio-telemetry green stripe', value: '#10b981', price: 400, swatchHex: '#10b981' },
  { id: 'acc-crimson', category: 'accent', label: 'Solar Crimson', description: 'High-contrast abort red', value: '#ef4444', price: 450, swatchHex: '#ef4444' },
  { id: 'acc-violet', category: 'accent', label: 'Ion Violet', description: 'Deep-space plasma trim', value: '#8b5cf6', price: 600, swatchHex: '#8b5cf6' },

  // Boosters
  { id: 'bst-none', category: 'booster', label: 'Single Core', description: 'Clean central L110 core', value: 'none', price: 0 },
  { id: 'bst-twin', category: 'booster', label: 'Twin S200', description: 'Dual solid strap-on boosters', value: 'twin', price: 0 },
  { id: 'bst-quad', category: 'booster', label: 'Quad Heavy', description: '4-booster orbital heavy stack', value: 'quad', price: 1100 },
  { id: 'bst-heavy6', category: 'booster', label: 'Hexa Super-Heavy', description: 'Rare 6-booster Titan launch ring', value: 'heavy6', price: 0, rarePlanet: 'titan' },

  // Fairings
  { id: 'fair-ogive', category: 'fairing', label: 'Ogive Standard', description: 'Balanced aerodynamic clamshell', value: 'ogive', price: 0 },
  { id: 'fair-hammerhead', category: 'fairing', label: 'Hammerhead', description: 'Wide-volume rover payload bay', value: 'hammerhead', price: 750 },
  { id: 'fair-needle', category: 'fairing', label: 'Needle Supersonic', description: 'Low-drag spire fairing', value: 'needle', price: 850 },
  { id: 'fair-shield', category: 'fairing', label: 'Aeroshell Shield', description: 'Rare reinforced Mars entry fairing', value: 'shield', price: 0, rarePlanet: 'mars' },

  // Lander Foils
  { id: 'foil-gold', category: 'foil', label: 'Gold MLI', description: 'Kapton thermal blanket', value: 'gold', price: 0 },
  { id: 'foil-silver', category: 'foil', label: 'Silver Thermal', description: 'High-albedo lunar foil', value: 'silver', price: 550 },
  { id: 'foil-copper', category: 'foil', label: 'Copper Kapton', description: 'Thermal-conductive alloy wrap', value: 'copper', price: 650 },
  { id: 'foil-obsidian', category: 'foil', label: 'Lunar Basalt Chrome', description: 'Rare vacuum-hardened alloy foil', value: 'obsidian', price: 0, rarePlanet: 'moon' },

  // Plumes
  { id: 'plume-amber', category: 'plume', label: 'Amber Kerolox', description: 'Classic RP-1 hydrocarbon exhaust', value: 'amber', price: 0 },
  { id: 'plume-cryo', category: 'plume', label: 'Cyan Cryo', description: 'Clean LOX/LH2 vacuum glow', value: 'cryo', price: 700 },
  { id: 'plume-violet', category: 'plume', label: 'Violet Plasma', description: 'High-Isp hall-thruster plume', value: 'violet', price: 950 },
  { id: 'plume-emerald', category: 'plume', label: 'Europa Emerald Ion', description: 'Rare hyper-ionized xenon beam', value: 'emerald', price: 0, rarePlanet: 'europa' },
];

export const INITIAL_UNLOCKED_IDS = CATALOG_ITEMS.filter((i) => i.price === 0 && !i.rarePlanet).map((i) => i.id);

export interface DestinationConfig {
  id: DestinationId;
  name: string;
  subtitle: string;
  distanceLabel: string;
  orbitTargetKm: number;
  targetEscapeSpeed: number;
  gravityMps2: number;
  surfaceTemp: string;
  atmosphereLabel: string;
  difficulty: 'Standard' | 'Moderate' | 'Challenging';
  accentHex: string;
  planetColorHex: string;
  skyHex: string;
  fogHex: string;
  groundPrimaryHex: string;
  groundSecondaryHex: string;
  rockHex: string;
  dustHex: string;
  nasaSummary: string;
  samples: ScienceSample[];
  rareSample: ScienceSample;
}

export const DESTINATIONS: Record<DestinationId, DestinationConfig> = {
  moon: {
    id: 'moon',
    name: 'The Moon',
    subtitle: 'Mare Tranquillitatis Crater Field',
    distanceLabel: '384,400 km',
    orbitTargetKm: 170,
    targetEscapeSpeed: 6400,
    gravityMps2: 1.62,
    surfaceTemp: '-130°C to +120°C',
    atmosphereLabel: 'Exosphere (Vacuum)',
    difficulty: 'Standard',
    accentHex: '#38bdf8',
    planetColorHex: '#8c929c',
    skyHex: '#020409',
    fogHex: '#0c1018',
    groundPrimaryHex: '#8d929b',
    groundSecondaryHex: '#525760',
    rockHex: '#434852',
    dustHex: '#9ca3af',
    nasaSummary:
      'NASA LRO elevation data reveals grey basaltic maria pocked by impact crater holes, dark mare spots, and bright highland regolith.',
    samples: [
      { id: 'm1', title: 'Ilmenite Basalt Core', x: 36, z: -26, reading: 'TiO₂ 11.4% · Age 3.6 Gyr', points: 400, creditReward: 450 },
      { id: 'm2', title: 'Highland Anorthosite', x: -46, z: 32, reading: 'CaAl₂Si₂O₈ 88% · Regolith', points: 450, creditReward: 500 },
      { id: 'm3', title: 'Shadowed Crater Frost', x: 24, z: 54, reading: 'H₂O Ice Trace 2.1 wt%', points: 600, creditReward: 600 },
    ],
    rareSample: {
      id: 'm-rare',
      title: 'Apollo-Era Titanium Geode',
      x: -88,
      z: -74,
      reading: 'Rare Vacuum Basalt Chrome Crystal',
      points: 1500,
      creditReward: 1500,
      isRare: true,
      unlocksItemId: 'foil-obsidian',
    },
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    subtitle: 'Jezero Crater Red-Orange Delta',
    distanceLabel: '225M km avg',
    orbitTargetKm: 190,
    targetEscapeSpeed: 7100,
    gravityMps2: 3.72,
    surfaceTemp: '-63°C mean',
    atmosphereLabel: '0.006 atm (CO₂)',
    difficulty: 'Standard',
    accentHex: '#f97316',
    planetColorHex: '#d95326',
    skyHex: '#d47448',
    fogHex: '#c46238',
    groundPrimaryHex: '#d65c2b',
    groundSecondaryHex: '#8f2d14',
    rockHex: '#5e2314',
    dustHex: '#ea7b46',
    nasaSummary:
      'NASA Perseverance & MRO orbital altimetry map vivid red and burnt-orange iron-oxide dust dunes, ancient river-delta terraces, and basalt boulders.',
    samples: [
      { id: 'ma1', title: 'Jezero Mudstone Silt', x: 42, z: 24, reading: 'Phyllosilicate Clay · Ancient Lakebed', points: 500, creditReward: 500 },
      { id: 'ma2', title: 'Olivine Cumulate Outcrop', x: -50, z: -28, reading: 'Mg₂SiO₄ Rich · Igneous Floor', points: 450, creditReward: 500 },
      { id: 'ma3', title: 'Carbonate Rim Vein', x: 18, z: -56, reading: 'Biosignature Matrix', points: 650, creditReward: 650 },
    ],
    rareSample: {
      id: 'ma-rare',
      title: 'Hematite Blueberry Cluster',
      x: 94,
      z: -76,
      reading: 'Pure Martian Iron-Oxide Relic',
      points: 1600,
      creditReward: 1600,
      isRare: true,
      unlocksItemId: 'fair-shield',
    },
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    subtitle: 'Caloris Basin Lobate Scarp',
    distanceLabel: '91M km avg',
    orbitTargetKm: 195,
    targetEscapeSpeed: 7300,
    gravityMps2: 3.7,
    surfaceTemp: '-180°C to +430°C',
    atmosphereLabel: 'Surface-Bound Exosphere',
    difficulty: 'Moderate',
    accentHex: '#a8a29e',
    planetColorHex: '#6e6863',
    skyHex: '#020307',
    fogHex: '#181615',
    groundPrimaryHex: '#635d58',
    groundSecondaryHex: '#3f3a36',
    rockHex: '#2c2825',
    dustHex: '#877f78',
    nasaSummary:
      'NASA MESSENGER laser altimetry reveals heavily cratered dark silicate crust crossed by tall tectonic thrust scarps and graphite-rich hollows.',
    samples: [
      { id: 'me1', title: 'Low-Reflectance Graphite', x: -38, z: 36, reading: 'Carbon 3.2% · Magma Ocean', points: 550, creditReward: 550 },
      { id: 'me2', title: 'Sulfide Hollows Crust', x: 48, z: -18, reading: 'CaS / MgS Volatile Pit', points: 500, creditReward: 550 },
      { id: 'me3', title: 'Iron-Core Scarp Fault', x: -16, z: -52, reading: 'High Metallic Density Anomaly', points: 650, creditReward: 700 },
    ],
    rareSample: {
      id: 'me-rare',
      title: 'Solar-Forged Obsidian Core',
      x: -96,
      z: 68,
      reading: 'Extreme Thermal Carbon Composite',
      points: 1700,
      creditReward: 1700,
      isRare: true,
      unlocksItemId: 'hull-obsidian',
    },
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    subtitle: 'Aphrodite Terra Volcanic Plain',
    distanceLabel: '41M km closest',
    orbitTargetKm: 185,
    targetEscapeSpeed: 6900,
    gravityMps2: 8.87,
    surfaceTemp: '+464°C',
    atmosphereLabel: '92 atm (Dense CO₂)',
    difficulty: 'Moderate',
    accentHex: '#fbbf24',
    planetColorHex: '#d99b38',
    skyHex: '#c9882c',
    fogHex: '#b87624',
    groundPrimaryHex: '#a87129',
    groundSecondaryHex: '#6b4517',
    rockHex: '#473014',
    dustHex: '#d4953b',
    nasaSummary:
      'NASA Magellan radar altimetry maps fractured ochre basalt plains, volcanic pancake domes, and thick golden sulfuric cloud haze.',
    samples: [
      { id: 'v1', title: 'Tessera Basalt Slab', x: 35, z: -38, reading: '92 bar · High-Temp Pyroxene', points: 550, creditReward: 600 },
      { id: 'v2', title: 'Volcanic Pancake Dome', x: -45, z: 22, reading: 'Viscous Silica Lava Flow', points: 600, creditReward: 650 },
      { id: 'v3', title: 'Sulfuric Weathering Crust', x: 14, z: 50, reading: 'FeS₂ Pyrite Signature', points: 650, creditReward: 700 },
    ],
    rareSample: {
      id: 'v-rare',
      title: 'Golden Pyrite Magma Vein',
      x: 82,
      z: 84,
      reading: 'Rare High-Pressure Gold Alloy',
      points: 1800,
      creditReward: 1800,
      isRare: true,
      unlocksItemId: 'hull-gold',
    },
  },
  titan: {
    id: 'titan',
    name: 'Saturn · Titan',
    subtitle: 'Xanadu Methane Shoreline',
    distanceLabel: '1.4B km',
    orbitTargetKm: 210,
    targetEscapeSpeed: 7600,
    gravityMps2: 1.35,
    surfaceTemp: '-179°C',
    atmosphereLabel: '1.45 atm (N₂ + CH₄)',
    difficulty: 'Challenging',
    accentHex: '#eab308',
    planetColorHex: '#ca8a04',
    skyHex: '#b56e28',
    fogHex: '#9c5c1f',
    groundPrimaryHex: '#945a25',
    groundSecondaryHex: '#593618',
    rockHex: '#6b5344',
    dustHex: '#c4833b',
    nasaSummary:
      'NASA Cassini-Huygens data reveals rounded water-ice cobbles, organic tholin dunes, and dark hydrocarbon basins under golden nitrogen haze.',
    samples: [
      { id: 't1', title: 'Cryogenic Water-Ice Cobble', x: 40, z: 30, reading: 'Bedrock Hardness · -179°C H₂O', points: 650, creditReward: 700 },
      { id: 't2', title: 'Tholin Hydrocarbon Dune', x: -42, z: -32, reading: 'Complex Organic Aerosol Polymer', points: 700, creditReward: 750 },
      { id: 't3', title: 'Ethane-Methane Brine Edge', x: 16, z: -50, reading: 'CH₄ 72% · C₂H₆ 28% Pool', points: 800, creditReward: 850 },
    ],
    rareSample: {
      id: 't-rare',
      title: 'Cryo-Hydrocarbon Core Crystal',
      x: -102,
      z: -62,
      reading: 'Super-Heavy Cryo Propellant Catalyst',
      points: 2000,
      creditReward: 2000,
      isRare: true,
      unlocksItemId: 'bst-heavy6',
    },
  },
  europa: {
    id: 'europa',
    name: 'Jupiter · Europa',
    subtitle: 'Conamara Chaos Ice Lineae',
    distanceLabel: '628M km',
    orbitTargetKm: 220,
    targetEscapeSpeed: 7800,
    gravityMps2: 1.31,
    surfaceTemp: '-171°C',
    atmosphereLabel: 'Tenuous O₂ Exosphere',
    difficulty: 'Challenging',
    accentHex: '#60a5fa',
    planetColorHex: '#cbd5e1',
    skyHex: '#03060f',
    fogHex: '#182436',
    groundPrimaryHex: '#dce6f2',
    groundSecondaryHex: '#8d533d',
    rockHex: '#7c4533',
    dustHex: '#e2e8f0',
    nasaSummary:
      'NASA Galileo & Europa Clipper models reveal a bright fractured water-ice shell laced with reddish hydrated salt ridges beneath Jupiter.',
    samples: [
      { id: 'e1', title: 'Reddish Salt Lineae Ridge', x: 36, z: -34, reading: 'NaCl + MgSO₄ Subsurface Upwelling', points: 750, creditReward: 800 },
      { id: 'e2', title: 'Chaos Terrain Ice Block', x: -48, z: 24, reading: 'Fresh Crystalline Water Ice', points: 700, creditReward: 750 },
      { id: 'e3', title: 'Sub-Ice Plume Vent', x: 20, z: 52, reading: 'H₂O Vapor · Organic Trace Detect', points: 900, creditReward: 950 },
    ],
    rareSample: {
      id: 'e-rare',
      title: 'Subsurface Ionized Xenon Plume',
      x: 92,
      z: 74,
      reading: 'Rare Emerald Ion Propulsion Matrix',
      points: 2200,
      creditReward: 2200,
      isRare: true,
      unlocksItemId: 'plume-emerald',
    },
  },
};

export type MissionPhase =
  | 'pad'
  | 'liftoff'
  | 'max-q'
  | 'booster-sep'
  | 'karman'
  | 'orbital-burn'
  | 'orbit-achieved';

export interface FlightTelemetry {
  launched: boolean;
  paused: boolean;
  altitudeKm: number;
  verticalSpeed: number;
  horizontalSpeed: number;
  totalSpeed: number;
  mach: number;
  accelMps2: number;
  gForce: number;
  pitchDeg: number;
  targetPitchDeg: number;
  yawDeg: number;
  throttle: number;
  stageIndex: number;
  stageName: string;
  stageFuelPct: number;
  totalFuelPct: number;
  engineTempC: number;
  stabilityPct: number;
  dynamicPressureKpa: number;
  atmosphereLayer: string;
  phase: MissionPhase;
  missionElapsedSec: number;
  score: number;
  stageReadyToSeparate: boolean;
  autoStageCountdown: number | null;
  fairingJettisoned: boolean;
  orbitAchieved: boolean;
  orbitProgressPct: number;
  guidanceText: string;
  peakG: number;
  maxSpeed: number;
  manualStagesDone: number;
}

export interface RolloutTelemetry {
  progressPct: number;
  distanceMeters: number;
  speedKmh: number;
  statusLabel: string;
}

export interface TransitTelemetry {
  progressPct: number;
  phaseLabel: string;
  distanceRemainingLabel: string;
  velocityKms: number;
}

export interface LandingTelemetry {
  altitudeMeters: number;
  verticalSpeed: number;
  horizontalSpeed: number;
  distFromSafeCenter: number;
  inSafeZone: boolean;
  safeRadiusMeters: number;
  fuelPct: number;
  throttle: number;
  touchdown: boolean;
  safeLanding: boolean;
  guidanceText: string;
}

export interface RoverTelemetry {
  speedMps: number;
  headingDeg: number;
  distanceTraveledM: number;
  batteryPct: number;
  samplesCollected: string[];
  nearbySample: ScienceSample | null;
  lastScanMessage: string | null;
  slopeDeg: number;
  rareSampleDistanceM: number | null;
  rareSampleBearingDeg: number | null;
  rareFound: boolean;
}

export interface MissionFailureState {
  phase: 'landing' | 'rover';
  title: string;
  reason: string;
}
