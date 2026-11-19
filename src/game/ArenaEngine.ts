import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BOSS_LEVELS, getLevelDef } from '../data/levels';
import { createEmptyPowerCooldowns, getMonsterPowerDef, PLAYER_POWERS } from '../data/powers';
import {
  BattleHudSnapshot,
  BossLevelDef,
  EnemyHudState,
  EnemyUnitSpec,
  GraphicsQuality,
  MonsterPowerId,
  PowerId,
} from '../types/game';
import { ARENA_RADIUS, BuiltArena, buildArenaForLevel } from './arena';
import { soundEngine } from './audio';
import {
  ArticulatedFighterRig,
  FighterAnimState,
  animateFighterRig,
  createBossFighterRig,
  createPlayerFighterRig,
} from './models';
import { createBrushedArmorTexture, createContactShadowTexture } from './textures';
import { VfxManager } from './vfx';

export type EngineMode = 'menu' | 'mcq_draft' | 'boss_intro' | 'battle' | 'paused' | 'victory' | 'defeat';

export interface EngineCallbacks {
  onHudUpdate: (hud: BattleHudSnapshot) => void;
  onIntroFinished: () => void;
  onBattleEnd: (winner: 'player' | 'boss') => void;
}

// Pre-allocated math helpers for zero GC in animation loop
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _camDesiredPos = new THREE.Vector3();
const _camDesiredLook = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

interface FighterRuntime {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotY: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  state: FighterAnimState;
  stateTimer: number;
  stateDuration: number;
  attackHitApplied: boolean;
  iFrames: number;
  flashTimer: number;
  stunTimer: number;
  slowTimer: number;
  shieldTimer: number;
  speedBoostTimer: number;
  rageTimer: number;
  superShieldActive: boolean;
  blocking: boolean;
  comboStep: number;
}

interface EnemyEntity {
  id: string;
  spec: EnemyUnitSpec;
  runtime: FighterRuntime;
  rig: ArticulatedFighterRig;
  shadow: THREE.Mesh;
  telegraphRing: THREE.Mesh;
  aiCooldown: number;
  telegraphTimer: number;
  pendingAction: 'heavy' | 'kick' | MonsterPowerId | null;
  telegraphLabel: string | null;
  strafeDir: number;
  strafeTimer: number;
  flankAngle: number;
  extraPowers: MonsterPowerId[];
  alive: boolean;
  phase: 1 | 2 | 3;
  maxPhases: 1 | 2 | 3;
}

function buildEnemySpecsFromLevel(levelDef: BossLevelDef): EnemyUnitSpec[] {
  if (levelDef.enemies && levelDef.enemies.length > 0) {
    return levelDef.enemies.slice(0, 4);
  }
  return [
    {
      name: levelDef.bossName,
      nameSi: levelDef.bossTitleSi,
      roleClass: levelDef.robotClass,
      monsterCategory: levelDef.monsterCategory,
      archetype: levelDef.archetype,
      aiStyle: levelDef.aiStyle,
      maxHp: levelDef.maxHp,
      attackPower: levelDef.attackPower,
      speed: levelDef.speed,
      aggression: levelDef.aggression,
      blockChance: levelDef.blockChance,
      dodgeChance: levelDef.dodgeChance,
      primaryColor: levelDef.primaryColor,
      secondaryColor: levelDef.secondaryColor,
      emissiveColor: levelDef.emissiveColor,
      scale: levelDef.scale,
      signaturePowers: levelDef.signaturePowers,
    },
  ];
}

