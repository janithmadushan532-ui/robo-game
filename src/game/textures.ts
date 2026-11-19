import * as THREE from 'three';
import { ArenaTheme } from '../types/game';

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createParticleGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.75)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.18)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBrushedArmorTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const shade = 135 + Math.floor(Math.random() * 55);
    ctx.fillStyle = `rgb(${shade},${shade},${shade + 6})`;
    ctx.fillRect(0, y, size, 1);
  }
  // Subtle panel seam lines
  ctx.strokeStyle = 'rgba(30,41,59,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, size - 16, size - 16);
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

const THEME_PALETTES: Record<ArenaTheme, { base: string; grid: string; accent: string; ring: string }> = {
  volcanic: { base: '#1e110d', grid: '#3b1c14', accent: '#ff5722', ring: '#fb923c' },
  cryo: { base: '#0c1b2e', grid: '#16324f', accent: '#38bdf8', ring: '#bae6fd' },
  storm: { base: '#111329', grid: '#1e224a', accent: '#facc15', ring: '#fde047' },
  eclipse: { base: '#120c1d', grid: '#241838', accent: '#a855f7', ring: '#d8b4fe' },
  colosseum: { base: '#211c16', grid: '#382f25', accent: '#84cc16', ring: '#bef264' },
  crimson_spire: { base: '#1e0910', grid: '#381220', accent: '#f43f5e', ring: '#fda4af' },
  nether: { base: '#180709', grid: '#310e13', accent: '#ef4444', ring: '#fca5a5' },
  cyber_matrix: { base: '#08131f', grid: '#0f2740', accent: '#06b6d4', ring: '#67e8f9' },
  bio_dome: { base: '#091b12', grid: '#123624', accent: '#10b981', ring: '#6ee7b7' },
  astral: { base: '#0d0d24', grid: '#1b1b47', accent: '#f59e0b', ring: '#fde68a' },
  tank_foundry: { base: '#1b1d1b', grid: '#313630', accent: '#f59e0b', ring: '#fbbf24' },
  neon_dojo: { base: '#0a1022', grid: '#152347', accent: '#22d3ee', ring: '#67e8f9' },
  prism_lab: { base: '#1a0c24', grid: '#311745', accent: '#ec4899', ring: '#f9a8d4' },
  magma_forge: { base: '#220b09', grid: '#401511', accent: '#f97316', ring: '#fdba74' },
  sky_carrier: { base: '#0b182e', grid: '#152e57', accent: '#38bdf8', ring: '#e0f2fe' },
  aegis_bunker: { base: '#111827', grid: '#1f2937', accent: '#3b82f6', ring: '#93c5fd' },
  goliath_dock: { base: '#1c0b16', grid: '#331428', accent: '#f43f5e', ring: '#fda4af' },
  singularity_core: { base: '#07091a', grid: '#11163b', accent: '#fbbf24', ring: '#38bdf8' },
  shadow_wasteland: { base: '#110a1a', grid: '#241438', accent: '#c084fc', ring: '#e879f9' },
  glacier_peak: { base: '#091a2a', grid: '#143857', accent: '#7dd3fc', ring: '#e0f2fe' },
  cobalt_citadel: { base: '#0c182e', grid: '#162c54', accent: '#60a5fa', ring: '#93c5fd' },
  emerald_ruins: { base: '#0a1c14', grid: '#153827', accent: '#34d399', ring: '#a3e635' },
  obsidian_throne: { base: '#140c12', grid: '#281623', accent: '#f43f5e', ring: '#fbbf24' },
  plasma_reactor: { base: '#0a1324', grid: '#13274a', accent: '#22d3ee', ring: '#f43f5e' },
  thunder_plateau: { base: '#14142b', grid: '#272752', accent: '#facc15', ring: '#7dd3fc' },
  void_sanctum: { base: '#070512', grid: '#140c2e', accent: '#e879f9', ring: '#fbbf24' },
  aether_skybridge: { base: '#09182c', grid: '#123257', accent: '#38bdf8', ring: '#fbbf24' },
  molten_core: { base: '#210a06', grid: '#42150c', accent: '#fb923c', ring: '#facc15' },
  quantum_grid: { base: '#05151a', grid: '#0c303a', accent: '#2dd4bf', ring: '#a855f7' },
  chrono_temple: { base: '#19140c', grid: '#332818', accent: '#fbbf24', ring: '#f43f5e' },
  titan_canyon: { base: '#1e150e', grid: '#3d2a1b', accent: '#f59e0b', ring: '#fbbf24' },
  shadow_abyss: { base: '#0a0514', grid: '#1b0b33', accent: '#a855f7', ring: '#e879f9' },
  cyber_citadel: { base: '#061224', grid: '#0d264a', accent: '#06b6d4', ring: '#38bdf8' },
  dragon_caldera: { base: '#210707', grid: '#450e0e', accent: '#ef4444', ring: '#fb923c' },
  storm_monolith: { base: '#0d1129', grid: '#1b2454', accent: '#eab308', ring: '#60a5fa' },
  glacial_throne: { base: '#061729', grid: '#0d3154', accent: '#22d3ee', ring: '#e0f2fe' },
  mutant_swamp: { base: '#081a0c', grid: '#11381b', accent: '#84cc16', ring: '#34d399' },
  cataclysm_nexus: { base: '#14040e', grid: '#2e0820', accent: '#f43f5e', ring: '#fbbf24' },
};

export function createArenaFloorTexture(theme: ArenaTheme, maxAniso: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pal = THEME_PALETTES[theme];
  const cx = size / 2;
  const cy = size / 2;

  // Radial arena floor gradient
  const bgGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, size * 0.52);
  bgGrad.addColorStop(0, pal.grid);
  bgGrad.addColorStop(0.65, pal.base);
  bgGrad.addColorStop(1, '#05070c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle hex / combat tile grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Concentric fighting ring circles
  ctx.strokeStyle = pal.accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.43, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = pal.ring;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
  ctx.stroke();

  // Center science atom / duel emblem
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 4;
  for (let a = 0; a < 3; a++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((a * Math.PI) / 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.11, size * 0.04, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Radial combat sector spokes
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * size * 0.14, cy + Math.sin(ang) * size * 0.14);
    ctx.lineTo(cx + Math.cos(ang) * size * 0.43, cy + Math.sin(ang) * size * 0.43);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}
