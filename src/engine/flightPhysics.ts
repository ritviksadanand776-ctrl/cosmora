import { DESTINATIONS, DestinationId, FlightMode, FlightTelemetry, MissionPhase } from '../types/mission';

export const WORLD_UNITS_PER_KM = 16;

export interface StageSpec {
  name: string;
  thrustAccelBase: number; // m/s^2 at full fuel
  thrustAccelEmpty: number; // m/s^2 as fuel depletes (Tsiolkovsky feel)
  burnDurationSec: number;
  dragFactor: number;
}

export const STAGE_SPECS: StageSpec[] = [
  {
    name: 'Stage 1 · Twin S200 Boosters + Core',
    thrustAccelBase: 30.0, // ~3.0G liftoff thrust => crisp pad clearance
    thrustAccelEmpty: 48.0,
    burnDurationSec: 18,
    dragFactor: 1.0,
  },
  {
    name: 'Stage 2 · L110 Core Sustainer',
    thrustAccelBase: 38.0,
    thrustAccelEmpty: 66.0,
    burnDurationSec: 20,
    dragFactor: 0.7,
  },
  {
    name: 'Stage 3 · C25 Cryogenic Upper',
    thrustAccelBase: 48.0,
    thrustAccelEmpty: 86.0,
    burnDurationSec: 36, // Plenty of reserve fuel past 200 km orbit
    dragFactor: 0.4,
  },
];

export interface FlightInput {
  pitchUp: boolean; // S / ArrowDown -> pitch toward vertical (0 deg)
  pitchDown: boolean; // W / ArrowUp -> pitch downrange toward horizon (90 deg)
  yawLeft: boolean; // A / ArrowLeft
  yawRight: boolean; // D / ArrowRight
}

export class FlightPhysicsEngine {
  public launched = false;
  public paused = false;
  public destinationId: DestinationId = 'mars';
  public flightMode: FlightMode = 'assisted';
  public autoStageAssist = true;

  public altitudeKm = 0;
  public downrangeKm = 0;
  public lateralKm = 0;

  public verticalSpeed = 0; // m/s
  public horizontalSpeed = 0; // m/s
  public lateralSpeed = 0; // m/s

  public pitchDeg = 0; // 0 = straight up, 90 = horizontal orbit
  public yawDeg = 0;
  public pitchInputSmooth = 0; // -1..1 for gimbal nozzle animation
  public yawInputSmooth = 0;

  public throttle = 1.0;
  public stageIndex = 0;
  public stageFuels = [1.0, 1.0, 1.0];
  public stageDepletedTimer = 0;
  public fairingJettisoned = false;

  public engineTempC = 28;
  public accelMps2 = 0;
  public dynamicPressureKpa = 0;
  public missionElapsedSec = 0;
  public score = 0;
  public peakG = 1.0;
  public maxSpeed = 0;
  public manualStagesDone = 0;
  public orbitAchieved = false;
  public karmanAwarded = false;

  // Callbacks to trigger 3D visual separation events
  public onStageSeparate?: (separatedStageIndex: number) => void;
  public onFairingJettison?: () => void;
  public onOrbitAchieved?: () => void;

  public reset(destinationId?: DestinationId): void {
    if (destinationId) this.destinationId = destinationId;
    this.launched = false;
    this.paused = false;
    this.altitudeKm = 0;
    this.downrangeKm = 0;
    this.lateralKm = 0;
    this.verticalSpeed = 0;
    this.horizontalSpeed = 0;
    this.lateralSpeed = 0;
    this.pitchDeg = 0;
    this.yawDeg = 0;
    this.pitchInputSmooth = 0;
    this.yawInputSmooth = 0;
    this.throttle = 1.0;
    this.stageIndex = 0;
    this.stageFuels = [1.0, 1.0, 1.0];
    this.stageDepletedTimer = 0;
    this.fairingJettisoned = false;
    this.engineTempC = 28;
    this.accelMps2 = 0;
    this.dynamicPressureKpa = 0;
    this.missionElapsedSec = 0;
    this.score = 0;
    this.peakG = 1.0;
    this.maxSpeed = 0;
    this.manualStagesDone = 0;
    this.orbitAchieved = false;
    this.karmanAwarded = false;
  }

