import * as THREE from 'three';
import { LanderFinish, PlumeStyle, SpacecraftConfig } from '../types/mission';
import { ProceduralTextures } from './textures';

function getFoilColor(finish: LanderFinish): number {
  if (finish === 'silver') return 0xdbe4ee;
  if (finish === 'copper') return 0xd97746;
  if (finish === 'obsidian') return 0x293548;
  return 0xd49a1a;
}

export function getPlumeColors(style: PlumeStyle): { outer: number; inner: number } {
  if (style === 'cryo') return { outer: 0x38bdf8, inner: 0xe0f2fe };
  if (style === 'violet') return { outer: 0xa855f7, inner: 0xf3e8ff };
  if (style === 'emerald') return { outer: 0x10b981, inner: 0xd1fae5 };
  return { outer: 0xf97316, inner: 0xfffbeb };
}

export class LanderVehicle {
  public readonly root = new THREE.Group();
  public readonly rampPivot = new THREE.Group();
  public readonly flameGroup = new THREE.Group();
  public readonly engineLight: THREE.PointLight;

  private readonly foilMat: THREE.MeshStandardMaterial;
  private readonly accentMat: THREE.MeshStandardMaterial;
  private readonly flameOuterMat: THREE.MeshBasicMaterial;
  private readonly flameInnerMat: THREE.MeshBasicMaterial;
  private readonly solarLeft = new THREE.Group();
  private readonly solarRight = new THREE.Group();

