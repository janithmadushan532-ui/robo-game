import * as THREE from 'three';
import { ArenaTheme, BossLevelDef } from '../types/game';
import { createArenaFloorTexture } from './textures';

export const ARENA_RADIUS = 10.2;

interface ThemeEnvConfig {
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  rimColor: number;
  ambientSky: number;
  ambientGround: number;
  accentLight: number;
  propColor: number;
}

const THEME_CONFIGS: Record<ArenaTheme, ThemeEnvConfig> = {
  volcanic: {
    skyColor: 0x160907,
    fogColor: 0x1c0b08,
    fogDensity: 0.022,
    rimColor: 0xff5722,
    ambientSky: 0xffb088,
    ambientGround: 0x3b130a,
    accentLight: 0xff4500,
    propColor: 0x2d1814,
  },
  cryo: {
    skyColor: 0x071320,
    fogColor: 0x0a1a2c,
    fogDensity: 0.02,
    rimColor: 0x38bdf8,
    ambientSky: 0xbfe8ff,
    ambientGround: 0x0f253c,
    accentLight: 0x38bdf8,
    propColor: 0x1e4e79,
  },
  storm: {
    skyColor: 0x0a0d22,
    fogColor: 0x0c1028,
    fogDensity: 0.022,
    rimColor: 0xfacc15,
    ambientSky: 0xdbeafe,
    ambientGround: 0x1a1e42,
    accentLight: 0xfde047,
    propColor: 0x1e293b,
  },
  eclipse: {
    skyColor: 0x0d0818,
    fogColor: 0x120a21,
    fogDensity: 0.023,
    rimColor: 0xa855f7,
    ambientSky: 0xe9d5ff,
    ambientGround: 0x1d1130,
    accentLight: 0xc084fc,
    propColor: 0x1e132e,
  },
  colosseum: {
    skyColor: 0x17140f,
    fogColor: 0x1e1a13,
    fogDensity: 0.018,
    rimColor: 0x84cc16,
    ambientSky: 0xfef3c7,
    ambientGround: 0x2f281d,
    accentLight: 0xa3e635,
    propColor: 0x443a2c,
  },
  crimson_spire: {
    skyColor: 0x17060d,
    fogColor: 0x1e0811,
    fogDensity: 0.022,
    rimColor: 0xf43f5e,
    ambientSky: 0xffcdd2,
    ambientGround: 0x2f0c18,
    accentLight: 0xfb7185,
    propColor: 0x33101d,
  },
  nether: {
    skyColor: 0x140406,
    fogColor: 0x1a0609,
    fogDensity: 0.024,
    rimColor: 0xef4444,
    ambientSky: 0xfca5a5,
    ambientGround: 0x2b0a0e,
    accentLight: 0xff2a2a,
    propColor: 0x290b0f,
  },
  cyber_matrix: {
    skyColor: 0x050e17,
    fogColor: 0x071420,
    fogDensity: 0.021,
    rimColor: 0x06b6d4,
    ambientSky: 0xcffafe,
    ambientGround: 0x0b2234,
    accentLight: 0x22d3ee,
    propColor: 0x0f273c,
  },
  bio_dome: {
    skyColor: 0x06150e,
    fogColor: 0x091d13,
    fogDensity: 0.021,
    rimColor: 0x10b981,
    ambientSky: 0xd1fae5,
    ambientGround: 0x0f2e1e,
    accentLight: 0x34d399,
    propColor: 0x143826,
  },
  astral: {
    skyColor: 0x07071a,
    fogColor: 0x0a0a24,
    fogDensity: 0.018,
    rimColor: 0xf59e0b,
    ambientSky: 0xfef3c7,
    ambientGround: 0x17173d,
    accentLight: 0xfbbf24,
    propColor: 0x232357,
  },
  tank_foundry: {
    skyColor: 0x131513,
    fogColor: 0x1a1c19,
    fogDensity: 0.02,
    rimColor: 0xf59e0b,
    ambientSky: 0xfde68a,
    ambientGround: 0x292524,
    accentLight: 0xf97316,
    propColor: 0x3f3f46,
  },
  neon_dojo: {
    skyColor: 0x060b18,
    fogColor: 0x091124,
    fogDensity: 0.019,
    rimColor: 0x22d3ee,
    ambientSky: 0xa5f3fc,
    ambientGround: 0x0f172a,
    accentLight: 0x06b6d4,
    propColor: 0x1e293b,
  },
  prism_lab: {
    skyColor: 0x13081c,
    fogColor: 0x1b0b29,
    fogDensity: 0.021,
    rimColor: 0xec4899,
    ambientSky: 0xfbcfe8,
    ambientGround: 0x2e1065,
    accentLight: 0xf43f5e,
    propColor: 0x3b1754,
  },
  magma_forge: {
    skyColor: 0x1a0806,
    fogColor: 0x240b08,
    fogDensity: 0.022,
    rimColor: 0xf97316,
    ambientSky: 0xfed7aa,
    ambientGround: 0x450a0a,
    accentLight: 0xff5722,
    propColor: 0x2d1612,
  },
  sky_carrier: {
    skyColor: 0x081326,
    fogColor: 0x0d1f3d,
    fogDensity: 0.016,
    rimColor: 0x38bdf8,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x1e3a8a,
    accentLight: 0x7dd3fc,
    propColor: 0x1e293b,
  },
  aegis_bunker: {
    skyColor: 0x0b101b,
    fogColor: 0x111827,
    fogDensity: 0.02,
    rimColor: 0x3b82f6,
    ambientSky: 0xbfdbfe,
    ambientGround: 0x1e293b,
    accentLight: 0x60a5fa,
    propColor: 0x334155,
  },
  goliath_dock: {
    skyColor: 0x140810,
    fogColor: 0x1e0b18,
    fogDensity: 0.019,
    rimColor: 0xf43f5e,
    ambientSky: 0xfecdd3,
    ambientGround: 0x311022,
    accentLight: 0xfb7185,
    propColor: 0x3f1d2e,
  },
  singularity_core: {
    skyColor: 0x050714,
    fogColor: 0x080b20,
    fogDensity: 0.017,
    rimColor: 0xfbbf24,
    ambientSky: 0xbae6fd,
    ambientGround: 0x1e1b4b,
    accentLight: 0x38bdf8,
    propColor: 0x1e1b4b,
  },
  shadow_wasteland: {
    skyColor: 0x0c0614,
    fogColor: 0x140a24,
    fogDensity: 0.022,
    rimColor: 0xc084fc,
    ambientSky: 0xf3e8ff,
    ambientGround: 0x1e1033,
    accentLight: 0xe879f9,
    propColor: 0x26153d,
  },
  glacier_peak: {
    skyColor: 0x061524,
    fogColor: 0x0a2238,
    fogDensity: 0.018,
    rimColor: 0x7dd3fc,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x0f2f4d,
    accentLight: 0x38bdf8,
    propColor: 0x1d4e78,
  },
  cobalt_citadel: {
    skyColor: 0x081124,
    fogColor: 0x0d1b38,
    fogDensity: 0.019,
    rimColor: 0x60a5fa,
    ambientSky: 0xdbeafe,
    ambientGround: 0x172554,
    accentLight: 0x3b82f6,
    propColor: 0x1e3a8a,
  },
  emerald_ruins: {
    skyColor: 0x071710,
    fogColor: 0x0b2418,
    fogDensity: 0.019,
    rimColor: 0x34d399,
    ambientSky: 0xd1fae5,
    ambientGround: 0x064e3b,
    accentLight: 0xa3e635,
    propColor: 0x14532d,
  },
  obsidian_throne: {
    skyColor: 0x12090f,
    fogColor: 0x1c0d17,
    fogDensity: 0.02,
    rimColor: 0xf43f5e,
    ambientSky: 0xfecdd3,
    ambientGround: 0x2b1220,
    accentLight: 0xfbbf24,
    propColor: 0x291522,
  },
  plasma_reactor: {
    skyColor: 0x070e1c,
    fogColor: 0x0b162e,
    fogDensity: 0.02,
    rimColor: 0x22d3ee,
    ambientSky: 0xa5f3fc,
    ambientGround: 0x162447,
    accentLight: 0xf43f5e,
    propColor: 0x1e293b,
  },
  thunder_plateau: {
    skyColor: 0x0b0c1f,
    fogColor: 0x121330,
    fogDensity: 0.019,
    rimColor: 0xfacc15,
    ambientSky: 0xfef9c3,
    ambientGround: 0x1e1b4b,
    accentLight: 0x38bdf8,
    propColor: 0x272752,
  },
  void_sanctum: {
    skyColor: 0x05030d,
    fogColor: 0x090517,
    fogDensity: 0.018,
    rimColor: 0xe879f9,
    ambientSky: 0xf5d0fe,
    ambientGround: 0x1e1b4b,
    accentLight: 0xfbbf24,
    propColor: 0x1d1136,
  },
  aether_skybridge: {
    skyColor: 0x061224,
    fogColor: 0x0a1c36,
    fogDensity: 0.016,
    rimColor: 0x38bdf8,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x1e3a8a,
    accentLight: 0xfbbf24,
    propColor: 0x172e54,
  },
  molten_core: {
    skyColor: 0x1a0704,
    fogColor: 0x260b06,
    fogDensity: 0.02,
    rimColor: 0xfb923c,
    ambientSky: 0xfed7aa,
    ambientGround: 0x450a0a,
    accentLight: 0xf97316,
    propColor: 0x36140c,
  },
  quantum_grid: {
    skyColor: 0x041216,
    fogColor: 0x071d24,
    fogDensity: 0.018,
    rimColor: 0x2dd4bf,
    ambientSky: 0xccfbf1,
    ambientGround: 0x115e59,
    accentLight: 0xa855f7,
    propColor: 0x134e4a,
  },
  chrono_temple: {
    skyColor: 0x140f08,
    fogColor: 0x1f170c,
    fogDensity: 0.018,
    rimColor: 0xfbbf24,
    ambientSky: 0xfef3c7,
    ambientGround: 0x451a03,
    accentLight: 0xf43f5e,
    propColor: 0x3b2c17,
  },
  titan_canyon: {
    skyColor: 0x170f0a,
    fogColor: 0x24170e,
    fogDensity: 0.019,
    rimColor: 0xf59e0b,
    ambientSky: 0xfde68a,
    ambientGround: 0x3b2313,
    accentLight: 0xf97316,
    propColor: 0x452d1d,
  },
  shadow_abyss: {
    skyColor: 0x070310,
    fogColor: 0x0e061f,
    fogDensity: 0.02,
    rimColor: 0xa855f7,
    ambientSky: 0xe9d5ff,
    ambientGround: 0x1e0b38,
    accentLight: 0xe879f9,
    propColor: 0x220f3d,
  },
  cyber_citadel: {
    skyColor: 0x040d1a,
    fogColor: 0x071830,
    fogDensity: 0.018,
    rimColor: 0x06b6d4,
    ambientSky: 0xa5f3fc,
    ambientGround: 0x0f2b4d,
    accentLight: 0x38bdf8,
    propColor: 0x16385c,
  },
  dragon_caldera: {
    skyColor: 0x1a0505,
    fogColor: 0x290808,
    fogDensity: 0.02,
    rimColor: 0xef4444,
    ambientSky: 0xfecaca,
    ambientGround: 0x450a0a,
    accentLight: 0xf97316,
    propColor: 0x381010,
  },
  storm_monolith: {
    skyColor: 0x090d21,
    fogColor: 0x10183b,
    fogDensity: 0.019,
    rimColor: 0xeab308,
    ambientSky: 0xfef08a,
    ambientGround: 0x172554,
    accentLight: 0x38bdf8,
    propColor: 0x1e2959,
  },
  glacial_throne: {
    skyColor: 0x05121f,
    fogColor: 0x081e33,
    fogDensity: 0.018,
    rimColor: 0x22d3ee,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x0c2d4a,
    accentLight: 0x7dd3fc,
    propColor: 0x164e73,
  },
  mutant_swamp: {
    skyColor: 0x061209,
    fogColor: 0x0a2110,
    fogDensity: 0.02,
    rimColor: 0x84cc16,
    ambientSky: 0xd9f99d,
    ambientGround: 0x14532d,
    accentLight: 0x34d399,
    propColor: 0x1a3d20,
  },
  cataclysm_nexus: {
    skyColor: 0x0d0209,
    fogColor: 0x1c0513,
    fogDensity: 0.017,
    rimColor: 0xf43f5e,
    ambientSky: 0xfef08a,
    ambientGround: 0x3b0724,
    accentLight: 0xfbbf24,
    propColor: 0x2b0b1e,
  },
};

