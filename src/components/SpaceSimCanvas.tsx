import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RocketAudioEngine } from '../engine/audio';
import { SpaceportEnvironment } from '../engine/environment';
import { FlightInput, FlightPhysicsEngine, WORLD_UNITS_PER_KM } from '../engine/flightPhysics';
import { LanderVehicle, RoverVehicle } from '../engine/landerAndRover';
import { PlanetarySurfaceScene, terrainHeightAt, terrainNormalAt } from '../engine/planetaryTerrain';
import { ExhaustSmokeSystem } from '../engine/plumeAndSmoke';
import { NozzleInfo, RocketVehicle } from '../engine/rocketModel';
import { createProceduralTextures } from '../engine/textures';
import {
  CameraMode,
  DESTINATIONS,
  DestinationId,
  FlightTelemetry,
  GameScreen,
  GameSettings,
  LandingTelemetry,
  RolloutTelemetry,
  RoverTelemetry,
  SpacecraftConfig,
  TransitTelemetry,
} from '../types/mission';

export interface SimControlInput extends FlightInput {
  landingBurn: boolean;
  landingLeft: boolean;
  landingRight: boolean;
  landingFwd: boolean;
  landingBack: boolean;
  roverThrottle: number; // -1..1
  roverSteer: number; // -1..1
  roverBoost: boolean;
  roverHop: boolean;
}

interface SpaceSimCanvasProps {
  screen: GameScreen;
  destinationId: DestinationId;
  spacecraftConfig: SpacecraftConfig;
  settings: GameSettings;
  cameraMode: CameraMode;
  physics: FlightPhysicsEngine;
  audio: RocketAudioEngine;
  inputRef: React.MutableRefObject<SimControlInput>;
  resetToken: number;
  landingThrottleRef: React.MutableRefObject<number>;
  onFlightTelemetry: (t: FlightTelemetry) => void;
  onRolloutTelemetry: (t: RolloutTelemetry) => void;
  onTransitTelemetry: (t: TransitTelemetry) => void;
  onLandingTelemetry: (t: LandingTelemetry) => void;
  onRoverTelemetry: (t: RoverTelemetry) => void;
  onRolloutComplete: () => void;
  onOrbitAchieved: () => void;
  onTransitComplete: () => void;
  onTouchdownComplete: () => void;
  collectTriggerRef: React.MutableRefObject<(() => void) | null>;
}

// Reusable scratch vectors (Zero GC in tick)
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vForward = new THREE.Vector3();
const _vRight = new THREE.Vector3();
const _vDorsal = new THREE.Vector3();
const _vNormal = new THREE.Vector3();
const _rocketVelWorld = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
const _smoothCamPos = new THREE.Vector3(22, 13, 32);
const _smoothLookAt = new THREE.Vector3(0, 12, 0);
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _quatA = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);