  public igniteAndLaunch(): void {
    if (!this.launched) {
      this.launched = true;
      if (this.throttle < 0.5) this.throttle = 1.0;
    }
  }

  public separateStage(manual = true): boolean {
    if (!this.launched) return false;
    if (this.stageIndex >= 2) return false;

    const currentFuel = this.stageFuels[this.stageIndex];
    // Allow separating anytime after 2.5s of burn or when empty
    if (currentFuel > 0.82 && this.missionElapsedSec < 3.0) return false;

    const separated = this.stageIndex;
    this.stageIndex += 1;
    this.stageDepletedTimer = 0;

    if (manual) {
      this.manualStagesDone += 1;
      // Bonus points for clean near-empty manual staging
      this.score += currentFuel < 0.08 ? 450 : 250;
    } else {
      this.score += 150;
    }

    this.onStageSeparate?.(separated);
    return true;
  }

  public getTargetPitchDeg(altKm: number): number {
    if (altKm < 1.8) return 0;
    if (altKm < 12) return ((altKm - 1.8) / 10.2) * 20;
    if (altKm < 45) return 20 + ((altKm - 12) / 33) * 34;
    if (altKm < 110) return 54 + ((altKm - 45) / 65) * 24;
    return Math.min(88, 78 + ((altKm - 110) / 90) * 10);
  }

  public getAtmosphereDensityFactor(altKm: number): number {
    // Exponential scale height ~9.5 km
    if (altKm > 110) return 0;
    return Math.exp(-altKm / 9.5);
  }

  public getAtmosphereLayer(altKm: number): string {
    if (altKm < 12) return 'TROPOSPHERE';
    if (altKm < 50) return 'STRATOSPHERE';
    if (altKm < 85) return 'MESOSPHERE';
    if (altKm < 100) return 'THERMOSPHERE';
    if (altKm < 180) return 'KARMAN SPACE';
    return 'LOW EARTH ORBIT';
  }

