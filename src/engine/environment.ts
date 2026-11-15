import * as THREE from 'three';
import { DESTINATIONS, DestinationId } from '../types/mission';
import { ProceduralTextures } from './textures';

export class SpaceportEnvironment {
  public readonly skyDome: THREE.Mesh;
  public readonly skyMaterial: THREE.ShaderMaterial;
  public readonly stars: THREE.Points;
  public readonly starsMaterial: THREE.PointsMaterial;
  public readonly launchComplex = new THREE.Group();
  public readonly localGroundGroup = new THREE.Group();
  public readonly cloudLayer: THREE.InstancedMesh;
  public readonly curvedEarthGroup = new THREE.Group();
  public readonly earthMesh: THREE.Mesh;
  public readonly atmosphereLimb: THREE.Mesh;

  // Warehouse (VAB) + Crawlerway + Tracked Crawler-Transporter
  public readonly warehouseGroup = new THREE.Group();
  public readonly crawlerGroup = new THREE.Group();
  public readonly warehouseDoorLeft: THREE.Mesh;
  public readonly warehouseDoorRight: THREE.Mesh;

  // Destination Planet sphere for Interplanetary Transit Cutscene
  public readonly targetPlanetGroup = new THREE.Group();
  public readonly targetPlanetMesh: THREE.Mesh;
  public readonly targetPlanetRings: THREE.Mesh;

  private readonly swingArmUpper: THREE.Group;
  private readonly swingArmLower: THREE.Group;
  private readonly holdDownClamps: THREE.Group[] = [];
  private readonly cloudMaterial: THREE.MeshStandardMaterial;
  private readonly earthRadius = 3800;

  constructor(scene: THREE.Scene, textures: ProceduralTextures) {
    // =========================================================
    // 1. DYNAMIC ALTITUDE / PLANETARY SKY DOME
    // =========================================================
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uZenithColor: { value: new THREE.Color(0x1b5ca8) },
        uHorizonColor: { value: new THREE.Color(0xa6d4f7) },
        uSpaceBlend: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(0.55, 0.62, 0.45).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenithColor;
        uniform vec3 uHorizonColor;
        uniform float uSpaceBlend;
        uniform vec3 uSunDir;
        varying vec3 vWorldDir;

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
          float skyGrad = smoothstep(0.45, 0.92, h);
          vec3 sky = mix(uHorizonColor, uZenithColor, skyGrad);

          vec3 spaceColor = vec3(0.008, 0.02, 0.055);
          sky = mix(sky, spaceColor, uSpaceBlend);

          float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
          float sunHalo = pow(sunDot, 28.0) * (0.45 - 0.25 * uSpaceBlend);
          float sunCore = smoothstep(0.9991, 0.9997, sunDot);
          sky += vec3(1.0, 0.93, 0.78) * sunHalo;
          sky += vec3(1.0, 0.98, 0.92) * sunCore * 1.4;

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(14000, 32, 24), this.skyMaterial);
    this.skyDome.frustumCulled = false;
    scene.add(this.skyDome);

