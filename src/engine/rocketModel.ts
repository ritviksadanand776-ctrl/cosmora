import * as THREE from 'three';
import { getPlumeColors } from './landerAndRover';
import { ProceduralTextures } from './textures';
import { SpacecraftConfig } from '../types/mission';

export interface NozzleInfo {
  worldPos: THREE.Vector3;
  worldDir: THREE.Vector3;
  radius: number;
  isVacuum: boolean;
}

interface DebrisBody {
  mesh: THREE.Object3D;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  age: number;
  maxAge: number;
}

function createNozzleBell(radiusTop: number, radiusBottom: number, height: number, mat: THREE.Material): THREE.Group {
  const grp = new THREE.Group();
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(radiusTop * 0.65, 0),
    new THREE.Vector2(radiusTop, -height * 0.12),
    new THREE.Vector2(radiusTop * 0.72, -height * 0.28),
    new THREE.Vector2(radiusBottom * 0.88, -height * 0.68),
    new THREE.Vector2(radiusBottom, -height),
    new THREE.Vector2(radiusBottom * 0.92, -height),
    new THREE.Vector2(radiusTop * 0.62, -height * 0.28),
  ];
  const geo = new THREE.LatheGeometry(pts, 24);
  const bell = new THREE.Mesh(geo, mat);
  bell.castShadow = true;
  grp.add(bell);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(radiusTop * 0.92, radiusTop * 0.14, 10, 24),
    mat
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -height * 0.25;
  grp.add(collar);

  return grp;
}