  public step(dt: number, input: FlightInput): void {
    if (this.paused) return;
    const clampedDt = Math.min(dt, 0.05);

    if (!this.launched) {
      this.engineTempC = 28 + Math.sin(performance.now() * 0.002) * 0.5;
      return;
    }

    this.missionElapsedSec += clampedDt;
    const spec = STAGE_SPECS[this.stageIndex];
    const fuel = this.stageFuels[this.stageIndex];
    const hasFuel = fuel > 0.0001;

    // 1. Steering & Gravity Turn Control
    const manualPitchRate = this.flightMode === 'assisted' ? 34 : 38;
    let rawPitchCmd = 0;
    if (input.pitchDown) rawPitchCmd += 1; // Pitch downrange toward 90 deg
    if (input.pitchUp) rawPitchCmd -= 1; // Pitch back toward vertical 0 deg

    let rawYawCmd = 0;
    if (input.yawRight) rawYawCmd += 1;
    if (input.yawLeft) rawYawCmd -= 1;

    this.pitchInputSmooth += (rawPitchCmd - this.pitchInputSmooth) * Math.min(1, clampedDt * 12);
    this.yawInputSmooth += (rawYawCmd - this.yawInputSmooth) * Math.min(1, clampedDt * 12);

    const targetPitch = this.getTargetPitchDeg(this.altitudeKm);

    if (rawPitchCmd !== 0) {
      this.pitchDeg += rawPitchCmd * manualPitchRate * clampedDt;
    } else if (this.flightMode === 'assisted' && this.altitudeKm > 1.5 && !this.orbitAchieved) {
      // Gentle SAS gravity-turn guidance toward optimal ascent arc
      const diff = targetPitch - this.pitchDeg;
      const assistRate = this.altitudeKm < 6 ? 1.4 : 0.85;
      this.pitchDeg += diff * Math.min(1, clampedDt * assistRate);
    }

    // Prevent diving nose-down into the ground during ascent
    const maxAllowedPitch = this.altitudeKm < 2 ? 12 : this.altitudeKm < 15 ? 65 : 98;
    this.pitchDeg = Math.max(-10, Math.min(maxAllowedPitch, this.pitchDeg));

    this.yawDeg += rawYawCmd * 26 * clampedDt;
    if (rawYawCmd === 0 && this.flightMode === 'assisted') {
      this.yawDeg += (0 - this.yawDeg) * Math.min(1, clampedDt * 1.5);
    }
    this.yawDeg = Math.max(-35, Math.min(35, this.yawDeg));

    // 2. Fuel Consumption & Thrust
    const activeThrottle = hasFuel ? this.throttle : 0;
    if (hasFuel && activeThrottle > 0) {
      const burnRate = (1 / spec.burnDurationSec) * (0.15 + 0.85 * activeThrottle);
      this.stageFuels[this.stageIndex] = Math.max(0, fuel - burnRate * clampedDt);
    }

    // Auto-stage assist if current stage depleted
    if (this.stageFuels[this.stageIndex] <= 0.0001 && this.stageIndex < 2) {
      this.stageDepletedTimer += clampedDt;
      if (this.autoStageAssist && this.flightMode === 'assisted' && this.stageDepletedTimer >= 1.4) {
        this.separateStage(false);
      }
    } else {
      this.stageDepletedTimer = 0;
    }

    // 3. Rocket Equation Acceleration + Gravity + Forgiving Atmospheric Drag
    const fuelUsedFrac = 1 - this.stageFuels[this.stageIndex];
    const thrustAccel =
      activeThrottle *
      (spec.thrustAccelBase + (spec.thrustAccelEmpty - spec.thrustAccelBase) * fuelUsedFrac);

    const pitchRad = (this.pitchDeg * Math.PI) / 180;
    const yawRad = (this.yawDeg * Math.PI) / 180;

    // Direction unit vector: 0 deg = +Y (vertical), 90 deg = +X (downrange)
    const dirY = Math.cos(pitchRad);
    const dirHoriz = Math.sin(pitchRad);
    const dirX = dirHoriz * Math.cos(yawRad);
    const dirZ = dirHoriz * Math.sin(yawRad);

    // Effective gravity decreases with altitude + centrifugal relief at high horizontal orbital speed
    const earthRadiusKm = 6371;
    const altFactor = Math.pow(earthRadiusKm / (earthRadiusKm + this.altitudeKm), 2);
    const orbitalSpeedRef = 7600;
    const centrifugalRelief = Math.min(0.95, Math.pow(this.horizontalSpeed / orbitalSpeedRef, 2));
    const gravityAccel = 9.81 * altFactor * (1 - centrifugalRelief);

    // Aerodynamic drag & dynamic pressure (Max-Q)
    const airDensity = this.getAtmosphereDensityFactor(this.altitudeKm);
    const totalSpeed = Math.hypot(this.verticalSpeed, this.horizontalSpeed, this.lateralSpeed);
    const dragCoeff = this.flightMode === 'assisted' ? 0.000016 : 0.000028;
    const dragAccel = airDensity * totalSpeed * totalSpeed * dragCoeff * spec.dragFactor;
    this.dynamicPressureKpa = 0.5 * 1.225 * airDensity * totalSpeed * totalSpeed * 0.001;

    const dragY = totalSpeed > 0.1 ? (this.verticalSpeed / totalSpeed) * dragAccel : 0;
    const dragX = totalSpeed > 0.1 ? (this.horizontalSpeed / totalSpeed) * dragAccel : 0;
    const dragZ = totalSpeed > 0.1 ? (this.lateralSpeed / totalSpeed) * dragAccel : 0;

    // Boost horizontal orbital acceleration smoothly once above dense troposphere so orbital insertion feels crisp
    const upperAccelMultiplier = this.altitudeKm > 50 ? 1.55 : this.altitudeKm > 20 ? 1.25 : 1.0;

    const netAy = thrustAccel * upperAccelMultiplier * dirY - gravityAccel - dragY;
    const netAx = thrustAccel * upperAccelMultiplier * 1.45 * dirX - dragX;
    const netAz = thrustAccel * dirZ - dragZ;

    this.verticalSpeed += netAy * clampedDt;
    this.horizontalSpeed += netAx * clampedDt;
    this.lateralSpeed += netAz * clampedDt;

    // Soft ground contact safety
    if (this.altitudeKm <= 0 && this.verticalSpeed < 0) {
      this.verticalSpeed = 0;
      this.altitudeKm = 0;
    }

    // Integrate positions (crisp pacing so 200 km orbital escape takes ~55-65s)
    const simTimeScale = 2.0;
    this.altitudeKm = Math.max(0, this.altitudeKm + (this.verticalSpeed * clampedDt * simTimeScale) / 1000);
    this.downrangeKm += (this.horizontalSpeed * clampedDt * simTimeScale) / 1000;
    this.lateralKm += (this.lateralSpeed * clampedDt * simTimeScale) / 1000;

    // Telemetry metrics
    this.accelMps2 = thrustAccel * upperAccelMultiplier;
    const currentG = Math.max(0, (thrustAccel * upperAccelMultiplier) / 9.81);
    if (currentG > this.peakG) this.peakG = currentG;

    const newTotalSpeed = Math.hypot(this.verticalSpeed, this.horizontalSpeed, this.lateralSpeed);
    if (newTotalSpeed > this.maxSpeed) this.maxSpeed = newTotalSpeed;

    // Engine thermal model
    const targetTemp = activeThrottle > 0 ? 520 + activeThrottle * 640 + (this.stageIndex === 0 ? 140 : 0) : 110;
    this.engineTempC += (targetTemp - this.engineTempC) * Math.min(1, clampedDt * 2.5);

    // Milestones
    if (!this.fairingJettisoned && this.altitudeKm >= 95) {
      this.fairingJettisoned = true;
      this.score += 500;
      this.onFairingJettison?.();
    }

    if (!this.karmanAwarded && this.altitudeKm >= 100) {
      this.karmanAwarded = true;
      this.score += 750;
    }

    // Score ticks upward as we gain altitude & speed
    if (!this.orbitAchieved && activeThrottle > 0) {
      this.score += Math.floor(clampedDt * 25);
    }

    // Check Earth Escape / Orbit Achievement
    const dest = DESTINATIONS[this.destinationId];
    const altProgress = Math.min(1, this.altitudeKm / dest.orbitTargetKm);
    const speedProgress = Math.min(1, newTotalSpeed / dest.targetEscapeSpeed);
    const combinedProgress = altProgress * 0.65 + speedProgress * 0.35;

    if (!this.orbitAchieved && (this.altitudeKm >= dest.orbitTargetKm || (altProgress >= 0.9 && combinedProgress >= 0.95))) {
      this.orbitAchieved = true;
      this.score += 2500;
      this.onOrbitAchieved?.();
    }
  }