    // =========================================================
    // 2. DEEP SPACE STARFIELD
    // =========================================================
    const starCount = 2600;
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 11500;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const tint = Math.random();
      if (tint < 0.2) {
        starColors[i * 3] = 0.75;
        starColors[i * 3 + 1] = 0.88;
        starColors[i * 3 + 2] = 1.0;
      } else if (tint < 0.35) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.9;
        starColors[i * 3 + 2] = 0.74;
      } else {
        starColors[i * 3] = 0.98;
        starColors[i * 3 + 1] = 0.98;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    this.starsMaterial = new THREE.PointsMaterial({
      size: 28,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(starGeo, this.starsMaterial);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // =========================================================
    // 3. COASTAL SPACEPORT TERRAIN, CRAWLERWAY & OCEAN
    // =========================================================
    const landMat = new THREE.MeshStandardMaterial({
      color: 0x364d3b,
      roughness: 0.92,
      metalness: 0.04,
    });
    const coastTerrain = new THREE.Mesh(new THREE.CircleGeometry(2800, 64), landMat);
    coastTerrain.rotation.x = -Math.PI / 2;
    coastTerrain.position.y = -0.35;
    coastTerrain.receiveShadow = true;
    this.localGroundGroup.add(coastTerrain);

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0c3b66,
      roughness: 0.16,
      metalness: 0.42,
    });
    const oceanPlane = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), oceanMat);
    oceanPlane.rotation.x = -Math.PI / 2;
    oceanPlane.position.set(2200, -0.45, 0);
    this.localGroundGroup.add(oceanPlane);

    // Paved Crawlerway Road connecting Warehouse (-115, 0) to Launch Pad (0, 0)
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.88,
      metalness: 0.08,
    });
    const crawlerway = new THREE.Mesh(new THREE.BoxGeometry(135, 0.35, 16), roadMat);
    crawlerway.position.set(-62, -0.22, 0);
    crawlerway.receiveShadow = true;
    this.localGroundGroup.add(crawlerway);

    // Parallel gravel crawler tracks along road
    [-4.6, 4.6].forEach((tz) => {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(125, 0.06, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 })
      );
      strip.position.set(-60, -0.03, tz);
      strip.receiveShadow = true;
      this.localGroundGroup.add(strip);
    });

    // Distant coastal dunes / terrain ridges
    const ridgeGeo = new THREE.ConeGeometry(85, 22, 7);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x2c4234, roughness: 0.95 });
    const ridges = new THREE.InstancedMesh(ridgeGeo, ridgeMat, 28);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 1.3 + Math.PI * 0.65;
      const dist = 420 + (i % 4) * 180;
      dummy.position.set(Math.cos(ang) * dist, 5, Math.sin(ang) * dist);
      dummy.scale.set(1 + (i % 3) * 0.5, 0.7 + (i % 5) * 0.25, 1.3);
      dummy.rotation.y = i * 0.9;
      dummy.updateMatrix();
      ridges.setMatrixAt(i, dummy.matrix);
    }
    ridges.computeBoundingSphere();
    this.localGroundGroup.add(ridges);

    // =========================================================
    // 4. VEHICLE ASSEMBLY WAREHOUSE (VAB) at X = -115
    // =========================================================
    this.warehouseGroup.position.set(-115, 0, 0);
    const vabWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.62, metalness: 0.35 });
    const vabRibMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.65 });
    const vabTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.42, metalness: 0.25 });
    const vabFloorMat = new THREE.MeshStandardMaterial({ color: 0x293548, roughness: 0.72, metalness: 0.16 });
    const vabLightStripMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });

    const vabFloor = new THREE.Mesh(new THREE.BoxGeometry(68, 0.5, 64), vabFloorMat);
    vabFloor.position.y = -0.25;
    vabFloor.receiveShadow = true;
    this.warehouseGroup.add(vabFloor);

    // Yellow safety bay perimeter markings around Crawler assembly pad
    [
      [0, -10.5, 22, 0.45],
      [0, 10.5, 22, 0.45],
      [-11, 0, 0.45, 21.4],
      [11, 0, 0.45, 21.4],
    ].forEach(([sx, sz, sw, sd]) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.04, sd), vabTrimMat);
      stripe.position.set(sx, 0.02, sz);
      this.warehouseGroup.add(stripe);
    });

    // Back wall (-X = -33), Side walls (-Z = -31, +Z = +31), Roof (Y = 48)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 48, 64), vabWallMat);
    backWall.position.set(-33, 24, 0);
    backWall.receiveShadow = true;
    this.warehouseGroup.add(backWall);

    [-31, 31].forEach((wz) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(68, 48, 1.6), vabWallMat);
      sideWall.position.set(0, 24, wz);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      this.warehouseGroup.add(sideWall);

      // Vertical interior steel truss columns + ceiling light strips
      for (let rx = -24; rx <= 24; rx += 12) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, 47, 1.8), vabRibMat);
        col.position.set(rx, 23.5, wz > 0 ? wz - 1.1 : wz + 1.1);
        this.warehouseGroup.add(col);
      }
    });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(68, 1.8, 64), vabWallMat);
    roof.position.set(0, 48, 0);
    this.warehouseGroup.add(roof);

    // Emissive Ceiling Light Strips inside Hangar
    [-14, 0, 14].forEach((lz) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(44, 0.35, 1.4), vabLightStripMat);
      strip.position.set(0, 46.8, lz);
      this.warehouseGroup.add(strip);
    });

    // Multi-Level Retractable Work Platforms / Service Catwalks flanking rocket
    [9, 18, 26].forEach((py) => {
      [-12.5, 12.5].forEach((pz) => {
        const catwalk = new THREE.Mesh(new THREE.BoxGeometry(18, 0.45, 4.2), vabRibMat);
        catwalk.position.set(0, py, pz);
        this.warehouseGroup.add(catwalk);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 0.16), vabTrimMat);
        rail.position.set(0, py + 0.95, pz > 0 ? pz - 1.9 : pz + 1.9);
        this.warehouseGroup.add(rail);
      });
    });

    // Overhead Yellow Gantry Crane Bridge inside warehouse
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(58, 2.0, 3.6), vabTrimMat);
    gantry.position.set(-4, 41, 0);
    this.warehouseGroup.add(gantry);

    // Sliding Bay Doors facing +X toward the Crawlerway
    const doorGeo = new THREE.BoxGeometry(1.0, 44, 24);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.48, metalness: 0.55 });
    this.warehouseDoorLeft = new THREE.Mesh(doorGeo, doorMat);
    this.warehouseDoorLeft.position.set(33.2, 22, -13);
    this.warehouseGroup.add(this.warehouseDoorLeft);

    this.warehouseDoorRight = new THREE.Mesh(doorGeo, doorMat);
    this.warehouseDoorRight.position.set(33.2, 22, 13);
    this.warehouseGroup.add(this.warehouseDoorRight);

    // Bright Interior Hangar Floodlights illuminating the rocket from multiple angles
    const hangarLightA = new THREE.PointLight(0xe0f2fe, 220, 120, 1.2);
    hangarLightA.position.set(10, 36, 14);
    this.warehouseGroup.add(hangarLightA);

    const hangarLightB = new THREE.PointLight(0xfff4e0, 180, 120, 1.2);
    hangarLightB.position.set(-10, 26, -14);
    this.warehouseGroup.add(hangarLightB);

    const hangarLightLow = new THREE.PointLight(0xfde68a, 110, 80, 1.3);
    hangarLightLow.position.set(14, 10, 0);
    this.warehouseGroup.add(hangarLightLow);

    this.localGroundGroup.add(this.warehouseGroup);


    // =========================================================
    // 5. TRACKED CRAWLER-TRANSPORTER & MOBILE LAUNCH PLATFORM
    // =========================================================
    const crawlerDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.65 });
    const crawlerHazardMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45, metalness: 0.35 });
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.25 });

    const mlpDeck = new THREE.Mesh(new THREE.BoxGeometry(15.5, 1.1, 14.5), crawlerDeckMat);
    mlpDeck.position.y = 2.0;
    mlpDeck.castShadow = true;
    mlpDeck.receiveShadow = true;
    this.crawlerGroup.add(mlpDeck);

    // 4 Corner Crawler Track Trucks
    [
      [-5.2, -4.6],
      [5.2, -4.6],
      [-5.2, 4.6],
      [5.2, 4.6],
    ].forEach(([tx, tz]) => {
      const truck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.35, 2.3), treadMat);
      truck.position.set(tx, 0.72, tz);
      truck.castShadow = true;
      this.crawlerGroup.add(truck);

      const housing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 2.4), crawlerHazardMat);
      housing.position.set(tx, 1.38, tz);
      this.crawlerGroup.add(housing);
    });

    // Support hold-down posts on mobile platform
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), crawlerHazardMat);
      post.position.set(Math.cos(a) * 3.1, 3.1, Math.sin(a) * 3.1);
      this.crawlerGroup.add(post);
    }

    this.crawlerGroup.visible = false;
    this.localGroundGroup.add(this.crawlerGroup);

    // =========================================================
    // 6. LAUNCH PAD COMPLEX & UMBILICAL TOWER (at X = 0)
    // =========================================================
    const padDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 32, 1.4, 32),
      new THREE.MeshStandardMaterial({
        map: textures.padAlbedo,
        roughness: 0.85,
        metalness: 0.08,
      })
    );
    padDeck.position.y = -0.65;
    padDeck.receiveShadow = true;
    this.launchComplex.add(padDeck);

    const flameTrench = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.8, 22),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.15 })
    );
    flameTrench.position.y = -0.2;
    flameTrench.receiveShadow = true;
    this.launchComplex.add(flameTrench);

    const clampMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.65 });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const clampGroup = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.2, 1.2), clampMat);
      arm.position.set(0, 1.1, 0);
      clampGroup.add(arm);
      clampGroup.position.set(Math.cos(angle) * 3.1, 0, Math.sin(angle) * 3.1);
      clampGroup.rotation.y = -angle;
      this.launchComplex.add(clampGroup);
      this.holdDownClamps.push(clampGroup);
    }

    const towerOrangeMat = new THREE.MeshStandardMaterial({ color: 0xd95326, roughness: 0.48, metalness: 0.42 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.78 });

    const towerGroup = new THREE.Group();
    towerGroup.position.set(-7.6, 0, -9.5); // Offset slightly to Z=-9.5 so Crawlerway along Z=0 enters cleanly!

    const towerHeight = 29;
    [
      [-1.7, -1.7],
      [1.7, -1.7],
      [-1.7, 1.7],
      [1.7, 1.7],
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.42, towerHeight, 0.42), towerOrangeMat);
      col.position.set(cx, towerHeight / 2, cz);
      col.castShadow = true;
      towerGroup.add(col);
    });

    for (let y = 3; y <= 27; y += 4.8) {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.28, 3.9), steelMat);
      deck.position.y = y;
      deck.castShadow = true;
      towerGroup.add(deck);
    }

    const crane = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.55, 0.9), towerOrangeMat);
    crane.position.set(1.8, towerHeight + 0.4, 0);
    towerGroup.add(crane);

    const buildSwingArm = (y: number, len: number): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.set(1.7, y, 1.7);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, len), steelMat);
      beam.position.set(2.4, 0, len * 0.48);
      beam.castShadow = true;
      pivot.add(beam);
      return pivot;
    };

    this.swingArmLower = buildSwingArm(13.2, 6.2);
    this.swingArmUpper = buildSwingArm(19.5, 6.4);
    towerGroup.add(this.swingArmLower);
    towerGroup.add(this.swingArmUpper);

    this.launchComplex.add(towerGroup);

    [
      [-24, -22],
      [24, -22],
      [-24, 22],
      [24, 22],
    ].forEach(([lx, lz]) => {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.42, 34, 8), steelMat);
      mast.position.set(lx, 17, lz);
      mast.castShadow = true;
      this.launchComplex.add(mast);
    });

    this.localGroundGroup.add(this.launchComplex);
    scene.add(this.localGroundGroup);

    // =========================================================
    // 7. TROPOSPHERE CLOUD LAYER
    // =========================================================
    const cloudGeo = new THREE.SphereGeometry(1, 14, 10);
    this.cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    const cloudCount = 120;
    this.cloudLayer = new THREE.InstancedMesh(cloudGeo, this.cloudMaterial, cloudCount);
    for (let i = 0; i < cloudCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 160 + Math.random() * 1400;
      const cy = 62 + Math.random() * 68;
      dummy.position.set(Math.cos(angle) * dist + 140, cy, Math.sin(angle) * dist);
      dummy.scale.set(42 + Math.random() * 78, 9 + Math.random() * 12, 34 + Math.random() * 56);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      this.cloudLayer.setMatrixAt(i, dummy.matrix);
    }
    this.cloudLayer.computeBoundingSphere();
    scene.add(this.cloudLayer);

    // =========================================================
    // 8. CURVED EARTH & RAYLEIGH ATMOSPHERE LIMB
    // =========================================================
    this.earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.earthRadius, 72, 48),
      new THREE.MeshStandardMaterial({
        map: textures.earthAlbedo,
        roughness: 0.72,
        metalness: 0.12,
      })
    );
    this.curvedEarthGroup.add(this.earthMesh);

    const limbMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0x38bdf8) } },
      vertexShader: `
        varying vec3 vNormalWorld;
        varying vec3 vViewDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vNormalWorld = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormalWorld;
        varying vec3 vViewDir;
        void main() {
          float rim = 1.0 - max(0.0, dot(vNormalWorld, vViewDir));
          float glow = pow(rim, 3.6) * 0.92;
          gl_FragColor = vec4(uColor, glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });

    this.atmosphereLimb = new THREE.Mesh(
      new THREE.SphereGeometry(this.earthRadius * 1.022, 64, 42),
      limbMat
    );
    this.curvedEarthGroup.add(this.atmosphereLimb);
    this.curvedEarthGroup.position.set(0, -this.earthRadius - 6, 0);
    this.curvedEarthGroup.visible = false;
    scene.add(this.curvedEarthGroup);

    // =========================================================
    // 9. DESTINATION PLANET SPHERE (FOR TRANSIT CUTSCENE)
    // =========================================================
    this.targetPlanetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(180, 48, 36),
      new THREE.MeshStandardMaterial({ color: 0xc2572d, roughness: 0.72, metalness: 0.08 })
    );
    this.targetPlanetGroup.add(this.targetPlanetMesh);

    this.targetPlanetRings = new THREE.Mesh(
      new THREE.RingGeometry(235, 360, 64),
      new THREE.MeshBasicMaterial({
        color: 0xd9be8a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      })
    );
    this.targetPlanetRings.rotation.x = Math.PI * 0.38;
    this.targetPlanetGroup.add(this.targetPlanetRings);
    this.targetPlanetGroup.visible = false;
    scene.add(this.targetPlanetGroup);
  }

  public configureTargetPlanetVisual(destId: DestinationId): void {
    const d = DESTINATIONS[destId];
    (this.targetPlanetMesh.material as THREE.MeshStandardMaterial).color.set(d.planetColorHex);
    this.targetPlanetRings.visible = destId === 'titan';
  }

  public setWarehouseDoorsOpen(openFrac: number): void {
    const slide = THREE.MathUtils.clamp(openFrac, 0, 1) * 14.5;
    this.warehouseDoorLeft.position.z = -13 - slide;
    this.warehouseDoorRight.position.z = 13 + slide;
  }

  public updateEarthAscent(
    cameraPos: THREE.Vector3,
    rocketWorldPos: THREE.Vector3,
    altitudeKm: number,
    launched: boolean,
    missionElapsedSec: number,
    scene: THREE.Scene
  ): void {
    this.skyDome.position.copy(cameraPos);
    this.stars.position.copy(cameraPos);

    const tropoToStrato = THREE.MathUtils.clamp(altitudeKm / 35, 0, 1);
    const spaceBlend = THREE.MathUtils.smoothstep(altitudeKm, 25, 105);

    const zenith = this.skyMaterial.uniforms.uZenithColor.value as THREE.Color;
    const horizon = this.skyMaterial.uniforms.uHorizonColor.value as THREE.Color;

    zenith.setRGB(
      THREE.MathUtils.lerp(0.11, 0.02, tropoToStrato),
      THREE.MathUtils.lerp(0.36, 0.09, tropoToStrato),
      THREE.MathUtils.lerp(0.68, 0.25, tropoToStrato)
    );
    horizon.setRGB(
      THREE.MathUtils.lerp(0.64, 0.08, tropoToStrato),
      THREE.MathUtils.lerp(0.83, 0.24, tropoToStrato),
      THREE.MathUtils.lerp(0.96, 0.48, tropoToStrato)
    );
    this.skyMaterial.uniforms.uSpaceBlend.value = spaceBlend;

    this.starsMaterial.opacity = THREE.MathUtils.smoothstep(altitudeKm, 20, 75) * 0.95;

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(horizon).lerp(new THREE.Color(0x020611), spaceBlend);
      scene.fog.density = 0.00055 * (1 - THREE.MathUtils.smoothstep(altitudeKm, 8, 42));
    }

    const releaseT = launched ? THREE.MathUtils.clamp(missionElapsedSec / 1.4, 0, 1) : 0;
    const easeRelease = 1 - Math.pow(1 - releaseT, 3);
    this.swingArmLower.rotation.y = -easeRelease * 1.15;
    this.swingArmUpper.rotation.y = -easeRelease * 1.15;
    for (let i = 0; i < this.holdDownClamps.length; i++) {
      this.holdDownClamps[i].rotation.z = -easeRelease * 0.55;
    }

    this.localGroundGroup.visible = altitudeKm < 45;
    this.cloudLayer.visible = altitudeKm < 55;
    this.cloudMaterial.opacity = 0.62 * (1 - THREE.MathUtils.smoothstep(altitudeKm, 20, 50));

    if (altitudeKm > 10) {
      this.curvedEarthGroup.visible = true;
      const worldAlt = rocketWorldPos.y;
      const radialDrop = Math.max(220, worldAlt * 0.85);
      this.curvedEarthGroup.position.set(
        rocketWorldPos.x * 0.82,
        rocketWorldPos.y - this.earthRadius - radialDrop,
        rocketWorldPos.z * 0.82
      );
      this.earthMesh.rotation.y = altitudeKm * 0.0004;
    } else {
      this.curvedEarthGroup.visible = false;
    }
  }

  public updateSpaceSky(cameraPos: THREE.Vector3, scene: THREE.Scene): void {
    this.skyDome.position.copy(cameraPos);
    this.stars.position.copy(cameraPos);
    this.skyMaterial.uniforms.uSpaceBlend.value = 1.0;
    this.starsMaterial.opacity = 0.96;
    this.localGroundGroup.visible = false;
    this.cloudLayer.visible = false;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = 0;
    }
  }

  public updatePlanetarySurfaceSky(cameraPos: THREE.Vector3, destId: DestinationId, scene: THREE.Scene): void {
    const d = DESTINATIONS[destId];
    this.skyDome.position.copy(cameraPos);
    this.stars.position.copy(cameraPos);
    this.localGroundGroup.visible = false;
    this.cloudLayer.visible = false;
    this.curvedEarthGroup.visible = false;
    this.targetPlanetGroup.visible = false;

    const isAirless = destId === 'moon' || destId === 'mercury' || destId === 'europa';
    this.skyMaterial.uniforms.uSpaceBlend.value = isAirless ? 0.98 : 0.0;
    (this.skyMaterial.uniforms.uZenithColor.value as THREE.Color).set(d.skyHex);
    (this.skyMaterial.uniforms.uHorizonColor.value as THREE.Color).set(d.fogHex);
    this.starsMaterial.opacity = isAirless ? 0.92 : 0.04;

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.set(d.fogHex);
      scene.fog.density = isAirless ? 0.0003 : destId === 'venus' || destId === 'titan' ? 0.0055 : 0.0024;
    }
  }
}
