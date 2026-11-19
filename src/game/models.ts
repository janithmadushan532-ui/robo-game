import * as THREE from 'three';
import { BossLevelDef, EnemyUnitSpec } from '../types/game';

export type FighterAnimState =
  | 'idle'
  | 'move'
  | 'attack_normal'
  | 'attack_kick'
  | 'attack_heavy'
  | 'jump'
  | 'dodge'
  | 'block'
  | 'cast_power'
  | 'ultimate'
  | 'hitstun'
  | 'victory'
  | 'defeat';

export interface ArticulatedFighterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  shieldDome?: THREE.Mesh;
  coreMesh: THREE.Mesh;
  wingsGroup?: THREE.Group;
  baseEmissive: number;
  isBoss: boolean;
  scaleFactor: number;
  hoverBaseY: number;
  flashMaterials: THREE.MeshStandardMaterial[];
  dispose: () => void;
}

function enableShadows(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function disposeHierarchy(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => materials.add(m));
      } else if (mesh.material) {
        materials.add(mesh.material);
      }
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

/**
 * Builds an articulated 11-part Cyber-Science Paladin Player Model.
 * Bottom-center pivot at y = 0.
 */
export function createPlayerFighterRig(armorMap?: THREE.Texture): ArticulatedFighterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const flashMaterials: THREE.MeshStandardMaterial[] = [];

  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.62,
    metalness: 0.28,
    bumpMap: armorMap ?? null,
    bumpScale: 0.015,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.24,
    metalness: 0.78,
    bumpMap: armorMap ?? null,
    bumpScale: 0.012,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.88,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x00e5ff,
    emissiveIntensity: 1.6,
    roughness: 0.15,
    metalness: 0.1,
  });

  flashMaterials.push(suitMat, plateMat, trimMat);

  // Legs (pivoted at hip y = 0.95)
  const makeLeg = (xOffset: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOffset, 0.95, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 6, 12), suitMat);
    thigh.position.y = -0.24;
    legGroup.add(thigh);

    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.22), plateMat);
    kneePad.position.set(0, -0.45, 0.05);
    legGroup.add(kneePad);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.42, 10), plateMat);
    shin.position.y = -0.68;
    legGroup.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.34), trimMat);
    boot.position.set(0, -0.88, 0.06);
    legGroup.add(boot);

    return legGroup;
  };

  const leftLeg = makeLeg(-0.22);
  const rightLeg = makeLeg(0.22);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso (pivoted at waist y = 0.95)
  const torso = new THREE.Group();
  torso.position.set(0, 0.95, 0);
  bodyGroup.add(torso);

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.22, 10), suitMat);
  pelvis.position.y = 0.08;
  torso.add(pelvis);

  const chestShape = new THREE.Shape();
  chestShape.moveTo(-0.34, 0);
  chestShape.lineTo(0.34, 0);
  chestShape.lineTo(0.42, 0.56);
  chestShape.lineTo(0.2, 0.68);
  chestShape.lineTo(-0.2, 0.68);
  chestShape.lineTo(-0.42, 0.56);
  chestShape.closePath();

  const chestGeo = new THREE.ExtrudeGeometry(chestShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  chestGeo.center();
  const chestMesh = new THREE.Mesh(chestGeo, plateMat);
  chestMesh.position.set(0, 0.46, 0);
  torso.add(chestMesh);

  const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 1), coreMat);
  coreMesh.position.set(0, 0.5, 0.22);
  torso.add(coreMesh);

  const packL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.16), trimMat);
  packL.position.set(-0.18, 0.52, -0.24);
  packL.rotation.z = 0.18;
  const packR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.16), trimMat);
  packR.position.set(0.18, 0.52, -0.24);
  packR.rotation.z = -0.18;
  torso.add(packL, packR);

  const head = new THREE.Group();
  head.position.set(0, 0.88, 0);
  torso.add(head);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), trimMat);
  helmet.scale.set(0.95, 1.08, 1.05);
  helmet.position.y = 0.18;
  head.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.11, 0.2), coreMat);
  visor.position.set(0, 0.19, 0.13);
  head.add(visor);

  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 6), plateMat);
  crest.position.set(0, 0.42, -0.04);
  crest.rotation.x = -0.35;
  head.add(crest);

  const makeArm = (side: -1 | 1) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.48, 0.72, 0);

    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65),
      plateMat,
    );
    pauldron.rotation.z = -side * 0.35;
    armGroup.add(pauldron);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.24, 5, 10), suitMat);
    upperArm.position.y = -0.18;
    armGroup.add(upperArm);

    const gauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.34, 8), plateMat);
    gauntlet.position.y = -0.45;
    armGroup.add(gauntlet);

    const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), coreMat);
    fist.position.y = -0.66;
    armGroup.add(fist);

    return armGroup;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  torso.add(leftArm, rightArm);

  const shieldGeo = new THREE.IcosahedronGeometry(1.35, 1);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x60a5fa,
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.28,
    wireframe: true,
  });
  const shieldDome = new THREE.Mesh(shieldGeo, shieldMat);
  shieldDome.position.set(0, 1.15, 0);
  shieldDome.visible = false;
  root.add(shieldDome);

  enableShadows(bodyGroup);

  return {
    root,
    bodyGroup,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shieldDome,
    coreMesh,
    baseEmissive: 0x00e5ff,
    isBoss: false,
    scaleFactor: 1,
    hoverBaseY: 0,
    flashMaterials,
    dispose: () => disposeHierarchy(root),
  };
}