  public getTelemetry(): FlightTelemetry {
    const dest = DESTINATIONS[this.destinationId];
    const spec = STAGE_SPECS[this.stageIndex];
    const totalSpeed = Math.hypot(this.verticalSpeed, this.horizontalSpeed, this.lateralSpeed);
    const speedOfSound = 295 + 45 * this.getAtmosphereDensityFactor(this.altitudeKm);
    const mach = totalSpeed / speedOfSound;
    const targetPitchDeg = this.getTargetPitchDeg(this.altitudeKm);

    const stageReadyToSeparate = this.launched && this.stageIndex < 2 && this.stageFuels[this.stageIndex] <= 0.001;
    const autoStageCountdown =
      stageReadyToSeparate && this.autoStageAssist && this.flightMode === 'assisted'
        ? Math.max(0, 1.4 - this.stageDepletedTimer)
        : null;

    const totalFuelPct =
      ((this.stageFuels[0] + this.stageFuels[1] + this.stageFuels[2]) / 3) * 100;

    let phase: MissionPhase = 'pad';
    if (!this.launched) phase = 'pad';
    else if (this.orbitAchieved) phase = 'orbit-achieved';
    else if (this.altitudeKm >= 135) phase = 'orbital-burn';
    else if (this.altitudeKm >= 95) phase = 'karman';
    else if (stageReadyToSeparate) phase = 'booster-sep';
    else if (this.dynamicPressureKpa > 12 && this.altitudeKm < 35) phase = 'max-q';
    else phase = 'liftoff';

    const pitchError = Math.abs(this.pitchDeg - targetPitchDeg);
    const stabilityPct = Math.max(65, Math.min(100, Math.round(100 - pitchError * 0.45)));

    const altProg = Math.min(1, this.altitudeKm / dest.orbitTargetKm);
    const spdProg = Math.min(1, totalSpeed / dest.targetEscapeSpeed);
    const orbitProgressPct = this.orbitAchieved ? 100 : Math.min(99, Math.round((altProg * 0.65 + spdProg * 0.35) * 100));

    let guidanceText = 'Ready on launchpad · Press SPACE or click Launch to ignite engines';
    if (this.orbitAchieved) {
      guidanceText = `Earth Orbit & ${dest.name} Escape Window Achieved · Continue flying or select new target`;
    } else if (stageReadyToSeparate) {
      guidanceText =
        autoStageCountdown !== null
          ? `Stage depleted · Press [X] now for bonus (+450) or auto-staging in ${autoStageCountdown.toFixed(1)}s`
          : 'Stage depleted · Press [X] or click Separate Stage to ignite next stage';
    } else if (this.altitudeKm < 2.5) {
      guidanceText = 'Tower clearance climb · Full thrust upward through lower troposphere';
    } else if (this.altitudeKm < 50) {
      guidanceText = `Gravity turn · Hold [W/S] to pitch toward ${Math.round(targetPitchDeg)}° · Watch directional exhaust trail`;
    } else if (this.altitudeKm < 100) {
      guidanceText = `Climbing toward Karman Line (100 km) · Target pitch ${Math.round(targetPitchDeg)}°`;
    } else {
      guidanceText = `In Space · Burn downrange toward ${dest.orbitTargetKm} km & ${dest.targetEscapeSpeed} m/s for ${dest.name} escape`;
    }

    return {
      launched: this.launched,
      paused: this.paused,
      altitudeKm: this.altitudeKm,
      verticalSpeed: this.verticalSpeed,
      horizontalSpeed: this.horizontalSpeed,
      totalSpeed,
      mach,
      accelMps2: this.accelMps2,
      gForce: this.accelMps2 / 9.81,
      pitchDeg: this.pitchDeg,
      targetPitchDeg,
      yawDeg: this.yawDeg,
      throttle: this.throttle,
      stageIndex: this.stageIndex,
      stageName: spec.name,
      stageFuelPct: Math.round(this.stageFuels[this.stageIndex] * 100),
      totalFuelPct: Math.round(totalFuelPct),
      engineTempC: Math.round(this.engineTempC),
      stabilityPct,
      dynamicPressureKpa: this.dynamicPressureKpa,
      atmosphereLayer: this.getAtmosphereLayer(this.altitudeKm),
      phase,
      missionElapsedSec: this.missionElapsedSec,
      score: this.score,
      stageReadyToSeparate,
      autoStageCountdown,
      fairingJettisoned: this.fairingJettisoned,
      orbitAchieved: this.orbitAchieved,
      orbitProgressPct,
      guidanceText,
      peakG: this.peakG,
      maxSpeed: this.maxSpeed,
      manualStagesDone: this.manualStagesDone,
    };
  }
}
