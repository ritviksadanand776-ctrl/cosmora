import * as THREE from 'three';
import { NozzleInfo } from './rocketModel';

const MAX_PARTICLES = 640;

export class ExhaustSmokeSystem {
  public readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;

  private readonly positions = new Float32Array(MAX_PARTICLES * 3);
  private readonly velocities = new Float32Array(MAX_PARTICLES * 3);
  private readonly ages = new Float32Array(MAX_PARTICLES);
  private readonly maxAges = new Float32Array(MAX_PARTICLES);
  private readonly startSizes = new Float32Array(MAX_PARTICLES);
  private readonly endSizes = new Float32Array(MAX_PARTICLES);
  private readonly sizesAttr = new Float32Array(MAX_PARTICLES);
  private readonly alphasAttr = new Float32Array(MAX_PARTICLES);
  private readonly colorsAttr = new Float32Array(MAX_PARTICLES * 3);
  private readonly rotAttr = new Float32Array(MAX_PARTICLES);
  private readonly isEmber = new Uint8Array(MAX_PARTICLES);

  private cursor = 0;
  private emitAccumulator = 0;

  // Scratch vectors (zero GC in loop)
  private readonly _perpA = new THREE.Vector3();
  private readonly _perpB = new THREE.Vector3();
  private readonly _upRef = new THREE.Vector3(0, 1, 0);