/**
 * Builds unique 9–14 part articulated Monster & Boss Robot Models across all 35 archetypes.
 */
export function createBossFighterRig(
  spec: BossLevelDef | EnemyUnitSpec,
  armorMap?: THREE.Texture,
): ArticulatedFighterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const s = spec.scale;
  bodyGroup.scale.setScalar(s);
  root.add(bodyGroup);

  const flashMaterials: THREE.MeshStandardMaterial[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: spec.primaryColor,
    roughness: 0.72,
    metalness: 0.22,
    bumpMap: armorMap ?? null,
    bumpScale: 0.025,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: spec.secondaryColor,
    roughness: 0.28,
    metalness: 0.75,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: spec.emissiveColor,
    emissive: spec.emissiveColor,
    emissiveIntensity: 1.9,
    roughness: 0.15,
    metalness: 0.1,
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.35,
    metalness: 0.65,
  });

  flashMaterials.push(bodyMat, armorMat, hornMat);

  const arch = spec.archetype;
  const isFlying =
    arch === 'flying_bot' ||
    arch === 'sky_harpy' ||
    arch === 'flying_wyvern' ||
    arch === 'aero_interceptor' ||
    arch === 'cryo_valkyrie' ||
    arch === 'sky_emperor_boss' ||
    arch === 'fire_dragon_monster';
  const hoverBaseY =
    arch === 'aero_interceptor' || arch === 'sky_emperor_boss'
      ? 0.72
      : isFlying
        ? 0.62
        : arch === 'void_reaper' || arch === 'stealth_phantom' || arch === 'dark_shadow_beast'
          ? 0.35
          : 0;

  // Archetype-specific Legs
  const makeBossLeg = (xOffset: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOffset, 1.05, 0);

    if (
      arch === 'heavy_tank' ||
      arch === 'armored_juggernaut' ||
      arch === 'titan_warden' ||
      arch === 'armored_destroyer' ||
      arch === 'mega_robot_warrior'
    ) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.84), hornMat);
      tread.position.set(0, -0.75, 0.05);
      leg.add(tread);
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.5, 8), armorMat);
      piston.position.y = -0.26;
      leg.add(piston);
    } else if (
      arch === 'fast_ninja' ||
      arch === 'fast_raptor' ||
      arch === 'volt_sprinter' ||
      arch === 'stealth_phantom' ||
      arch === 'dark_shadow_beast' ||
      arch === 'thunder_beast'
    ) {
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 4, 8), bodyMat);
      thigh.position.y = -0.25;
      leg.add(thigh);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.48, 8), armorMat);
      shin.position.y = -0.68;
      leg.add(shin);
      const bladeFoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.46), glowMat);
      bladeFoot.position.set(0, -0.94, 0.1);
      leg.add(bladeFoot);
    } else {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.52, 10), bodyMat);
      thigh.position.y = -0.26;
      leg.add(thigh);

      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.48, 8), armorMat);
      shin.position.y = -0.68;
      leg.add(shin);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.46), hornMat);
      foot.position.set(0, -0.95, 0.08);
      leg.add(foot);
    }

    return leg;
  };

  const legSpread =
    arch === 'heavy_tank' ||
    arch === 'giant_boss' ||
    arch === 'armored_juggernaut' ||
    arch === 'giant_titan' ||
    arch === 'titan_warden' ||
    arch === 'colossal_titan_beast' ||
    arch === 'ice_giant_colossus' ||
    arch === 'armored_destroyer' ||
    arch === 'mega_robot_warrior' ||
    arch === 'cataclysm_final_boss'
      ? 0.46
      : 0.34;
  const leftLeg = makeBossLeg(-legSpread);
  const rightLeg = makeBossLeg(legSpread);
  bodyGroup.add(leftLeg, rightLeg);

  // Monster / Robot Torso
  const torso = new THREE.Group();
  torso.position.set(0, 1.05, 0);
  bodyGroup.add(torso);

  const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.42, 10), bodyMat);
  abdomen.position.y = 0.22;
  torso.add(abdomen);

  const isBoxyTorso =
    arch === 'heavy_tank' ||
    arch === 'shield_bot' ||
    arch === 'giant_boss' ||
    arch === 'armored_juggernaut' ||
    arch === 'mecha_stalker' ||
    arch === 'titan_warden' ||
    arch === 'berserker_mech' ||
    arch === 'mega_robot_warrior' ||
    arch === 'armored_destroyer';
  const isSleekTorso =
    arch === 'fast_ninja' ||
    arch === 'fast_raptor' ||
    arch === 'volt_sprinter' ||
    arch === 'stealth_phantom' ||
    arch === 'cryo_valkyrie' ||
    arch === 'aero_interceptor' ||
    arch === 'dark_shadow_beast' ||
    arch === 'sky_emperor_boss';

  const upperChest = isBoxyTorso
    ? new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.88, 0.86), bodyMat)
    : isSleekTorso
      ? new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.32, 0.78, 6), bodyMat)
      : new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 1), bodyMat);

  if (!isBoxyTorso && !isSleekTorso) {
    upperChest.scale.set(1.18, 0.92, 0.92);
  }
  upperChest.position.y = 0.72;
  torso.add(upperChest);

  // Glowing Chest Reactor / Core
  const coreMesh = new THREE.Mesh(
    arch === 'laser_bot' ||
      arch === 'mecha_stalker' ||
      arch === 'aero_interceptor' ||
      arch === 'mega_robot_warrior' ||
      arch === 'armored_destroyer'
      ? new THREE.CylinderGeometry(0.22, 0.22, 0.2, 12)
      : new THREE.OctahedronGeometry(0.25, 0),
    glowMat,
  );
  if (
    arch === 'laser_bot' ||
    arch === 'mecha_stalker' ||
    arch === 'aero_interceptor' ||
    arch === 'mega_robot_warrior' ||
    arch === 'armored_destroyer'
  ) {
    coreMesh.rotation.x = Math.PI / 2;
  }
  coreMesh.position.set(0, 0.72, 0.5);
  torso.add(coreMesh);

  // Back & Shoulder Hardware per Monster Class
  if (
    arch === 'heavy_tank' ||
    arch === 'giant_boss' ||
    arch === 'mecha_stalker' ||
    arch === 'titan_warden' ||
    arch === 'armored_destroyer' ||
    arch === 'mega_robot_warrior'
  ) {
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.6), armorMat);
      pod.position.set(side * 0.62, 1.26, -0.05);
      torso.add(pod);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.78, 8), hornMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * 0.62, 1.26, 0.42);
      torso.add(barrel);
    }
  } else if (
    arch === 'fire_bot' ||
    arch === 'magma_ifrit' ||
    arch === 'pyro_drake' ||
    arch === 'berserker_mech' ||
    arch === 'fire_dragon_monster'
  ) {
    for (const side of [-1, 1]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.7, 8), hornMat);
      stack.position.set(side * 0.32, 1.15, -0.45);
      stack.rotation.x = -0.3;
      torso.add(stack);
      const flameTip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.38, 6), glowMat);
      flameTip.position.set(side * 0.32, 1.56, -0.56);
      flameTip.rotation.x = -0.3;
      torso.add(flameTip);
    }
  } else if (arch === 'frost_fiend' || arch === 'ice_colossus' || arch === 'cryo_valkyrie' || arch === 'ice_giant_colossus') {
    for (let i = -1; i <= 1; i++) {
      const iceSpike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.92, 5), glowMat);
      iceSpike.position.set(i * 0.28, 1.08, -0.42);
      iceSpike.rotation.x = -0.55;
      torso.add(iceSpike);
    }
  } else if (arch === 'mutant_bio_beast') {
    for (let i = -1; i <= 1; i++) {
      const bioSpine = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.85 + (i === 0 ? 0.25 : 0), 6), glowMat);
      bioSpine.position.set(i * 0.28, 1.06, -0.42);
      bioSpine.rotation.x = -0.55;
      torso.add(bioSpine);
    }
  } else if (arch === 'fast_raptor' || arch === 'dark_dragon' || arch === 'flying_wyvern') {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.35, 6), armorMat);
    tail.position.set(0, 0.2, -0.78);
    tail.rotation.x = -1.25;
    torso.add(tail);
  } else {
    for (let i = -1; i <= 1; i++) {
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.62, 6), armorMat);
      spine.position.set(i * 0.24, 0.96, -0.45);
      spine.rotation.x = -0.65;
      torso.add(spine);
    }
  }
  if (arch === 'pyro_drake' || arch === 'fire_dragon_monster') {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.55, 6), armorMat);
    tail.position.set(0, 0.2, -0.85);
    tail.rotation.x = -1.25;
    torso.add(tail);
  }

  // Wings or Orbital Energy Halos
  let wingsGroup: THREE.Group | undefined;
  if (
    arch === 'dark_dragon' ||
    arch === 'infernal_demon' ||
    arch === 'aether_overlord' ||
    arch === 'flying_bot' ||
    arch === 'sky_harpy' ||
    arch === 'flying_wyvern' ||
    arch === 'omega_overlord' ||
    arch === 'cryo_valkyrie' ||
    arch === 'pyro_drake' ||
    arch === 'aero_interceptor' ||
    arch === 'fire_dragon_monster' ||
    arch === 'sky_emperor_boss'
  ) {
    wingsGroup = new THREE.Group();
    wingsGroup.position.set(0, 0.88, -0.42);
    const wingShape = new THREE.Shape();
    const wideWing =
      isFlying || arch === 'omega_overlord' || arch === 'pyro_drake';
    wingShape.moveTo(0, 0);
    wingShape.lineTo(wideWing ? 1.65 : 1.15, 0.72);
    wingShape.lineTo(wideWing ? 1.38 : 0.95, -0.18);
    wingShape.lineTo(0.45, -0.38);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
    });
    const wingMat = isFlying ? glowMat : armorMat;
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.x = 0.18;
    wingR.rotation.y = -0.25;

    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.scale.x = -1;
    wingL.position.x = -0.18;
    wingL.rotation.y = 0.25;

    wingsGroup.add(wingL, wingR);
    torso.add(wingsGroup);
  } else if (
    arch === 'storm_volt' ||
    arch === 'cyber_construct' ||
    arch === 'singularity_apex' ||
    arch === 'laser_bot' ||
    arch === 'void_reaper' ||
    arch === 'volt_sprinter' ||
    arch === 'stealth_phantom' ||
    arch === 'dark_shadow_beast' ||
    arch === 'thunder_beast' ||
    arch === 'cataclysm_final_boss' ||
    arch === 'colossal_titan_beast'
  ) {
    wingsGroup = new THREE.Group();
    wingsGroup.position.set(0, 0.88, -0.42);
    const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.07, 8, 24), glowMat);
    wingsGroup.add(coilRing);
    if (
      arch === 'singularity_apex' ||
      arch === 'void_reaper' ||
      arch === 'stealth_phantom' ||
      arch === 'cataclysm_final_boss' ||
      arch === 'dark_shadow_beast'
    ) {
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.06, 8, 28), armorMat);
      wingsGroup.add(outerRing);
    }
    torso.add(wingsGroup);
  }

  // Head
  const head = new THREE.Group();
  head.position.set(0, 1.26, 0.12);
  torso.add(head);

  const cranium = new THREE.Mesh(
    arch === 'cyber_construct' ||
      arch === 'heavy_tank' ||
      arch === 'shield_bot' ||
      arch === 'giant_boss' ||
      arch === 'armored_juggernaut' ||
      arch === 'mecha_stalker' ||
      arch === 'titan_warden' ||
      arch === 'berserker_mech' ||
      arch === 'mega_robot_warrior' ||
      arch === 'armored_destroyer'
      ? new THREE.BoxGeometry(0.52, 0.44, 0.5)
      : arch === 'laser_bot' || arch === 'aero_interceptor'
        ? new THREE.CylinderGeometry(0.24, 0.28, 0.44, 12)
        : new THREE.DodecahedronGeometry(0.34, 1),
    bodyMat,
  );
  cranium.position.y = 0.22;
  head.add(cranium);

  if (
    arch === 'dark_dragon' ||
    arch === 'venom_hydra' ||
    arch === 'fast_raptor' ||
    arch === 'flying_wyvern' ||
    arch === 'pyro_drake' ||
    arch === 'fire_dragon_monster' ||
    arch === 'thunder_beast'
  ) {
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.46), armorMat);
    snout.position.set(0, 0.14, 0.32);
    head.add(snout);
  }

  if (
    arch === 'laser_bot' ||
    arch === 'mecha_stalker' ||
    arch === 'aero_interceptor' ||
    arch === 'mega_robot_warrior'
  ) {
    const opticLens = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), glowMat);
    opticLens.position.set(0, 0.24, 0.25);
    head.add(opticLens);
  } else {
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), glowMat);
    eyeL.position.set(-0.12, 0.25, 0.27);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), glowMat);
    eyeR.position.set(0.12, 0.25, 0.27);
    head.add(eyeL, eyeR);
  }

  const hornGeo = new THREE.ConeGeometry(0.09, 0.58, 7);
  const hornMatUse =
    arch === 'ice_colossus' ||
    arch === 'frost_fiend' ||
    arch === 'ice_giant_colossus' ||
    arch === 'fast_ninja' ||
    arch === 'volt_sprinter' ||
    arch === 'cryo_valkyrie' ||
    arch === 'stealth_phantom' ||
    arch === 'thunder_beast' ||
    arch === 'cataclysm_final_boss'
      ? glowMat
      : hornMat;
  const hornL = new THREE.Mesh(hornGeo, hornMatUse);
  hornL.position.set(-0.25, 0.5, -0.02);
  hornL.rotation.z = arch === 'fast_ninja' || arch === 'volt_sprinter' || arch === 'stealth_phantom' ? 0.72 : 0.48;
  hornL.rotation.x = 0.2;

  const hornR = new THREE.Mesh(hornGeo, hornMatUse);
  hornR.position.set(0.25, 0.5, -0.02);
  hornR.rotation.z = arch === 'fast_ninja' || arch === 'volt_sprinter' || arch === 'stealth_phantom' ? -0.72 : -0.48;
  hornR.rotation.x = 0.2;
  head.add(hornL, hornR);

  if (
    arch === 'aether_overlord' ||
    arch === 'infernal_demon' ||
    arch === 'singularity_apex' ||
    arch === 'giant_boss' ||
    arch === 'omega_overlord' ||
    arch === 'void_reaper' ||
    arch === 'cryo_valkyrie' ||
    arch === 'titan_warden' ||
    arch === 'sky_emperor_boss' ||
    arch === 'cataclysm_final_boss' ||
    arch === 'colossal_titan_beast' ||
    arch === 'mega_robot_warrior'
  ) {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.62, 6), glowMat);
    crown.position.set(0, 0.62, 0);
    head.add(crown);
  }

  // Arms
  const makeBossArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.76, 0.94, 0);

    const shoulderSize =
      arch === 'armored_juggernaut' ||
      arch === 'giant_titan' ||
      arch === 'titan_warden' ||
      arch === 'berserker_mech' ||
      arch === 'colossal_titan_beast' ||
      arch === 'ice_giant_colossus' ||
      arch === 'armored_destroyer' ||
      arch === 'mega_robot_warrior' ||
      arch === 'cataclysm_final_boss'
        ? 0.36
        : 0.28;
    const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(shoulderSize, 0), armorMat);
    arm.add(shoulder);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.45, 8), bodyMat);
    upper.position.y = -0.28;
    arm.add(upper);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.48, 8), armorMat);
    forearm.position.y = -0.68;
    arm.add(forearm);

    const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), glowMat);
    fist.position.y = -0.96;
    arm.add(fist);

    if (
      arch === 'fast_ninja' ||
      arch === 'singularity_apex' ||
      arch === 'fast_raptor' ||
      arch === 'void_reaper' ||
      arch === 'frost_fiend' ||
      arch === 'berserker_mech' ||
      arch === 'cryo_valkyrie' ||
      arch === 'stealth_phantom' ||
      arch === 'dark_shadow_beast' ||
      arch === 'mutant_bio_beast' ||
      arch === 'cataclysm_final_boss'
    ) {
      const bladeWidth = arch === 'berserker_mech' || arch === 'cataclysm_final_boss' ? 0.16 : 0.07;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(bladeWidth, 0.94, 0.24), glowMat);
      blade.position.set(0, -1.32, 0.16);
      blade.rotation.x = 0.35;
      arm.add(blade);
    }

    if (
      (arch === 'shield_bot' ||
        arch === 'armored_juggernaut' ||
        arch === 'titan_warden' ||
        arch === 'armored_destroyer') &&
      side === -1
    ) {
      const towerShield = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.52, 1.02), armorMat);
      towerShield.position.set(-0.22, -0.58, 0.24);
      arm.add(towerShield);
      const shieldCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), glowMat);
      shieldCore.position.set(-0.34, -0.58, 0.24);
      arm.add(shieldCore);
    }

    return arm;
  };

  const leftArm = makeBossArm(-1);
  const rightArm = makeBossArm(1);
  torso.add(leftArm, rightArm);

  const bossShieldGeo = new THREE.IcosahedronGeometry(1.55, 1);
  const bossShieldMat = new THREE.MeshStandardMaterial({
    color: spec.secondaryColor,
    emissive: spec.emissiveColor,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.25,
    wireframe: true,
  });
  const shieldDome = new THREE.Mesh(bossShieldGeo, bossShieldMat);
  shieldDome.position.set(0, 1.35, 0);
  shieldDome.visible = false;
  root.add(shieldDome);

  enableShadows(bodyGroup);

  return {
    root,
    bodyGroup,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shieldDome,
    coreMesh,
    wingsGroup,
    baseEmissive: spec.emissiveColor,
    isBoss: true,
    scaleFactor: s,
    hoverBaseY,
    flashMaterials,
    dispose: () => disposeHierarchy(root),
  };
}