export const SpaceSimCanvas: React.FC<SpaceSimCanvasProps> = ({
  screen,
  destinationId,
  spacecraftConfig,
  settings,
  cameraMode,
  physics,
  audio,
  inputRef,
  resetToken,
  landingThrottleRef,
  onFlightTelemetry,
  onRolloutTelemetry,
  onTransitTelemetry,
  onLandingTelemetry,
  onRoverTelemetry,
  onRolloutComplete,
  onOrbitAchieved,
  onTransitComplete,
  onTouchdownComplete,
  collectTriggerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const screenRef = useRef(screen);
  const destRef = useRef(destinationId);
  const configRef = useRef(spacecraftConfig);
  const settingsRef = useRef(settings);
  const cameraModeRef = useRef(cameraMode);

  screenRef.current = screen;
  destRef.current = destinationId;
  configRef.current = spacecraftConfig;
  settingsRef.current = settings;
  cameraModeRef.current = cameraMode;

  const callbacksRef = useRef({
    onFlightTelemetry,
    onRolloutTelemetry,
    onTransitTelemetry,
    onLandingTelemetry,
    onRoverTelemetry,
    onRolloutComplete,
    onOrbitAchieved,
    onTransitComplete,
    onTouchdownComplete,
  });
  callbacksRef.current = {
    onFlightTelemetry,
    onRolloutTelemetry,
    onTransitTelemetry,
    onLandingTelemetry,
    onRoverTelemetry,
    onRolloutComplete,
    onOrbitAchieved,
    onTransitComplete,
    onTouchdownComplete,
  };

  const orbitCtrlRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    yaw: 0.65,
    pitch: 0.25,
    distance: 40,
    targetYaw: 0.65,
    targetPitch: 0.25,
    targetDistance: 40,
  });

  // Mutable scene phase states stored in ref so Three.js loop never tears down
  const phaseStateRef = useRef({
    rolloutProgress: 0,
    rolloutFinishedEmitted: false,
    orbitAngle: 0,
    transitProgress: 0,
    transitFinishedEmitted: false,
    // Landing state
    landerPos: new THREE.Vector3(0, 115, 0),
    landerVel: new THREE.Vector3(0, -10, 0),
    landerFuel: 1.0,
    landerTouchdown: false,
    landerTouchdownEmitted: false,
    rampOpen: 0,
    // Rover state
    roverDeployed: false,
    roverDeployT: 0,
    roverPos: new THREE.Vector3(0, 0, 5.8),
    roverVelY: 0,
    roverSpeed: 0,
    roverHeading: 0,
    roverSteerSmooth: 0,
    roverDistance: 0,
    roverBattery: 100,
    collectedSamples: new Set<string>(),
    lastScanMsg: null as string | null,
    orbitAchievedEmitted: false,
  });

  const rocketRef = useRef<RocketVehicle | null>(null);
  const landerRef = useRef<LanderVehicle | null>(null);
  const roverRef = useRef<RoverVehicle | null>(null);
  const planetSceneRef = useRef<PlanetarySurfaceScene | null>(null);
  const envRef = useRef<SpaceportEnvironment | null>(null);
  const smokeRef = useRef<ExhaustSmokeSystem | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Sync SpacecraftConfig immediately when user tweaks colors/parts in Builder
  useEffect(() => {
    rocketRef.current?.applySpacecraftConfig(spacecraftConfig);
    landerRef.current?.applyConfig(spacecraftConfig);
    roverRef.current?.applyConfig(spacecraftConfig);
  }, [spacecraftConfig]);

  // Sync Destination terrain & planet sphere
  useEffect(() => {
    planetSceneRef.current?.buildForDestination(destinationId);
    envRef.current?.configureTargetPlanetVisual(destinationId);
  }, [destinationId]);

  // Sync Settings
  useEffect(() => {
    physics.flightMode = settings.flightMode;
    physics.autoStageAssist = settings.autoStageAssist;
    audio.setMuted(settings.muted);
    if (sunLightRef.current) {
      sunLightRef.current.castShadow = settings.shadowsEnabled;
    }
  }, [settings, physics, audio]);

  // Reset phase state whenever screen transitions intentionally or resetToken bumps
  useEffect(() => {
    const st = phaseStateRef.current;
    if (screen === 'title' || screen === 'levels' || screen === 'quit') {
      _smoothCamPos.set(0, 3205, 18);
      _smoothLookAt.set(0, 3198, -20);
    } else if (screen === 'builder') {
      _smoothCamPos.set(-96, 16.5, 18);
      _smoothLookAt.set(-115, 15.5, -2.5);
    } else if (screen === 'rollout') {
      st.rolloutProgress = 0;
      st.rolloutFinishedEmitted = false;
      smokeRef.current?.reset();
      _smoothCamPos.set(-89, 13, 38);
      _smoothLookAt.set(-111, 13, 0);
    } else if (screen === 'flight') {
      st.orbitAchievedEmitted = false;
      rocketRef.current?.resetVisuals();
      smokeRef.current?.reset();
      _smoothCamPos.set(-24, 15.5, 42);
      _smoothLookAt.set(0, 13.5, 0);
    } else if (screen === 'earth-orbit') {
      st.orbitAngle = 0;
      smokeRef.current?.reset();
      _smoothCamPos.set(0, 3205, 14);
      _smoothLookAt.set(0, 3199.5, -10);
    } else if (screen === 'transit') {
      st.transitProgress = 0;
      st.transitFinishedEmitted = false;
      smokeRef.current?.reset();
      _smoothCamPos.set(6.5, 3203.8, 12.5);
      _smoothLookAt.set(0, 3200, -60);
    } else if (screen === 'landing') {
      st.landerPos.set(0, 110, 0);
      st.landerVel.set(0, -10.5, 0);
      st.landerFuel = 1.0;
      st.landerTouchdown = false;
      st.landerTouchdownEmitted = false;
      st.rampOpen = 0;
      landingThrottleRef.current = 0.35;
      smokeRef.current?.reset();
      _smoothCamPos.set(16, 118, 26);
      _smoothLookAt.set(0, 110, 0);
    } else if (screen === 'rover') {
      const ly = terrainHeightAt(0, 0, destRef.current);
      const ry = terrainHeightAt(0, 5.6, destRef.current);
      st.landerPos.set(0, ly, 0);
      st.landerTouchdown = true;
      st.rampOpen = 0;
      st.roverDeployed = false;
      st.roverDeployT = 0;
      st.roverPos.set(0, ry, 5.6);
      st.roverVelY = 0;
      st.roverSpeed = 0;
      st.roverHeading = 0;
      st.roverDistance = 0;
      st.roverBattery = 100;
      st.collectedSamples.clear();
      st.lastScanMsg = null;
      smokeRef.current?.reset();
      _smoothCamPos.set(0, ry + 5.5, -5.5);
      _smoothLookAt.set(0, ry + 1.4, 5.6);
    }
  }, [screen, resetToken, landingThrottleRef]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl && settingsRef.current.shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x9acdf5, 0.00055);

    const camera = new THREE.PerspectiveCamera(
      54,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.3,
      24000
    );
    camera.position.copy(_smoothCamPos);
    camera.lookAt(_smoothLookAt);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.72;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xa5d8ff, 0x3b4d3f, 0.78);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sunLight.position.set(140, 180, 120);
    sunLight.castShadow = !isSoftwareGl && settingsRef.current.shadowsEnabled;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 15;
    sunLight.shadow.camera.far = 420;
    const d = 55;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);
    sunLightRef.current = sunLight;

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    rimLight.position.set(-90, 40, -110);
    scene.add(rimLight);

    const textures = createProceduralTextures(renderer.capabilities.getMaxAnisotropy());
    const env = new SpaceportEnvironment(scene, textures);
    const rocket = new RocketVehicle(scene, textures);
    const lander = new LanderVehicle(textures, configRef.current);
    const rover = new RoverVehicle(textures, configRef.current);
    const planetScene = new PlanetarySurfaceScene(scene);
    const smokeSystem = new ExhaustSmokeSystem(scene, textures.smokeSprite);
    smokeSystem.setPixelRatio(pixelRatio);

    scene.add(lander.root);
    scene.add(rover.root);
    lander.root.visible = false;
    rover.root.visible = false;

    rocket.applySpacecraftConfig(configRef.current);
    planetScene.buildForDestination(destRef.current);
    env.configureTargetPlanetVisual(destRef.current);

    rocketRef.current = rocket;
    landerRef.current = lander;
    roverRef.current = rover;
    planetSceneRef.current = planetScene;
    envRef.current = env;
    smokeRef.current = smokeSystem;

    // Physics separation callbacks
    physics.onStageSeparate = (separatedIdx) => {
      _rocketVelWorld.set(
        (physics.horizontalSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000,
        (physics.verticalSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000,
        (physics.lateralSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000
      );
      rocket.triggerStageSeparation(separatedIdx, _rocketVelWorld);
      audio.playStageSeparation();
    };
    physics.onFairingJettison = () => {
      _rocketVelWorld.set(
        (physics.horizontalSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000,
        (physics.verticalSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000,
        (physics.lateralSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000
      );
      rocket.triggerFairingJettison(_rocketVelWorld);
      audio.playStageSeparation();
    };
    physics.onOrbitAchieved = () => {
      audio.playOrbitAchieved();
      if (!phaseStateRef.current.orbitAchievedEmitted) {
        phaseStateRef.current.orbitAchievedEmitted = true;
        callbacksRef.current.onOrbitAchieved();
      }
    };

    // Rover science sample collector callback
    collectTriggerRef.current = () => {
      const st = phaseStateRef.current;
      const dest = DESTINATIONS[destRef.current];
      for (const sample of dest.samples) {
        if (st.collectedSamples.has(sample.id)) continue;
        const dist = Math.hypot(st.roverPos.x - sample.x, st.roverPos.z - sample.z);
        if (dist < 10.5) {
          st.collectedSamples.add(sample.id);
          st.lastScanMsg = `${sample.title}: ${sample.reading} (+${sample.points} pts)`;
          audio.playOrbitAchieved();
          break;
        }
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer Orbit Interaction
    const canvasEl = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      orbitCtrlRef.current.dragging = true;
      orbitCtrlRef.current.lastX = e.clientX;
      orbitCtrlRef.current.lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!orbitCtrlRef.current.dragging) return;
      const dx = e.clientX - orbitCtrlRef.current.lastX;
      const dy = e.clientY - orbitCtrlRef.current.lastY;
      orbitCtrlRef.current.lastX = e.clientX;
      orbitCtrlRef.current.lastY = e.clientY;
      orbitCtrlRef.current.targetYaw -= dx * 0.0065;
      orbitCtrlRef.current.targetPitch = THREE.MathUtils.clamp(
        orbitCtrlRef.current.targetPitch + dy * 0.0055,
        -0.95,
        1.25
      );
    };
    const onPointerUp = () => {
      orbitCtrlRef.current.dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      orbitCtrlRef.current.targetDistance = THREE.MathUtils.clamp(
        orbitCtrlRef.current.targetDistance + e.deltaY * 0.03,
        12,
        105
      );
    };

    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('wheel', onWheel, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    const clock = new THREE.Clock();
    const activeNozzles: NozzleInfo[] = [];
    const landerNozzleList: NozzleInfo[] = [
      { worldPos: new THREE.Vector3(), worldDir: new THREE.Vector3(0, -1, 0), radius: 0.9, isVacuum: false },
    ];
    let frameId = 0;
    let disposed = false;
    let hudSyncTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const curScreen = screenRef.current;
      const curDest = destRef.current;
      const st = phaseStateRef.current;
      const orb = orbitCtrlRef.current;

      orb.yaw = THREE.MathUtils.damp(orb.yaw, orb.targetYaw, 8, dt);
      orb.pitch = THREE.MathUtils.damp(orb.pitch, orb.targetPitch, 8, dt);
      orb.distance = THREE.MathUtils.damp(orb.distance, orb.targetDistance, 8, dt);

      // Default visibility flags
      rocket.root.visible = false;
      lander.root.visible = false;
      rover.root.visible = false;
      planetScene.group.visible = false;
      env.crawlerGroup.visible = false;
      env.targetPlanetGroup.visible = false;

      let camLambda = 5.5;

      // =========================================================
      // SCREEN 1 & 2 & 10: TITLE / LEVELS / QUIT (Lander orbiting curved Earth)
      // =========================================================
      if (curScreen === 'title' || curScreen === 'levels' || curScreen === 'quit') {
        lander.root.visible = true;
        env.curvedEarthGroup.visible = true;
        st.orbitAngle += dt * 0.14;

        lander.root.position.set(0, 3200, 0);
        lander.root.rotation.set(0.15, st.orbitAngle * 0.5, -0.2);
        lander.updateThrust(0, elapsed, true, 0);

        env.curvedEarthGroup.position.set(0, -1100, -160);
        env.earthMesh.rotation.y = elapsed * 0.03;
        env.updateSpaceSky(camera.position, scene);

        _desiredCamPos.set(Math.sin(elapsed * 0.18) * 14, 3205 + Math.cos(elapsed * 0.15) * 3, 18);
        _desiredLookAt.set(0, 3198, -20);
        audio.updateThrust(0, 0, false, 2);
      }

      // =========================================================
      // SCREEN 3: MAKE YOUR OWN SPACECRAFT (Roam inside VAB Warehouse)
      // =========================================================
      else if (curScreen === 'builder') {
        rocket.root.visible = true;
        env.crawlerGroup.visible = true;
        env.setWarehouseDoorsOpen(0.45);

        // Rocket rests inside spacious VAB bay on Crawler-Transporter at X = -115
        env.crawlerGroup.position.set(-115, 0, 0);
        rocket.root.position.set(-115, 2.55, 0);
        rocket.root.quaternion.identity();
        rocket.updateVisuals(dt, elapsed, 0, 0, false, true, 1, 0, 0, 0);

        env.updateEarthAscent(camera.position, rocket.root.position, 0, false, 0, scene);
        sunLight.position.set(-55, 140, 110);
        sunLight.target.position.set(-115, 15, 0);
        sunLight.target.updateMatrixWorld();

        // Support WASD/Arrows to roam inside warehouse + gentle patrol + drag/zoom
        if (inputRef.current.yawLeft) orb.targetYaw -= 1.2 * dt;
        if (inputRef.current.yawRight) orb.targetYaw += 1.2 * dt;
        if (inputRef.current.pitchDown) orb.targetPitch = THREE.MathUtils.clamp(orb.targetPitch + 0.8 * dt, -0.45, 0.75);
        if (inputRef.current.pitchUp) orb.targetPitch = THREE.MathUtils.clamp(orb.targetPitch - 0.8 * dt, -0.45, 0.75);

        const roamAngle = orb.dragging ? 0 : elapsed * 0.16;
        const roamVerticalBob = orb.dragging ? 0 : Math.sin(elapsed * 0.34) * 3.8;
        const yawAngle = orb.yaw + roamAngle;
        const dist = THREE.MathUtils.clamp(orb.distance * 0.56, 16.5, 25.5);

        const rawCamX = -115 + dist * Math.cos(orb.pitch * 0.45) * Math.sin(yawAngle);
        const rawCamY = 16.5 + roamVerticalBob + dist * 0.45 * Math.sin(orb.pitch);
        const rawCamZ = dist * Math.cos(orb.pitch * 0.45) * Math.cos(yawAngle);

        // Keep camera strictly inside warehouse walls (-148..-82 in X, -31..31 in Z, 4..43 in Y)
        _desiredCamPos.set(
          THREE.MathUtils.clamp(rawCamX, -142, -88),
          THREE.MathUtils.clamp(rawCamY, 5.5, 40),
          THREE.MathUtils.clamp(rawCamZ, -26, 26)
        );

        // Shift lookAt slightly left of camera-right so rocket sits cleanly right of left customizer panel
        _vA.set(-115 - _desiredCamPos.x, 0, -_desiredCamPos.z).normalize();
        _vRight.crossVectors(_vA, _upVec).normalize();
        const targetY = THREE.MathUtils.clamp(16.2 + roamVerticalBob * 0.35 + orb.pitch * 4.5, 11, 22);
        _desiredLookAt.set(-115, targetY, 0).addScaledVector(_vRight, -3.4);

        camLambda = 8.5;
        audio.updateThrust(0, 1, false, 0);
      }

      // =========================================================
      // SCREEN 4: WAREHOUSE TO LAUNCHPAD ROLLOUT
      // =========================================================
      else if (curScreen === 'rollout') {
        rocket.root.visible = true;
        env.crawlerGroup.visible = true;

        // Smooth 7.5-second realistic rollout from X=-115 to X=0
        st.rolloutProgress = Math.min(1, st.rolloutProgress + dt / 7.2);
        const ease =
          st.rolloutProgress < 0.5
            ? 2 * st.rolloutProgress * st.rolloutProgress
            : 1 - Math.pow(-2 * st.rolloutProgress + 2, 2) / 2;

        const doorOpen = THREE.MathUtils.smoothstep(st.rolloutProgress, 0, 0.22);
        env.setWarehouseDoorsOpen(doorOpen);

        const crawlerX = THREE.MathUtils.lerp(-115, 0, ease);
        // Settle rocket onto pad cleanly in final 10%
        const settleY = THREE.MathUtils.lerp(2.55, 0.0, THREE.MathUtils.smoothstep(st.rolloutProgress, 0.9, 1.0));
        env.crawlerGroup.position.set(crawlerX, 0, 0);
        rocket.root.position.set(crawlerX, settleY, 0);
        rocket.root.quaternion.identity();
        rocket.updateVisuals(dt, elapsed, 0, 0, false, true, 1, 0, 0, 0);

        env.updateEarthAscent(camera.position, rocket.root.position, 0, false, 0, scene);
        sunLight.position.set(crawlerX + 120, 180, 120);
        sunLight.target.position.set(crawlerX, 12, 0);
        sunLight.target.updateMatrixWorld();

        // Sweeping tracking camera alongside crawlerway toward the pad
        _desiredCamPos.set(crawlerX + 26, 11 + ease * 5, 36 - ease * 6);
        _desiredLookAt.set(crawlerX + 4, 12, 0);

        // Subtle diesel crawler rumble via audio
        audio.updateThrust(0.22 * (1 - st.rolloutProgress * 0.4), 1, true, 0);

        if (st.rolloutProgress >= 1 && !st.rolloutFinishedEmitted) {
          st.rolloutFinishedEmitted = true;
          callbacksRef.current.onRolloutComplete();
        }
      }

      // =========================================================
      // SCREEN 5: EARTH ASCENT LAUNCH -> ORBIT
      // =========================================================
      else if (curScreen === 'flight') {
        rocket.root.visible = true;
        env.setWarehouseDoorsOpen(1);
        physics.step(dt, inputRef.current);

        const worldX = physics.downrangeKm * WORLD_UNITS_PER_KM;
        const worldY = physics.altitudeKm * WORLD_UNITS_PER_KM;
        const worldZ = physics.lateralKm * WORLD_UNITS_PER_KM;
        rocket.root.position.set(worldX, worldY, worldZ);

        const pitchRad = THREE.MathUtils.degToRad(physics.pitchDeg);
        const yawRad = THREE.MathUtils.degToRad(physics.yawDeg);
        _euler.set(0, -yawRad, -pitchRad, 'YXZ');
        rocket.root.quaternion.setFromEuler(_euler);

        const hasFuel = physics.stageFuels[physics.stageIndex] > 0.0001;
        const firing = physics.launched && hasFuel && physics.throttle > 0.01 && !physics.paused;
        const airDensity = physics.getAtmosphereDensityFactor(physics.altitudeKm);
        const totalSpeed = Math.hypot(physics.verticalSpeed, physics.horizontalSpeed, physics.lateralSpeed);
        const mach = totalSpeed / (295 + 45 * airDensity);

        rocket.updateVisuals(
          dt,
          elapsed,
          physics.stageIndex,
          physics.throttle,
          physics.launched,
          hasFuel,
          airDensity,
          mach,
          physics.pitchInputSmooth,
          physics.yawInputSmooth
        );

        sunLight.position.set(worldX + 160, worldY + 180, worldZ + 120);
        sunLight.target.position.set(worldX, worldY + 10, worldZ);
        sunLight.target.updateMatrixWorld();

        _rocketVelWorld.set(
          (physics.horizontalSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000,
          (physics.verticalSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000,
          (physics.lateralSpeed * 2.0 * WORLD_UNITS_PER_KM) / 1000
        );

        rocket.getActiveNozzles(physics.stageIndex, activeNozzles);
        if (!physics.paused) {
          smokeSystem.update(dt, activeNozzles, _rocketVelWorld, firing, physics.throttle, airDensity, worldY);
        }
        audio.updateThrust(physics.throttle, airDensity, firing, physics.stageIndex);

        // Aft Rear Chase camera behind rocket!
        _vForward.set(0, 1, 0).applyQuaternion(rocket.root.quaternion).normalize();
        _vRight.set(0, 0, 1).applyQuaternion(rocket.root.quaternion).normalize();
        _vDorsal.crossVectors(_vRight, _vForward).normalize();
        const centerOffset = rocket.getRocketWorldLengthCenterOffset(physics.stageIndex);
        _vA.copy(rocket.root.position).addScaledVector(_vForward, centerOffset);

        const mode = cameraModeRef.current;
        if (!physics.launched && mode !== 'free-orbit') {
          _desiredCamPos.set(-24, 15.5, 42);
          _desiredLookAt.set(0, 13.5, 0);
        } else if (mode === 'rear-chase') {
          const liftoffBlend = THREE.MathUtils.smoothstep(physics.altitudeKm, 0.04, 0.65);
          const chaseBack = physics.stageIndex === 2 ? 24 : 30;

          // Pad/Liftoff elevated 3/4 view matching pre-launch side (-X, +Z) -> zero flip!
          _vB
            .copy(rocket.root.position)
            .add(new THREE.Vector3(-23, Math.max(10, centerOffset * 0.55), 35));

          // Orbital Gravity-Turn Aft Rear Chase behind rocket
          _desiredCamPos
            .copy(_vA)
            .addScaledVector(_vForward, -chaseBack)
            .addScaledVector(_vDorsal, 11.5)
            .addScaledVector(_vRight, 15.5);

          _desiredCamPos.lerpVectors(_vB, _desiredCamPos, liftoffBlend);
          if (physics.altitudeKm < 0.35 && _desiredCamPos.y < 6.0) _desiredCamPos.y = 6.0;
          _desiredLookAt.copy(_vA).addScaledVector(_vForward, 3.0 * liftoffBlend);
        } else if (mode === 'booster-cam') {
          _desiredCamPos
            .copy(rocket.root.position)
            .addScaledVector(_vForward, centerOffset - 11.5)
            .addScaledVector(_vDorsal, 5.5)
            .addScaledVector(_vRight, 6.5);
          if (physics.altitudeKm < 0.25 && _desiredCamPos.y < 3.5) _desiredCamPos.y = 3.5;
          _desiredLookAt.copy(_vA).addScaledVector(_vForward, 5.0);
        } else if (mode === 'wide-ascent') {
          _desiredCamPos
            .copy(_vA)
            .addScaledVector(_vForward, -36)
            .addScaledVector(_vDorsal, 16)
            .addScaledVector(_vRight, 30);
          if (physics.altitudeKm < 0.5 && _desiredCamPos.y < 7.0) _desiredCamPos.y = 7.0;
          _desiredLookAt.copy(_vA).addScaledVector(_vForward, 2.0);
        } else {
          const cosP = Math.cos(orb.pitch);
          _desiredCamPos.set(
            _vA.x + orb.distance * cosP * Math.sin(orb.yaw),
            _vA.y + orb.distance * Math.sin(orb.pitch),
            _vA.z + orb.distance * cosP * Math.cos(orb.yaw)
          );
          if (physics.altitudeKm < 0.5 && _desiredCamPos.y < 2.5) _desiredCamPos.y = 2.5;
          _desiredLookAt.copy(_vA);
        }

        camLambda = mode === 'free-orbit' ? 16 : physics.launched ? 5.2 : 4.5;
        env.updateEarthAscent(camera.position, rocket.root.position, physics.altitudeKm, physics.launched, physics.missionElapsedSec, scene);
      }

      // =========================================================
      // SCREEN 6: LANDER ROAMING IN EARTH ORBIT
      // =========================================================
      else if (curScreen === 'earth-orbit') {
        lander.root.visible = true;
        env.curvedEarthGroup.visible = true;
        st.orbitAngle += dt * 0.24;

        // Lander orbits high above curved Earth sphere
        lander.root.position.set(0, 3200, 0);
        lander.root.rotation.set(0.08 * Math.sin(elapsed), st.orbitAngle * 0.35, -0.35);
        lander.updateThrust(0, elapsed, true, 0);

        env.curvedEarthGroup.position.set(0, -1080, -140);
        env.earthMesh.rotation.y += dt * 0.045;
        env.updateSpaceSky(camera.position, scene);

        sunLight.position.set(200, 3360, 140);
        sunLight.target.position.set(0, 3200, 0);
        sunLight.target.updateMatrixWorld();

        const orbitCamAngle = elapsed * 0.22 + (orb.dragging ? orb.yaw : 0);
        _desiredCamPos.set(
          Math.sin(orbitCamAngle) * 14,
          3204.5 + Math.cos(elapsed * 0.3) * 1.8,
          Math.cos(orbitCamAngle) * 14
        );
        _desiredLookAt.set(0, 3199.5, -10);
        audio.updateThrust(0, 0, false, 2);
      }

      // =========================================================
      // SCREEN 7: IN-THEME INTERPLANETARY TRANSIT CUTSCENE
      // =========================================================
      else if (curScreen === 'transit') {
        lander.root.visible = true;
        env.updateSpaceSky(camera.position, scene);

        st.transitProgress = Math.min(1, st.transitProgress + dt / 9.5);
        const tp = st.transitProgress;

        // Phase A (0..0.38): Earth recedes behind while lander fires TPI burn
        // Phase B (0.38..0.85): Cruise toward Target Planet swelling ahead
        // Phase C (0.85..1.0): Planetary capture retro-burn
        const firingBurn = tp < 0.36 || tp > 0.82;
        const thrustLevel = firingBurn ? 0.92 : 0;

        lander.root.position.set(0, 3200, 0);
        lander.root.rotation.set(Math.PI * 0.5, 0, 0); // Pointing along -Z / +Z travel axis
        if (tp > 0.8) {
          // Flip around for planetary retro-braking
          const flipT = THREE.MathUtils.smoothstep(tp, 0.8, 0.92);
          lander.root.rotation.x = THREE.MathUtils.lerp(Math.PI * 0.5, -Math.PI * 0.35, flipT);
        }
        lander.updateThrust(thrustLevel, elapsed, tp > 0.2 && tp < 0.88, 0);

        // Receding Earth behind (+Z)
        if (tp < 0.45) {
          env.curvedEarthGroup.visible = true;
          const recede = Math.pow(tp / 0.45, 2) * 3200;
          env.curvedEarthGroup.position.set(160, 2900 - recede * 0.4, 3850 + recede);
        } else {
          env.curvedEarthGroup.visible = false;
        }

        // Approaching Target Planet ahead (-Z)
        if (tp > 0.25) {
          env.targetPlanetGroup.visible = true;
          const approachT = THREE.MathUtils.smoothstep(tp, 0.25, 1.0);
          const distZ = THREE.MathUtils.lerp(-2400, -390, Math.pow(approachT, 0.72));
          env.targetPlanetGroup.position.set(-40 * (1 - approachT), 3190 - 40 * (1 - approachT), distZ);
          env.targetPlanetMesh.rotation.y += dt * 0.06;
        }

        // Emit subtle directional ionized trail during burn
        if (firingBurn) {
          _vForward.set(0, -1, 0).applyQuaternion(lander.root.quaternion).normalize();
          landerNozzleList[0].worldPos.copy(lander.root.position).addScaledVector(_vForward, 1.5);
          landerNozzleList[0].worldDir.copy(_vForward);
          landerNozzleList[0].isVacuum = true;
          smokeSystem.update(dt, landerNozzleList, _vB.set(0, 0, -8), true, thrustLevel, 0.08, 3200);
        }

        audio.updateThrust(thrustLevel, 0.12, firingBurn, 2);
        sunLight.position.set(180, 3360, 120);
        sunLight.target.position.set(0, 3200, 0);
        sunLight.target.updateMatrixWorld();

        // Dramatic behind-the-lander cutscene camera
        const sway = Math.sin(elapsed * 0.7) * 2.5;
        _desiredCamPos.set(6.5 + sway, 3203.8, 12.5);
        _desiredLookAt.set(0, 3200, -60);
        camLambda = 4.5;

        if (tp >= 1 && !st.transitFinishedEmitted) {
          st.transitFinishedEmitted = true;
          callbacksRef.current.onTransitComplete();
        }
      }

      // =========================================================
      // SCREEN 8: POWERED PLANETARY LANDING ON NASA SURFACE
      // =========================================================
      else if (curScreen === 'landing') {
        planetScene.group.visible = true;
        lander.root.visible = true;
        planetScene.updateBeacons(elapsed, st.collectedSamples);

        const dest = DESTINATIONS[curDest];
        const groundY = terrainHeightAt(st.landerPos.x, st.landerPos.z, curDest);
        const alt = Math.max(0, st.landerPos.y - groundY);

        if (!st.landerTouchdown) {
          // Assisted Auto-Land or manual throttle retro-braking
          let burnThrottle = landingThrottleRef.current;
          if (inputRef.current.landingBurn) {
            burnThrottle = 1.0;
            landingThrottleRef.current = 1.0;
          } else if (settingsRef.current.autoLandAssist && st.landerFuel > 0) {
            // Smart retro-throttle targets smooth ~-3.2 m/s touchdown velocity!
            const targetVy = alt > 45 ? -10.0 : alt > 12 ? -5.0 : -2.6;
            const err = targetVy - st.landerVel.y; // positive if descending too fast
            const hoverFrac = dest.gravityMps2 / (dest.gravityMps2 + 12.5);
            burnThrottle = THREE.MathUtils.clamp(hoverFrac + err * 0.12, 0.05, 1.0);
            landingThrottleRef.current = burnThrottle;
          }

          const effectiveThrottle = st.landerFuel > 0 ? burnThrottle : 0;
          if (effectiveThrottle > 0) {
            st.landerFuel = Math.max(0, st.landerFuel - effectiveThrottle * 0.022 * dt);
          }

          const retroAccel = effectiveThrottle * (dest.gravityMps2 + 12.5);
          st.landerVel.y += (retroAccel - dest.gravityMps2) * dt;

          // Horizontal hover RCS translation
          const hAccel = 8.5;
          if (inputRef.current.landingLeft) st.landerVel.x -= hAccel * dt;
          if (inputRef.current.landingRight) st.landerVel.x += hAccel * dt;
          if (inputRef.current.landingFwd) st.landerVel.z -= hAccel * dt;
          if (inputRef.current.landingBack) st.landerVel.z += hAccel * dt;

          if (settingsRef.current.autoLandAssist) {
            // Gently center over flat pad (0,0) & damp drift
            st.landerVel.x += (-st.landerPos.x * 0.15 - st.landerVel.x * 0.9) * dt;
            st.landerVel.z += (-st.landerPos.z * 0.15 - st.landerVel.z * 0.9) * dt;
          }

          st.landerPos.addScaledVector(st.landerVel, dt);

          const newGroundY = terrainHeightAt(st.landerPos.x, st.landerPos.z, curDest);
          if (st.landerPos.y <= newGroundY) {
            st.landerPos.y = newGroundY;
            st.landerTouchdown = true;
            st.landerVel.set(0, 0, 0);
            landingThrottleRef.current = 0;
            audio.playStageSeparation();
            if (!st.landerTouchdownEmitted) {
              st.landerTouchdownEmitted = true;
              callbacksRef.current.onTouchdownComplete();
            }
          }

          lander.root.position.copy(st.landerPos);
          lander.root.rotation.set(
            THREE.MathUtils.clamp(st.landerVel.z * 0.02, -0.25, 0.25),
            0,
            THREE.MathUtils.clamp(-st.landerVel.x * 0.02, -0.25, 0.25)
          );
          lander.updateThrust(effectiveThrottle, elapsed, false, 0);

          // Kick up planetary dust beneath retro-plume when below 35 m!
          if (effectiveThrottle > 0.05) {
            landerNozzleList[0].worldPos.copy(st.landerPos).add(_vA.set(0, 0.4, 0));
            landerNozzleList[0].worldDir.set(0, -1, 0);
            landerNozzleList[0].isVacuum = destRef.current === 'moon' || destRef.current === 'mercury';
            const dustDensity = alt < 35 ? 0.65 : 0.15;
            smokeSystem.update(dt, landerNozzleList, st.landerVel, true, effectiveThrottle, dustDensity, alt);
          }
          audio.updateThrust(effectiveThrottle, 0.45, effectiveThrottle > 0.05, 1);
        } else {
          lander.root.position.copy(st.landerPos);
          lander.root.rotation.set(0, 0, 0);
          st.rampOpen = Math.min(1, st.rampOpen + dt * 1.1);
          lander.updateThrust(0, elapsed, true, st.rampOpen);
          audio.updateThrust(0, 0, false, 1);
        }

        env.updatePlanetarySurfaceSky(camera.position, curDest, scene);
        sunLight.position.set(st.landerPos.x + 90, st.landerPos.y + 110, st.landerPos.z + 75);
        sunLight.target.position.copy(st.landerPos);
        sunLight.target.updateMatrixWorld();

        // Behind & angled down so you see Lander legs, retro-plume, and NASA terrain below
        _desiredCamPos.set(st.landerPos.x + 14, st.landerPos.y + 7.5, st.landerPos.z + 18);
        _desiredLookAt.set(st.landerPos.x, Math.max(groundY, st.landerPos.y - 3), st.landerPos.z);
        camLambda = 6.0;
      }

      // =========================================================
      // SCREEN 9: ROVER DEPLOYMENT & SURFACE EXPLORATION
      // =========================================================
      else if (curScreen === 'rover') {
        planetScene.group.visible = true;
        lander.root.visible = true;
        rover.root.visible = true;
        planetScene.updateBeacons(elapsed, st.collectedSamples);

        const dest = DESTINATIONS[curDest];
        st.rampOpen = Math.min(1, st.rampOpen + dt * 1.4);
        lander.root.position.copy(st.landerPos);
        lander.updateThrust(0, elapsed, true, st.rampOpen);

        // Smooth ramp roll-out deployment during first 1.8s
        if (!st.roverDeployed) {
          st.roverDeployT = Math.min(1, st.roverDeployT + dt / 1.8);
          const dz = THREE.MathUtils.lerp(1.5, 6.2, st.roverDeployT);
          const dy = terrainHeightAt(0, dz, curDest) + THREE.MathUtils.lerp(1.2, 0, st.roverDeployT);
          st.roverPos.set(0, dy, dz);
          rover.root.position.copy(st.roverPos);
          rover.root.rotation.set(0, 0, 0);
          rover.updateMotion(dt, 2.8, 0, elapsed);
          if (st.roverDeployT >= 1) {
            st.roverDeployed = true;
          }
        } else {
          // Responsive Rover driving physics!
          const maxSpeed = inputRef.current.roverBoost ? 19.5 : 12.8;
          const accelRate = inputRef.current.roverBoost ? 18.0 : 12.5;
          const cmdThrottle = inputRef.current.roverThrottle;
          const cmdSteer = inputRef.current.roverSteer;

          if (Math.abs(cmdThrottle) > 0.05) {
            st.roverSpeed += cmdThrottle * accelRate * dt;
            st.roverSpeed = THREE.MathUtils.clamp(st.roverSpeed, -maxSpeed * 0.55, maxSpeed);
          } else {
            // Natural rolling friction
            st.roverSpeed *= Math.max(0, 1 - dt * 2.8);
          }

          st.roverSteerSmooth = THREE.MathUtils.damp(st.roverSteerSmooth, cmdSteer * 0.65, 10, dt);

          // Turn cleanly (even at low speed so steering feels snappy!)
          const turnAuthority = Math.abs(st.roverSpeed) > 0.3 ? Math.sign(st.roverSpeed) : 1;
          st.roverHeading -= cmdSteer * 1.75 * turnAuthority * dt;

          const moveDx = Math.sin(st.roverHeading) * st.roverSpeed * dt;
          const moveDz = Math.cos(st.roverHeading) * st.roverSpeed * dt;

          st.roverPos.x = THREE.MathUtils.clamp(st.roverPos.x + moveDx, -185, 185);
          st.roverPos.z = THREE.MathUtils.clamp(st.roverPos.z + moveDz, -185, 185);
          st.roverDistance += Math.hypot(moveDx, moveDz);
          st.roverBattery = Math.max(15, st.roverBattery - Math.abs(st.roverSpeed) * 0.012 * dt);

          const groundY = terrainHeightAt(st.roverPos.x, st.roverPos.z, curDest);

          // Fun low-G hop / RCS micro-jump on Space!
          if (inputRef.current.roverHop && st.roverPos.y <= groundY + 0.08) {
            st.roverVelY = dest.gravityMps2 < 3 ? 5.2 : 6.4;
          }
          st.roverVelY -= dest.gravityMps2 * 1.45 * dt;
          st.roverPos.y += st.roverVelY * dt;
          if (st.roverPos.y <= groundY) {
            st.roverPos.y = groundY;
            st.roverVelY = 0;
          }

          // Align Rover orientation smoothly to planetary terrain slope normal
          terrainNormalAt(st.roverPos.x, st.roverPos.z, curDest, _vNormal);
          _quatA.setFromUnitVectors(_upVec, _vNormal);
          _euler.set(0, st.roverHeading, 0);
          rover.root.quaternion.setFromEuler(_euler).premultiply(_quatA);
          rover.root.position.copy(st.roverPos);

          rover.updateMotion(dt, st.roverSpeed, st.roverSteerSmooth, elapsed);

          // Kick up wheel dust behind rover when driving quickly on ground
          if (Math.abs(st.roverSpeed) > 2.5 && st.roverPos.y <= groundY + 0.15) {
            const backX = -Math.sin(st.roverHeading);
            const backZ = -Math.cos(st.roverHeading);
            landerNozzleList[0].worldPos.set(
              st.roverPos.x + backX * 1.25,
              st.roverPos.y + 0.35,
              st.roverPos.z + backZ * 1.25
            );
            landerNozzleList[0].worldDir.set(backX * 0.85, 0.35, backZ * 0.85).normalize();
            landerNozzleList[0].isVacuum = false;
            smokeSystem.update(dt, landerNozzleList, _vB.set(0, 0, 0), true, 0.28, 0.45, 2);
          }
        }

        audio.updateThrust(0, 0, false, 1);
        env.updatePlanetarySurfaceSky(camera.position, curDest, scene);
        sunLight.position.set(st.roverPos.x + 80, st.roverPos.y + 95, st.roverPos.z + 60);
        sunLight.target.position.copy(st.roverPos);
        sunLight.target.updateMatrixWorld();

        // Smooth Rover Rear Chase Camera (or interactive orbit drag)
        const mode = cameraModeRef.current;
        if (mode === 'free-orbit' || orb.dragging) {
          const cosP = Math.cos(orb.pitch);
          const dist = THREE.MathUtils.clamp(orb.distance * 0.45, 7, 32);
          _desiredCamPos.set(
            st.roverPos.x + dist * cosP * Math.sin(orb.yaw),
            st.roverPos.y + 2.5 + dist * Math.sin(orb.pitch),
            st.roverPos.z + dist * cosP * Math.cos(orb.yaw)
          );
        } else {
          const chaseDist = 10.5;
          const backX = -Math.sin(st.roverHeading);
          const backZ = -Math.cos(st.roverHeading);
          _desiredCamPos.set(
            st.roverPos.x + backX * chaseDist,
            st.roverPos.y + 4.4,
            st.roverPos.z + backZ * chaseDist
          );
        }
        const camGroundY = terrainHeightAt(_desiredCamPos.x, _desiredCamPos.z, curDest);
        if (_desiredCamPos.y < camGroundY + 1.4) _desiredCamPos.y = camGroundY + 1.4;
        _desiredLookAt.set(st.roverPos.x, st.roverPos.y + 1.4, st.roverPos.z);
        camLambda = 7.5;
      }

      // Smooth exponential camera damping across all scenes
      _smoothCamPos.x = THREE.MathUtils.damp(_smoothCamPos.x, _desiredCamPos.x, camLambda, dt);
      _smoothCamPos.y = THREE.MathUtils.damp(_smoothCamPos.y, _desiredCamPos.y, camLambda, dt);
      _smoothCamPos.z = THREE.MathUtils.damp(_smoothCamPos.z, _desiredCamPos.z, camLambda, dt);

      _smoothLookAt.x = THREE.MathUtils.damp(_smoothLookAt.x, _desiredLookAt.x, camLambda + 2, dt);
      _smoothLookAt.y = THREE.MathUtils.damp(_smoothLookAt.y, _desiredLookAt.y, camLambda + 2, dt);
      _smoothLookAt.z = THREE.MathUtils.damp(_smoothLookAt.z, _desiredLookAt.z, camLambda + 2, dt);

      // Subtle atmospheric thrust vibration during flight
      if (curScreen === 'flight' && physics.launched && !physics.paused) {
        const airD = physics.getAtmosphereDensityFactor(physics.altitudeKm);
        const hasF = physics.stageFuels[physics.stageIndex] > 0.0001;
        if (hasF && airD > 0.08 && physics.throttle > 0.05) {
          const shake = 0.08 * physics.throttle * airD;
          _vB.set(Math.sin(elapsed * 47) * shake, Math.cos(elapsed * 61) * shake, Math.sin(elapsed * 53) * shake);
          camera.position.copy(_smoothCamPos).add(_vB);
        } else {
          camera.position.copy(_smoothCamPos);
        }
      } else {
        camera.position.copy(_smoothCamPos);
      }
      camera.lookAt(_smoothLookAt);

      renderer.render(scene, camera);

      // Throttled HUD Telemetry Sync (~20 Hz)
      hudSyncTimer += dt;
      if (hudSyncTimer >= 0.05) {
        hudSyncTimer = 0;
        if (curScreen === 'flight') {
          callbacksRef.current.onFlightTelemetry(physics.getTelemetry());
        } else if (curScreen === 'rollout') {
          const pct = Math.round(st.rolloutProgress * 100);
          callbacksRef.current.onRolloutTelemetry({
            progressPct: pct,
            distanceMeters: Math.round(st.rolloutProgress * 460),
            speedKmh: st.rolloutProgress > 0.05 && st.rolloutProgress < 0.95 ? 3.2 : 0.6,
            statusLabel:
              pct < 22
                ? 'Opening Vehicle Assembly Bay Doors'
                : pct < 88
                  ? 'Crawler-Transporter Rolling Out Along Crawlerway'
                  : 'Locking Rocket Onto Launch Pad Flame Trench',
          });
        } else if (curScreen === 'transit') {
          const pct = Math.round(st.transitProgress * 100);
          const d = DESTINATIONS[curDest];
          callbacksRef.current.onTransitTelemetry({
            progressPct: pct,
            phaseLabel:
              pct < 38
                ? 'Trans-Planetary Injection Burn'
                : pct < 82
                  ? `Interplanetary Cruise Toward ${d.name}`
                  : `${d.name} Orbital Capture & Entry Alignment`,
            distanceRemainingLabel: `${Math.max(0, Math.round((1 - st.transitProgress) * 100))}% Remaining`,
            velocityKms: Number((11.4 + Math.sin(st.transitProgress * Math.PI) * 14.2).toFixed(1)),
          });
        } else if (curScreen === 'landing') {
          const groundY = terrainHeightAt(st.landerPos.x, st.landerPos.z, curDest);
          const alt = Math.max(0, st.landerPos.y - groundY);
          const hSpeed = Math.hypot(st.landerVel.x, st.landerVel.z);
          callbacksRef.current.onLandingTelemetry({
            altitudeMeters: alt,
            verticalSpeed: st.landerVel.y,
            horizontalSpeed: hSpeed,
            fuelPct: Math.round(st.landerFuel * 100),
            throttle: landingThrottleRef.current,
            touchdown: st.landerTouchdown,
            safeLanding: true,
            guidanceText: st.landerTouchdown
              ? 'Touchdown confirmed · Preparing rover deployment ramp'
              : settingsRef.current.autoLandAssist
                ? 'Auto-Descent active · Hold [W/Space] for extra thrust or [A/D] to translate'
                : 'Manual Descent · Control retro-thrust [W/Space] to touch down smoothly',
          });
        } else if (curScreen === 'rover') {
          const dest = DESTINATIONS[curDest];
          let nearby = null;
          for (const sample of dest.samples) {
            if (st.collectedSamples.has(sample.id)) continue;
            if (Math.hypot(st.roverPos.x - sample.x, st.roverPos.z - sample.z) < 10.5) {
              nearby = sample;
              break;
            }
          }
          terrainNormalAt(st.roverPos.x, st.roverPos.z, curDest, _vNormal);
          const slopeDeg = Math.round((Math.acos(THREE.MathUtils.clamp(_vNormal.y, -1, 1)) * 180) / Math.PI);
          callbacksRef.current.onRoverTelemetry({
            speedMps: st.roverSpeed,
            headingDeg: ((Math.round((st.roverHeading * 180) / Math.PI) % 360) + 360) % 360,
            distanceTraveledM: Math.round(st.roverDistance),
            batteryPct: Math.round(st.roverBattery),
            samplesCollected: Array.from(st.collectedSamples),
            nearbySample: nearby,
            lastScanMessage: st.lastScanMsg,
            slopeDeg,
          });
        }
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObs.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('wheel', onWheel);
      canvasEl.removeEventListener('webglcontextlost', onContextLost);
      canvasEl.removeEventListener('webglcontextrestored', onContextRestored);
      smokeSystem.dispose();
      textures.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (canvasEl.parentNode === container) {
        container.removeChild(canvasEl);
      }
    };
  }, [physics, audio, collectTriggerRef, landingThrottleRef]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#020711]/90 text-slate-200 z-30">
          <div className="text-center space-y-2 px-6">
            <p className="font-display text-lg font-semibold">WebGL Graphics Context Paused</p>
            <p className="text-sm text-slate-400">Restoring 3D simulation viewport...</p>
          </div>
        </div>
      )}
    </div>
  );
};
