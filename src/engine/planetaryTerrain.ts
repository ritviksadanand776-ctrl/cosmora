import * as THREE from 'three';
import { DESTINATIONS, DestinationConfig, DestinationId } from '../types/mission';

function hash2D(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export interface RockCollider {
  x: number;
  z: number;
  radius: number;
}

export const SAFE_LANDING_RADIUS = 24;

/**
 * Deterministic NASA-inspired terrain heightfield per planet.
 * Keeps a gentle flat landing apron near (0, 0) for safe touchdown & rover deployment.
 */
export function terrainHeightAt(x: number, z: number, destId: DestinationId): number {
  const distFromPad = Math.hypot(x, z);
  const padFlatten = THREE.MathUtils.smoothstep(distFromPad, 10, 25);

  let h =
    Math.sin(x * 0.028) * Math.cos(z * 0.025) * 2.1 +
    Math.sin(x * 0.075 + 1.2) * Math.sin(z * 0.068) * 0.75;

  if (destId === 'moon' || destId === 'mercury') {
    // Rich field of lunar/mercurian impact crater holes with raised rims & concave bowls
    const craters = [
      { cx: 38, cz: -28, r: 16, depth: 3.6 },
      { cx: -48, cz: 36, r: 22, depth: 4.5 },
      { cx: 26, cz: 58, r: 15, depth: 3.1 },
      { cx: -36, cz: -48, r: 19, depth: 3.9 },
      { cx: 86, cz: 18, r: 28, depth: 5.2 },
      { cx: -78, cz: -66, r: 24, depth: 4.2 },
      { cx: -92, cz: 12, r: 20, depth: 3.6 },
      { cx: 65, cz: -78, r: 26, depth: 4.8 },
      { cx: 12, cz: -95, r: 18, depth: 3.3 },
      { cx: 130, cz: -40, r: 34, depth: 5.8 },
      { cx: -140, cz: 85, r: 38, depth: 6.2 },
    ];
    for (const c of craters) {
      const d = Math.hypot(x - c.cx, z - c.cz);
      if (d < c.r * 1.38) {
        const t = d / c.r;
        if (t < 0.84) {
          h -= c.depth * (1 - (t / 0.84) * (t / 0.84));
        } else {
          const rimT = (t - 0.84) / 0.54;
          h += Math.sin(rimT * Math.PI) * (c.depth * 0.36);
        }
      }
    }
    if (destId === 'mercury') {
      h += Math.tanh((x + z * 0.4 - 55) * 0.07) * 3.4;
    }
  } else if (destId === 'mars') {
    // Jezero Crater red-orange sedimentary delta terraces & wind-scoured dunes
    const mesa = Math.max(0, Math.sin(x * 0.036 + 0.5) * Math.cos(z * 0.036 - 0.3));
    h += Math.floor(mesa * 4) * 0.55 + mesa * 1.7;
    const channel = Math.exp(-Math.pow((z - Math.sin(x * 0.04) * 28 + 38) / 12, 2));
    h -= channel * 2.2;
    // Wind-blown dune ripples
    h += Math.sin(x * 0.16 + z * 0.08) * 0.32;
  } else if (destId === 'venus') {
    const domes = [
      { cx: -48, cz: 28, r: 23, h: 4.1 },
      { cx: 54, cz: -46, r: 27, h: 4.8 },
      { cx: -90, cz: -70, r: 30, h: 5.0 },
    ];
    for (const dm of domes) {
      const d = Math.hypot(x - dm.cx, z - dm.cz);
      if (d < dm.r) {
        const u = 1 - (d / dm.r) * (d / dm.r);
        h += Math.pow(u, 0.45) * dm.h;
      }
    }
  } else if (destId === 'titan') {
    h += Math.sin(x * 0.055 + z * 0.03) * 1.5;
    if (z < -48) h -= 1.35 * THREE.MathUtils.smoothstep(-z, 48, 72);
  } else if (destId === 'europa') {
    const ridge1 = Math.exp(-Math.pow((x * 0.7 + z * 0.7 - 28) / 4.4, 2));
    const ridge2 = Math.exp(-Math.pow((x * -0.5 + z * 0.85 + 34) / 5.2, 2));
    const ridge3 = Math.exp(-Math.pow((x * 0.35 - z * 0.9 - 68) / 5.5, 2));
    h = h * 0.35 + ridge1 * 3.4 + ridge2 * 2.9 + ridge3 * 3.1;
  }

  // Gentle planetary horizon curvature beyond 280m so the wide world never looks like a flat slab
  const horizonDrop = distFromPad > 280 ? -Math.pow((distFromPad - 280) * 0.012, 2) * 0.45 : 0;

  return h * padFlatten + horizonDrop;
}

export function terrainNormalAt(x: number, z: number, destId: DestinationId, out: THREE.Vector3): THREE.Vector3 {
  const eps = 0.85;
  const hL = terrainHeightAt(x - eps, z, destId);
  const hR = terrainHeightAt(x + eps, z, destId);
  const hD = terrainHeightAt(x, z - eps, destId);
  const hU = terrainHeightAt(x, z + eps, destId);
  return out.set(hL - hR, 2 * eps, hD - hU).normalize();
}

function createPlanetSurfaceTexture(destId: DestinationId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const dest = DESTINATIONS[destId];

  ctx.fillStyle = dest.groundPrimaryHex;
  ctx.fillRect(0, 0, 512, 512);

  if (destId === 'moon' || destId === 'mercury') {
    // Basalt mare dark spots
    for (let i = 0; i < 40; i++) {
      const x = hash2D(i, 2.1) * 512;
      const y = hash2D(i, 4.3) * 512;
      const r = 18 + hash2D(i, 6.7) * 55;
      const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      grad.addColorStop(0, destId === 'moon' ? 'rgba(58, 63, 72, 0.55)' : 'rgba(42, 38, 35, 0.55)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crater hole spots with darker interior & bright ejecta rim
    for (let i = 0; i < 120; i++) {
      const x = hash2D(i, 9.1) * 512;
      const y = hash2D(i, 11.4) * 512;
      const r = 3 + Math.pow(hash2D(i, 13.7), 2) * 20;
      ctx.fillStyle = destId === 'moon' ? 'rgba(38, 42, 50, 0.65)' : 'rgba(28, 25, 22, 0.68)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = destId === 'moon' ? 'rgba(205, 212, 222, 0.35)' : 'rgba(155, 146, 138, 0.3)';
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.06, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (destId === 'mars') {
    // Rich red-orange iron oxide strata & wind streaks
    for (let i = 0; i < 90; i++) {
      const x = hash2D(i, 3.2) * 512;
      const y = hash2D(i, 5.4) * 512;
      const w = 35 + hash2D(i, 7.6) * 110;
      const h = 10 + hash2D(i, 8.9) * 32;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(238, 122, 54, 0.34)' : 'rgba(130, 34, 14, 0.38)';
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(251, 146, 60, 0.25)' : 'rgba(92, 28, 15, 0.28)';
      ctx.fillRect(hash2D(i, 14.1) * 512, hash2D(i, 16.3) * 512, 6, 4);
    }
  } else if (destId === 'europa') {
    // Bright white-blue ice crossed by reddish-brown hydrated salt lineae cracks
    ctx.fillStyle = '#e2ebf6';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 28; i++) {
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(140, 72, 48, 0.55)' : 'rgba(120, 145, 175, 0.4)';
      ctx.lineWidth = 1.5 + hash2D(i, 2.5) * 4;
      ctx.beginPath();
      const sx = hash2D(i, 1.1) * 512;
      const sy = hash2D(i, 3.3) * 512;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (hash2D(i, 5.5) - 0.5) * 420, sy + (hash2D(i, 7.7) - 0.5) * 420);
      ctx.stroke();
    }
  } else {
    // Venus / Titan organic & basalt mottling
    for (let i = 0; i < 110; i++) {
      const x = hash2D(i, 2.2) * 512;
      const y = hash2D(i, 4.4) * 512;
      const r = 14 + hash2D(i, 6.6) * 48;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(240, 175, 75, 0.22)' : 'rgba(65, 38, 16, 0.28)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class PlanetarySurfaceScene {
  public readonly group = new THREE.Group();
  public readonly rockColliders: RockCollider[] = [];
  private terrainMesh: THREE.Mesh | null = null;
  private terrainTex: THREE.CanvasTexture | null = null;
  private rocksMesh: THREE.InstancedMesh | null = null;
  private landingZonesGroup = new THREE.Group();
  private skyBackdropObjects = new THREE.Group();
  private sampleBeacons: THREE.Group[] = [];
  private rareBeacon: THREE.Group | null = null;

  constructor(scene: THREE.Scene) {
    this.group.visible = false;
    this.group.add(this.skyBackdropObjects);
    this.group.add(this.landingZonesGroup);
    scene.add(this.group);
  }

  public setLandingZonesVisible(visible: boolean): void {
    this.landingZonesGroup.visible = visible;
  }

  public buildForDestination(destId: DestinationId): void {
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
      this.group.remove(this.terrainMesh);
      this.terrainMesh = null;
    }
    if (this.terrainTex) {
      this.terrainTex.dispose();
      this.terrainTex = null;
    }
    if (this.rocksMesh) {
      this.rocksMesh.geometry.dispose();
      (this.rocksMesh.material as THREE.Material).dispose();
      this.group.remove(this.rocksMesh);
      this.rocksMesh = null;
    }
    while (this.skyBackdropObjects.children.length > 0) {
      this.skyBackdropObjects.remove(this.skyBackdropObjects.children[0]);
    }
    while (this.landingZonesGroup.children.length > 0) {
      this.landingZonesGroup.remove(this.landingZonesGroup.children[0]);
    }
    for (const b of this.sampleBeacons) {
      this.group.remove(b);
    }
    this.sampleBeacons = [];
    if (this.rareBeacon) {
      this.group.remove(this.rareBeacon);
      this.rareBeacon = null;
    }
    this.rockColliders.length = 0;

    const dest: DestinationConfig = DESTINATIONS[destId];

    // 1. Massive 2200m x 2200m Non-Linear Horizon Terrain Mesh (so landing NEVER looks like a small floating box!)
    const segs = 168;
    const geo = new THREE.PlaneGeometry(2, 2, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const primaryCol = new THREE.Color(dest.groundPrimaryHex);
    const secondaryCol = new THREE.Color(dest.groundSecondaryHex);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      // Non-linear radial stretch: dense precision near center, expansive 1100m horizon reach
      const nx = posAttr.getX(i); // -1..1
      const nz = posAttr.getZ(i); // -1..1
      const vx = Math.sign(nx) * (Math.abs(nx) * 180 + Math.pow(Math.abs(nx), 2.8) * 920);
      const vz = Math.sign(nz) * (Math.abs(nz) * 180 + Math.pow(Math.abs(nz), 2.8) * 920);
      const vy = terrainHeightAt(vx, vz, destId);
      posAttr.setXYZ(i, vx, vy, vz);

      const mixT = THREE.MathUtils.clamp(0.52 + vy * 0.12 + (hash2D(vx * 0.25, vz * 0.25) - 0.5) * 0.22, 0, 1);
      tmpCol.copy(secondaryCol).lerp(primaryCol, mixT);
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    this.terrainTex = createPlanetSurfaceTexture(destId);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: this.terrainTex,
      vertexColors: true,
      roughness: destId === 'europa' ? 0.34 : 0.88,
      metalness: destId === 'europa' ? 0.18 : 0.04,
    });
    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);

    // 2. Landing Safe Pad Ring (r = 24m) & Destruction Hazard Boundary Ring (r = 26m..46m)
    const safeRing = new THREE.Mesh(
      new THREE.RingGeometry(SAFE_LANDING_RADIUS - 0.9, SAFE_LANDING_RADIUS, 64),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    safeRing.rotation.x = -Math.PI / 2;
    safeRing.position.y = 0.12;
    this.landingZonesGroup.add(safeRing);

    const safeCross = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 3.9, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    safeCross.rotation.x = -Math.PI / 2;
    safeCross.position.y = 0.14;
    this.landingZonesGroup.add(safeCross);

    const hazardRing = new THREE.Mesh(
      new THREE.RingGeometry(SAFE_LANDING_RADIUS + 2.0, SAFE_LANDING_RADIUS + 4.4, 64),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.62 })
    );
    hazardRing.rotation.x = -Math.PI / 2;
    hazardRing.position.y = 0.11;
    this.landingZonesGroup.add(hazardRing);

    // 3. Instanced Real Solid Boulders / Rocks (210 physical obstacles with rockColliders!)
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: dest.rockHex,
      roughness: destId === 'europa' ? 0.3 : 0.9,
      metalness: 0.08,
    });

    const placedRocks: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rx: number; ry: number; rz: number; shade: number }[] = [];
    const allTargets = [...dest.samples, dest.rareSample];

    for (let i = 0; i < 240 && placedRocks.length < 180; i++) {
      const angle = hash2D(i, 1.7) * Math.PI * 2;
      const radius = 22 + hash2D(i, 3.1) * 160;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;

      // Keep lander pad apron (0..22m) and science sample beacons clear
      if (Math.hypot(rx, rz) < 22) continue;
      if (Math.abs(rx) < 4.5 && rz > 0 && rz < 26) continue; // clear rover rollout lane
      let tooCloseToSample = false;
      for (const s of allTargets) {
        if (Math.hypot(rx - s.x, rz - s.z) < 6.0) {
          tooCloseToSample = true;
          break;
        }
      }
      if (tooCloseToSample) continue;

      const ry = terrainHeightAt(rx, rz, destId);
      const baseScale = 0.75 + Math.pow(hash2D(i, 5.9), 2) * 2.2;
      const sx = baseScale * (0.85 + hash2D(i, 13.4) * 0.45);
      const sy = baseScale * (0.65 + hash2D(i, 15.6) * 0.4);
      const sz = baseScale * (0.85 + hash2D(i, 17.8) * 0.45);
      const colRadius = Math.max(sx, sz) * 0.72;

      this.rockColliders.push({ x: rx, z: rz, radius: colRadius });
      placedRocks.push({
        x: rx,
        y: ry + sy * 0.35,
        z: rz,
        sx,
        sy,
        sz,
        rx: hash2D(i, 7.1) * Math.PI,
        ry: hash2D(i, 9.3) * Math.PI,
        rz: hash2D(i, 11.2) * Math.PI,
        shade: 0.78 + hash2D(i, 19.1) * 0.42,
      });
    }

    this.rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, placedRocks.length);
    this.rocksMesh.castShadow = true;
    this.rocksMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const rockTint = new THREE.Color();
    for (let i = 0; i < placedRocks.length; i++) {
      const r = placedRocks[i];
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(r.rx, r.ry, r.rz);
      dummy.scale.set(r.sx, r.sy, r.sz);
      dummy.updateMatrix();
      this.rocksMesh.setMatrixAt(i, dummy.matrix);

      rockTint.set(dest.rockHex).multiplyScalar(r.shade);
      this.rocksMesh.setColorAt(i, rockTint);
    }
    this.rocksMesh.computeBoundingSphere();
    this.group.add(this.rocksMesh);

    // 4. Standard NASA Science Sample Beacons (glowing beacons)
    dest.samples.forEach((sample) => {
      const sy = terrainHeightAt(sample.x, sample.z, destId);
      const beaconGroup = new THREE.Group();
      beaconGroup.position.set(sample.x, sy, sample.z);
      beaconGroup.userData = { sampleId: sample.id };

      const rockNode = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.85, 1),
        new THREE.MeshStandardMaterial({
          color: dest.accentHex,
          roughness: 0.35,
          metalness: 0.4,
          emissive: dest.accentHex,
          emissiveIntensity: 0.4,
        })
      );
      rockNode.position.y = 0.55;
      beaconGroup.add(rockNode);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.06, 10, 32),
        new THREE.MeshBasicMaterial({ color: dest.accentHex, transparent: true, opacity: 0.8 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.25;
      beaconGroup.add(ring);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.25, 15, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: dest.accentHex,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      beam.position.y = 7.5;
      beaconGroup.add(beam);

      this.group.add(beaconGroup);
      this.sampleBeacons.push(beaconGroup);
    });

    // 5. Hidden Rare Sample Search Target (amethyst/gold crystal relic located using Rover radar!)
    const rare = dest.rareSample;
    const ry = terrainHeightAt(rare.x, rare.z, destId);
    const rareGrp = new THREE.Group();
    rareGrp.position.set(rare.x, ry, rare.z);
    rareGrp.userData = { sampleId: rare.id };

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.15, 0),
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0xa855f7,
        emissiveIntensity: 0.75,
        roughness: 0.15,
        metalness: 0.8,
      })
    );
    crystal.position.y = 1.2;
    rareGrp.add(crystal);

    const rareHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.08, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
    );
    rareHalo.rotation.x = Math.PI / 2;
    rareHalo.position.y = 0.35;
    rareGrp.add(rareHalo);

    this.group.add(rareGrp);
    this.rareBeacon = rareGrp;

    // 6. Parent Planet / Celestial Body in Sky
    if (destId === 'titan') {
      const saturnGroup = new THREE.Group();
      saturnGroup.position.set(-480, 310, -760);
      const saturn = new THREE.Mesh(
        new THREE.SphereGeometry(95, 36, 24),
        new THREE.MeshStandardMaterial({ color: 0xe3c284, roughness: 0.7 })
      );
      saturnGroup.add(saturn);
      const rings = new THREE.Mesh(
        new THREE.RingGeometry(125, 215, 48),
        new THREE.MeshBasicMaterial({
          color: 0xd9be8a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        })
      );
      rings.rotation.x = Math.PI * 0.42;
      rings.rotation.y = 0.22;
      saturnGroup.add(rings);
      this.skyBackdropObjects.add(saturnGroup);
    } else if (destId === 'europa') {
      const jupiter = new THREE.Mesh(
        new THREE.SphereGeometry(165, 40, 28),
        new THREE.MeshStandardMaterial({ color: 0xd8a878, roughness: 0.65 })
      );
      jupiter.position.set(360, 320, -720);
      this.skyBackdropObjects.add(jupiter);
    } else if (destId === 'moon') {
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(48, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.55 })
      );
      earth.position.set(-220, 280, -680);
      this.skyBackdropObjects.add(earth);
    }
  }

  public updateBeacons(time: number, collected: Set<string>): void {
    for (const b of this.sampleBeacons) {
      const id = b.userData.sampleId as string;
      const done = collected.has(id);
      b.visible = !done;
      if (!done) {
        b.children[0].rotation.y = time * 1.1;
        b.children[1].scale.setScalar(1 + Math.sin(time * 3.5) * 0.08);
      }
    }
    if (this.rareBeacon) {
      const rId = this.rareBeacon.userData.sampleId as string;
      const done = collected.has(rId);
      this.rareBeacon.visible = !done;
      if (!done) {
        this.rareBeacon.children[0].rotation.y = time * 1.6;
        this.rareBeacon.children[0].position.y = 1.2 + Math.sin(time * 2.4) * 0.22;
        this.rareBeacon.children[1].scale.setScalar(1 + Math.sin(time * 4.2) * 0.12);
      }
    }
  }
}
