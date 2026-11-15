import * as THREE from 'three';

export interface ProceduralTextures {
  hullAlbedo: THREE.CanvasTexture;
  hullBump: THREE.CanvasTexture;
  cryoAlbedo: THREE.CanvasTexture;
  foilAlbedo: THREE.CanvasTexture;
  foilBump: THREE.CanvasTexture;
  padAlbedo: THREE.CanvasTexture;
  earthAlbedo: THREE.CanvasTexture;
  smokeSprite: THREE.CanvasTexture;
  glowSprite: THREE.CanvasTexture;
  solarCellAlbedo: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Rocket Hull Albedo (aerospace white panels, black/amber roll stripes, rivets)
  const [hullC, hullCtx] = makeCanvas(512, 512);
  hullCtx.fillStyle = '#eef2f6';
  hullCtx.fillRect(0, 0, 512, 512);

  // Subtle vertical panel shading
  for (let i = 0; i < 8; i++) {
    const x = i * 64;
    hullCtx.fillStyle = i % 2 === 0 ? 'rgba(226, 232, 240, 0.45)' : 'rgba(248, 250, 252, 0.35)';
    hullCtx.fillRect(x, 0, 64, 512);
    hullCtx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
    hullCtx.lineWidth = 2;
    hullCtx.beginPath();
    hullCtx.moveTo(x, 0);
    hullCtx.lineTo(x, 512);
    hullCtx.stroke();
  }

  // Horizontal structural ring seams
  for (let y = 64; y < 512; y += 64) {
    hullCtx.strokeStyle = 'rgba(71, 85, 105, 0.32)';
    hullCtx.lineWidth = 2;
    hullCtx.beginPath();
    hullCtx.moveTo(0, y);
    hullCtx.lineTo(512, y);
    hullCtx.stroke();
  }

  // Roll-pattern telemetry checker / markings band near top
  hullCtx.fillStyle = '#1e293b';
  hullCtx.fillRect(0, 72, 512, 26);
  for (let i = 0; i < 8; i++) {
    hullCtx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#0f172a';
    hullCtx.fillRect(i * 64, 72, 64, 26);
  }
  // Amber aerospace trim stripe
  hullCtx.fillStyle = '#ea580c';
  hullCtx.fillRect(0, 112, 512, 16);

  // Rivet dots
  hullCtx.fillStyle = 'rgba(71, 85, 105, 0.35)';
  for (let y = 16; y < 512; y += 32) {
    for (let x = 8; x < 512; x += 32) {
      hullCtx.fillRect(x, y, 2, 2);
    }
  }

  const hullAlbedo = new THREE.CanvasTexture(hullC);
  hullAlbedo.colorSpace = THREE.SRGBColorSpace;
  hullAlbedo.wrapS = THREE.RepeatWrapping;
  hullAlbedo.wrapT = THREE.RepeatWrapping;
  hullAlbedo.anisotropy = maxAnisotropy;