  constructor(scene: THREE.Scene, smokeTexture: THREE.Texture) {
    this.geometry = new THREE.BufferGeometry();

    // Initialize dead particles offscreen
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.ages[i] = 999;
      this.maxAges[i] = 1;
      this.alphasAttr[i] = 0;
      this.sizesAttr[i] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizesAttr, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphasAttr, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colorsAttr, 3));
    this.geometry.setAttribute('aRotation', new THREE.BufferAttribute(this.rotAttr, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: smokeTexture },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        attribute float aRotation;

        uniform float uPixelRatio;

        varying float vAlpha;
        varying vec3 vColor;
        varying float vRotation;

        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vRotation = aRotation;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float dist = max(1.0, -mvPosition.z);
          gl_PointSize = clamp(aSize * uPixelRatio * (520.0 / dist), 0.0, 260.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;

        varying float vAlpha;
        varying vec3 vColor;
        varying float vRotation;

        void main() {
          if (vAlpha <= 0.004) discard;
          vec2 uv = gl_PointCoord - vec2(0.5);
          float c = cos(vRotation);
          float s = sin(vRotation);
          vec2 rotatedUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + vec2(0.5);
          vec4 tex = texture2D(uMap, rotatedUv);
          float outAlpha = tex.a * vAlpha;
          if (outAlpha <= 0.004) discard;
          gl_FragColor = vec4(vColor * tex.rgb, outAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
  }

  public setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio.value = ratio;
  }

  private spawnParticle(
    px: number,
    py: number,
    pz: number,
    vx: number,
    vy: number,
    vz: number,
    startSize: number,
    endSize: number,
    maxAge: number,
    r: number,
    g: number,
    b: number,
    ember: boolean
  ): void {
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;

    const i3 = idx * 3;
    this.positions[i3] = px;
    this.positions[i3 + 1] = py;
    this.positions[i3 + 2] = pz;

    this.velocities[i3] = vx;
    this.velocities[i3 + 1] = vy;
    this.velocities[i3 + 2] = vz;

    this.ages[idx] = 0;
    this.maxAges[idx] = maxAge;
    this.startSizes[idx] = startSize;
    this.endSizes[idx] = endSize;
    this.sizesAttr[idx] = startSize;
    this.alphasAttr[idx] = ember ? 0.9 : 0.72;
    this.rotAttr[idx] = Math.random() * Math.PI * 2;
    this.isEmber[idx] = ember ? 1 : 0;

    this.colorsAttr[i3] = r;
    this.colorsAttr[i3 + 1] = g;
    this.colorsAttr[i3 + 2] = b;
  }

  public update(
    dt: number,
    nozzles: NozzleInfo[],
    rocketVelWorld: THREE.Vector3,
    firing: boolean,
    throttle: number,
    atmosphereDensity: number,
    altitudeWorldY: number
  ): void {
    const clampedDt = Math.min(dt, 0.05);

    // 1. Emit directional exhaust smoke & embers strictly along -rocketForward
    if (firing && nozzles.length > 0) {
      const rate = (52 + throttle * 115) * (0.35 + 0.65 * atmosphereDensity);
      this.emitAccumulator += rate * clampedDt;

      const countToSpawn = Math.min(20, Math.floor(this.emitAccumulator));
      this.emitAccumulator -= countToSpawn;

      for (let s = 0; s < countToSpawn; s++) {
        const nozzle = nozzles[s % nozzles.length];
        const dir = nozzle.worldDir; // unit vector pointing out the nozzle (-forward)

        // Build orthonormal basis perpendicular to exhaust direction
        if (Math.abs(dir.dot(this._upRef)) < 0.92) {
          this._perpA.crossVectors(dir, this._upRef).normalize();
        } else {
          this._perpA.set(1, 0, 0).cross(dir).normalize();
        }
        this._perpB.crossVectors(dir, this._perpA).normalize();

        const spreadAngle = (Math.random() - 0.5) * 0.24;
        const spreadAngleB = (Math.random() - 0.5) * 0.24;

        // Strong exhaust ejection speed opposite to rocket nose direction (-forward)!
        const speedMag = rocketVelWorld.length();
        const exhaustSpeed = (58 + throttle * 52 + speedMag * 0.22) * (0.85 + Math.random() * 0.35);

        // Smoke & flare always blast strictly opposite to the rocket's orientation
        const vx =
          rocketVelWorld.x * 0.12 +
          dir.x * exhaustSpeed +
          this._perpA.x * spreadAngle * exhaustSpeed +
          this._perpB.x * spreadAngleB * exhaustSpeed;
        const vy =
          rocketVelWorld.y * 0.12 +
          dir.y * exhaustSpeed +
          this._perpA.y * spreadAngle * exhaustSpeed +
          this._perpB.y * spreadAngleB * exhaustSpeed;
        const vz =
          rocketVelWorld.z * 0.12 +
          dir.z * exhaustSpeed +
          this._perpA.z * spreadAngle * exhaustSpeed +
          this._perpB.z * spreadAngleB * exhaustSpeed;

        // Spawn slightly aft of the glowing core flame
        const spawnOffset = 1.1 + Math.random() * 1.4;
        const px = nozzle.worldPos.x + dir.x * spawnOffset + (Math.random() - 0.5) * nozzle.radius * 0.6;
        const py = nozzle.worldPos.y + dir.y * spawnOffset + (Math.random() - 0.5) * nozzle.radius * 0.6;
        const pz = nozzle.worldPos.z + dir.z * spawnOffset + (Math.random() - 0.5) * nozzle.radius * 0.6;

        // Near launchpad: dense bright sunlit steam/smoke; high altitude: thinner ionized vapor
        const isHotEmber = Math.random() < (nozzle.isVacuum ? 0.35 : 0.24);
        const startSize = nozzle.radius * (isHotEmber ? 1.8 : 2.7);
        const endSize = startSize * (nozzle.isVacuum ? 3.8 : 4.8) * (0.7 + 0.5 * atmosphereDensity);
        const maxAge = isHotEmber ? 0.42 + Math.random() * 0.28 : 1.7 + Math.random() * 1.3 * (0.4 + 0.6 * atmosphereDensity);

        let r = 0.93;
        let g = 0.94;
        let b = 0.96;
        if (isHotEmber) {
          if (nozzle.isVacuum) {
            r = 0.52;
            g = 0.84;
            b = 1.0;
          } else {
            r = 1.0;
            g = 0.72;
            b = 0.34;
          }
        } else if (nozzle.isVacuum) {
          r = 0.78;
          g = 0.91;
          b = 1.0;
        } else if (altitudeWorldY < 25) {
          // Warm sunlit pad steam/smoke
          r = 0.96;
          g = 0.94;
          b = 0.91;
        }

        this.spawnParticle(px, py, pz, vx, vy, vz, startSize, endSize, maxAge, r, g, b, isHotEmber);
      }
    }

    // 2. Integrate all active particles (with ground flame-trench deflection near y=0!)
    const drag = 1 - Math.min(0.9, clampedDt * (0.85 + 1.4 * atmosphereDensity));

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const age = this.ages[i];
      const maxAge = this.maxAges[i];
      if (age >= maxAge) {
        this.alphasAttr[i] = 0;
        continue;
      }

      const newAge = age + clampedDt;
      this.ages[i] = newAge;
      const t = Math.min(1, newAge / maxAge);

      const i3 = i * 3;
      let vx = this.velocities[i3] * drag;
      let vy = this.velocities[i3 + 1] * drag;
      let vz = this.velocities[i3 + 2] * drag;

      // Gentle buoyant rise for lingering smoke in dense lower air
      if (!this.isEmber[i]) {
        vy += 2.2 * atmosphereDensity * clampedDt;
      }

      let px = this.positions[i3] + vx * clampedDt;
      let py = this.positions[i3 + 1] + vy * clampedDt;
      let pz = this.positions[i3 + 2] + vz * clampedDt;

      // Launchpad Concrete Deck & Flame Trench Deflection (realistic billowing pad cloud!)
      if (py < 1.1) {
        py = 1.1 + Math.random() * 0.2;
        if (vy < 0) {
          const deflectionSpeed = Math.abs(vy) * 0.65;
          const radialLen = Math.hypot(px, pz);
          if (radialLen > 0.05) {
            vx += (px / radialLen) * deflectionSpeed;
            vz += (pz / radialLen) * deflectionSpeed;
          } else {
            const ang = Math.random() * Math.PI * 2;
            vx += Math.cos(ang) * deflectionSpeed;
            vz += Math.sin(ang) * deflectionSpeed;
          }
          vy = 1.8 + Math.random() * 2.5;
        }
      }

      this.positions[i3] = px;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = pz;

      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;

      this.rotAttr[i] += clampedDt * (i % 2 === 0 ? 0.55 : -0.55);
      this.sizesAttr[i] = THREE.MathUtils.lerp(this.startSizes[i], this.endSizes[i], Math.pow(t, 0.72));

      // Fade in quickly, linger, fade out smoothly
      const fadeIn = Math.min(1, t * 7);
      const fadeOut = Math.pow(1 - t, this.isEmber[i] ? 1.8 : 1.35);
      const baseAlpha = this.isEmber[i] ? 0.88 : (0.58 * (0.28 + 0.72 * atmosphereDensity));
      this.alphasAttr[i] = fadeIn * fadeOut * baseAlpha;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aRotation as THREE.BufferAttribute).needsUpdate = true;
  }

  public spawnExplosion(worldPos: THREE.Vector3): void {
    // Spawn 90 fiery embers + dark blast smoke radiating outward!
    for (let i = 0; i < 90; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.65;
      const speed = 8 + Math.random() * 26;
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.cos(phi) * speed * 1.15 + 4;
      const vz = Math.sin(phi) * Math.sin(theta) * speed;
      const isFire = i < 55;
      const startSize = isFire ? 2.8 + Math.random() * 2.2 : 4.2 + Math.random() * 3.0;
      const endSize = startSize * (isFire ? 2.4 : 4.2);
      const maxAge = isFire ? 0.6 + Math.random() * 0.65 : 1.6 + Math.random() * 1.4;
      const r = isFire ? 1.0 : 0.24;
      const g = isFire ? 0.35 + Math.random() * 0.45 : 0.22;
      const b = isFire ? 0.08 : 0.2;
      this.spawnParticle(
        worldPos.x + (Math.random() - 0.5) * 1.2,
        worldPos.y + 0.8 + Math.random() * 1.2,
        worldPos.z + (Math.random() - 0.5) * 1.2,
        vx,
        vy,
        vz,
        startSize,
        endSize,
        maxAge,
        r,
        g,
        b,
        isFire
      );
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aRotation as THREE.BufferAttribute).needsUpdate = true;
  }

  public reset(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.ages[i] = 999;
      this.alphasAttr[i] = 0;
    }
    this.emitAccumulator = 0;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
