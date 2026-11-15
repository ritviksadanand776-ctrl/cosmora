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
export type BoosterStyle = 'twin' | 'quad' | 'none';
export type FairingStyle = 'ogive' | 'hammerhead' | 'needle';
export type LanderFinish = 'gold' | 'silver' | 'copper';
export type PlumeStyle = 'amber' | 'cryo' | 'violet';

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
}

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
}

export const DESTINATIONS: Record<DestinationId, DestinationConfig> = {
  moon: {
    id: 'moon',
    name: 'The Moon',
    subtitle: 'Mare Tranquillitatis Highland Rim',
    distanceLabel: '384,400 km',
    orbitTargetKm: 170,
    targetEscapeSpeed: 6400,
    gravityMps2: 1.62,
    surfaceTemp: '-130°C to +120°C',
    atmosphereLabel: 'Exosphere (Vacuum)',
    difficulty: 'Standard',
    accentHex: '#38bdf8',
    planetColorHex: '#94a3b8',
    skyHex: '#02040a',
    fogHex: '#10141d',
    groundPrimaryHex: '#7f858f',
    groundSecondaryHex: '#595e66',
    rockHex: '#4b5059',
    dustHex: '#9ca3af',
    nasaSummary:
      'NASA LRO elevation data reveals ancient basaltic maria ringed by impact craters and bright anorthositic highland regolith.',
    samples: [
      { id: 'm1', title: 'Ilmenite Basalt Core', x: 38, z: -26, reading: 'TiO₂ 11.4% · Age 3.6 Gyr', points: 400 },
      { id: 'm2', title: 'Highland Anorthosite', x: -46, z: 32, reading: 'CaAl₂Si₂O₈ 88% · Regolith', points: 450 },
      { id: 'm3', title: 'Permanently Shadowed Frost', x: 22, z: 54, reading: 'H₂O Ice Trace 2.1 wt%', points: 600 },
    ],
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    subtitle: 'Jezero Crater Ancient Delta',
    distanceLabel: '225M km avg',
    orbitTargetKm: 190,
    targetEscapeSpeed: 7100,
    gravityMps2: 3.72,
    surfaceTemp: '-63°C mean',
    atmosphereLabel: '0.006 atm (CO₂)',
    difficulty: 'Standard',
    accentHex: '#f59e0b',
    planetColorHex: '#c2572d',
    skyHex: '#c97b54',
    fogHex: '#b86c48',
    groundPrimaryHex: '#b55430',
    groundSecondaryHex: '#7d3921',
    rockHex: '#5c2c1c',
    dustHex: '#d97746',
    nasaSummary:
      'NASA Perseverance & MRO orbital altimetry map iron-oxide dust plains, layered river-delta sediments, and wind-scoured basalt.',
    samples: [
      { id: 'ma1', title: 'Jezero Mudstone Silt', x: 42, z: 24, reading: 'Phyllosilicate Clay · Ancient Lakebed', points: 500 },
      { id: 'ma2', title: 'Olivine Cumulate Outcrop', x: -50, z: -28, reading: 'Mg₂SiO₄ Rich · Igneous Floor', points: 450 },
      { id: 'ma3', title: 'Carbonate Rim Vein', x: 18, z: -56, reading: 'Biosignature Preservation Matrix', points: 650 },
    ],
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
    planetColorHex: '#78716c',
    skyHex: '#020307',
    fogHex: '#181615',
    groundPrimaryHex: '#635d58',
    groundSecondaryHex: '#45403c',
    rockHex: '#332f2c',
    dustHex: '#877f78',
    nasaSummary:
      'NASA MESSENGER laser altimetry reveals heavily cratered dark silicate crust crossed by tall tectonic thrust scarps.',
    samples: [
      { id: 'me1', title: 'Low-Reflectance Graphite', x: -38, z: 36, reading: 'Carbon 3.2% · Ancient Magma Ocean', points: 550 },
      { id: 'me2', title: 'Sulfide Hollows Crust', x: 48, z: -18, reading: 'CaS / MgS Volatile Pit', points: 500 },
      { id: 'me3', title: 'Iron-Core Scarp Fault', x: -16, z: -52, reading: 'High Metallic Density Anomaly', points: 650 },
    ],
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
    groundPrimaryHex: '#9e6b29',
    groundSecondaryHex: '#6b471b',
    rockHex: '#473014',
    dustHex: '#d4953b',
    nasaSummary:
      'NASA Magellan radar altimetry shows fractured basaltic plains, volcanic pancake domes, and thick golden sulfuric cloud haze.',
    samples: [
      { id: 'v1', title: 'Tessera Basalt Slab', x: 35, z: -38, reading: '92 bar · High-Temp Pyroxene', points: 550 },
      { id: 'v2', title: 'Volcanic Pancake Dome', x: -45, z: 22, reading: 'Viscous Silica Lava Flow', points: 600 },
      { id: 'v3', title: 'Sulfuric Weathering Crust', x: 14, z: 50, reading: 'FeS₂ Pyrite Signature', points: 650 },
    ],
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
    groundPrimaryHex: '#8a5526',
    groundSecondaryHex: '#593618',
    rockHex: '#6b5344',
    dustHex: '#c4833b',
    nasaSummary:
      'NASA Cassini-Huygens data reveals rounded water-ice cobbles, organic tholin dunes, and liquid methane flats under golden haze.',
    samples: [
      { id: 't1', title: 'Cryogenic Water-Ice Cobble', x: 40, z: 30, reading: 'Bedrock Hardness · -179°C H₂O', points: 650 },
      { id: 't2', title: 'Tholin Hydrocarbon Dune', x: -42, z: -32, reading: 'Complex Organic Aerosol Polymer', points: 700 },
      { id: 't3', title: 'Ethane-Methane Brine Edge', x: 16, z: -50, reading: 'CH₄ 72% · C₂H₆ 28% Pool', points: 800 },
    ],
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
    groundPrimaryHex: '#cbd5e1',
    groundSecondaryHex: '#94a3b8',
    rockHex: '#7c4533',
    dustHex: '#e2e8f0',
    nasaSummary:
      'NASA Galileo & Europa Clipper models reveal a bright fractured water-ice shell laced with reddish hydrated salt ridges beneath Jupiter.',
    samples: [
      { id: 'e1', title: 'Reddish Salt Lineae Ridge', x: 36, z: -34, reading: 'NaCl + MgSO₄ Subsurface Upwelling', points: 750 },
      { id: 'e2', title: 'Chaos Terrain Ice Block', x: -48, z: 24, reading: 'Fresh Crystalline Water Ice', points: 700 },
      { id: 'e3', title: 'Sub-Ice Plume Vent', x: 20, z: 52, reading: 'H₂O Vapor · Organic Trace Detect', points: 900 },
    ],
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
  progressPct: number; // 0 -> 100
  distanceMeters: number;
  speedKmh: number;
  statusLabel: string;
}

export interface TransitTelemetry {
  progressPct: number; // 0 -> 100
  phaseLabel: string;
  distanceRemainingLabel: string;
  velocityKms: number;
}

export interface LandingTelemetry {
  altitudeMeters: number;
  verticalSpeed: number; // m/s (negative = descending)
  horizontalSpeed: number;
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
}