export class ArenaEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private isCoarsePointer: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private vfx: VfxManager;
  private arena: BuiltArena | null = null;
  private armorTex: THREE.Texture;
  private shadowTex: THREE.Texture;
  private sharedShadowGeo: THREE.PlaneGeometry;
  private sharedTeleGeo: THREE.RingGeometry;

  private playerRig: ArticulatedFighterRig;
  private playerShadow: THREE.Mesh;
  private enemies: EnemyEntity[] = [];

  private currentLevel: BossLevelDef = BOSS_LEVELS[0];
  private mode: EngineMode = 'menu';
  private graphicsQuality: GraphicsQuality = 'high';

  private frameId = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private hitstopTimer = 0;
  private cameraShake = 0;
  private targetFov = 48;
  private introTimer = 0;
  private battleTime = 0;
  private hudEmitAccum = 0;
  private damageEventSeq = 1;

  // Input state
  private keysHeld = new Set<string>();
  private joyVec = { x: 0, y: 0 };

  // Combat state
  private playerSlotPowers: (PowerId | null)[] = [null, null, null, null];
  private playerPowers: PowerId[] = [];
  private monsterExtraPowers: MonsterPowerId[] = [];
  private powerCooldowns: Record<PowerId, number> = createEmptyPowerCooldowns();
  private ultimateCharge = 0;
  private comboCount = 0;
  private comboResetTimer = 0;
  private timeSlowTimer = 0;
  private phaseBanner: string | null = null;
  private phaseBannerTimer = 0;
  private survivalWaveQueue: EnemyUnitSpec[][] = [];
  private currentWaveIndex = 0;
  private lastDamageEvent: BattleHudSnapshot['lastDamageEvent'] = null;

  private player: FighterRuntime;
  private resizeObserver: ResizeObserver;
  private disposed = false;

  constructor(container: HTMLElement, callbacks: EngineCallbacks, initialQuality: GraphicsQuality) {
    this.container = container;
    this.callbacks = callbacks;
    this.graphicsQuality = initialQuality;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.isCoarsePointer =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

    this.scene = new THREE.Scene();
    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 160);
    this.camera.position.set(0, 5.8, 13.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialQuality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.applyQualityToRenderer();
    this.renderer.setSize(w, h);
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.armorTex = createBrushedArmorTexture(maxAniso);
    this.shadowTex = createContactShadowTexture();

    this.sharedShadowGeo = new THREE.PlaneGeometry(2.2, 2.2);
    this.sharedShadowGeo.rotateX(-Math.PI / 2);

    this.sharedTeleGeo = new THREE.RingGeometry(1.1, 1.55, 28);
    this.sharedTeleGeo.rotateX(-Math.PI / 2);

    this.vfx = new VfxManager(this.scene);

    // Player Rig & Contact Shadow
    this.playerRig = createPlayerFighterRig(this.armorTex);
    this.scene.add(this.playerRig.root);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    this.playerShadow = new THREE.Mesh(this.sharedShadowGeo, shadowMat);
    this.playerShadow.position.y = 0.02;
    this.scene.add(this.playerShadow);

    this.player = this.createDefaultRuntime(190, 100);

    this.loadLevelScene(1, 'menu');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    this.renderer.domElement.addEventListener('pointerdown', this.onCanvasPointerDown);
    this.renderer.domElement.addEventListener('contextmenu', this.onCanvasContextMenu);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);

    this.clock.start();
    this.startLoop();
  }

  private createDefaultRuntime(maxHp: number, maxEnergy: number): FighterRuntime {
    return {
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rotY: 0,
      hp: maxHp,
      maxHp,
      energy: maxEnergy,
      maxEnergy,
      state: 'idle',
      stateTimer: 0,
      stateDuration: 0,
      attackHitApplied: false,
      iFrames: 0,
      flashTimer: 0,
      stunTimer: 0,
      slowTimer: 0,
      shieldTimer: 0,
      speedBoostTimer: 0,
      rageTimer: 0,
      superShieldActive: false,
      blocking: false,
      comboStep: 0,
    };
  }

  private applyQualityToRenderer() {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      return;
    }
    const highCap = this.isCoarsePointer ? 1.5 : 2;
    const maxDpr =
      this.graphicsQuality === 'high' ? highCap : this.graphicsQuality === 'medium' ? 1.25 : 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.shadowMap.enabled = this.graphicsQuality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  public setGraphicsQuality(q: GraphicsQuality) {
    this.graphicsQuality = q;
    this.applyQualityToRenderer();
    this.loadLevelScene(this.currentLevel.level, this.mode);
  }

  public setMode(mode: EngineMode) {
    this.mode = mode;
    if (mode === 'boss_intro') {
      this.introTimer = 0;
      soundEngine.playBossRoar();
      for (const e of this.enemies) {
        this.vfx.spawnShockRing(e.runtime.pos, e.spec.emissiveColor, 5.4, 0.7);
      }
    } else if (mode === 'victory') {
      this.player.state = 'victory';
      for (const e of this.enemies) {
        e.runtime.state = 'defeat';
        e.telegraphRing.visible = false;
        e.telegraphLabel = null;
        e.pendingAction = null;
        _origin.copy(e.runtime.pos).setY(1.4);
        this.vfx.spawnBurst(_origin, e.spec.emissiveColor, 18, 8.5, 1.25);
      }
      soundEngine.playVictory();
    } else if (mode === 'defeat') {
      this.player.state = 'defeat';
      for (const e of this.enemies) {
        if (e.alive) e.runtime.state = 'victory';
        e.telegraphRing.visible = false;
        e.telegraphLabel = null;
        e.pendingAction = null;
      }
      soundEngine.playDefeat();
    }
  }

  private clearEnemies() {
    for (const e of this.enemies) {
      e.rig.dispose();
      this.scene.remove(e.rig.root);
      this.scene.remove(e.shadow);
      (e.shadow.material as THREE.Material).dispose();
      this.scene.remove(e.telegraphRing);
      (e.telegraphRing.material as THREE.Material).dispose();
    }
    this.enemies = [];
  }

  private computeMaxPhases(spec: EnemyUnitSpec, levelDef: BossLevelDef): 1 | 2 | 3 {
    if (spec.hasPhases) {
      return levelDef.level >= 95 ? 3 : 2;
    }
    if (levelDef.isBossLevel && levelDef.sector >= 8 && (!levelDef.enemies || levelDef.enemies.length === 1)) {
      return levelDef.level >= 95 ? 3 : 2;
    }
    return 1;
  }

  private spawnEnemySquad(specs: EnemyUnitSpec[], levelDef: BossLevelDef, bonusMult = 1) {
    this.clearEnemies();
    const count = Math.min(4, specs.length);

    for (let i = 0; i < count; i++) {
      const spec = specs[i];
      const rig = createBossFighterRig(spec, this.armorTex);
      this.scene.add(rig.root);

      const shadowMat = new THREE.MeshBasicMaterial({
        map: this.shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.52,
      });
      const shadow = new THREE.Mesh(this.sharedShadowGeo, shadowMat);
      shadow.scale.setScalar(1.28 * spec.scale);
      shadow.position.y = 0.02;
      this.scene.add(shadow);

      const teleMat = new THREE.MeshBasicMaterial({
        color: 0xff2a2a,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const telegraphRing = new THREE.Mesh(this.sharedTeleGeo, teleMat);
      telegraphRing.position.y = 0.04;
      telegraphRing.visible = false;
      this.scene.add(telegraphRing);

      const flankAngle = count === 1 ? 0 : (i - (count - 1) / 2) * 1.12;
      const scaledHp = Math.round(spec.maxHp * bonusMult);
      const runtime = this.createDefaultRuntime(scaledHp, 100);

      if (count === 1) {
        runtime.pos.set(4.2, 0, 0);
      } else if (count === 2) {
        runtime.pos.set(3.9, 0, i === 0 ? -2.8 : 2.8);
      } else if (count === 3) {
        const zOff = i === 0 ? 0 : i === 1 ? -3.6 : 3.6;
        const xOff = i === 0 ? 4.8 : 3.2;
        runtime.pos.set(xOff, 0, zOff);
      } else {
        const xOff = i < 2 ? 4.6 : 2.9;
        const zOff = i % 2 === 0 ? -3.8 : 3.8;
        runtime.pos.set(xOff, 0, zOff);
      }
      runtime.rotY = -Math.PI / 2;

      this.enemies.push({
        id: `${levelDef.id}_w${this.currentWaveIndex}_enemy_${i}`,
        spec,
        runtime,
        rig,
        shadow,
        telegraphRing,
        aiCooldown: 0.85 + i * 0.55,
        telegraphTimer: 0,
        pendingAction: null,
        telegraphLabel: null,
        strafeDir: i % 2 === 0 ? 1 : -1,
        strafeTimer: 1.4 + i * 0.4,
        flankAngle,
        extraPowers: [],
        alive: true,
        phase: 1,
        maxPhases: this.computeMaxPhases(spec, levelDef),
      });
    }
  }

  public loadLevelScene(levelNum: number, initialMode: EngineMode) {
    const levelDef = getLevelDef(levelNum);
    this.currentLevel = levelDef;
    this.mode = initialMode;

    if (this.arena) {
      this.arena.dispose();
      this.arena = null;
    }
    this.clearEnemies();
    this.vfx.clearProjectiles();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const shadowsEnabled = !this.isSoftwareGl && this.graphicsQuality !== 'low';
    this.arena = buildArenaForLevel(this.scene, levelDef, maxAniso, shadowsEnabled);

    const initialSpecs = buildEnemySpecsFromLevel(levelDef);
    this.survivalWaveQueue = [initialSpecs, ...(levelDef.survivalWaves ?? [])];
    this.currentWaveIndex = 0;

    this.spawnEnemySquad(initialSpecs, levelDef, 1);
    this.resetFightersForMatch();
  }

  public resetFightersForMatch() {
    const count = this.enemies.length;
    const lv = this.currentLevel.level;
    const lvlBonusHp = Math.min(360, Math.floor((lv - 1) * 3.2));
    const multiBonus = count >= 4 ? 85 : count === 3 ? 55 : count === 2 ? 28 : 0;
    const survBonus = this.currentLevel.isSurvivalLevel ? 45 : 0;
    const playerMaxHp = 190 + lvlBonusHp + multiBonus + survBonus;

    this.player = this.createDefaultRuntime(playerMaxHp, 100);
    this.player.pos.set(-4.5, 0, 0);
    this.player.rotY = Math.PI / 2;

    if (this.survivalWaveQueue.length > 0 && this.currentWaveIndex !== 0) {
      this.currentWaveIndex = 0;
      this.spawnEnemySquad(this.survivalWaveQueue[0], this.currentLevel, 1);
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const cnt = this.enemies.length;
      e.runtime = this.createDefaultRuntime(e.spec.maxHp, 100);
      if (cnt === 1) {
        e.runtime.pos.set(4.2, 0, 0);
      } else if (cnt === 2) {
        e.runtime.pos.set(3.9, 0, i === 0 ? -2.8 : 2.8);
      } else if (cnt === 3) {
        const zOff = i === 0 ? 0 : i === 1 ? -3.6 : 3.6;
        const xOff = i === 0 ? 4.8 : 3.2;
        e.runtime.pos.set(xOff, 0, zOff);
      } else {
        const xOff = i < 2 ? 4.6 : 2.9;
        const zOff = i % 2 === 0 ? -3.8 : 3.8;
        e.runtime.pos.set(xOff, 0, zOff);
      }
      e.runtime.rotY = -Math.PI / 2;
      e.alive = true;
      e.phase = 1;
      e.maxPhases = this.computeMaxPhases(e.spec, this.currentLevel);
      e.aiCooldown = 0.8 + i * 0.6;
      e.telegraphTimer = 0;
      e.pendingAction = null;
      e.telegraphLabel = null;
      e.telegraphRing.visible = false;
      e.extraPowers = [];
    }

    this.ultimateCharge = 25;
    this.comboCount = 0;
    this.timeSlowTimer = 0;
    this.phaseBanner = null;
    this.phaseBannerTimer = 0;
    this.battleTime = 0;
    this.lastDamageEvent = null;
    (Object.keys(this.powerCooldowns) as PowerId[]).forEach((k) => {
      this.powerCooldowns[k] = 0;
    });
    this.vfx.clearProjectiles();
    this.emitHud();
  }

  public configureMatchLoadout(
    slotPowers: (PowerId | null)[],
    monsterPowers: MonsterPowerId[],
  ) {
    this.playerSlotPowers = [...slotPowers];
    const uniqueEarned: PowerId[] = [];
    for (const p of slotPowers) {
      if (p && !uniqueEarned.includes(p)) {
        uniqueEarned.push(p);
      }
    }
    this.playerPowers = uniqueEarned;
    this.monsterExtraPowers = monsterPowers;

    const perEnemyBoost = monsterPowers.length * (this.enemies.length > 1 ? 0.05 : 0.08);
    const bonusMult = 1 + perEnemyBoost;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      e.runtime.maxHp = Math.round(e.spec.maxHp * bonusMult);
      e.runtime.hp = e.runtime.maxHp;
      e.extraPowers = [];
    }
    // Distribute earned enemy bonus powers across living squad members
    for (let m = 0; m < monsterPowers.length; m++) {
      if (this.enemies.length > 0) {
        this.enemies[m % this.enemies.length].extraPowers.push(monsterPowers[m]);
      }
    }
    this.emitHud();
  }

  public triggerMcqFeedbackEffect(correct: boolean, hexColor?: number) {
    const color = hexColor ?? (correct ? 0x38bdf8 : 0xef4444);
    soundEngine.playPowerTransferFlight(correct);
    _origin.set(0, 2.3, 0);
    if (correct) {
      _targetVec.copy(this.player.pos).setY(1.3);
      this.vfx.spawnTransferOrb(_origin, _targetVec, color);
      this.vfx.spawnShockRing(this.player.pos, color, 3.4, 0.5);
    } else if (this.enemies.length > 0) {
      const targetEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      _targetVec.copy(targetEnemy.runtime.pos).setY(1.5);
      this.vfx.spawnTransferOrb(_origin, _targetVec, color);
      this.vfx.spawnShockRing(targetEnemy.runtime.pos, color, 4.0, 0.55);
    }
  }

  private getNearestLivingEnemy(fromPos: THREE.Vector3 = this.player.pos): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestDistSq = Infinity;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      const dx = e.runtime.pos.x - fromPos.x;
      const dz = e.runtime.pos.z - fromPos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = e;
      }
    }
    return best;
  }

  private getLivingEnemies(): EnemyEntity[] {
    return this.enemies.filter((e) => e.alive);
  }

  public setJoystick(x: number, y: number) {
    this.joyVec.x = x;
    this.joyVec.y = y;
  }

  public setBlockHeld(held: boolean) {
    if (this.mode !== 'battle') return;
    if (this.player.state === 'hitstun' || this.player.state === 'defeat') return;
    this.player.blocking = held;
    if (held && (this.player.state === 'idle' || this.player.state === 'move')) {
      this.player.state = 'block';
    } else if (!held && this.player.state === 'block') {
      this.player.state = 'idle';
    }
  }

  public triggerPlayerAction(action: 'normal' | 'kick' | 'heavy' | 'jump' | 'dodge') {
    if (this.mode !== 'battle') return;
    if (this.player.stunTimer > 0 || this.player.state === 'hitstun' || this.player.state === 'defeat') return;

    const targetEnemy = this.getNearestLivingEnemy();

    if (action === 'jump') {
      if (this.player.pos.y <= 0.06) {
        this.player.vel.y = 8.6;
        this.player.state = 'jump';
        this.player.stateTimer = 0;
        this.player.blocking = false;
        soundEngine.playJump();
        this.vfx.spawnShockRing(this.player.pos, 0x94a3b8, 1.6, 0.25);
      }
      return;
    }

    if (action === 'dodge') {
      if (this.player.state === 'dodge' || this.player.energy < 10) return;
      this.player.energy -= 10;
      this.player.blocking = false;
      this.player.state = 'dodge';
      this.player.stateTimer = 0;
      this.player.stateDuration = 0.26;
      this.player.iFrames = 0.36;
      const mx = this.getMoveInputX();
      const mz = this.getMoveInputZ();
      if (Math.abs(mx) > 0.1 || Math.abs(mz) > 0.1) {
        _dir.set(mx, 0, mz).normalize();
      } else if (targetEnemy) {
        _dir.copy(this.player.pos).sub(targetEnemy.runtime.pos).setY(0).normalize();
      } else {
        _dir.set(-1, 0, 0);
      }
      this.player.vel.x = _dir.x * 16.0;
      this.player.vel.z = _dir.z * 16.0;
      soundEngine.playDodge();
      _origin.copy(this.player.pos).setY(0.8);
      this.vfx.spawnBurst(_origin, 0x38bdf8, 10, 4.5, 0.7, 2);
      return;
    }

    if (
      this.player.state === 'attack_normal' ||
      this.player.state === 'attack_kick' ||
      this.player.state === 'attack_heavy' ||
      this.player.state === 'cast_power' ||
      this.player.state === 'ultimate'
    ) {
      return;
    }

    this.player.blocking = false;
    if (targetEnemy) {
      this.faceTarget(this.player, targetEnemy.runtime.pos);
      _dir.copy(targetEnemy.runtime.pos).sub(this.player.pos).setY(0).normalize();
    } else {
      _dir.set(Math.sin(this.player.rotY), 0, Math.cos(this.player.rotY));
    }

    if (action === 'normal') {
      this.player.comboStep = (this.player.comboStep + 1) % 3;
      this.player.state = 'attack_normal';
      this.player.stateTimer = 0;
      this.player.stateDuration = 0.29;
      this.player.attackHitApplied = false;
      this.player.vel.x = _dir.x * 5.2;
      this.player.vel.z = _dir.z * 5.2;
    } else if (action === 'kick') {
      this.player.state = 'attack_kick';
      this.player.stateTimer = 0;
      this.player.stateDuration = 0.38;
      this.player.attackHitApplied = false;
      this.player.vel.x = _dir.x * 6.4;
      this.player.vel.z = _dir.z * 6.4;
    } else if (action === 'heavy') {
      if (this.player.energy < 14) return;
      this.player.energy -= 14;
      this.player.state = 'attack_heavy';
      this.player.stateTimer = 0;
      this.player.stateDuration = 0.54;
      this.player.attackHitApplied = false;
      this.player.vel.x = _dir.x * 6.2;
      this.player.vel.z = _dir.z * 6.2;
    }
  }

  private getPlayerDamageScale(): number {
    const lv = this.currentLevel.level;
    const levelScale = lv <= 10 ? 1.0 : 1 + Math.pow((lv - 10) / 120, 1.35) * 6.8;
    const rageMult = this.player.rageTimer > 0 ? 1.45 : 1.0;
    return levelScale * rageMult;
  }

  private scalePlayerDamage(baseDamage: number): number {
    return Math.round(baseDamage * this.getPlayerDamageScale());
  }

  public triggerPlayerPower(powerId: PowerId) {
    if (this.mode !== 'battle') return;
    if (powerId !== 'ultimate' && !this.playerPowers.includes(powerId)) return;
    if (this.powerCooldowns[powerId] > 0) return;
    if (this.player.stunTimer > 0 || this.player.state === 'hitstun' || this.player.state === 'defeat') return;

    const targetEnemy = this.getNearestLivingEnemy();
    if (!targetEnemy) return;

    const def = PLAYER_POWERS[powerId];
    if (powerId === 'ultimate') {
      if (this.ultimateCharge < 100) return;
      this.ultimateCharge = 0;
    } else {
      if (this.player.energy < def.energyCost) return;
      this.player.energy -= def.energyCost;
    }

    this.powerCooldowns[powerId] = def.cooldown;
    this.player.blocking = false;
    this.faceTarget(this.player, targetEnemy.runtime.pos);
    this.player.state = powerId === 'ultimate' ? 'ultimate' : 'cast_power';
    this.player.stateTimer = 0;
    this.player.stateDuration = powerId === 'ultimate' ? 0.62 : 0.36;
    if (powerId === 'ultimate') this.targetFov = 54;
    else this.targetFov = 50.5;

    soundEngine.playPlayerPower(powerId);
    _dir.copy(targetEnemy.runtime.pos).sub(this.player.pos).setY(0).normalize();
    _origin.copy(this.player.pos).addScaledVector(_dir, 0.9).setY(1.35);
    const scaledDmg = this.scalePlayerDamage(def.damage);

    switch (powerId) {
      case 'fire':
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 17.5,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 0.72,
          effect: 'knockback',
        });
        this.vfx.spawnBurst(_origin, def.hexColor, 14, 5, 0.9, 3);
        break;

      case 'ice':
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 19.5,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 0.65,
          effect: 'slow',
        });
        this.vfx.spawnBurst(_origin, def.hexColor, 14, 5, 0.85, 3);
        break;

      case 'lightning':
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 28,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 0.6,
          effect: 'stun',
        });
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 2.5, 0.25);
        break;

      case 'thunder': {
        const living = this.getLivingEnemies();
        for (const e of living) {
          if (e === targetEnemy || e.runtime.pos.distanceTo(targetEnemy.runtime.pos) < 4.5) {
            this.vfx.spawnPillar(e.runtime.pos, def.hexColor, 1.5, true);
            this.vfx.spawnShockRing(e.runtime.pos, def.hexColor, 4.6, 0.5);
            _targetVec.copy(e.runtime.pos).setY(1.4);
            this.vfx.spawnBurst(_targetVec, def.hexColor, 16, 8.5, 1.2, 6);
            this.applyDamageToEnemy(
              e,
              e === targetEnemy ? scaledDmg : Math.round(scaledDmg * 0.75),
              true,
              false,
              'THUNDER STRIKE',
            );
          }
        }
        this.cameraShake = Math.max(this.cameraShake, 0.24);
        break;
      }

      case 'earth':
      case 'ground_shockwave': {
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 6.8, 0.55);
        const living = this.getLivingEnemies();
        let hitAny = false;
        for (const e of living) {
          const dist = e.runtime.pos.distanceTo(this.player.pos);
          if (e === targetEnemy || dist < 6.8) {
            hitAny = true;
            this.vfx.spawnPillar(e.runtime.pos, def.hexColor, 1.15, false);
            this.vfx.spawnShockRing(e.runtime.pos, def.hexColor, 4.0, 0.45);
            this.applyDamageToEnemy(e, scaledDmg, false, true, def.shortTag);
            e.runtime.stunTimer = Math.max(e.runtime.stunTimer, 0.65);
            _v1.copy(e.runtime.pos).sub(this.player.pos).setY(0).normalize();
            e.runtime.vel.addScaledVector(_v1, 7.5);
          }
        }
        if (!hitAny) {
          this.vfx.spawnPillar(targetEnemy.runtime.pos, def.hexColor, 1.15, false);
        }
        this.cameraShake = Math.max(this.cameraShake, 0.24);
        break;
      }

      case 'wind':
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 20,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 0.9,
          effect: 'knockback',
        });
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 3.5, 0.35);
        break;

      case 'shield': {
        this.player.shieldTimer = 6.0;
        this.player.superShieldActive = false;
        if (this.playerRig.shieldDome) this.playerRig.shieldDome.visible = true;
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 3.6, 0.45);
        for (const e of this.getLivingEnemies()) {
          if (this.player.pos.distanceTo(e.runtime.pos) < 3.8) {
            this.applyDamageToEnemy(e, scaledDmg, false, false, 'SHIELD PULSE');
          }
        }
        break;
      }

      case 'super_punch': {
        this.player.vel.x = _dir.x * 16.5;
        this.player.vel.z = _dir.z * 16.5;
        this.player.iFrames = 0.25;
        this.vfx.spawnBurst(_origin, def.hexColor, 14, 6, 1.0, 4);
        for (const e of this.getLivingEnemies()) {
          if (this.player.pos.distanceTo(e.runtime.pos) < 4.7) {
            const isCrit = Math.random() < 0.45;
            this.applyDamageToEnemy(e, scaledDmg, isCrit, true, 'SUPER PUNCH');
            e.runtime.vel.addScaledVector(_dir, 9.5);
            this.cameraShake = Math.max(this.cameraShake, 0.26);
          }
        }
        break;
      }

      case 'energy_blast':
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 23,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 0.78,
          effect: 'pierce',
        });
        this.vfx.spawnBurst(_origin, def.hexColor, 14, 6, 1.0, 2);
        break;

      case 'laser_blast':
        _targetVec.copy(targetEnemy.runtime.pos).setY(1.35);
        this.vfx.spawnLaserBeam(_origin, _targetVec, def.hexColor);
        this.vfx.spawnBurst(_targetVec, def.hexColor, 14, 7, 1.0, 4);
        this.applyDamageToEnemy(targetEnemy, scaledDmg, Math.random() < 0.25, true, 'LASER BLAST');
        this.cameraShake = Math.max(this.cameraShake, 0.16);
        break;

      case 'rocket_attack':
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 14.5,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 0.7,
          effect: 'knockback',
          homing: true,
        });
        this.vfx.spawnBurst(_origin, 0xfbbf24, 12, 5, 0.9, 3);
        break;

      case 'speed_boost':
        this.player.speedBoostTimer = 6.0;
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 3.2, 0.4);
        this.vfx.spawnBurst(_origin, def.hexColor, 14, 6, 0.9, 2);
        break;

      case 'plasma_cannon':
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 18,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 0.95,
          effect: 'stun',
        });
        this.vfx.spawnBurst(_origin, def.hexColor, 16, 6.5, 1.1, 3);
        break;

      case 'meteor_strike': {
        for (let i = 0; i < 3; i++) {
          _targetVec.copy(targetEnemy.runtime.pos);
          _targetVec.x += (i - 1) * 1.1;
          const isMain = i === 1;
          const impactCenter = _targetVec.clone();
          this.vfx.spawnMeteor(_targetVec, def.hexColor, i * 0.14, () => {
            if (isMain) {
              for (const e of this.getLivingEnemies()) {
                if (e.runtime.pos.distanceTo(impactCenter) < 4.5) {
                  this.applyDamageToEnemy(e, scaledDmg, true, true, 'METEOR STRIKE');
                }
              }
              this.cameraShake = Math.max(this.cameraShake, 0.3);
            }
          });
        }
        break;
      }

      case 'healing_power': {
        const healAmt = Math.max(42, Math.round(this.player.maxHp * 0.22));
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 3.6, 0.5);
        _targetVec.copy(this.player.pos).setY(1.2);
        this.vfx.spawnBurst(_targetVec, def.hexColor, 16, 5.5, 1.0, -2);
        this.lastDamageEvent = {
          id: this.damageEventSeq++,
          target: 'player',
          amount: healAmt,
          isCrit: false,
          blocked: false,
          isHeal: true,
          label: 'HEAL',
        };
        this.emitHud();
        break;
      }

      case 'ultimate_energy_blast': {
        _targetVec.copy(targetEnemy.runtime.pos).setY(1.35);
        this.vfx.spawnLaserBeam(_origin, _targetVec, def.hexColor);
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 4.4, 0.45);
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 25,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 1.05,
          effect: 'pierce',
        });
        this.vfx.spawnBurst(_origin, def.hexColor, 20, 8, 1.2, 3);
        this.cameraShake = Math.max(this.cameraShake, 0.26);
        break;
      }

      case 'thunder_storm': {
        const living = this.getLivingEnemies();
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 5.2, 0.45);
        for (const e of living) {
          this.vfx.spawnPillar(e.runtime.pos, def.hexColor, 1.7, true);
          this.vfx.spawnShockRing(e.runtime.pos, def.hexColor, 4.4, 0.48);
          _targetVec.copy(e.runtime.pos).setY(1.5);
          this.vfx.spawnBurst(_targetVec, def.hexColor, 16, 8.5, 1.2, 5);
          e.runtime.stunTimer = Math.max(e.runtime.stunTimer, 1.1);
          this.applyDamageToEnemy(e, scaledDmg, true, false, 'THUNDER STORM');
        }
        this.cameraShake = Math.max(this.cameraShake, 0.3);
        break;
      }

      case 'mega_laser': {
        _targetVec.copy(targetEnemy.runtime.pos).setY(1.35);
        this.vfx.spawnLaserBeam(_origin, _targetVec, def.hexColor);
        this.vfx.spawnLaserBeam(
          _origin.clone().add(_v1.set(0, 0.3, 0)),
          _targetVec.clone().add(_v2.set(0, 0.3, 0)),
          0xfacc15,
        );
        this.vfx.spawnBurst(_targetVec, def.hexColor, 20, 8, 1.25, 4);
        for (const e of this.getLivingEnemies()) {
          if (e === targetEnemy || e.runtime.pos.distanceTo(targetEnemy.runtime.pos) < 3.4) {
            e.runtime.stunTimer = Math.max(e.runtime.stunTimer, 0.7);
            this.applyDamageToEnemy(
              e,
              e === targetEnemy ? scaledDmg : Math.round(scaledDmg * 0.72),
              Math.random() < 0.35,
              true,
              'MEGA LASER',
            );
          }
        }
        this.cameraShake = Math.max(this.cameraShake, 0.28);
        break;
      }

      case 'dragon_fire': {
        const angles = [-0.24, 0, 0.24];
        for (const ang of angles) {
          const cos = Math.cos(ang);
          const sin = Math.sin(ang);
          _v1.set(_dir.x * cos - _dir.z * sin, 0, _dir.x * sin + _dir.z * cos);
          this.vfx.spawnProjectile({
            origin: _origin,
            direction: _v1,
            speed: 18.5,
            owner: 'player',
            damage: Math.round(scaledDmg * 0.78),
            color: def.hexColor,
            radius: 0.75,
            effect: 'knockback',
          });
        }
        this.vfx.spawnBurst(_origin, def.hexColor, 18, 7, 1.15, 3);
        break;
      }

      case 'ice_explosion': {
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 7.2, 0.55);
        this.vfx.spawnBurst(_origin, def.hexColor, 22, 8.5, 1.2, 4);
        const living = this.getLivingEnemies();
        for (const e of living) {
          const dist = e.runtime.pos.distanceTo(this.player.pos);
          if (e === targetEnemy || dist < 6.8) {
            e.runtime.slowTimer = Math.max(e.runtime.slowTimer, 5.0);
            this.vfx.spawnPillar(e.runtime.pos, def.hexColor, 1.2, false);
            this.applyDamageToEnemy(e, scaledDmg, false, true, 'ICE EXPLOSION');
          }
        }
        this.cameraShake = Math.max(this.cameraShake, 0.24);
        break;
      }

      case 'shadow_strike': {
        this.player.vel.x = _dir.x * 18.5;
        this.player.vel.z = _dir.z * 18.5;
        this.player.iFrames = 0.38;
        this.vfx.spawnBurst(_origin, def.hexColor, 18, 7, 1.1, 3);
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 3.8, 0.35);
        for (const e of this.getLivingEnemies()) {
          if (e === targetEnemy || this.player.pos.distanceTo(e.runtime.pos) < 5.0) {
            const isCrit = Math.random() < 0.55;
            this.applyDamageToEnemy(e, scaledDmg, isCrit, true, 'SHADOW STRIKE');
          }
        }
        this.cameraShake = Math.max(this.cameraShake, 0.24);
        break;
      }

      case 'giant_energy_wave': {
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _dir,
          speed: 19.5,
          owner: 'player',
          damage: scaledDmg,
          color: def.hexColor,
          radius: 1.35,
          effect: 'knockback',
        });
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 4.8, 0.45);
        this.vfx.spawnBurst(_origin, def.hexColor, 18, 7, 1.2, 2);
        this.cameraShake = Math.max(this.cameraShake, 0.24);
        break;
      }

      case 'meteor_rain': {
        const living = this.getLivingEnemies();
        for (let i = 0; i < 6; i++) {
          const aimEnemy = living[i % living.length] ?? targetEnemy;
          _targetVec.copy(aimEnemy.runtime.pos);
          _targetVec.x += ((i % 3) - 1) * 1.4;
          _targetVec.z += (Math.floor(i / 3) - 0.5) * 1.4;
          const impactCenter = _targetVec.clone();
          this.vfx.spawnMeteor(_targetVec, def.hexColor, i * 0.1, () => {
            for (const e of this.getLivingEnemies()) {
              if (e.runtime.pos.distanceTo(impactCenter) < 3.5) {
                this.applyDamageToEnemy(
                  e,
                  Math.round(scaledDmg * 0.52),
                  true,
                  true,
                  'METEOR RAIN',
                );
              }
            }
            this.cameraShake = Math.max(this.cameraShake, 0.26);
          });
        }
        break;
      }

      case 'super_shield': {
        this.player.shieldTimer = 8.0;
        this.player.superShieldActive = true;
        if (this.playerRig.shieldDome) this.playerRig.shieldDome.visible = true;
        const healAmt = Math.max(22, Math.round(this.player.maxHp * 0.11));
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 4.8, 0.5);
        for (const e of this.getLivingEnemies()) {
          if (this.player.pos.distanceTo(e.runtime.pos) < 4.5) {
            _v1.copy(e.runtime.pos).sub(this.player.pos).setY(0).normalize();
            e.runtime.vel.addScaledVector(_v1, 9.0);
            this.applyDamageToEnemy(e, scaledDmg, false, true, 'AEGIS PULSE');
          }
        }
        break;
      }

      case 'rage_mode': {
        this.player.rageTimer = 7.5;
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 4.8, 0.5);
        this.vfx.spawnBurst(_origin, def.hexColor, 20, 8, 1.2, 4);
        for (const e of this.getLivingEnemies()) {
          if (this.player.pos.distanceTo(e.runtime.pos) < 4.2) {
            this.applyDamageToEnemy(e, scaledDmg, true, false, 'RAGE ROAR');
          }
        }
        this.cameraShake = Math.max(this.cameraShake, 0.24);
        break;
      }

      case 'time_slow': {
        this.timeSlowTimer = 6.0;
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 8.5, 0.65);
        for (const e of this.getLivingEnemies()) {
          e.runtime.slowTimer = Math.max(e.runtime.slowTimer, 6.0);
          _targetVec.copy(e.runtime.pos).setY(1.3);
          this.vfx.spawnBurst(_targetVec, def.hexColor, 10, 4, 0.9, 1);
          this.applyDamageToEnemy(e, scaledDmg, false, true, 'TIME SLOW');
        }
        break;
      }

      case 'teleport_attack': {
        _origin.copy(this.player.pos).setY(1.2);
        this.vfx.spawnBurst(_origin, def.hexColor, 16, 6, 1.0, 2);
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 3.2, 0.35);

        const maxR = ARENA_RADIUS - 1.2;
        const bx = targetEnemy.runtime.pos.x + _dir.x * 2.1;
        const bz = targetEnemy.runtime.pos.z + _dir.z * 2.1;
        this.player.pos.x = THREE.MathUtils.clamp(bx, -maxR, maxR);
        this.player.pos.z = THREE.MathUtils.clamp(bz, -maxR, maxR);
        this.faceTarget(this.player, targetEnemy.runtime.pos);
        this.player.iFrames = 0.45;

        _targetVec.copy(this.player.pos).setY(1.3);
        this.vfx.spawnBurst(_targetVec, def.hexColor, 18, 7, 1.1, 3);
        this.vfx.spawnShockRing(this.player.pos, def.hexColor, 4.0, 0.4);
        this.applyDamageToEnemy(targetEnemy, scaledDmg, true, true, 'TELEPORT CRIT!');
        this.cameraShake = Math.max(this.cameraShake, 0.26);
        break;
      }

      case 'ultimate': {
        this.player.iFrames = 0.85;
        this.vfx.spawnShockRing(this.player.pos, 0xf43f5e, 8.0, 0.65);
        for (const e of this.getLivingEnemies()) {
          this.vfx.spawnShockRing(e.runtime.pos, 0xfacc15, 5.8, 0.58);
          this.vfx.spawnPillar(e.runtime.pos, 0xf43f5e, 1.8, true);
          _targetVec.copy(e.runtime.pos).setY(1.6);
          this.vfx.spawnBurst(_targetVec, 0xf43f5e, 20, 10, 1.3, 5);
          this.applyDamageToEnemy(e, scaledDmg, true, true, 'COSMIC NOVA!');
        }
        this.hitstopTimer = 0.06;
        this.cameraShake = 0.36;
        break;
      }
    }
    this.emitHud();
  }

  private getMoveInputX(): number {
    let x = this.joyVec.x;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) x -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) x += 1;
    return THREE.MathUtils.clamp(x, -1, 1);
  }

  private getMoveInputZ(): number {
    let z = this.joyVec.y;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) z -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) z += 1;
    return THREE.MathUtils.clamp(z, -1, 1);
  }

  private faceTarget(actor: FighterRuntime, targetPos: THREE.Vector3) {
    const dx = targetPos.x - actor.pos.x;
    const dz = targetPos.z - actor.pos.z;
    if (dx * dx + dz * dz > 0.0001) {
      actor.rotY = Math.atan2(dx, dz);
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keysHeld.add(e.code);
    if (this.mode !== 'battle') return;

    if (e.code === 'Space') {
      e.preventDefault();
      this.triggerPlayerAction('jump');
    } else if (e.code === 'KeyJ') {
      this.triggerPlayerAction('normal');
    } else if (e.code === 'KeyF') {
      this.triggerPlayerAction('kick');
    } else if (e.code === 'KeyK') {
      this.triggerPlayerAction('heavy');
    } else if (e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.triggerPlayerAction('dodge');
    } else if (e.code === 'KeyI' || e.code === 'KeyB') {
      this.setBlockHeld(true);
    } else if (e.code === 'Digit1') {
      if (this.playerSlotPowers[0]) this.triggerPlayerPower(this.playerSlotPowers[0]);
    } else if (e.code === 'Digit2') {
      if (this.playerSlotPowers[1]) this.triggerPlayerPower(this.playerSlotPowers[1]);
    } else if (e.code === 'Digit3') {
      if (this.playerSlotPowers[2]) this.triggerPlayerPower(this.playerSlotPowers[2]);
    } else if (e.code === 'Digit4') {
      if (this.playerSlotPowers[3]) this.triggerPlayerPower(this.playerSlotPowers[3]);
    } else if (e.code === 'KeyU') this.triggerPlayerPower('ultimate');
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
    if (e.code === 'KeyI' || e.code === 'KeyB') {
      this.setBlockHeld(false);
    }
  };

  private onWindowBlur = () => {
    this.keysHeld.clear();
    this.joyVec = { x: 0, y: 0 };
    this.setBlockHeld(false);
  };

  private onCanvasPointerDown = (e: PointerEvent) => {
    if (this.mode !== 'battle' || e.pointerType === 'touch') return;
    if (e.button === 0) {
      this.triggerPlayerAction('normal');
    } else if (e.button === 2) {
      this.triggerPlayerAction('heavy');
    }
  };

  private onCanvasContextMenu = (e: MouseEvent) => {
    if (this.mode === 'battle') e.preventDefault();
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  };

  private onContextRestored = () => {
    this.clock.start();
    this.startLoop();
  };

  private handleResize() {
    const w = Math.max(this.container.clientWidth, 320);
    const h = Math.max(this.container.clientHeight, 240);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number) {
    this.elapsed += dt;

    if (this.arena) {
      for (let i = 0; i < this.arena.animatedProps.length; i++) {
        const prop = this.arena.animatedProps[i];
        prop.rotation.y += dt * (i % 2 === 0 ? 0.9 : -0.6);
      }
    }

    if (this.mode === 'paused') return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt);
      return;
    }

    if (this.mode === 'boss_intro') {
      this.introTimer += dt;
      if (this.introTimer >= 2.1) {
        this.mode = 'battle';
        this.callbacks.onIntroFinished();
      }
    } else if (this.mode === 'battle') {
      this.battleTime += dt;
      this.updateBattle(dt);
    }

    const nearestEnemy = this.getNearestLivingEnemy();
    const bossProjScale = this.timeSlowTimer > 0 ? 0.35 : 1.0;
    this.vfx.update(dt, this.player.pos, nearestEnemy ? nearestEnemy.runtime.pos : undefined, bossProjScale);

    this.syncRig(this.player, this.playerRig, this.playerShadow, dt);
    const enemyAnimDt = this.timeSlowTimer > 0 ? dt * 0.35 : dt;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      this.syncRig(e.runtime, e.rig, e.shadow, enemyAnimDt);
      if (e.telegraphRing.visible) {
        e.telegraphRing.position.set(e.runtime.pos.x, 0.05, e.runtime.pos.z);
        const pulse = 1 + Math.sin(this.elapsed * 22 + i) * 0.14;
        e.telegraphRing.scale.setScalar(pulse * e.spec.scale);
      }
    }

    this.updateCamera(dt);

    this.hudEmitAccum += dt;
    if (this.mode === 'battle' && this.hudEmitAccum >= 0.06) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private syncRig(
    runtime: FighterRuntime,
    rig: ArticulatedFighterRig,
    shadow: THREE.Mesh,
    dt: number,
  ) {
    rig.root.position.copy(runtime.pos);
    rig.root.rotation.y = runtime.rotY;
    shadow.position.set(runtime.pos.x, 0.025, runtime.pos.z);
    const heightScale = Math.max(0.45, 1 - (runtime.pos.y + rig.hoverBaseY) * 0.14);
    shadow.scale.setScalar((rig.isBoss ? 1.28 * rig.scaleFactor : 1) * heightScale);

    if (rig.shieldDome) {
      rig.shieldDome.visible = runtime.shieldTimer > 0 && runtime.hp > 0;
      if (rig.shieldDome.visible) {
        rig.shieldDome.rotation.y += dt * 1.8;
      }
    }

    if (runtime.flashTimer > 0) {
      runtime.flashTimer -= dt;
      for (const m of rig.flashMaterials) {
        m.emissive.setHex(0xffffff);
        m.emissiveIntensity = 0.85;
      }
    } else {
      for (const m of rig.flashMaterials) {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    }

    animateFighterRig(rig, runtime.state, runtime.stateTimer, this.elapsed, dt, runtime.comboStep);
  }

  private updateBattle(dt: number) {
    (Object.keys(this.powerCooldowns) as PowerId[]).forEach((k) => {
      if (this.powerCooldowns[k] > 0) {
        this.powerCooldowns[k] = Math.max(0, this.powerCooldowns[k] - dt);
      }
    });

    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.comboCount = 0;
    }

    if (this.timeSlowTimer > 0) {
      this.timeSlowTimer = Math.max(0, this.timeSlowTimer - dt);
    }
    if (this.phaseBannerTimer > 0) {
      this.phaseBannerTimer -= dt;
      if (this.phaseBannerTimer <= 0) this.phaseBanner = null;
    }

    const energyRate =
      (this.player.speedBoostTimer > 0 ? 15.0 : 10.5) * (this.player.rageTimer > 0 ? 1.45 : 1.0);
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + dt * energyRate);
    this.ultimateCharge = Math.min(100, this.ultimateCharge + dt * 3.6);
    if (this.player.iFrames > 0) this.player.iFrames -= dt;
    if (this.player.shieldTimer > 0) {
      this.player.shieldTimer -= dt;
      if (this.player.shieldTimer <= 0) this.player.superShieldActive = false;
    }
    if (this.player.speedBoostTimer > 0) this.player.speedBoostTimer -= dt;
    if (this.player.rageTimer > 0) this.player.rageTimer -= dt;
    if (this.player.stunTimer > 0) this.player.stunTimer -= dt;

    this.updatePlayerCombat(dt);
    this.integrateFighterPhysics(this.player, dt);

    // Count currently active melee attackers so multi-enemy waves coordinate fairly
    let activeAttackers = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (
        e.pendingAction !== null ||
        e.runtime.state === 'attack_normal' ||
        e.runtime.state === 'attack_kick' ||
        e.runtime.state === 'attack_heavy' ||
        e.runtime.state === 'cast_power'
      ) {
        activeAttackers++;
      }
    }

    const multiCount = this.getLivingEnemies().length;
    const enemyDt = this.timeSlowTimer > 0 ? dt * 0.35 : dt;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) {
        e.runtime.stateTimer += enemyDt;
        continue;
      }
      if (e.runtime.iFrames > 0) e.runtime.iFrames -= dt;
      if (e.runtime.stunTimer > 0) e.runtime.stunTimer -= dt;
      if (e.runtime.slowTimer > 0) e.runtime.slowTimer -= dt;
      if (e.runtime.shieldTimer > 0) e.runtime.shieldTimer -= dt;
      if (e.runtime.speedBoostTimer > 0) e.runtime.speedBoostTimer -= dt;
      if (e.runtime.rageTimer > 0) e.runtime.rageTimer -= dt;

      const allowInitiateAttack = multiCount === 1 || activeAttackers < (multiCount >= 3 ? 2 : 1);
      const initiated = this.updateEnemyAi(e, enemyDt, allowInitiateAttack, multiCount);
      if (initiated) activeAttackers++;

      this.integrateFighterPhysics(e.runtime, enemyDt);
    }

    // Player <-> Living Enemies soft separation
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      _v1.copy(this.player.pos).sub(e.runtime.pos).setY(0);
      const minDist = 1.65;
      const dist = _v1.length();
      if (dist < minDist && dist > 0.001) {
        _v1.normalize().multiplyScalar((minDist - dist) * 0.5);
        this.player.pos.add(_v1);
        e.runtime.pos.sub(_v1);
      }
    }

    // Living Enemy <-> Living Enemy separation so enemies flank from distinct angles without stacking
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (!b.alive) continue;
        _v1.copy(a.runtime.pos).sub(b.runtime.pos).setY(0);
        const minSep = 1.85;
        const dist = _v1.length();
        if (dist < minSep && dist > 0.001) {
          _v1.normalize().multiplyScalar((minSep - dist) * 0.5);
          a.runtime.pos.add(_v1);
          b.runtime.pos.sub(_v1);
        }
      }
    }

    this.resolveProjectiles();
  }

  private updatePlayerCombat(dt: number) {
    const p = this.player;
    p.stateTimer += dt;
    const nearest = this.getNearestLivingEnemy();

    if (p.state === 'attack_normal' || p.state === 'attack_kick' || p.state === 'attack_heavy') {
      const hitAt = p.state === 'attack_normal' ? 0.12 : p.state === 'attack_kick' ? 0.17 : 0.26;
      if (!p.attackHitApplied && p.stateTimer >= hitAt) {
        p.attackHitApplied = true;
        const reach = p.state === 'attack_normal' ? 3.05 : p.state === 'attack_kick' ? 3.3 : 3.5;
        const fwdX = Math.sin(p.rotY);
        const fwdZ = Math.cos(p.rotY);
        let hitAny = false;

        for (const e of this.enemies) {
          if (!e.alive) continue;
          const dx = e.runtime.pos.x - p.pos.x;
          const dz = e.runtime.pos.z - p.pos.z;
          const d = Math.hypot(dx, dz);
          if (d <= reach) {
            const dot = d > 0.01 ? (dx / d) * fwdX + (dz / d) * fwdZ : 1;
            if (dot > -0.15 || d < 1.9) {
              hitAny = true;
              const isHeavy = p.state === 'attack_heavy';
              const isKick = p.state === 'attack_kick';
              const isCrit = Math.random() < (isHeavy ? 0.28 : isKick ? 0.22 : 0.14);
              const baseDmg = isHeavy ? 22 : isKick ? 17 : p.comboStep === 2 ? 16 : 12;
              const label = isHeavy ? 'HEAVY' : isKick ? 'KICK' : p.comboStep === 2 ? 'UPPERCUT' : undefined;
              this.applyDamageToEnemy(e, this.scalePlayerDamage(baseDmg), isCrit, isHeavy, label);
              _dir.set(dx, 0, dz).normalize();
              e.runtime.vel.addScaledVector(_dir, isHeavy ? 7.5 : isKick ? 6.2 : 3.4);
            }
          }
        }
        if (!hitAny) {
          soundEngine.playDodge();
        }
      }
      if (p.stateTimer >= p.stateDuration) {
        p.state = 'idle';
      }
      return;
    }

    if (p.state === 'dodge' || p.state === 'cast_power' || p.state === 'ultimate' || p.state === 'hitstun') {
      if (p.stateTimer >= p.stateDuration) {
        p.state = 'idle';
      }
      return;
    }

    const mx = this.getMoveInputX();
    const mz = this.getMoveInputZ();
    const boostMult = (p.speedBoostTimer > 0 ? 1.48 : 1.0) * (p.rageTimer > 0 ? 1.25 : 1.0);
    const speed = (p.blocking ? 2.8 : 7.0) * boostMult;
    const hasMove = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05;

    if (hasMove) {
      _v2.set(mx, 0, mz).normalize().multiplyScalar(speed);
      p.vel.x = THREE.MathUtils.lerp(p.vel.x, _v2.x, 1 - Math.exp(-15 * dt));
      p.vel.z = THREE.MathUtils.lerp(p.vel.z, _v2.z, 1 - Math.exp(-15 * dt));
      if (p.pos.y <= 0.05 && !p.blocking) p.state = 'move';
      if (p.blocking && nearest) {
        this.faceTarget(p, nearest.runtime.pos);
      } else {
        p.rotY = Math.atan2(_v2.x, _v2.z);
      }
    } else {
      if (p.pos.y <= 0.05 && !p.blocking) p.state = 'idle';
      if (nearest) this.faceTarget(p, nearest.runtime.pos);
    }
  }

  private updateEnemyAi(
    enemy: EnemyEntity,
    dt: number,
    allowInitiateAttack: boolean,
    livingCount: number,
  ): boolean {
    const b = enemy.runtime;
    const spec = enemy.spec;
    b.stateTimer += dt;

    if (b.stunTimer > 0) {
      b.state = 'hitstun';
      enemy.telegraphRing.visible = false;
      enemy.telegraphLabel = null;
      enemy.pendingAction = null;
      return false;
    }

    if (enemy.pendingAction && enemy.telegraphTimer > 0) {
      enemy.telegraphTimer -= dt;
      this.faceTarget(b, this.player.pos);
      if (enemy.telegraphTimer <= 0) {
        const act = enemy.pendingAction;
        enemy.pendingAction = null;
        enemy.telegraphLabel = null;
        enemy.telegraphRing.visible = false;
        this.executeEnemyAction(enemy, act);
      }
      return false;
    }

    if (b.state === 'attack_normal' || b.state === 'attack_kick' || b.state === 'attack_heavy') {
      const hitAt = b.state === 'attack_normal' ? 0.18 : b.state === 'attack_kick' ? 0.22 : 0.32;
      if (!b.attackHitApplied && b.stateTimer >= hitAt) {
        b.attackHitApplied = true;
        const reach = b.state === 'attack_heavy' ? 3.55 : 3.0;
        if (b.pos.distanceTo(this.player.pos) <= reach) {
          const mult = b.state === 'attack_heavy' ? 1.5 : b.state === 'attack_kick' ? 1.2 : 1.0;
          const phaseMult = enemy.phase === 3 ? 1.24 : enemy.phase === 2 ? 1.12 : 1.0;
          const rageMult = b.rageTimer > 0 ? 1.25 : 1.0;
          const multiDamp =
            this.enemies.length >= 4 ? 0.62 : this.enemies.length === 3 ? 0.75 : this.enemies.length === 2 ? 0.86 : 1.0;
          const dmg = spec.attackPower * mult * phaseMult * rageMult * multiDamp;
          this.applyDamageToPlayer(Math.round(dmg), b.state === 'attack_heavy', false);
        }
      }
      if (b.stateTimer >= b.stateDuration) b.state = 'idle';
      return false;
    }

    if (b.state === 'dodge' || b.state === 'cast_power' || b.state === 'hitstun') {
      if (b.stateTimer >= b.stateDuration) b.state = 'idle';
      return false;
    }

    this.faceTarget(b, this.player.pos);
    const dist = b.pos.distanceTo(this.player.pos);
    const slowMult = b.slowTimer > 0 ? 0.55 : 1.0;
    const phaseSpeedMult = enemy.phase === 3 ? 1.25 : enemy.phase === 2 ? 1.12 : 1.0;
    const boostMult = (b.speedBoostTimer > 0 ? 1.4 : 1.0) * (b.rageTimer > 0 ? 1.22 : 1.0) * phaseSpeedMult;
    const moveSpd = spec.speed * slowMult * boostMult;

    enemy.strafeTimer -= dt;
    if (enemy.strafeTimer <= 0) {
      enemy.strafeDir = Math.random() < 0.5 ? -1 : 1;
      enemy.strafeTimer = spec.aiStyle === 'ninja' ? 0.85 : 1.5;
    }

    // Reactive defense when player swings nearby
    if (
      dist < 3.5 &&
      (this.player.state === 'attack_normal' ||
        this.player.state === 'attack_kick' ||
        this.player.state === 'attack_heavy') &&
      enemy.aiCooldown > 0.2
    ) {
      const roll = Math.random();
      if (roll < spec.dodgeChance * 0.42) {
        b.state = 'dodge';
        b.stateTimer = 0;
        b.stateDuration = 0.28;
        b.iFrames = 0.28;
        _dir.copy(b.pos).sub(this.player.pos).setY(0).normalize();
        const sideDodge = spec.aiStyle === 'ninja' ? 1.0 : 0.3;
        b.vel.x = (_dir.x + -_dir.z * enemy.strafeDir * sideDodge) * 10.5;
        b.vel.z = (_dir.z + _dir.x * enemy.strafeDir * sideDodge) * 10.5;
        soundEngine.playDodge();
        return false;
      } else if (roll < spec.dodgeChance * 0.42 + spec.blockChance * 0.5) {
        b.blocking = true;
        b.state = 'block';
        enemy.aiCooldown = 0.45;
        return false;
      }
    }
    b.blocking = false;

    const style = spec.aiStyle;
    const preferredDist =
      style === 'ranged_laser'
        ? 6.4
        : style === 'aerial_striker'
          ? 4.9
          : style === 'feral_rusher'
            ? 2.2
            : 2.75;

    // Flanking offset: compute target ring position around the player so multi-enemies surround from different sides
    _dir.copy(this.player.pos).sub(b.pos).setY(0);
    if (_dir.lengthSq() < 0.001) _dir.set(-1, 0, 0);
    _dir.normalize();

    if (style === 'shadow_blinker' && dist > 4.2 && enemy.aiCooldown <= 0.15 && Math.random() < 0.32) {
      _origin.copy(b.pos).setY(1.2);
      this.vfx.spawnBurst(_origin, spec.emissiveColor, 12, 5, 0.9, 2);
      const flankCos = Math.cos(enemy.flankAngle);
      const flankSin = Math.sin(enemy.flankAngle);
      const rx = _dir.x * flankCos - _dir.z * flankSin;
      const rz = _dir.x * flankSin + _dir.z * flankCos;
      b.pos.x = THREE.MathUtils.clamp(this.player.pos.x - rx * 2.5, -ARENA_RADIUS + 1.2, ARENA_RADIUS - 1.2);
      b.pos.z = THREE.MathUtils.clamp(this.player.pos.z - rz * 2.5, -ARENA_RADIUS + 1.2, ARENA_RADIUS - 1.2);
      this.faceTarget(b, this.player.pos);
      this.vfx.spawnShockRing(b.pos, spec.emissiveColor, 3.0, 0.35);
      enemy.aiCooldown = 0.55;
      return false;
    }

    // Apply angular flank vector when approaching in multi-enemy battles
    const cosF = Math.cos(enemy.flankAngle * 0.55);
    const sinF = Math.sin(enemy.flankAngle * 0.55);
    const approachX = _dir.x * cosF - _dir.z * sinF;
    const approachZ = _dir.x * sinF + _dir.z * cosF;

    if (dist > preferredDist + 0.55) {
      b.vel.x = THREE.MathUtils.lerp(b.vel.x, approachX * moveSpd, 1 - Math.exp(-9 * dt));
      b.vel.z = THREE.MathUtils.lerp(b.vel.z, approachZ * moveSpd, 1 - Math.exp(-9 * dt));
      b.state = 'move';
    } else if (style === 'ranged_laser' && dist < 4.0) {
      const backX = -_dir.x * moveSpd * 0.75 + -_dir.z * enemy.strafeDir * moveSpd * 0.6;
      const backZ = -_dir.z * moveSpd * 0.75 + _dir.x * enemy.strafeDir * moveSpd * 0.6;
      b.vel.x = THREE.MathUtils.lerp(b.vel.x, backX, 1 - Math.exp(-8 * dt));
      b.vel.z = THREE.MathUtils.lerp(b.vel.z, backZ, 1 - Math.exp(-8 * dt));
      b.state = 'move';
    } else {
      const strafeScale = style === 'ninja' || style === 'aerial_striker' || style === 'feral_rusher' ? 0.95 : 0.55;
      const strafeX = -_dir.z * enemy.strafeDir * moveSpd * strafeScale;
      const strafeZ = _dir.x * enemy.strafeDir * moveSpd * strafeScale;
      b.vel.x = THREE.MathUtils.lerp(b.vel.x, strafeX, 1 - Math.exp(-8 * dt));
      b.vel.z = THREE.MathUtils.lerp(b.vel.z, strafeZ, 1 - Math.exp(-8 * dt));
      b.state = 'move';
    }

    // Stagger cooldowns slightly slower when 2, 3, or 4 enemies are alive so combat feels tough yet fair
    const cadenceMult =
      livingCount === 1 ? 1.0 : livingCount === 2 ? 0.76 : livingCount === 3 ? 0.62 : 0.52;
    const phaseCadence = enemy.phase === 3 ? 1.32 : enemy.phase === 2 ? 1.15 : 1.0;
    enemy.aiCooldown -= dt * (0.8 + spec.aggression * 0.55) * cadenceMult * phaseCadence;

    if (enemy.aiCooldown <= 0) {
      if (!allowInitiateAttack) {
        enemy.aiCooldown = 0.35;
        return false;
      }

      const combinedPowers: MonsterPowerId[] = [...spec.signaturePowers, ...enemy.extraPowers];
      const useExtraChance = enemy.extraPowers.length > 0 ? 0.42 : 0;
      const usePowerChance =
        style === 'ranged_laser'
          ? 0.78
          : style === 'feral_rusher'
            ? 0.3
            : 0.42 + Math.min(0.32, enemy.extraPowers.length * 0.1);

      if (dist <= 3.3 && Math.random() > usePowerChance) {
        const atkRoll = Math.random();
        const comboRate = style === 'feral_rusher' ? 0.68 : 1.0;
        if (atkRoll < 0.45) {
          b.comboStep = (b.comboStep + 1) % 3;
          b.state = 'attack_normal';
          b.stateTimer = 0;
          b.stateDuration = 0.38;
          b.attackHitApplied = false;
          enemy.aiCooldown = (1.05 - spec.aggression * 0.32) * comboRate;
        } else if (atkRoll < 0.72) {
          b.state = 'attack_kick';
          b.stateTimer = 0;
          b.stateDuration = 0.42;
          b.attackHitApplied = false;
          enemy.aiCooldown = (1.2 - spec.aggression * 0.28) * comboRate;
        } else {
          enemy.pendingAction = 'heavy';
          enemy.telegraphTimer = 0.55;
          enemy.telegraphLabel = `⚠ ${spec.name}: HEAVY SLAM!`;
          enemy.telegraphRing.visible = true;
          enemy.aiCooldown = 1.65;
        }
        return true;
      } else if (combinedPowers.length > 0) {
        const useEarned = Math.random() < useExtraChance;
        const pool = useEarned ? enemy.extraPowers : combinedPowers;
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        const pDef = getMonsterPowerDef(chosen);
        enemy.pendingAction = chosen;
        enemy.telegraphTimer = chosen === 'm_ultimate' || chosen === 'ultimate' ? 0.8 : 0.5;
        enemy.telegraphLabel = `⚠ ${spec.name}: ${pDef.name.toUpperCase()}`;
        enemy.telegraphRing.visible = true;
        enemy.aiCooldown = 1.7 - spec.aggression * 0.35;
        return true;
      } else {
        enemy.aiCooldown = 0.8;
      }
    }

    return false;
  }

  private executeEnemyAction(enemy: EnemyEntity, act: 'heavy' | 'kick' | MonsterPowerId) {
    const b = enemy.runtime;
    if (act === 'heavy') {
      b.state = 'attack_heavy';
      b.stateTimer = 0;
      b.stateDuration = 0.55;
      b.attackHitApplied = false;
      _dir.copy(this.player.pos).sub(b.pos).setY(0).normalize();
      b.vel.x = _dir.x * 7;
      b.vel.z = _dir.z * 7;
      return;
    }
    if (act === 'kick') {
      b.state = 'attack_kick';
      b.stateTimer = 0;
      b.stateDuration = 0.42;
      b.attackHitApplied = false;
      return;
    }

    const pDef = getMonsterPowerDef(act);
    b.state = 'cast_power';
    b.stateTimer = 0;
    b.stateDuration = 0.44;
    soundEngine.playMonsterPower(act);

    _dir.copy(this.player.pos).sub(b.pos).setY(0).normalize();
    _origin.copy(b.pos).addScaledVector(_dir, 1.1).setY(1.45);
    const dmgScale = 1 + Math.min(3.5, (this.currentLevel.level - 1) * 0.032);
    const multiDamp =
      this.enemies.length >= 4 ? 0.62 : this.enemies.length === 3 ? 0.75 : this.enemies.length === 2 ? 0.86 : 1.0;
    const phaseMult = enemy.phase === 3 ? 1.24 : enemy.phase === 2 ? 1.12 : 1.0;
    const rageMult = b.rageTimer > 0 ? 1.25 : 1.0;
    const finalDmg = Math.round(pDef.damage * dmgScale * multiDamp * phaseMult * rageMult);

    if (act === 'healing_power') {
      const heal = Math.round(b.maxHp * 0.09);
      b.hp = Math.min(b.maxHp, b.hp + heal);
      this.vfx.spawnShockRing(b.pos, pDef.hexColor, 3.8, 0.5);
      _targetVec.copy(b.pos).setY(1.4);
      this.vfx.spawnBurst(_targetVec, pDef.hexColor, 16, 6, 1.0, -2);
      this.lastDamageEvent = {
        id: this.damageEventSeq++,
        target: 'boss',
        amount: heal,
        isCrit: false,
        blocked: false,
        isHeal: true,
        label: `${enemy.spec.name} HEAL`,
      };
      this.emitHud();
      return;
    }

    if (act === 'shield' || act === 'super_shield') {
      b.shieldTimer = act === 'super_shield' ? 7.0 : 5.0;
      this.vfx.spawnShockRing(b.pos, pDef.hexColor, act === 'super_shield' ? 4.4 : 3.5, 0.45);
      return;
    }

    if (act === 'speed_boost' || act === 'time_slow') {
      b.speedBoostTimer = act === 'time_slow' ? 6.0 : 5.0;
      this.vfx.spawnShockRing(b.pos, pDef.hexColor, 4.0, 0.45);
      return;
    }

    if (act === 'rage_mode') {
      b.rageTimer = 6.5;
      this.vfx.spawnShockRing(b.pos, pDef.hexColor, 4.6, 0.5);
      this.vfx.spawnBurst(_origin, pDef.hexColor, 18, 7, 1.1, 4);
      return;
    }

    if (act === 'laser_blast' || act === 'mega_laser') {
      _targetVec.copy(this.player.pos).setY(1.25);
      this.vfx.spawnLaserBeam(_origin, _targetVec, pDef.hexColor);
      if (act === 'mega_laser') {
        this.vfx.spawnLaserBeam(
          _origin.clone().add(_v1.set(0, 0.35, 0)),
          _targetVec.clone().add(_v2.set(0, 0.35, 0)),
          0xfacc15,
        );
      }
      this.vfx.spawnBurst(_targetVec, pDef.hexColor, 14, 6.5, 1.0, 4);
      if (this.player.iFrames <= 0) {
        this.applyDamageToPlayer(finalDmg, act === 'mega_laser', true);
      }
      return;
    }

    if (act === 'meteor_strike' || act === 'meteor_rain') {
      const drops = act === 'meteor_rain' ? 4 : 2;
      for (let i = 0; i < drops; i++) {
        _targetVec.copy(this.player.pos).add(_v1.set((i - (drops - 1) / 2) * 1.4, 0, ((i % 2) - 0.5) * 1.1));
        const impactPos = _targetVec.clone();
        this.vfx.spawnMeteor(_targetVec, pDef.hexColor, i * 0.16, () => {
          if (this.player.pos.distanceTo(impactPos) < 2.4) {
            this.applyDamageToPlayer(Math.round(finalDmg * (act === 'meteor_rain' ? 0.55 : 0.7)), true, false);
          }
        });
      }
      return;
    }

    if (act === 'thunder' || act === 'lightning' || act === 'thunder_storm') {
      this.vfx.spawnPillar(this.player.pos, pDef.hexColor, act === 'thunder_storm' ? 1.6 : 1.3, true);
      this.vfx.spawnShockRing(this.player.pos, pDef.hexColor, act === 'thunder_storm' ? 4.4 : 3.5, 0.45);
      if (this.player.iFrames <= 0) {
        this.applyDamageToPlayer(finalDmg, true, false);
      }
      return;
    }

    if (act === 'ice_explosion') {
      this.vfx.spawnShockRing(b.pos, pDef.hexColor, 5.4, 0.5);
      this.vfx.spawnBurst(_origin, pDef.hexColor, 16, 7, 1.1, 4);
      if (b.pos.distanceTo(this.player.pos) < 5.0 && this.player.pos.y < 1.2) {
        this.applyDamageToPlayer(finalDmg, true, false);
      }
      return;
    }

    if (act === 'dragon_fire') {
      for (const ang of [-0.22, 0, 0.22]) {
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        _v1.set(_dir.x * c - _dir.z * s, 0, _dir.x * s + _dir.z * c);
        this.vfx.spawnProjectile({
          origin: _origin,
          direction: _v1,
          speed: 15.5,
          owner: 'boss',
          damage: Math.round(finalDmg * 0.68),
          color: pDef.hexColor,
          radius: 0.72,
          effect: 'knockback',
        });
      }
      this.vfx.spawnBurst(_origin, pDef.hexColor, 14, 6, 1.0, 3);
      return;
    }

    if (act === 'teleport_attack' || act === 'shadow_strike') {
      this.vfx.spawnBurst(_origin, pDef.hexColor, 14, 6, 1.0, 2);
      const maxR = ARENA_RADIUS - 1.2;
      if (act === 'teleport_attack') {
        b.pos.x = THREE.MathUtils.clamp(this.player.pos.x + _dir.x * 2.2, -maxR, maxR);
        b.pos.z = THREE.MathUtils.clamp(this.player.pos.z + _dir.z * 2.2, -maxR, maxR);
      } else {
        b.vel.x = _dir.x * 14;
        b.vel.z = _dir.z * 14;
      }
      this.faceTarget(b, this.player.pos);
      this.vfx.spawnShockRing(b.pos, pDef.hexColor, 3.8, 0.4);
      if (b.pos.distanceTo(this.player.pos) < 3.6) {
        this.applyDamageToPlayer(finalDmg, true, true);
      }
      return;
    }

    if (act === 'm_heavy_punch' || act === 'super_punch' || act === 'ground_shockwave' || act === 'earth') {
      b.vel.x = _dir.x * 12;
      b.vel.z = _dir.z * 12;
      this.vfx.spawnShockRing(b.pos, pDef.hexColor, 4.4, 0.45);
      if (b.pos.distanceTo(this.player.pos) < 4.2 && this.player.pos.y < 1.1) {
        this.applyDamageToPlayer(finalDmg, true, false);
      }
      return;
    }

    if (act === 'm_special' || act === 'm_ultimate' || act === 'ultimate' || act === 'ultimate_energy_blast') {
      const isUlt = act === 'm_ultimate' || act === 'ultimate' || act === 'ultimate_energy_blast';
      const radius = isUlt ? 5.6 : 4.2;
      this.vfx.spawnShockRing(b.pos, pDef.hexColor, radius, 0.5);
      this.vfx.spawnBurst(_origin, pDef.hexColor, 18, 8, 1.2, 5);
      if (b.pos.distanceTo(this.player.pos) < radius && this.player.pos.y < 1.2) {
        this.applyDamageToPlayer(finalDmg, true, isUlt);
      }
      this.vfx.spawnProjectile({
        origin: _origin,
        direction: _dir,
        speed: 14.5,
        owner: 'boss',
        damage: Math.round(finalDmg * 0.72),
        color: pDef.hexColor,
        radius: 0.78,
        effect: isUlt ? 'pierce' : 'none',
      });
      return;
    }

    // Ranged Projectile Powers (includes giant_energy_wave, plasma_cannon, rocket_attack, etc.)
    this.vfx.spawnProjectile({
      origin: _origin,
      direction: _dir,
      speed: act === 'm_lightning' ? 20 : act === 'rocket_attack' ? 13.5 : 15.5,
      owner: 'boss',
      damage: finalDmg,
      color: pDef.hexColor,
      radius: act === 'giant_energy_wave' ? 1.15 : act === 'plasma_cannon' ? 0.85 : 0.65,
      effect: act === 'ice' || act === 'm_ice' ? 'slow' : 'none',
      homing: act === 'rocket_attack',
    });
    this.vfx.spawnBurst(_origin, pDef.hexColor, 10, 5, 0.85, 3);
  }

  private resolveProjectiles() {
    for (const pr of this.vfx.projectiles) {
      if (!pr.active) continue;
      if (pr.owner === 'player') {
        let hitEnemy: EnemyEntity | null = null;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          _targetVec.copy(e.runtime.pos).setY(1.3);
          if (pr.pos.distanceTo(_targetVec) <= pr.radius + 1.05 * e.spec.scale) {
            hitEnemy = e;
            break;
          }
        }
        if (hitEnemy) {
          pr.active = false;
          pr.group.visible = false;
          this.vfx.spawnBurst(pr.pos, pr.color, 16, 7.5, 1.1, 6);
          _v1.copy(pr.pos).setY(0.1);
          this.vfx.spawnShockRing(_v1, pr.color, 3.0, 0.35);

          // Apply impact + slight splash to enemies huddled right next to target
          const isCrit = Math.random() < 0.2;
          for (const e of this.enemies) {
            if (!e.alive) continue;
            const splashDist = e === hitEnemy ? 0 : e.runtime.pos.distanceTo(hitEnemy.runtime.pos);
            if (e === hitEnemy || splashDist < 2.6) {
              if (pr.effect === 'slow') e.runtime.slowTimer = 3.5;
              if (pr.effect === 'stun') e.runtime.stunTimer = 0.9;
              if (pr.effect === 'knockback') {
                _dir.copy(pr.vel).setY(0).normalize();
                e.runtime.vel.addScaledVector(_dir, 9.0);
              }
              this.applyDamageToEnemy(
                e,
                e === hitEnemy ? pr.damage : Math.round(pr.damage * 0.55),
                e === hitEnemy ? isCrit : false,
                pr.effect === 'pierce',
              );
            }
          }
          continue;
        }
      } else {
        _targetVec.copy(this.player.pos).setY(1.2);
        if (pr.pos.distanceTo(_targetVec) <= pr.radius + 0.72) {
          pr.active = false;
          pr.group.visible = false;
          this.vfx.spawnBurst(pr.pos, pr.color, 14, 6.5, 1.0, 5);
          this.applyDamageToPlayer(pr.damage, false, pr.effect === 'pierce');
          continue;
        }
      }
      if (Math.hypot(pr.pos.x, pr.pos.z) > ARENA_RADIUS + 4) {
        pr.active = false;
        pr.group.visible = false;
      }
    }
  }

  private applyDamageToEnemy(
    enemy: EnemyEntity,
    rawAmount: number,
    isCrit: boolean,
    unblockable: boolean,
    label?: string,
  ) {
    if (this.mode !== 'battle' || !enemy.alive || enemy.runtime.iFrames > 0) return;
    const target = enemy.runtime;
    let dmg = rawAmount;
    if (isCrit) dmg = Math.round(dmg * 1.45);

    const blocked = !unblockable && target.blocking;
    if (blocked) {
      dmg = Math.max(2, Math.round(dmg * 0.3));
      soundEngine.playBlock();
      _targetVec.copy(target.pos).setY(1.4);
      this.vfx.spawnBurst(_targetVec, 0x94a3b8, 10, 5, 0.8, 4);
    } else if (target.shieldTimer > 0) {
      dmg = Math.max(2, Math.round(dmg * 0.4));
      soundEngine.playBlock();
      this.vfx.spawnShockRing(target.pos, 0x3b82f6, 2.4, 0.25);
    } else {
      soundEngine.playHit(rawAmount >= 20, isCrit);
      target.flashTimer = 0.14;
      _targetVec.copy(target.pos).setY(1.4);
      this.vfx.spawnBurst(_targetVec, isCrit ? 0xfacc15 : 0x38bdf8, 14, 6, 1.0, 5);
      if (rawAmount >= 18 || isCrit) {
        this.hitstopTimer = 0.04;
        this.cameraShake = Math.min(0.36, Math.max(this.cameraShake, 0.2));
      }
    }

    target.hp = Math.max(0, target.hp - dmg);
    this.comboCount++;
    this.comboResetTimer = 2.6;
    this.ultimateCharge = Math.min(100, this.ultimateCharge + (isCrit ? 16 : 10));

    // Multi-Phase Boss Transition Check
    if (target.hp > 0 && enemy.maxPhases > 1) {
      const ratio = target.hp / Math.max(1, target.maxHp);
      if (enemy.phase === 1 && enemy.maxPhases >= 2 && ratio <= 0.6) {
        enemy.phase = 2;
        target.shieldTimer = Math.max(target.shieldTimer, 2.5);
        target.speedBoostTimer = Math.max(target.speedBoostTimer, 8.0);
        this.vfx.spawnShockRing(target.pos, enemy.spec.emissiveColor, 6.2, 0.6);
        _targetVec.copy(target.pos).setY(1.6);
        this.vfx.spawnBurst(_targetVec, enemy.spec.emissiveColor, 20, 9, 1.3, 4);
        soundEngine.playPhaseShift();
        this.cameraShake = Math.max(this.cameraShake, 0.3);
        this.phaseBanner = `⚠ ${enemy.spec.name} · PHASE 2 OVERDRIVE!`;
        this.phaseBannerTimer = 2.6;
      } else if (enemy.phase === 2 && enemy.maxPhases >= 3 && ratio <= 0.3) {
        enemy.phase = 3;
        target.shieldTimer = Math.max(target.shieldTimer, 3.0);
        target.speedBoostTimer = Math.max(target.speedBoostTimer, 12.0);
        target.rageTimer = Math.max(target.rageTimer, 12.0);
        target.iFrames = 0.55;
        this.vfx.spawnShockRing(target.pos, 0xf43f5e, 7.2, 0.65);
        _targetVec.copy(target.pos).setY(1.6);
        this.vfx.spawnBurst(_targetVec, 0xf43f5e, 24, 10, 1.4, 4);
        soundEngine.playPhaseShift();
        this.cameraShake = Math.max(this.cameraShake, 0.34);
        this.phaseBanner = `🔥 ${enemy.spec.name} · FINAL PHASE UNLEASHED!`;
        this.phaseBannerTimer = 2.8;
      }
    }

    if (target.hp <= 0) {
      enemy.alive = false;
      target.state = 'defeat';
      target.stateTimer = 0;
      enemy.telegraphRing.visible = false;
      enemy.telegraphLabel = null;
      enemy.pendingAction = null;
      _targetVec.copy(target.pos).setY(1.4);
      this.vfx.spawnBurst(_targetVec, enemy.spec.emissiveColor, 22, 8.5, 1.3, 5);
      this.vfx.spawnShockRing(target.pos, enemy.spec.emissiveColor, 5.0, 0.55);
      label = `${enemy.spec.name} KO!`;
    }

    this.lastDamageEvent = {
      id: this.damageEventSeq++,
      target: 'boss',
      amount: dmg,
      isCrit,
      blocked,
      label,
    };
    this.emitHud();

    if (this.enemies.every((e) => !e.alive)) {
      if (this.currentWaveIndex + 1 < this.survivalWaveQueue.length) {
        // Advance to next Survival Wave!
        this.currentWaveIndex++;
        const nextWaveSpecs = this.survivalWaveQueue[this.currentWaveIndex];
        const waveBonusMult = 1 + this.monsterExtraPowers.length * 0.04;
        this.spawnEnemySquad(nextWaveSpecs, this.currentLevel, waveBonusMult);
        for (let m = 0; m < this.monsterExtraPowers.length; m++) {
          if (this.enemies.length > 0) {
            this.enemies[m % this.enemies.length].extraPowers.push(this.monsterExtraPowers[m]);
          }
        }
        const waveHeal = Math.round(this.player.maxHp * 0.25);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + waveHeal);
        this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 45);
        this.player.iFrames = 1.25;
        this.vfx.clearProjectiles();
        this.vfx.spawnShockRing(this.player.pos, 0x34d399, 4.5, 0.5);
        soundEngine.playWaveIncoming();
        this.phaseBanner = `SURVIVAL WAVE ${this.currentWaveIndex + 1} / ${this.survivalWaveQueue.length} INCOMING!`;
        this.phaseBannerTimer = 2.8;
        this.emitHud();
      } else {
        this.setMode('victory');
        this.callbacks.onBattleEnd('player');
      }
    }
  }

  private applyDamageToPlayer(rawAmount: number, isHeavy: boolean, unblockable: boolean) {
    if (this.mode !== 'battle' || this.player.iFrames > 0) return;

    let dmg = rawAmount;
    const blocked = !unblockable && this.player.blocking;
    if (blocked) {
      dmg = Math.max(1, Math.round(dmg * 0.25));
      soundEngine.playBlock();
      _targetVec.copy(this.player.pos).setY(1.2);
      this.vfx.spawnBurst(_targetVec, 0x60a5fa, 10, 4.5, 0.8, 3);
    } else if (this.player.shieldTimer > 0) {
      const shieldMult = this.player.superShieldActive ? 0.2 : 0.35;
      dmg = Math.max(1, Math.round(dmg * shieldMult));
      soundEngine.playBlock();
      this.vfx.spawnShockRing(this.player.pos, 0x3b82f6, 2.2, 0.25);
    } else {
      soundEngine.playHit(isHeavy, false);
      this.player.flashTimer = 0.16;
      this.player.state = 'hitstun';
      this.player.stateTimer = 0;
      this.player.stateDuration = 0.22;
      _targetVec.copy(this.player.pos).setY(1.2);
      this.vfx.spawnBurst(_targetVec, 0xef4444, 14, 6, 1.0, 5);
      this.cameraShake = Math.min(0.36, Math.max(this.cameraShake, isHeavy ? 0.28 : 0.15));
    }

    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.ultimateCharge = Math.min(100, this.ultimateCharge + 8);

    this.lastDamageEvent = {
      id: this.damageEventSeq++,
      target: 'player',
      amount: dmg,
      isCrit: isHeavy,
      blocked,
    };
    this.emitHud();

    if (this.player.hp <= 0) {
      this.setMode('defeat');
      this.callbacks.onBattleEnd('boss');
    }
  }

  private integrateFighterPhysics(f: FighterRuntime, dt: number) {
    if (f.pos.y > 0 || f.vel.y !== 0) {
      f.vel.y -= 24 * dt;
      f.pos.y += f.vel.y * dt;
      if (f.pos.y <= 0) {
        f.pos.y = 0;
        f.vel.y = 0;
        if (f.state === 'jump') f.state = 'idle';
      }
    }

    f.pos.x += f.vel.x * dt;
    f.pos.z += f.vel.z * dt;

    const damp = Math.exp(-9.5 * dt);
    f.vel.x *= damp;
    f.vel.z *= damp;

    const maxR = ARENA_RADIUS - 0.85;
    const distSq = f.pos.x * f.pos.x + f.pos.z * f.pos.z;
    if (distSq > maxR * maxR) {
      const dist = Math.sqrt(distSq);
      f.pos.x = (f.pos.x / dist) * maxR;
      f.pos.z = (f.pos.z / dist) * maxR;
    }
  }

  private updateCamera(dt: number) {
    const primaryEnemy = this.getNearestLivingEnemy() ?? this.enemies[0];
    if (!primaryEnemy) return;

    if (this.mode === 'menu' || this.mode === 'mcq_draft') {
      const ang = this.elapsed * 0.26;
      const dist = this.mode === 'menu' ? 12.6 : 11.2;
      _camDesiredPos.set(Math.sin(ang) * dist, 4.6, Math.cos(ang) * dist);
      _camDesiredLook.set(0, 1.4, 0);
    } else if (this.mode === 'boss_intro') {
      const t = Math.min(1, this.introTimer / 2.1);
      const ang = -0.7 + t * 1.4;
      const focusX = this.enemies.reduce((acc, e) => acc + e.runtime.pos.x, 0) / this.enemies.length;
      const focusZ = this.enemies.reduce((acc, e) => acc + e.runtime.pos.z, 0) / this.enemies.length;
      const radiusZoom = this.enemies.length > 1 ? 6.8 : 5.2;
      _camDesiredPos.set(
        focusX + Math.sin(ang) * radiusZoom,
        2.7 + Math.sin(t * Math.PI) * 1.1,
        focusZ + Math.cos(ang) * radiusZoom,
      );
      _camDesiredLook.set(focusX, 1.75, focusZ);
    } else {
      // Dynamic framing across Player + all living Enemies
      const living = this.getLivingEnemies();
      let sumX = this.player.pos.x;
      let sumZ = this.player.pos.z;
      let maxSep = 0;

      if (living.length === 0) {
        sumX += primaryEnemy.runtime.pos.x;
        sumZ += primaryEnemy.runtime.pos.z;
        maxSep = this.player.pos.distanceTo(primaryEnemy.runtime.pos);
      } else {
        for (const e of living) {
          sumX += e.runtime.pos.x;
          sumZ += e.runtime.pos.z;
          const d = this.player.pos.distanceTo(e.runtime.pos);
          if (d > maxSep) maxSep = d;
        }
      }

      const divisor = 1 + Math.max(1, living.length);
      const midX = sumX / divisor;
      const midZ = sumZ / divisor;
      const extraDist = living.length > 1 ? 1.8 : 0;
      const camDist = THREE.MathUtils.clamp(7.5 + maxSep * 0.68 + extraDist, 9.2, 17.5);

      _v1.copy(primaryEnemy.runtime.pos).sub(this.player.pos).setY(0);
      if (_v1.lengthSq() < 0.01) _v1.set(1, 0, 0);
      _v1.normalize();
      const sideX = -_v1.z;
      const sideZ = _v1.x;

      _camDesiredPos.set(
        midX + sideX * camDist,
        4.6 + maxSep * 0.16 + (living.length > 1 ? 0.8 : 0),
        midZ + sideZ * camDist,
      );
      _camDesiredLook.set(midX, 1.35, midZ);
    }

    const dampAlpha = 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(_camDesiredPos, dampAlpha);

    if (this.cameraShake > 0.004) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.65;
      this.cameraShake *= Math.exp(-14 * dt);
    } else {
      this.cameraShake = 0;
    }

    this.camera.lookAt(_camDesiredLook);

    this.targetFov = THREE.MathUtils.damp(this.targetFov, 48, 5.5, dt);
    if (Math.abs(this.camera.fov - this.targetFov) > 0.03) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.targetFov, 10, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private emitHud() {
    let totalHp = 0;
    let totalMaxHp = 0;
    let activeTelegraph: string | null = null;
    const enemyStates: EnemyHudState[] = [];

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      totalHp += Math.ceil(e.runtime.hp);
      totalMaxHp += e.runtime.maxHp;
      if (e.telegraphLabel && !activeTelegraph) {
        activeTelegraph = e.telegraphLabel;
      }
      enemyStates.push({
        id: e.id,
        name: e.spec.name,
        category: e.spec.monsterCategory,
        hp: Math.ceil(e.runtime.hp),
        maxHp: e.runtime.maxHp,
        state: e.runtime.state,
        stunned: e.runtime.stunTimer > 0,
        slowed: e.runtime.slowTimer > 0,
        shieldActive: e.runtime.shieldTimer > 0,
        alive: e.alive,
        telegraphLabel: e.telegraphLabel,
        phase: e.phase,
        maxPhases: e.maxPhases,
      });
    }

    const primary = this.getNearestLivingEnemy() ?? this.enemies[0];

    this.callbacks.onHudUpdate({
      playerHp: Math.ceil(this.player.hp),
      playerMaxHp: this.player.maxHp,
      playerEnergy: Math.floor(this.player.energy),
      playerMaxEnergy: this.player.maxEnergy,
      playerUltimateCharge: Math.floor(this.ultimateCharge),
      playerShieldActive: this.player.shieldTimer > 0,
      playerShieldRemaining: Math.max(0, this.player.shieldTimer),
      playerSpeedBoostActive: this.player.speedBoostTimer > 0,
      playerSpeedBoostRemaining: Math.max(0, this.player.speedBoostTimer),
      playerRageActive: this.player.rageTimer > 0,
      playerRageRemaining: Math.max(0, this.player.rageTimer),
      timeSlowActive: this.timeSlowTimer > 0,
      timeSlowRemaining: Math.max(0, this.timeSlowTimer),
      playerState: this.player.state,
      bossHp: totalHp,
      bossMaxHp: Math.max(1, totalMaxHp),
      bossState: primary ? primary.runtime.state : 'idle',
      bossTelegraphLabel: activeTelegraph,
      bossStunned: primary ? primary.runtime.stunTimer > 0 : false,
      bossSlowed: primary ? primary.runtime.slowTimer > 0 : false,
      bossShieldActive: primary ? primary.runtime.shieldTimer > 0 : false,
      survivalWave: this.currentWaveIndex + 1,
      survivalTotalWaves: Math.max(1, this.survivalWaveQueue.length),
      phaseBanner: this.phaseBanner,
      enemies: enemyStates,
      powerCooldowns: { ...this.powerCooldowns },
      comboCount: this.comboCount,
      lastDamageEvent: this.lastDamageEvent,
      battleTime: this.battleTime,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    this.renderer.domElement.removeEventListener('pointerdown', this.onCanvasPointerDown);
    this.renderer.domElement.removeEventListener('contextmenu', this.onCanvasContextMenu);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.playerRig.dispose();
    this.clearEnemies();
    this.sharedShadowGeo.dispose();
    this.sharedTeleGeo.dispose();
    (this.playerShadow.material as THREE.Material).dispose();
    this.vfx.dispose();
    this.arena?.dispose();
    this.armorTex.dispose();
    this.shadowTex.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