function createFlameAssembly(
  nozzleRadius: number,
  length: number,
  outerColorHex: number,
  innerColorHex: number
): {
  group: THREE.Group;
  outerCone: THREE.Mesh;
  innerCone: THREE.Mesh;
  outerMat: THREE.MeshBasicMaterial;
  innerMat: THREE.MeshBasicMaterial;
  rings: THREE.Mesh[];
} {
  const group = new THREE.Group();

  const outerGeo = new THREE.ConeGeometry(nozzleRadius * 1.45, length, 20, 1, true);
  outerGeo.translate(0, -length * 0.5, 0);
  outerGeo.rotateX(Math.PI);
  const outerMat = new THREE.MeshBasicMaterial({
    color: outerColorHex,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const outerCone = new THREE.Mesh(outerGeo, outerMat);
  group.add(outerCone);

  const innerGeo = new THREE.ConeGeometry(nozzleRadius * 0.78, length * 0.62, 16, 1, true);
  innerGeo.translate(0, -length * 0.31, 0);
  innerGeo.rotateX(Math.PI);
  const innerMat = new THREE.MeshBasicMaterial({
    color: innerColorHex,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const innerCone = new THREE.Mesh(innerGeo, innerMat);
  group.add(innerCone);

  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const rGeo = new THREE.SphereGeometry(nozzleRadius * (0.56 - i * 0.08), 12, 10);
    rGeo.scale(1, 1.8, 1);
    const rMat = new THREE.MeshBasicMaterial({
      color: 0xfff7ed,
      transparent: true,
      opacity: 0.85 - i * 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(rGeo, rMat);
    ring.position.y = -(nozzleRadius * 1.6 + i * length * 0.16);
    group.add(ring);
    rings.push(ring);
  }

  return { group, outerCone, innerCone, outerMat, innerMat, rings };
}

function createStabilizerFin(mat: THREE.Material, span: number, height: number): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(span, 0);
  shape.lineTo(span * 0.25, height);
  shape.lineTo(0, height * 1.15);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.05);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export class RocketVehicle {
  public readonly root = new THREE.Group();
  public readonly boosters: THREE.Group[] = []; // [left, right, front, back]
  public readonly coreStage = new THREE.Group();
  public readonly upperStage = new THREE.Group();
  public readonly fairingLeft = new THREE.Group();
  public readonly fairingRight = new THREE.Group();
  public readonly spacecraft = new THREE.Group();
  public readonly solarWingLeft = new THREE.Group();
  public readonly solarWingRight = new THREE.Group();
  public readonly engineLight: THREE.PointLight;
  public readonly vaporCone: THREE.Mesh;

  private readonly hullMat: THREE.MeshStandardMaterial;
  private readonly accentMat: THREE.MeshStandardMaterial;
  private readonly foilMat: THREE.MeshStandardMaterial;

  private readonly srbNozzles: THREE.Group[] = [];
  private readonly coreNozzles: THREE.Group[] = [];
  private readonly upperNozzles: THREE.Group[] = [];
  private readonly srbFlames: ReturnType<typeof createFlameAssembly>[] = [];
  private readonly coreFlames: ReturnType<typeof createFlameAssembly>[] = [];
  private readonly upperFlames: ReturnType<typeof createFlameAssembly>[] = [];

  private readonly nozzleMarkers: {
    obj: THREE.Object3D;
    stage: number; // 0 = srb, 1 = core, 2 = upper
    boosterIdx?: number;
    radius: number;
  }[] = [];

  public readonly debrisList: DebrisBody[] = [];
  private readonly debrisParent: THREE.Scene;
  private solarDeployProgress = 0;
  private fairingDeployed = false;
  private currentConfig: SpacecraftConfig | null = null;

  private readonly _tmpPos = new THREE.Vector3();
  private readonly _tmpQuat = new THREE.Quaternion();
  private readonly _tmpDir = new THREE.Vector3();

  constructor(scene: THREE.Scene, textures: ProceduralTextures) {
    this.debrisParent = scene;

    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0xeef2f6,
      map: textures.hullAlbedo,
      bumpMap: textures.hullBump,
      bumpScale: 0.03,
      roughness: 0.42,
      metalness: 0.18,
    });

    const darkCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.58,
      metalness: 0.35,
    });

    const brushedTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.24,
      metalness: 0.88,
    });

    this.accentMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.36,
      metalness: 0.22,
    });

    const cryoMat = new THREE.MeshStandardMaterial({
      map: textures.cryoAlbedo,
      roughness: 0.48,
      metalness: 0.32,
    });

    this.foilMat = new THREE.MeshStandardMaterial({
      color: 0xd49a1a,
      map: textures.foilAlbedo,
      bumpMap: textures.foilBump,
      bumpScale: 0.04,
      roughness: 0.22,
      metalness: 0.92,
    });

    const solarMat = new THREE.MeshStandardMaterial({
      map: textures.solarCellAlbedo,
      roughness: 0.16,
      metalness: 0.65,
    });

    // =========================================================
    // 1. CORE STAGE (L110) - Nozzles clear ground cleanly above y = 0
    // =========================================================
    const coreRadius = 1.35;
    const coreBody = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRadius, coreRadius, 11.7, 32),
      this.hullMat
    );
    coreBody.position.y = 8.05;
    coreBody.castShadow = true;
    coreBody.receiveShadow = true;
    this.coreStage.add(coreBody);

    const coreAccentBand = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRadius * 1.015, coreRadius * 1.015, 0.9, 32),
      this.accentMat
    );
    coreAccentBand.position.y = 10.9;
    this.coreStage.add(coreAccentBand);

    const coreSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRadius * 1.03, coreRadius * 1.08, 1.5, 32),
      darkCarbonMat
    );
    coreSkirt.position.y = 1.95;
    coreSkirt.castShadow = true;
    this.coreStage.add(coreSkirt);

    // 4 Diagonal Aerodynamic Stabilizer Fins at core base
    for (let i = 0; i < 4; i++) {
      const finAngle = (i * Math.PI) / 2 + Math.PI / 4;
      const finHolder = new THREE.Group();
      finHolder.rotation.y = finAngle;
      const fin = createStabilizerFin(darkCarbonMat, 1.15, 2.35);
      fin.position.set(coreRadius * 1.02, 1.45, 0);
      finHolder.add(fin);
      this.coreStage.add(finHolder);
    }

    // External propellant feedlines & avionics raceways
    [0, Math.PI].forEach((ang) => {
      const raceway = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 11.1, 0.28),
        brushedTitaniumMat
      );
      raceway.position.set(Math.sin(ang) * coreRadius * 0.98, 7.6, Math.cos(ang) * coreRadius * 0.98);
      this.coreStage.add(raceway);
    });

    const interstage = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRadius * 1.04, coreRadius * 1.04, 1.25, 32),
      darkCarbonMat
    );
    interstage.position.y = 13.7;
    this.coreStage.add(interstage);

    [-0.58, 0.58].forEach((offsetX) => {
      const nozzle = createNozzleBell(0.32, 0.56, 1.25, brushedTitaniumMat);
      nozzle.position.set(offsetX, 1.32, 0);
      this.coreStage.add(nozzle);
      this.coreNozzles.push(nozzle);

      const flame = createFlameAssembly(0.52, 8.8, 0xfb923c, 0xfffbeb);
      flame.group.position.set(0, -1.2, 0);
      nozzle.add(flame.group);
      this.coreFlames.push(flame);

      const marker = new THREE.Object3D();
      marker.position.set(0, -1.25, 0);
      nozzle.add(marker);
      this.nozzleMarkers.push({ obj: marker, stage: 1, radius: 0.54 });
    });

    this.root.add(this.coreStage);

    // =========================================================
    // 2. SOLID ROCKET BOOSTERS (4 slots: -X, +X, +Z, -Z)
    // =========================================================
    const boosterPositions: [number, number, number][] = [
      [-2.42, 0, 0],
      [2.42, 0, 0],
      [0, 0, 2.42],
      [0, 0, -2.42],
    ];

    boosterPositions.forEach(([bx, by, bz], bIdx) => {
      const bGroup = new THREE.Group();
      const srbR = 0.88;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(srbR, srbR, 10.6, 28),
        this.hullMat
      );
      body.position.y = 7.0;
      body.castShadow = true;
      body.receiveShadow = true;
      bGroup.add(body);

      [2.7, 5.8, 8.9, 11.7].forEach((ringY, idx) => {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(srbR * 1.03, srbR * 1.03, 0.28, 28),
          idx === 2 ? this.accentMat : darkCarbonMat
        );
        ring.position.y = ringY;
        bGroup.add(ring);
      });

      const nosePts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const r = srbR * Math.pow(1 - t, 0.65);
        nosePts.push(new THREE.Vector2(r, t * 3.1));
      }
      const nose = new THREE.Mesh(new THREE.LatheGeometry(nosePts, 28), this.hullMat);
      nose.position.y = 12.3;
      nose.castShadow = true;
      bGroup.add(nose);

      // Booster Nose Tip Cap
      const bTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        brushedTitaniumMat
      );
      bTip.position.y = 15.38;
      bGroup.add(bTip);

      // Attach struts pointing inward to core
      [3.6, 11.0].forEach((strutY) => {
        const strut = new THREE.Mesh(
          new THREE.BoxGeometry(bx !== 0 ? 0.85 : 0.24, 0.22, bz !== 0 ? 0.85 : 0.24),
          brushedTitaniumMat
        );
        strut.position.set(bx !== 0 ? -Math.sign(bx) * 0.95 : 0, strutY, bz !== 0 ? -Math.sign(bz) * 0.95 : 0);
        bGroup.add(strut);
      });

      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(srbR * 0.98, srbR * 1.12, 1.1, 28),
        darkCarbonMat
      );
      skirt.position.y = 1.55;
      bGroup.add(skirt);

      const nozzle = createNozzleBell(0.46, 0.78, 1.35, brushedTitaniumMat);
      nozzle.position.set(0, 1.42, 0);
      bGroup.add(nozzle);
      this.srbNozzles.push(nozzle);

      const flame = createFlameAssembly(0.75, 12.5, 0xf97316, 0xffffff);
      flame.group.position.set(0, -1.3, 0);
      nozzle.add(flame.group);
      this.srbFlames.push(flame);

      const marker = new THREE.Object3D();
      marker.position.set(0, -1.35, 0);
      nozzle.add(marker);
      this.nozzleMarkers.push({ obj: marker, stage: 0, boosterIdx: bIdx, radius: 0.78 });

      bGroup.position.set(bx, by, bz);
      this.boosters.push(bGroup);
      this.root.add(bGroup);
    });

    // =========================================================
    // 3. C25 CRYOGENIC UPPER STAGE
    // =========================================================
    const upperBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.28, 1.33, 5.2, 32),
      cryoMat
    );
    upperBody.position.y = 16.5;
    upperBody.castShadow = true;
    upperBody.receiveShadow = true;
    this.upperStage.add(upperBody);

    const upperAccent = new THREE.Mesh(
      new THREE.CylinderGeometry(1.31, 1.31, 0.42, 32),
      this.accentMat
    );
    upperAccent.position.y = 18.6;
    this.upperStage.add(upperAccent);

    // 4 RCS attitude thruster quads around upper stage
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const rcs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.24), darkCarbonMat);
      rcs.position.set(Math.sin(ang) * 1.32, 18.2, Math.cos(ang) * 1.32);
      this.upperStage.add(rcs);
    }

    const adapter = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.24, 0.9, 28),
      darkCarbonMat
    );
    adapter.position.y = 13.85;
    this.upperStage.add(adapter);

    const vacNozzle = createNozzleBell(0.45, 0.88, 1.55, brushedTitaniumMat);
    vacNozzle.position.set(0, 13.55, 0);
    this.upperStage.add(vacNozzle);
    this.upperNozzles.push(vacNozzle);

    const vacFlame = createFlameAssembly(0.86, 10.5, 0x38bdf8, 0xe0f2fe);
    vacFlame.group.position.set(0, -1.48, 0);
    vacNozzle.add(vacFlame.group);
    this.upperFlames.push(vacFlame);

    const vacMarker = new THREE.Object3D();
    vacMarker.position.set(0, -1.55, 0);
    vacNozzle.add(vacMarker);
    this.nozzleMarkers.push({ obj: vacMarker, stage: 2, radius: 0.84 });

    this.root.add(this.upperStage);

    // =========================================================
    // 4. INTERPLANETARY SPACECRAFT PAYLOAD (Inside Fairing)
    // =========================================================
    const payloadRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.18, 0.42, 24),
      darkCarbonMat
    );
    payloadRing.position.y = 19.3;
    this.spacecraft.add(payloadRing);

    const bus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.84, 1.85, 8),
      this.foilMat
    );
    bus.position.y = 20.35;
    this.spacecraft.add(bus);

    const dishPts: THREE.Vector2[] = [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.28, 0.05),
      new THREE.Vector2(0.55, 0.16),
      new THREE.Vector2(0.78, 0.34),
    ];
    const dish = new THREE.Mesh(
      new THREE.LatheGeometry(dishPts, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.4, side: THREE.DoubleSide })
    );
    dish.position.y = 21.4;
    this.spacecraft.add(dish);

    const feedHorn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.55, 10),
      brushedTitaniumMat
    );
    feedHorn.position.y = 21.65;
    this.spacecraft.add(feedHorn);

    const wingGeo = new THREE.BoxGeometry(2.4, 0.06, 0.95);
    const leftPanel = new THREE.Mesh(wingGeo, solarMat);
    leftPanel.position.x = -1.25;
    this.solarWingLeft.add(leftPanel);
    this.solarWingLeft.position.set(-0.78, 20.35, 0);
    this.solarWingLeft.rotation.z = Math.PI * 0.48;

    const rightPanel = new THREE.Mesh(wingGeo, solarMat);
    rightPanel.position.x = 1.25;
    this.solarWingRight.add(rightPanel);
    this.solarWingRight.position.set(0.78, 20.35, 0);
    this.solarWingRight.rotation.z = -Math.PI * 0.48;

    this.spacecraft.add(this.solarWingLeft);
    this.spacecraft.add(this.solarWingRight);
    this.root.add(this.spacecraft);

    // =========================================================
    // 5. CLAMSHELL PAYLOAD FAIRING (Pivoted cleanly at base y = 19.1!)
    // =========================================================
    const buildFairingHalf = (group: THREE.Group, phiStart: number) => {
      // Group origin is y = 19.1 so scaling fairingStyle never detaches it from upperStage!
      group.position.y = 19.1;

      const fShoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(1.48, 1.31, 0.45, 24, 1, false, phiStart, Math.PI),
        darkCarbonMat
      );
      fShoulder.position.y = 0.225;
      fShoulder.castShadow = true;
      group.add(fShoulder);

      const fBody = new THREE.Mesh(
        new THREE.CylinderGeometry(1.48, 1.48, 3.35, 24, 1, false, phiStart, Math.PI),
        this.hullMat
      );
      fBody.position.y = 2.125;
      fBody.castShadow = true;
      group.add(fBody);

      const fNosePts: THREE.Vector2[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const r = Math.max(0.18, 1.48 * Math.pow(1 - t, 0.62));
        fNosePts.push(new THREE.Vector2(r, t * 3.4));
      }
      const fNose = new THREE.Mesh(
        new THREE.LatheGeometry(fNosePts, 24, phiStart, Math.PI),
        this.hullMat
      );
      fNose.position.y = 3.8;
      fNose.castShadow = true;
      group.add(fNose);

      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.28, 24, 1, false, phiStart, Math.PI),
        this.accentMat
      );
      band.position.y = 3.15;
      group.add(band);

      // Titanium Nose Cap & Launch Abort Telemetry Spire at apex (completes the top of the rocket!)
      const noseCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.2, 0.35, 16, 1, false, phiStart, Math.PI),
        brushedTitaniumMat
      );
      noseCap.position.y = 7.36;
      group.add(noseCap);

      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.11, 1.35, 12, 1, false, phiStart, Math.PI),
        this.accentMat
      );
      spire.position.y = 8.2;
      group.add(spire);
    };

    buildFairingHalf(this.fairingLeft, Math.PI * 0.5);
    buildFairingHalf(this.fairingRight, -Math.PI * 0.5);
    this.root.add(this.fairingLeft);
    this.root.add(this.fairingRight);

    // =========================================================
    // 6. MAX-Q CONDENSATION VAPOR CONE
    // =========================================================
    const vaporGeo = new THREE.ConeGeometry(4.4, 3.8, 32, 1, true);
    const vaporMat = new THREE.MeshBasicMaterial({
      color: 0xe2f1ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.vaporCone = new THREE.Mesh(vaporGeo, vaporMat);
    this.vaporCone.position.y = 21.0;
    this.root.add(this.vaporCone);

    // =========================================================
    // 7. ENGINE EXHAUST LIGHT
    // =========================================================
    this.engineLight = new THREE.PointLight(0xff9b3d, 0, 95, 1.5);
    this.engineLight.position.set(0, -0.8, 0);
    this.root.add(this.engineLight);

    scene.add(this.root);
  }

  public applySpacecraftConfig(config: SpacecraftConfig): void {
    this.currentConfig = config;
    this.hullMat.color.set(config.hullColor);
    this.accentMat.color.set(config.accentColor);

    const foilHex =
      config.landerFinish === 'silver' ? 0xdbe4ee : config.landerFinish === 'copper' ? 0xd97746 : 0xd49a1a;
    this.foilMat.color.setHex(foilHex);

    // Booster visibility according to chosen layout
    this.boosters[0].visible = config.boosterStyle === 'twin' || config.boosterStyle === 'quad';
    this.boosters[1].visible = config.boosterStyle === 'twin' || config.boosterStyle === 'quad';
    this.boosters[2].visible = config.boosterStyle === 'quad';
    this.boosters[3].visible = config.boosterStyle === 'quad';

    // Fairing silhouette scale (pivoted at base y = 19.1 so always flush!)
    const fairingScaleXZ = config.fairingStyle === 'hammerhead' ? 1.22 : config.fairingStyle === 'needle' ? 0.88 : 1.0;
    const fairingScaleY = config.fairingStyle === 'needle' ? 1.22 : config.fairingStyle === 'hammerhead' ? 0.92 : 1.0;
    this.fairingLeft.scale.set(fairingScaleXZ, fairingScaleY, fairingScaleXZ);
    this.fairingRight.scale.set(fairingScaleXZ, fairingScaleY, fairingScaleXZ);

    // Plume signature colors
    const p = getPlumeColors(config.plumeStyle);
    [...this.srbFlames, ...this.coreFlames, ...this.upperFlames].forEach((f) => {
      f.outerMat.color.setHex(p.outer);
      f.innerMat.color.setHex(p.inner);
    });
  }

  public getRocketWorldLengthCenterOffset(stageIndex: number): number {
    if (stageIndex === 0) return 13.0;
    if (stageIndex === 1) return 14.5;
    return 18.2;
  }

  public getActiveNozzles(stageIndex: number, outList: NozzleInfo[]): void {
    outList.length = 0;
    this.root.updateMatrixWorld(true);
    this._tmpDir.set(0, -1, 0).applyQuaternion(this.root.quaternion).normalize();

    for (const marker of this.nozzleMarkers) {
      if (marker.boosterIdx !== undefined && !this.boosters[marker.boosterIdx].visible) {
        continue;
      }
      const isActive =
        (stageIndex === 0 && (marker.stage === 0 || marker.stage === 1)) ||
        (stageIndex === 1 && marker.stage === 1) ||
        (stageIndex === 2 && marker.stage === 2);

      if (!isActive) continue;

      marker.obj.getWorldPosition(this._tmpPos);
      marker.obj.getWorldQuaternion(this._tmpQuat);
      const dir = new THREE.Vector3(0, -1, 0).applyQuaternion(this._tmpQuat).normalize();

      outList.push({
        worldPos: this._tmpPos.clone(),
        worldDir: dir,
        radius: marker.radius,
        isVacuum: marker.stage === 2,
      });
    }
  }

  public updateVisuals(
    dt: number,
    time: number,
    stageIndex: number,
    throttle: number,
    launched: boolean,
    hasFuel: boolean,
    atmosphereDensity: number,
    mach: number,
    pitchCmd: number,
    yawCmd: number
  ): void {
    const firing = launched && hasFuel && throttle > 0.01;
    const vacuumExpansion = 1 + (1 - atmosphereDensity) * 1.15;
    const flicker = 0.92 + Math.sin(time * 47) * 0.05 + Math.cos(time * 73) * 0.03;

    const gimbalPitch = -pitchCmd * 0.16;
    const gimbalYaw = yawCmd * 0.14;

    const applyNozzleState = (
      nozzles: THREE.Group[],
      flames: ReturnType<typeof createFlameAssembly>[],
      isActiveCheck: (idx: number) => boolean,
      baseLenScale: number
    ) => {
      for (let i = 0; i < nozzles.length; i++) {
        nozzles[i].rotation.z = gimbalPitch;
        nozzles[i].rotation.x = gimbalYaw;

        const flame = flames[i];
        flame.group.visible = isActiveCheck(i) && firing;
        if (flame.group.visible) {
          const tScale = (0.35 + throttle * 0.85) * flicker;
          flame.outerCone.scale.set(vacuumExpansion, tScale * baseLenScale, vacuumExpansion);
          flame.innerCone.scale.set(
            0.95 + (1 - atmosphereDensity) * 0.35,
            tScale * baseLenScale,
            0.95 + (1 - atmosphereDensity) * 0.35
          );
          flame.outerMat.opacity = (0.45 + 0.35 * throttle) * (0.65 + 0.35 * atmosphereDensity);

          for (let r = 0; r < flame.rings.length; r++) {
            const ring = flame.rings[r];
            ring.visible = atmosphereDensity > 0.12 && throttle > 0.45;
            const pulse = 1 + Math.sin(time * 58 + r * 1.4) * 0.12;
            ring.scale.set(pulse, pulse * throttle, pulse);
          }
        }
      }
    };

    applyNozzleState(this.srbNozzles, this.srbFlames, (i) => stageIndex === 0 && this.boosters[i].visible, 1.0);
    applyNozzleState(
      this.coreNozzles,
      this.coreFlames,
      () => stageIndex <= 1 && this.coreStage.visible,
      stageIndex === 1 ? 1.18 : 0.85
    );
    applyNozzleState(this.upperNozzles, this.upperFlames, () => stageIndex === 2, 1.25);

    if (firing) {
      const stageBoost = stageIndex === 0 ? 140 : stageIndex === 1 ? 90 : 65;
      this.engineLight.intensity = stageBoost * throttle * flicker;
      const p = getPlumeColors(this.currentConfig?.plumeStyle ?? 'amber');
      this.engineLight.color.setHex(stageIndex === 2 && !this.currentConfig ? 0x7dd3fc : p.outer);
      this.engineLight.position.y = stageIndex <= 1 ? -0.8 : 11.4;
    } else {
      this.engineLight.intensity = 0;
    }

    const machWindow = Math.max(0, 1 - Math.abs(mach - 1.08) / 0.32);
    const vaporOpacity = launched && atmosphereDensity > 0.08 ? machWindow * atmosphereDensity * 0.38 : 0;
    (this.vaporCone.material as THREE.MeshBasicMaterial).opacity = vaporOpacity;
    this.vaporCone.visible = vaporOpacity > 0.02;
    if (this.vaporCone.visible) {
      const s = 0.95 + Math.sin(time * 32) * 0.04;
      this.vaporCone.scale.set(s, 1, s);
    }

    if (this.fairingDeployed && this.solarDeployProgress < 1) {
      this.solarDeployProgress = Math.min(1, this.solarDeployProgress + dt * 0.65);
      const ease = 1 - Math.pow(1 - this.solarDeployProgress, 3);
      this.solarWingLeft.rotation.z = THREE.MathUtils.lerp(Math.PI * 0.48, 0, ease);
      this.solarWingRight.rotation.z = THREE.MathUtils.lerp(-Math.PI * 0.48, 0, ease);
    }

    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.age += dt;
      d.vel.y -= 6.5 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.angVel.x * dt;
      d.mesh.rotation.y += d.angVel.y * dt;
      d.mesh.rotation.z += d.angVel.z * dt;

      if (d.age > d.maxAge) {
        this.debrisParent.remove(d.mesh);
        this.debrisList.splice(i, 1);
      }
    }
  }

  public triggerStageSeparation(separatedStageIndex: number, rocketVelWorld: THREE.Vector3): void {
    this.root.updateMatrixWorld(true);

    const spawnDebris = (part: THREE.Object3D, sideImpulse: number, zImpulse: number, downImpulse: number) => {
      if (!part.visible) return;
      part.getWorldPosition(this._tmpPos);
      part.getWorldQuaternion(this._tmpQuat);

      const clone = part.clone();
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && (child.material as THREE.Material).blending === THREE.AdditiveBlending) {
          child.visible = false;
        }
      });

      clone.position.copy(this._tmpPos);
      clone.quaternion.copy(this._tmpQuat);
      this.debrisParent.add(clone);

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this._tmpQuat);
      const fwdZ = new THREE.Vector3(0, 0, 1).applyQuaternion(this._tmpQuat);
      const down = new THREE.Vector3(0, -1, 0).applyQuaternion(this._tmpQuat);

      const vel = rocketVelWorld
        .clone()
        .addScaledVector(right, sideImpulse)
        .addScaledVector(fwdZ, zImpulse)
        .addScaledVector(down, downImpulse);

      this.debrisList.push({
        mesh: clone,
        vel,
        angVel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.9,
          (Math.random() - 0.5) * 0.5,
          sideImpulse * 0.08
        ),
        age: 0,
        maxAge: 14,
      });

      part.visible = false;
    };

    if (separatedStageIndex === 0) {
      spawnDebris(this.boosters[0], -14, 0, -8);
      spawnDebris(this.boosters[1], 14, 0, -8);
      spawnDebris(this.boosters[2], 0, 14, -8);
      spawnDebris(this.boosters[3], 0, -14, -8);
    } else if (separatedStageIndex === 1) {
      spawnDebris(this.coreStage, (Math.random() - 0.5) * 4, 0, -18);
    }
  }

  public triggerFairingJettison(rocketVelWorld: THREE.Vector3): void {
    if (this.fairingDeployed) return;
    this.fairingDeployed = true;
    this.root.updateMatrixWorld(true);

    const spawnHalf = (part: THREE.Object3D, sideImpulse: number) => {
      part.getWorldPosition(this._tmpPos);
      part.getWorldQuaternion(this._tmpQuat);
      const clone = part.clone();
      clone.position.copy(this._tmpPos);
      clone.quaternion.copy(this._tmpQuat);
      this.debrisParent.add(clone);

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this._tmpQuat);
      const down = new THREE.Vector3(0, -1, 0).applyQuaternion(this._tmpQuat);

      this.debrisList.push({
        mesh: clone,
        vel: rocketVelWorld.clone().addScaledVector(right, sideImpulse).addScaledVector(down, -6),
        angVel: new THREE.Vector3(0.4, 0.2, -sideImpulse * 0.14),
        age: 0,
        maxAge: 12,
      });
      part.visible = false;
    };

    spawnHalf(this.fairingLeft, -12);
    spawnHalf(this.fairingRight, 12);
  }

  public resetVisuals(): void {
    this.coreStage.visible = true;
    this.upperStage.visible = true;
    this.fairingLeft.visible = true;
    this.fairingRight.visible = true;
    this.fairingDeployed = false;
    this.solarDeployProgress = 0;
    this.solarWingLeft.rotation.z = Math.PI * 0.48;
    this.solarWingRight.rotation.z = -Math.PI * 0.48;
    if (this.currentConfig) {
      this.applySpacecraftConfig(this.currentConfig);
    } else {
      this.boosters[0].visible = true;
      this.boosters[1].visible = true;
      this.boosters[2].visible = false;
      this.boosters[3].visible = false;
    }

    for (const d of this.debrisList) {
      this.debrisParent.remove(d.mesh);
    }
    this.debrisList.length = 0;
  }
}
