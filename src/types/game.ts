export type GraphicsQuality = 'low' | 'medium' | 'high';

export type PowerId =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'thunder'
  | 'earth'
  | 'wind'
  | 'shield'
  | 'super_punch'
  | 'energy_blast'
  | 'ultimate'
  | 'laser_blast'
  | 'rocket_attack'
  | 'speed_boost'
  | 'plasma_cannon'
  | 'ground_shockwave'
  | 'meteor_strike'
  | 'healing_power'
  | 'ultimate_energy_blast'
  | 'thunder_storm'
  | 'mega_laser'
  | 'dragon_fire'
  | 'ice_explosion'
  | 'shadow_strike'
  | 'giant_energy_wave'
  | 'meteor_rain'
  | 'super_shield'
  | 'rage_mode'
  | 'time_slow'
  | 'teleport_attack'
  | 'hero_surge';

export type MonsterPowerId =
  | 'm_fire'
  | 'm_ice'
  | 'm_lightning'
  | 'm_heavy_punch'
  | 'm_energy_blast'
  | 'm_special'
  | 'm_ultimate'
  | PowerId;

export type MonsterCategory =
  | 'Giant'
  | 'Fast'
  | 'Armored'
  | 'Flying'
  | 'Fire'
  | 'Ice'
  | 'Shadow'
  | 'Robot'
  | 'Boss';

export type BossArchetype =
  | 'fire_titan'
  | 'ice_colossus'
  | 'storm_volt'
  | 'shadow_wraith'
  | 'earth_behemoth'
  | 'dark_dragon'
  | 'infernal_demon'
  | 'cyber_construct'
  | 'venom_hydra'
  | 'aether_overlord'
  | 'heavy_tank'
  | 'fast_ninja'
  | 'laser_bot'
  | 'fire_bot'
  | 'flying_bot'
  | 'shield_bot'
  | 'giant_boss'
  | 'singularity_apex'
  | 'fast_raptor'
  | 'armored_juggernaut'
  | 'frost_fiend'
  | 'magma_ifrit'
  | 'sky_harpy'
  | 'void_reaper'
  | 'mecha_stalker'
  | 'giant_titan'
  | 'volt_sprinter'
  | 'flying_wyvern'
  | 'omega_overlord'
  | 'berserker_mech'
  | 'cryo_valkyrie'
  | 'pyro_drake'
  | 'titan_warden'
  | 'stealth_phantom'
  | 'aero_interceptor'
  | 'colossal_titan_beast'
  | 'dark_shadow_beast'
  | 'mega_robot_warrior'
  | 'fire_dragon_monster'
  | 'thunder_beast'
  | 'ice_giant_colossus'
  | 'mutant_bio_beast'
  | 'armored_destroyer'
  | 'sky_emperor_boss'
  | 'cataclysm_final_boss';

export type AiBehaviorStyle =
  | 'balanced'
  | 'tank'
  | 'ninja'
  | 'ranged_laser'
  | 'pyro_rush'
  | 'aerial_striker'
  | 'fortress_shield'
  | 'giant_boss'
  | 'feral_rusher'
  | 'shadow_blinker';

export type ArenaTheme =
  | 'volcanic'
  | 'cryo'
  | 'storm'
  | 'eclipse'
  | 'colosseum'
  | 'crimson_spire'
  | 'nether'
  | 'cyber_matrix'
  | 'bio_dome'
  | 'astral'
  | 'tank_foundry'
  | 'neon_dojo'
  | 'prism_lab'
  | 'magma_forge'
  | 'sky_carrier'
  | 'aegis_bunker'
  | 'goliath_dock'
  | 'singularity_core'
  | 'shadow_wasteland'
  | 'glacier_peak'
  | 'cobalt_citadel'
  | 'emerald_ruins'
  | 'obsidian_throne'
  | 'plasma_reactor'
  | 'thunder_plateau'
  | 'void_sanctum'
  | 'aether_skybridge'
  | 'molten_core'
  | 'quantum_grid'
  | 'chrono_temple'
  | 'titan_canyon'
  | 'shadow_abyss'
  | 'cyber_citadel'
  | 'dragon_caldera'
  | 'storm_monolith'
  | 'glacial_throne'
  | 'mutant_swamp'
  | 'cataclysm_nexus';

export type PowerIconType =
  | 'flame'
  | 'snowflake'
  | 'zap'
  | 'cloud_lightning'
  | 'mountain'
  | 'wind'
  | 'shield'
  | 'fist'
  | 'sparkles'
  | 'orbit'
  | 'crosshair'
  | 'rocket'
  | 'gauge'
  | 'atom'
  | 'waves'
  | 'meteor'
  | 'heart'
  | 'cloud_rain'
  | 'ghost'
  | 'clock'
  | 'navigation'
  | 'swords';

export interface PlayerPowerDef {
  id: PowerId;
  name: string;
  sinhalaName: string;
  damage: number;
  activeDuration: number; // seconds active before auto-deactivating
  cooldown: number; // seconds recharge after deactivation
  energyCost: number;
  color: string;
  hexColor: number;
  hotkey: string;
  shortTag: string;
  icon: PowerIconType;
  description: string;
  effectNote: string;
}

export interface MonsterPowerDef {
  id: MonsterPowerId;
  name: string;
  sinhalaName: string;
  damage: number;
  color: string;
  hexColor: number;
  icon: PowerIconType;
  description: string;
}