/**
 * Procedural articulated animation blender (zero GC allocations).
 */
export function animateFighterRig(
  rig: ArticulatedFighterRig,
  state: FighterAnimState,
  stateTimer: number,
  elapsed: number,
  dt: number,
  comboStep = 0,
) {
  const lerpAlpha = 1 - Math.exp(-20 * dt);

  let torsoRotX = 0;
  let torsoRotY = 0;
  let lArmX = 0;
  let lArmZ = 0.22;
  let rArmX = 0;
  let rArmZ = -0.22;
  let lLegX = 0;
  let rLegX = 0;
  let bodyY = rig.hoverBaseY;
  let bodyRotX = 0;

  switch (state) {
    case 'idle': {
      const breath = Math.sin(elapsed * 3.6);
      bodyY = rig.hoverBaseY + breath * (rig.hoverBaseY > 0 ? 0.14 : 0.038);
      torsoRotX = 0.08;
      lArmX = -0.52 + breath * 0.06;
      rArmX = -0.62 - breath * 0.06;
      lArmZ = 0.28;
      rArmZ = -0.28;
      break;
    }
    case 'move': {
      const stride = Math.sin(elapsed * 12.2);
      bodyY =
        rig.hoverBaseY +
        (rig.hoverBaseY > 0 ? Math.sin(elapsed * 5.2) * 0.12 : Math.abs(Math.cos(elapsed * 12.2)) * 0.08);
      torsoRotX = rig.hoverBaseY > 0 ? 0.3 : 0.18;
      torsoRotY = stride * 0.14;
      lLegX = rig.hoverBaseY > 0 ? 0.28 : stride * 0.62;
      rLegX = rig.hoverBaseY > 0 ? 0.15 : -stride * 0.62;
      lArmX = -stride * 0.48 - 0.35;
      rArmX = stride * 0.48 - 0.35;
      break;
    }
    case 'attack_normal': {
      const p = Math.min(1, stateTimer / 0.28);
      const swing = Math.sin(p * Math.PI);
      const step = comboStep % 3;
      if (step === 0) {
        torsoRotY = -swing * 0.72;
        torsoRotX = 0.26 * swing;
        rArmX = -1.95 * swing;
        rArmZ = -0.08;
        lArmX = 0.4 * swing;
      } else if (step === 1) {
        torsoRotY = swing * 0.74;
        torsoRotX = 0.24 * swing;
        lArmX = -1.95 * swing;
        lArmZ = 0.08;
        rArmX = 0.4 * swing;
      } else {
        torsoRotY = -swing * 0.52;
        torsoRotX = -0.18 * swing;
        rArmX = -2.55 * swing;
        lArmX = -1.1 * swing;
        bodyY = rig.hoverBaseY + 0.24 * swing;
      }
      break;
    }
    case 'attack_kick': {
      const p = Math.min(1, stateTimer / 0.38);
      const kick = Math.sin(p * Math.PI);
      torsoRotX = -0.28 * kick;
      torsoRotY = -0.92 * kick;
      rLegX = -1.88 * kick;
      lLegX = 0.28 * kick;
      lArmX = -0.95 * kick;
      rArmX = 0.5 * kick;
      bodyY = rig.hoverBaseY + 0.26 * kick;
      break;
    }
    case 'attack_heavy': {
      const p = Math.min(1, stateTimer / 0.54);
      if (p < 0.38) {
        const w = p / 0.38;
        torsoRotX = -0.34 * w;
        lArmX = -2.4 * w;
        rArmX = -2.4 * w;
      } else {
        const slam = (p - 0.38) / 0.62;
        torsoRotX = 0.62 * Math.sin(slam * Math.PI);
        lArmX = -2.4 + 2.85 * slam;
        rArmX = -2.4 + 2.85 * slam;
      }
      break;
    }
    case 'jump': {
      torsoRotX = 0.12;
      lLegX = 0.48;
      rLegX = -0.36;
      lArmX = -1.25;
      rArmX = -1.25;
      break;
    }
    case 'dodge': {
      torsoRotX = 0.52;
      lArmX = 0.78;
      rArmX = 0.78;
      bodyY = rig.hoverBaseY - 0.1;
      break;
    }
    case 'block': {
      torsoRotX = 0.12;
      lArmX = -1.4;
      rArmX = -1.4;
      lArmZ = -0.58;
      rArmZ = 0.58;
      bodyY = rig.hoverBaseY - 0.08;
      break;
    }
    case 'cast_power':
    case 'ultimate': {
      const pulse = Math.sin(Math.min(1, stateTimer / 0.45) * Math.PI);
      torsoRotX = -0.2 * pulse;
      lArmX = -1.75 * pulse;
      rArmX = -1.75 * pulse;
      lArmZ = 0.48 * pulse;
      rArmZ = -0.48 * pulse;
      bodyY = rig.hoverBaseY + (state === 'ultimate' ? 0.38 * pulse : 0.12 * pulse);
      break;
    }
    case 'hitstun': {
      torsoRotX = -0.46;
      lArmX = 0.5;
      rArmX = 0.5;
      lArmZ = 0.72;
      rArmZ = -0.72;
      break;
    }
    case 'victory': {
      const cheer = Math.sin(elapsed * 5) * 0.12;
      lArmX = -2.6 + cheer;
      rArmX = -2.6 - cheer;
      lArmZ = 0.45;
      rArmZ = -0.45;
      bodyY = rig.hoverBaseY + Math.abs(Math.sin(elapsed * 3.5)) * 0.15;
      break;
    }
    case 'defeat': {
      bodyRotX = -Math.PI / 2 + 0.12;
      bodyY = 0.35;
      lArmZ = 0.8;
      rArmZ = -0.8;
      break;
    }
  }

  rig.torso.rotation.x = THREE.MathUtils.lerp(rig.torso.rotation.x, torsoRotX, lerpAlpha);
  rig.torso.rotation.y = THREE.MathUtils.lerp(rig.torso.rotation.y, torsoRotY, lerpAlpha);
  rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, lArmX, lerpAlpha);
  rig.leftArm.rotation.z = THREE.MathUtils.lerp(rig.leftArm.rotation.z, lArmZ, lerpAlpha);
  rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, rArmX, lerpAlpha);
  rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, rArmZ, lerpAlpha);
  rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, lLegX, lerpAlpha);
  rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, rLegX, lerpAlpha);
  rig.bodyGroup.position.y = THREE.MathUtils.lerp(rig.bodyGroup.position.y, bodyY, lerpAlpha);
  rig.bodyGroup.rotation.x = THREE.MathUtils.lerp(rig.bodyGroup.rotation.x, bodyRotX, lerpAlpha);

  rig.coreMesh.rotation.y += dt * 2.4;
  if (rig.wingsGroup) {
    if (rig.wingsGroup.children.length === 1) {
      rig.wingsGroup.children[0].rotation.z += dt * 1.6;
    } else if (rig.wingsGroup.children.length >= 2) {
      const flap = Math.sin(elapsed * 4.8) * 0.18;
      rig.wingsGroup.children[0].rotation.y = 0.3 + flap;
      rig.wingsGroup.children[1].rotation.y = -0.3 - flap;
    }
  }
}