export interface BuiltArena {
  group: THREE.Group;
  animatedProps: THREE.Object3D[];
  dispose: () => void;
}

export function buildArenaForLevel(
  scene: THREE.Scene,
  levelDef: BossLevelDef,
  maxAniso: number,
  enableShadows: boolean,
  isMobile = false,
): BuiltArena {
  const cfg = THEME_CONFIGS[levelDef.arenaTheme];
  scene.background = new THREE.Color(cfg.skyColor);
  scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);

  const group = new THREE.Group();
  const animatedProps: THREE.Object3D[] = [];
  const disposables: { dispose: () => void }[] = [];

  // 1. Lighting Rig (Warm Key + Cool Hemi + Accent Rim; avoid PointLight fragment cost on mobile)
  const hemi = new THREE.HemisphereLight(cfg.ambientSky, cfg.ambientGround, isMobile ? 0.98 : 0.85);
  hemi.position.set(0, 30, 0);
  group.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.9);
  keyLight.position.set(10, 18, 12);
  if (enableShadows) {
    keyLight.castShadow = true;
    const shadowRes = isMobile ? 512 : 1024;
    keyLight.shadow.mapSize.set(shadowRes, shadowRes);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 48;
    const d = 14;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  group.add(keyLight);

  const rimLight = new THREE.DirectionalLight(cfg.accentLight, isMobile ? 1.45 : 1.15);
  rimLight.position.set(-10, 10, -12);
  group.add(rimLight);

  if (!isMobile) {
    const centerUnderLight = new THREE.PointLight(cfg.accentLight, 2.2, 24, 1.5);
    centerUnderLight.position.set(0, 3.5, 0);
    group.add(centerUnderLight);
  }

  // 2. Extended Surroundings Ground Plane
  const outerGroundGeo = new THREE.CircleGeometry(95, isMobile ? 28 : 48);
  outerGroundGeo.rotateX(-Math.PI / 2);
  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: cfg.skyColor,
    roughness: 0.92,
    metalness: 0.08,
  });
  const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
  outerGround.position.y = -0.55;
  outerGround.receiveShadow = enableShadows;
  group.add(outerGround);
  disposables.push(outerGroundGeo, outerGroundMat);

  // 3. Elevated Octagonal / Circular Fighting Ring Platform
  const floorTex = createArenaFloorTexture(levelDef.arenaTheme, maxAniso);
  disposables.push(floorTex);

  const deckGeo = new THREE.CylinderGeometry(
    ARENA_RADIUS + 0.4,
    ARENA_RADIUS + 1.1,
    0.55,
    isMobile ? 24 : 32,
  );
  const deckMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.42,
    metalness: 0.35,
  });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = -0.275;
  deck.receiveShadow = enableShadows;
  group.add(deck);
  disposables.push(deckGeo, deckMat);

  // Glowing Arena Rim Bevel Ring
  const rimGeo = new THREE.TorusGeometry(ARENA_RADIUS + 0.35, 0.14, 8, isMobile ? 32 : 48);
  rimGeo.rotateX(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: cfg.rimColor,
    emissive: cfg.rimColor,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.8,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.04;
  group.add(rimMesh);
  disposables.push(rimGeo, rimMat);

  // 4. Boxing/Fighting Ring Corner Pylons & Energy Ropes (shared geometry for zero waste)
  const pylonCount = 8;
  const pylonGeo = new THREE.CylinderGeometry(0.18, 0.24, 2.35, 8);
  const pylonCapGeo = new THREE.OctahedronGeometry(0.24, 0);
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.82,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: cfg.rimColor,
    emissive: cfg.rimColor,
    emissiveIntensity: 1.25,
    transparent: true,
    opacity: 0.72,
    roughness: 0.2,
  });
  disposables.push(pylonGeo, pylonCapGeo, pylonMat, ropeMat);

  const pylonPositions: THREE.Vector3[] = [];
  for (let i = 0; i < pylonCount; i++) {
    const angle = (i / pylonCount) * Math.PI * 2 + Math.PI / 8;
    const r = ARENA_RADIUS + 0.28;
    const px = Math.cos(angle) * r;
    const pz = Math.sin(angle) * r;
    pylonPositions.push(new THREE.Vector3(px, 0, pz));

    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.set(px, 1.15, pz);
    pylon.castShadow = enableShadows && !isMobile;
    group.add(pylon);

    const cap = new THREE.Mesh(pylonCapGeo, rimMat);
    cap.position.set(px, 2.48, pz);
    group.add(cap);
    animatedProps.push(cap);
  }

  // Two tiers of energy ring ropes sharing a single cylinder geometry
  const ropeDist = pylonPositions[0].distanceTo(pylonPositions[1]);
  const sharedRopeGeo = new THREE.CylinderGeometry(0.032, 0.032, ropeDist, 6);
  sharedRopeGeo.rotateX(Math.PI / 2);
  disposables.push(sharedRopeGeo);

  const ropeHeights = [0.75, 1.45];
  for (let i = 0; i < pylonCount; i++) {
    const p1 = pylonPositions[i];
    const p2 = pylonPositions[(i + 1) % pylonCount];
    const midX = (p1.x + p2.x) * 0.5;
    const midZ = (p1.z + p2.z) * 0.5;
    const rotY = Math.atan2(p2.x - p1.x, p2.z - p1.z);

    for (const h of ropeHeights) {
      const rope = new THREE.Mesh(sharedRopeGeo, ropeMat);
      rope.position.set(midX, h, midZ);
      rope.rotation.y = rotY;
      group.add(rope);
    }
  }

  // 5. Outer Perimeter Scenery Pillars / Crystals / Rock Outcrops (shared geometries across variants)
  const outerCount = isMobile ? 10 : 14;
  const propMat = new THREE.MeshStandardMaterial({
    color: cfg.propColor,
    roughness: 0.65,
    metalness: 0.28,
  });
  const sharedCrystalGeo = new THREE.OctahedronGeometry(0.45, 0);
  disposables.push(propMat, sharedCrystalGeo);

  const t = levelDef.arenaTheme;
  const variantGeos: THREE.BufferGeometry[] = [];
  for (let v = 0; v < 4; v++) {
    const h = 4.2 + v * 2.1;
    let geo: THREE.BufferGeometry;
    if (
      t === 'cryo' ||
      t === 'glacier_peak' ||
      t === 'glacial_throne' ||
      t === 'bio_dome' ||
      t === 'mutant_swamp' ||
      t === 'astral' ||
      t === 'quantum_grid'
    ) {
      geo = new THREE.ConeGeometry(1.1, h, 6);
    } else if (
      t === 'volcanic' ||
      t === 'nether' ||
      t === 'magma_forge' ||
      t === 'obsidian_throne' ||
      t === 'molten_core' ||
      t === 'dragon_caldera' ||
      t === 'titan_canyon'
    ) {
      geo = new THREE.DodecahedronGeometry(1.4 + (v % 2) * 0.6, 0);
    } else if (
      t === 'cobalt_citadel' ||
      t === 'cyber_citadel' ||
      t === 'tank_foundry' ||
      t === 'aegis_bunker' ||
      t === 'goliath_dock' ||
      t === 'chrono_temple' ||
      t === 'storm_monolith'
    ) {
      geo = new THREE.BoxGeometry(1.4, h, 1.4);
    } else {
      geo = new THREE.CylinderGeometry(0.65, 0.95, h, 8);
    }
    variantGeos.push(geo);
    disposables.push(geo);
  }

  for (let i = 0; i < outerCount; i++) {
    const ang = (i / outerCount) * Math.PI * 2 + 0.15;
    const dist = 16.5 + (i % 3) * 3.8;
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    const variantIdx = i % 4;
    const h = 4.2 + variantIdx * 2.1;

    const mesh = new THREE.Mesh(variantGeos[variantIdx], propMat);
    mesh.position.set(
      x,
      t === 'volcanic' || t === 'magma_forge' || t === 'molten_core' || t === 'dragon_caldera'
        ? 0.5
        : h * 0.45 - 0.5,
      z,
    );
    mesh.rotation.y = ang;
    if (t === 'cryo' || t === 'glacier_peak' || t === 'glacial_throne') {
      mesh.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.14;
    }
    group.add(mesh);

    if (i % 2 === 0) {
      const crystal = new THREE.Mesh(sharedCrystalGeo, rimMat);
      crystal.position.set(x, h * 0.92 + 0.4, z);
      group.add(crystal);
      animatedProps.push(crystal);
    }
  }

  // Floating Astral / Arena Overhead Ring Halo
  const haloGeo = new THREE.TorusGeometry(ARENA_RADIUS + 2.5, 0.12, 8, isMobile ? 32 : 48);
  haloGeo.rotateX(Math.PI / 2);
  const halo = new THREE.Mesh(haloGeo, ropeMat);
  halo.position.y = 8.5;
  group.add(halo);
  animatedProps.push(halo);
  disposables.push(haloGeo);

  scene.add(group);

  return {
    group,
    animatedProps,
    dispose: () => {
      scene.remove(group);
      disposables.forEach((d) => d.dispose());
    },
  };
}