export interface ScienceUnit {
  id: number;
  code: string;
  sinhalaTitle: string;
  englishTitle: string;
  themeColor: string;
  summarySi: string;
}

export interface McqQuestion {
  id: string;
  unitId: number;
  questionSi: string;
  optionsSi: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanationSi: string;
}

export interface EnemyUnitSpec {
  name: string;
  nameSi: string;
  roleClass: string;
  monsterCategory: MonsterCategory;
  archetype: BossArchetype;
  aiStyle: AiBehaviorStyle;
  maxHp: number;
  attackPower: number;
  speed: number;
  aggression: number; // 0.35 to 1.0
  blockChance: number;
  dodgeChance: number;
  primaryColor: number;
  secondaryColor: number;
  emissiveColor: number;
  scale: number;
  signaturePowers: MonsterPowerId[];
  hasPhases?: boolean;
}

export interface BossLevelDef {
  level: number;
  sector: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  id: string;
  bossName: string;
  bossTitleSi: string;
  robotClass: string;
  monsterCategory: MonsterCategory;
  isBossLevel?: boolean;
  isSurvivalLevel?: boolean;
  challengeLabel?: string;
  archetype: BossArchetype;
  aiStyle: AiBehaviorStyle;
  arenaTheme: ArenaTheme;
  arenaName: string;
  arenaNameSi: string;
  maxHp: number;
  attackPower: number;
  speed: number;
  aggression: number; // 0.35 to 1.0
  blockChance: number;
  dodgeChance: number;
  primaryColor: number;
  secondaryColor: number;
  emissiveColor: number;
  scale: number;
  signaturePowers: MonsterPowerId[];
  /** Optional multi-enemy squad (2–4 simultaneous enemies). If omitted, spawns 1 enemy from top-level specs. */
  enemies?: EnemyUnitSpec[];
  /** Optional progressive survival waves spawned sequentially after Wave 1 is cleared. */
  survivalWaves?: EnemyUnitSpec[][];
  loreSi: string;
  rewardCoins: number;
  guaranteedPowerReward?: PowerId;
}

export type GameScreen =
  | 'main_menu'
  | 'mcq_draft'
  | 'boss_intro'
  | 'battle'
  | 'paused'
  | 'victory'
  | 'defeat';

export type ActiveModal =
  | 'none'
  | 'levels'
  | 'powers'
  | 'shop'
  | 'loadout'
  | 'monsters'
  | 'units'
  | 'settings';

export interface ShopPowerDef {
  powerId: PowerId;
  price: number;
  tier: 'SPECIAL' | 'ELITE' | 'LEGENDARY';
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  graphicsQuality: GraphicsQuality;
  showTouchControls: 'auto' | 'always' | 'off';
}

export interface SavedProgress {
  highestUnlockedLevel: number;
  defeatedBossIds: string[];
  collectedPowers: PowerId[];
  purchasedPowers: PowerId[];
  activeLoadout: PowerId[];
  powerUpgrades: Partial<Record<PowerId, number>>;
  coins: number;
  selectedUnitId: number;
  usedQuestionIds: string[];
  unitQuestionCursors: Record<number, number>;
  totalWins: number;
  totalCorrectMcq: number;
  totalWrongMcq: number;
  totalScore: number;
  settings: GameSettings;
}

export interface EnemyHudState {
  id: string;
  name: string;
  category: MonsterCategory;
  hp: number;
  maxHp: number;
  state: string;
  stunned: boolean;
  slowed: boolean;
  shieldActive: boolean;
  alive: boolean;
  telegraphLabel: string | null;
  phase?: 1 | 2 | 3;
  maxPhases?: 1 | 2 | 3;
}

export interface BattleHudSnapshot {
  playerHp: number;
  playerMaxHp: number;
  playerEnergy: number;
  playerMaxEnergy: number;
  playerUltimateCharge: number; // 0..100
  playerShieldActive: boolean;
  playerShieldRemaining: number;
  playerSpeedBoostActive: boolean;
  playerSpeedBoostRemaining: number;
  playerRageActive: boolean;
  playerRageRemaining: number;
  timeSlowActive: boolean;
  timeSlowRemaining: number;
  playerState: string;
  bossHp: number;
  bossMaxHp: number;
  bossState: string;
  bossTelegraphLabel: string | null;
  bossStunned: boolean;
  bossSlowed: boolean;
  bossShieldActive: boolean;
  survivalWave: number;
  survivalTotalWaves: number;
  phaseBanner: string | null;
  enemies: EnemyHudState[];
  powerActiveTimers: Record<PowerId, number>;
  powerCooldowns: Record<PowerId, number>;
  powerQuantities: Record<PowerId, number>;
  comboCount: number;
  lastDamageEvent: {
    id: number;
    target: 'player' | 'boss';
    amount: number;
    isCrit: boolean;
    blocked: boolean;
    isHeal?: boolean;
    label?: string;
  } | null;
  battleTime: number;
}

export interface LevelMcqSummary {
  total: number;
  correct: number;
  wrong: number;
  /** Positional slots matching Q1..Q4: PowerId if answered correctly, null if wrong or unanswered */
  slotPowers: (PowerId | null)[];
  playerPowersEarned: PowerId[];
  monsterPowersEarned: MonsterPowerId[];
}