  // 2. Hull Bump Map (panel seams & rivets)
  const [bumpC, bumpCtx] = makeCanvas(512, 512);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, 512, 512);
  bumpCtx.strokeStyle = '#404040';
  bumpCtx.lineWidth = 3;
  for (let x = 0; x < 512; x += 64) {
    bumpCtx.beginPath();
    bumpCtx.moveTo(x, 0);
    bumpCtx.lineTo(x, 512);
    bumpCtx.stroke();
  }
  for (let y = 0; y < 512; y += 64) {
    bumpCtx.beginPath();
    bumpCtx.moveTo(0, y);
    bumpCtx.lineTo(512, y);
    bumpCtx.stroke();
  }
  const hullBump = new THREE.CanvasTexture(bumpC);
  hullBump.wrapS = THREE.RepeatWrapping;
  hullBump.wrapT = THREE.RepeatWrapping;

  // 3. Cryogenic Ribbed Tank Albedo (frosted metallic-slate & copper thermal band)
  const [cryoC, cryoCtx] = makeCanvas(256, 256);
  cryoCtx.fillStyle = '#cbd5e1';
  cryoCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 12) {
    cryoCtx.fillStyle = x % 24 === 0 ? '#b8c4d4' : '#dbe4ef';
    cryoCtx.fillRect(x, 0, 6, 256);
  }
  cryoCtx.fillStyle = '#1e293b';
  cryoCtx.fillRect(0, 20, 256, 24);
  cryoCtx.fillStyle = '#f59e0b';
  cryoCtx.fillRect(0, 210, 256, 14);
  const cryoAlbedo = new THREE.CanvasTexture(cryoC);
  cryoAlbedo.colorSpace = THREE.SRGBColorSpace;
  cryoAlbedo.wrapS = THREE.RepeatWrapping;
  cryoAlbedo.wrapT = THREE.RepeatWrapping;
  cryoAlbedo.anisotropy = maxAnisotropy;

  // 4. Gold MLI Foil Texture (spacecraft thermal blanket)
  const [foilC, foilCtx] = makeCanvas(256, 256);
  const [foilBumpC, foilBumpCtx] = makeCanvas(256, 256);
  foilCtx.fillStyle = '#d49a1a';
  foilCtx.fillRect(0, 0, 256, 256);
  foilBumpCtx.fillStyle = '#808080';
  foilBumpCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const s = 6 + Math.random() * 18;
    const shade = Math.random();
    foilCtx.fillStyle = shade > 0.5 ? 'rgba(253, 224, 71, 0.25)' : 'rgba(146, 64, 14, 0.28)';
    foilCtx.beginPath();
    foilCtx.moveTo(x, y);
    foilCtx.lineTo(x + s, y + (Math.random() - 0.5) * s);
    foilCtx.lineTo(x + s * 0.5, y + s);
    foilCtx.closePath();
    foilCtx.fill();

    const g = Math.floor(80 + shade * 140);
    foilBumpCtx.fillStyle = `rgb(${g},${g},${g})`;
    foilBumpCtx.beginPath();
    foilBumpCtx.moveTo(x, y);
    foilBumpCtx.lineTo(x + s, y + (Math.random() - 0.5) * s);
    foilBumpCtx.lineTo(x + s * 0.5, y + s);
    foilBumpCtx.closePath();
    foilBumpCtx.fill();
  }
  const foilAlbedo = new THREE.CanvasTexture(foilC);
  foilAlbedo.colorSpace = THREE.SRGBColorSpace;
  foilAlbedo.anisotropy = maxAnisotropy;
  const foilBump = new THREE.CanvasTexture(foilBumpC);

  // 5. Launch Pad Concrete Deck Texture
  const [padC, padCtx] = makeCanvas(512, 512);
  padCtx.fillStyle = '#475569';
  padCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) {
    const v = 58 + Math.floor(Math.random() * 35);
    padCtx.fillStyle = `rgba(${v}, ${v + 4}, ${v + 10}, 0.35)`;
    padCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  // Concrete slab grid
  padCtx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  padCtx.lineWidth = 2;
  for (let g = 0; g <= 512; g += 64) {
    padCtx.beginPath();
    padCtx.moveTo(g, 0);
    padCtx.lineTo(g, 512);
    padCtx.stroke();
    padCtx.beginPath();
    padCtx.moveTo(0, g);
    padCtx.lineTo(512, g);
    padCtx.stroke();
  }
  // Center scorch blast halo
  const scorch = padCtx.createRadialGradient(256, 256, 12, 256, 256, 145);
  scorch.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
  scorch.addColorStop(0.5, 'rgba(30, 41, 59, 0.45)');
  scorch.addColorStop(1, 'rgba(30, 41, 59, 0)');
  padCtx.fillStyle = scorch;
  padCtx.fillRect(0, 0, 512, 512);

  // Yellow hazard ring around pad center
  padCtx.strokeStyle = '#f59e0b';
  padCtx.lineWidth = 6;
  padCtx.setLineDash([18, 12]);
  padCtx.beginPath();
  padCtx.arc(256, 256, 118, 0, Math.PI * 2);
  padCtx.stroke();
  padCtx.setLineDash([]);

  const padAlbedo = new THREE.CanvasTexture(padC);
  padAlbedo.colorSpace = THREE.SRGBColorSpace;
  padAlbedo.anisotropy = maxAnisotropy;

  // 6. Earth Curved Surface Albedo (deep ocean, coastal shelf, continents, cloud bands)
  const [earthC, earthCtx] = makeCanvas(1024, 512);
  const oceanGrad = earthCtx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, '#1e3a5f');
  oceanGrad.addColorStop(0.25, '#0b3b6e');
  oceanGrad.addColorStop(0.5, '#0a4a85');
  oceanGrad.addColorStop(0.75, '#0b3b6e');
  oceanGrad.addColorStop(1, '#1e3a5f');
  earthCtx.fillStyle = oceanGrad;
  earthCtx.fillRect(0, 0, 1024, 512);

  // Continents / landmasses
  const drawContinent = (cx: number, cy: number, rx: number, ry: number, color: string) => {
    earthCtx.fillStyle = color;
    for (let i = 0; i < 38; i++) {
      const ox = cx + (Math.sin(i * 1.9 + cx) * 0.55) * rx;
      const oy = cy + (Math.cos(i * 2.3 + cy) * 0.55) * ry;
      const r = 14 + ((i * 17) % 36);
      earthCtx.beginPath();
      earthCtx.ellipse(ox, oy, r * 1.4, r, i * 0.4, 0, Math.PI * 2);
      earthCtx.fill();
    }
  };
  drawContinent(260, 210, 120, 75, '#2f6b47');
  drawContinent(285, 225, 70, 45, '#8c7a4b');
  drawContinent(540, 190, 145, 95, '#3b734e');
  drawContinent(590, 240, 85, 55, '#a88c56');
  drawContinent(790, 260, 110, 80, '#2e6543');
  drawContinent(130, 320, 95, 65, '#3d7452');

  // Atmospheric cloud swirls
  for (let c = 0; c < 110; c++) {
    const x = Math.random() * 1024;
    const y = 40 + Math.random() * 432;
    const w = 45 + Math.random() * 120;
    const h = 8 + Math.random() * 18;
    const g = earthCtx.createRadialGradient(x, y, 2, x, y, w * 0.5);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    earthCtx.fillStyle = g;
    earthCtx.beginPath();
    earthCtx.ellipse(x, y, w, h, (Math.random() - 0.5) * 0.35, 0, Math.PI * 2);
    earthCtx.fill();
  }
  const earthAlbedo = new THREE.CanvasTexture(earthC);
  earthAlbedo.colorSpace = THREE.SRGBColorSpace;
  earthAlbedo.wrapS = THREE.RepeatWrapping;
  earthAlbedo.anisotropy = maxAnisotropy;

  // 7. Soft Multi-Lobe Smoke Puff Sprite Texture (smooth volumetric alpha, zero faceted edges)
  const [smokeC, smokeCtx] = makeCanvas(128, 128);
  smokeCtx.clearRect(0, 0, 128, 128);
  const lobes = [
    { x: 64, y: 64, r: 54, a: 0.45 },
    { x: 48, y: 54, r: 34, a: 0.35 },
    { x: 80, y: 56, r: 32, a: 0.35 },
    { x: 56, y: 78, r: 34, a: 0.3 },
    { x: 76, y: 76, r: 30, a: 0.3 },
  ];
  for (const lobe of lobes) {
    const grad = smokeCtx.createRadialGradient(lobe.x, lobe.y, 2, lobe.x, lobe.y, lobe.r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${lobe.a})`);
    grad.addColorStop(0.5, `rgba(240, 245, 252, ${lobe.a * 0.55})`);
    grad.addColorStop(1, 'rgba(240, 245, 252, 0)');
    smokeCtx.fillStyle = grad;
    smokeCtx.beginPath();
    smokeCtx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
    smokeCtx.fill();
  }
  const smokeSprite = new THREE.CanvasTexture(smokeC);
  smokeSprite.colorSpace = THREE.SRGBColorSpace;

  // 8. Soft Additive Glow Sprite (Mach diamonds / stars / sun halo)
  const [glowC, glowCtx] = makeCanvas(128, 128);
  const glowGrad = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 62);
  glowGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  glowGrad.addColorStop(0.22, 'rgba(255, 238, 190, 0.85)');
  glowGrad.addColorStop(0.55, 'rgba(251, 146, 60, 0.28)');
  glowGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
  glowCtx.fillStyle = glowGrad;
  glowCtx.fillRect(0, 0, 128, 128);
  const glowSprite = new THREE.CanvasTexture(glowC);
  glowSprite.colorSpace = THREE.SRGBColorSpace;

  // 9. Solar Array Cell Grid Texture
  const [solC, solCtx] = makeCanvas(256, 128);
  solCtx.fillStyle = '#0f254f';
  solCtx.fillRect(0, 0, 256, 128);
  solCtx.strokeStyle = '#60a5fa';
  solCtx.lineWidth = 1.5;
  for (let x = 0; x <= 256; x += 32) {
    solCtx.beginPath();
    solCtx.moveTo(x, 0);
    solCtx.lineTo(x, 128);
    solCtx.stroke();
  }
  for (let y = 0; y <= 128; y += 32) {
    solCtx.beginPath();
    solCtx.moveTo(0, y);
    solCtx.lineTo(256, y);
    solCtx.stroke();
  }
  const solarCellAlbedo = new THREE.CanvasTexture(solC);
  solarCellAlbedo.colorSpace = THREE.SRGBColorSpace;
  solarCellAlbedo.anisotropy = maxAnisotropy;

  return {
    hullAlbedo,
    hullBump,
    cryoAlbedo,
    foilAlbedo,
    foilBump,
    padAlbedo,
    earthAlbedo,
    smokeSprite,
    glowSprite,
    solarCellAlbedo,
    dispose: () => {
      hullAlbedo.dispose();
      hullBump.dispose();
      cryoAlbedo.dispose();
      foilAlbedo.dispose();
      foilBump.dispose();
      padAlbedo.dispose();
      earthAlbedo.dispose();
      smokeSprite.dispose();
      glowSprite.dispose();
      solarCellAlbedo.dispose();
    },
  };
}
