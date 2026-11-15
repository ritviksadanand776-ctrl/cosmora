import * as THREE from 'three';
import { DESTINATIONS, DestinationConfig, DestinationId } from '../types/mission';

function hash2D(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Deterministic NASA-inspired terrain heightfield per planet.
 * Keeps a gentle flat landing apron near (0, 0) for safe touchdown & rover deployment.
 */
export function terrainHeightAt(x: number, z: number, destId: DestinationId): number {
  const distFromPad = Math.hypot(x, z);
  const padFlatten = THREE.MathUtils.smoothstep(distFromPad, 8, 22);

  // Multi-octave undulating terrain waves
  let h =
    Math.sin(x * 0.032) * Math.cos(z * 0.028) * 2.2 +
    Math.sin(x * 0.085 + 1.2) * Math.sin(z * 0.075) * 0.85;

  // Planet-specific geological features from NASA altimetry profiles
  if (destId === 'moon' || destId === 'mercury') {
    // Impact craters with raised ejecta rims & concave bowls
    const craters = [
      { cx: 48, cz: -38, r: 19, depth: 3.4 },
      { cx: -56, cz: 42, r: 24, depth: 4.1 },
      { cx: 28, cz: 62, r: 16, depth: 2.8 },
      { cx: -40, cz: -54, r: 21, depth: 3.6 },
      { cx: 88, cz: 15, r: 30, depth: 5.0 },
    ];
    for (const c of craters) {
      const d = Math.hypot(x - c.cx, z - c.cz);
      if (d < c.r * 1.35) {
        const t = d / c.r;
        if (t < 0.85) {
          h -= c.depth * (1 - (t / 0.85) * (t / 0.85));
        } else {
          const rimT = (t - 0.85) / 0.5;
          h += Math.sin(rimT * Math.PI) * (c.depth * 0.34);
        }
      }
    }
    if (destId === 'mercury') {
      // Lobate thrust scarp ridge
      h += Math.tanh((x + z * 0.4 - 45) * 0.08) * 3.2;
    }
  } else if (destId === 'mars') {
    // Jezero Crater sedimentary delta terraces & shallow wind-carved channels
    const mesa = Math.max(0, Math.sin(x * 0.04 + 0.5) * Math.cos(z * 0.04 - 0.3));
    h += Math.floor(mesa * 4) * 0.55 + mesa * 1.6;
    const channel = Math.exp(-Math.pow((z - Math.sin(x * 0.045) * 24 + 34) / 11, 2));
    h -= channel * 2.1;
  } else if (destId === 'venus') {
    // Volcanic pancake domes + tessera ridges
    const domes = [
      { cx: -46, cz: 26, r: 22, h: 3.8 },
      { cx: 52, cz: -44, r: 26, h: 4.5 },
    ];
    for (const dm of domes) {
      const d = Math.hypot(x - dm.cx, z - dm.cz);
      if (d < dm.r) {
        const u = 1 - (d / dm.r) * (d / dm.r);
        h += Math.pow(u, 0.45) * dm.h;
      }
    }
  } else if (destId === 'titan') {
    // Smooth organic tholin dunes & low methane shoreline basin
    h += Math.sin(x * 0.06 + z * 0.03) * 1.4;
    if (z < -42) h -= 1.2 * THREE.MathUtils.smoothstep(-z, 42, 65);
  } else if (destId === 'europa') {
    // Double-ridge ice lineae bands crisscrossing smooth ice plains
    const ridge1 = Math.exp(-Math.pow((x * 0.7 + z * 0.7 - 26) / 4.2, 2));
    const ridge2 = Math.exp(-Math.pow((x * -0.5 + z * 0.85 + 32) / 5.0, 2));
    h = h * 0.35 + ridge1 * 3.4 + ridge2 * 2.8;
  }

  return h * padFlatten;
}

export function terrainNormalAt(x: number, z: number, destId: DestinationId, out: THREE.Vector3): THREE.Vector3 {
  const eps = 0.6;
  const hL = terrainHeightAt(x - eps, z, destId);
  const hR = terrainHeightAt(x + eps, z, destId);
  const hD = terrainHeightAt(x, z - eps, destId);
  const hU = terrainHeightAt(x, z + eps, destId);
  return out.set(hL - hR, 2 * eps, hD - hU).normalize();
}

export class PlanetarySurfaceScene {
  public readonly group = new THREE.Group();
  private terrainMesh: THREE.Mesh | null = null;
  private rocksMesh: THREE.InstancedMesh | null = null;
  private skyBackdropObjects = new THREE.Group();
  private sampleBeacons: THREE.Group[] = [];
  private collectedIds = new Set<string>();

  constructor(scene: THREE.Scene) {
    this.group.visible = false;
    this.group.add(this.skyBackdropObjects);
    scene.add(this.group);
  }

  public buildForDestination(destId: DestinationId): void {
    // Clean previous surface meshes
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
      this.group.remove(this.terrainMesh);
      this.terrainMesh = null;
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
    for (const b of this.sampleBeacons) {
      this.group.remove(b);
    }
    this.sampleBeacons = [];
    this.collectedIds.clear();

    const dest: DestinationConfig = DESTINATIONS[destId];

    // 1. Displaced NASA-Altimetry Terrain Mesh (420x420m)
    const size = 420;
    const segs = 136;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const primaryCol = new THREE.Color(dest.groundPrimaryHex);
    const secondaryCol = new THREE.Color(dest.groundSecondaryHex);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = terrainHeightAt(vx, vz, destId);
      posAttr.setY(i, vy);

      // Blend primary & secondary geological strata colors by elevation & micro-noise
      const mixT = THREE.MathUtils.clamp(0.45 + vy * 0.14 + (hash2D(vx * 0.3, vz * 0.3) - 0.5) * 0.25, 0, 1);
      tmpCol.copy(secondaryCol).lerp(primaryCol, mixT);
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: destId === 'europa' ? 0.34 : 0.88,
      metalness: destId === 'europa' ? 0.18 : 0.04,
    });
    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);

    // 2. Instanced Geological Boulders / Ice Blocks (220 pieces)
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: dest.rockHex,
      roughness: destId === 'europa' ? 0.3 : 0.9,
      metalness: 0.08,
    });
    const rockCount = 220;
    this.rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    this.rocksMesh.castShadow = true;
    this.rocksMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const rockTint = new THREE.Color();
    for (let i = 0; i < rockCount; i++) {
      const angle = hash2D(i, 1.7) * Math.PI * 2;
      const radius = 14 + hash2D(i, 3.1) * 165;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;
      const ry = terrainHeightAt(rx, rz, destId);

      const baseScale = 0.35 + Math.pow(hash2D(i, 5.9), 2) * 2.4;
      dummy.position.set(rx, ry + baseScale * 0.3, rz);
      dummy.rotation.set(hash2D(i, 7.1) * Math.PI, hash2D(i, 9.3) * Math.PI, hash2D(i, 11.2) * Math.PI);
      dummy.scale.set(
        baseScale * (0.8 + hash2D(i, 13.4) * 0.5),
        baseScale * (0.55 + hash2D(i, 15.6) * 0.45),
        baseScale * (0.8 + hash2D(i, 17.8) * 0.5)
      );
      dummy.updateMatrix();
      this.rocksMesh.setMatrixAt(i, dummy.matrix);

      const shade = 0.8 + hash2D(i, 19.1) * 0.4;
      rockTint.set(dest.rockHex).multiplyScalar(shade);
      this.rocksMesh.setColorAt(i, rockTint);
    }
    this.rocksMesh.computeBoundingSphere();
    this.group.add(this.rocksMesh);

    // 3. NASA Science Sample Beacons (glowing target pillars for Rover exploration)
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
          emissiveIntensity: 0.35,
        })
      );
      rockNode.position.y = 0.55;
      beaconGroup.add(rockNode);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.06, 10, 32),
        new THREE.MeshBasicMaterial({ color: dest.accentHex, transparent: true, opacity: 0.75 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.25;
      beaconGroup.add(ring);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.25, 14, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: dest.accentHex,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      beam.position.y = 7.2;
      beaconGroup.add(beam);

      this.group.add(beaconGroup);
      this.sampleBeacons.push(beaconGroup);
    });

    // 4. Parent Planet / Celestial Body in Sky (Saturn on Titan, Jupiter on Europa, Earth on Moon)
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
          opacity: 0.42,
        })
      );
      rings.rotation.x = Math.PI * 0.42;
      rings.rotation.y = 0.22;
      saturnGroup.add(rings);
      this.skyBackdropObjects.add(saturnGroup);
    } else if (destId === 'europa') {
      const jupiter = new THREE.Mesh(
        new THREE.SphereGeometry(160, 40, 28),
        new THREE.MeshStandardMaterial({ color: 0xd8a878, roughness: 0.65 })
      );
      jupiter.position.set(360, 320, -720);
      this.skyBackdropObjects.add(jupiter);
    } else if (destId === 'moon') {
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(46, 32, 24),
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
  }
}