  constructor(textures: ProceduralTextures, config: SpacecraftConfig) {
    this.foilMat = new THREE.MeshStandardMaterial({
      color: getFoilColor(config.landerFinish),
      map: textures.foilAlbedo,
      bumpMap: textures.foilBump,
      bumpScale: 0.04,
      roughness: 0.24,
      metalness: 0.9,
    });

    this.accentMat = new THREE.MeshStandardMaterial({
      color: config.accentColor,
      roughness: 0.35,
      metalness: 0.28,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.28,
      metalness: 0.85,
    });

    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.45,
    });

    const solarMat = new THREE.MeshStandardMaterial({
      map: textures.solarCellAlbedo,
      roughness: 0.18,
      metalness: 0.65,
    });

    // Main Octagonal Descent Bus
    const bus = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.95, 2.2, 8),
      this.foilMat
    );
    bus.position.y = 2.4;
    bus.castShadow = true;
    bus.receiveShadow = true;
    this.root.add(bus);

    // Accent structural collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.76, 1.76, 0.36, 8),
      this.accentMat
    );
    collar.position.y = 3.35;
    this.root.add(collar);

    // Upper avionics deck & high-gain dish
    const topDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.65, 0.55, 8),
      darkFrameMat
    );
    topDeck.position.y = 3.72;
    this.root.add(topDeck);

    const dishPts = [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.35, 0.06),
      new THREE.Vector2(0.7, 0.22),
      new THREE.Vector2(0.95, 0.44),
    ];
    const dish = new THREE.Mesh(
      new THREE.LatheGeometry(dishPts, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.35, side: THREE.DoubleSide })
    );
    dish.position.set(0.45, 4.05, -0.35);
    dish.rotation.x = 0.28;
    this.root.add(dish);

    // 4 Articulated Landing Legs + Circular Footpads (sitting flush at Y = 0)
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const legGroup = new THREE.Group();
      legGroup.rotation.y = ang;

      // Primary angled strut
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.55, 10), titaniumMat);
      strut.position.set(2.15, 1.12, 0);
      strut.rotation.z = 0.44;
      strut.castShadow = true;
      legGroup.add(strut);

      // Secondary upper brace
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.55, 8), darkFrameMat);
      brace.position.set(1.9, 1.9, 0);
      brace.rotation.z = -0.58;
      legGroup.add(brace);

      // Circular footpad resting at Y = 0.06
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.12, 16), titaniumMat);
      pad.position.set(2.72, 0.06, 0);
      pad.castShadow = true;
      pad.receiveShadow = true;
      legGroup.add(pad);

      this.root.add(legGroup);
    }

    // Deployable Solar Arrays
    const panelGeo = new THREE.BoxGeometry(2.8, 0.06, 1.1);
    const lPanel = new THREE.Mesh(panelGeo, solarMat);
    lPanel.position.x = -1.45;
    this.solarLeft.add(lPanel);
    this.solarLeft.position.set(-1.75, 3.1, 0);
    this.root.add(this.solarLeft);

    const rPanel = new THREE.Mesh(panelGeo, solarMat);
    rPanel.position.x = 1.45;
    this.solarRight.add(rPanel);
    this.solarRight.position.set(1.75, 3.1, 0);
    this.root.add(this.solarRight);

    // Folding Rover Deployment Ramp at +Z front
    this.rampPivot.position.set(0, 1.35, 1.65);
    const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 3.1), titaniumMat);
    rampMesh.position.set(0, 0, 1.55);
    this.rampPivot.add(rampMesh);
    this.rampPivot.rotation.x = -Math.PI * 0.48; // stowed upright initially
    this.root.add(this.rampPivot);

    // Descent Retro-Engine Nozzle & Plume
    const bellPts = [
      new THREE.Vector2(0.32, 0),
      new THREE.Vector2(0.45, -0.2),
      new THREE.Vector2(0.66, -0.78),
      new THREE.Vector2(0.75, -1.05),
      new THREE.Vector2(0.68, -1.05),
      new THREE.Vector2(0.28, -0.2),
    ];
    const bell = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 24), titaniumMat);
    bell.position.y = 1.35;
    this.root.add(bell);

    const plumeColors = getPlumeColors(config.plumeStyle);
    const outerGeo = new THREE.ConeGeometry(0.85, 6.2, 18, 1, true);
    outerGeo.rotateX(Math.PI);
    outerGeo.translate(0, -3.1, 0);
    this.flameOuterMat = new THREE.MeshBasicMaterial({
      color: plumeColors.outer,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outerFlame = new THREE.Mesh(outerGeo, this.flameOuterMat);

    const innerGeo = new THREE.ConeGeometry(0.46, 4.0, 16, 1, true);
    innerGeo.rotateX(Math.PI);
    innerGeo.translate(0, -2.0, 0);
    this.flameInnerMat = new THREE.MeshBasicMaterial({
      color: plumeColors.inner,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const innerFlame = new THREE.Mesh(innerGeo, this.flameInnerMat);

    this.flameGroup.add(outerFlame, innerFlame);
    this.flameGroup.position.y = 0.3;
    this.flameGroup.visible = false;
    this.root.add(this.flameGroup);

    this.engineLight = new THREE.PointLight(plumeColors.outer, 0, 45, 1.5);
    this.engineLight.position.set(0, 0.2, 0);
    this.root.add(this.engineLight);
  }

  public applyConfig(config: SpacecraftConfig): void {
    this.foilMat.color.setHex(getFoilColor(config.landerFinish));
    this.accentMat.color.set(config.accentColor);
    const p = getPlumeColors(config.plumeStyle);
    this.flameOuterMat.color.setHex(p.outer);
    this.flameInnerMat.color.setHex(p.inner);
    this.engineLight.color.setHex(p.outer);
  }

  public updateThrust(throttle: number, time: number, solarDeployed: boolean, rampOpenProgress: number): void {
    const firing = throttle > 0.02;
    this.flameGroup.visible = firing;
    if (firing) {
      const flicker = 0.9 + Math.sin(time * 52) * 0.08;
      this.flameGroup.scale.set(0.85 + throttle * 0.3, (0.45 + throttle * 0.9) * flicker, 0.85 + throttle * 0.3);
      this.engineLight.intensity = 65 * throttle * flicker;
    } else {
      this.engineLight.intensity = 0;
    }

    const wingAngle = solarDeployed ? 0 : Math.PI * 0.44;
    this.solarLeft.rotation.z = wingAngle;
    this.solarRight.rotation.z = -wingAngle;

    // Ramp lowers from -PI*0.48 (stowed) to +0.38 rad (touching terrain)
    this.rampPivot.rotation.x = THREE.MathUtils.lerp(-Math.PI * 0.48, 0.42, rampOpenProgress);
  }
}

export class RoverVehicle {
  public readonly root = new THREE.Group();
  public readonly mastHead = new THREE.Group();
  private readonly wheels: THREE.Mesh[] = [];
  private readonly frontForks: THREE.Group[] = [];
  private readonly chassisMat: THREE.MeshStandardMaterial;
  private readonly foilMat: THREE.MeshStandardMaterial;

  constructor(textures: ProceduralTextures, config: SpacecraftConfig) {
    this.chassisMat = new THREE.MeshStandardMaterial({
      color: config.accentColor,
      roughness: 0.36,
      metalness: 0.3,
    });

    this.foilMat = new THREE.MeshStandardMaterial({
      color: getFoilColor(config.landerFinish),
      map: textures.foilAlbedo,
      bumpMap: textures.foilBump,
      bumpScale: 0.03,
      roughness: 0.26,
      metalness: 0.88,
    });

    const whiteDeckMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.42,
      metalness: 0.22,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.3,
      metalness: 0.82,
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.82,
      metalness: 0.18,
    });

    // 1. Main Warm Electronics Box (WEB) Chassis (bottom at Y=0.58)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.68, 2.05), this.foilMat);
    body.position.y = 0.94;
    body.castShadow = true;
    body.receiveShadow = true;
    this.root.add(body);

    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 2.12), whiteDeckMat);
    topDeck.position.y = 1.32;
    topDeck.castShadow = true;
    this.root.add(topDeck);

    // Custom Accent Bumper & Trim Frame
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.18, 2.16), this.chassisMat);
    trim.position.y = 0.68;
    this.root.add(trim);

    // Rear Multi-Mission RTG Finned Power Pack (tilted upward at -Z back)
    const rtgCore = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.92, 12), titaniumMat);
    rtgCore.position.set(0, 1.15, -1.25);
    rtgCore.rotation.x = -0.52;
    rtgCore.castShadow = true;
    this.root.add(rtgCore);

    // High-Gain Dish Antenna
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.1, 0.16, 20),
      whiteDeckMat
    );
    dish.position.set(-0.42, 1.55, -0.55);
    dish.rotation.x = 0.35;
    this.root.add(dish);

    // 2. Remote Sensing Mast & Stereo Mastcam Head (front-right)
    const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.95, 10), whiteDeckMat);
    mastPole.position.set(0.38, 1.82, 0.62);
    mastPole.castShadow = true;
    this.root.add(mastPole);

    this.mastHead.position.set(0.38, 2.3, 0.62);
    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.32), whiteDeckMat);
    headBox.castShadow = true;
    this.mastHead.add(headBox);

    // Glowing cyan laser/camera optics
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    [-0.12, 0.12].forEach((lx) => {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 12), lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(lx, 0, 0.17);
      this.mastHead.add(lens);
    });
    this.root.add(this.mastHead);

    // Front robotic arm stub
    const armSeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.72), this.chassisMat);
    armSeg.position.set(-0.28, 0.88, 1.25);
    armSeg.rotation.x = 0.25;
    this.root.add(armSeg);

    // 3. 6-Wheel Rocker-Bogie Suspension (wheels radius 0.38 -> center at Y=0.38)
    const wheelRadius = 0.38;
    const wheelWidth = 0.32;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
    wheelGeo.rotateZ(Math.PI / 2);

    const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, wheelWidth + 0.04, 12);
    hubGeo.rotateZ(Math.PI / 2);

    const zPositions = [0.95, 0.0, -0.95];
    [-1, 1].forEach((sideSign) => {
      // Longitudinal suspension bar
      const rockerBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.95), titaniumMat);
      rockerBar.position.set(sideSign * 0.92, 0.62, 0);
      this.root.add(rockerBar);

      zPositions.forEach((wz, idx) => {
        const fork = new THREE.Group();
        fork.position.set(sideSign * 1.05, wheelRadius, wz);

        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.38, 8), titaniumMat);
        strut.position.y = 0.2;
        fork.add(strut);

        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.castShadow = true;
        wheel.receiveShadow = true;

        const hub = new THREE.Mesh(hubGeo, this.chassisMat);
        wheel.add(hub);

        // Tread rib bar so rotation is clearly visible while driving!
        const treadBar = new THREE.Mesh(
          new THREE.BoxGeometry(wheelWidth + 0.02, wheelRadius * 2.04, 0.07),
          titaniumMat
        );
        wheel.add(treadBar);

        fork.add(wheel);
        this.wheels.push(wheel);
        if (idx === 0 || idx === 2) {
          this.frontForks.push(fork);
        }
        this.root.add(fork);
      });
    });
  }

  public applyConfig(config: SpacecraftConfig): void {
    this.chassisMat.color.set(config.accentColor);
    this.foilMat.color.setHex(getFoilColor(config.landerFinish));
  }

  public updateMotion(dt: number, forwardSpeed: number, steerAngle: number, time: number): void {
    // Spin all 6 wheels proportionally to travel speed (radius = 0.38)
    const wheelAngularVel = forwardSpeed / 0.38;
    for (let i = 0; i < this.wheels.length; i++) {
      this.wheels[i].rotation.x += wheelAngularVel * dt;
    }
    // Ackermann-style front & counter-rear wheel steering
    for (let i = 0; i < this.frontForks.length; i++) {
      const isRear = i % 2 === 1;
      this.frontForks[i].rotation.y = isRear ? -steerAngle * 0.45 : steerAngle * 0.55;
    }
    // Subtle autonomous Mastcam scanning sweep
    this.mastHead.rotation.y = Math.sin(time * 0.9) * 0.35 + steerAngle * 0.4;
  }
}
