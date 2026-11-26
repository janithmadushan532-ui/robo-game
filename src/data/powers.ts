import { MonsterPowerDef, MonsterPowerId, PlayerPowerDef, PowerId, ShopPowerDef } from '../types/game';

export const PLAYER_POWERS: Record<PowerId, PlayerPowerDef> = {
  fire: {
    id: 'fire',
    name: 'Fire Blast',
    sinhalaName: 'ගිනි ප්‍රහාරය (තාප පිපිරුම)',
    damage: 28,
    activeDuration: 3.5,
    cooldown: 4.5,
    energyCost: 18,
    color: '#ff5722',
    hexColor: 0xff5722,
    hotkey: '1',
    shortTag: 'FIRE',
    icon: 'flame',
    description: 'Launches an explosive thermal fireball wave that knocks back and scorches the enemy robot.',
    effectNote: '28 DMG + Thermal Knockback',
  },
  ice: {
    id: 'ice',
    name: 'Freeze Attack',
    sinhalaName: 'අයිස් ප්‍රහාරය (ශීත ස්ඵටික)',
    damage: 24,
    activeDuration: 4.0,
    cooldown: 5.0,
    energyCost: 18,
    color: '#38bdf8',
    hexColor: 0x38bdf8,
    hotkey: '2',
    shortTag: 'FREEZE',
    icon: 'snowflake',
    description: 'Fires cryogenic ice shards that chill servo actuators, slowing enemy speed by 45% for 3.5s.',
    effectNote: '24 DMG + 45% Freeze Slow (3.5s)',
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning Power',
    sinhalaName: 'විදුලි බලය (අධි වෝල්ටීය)',
    damage: 32,
    activeDuration: 3.5,
    cooldown: 5.5,
    energyCost: 22,
    color: '#facc15',
    hexColor: 0xfacc15,
    hotkey: '3',
    shortTag: 'VOLT',
    icon: 'zap',
    description: 'Strikes instantaneously with a high-voltage electric arc, briefly stunning enemy circuits.',
    effectNote: '32 DMG + 0.9s Stun',
  },
  thunder: {
    id: 'thunder',
    name: 'Thunder Strike',
    sinhalaName: 'හෙණ ප්‍රහාරය (අකුණු කුළුණ)',
    damage: 36,
    activeDuration: 4.0,
    cooldown: 6.5,
    energyCost: 26,
    color: '#818cf8',
    hexColor: 0x818cf8,
    hotkey: '4',
    shortTag: 'THUNDER',
    icon: 'cloud_lightning',
    description: 'Calls down an overhead atmospheric thunder column onto the enemy with a sonic shockwave.',
    effectNote: '36 DMG + Sky Bolt AoE',
  },
  earth: {
    id: 'earth',
    name: 'Earth Power',
    sinhalaName: 'පෘථිවි බලය (ශිලා ප්‍රහාරය)',
    damage: 30,
    activeDuration: 4.5,
    cooldown: 5.5,
    energyCost: 22,
    color: '#a3e635',
    hexColor: 0x84cc16,
    hotkey: '5',
    shortTag: 'EARTH',
    icon: 'mountain',
    description: 'Erupts jagged tectonic crystal spires beneath the enemy robot, breaking blocks.',
    effectNote: '30 DMG + Guard Break & Stagger',
  },
  wind: {
    id: 'wind',
    name: 'Wind Power',
    sinhalaName: 'සුළං බලය (වායු සුළි)',
    damage: 22,
    activeDuration: 4.0,
    cooldown: 4.0,
    energyCost: 15,
    color: '#2dd4bf',
    hexColor: 0x2dd4bf,
    hotkey: 'Q',
    shortTag: 'WIND',
    icon: 'wind',
    description: 'Unleashes a razor gale vortex that blasts the enemy robot across the arena.',
    effectNote: '22 DMG + Massive Knockback',
  },
  shield: {
    id: 'shield',
    name: 'Energy Shield',
    sinhalaName: 'ශක්ති පලිහ (විද්‍යුත් චුම්බක)',
    damage: 10,
    activeDuration: 6.0,
    cooldown: 7.5,
    energyCost: 20,
    color: '#60a5fa',
    hexColor: 0x3b82f6,
    hotkey: 'E',
    shortTag: 'SHIELD',
    icon: 'shield',
    description: 'Activates a 3D hexagonal energy barrier for 6s, cutting incoming damage by 65%.',
    effectNote: '65% Damage Reduction (6s)',
  },
  super_punch: {
    id: 'super_punch',
    name: 'Super Punch',
    sinhalaName: 'සුපිරි පහර (චාලක ගම්‍යතාව)',
    damage: 38,
    activeDuration: 3.5,
    cooldown: 5.5,
    energyCost: 24,
    color: '#fb923c',
    hexColor: 0xf97316,
    hotkey: 'R',
    shortTag: 'PUNCH',
    icon: 'fist',
    description: 'Rocket-boosted momentum dash delivering a devastating kinetic punch with 45% crit chance.',
    effectNote: '38 DMG + 45% Crit + Dash',
  },
  energy_blast: {
    id: 'energy_blast',
    name: 'Energy Blast',
    sinhalaName: 'ශක්ති ප්‍රහාරය (ප්ලාස්මා ධාරාව)',
    damage: 34,
    activeDuration: 3.5,
    cooldown: 5.5,
    energyCost: 24,
    color: '#e879f9',
    hexColor: 0xd946ef,
    hotkey: 'T',
    shortTag: 'ENERGY',
    icon: 'sparkles',
    description: 'Fires a concentrated photonic energy orb that pierces straight through enemy blocks.',
    effectNote: '34 DMG + Unblockable Pierce',
  },
  laser_blast: {
    id: 'laser_blast',
    name: 'Laser Blast',
    sinhalaName: 'ලේසර් ප්‍රහාරය (ආලෝක කිරණ)',
    damage: 30,
    activeDuration: 3.2,
    cooldown: 4.5,
    energyCost: 20,
    color: '#ef4444',
    hexColor: 0xef4444,
    hotkey: '6',
    shortTag: 'LASER',
    icon: 'crosshair',
    description: 'Fires an instant, razor-focused high-energy twin laser beam across the arena.',
    effectNote: '30 DMG + Instant Beam Hit',
  },
  rocket_attack: {
    id: 'rocket_attack',
    name: 'Rocket Attack',
    sinhalaName: 'රොකට් ප්‍රහාරය (මිසයිල)',
    damage: 36,
    activeDuration: 3.8,
    cooldown: 6.0,
    energyCost: 25,
    color: '#f97316',
    hexColor: 0xf97316,
    hotkey: '7',
    shortTag: 'ROCKET',
    icon: 'rocket',
    description: 'Launches twin homing micro-rockets that detonate in a fiery shockwave on impact.',
    effectNote: '36 DMG + Homing Blast',
  },
  speed_boost: {
    id: 'speed_boost',
    name: 'Speed Boost',
    sinhalaName: 'වේග වර්ධකය (හයිපර් සර්වෝ)',
    damage: 0,
    activeDuration: 6.0,
    cooldown: 8.5,
    energyCost: 16,
    color: '#22d3ee',
    hexColor: 0x22d3ee,
    hotkey: '8',
    shortTag: 'SPEED',
    icon: 'gauge',
    description: 'Overclocks servo thrusters for 6s: +50% movement speed and faster energy recharge.',
    effectNote: '+50% Speed & Energy Regen (6s)',
  },
  plasma_cannon: {
    id: 'plasma_cannon',
    name: 'Plasma Cannon',
    sinhalaName: 'ප්ලාස්මා කාලතුවක්කුව',
    damage: 42,
    activeDuration: 4.0,
    cooldown: 6.5,
    energyCost: 28,
    color: '#c084fc',
    hexColor: 0xa855f7,
    hotkey: '9',
    shortTag: 'PLASMA',
    icon: 'atom',
    description: 'Launches a massive superheated plasma sphere that shatters armor and stuns.',
    effectNote: '42 DMG + Pierce + Stun',
  },
  ground_shockwave: {
    id: 'ground_shockwave',
    name: 'Ground Shockwave',
    sinhalaName: 'භූ කම්පන තරංගය',
    damage: 33,
    activeDuration: 4.2,
    cooldown: 5.8,
    energyCost: 22,
    color: '#f59e0b',
    hexColor: 0xf59e0b,
    hotkey: 'Z',
    shortTag: 'QUAKE',
    icon: 'waves',
    description: 'Slams the arena deck to unleash an expanding seismic wave that knocks enemies back.',
    effectNote: '33 DMG + Wide Ring AoE',
  },
  meteor_strike: {
    id: 'meteor_strike',
    name: 'Meteor Strike',
    sinhalaName: 'උල්කාපාත ප්‍රහාරය',
    damage: 46,
    activeDuration: 4.5,
    cooldown: 7.5,
    energyCost: 30,
    color: '#fb7185',
    hexColor: 0xf43f5e,
    hotkey: 'X',
    shortTag: 'METEOR',
    icon: 'meteor',
    description: 'Calls blazing orbital meteors crashing down from the sky onto the enemy position.',
    effectNote: '46 DMG + Triple Sky Impact',
  },
  healing_power: {
    id: 'healing_power',
    name: 'Healing Power',
    sinhalaName: 'සුව කිරීමේ බලය (නැනෝ අලුත්වැඩියාව)',
    damage: 0,
    activeDuration: 4.0,
    cooldown: 10.0,
    energyCost: 24,
    color: '#34d399',
    hexColor: 0x10b981,
    hotkey: 'C',
    shortTag: 'HEAL',
    icon: 'heart',
    description: 'Deploys nano-repair swarms to restore +42 HP immediately in the heat of combat.',
    effectNote: 'Restores +42 HP Instantly',
  },
  ultimate_energy_blast: {
    id: 'ultimate_energy_blast',
    name: 'Ultimate Energy Blast',
    sinhalaName: 'මහා ශක්ති විධාරණය',
    damage: 54,
    activeDuration: 4.2,
    cooldown: 7.5,
    energyCost: 34,
    color: '#f472b6',
    hexColor: 0xec4899,
    hotkey: '1',
    shortTag: 'ULT BLAST',
    icon: 'sparkles',
    description: 'Unleashes an hyper-dense photonic beam-orb detonation that pierces armor and blasts enemies backward.',
    effectNote: '54 DMG + Pierce & Shockwave',
  },
  thunder_storm: {
    id: 'thunder_storm',
    name: 'Thunder Storm Attack',
    sinhalaName: 'මහා අකුණු කුණාටුව',
    damage: 44,
    activeDuration: 4.5,
    cooldown: 7.0,
    energyCost: 30,
    color: '#fde047',
    hexColor: 0xeab308,
    hotkey: '2',
    shortTag: 'STORM',
    icon: 'cloud_lightning',
    description: 'Calls down devastating sky lightning bolts simultaneously onto EVERY living enemy in the arena.',
    effectNote: '44 AoE DMG to All Enemies + Stun',
  },
  mega_laser: {
    id: 'mega_laser',
    name: 'Mega Laser',
    sinhalaName: 'මෙගා ලේසර් කිරණය',
    damage: 50,
    activeDuration: 3.8,
    cooldown: 6.5,
    energyCost: 30,
    color: '#fb7185',
    hexColor: 0xf43f5e,
    hotkey: '3',
    shortTag: 'MEGA LZR',
    icon: 'crosshair',
    description: 'Fires a heavy triple-core orbital laser beam that burns through blocks and hits clustered foes.',
    effectNote: '50 DMG + Unblockable Beam Sweep',
  },
  dragon_fire: {
    id: 'dragon_fire',
    name: 'Dragon Fire',
    sinhalaName: 'මකර ගිනි ජාලාව',
    damage: 38,
    activeDuration: 4.0,
    cooldown: 5.5,
    energyCost: 24,
    color: '#fb923c',
    hexColor: 0xf97316,
    hotkey: '4',
    shortTag: 'DRG FIRE',
    icon: 'flame',
    description: 'Breathes a triple-fan barrage of dragon magma fireballs with explosive thermal knockback.',
    effectNote: 'Triple 38 DMG Spread + Knockback',
  },
  ice_explosion: {
    id: 'ice_explosion',
    name: 'Ice Explosion',
    sinhalaName: 'අයිස් පිපිරුම් තරංගය',
    damage: 40,
    activeDuration: 5.0,
    cooldown: 6.5,
    energyCost: 26,
    color: '#67e8f9',
    hexColor: 0x06b6d4,
    hotkey: '1',
    shortTag: 'ICE NOVA',
    icon: 'snowflake',
    description: 'Detonates a sub-zero cryo blast around the hero, damaging nearby monsters and freezing them for 5s.',
    effectNote: '40 AoE DMG + 5.0s Deep Freeze',
  },
  shadow_strike: {
    id: 'shadow_strike',
    name: 'Shadow Strike',
    sinhalaName: 'අඳුරු ඡායා ප්‍රහාරය',
    damage: 46,
    activeDuration: 3.6,
    cooldown: 5.8,
    energyCost: 25,
    color: '#c084fc',
    hexColor: 0xa855f7,
    hotkey: '2',
    shortTag: 'SHADOW',
    icon: 'ghost',
    description: 'Surges forward in a dark phantom slash that ignores shields with 55% critical strike chance.',
    effectNote: '46 DMG + Pierce + 55% Crit',
  },
  giant_energy_wave: {
    id: 'giant_energy_wave',
    name: 'Giant Energy Wave',
    sinhalaName: 'යෝධ ශක්ති තරංගය',
    damage: 48,
    activeDuration: 4.2,
    cooldown: 6.5,
    energyCost: 28,
    color: '#34d399',
    hexColor: 0x10b981,
    hotkey: '3',
    shortTag: 'GIANT WV',
    icon: 'waves',
    description: 'Projects a colossal crescent shockwave across the arena floor that pierces guards and sends foes flying.',
    effectNote: '48 DMG + Huge Wave Knockback',
  },
  meteor_rain: {
    id: 'meteor_rain',
    name: 'Meteor Rain',
    sinhalaName: 'මහා උල්කාපාත වර්ෂාව',
    damage: 56,
    activeDuration: 4.8,
    cooldown: 8.5,
    energyCost: 34,
    color: '#f87171',
    hexColor: 0xdc2626,
    hotkey: '4',
    shortTag: 'MET RAIN',
    icon: 'cloud_rain',
    description: 'Summons a 6-meteor orbital bombardment raining destruction across all enemy positions.',
    effectNote: '56 DMG + 6-Meteor Arena Barrage',
  },
  super_shield: {
    id: 'super_shield',
    name: 'Super Shield',
    sinhalaName: 'සුපිරි ශක්ති පලිහ',
    damage: 20,
    activeDuration: 8.0,
    cooldown: 9.5,
    energyCost: 24,
    color: '#60a5fa',
    hexColor: 0x2563eb,
    hotkey: '1',
    shortTag: 'SUP SHLD',
    icon: 'shield',
    description: 'Projects an Aegis Fortress dome for 8s (80% DMG cut), pushes attackers away, and repairs +22 HP.',
    effectNote: '80% Shield (8s) +22 HP + Pulse',
  },
  rage_mode: {
    id: 'rage_mode',
    name: 'Rage Mode',
    sinhalaName: 'කෝපාවිෂ්ට රණශූර බලය',
    damage: 18,
    activeDuration: 7.5,
    cooldown: 9.5,
    energyCost: 22,
    color: '#ef4444',
    hexColor: 0xdc2626,
    hotkey: '2',
    shortTag: 'RAGE',
    icon: 'swords',
    description: 'Enters Crimson Overdrive for 7.5s: +45% all damage, +35% speed, and rapid energy regeneration.',
    effectNote: '+45% DMG & +35% Speed (7.5s)',
  },
  time_slow: {
    id: 'time_slow',
    name: 'Time Slow',
    sinhalaName: 'කාල මන්දගාමී බලය',
    damage: 15,
    activeDuration: 6.0,
    cooldown: 10.0,
    energyCost: 26,
    color: '#2dd4bf',
    hexColor: 0x14b8a6,
    hotkey: '3',
    shortTag: 'CHRONO',
    icon: 'clock',
    description: 'Warps arena spacetime for 6s, slowing ALL monsters, bosses, and enemy projectiles by 65%.',
    effectNote: '65% Global Enemy Slow (6s)',
  },
  teleport_attack: {
    id: 'teleport_attack',
    name: 'Teleport Attack',
    sinhalaName: 'ක්ෂණික විද්‍යුත් පැනීම',
    damage: 44,
    activeDuration: 3.2,
    cooldown: 5.5,
    energyCost: 24,
    color: '#38bdf8',
    hexColor: 0x0ea5e9,
    hotkey: '4',
    shortTag: 'TELEPORT',
    icon: 'navigation',
    description: 'Instantly teleports behind the nearest monster with brief invulnerability and delivers a guaranteed Crit slash.',
    effectNote: 'Blink Behind + Guaranteed Crit',
  },
  hero_surge: {
    id: 'hero_surge',
    name: 'Hero Surge',
    sinhalaName: 'නිදහස් ශක්ති ප්‍රහාරය',
    damage: 26,
    activeDuration: 2.2,
    cooldown: 3.8,
    energyCost: 12,
    color: '#fbbf24',
    hexColor: 0xfbbf24,
    hotkey: '5',
    shortTag: 'SURGE',
    icon: 'swords',
    description: 'Always-ready signature hero burst: fires a golden plasma wave and shock ring without needing an MCQ.',
    effectNote: '26 DMG + Wave & Ring (FREE)',
  },
  ultimate: {
    id: 'ultimate',
    name: 'Ultimate Power',
    sinhalaName: 'අතිශය බලය (විශ්වීය නෝවා)',
    damage: 64,
    activeDuration: 4.5,
    cooldown: 6.0,
    energyCost: 0,
    color: '#f43f5e',
    hexColor: 0xf43f5e,
    hotkey: 'U',
    shortTag: 'ULTIMATE',
    icon: 'orbit',
    description: 'Unleashes stored combat fury as a multi-ring cosmic nova explosion.',
    effectNote: '64 DMG + Arena Nova (100% Fury)',
  },
};

export const PLAYER_POWER_LIST: PlayerPowerDef[] = Object.values(PLAYER_POWERS);

export const SHOP_POWER_CATALOG: ShopPowerDef[] = [
  { powerId: 'healing_power', price: 600, tier: 'SPECIAL' },
  { powerId: 'super_shield', price: 900, tier: 'SPECIAL' },
  { powerId: 'time_slow', price: 1200, tier: 'ELITE' },
  { powerId: 'rage_mode', price: 1500, tier: 'ELITE' },
  { powerId: 'teleport_attack', price: 1800, tier: 'ELITE' },
  { powerId: 'mega_laser', price: 2200, tier: 'LEGENDARY' },
  { powerId: 'thunder_storm', price: 2600, tier: 'LEGENDARY' },
  { powerId: 'meteor_rain', price: 3200, tier: 'LEGENDARY' },
];

export const SHOP_POWER_ID_SET = new Set<PowerId>(
  SHOP_POWER_CATALOG.map((item) => item.powerId),
);

export const SHOP_SLOT_HOTKEYS = ['6', '7', '8', '9', '0', '-', '=', 'R'];

export const MAX_BATTLE_POWER_SLOTS = 10;
export const MAX_PURCHASED_BATTLE_SLOTS = MAX_BATTLE_POWER_SLOTS - 5; // 5 extra slots alongside 4 MCQ + 1 FREE
export const MAX_LOADOUT_SELECTION = MAX_PURCHASED_BATTLE_SLOTS;

export function getPurchasedPowerStartQuantity(
  upgrades: Partial<Record<PowerId, number>> | undefined,
  powerId: PowerId,
): number {
  const lv = getPowerLevel(upgrades, powerId);
  if (lv >= 5) return 4;
  if (lv >= 3) return 3;
  return 2;
}

export function getOwnedInventoryPowers(
  purchasedPowers: PowerId[],
  collectedPowers: PowerId[],
): PowerId[] {
  const seen = new Set<PowerId>();
  const out: PowerId[] = [];
  for (const pid of [...purchasedPowers, ...collectedPowers]) {
    if (pid === 'ultimate' || pid === 'hero_surge') continue;
    if (!seen.has(pid)) {
      seen.add(pid);
      out.push(pid);
    }
  }
  return out;
}

export function computeBattleExtraPowers(
  activeLoadout: PowerId[],
  purchasedPowers: PowerId[],
  mcqSlotPowers: (PowerId | null)[],
): PowerId[] {
  const maxExtras = Math.max(0, MAX_PURCHASED_BATTLE_SLOTS);
  const purchasedSet = new Set<PowerId>(purchasedPowers);
  const mcqSet = new Set<PowerId>(mcqSlotPowers.filter((p): p is PowerId => p !== null));
  const candidates = activeLoadout;

  const extras: PowerId[] = [];
  for (const pid of candidates) {
    if (extras.length >= maxExtras) break;
    if (pid === 'ultimate' || pid === 'hero_surge') continue;
    if (!purchasedSet.has(pid) || mcqSet.has(pid) || extras.includes(pid)) continue;
    extras.push(pid);
  }
  // If user has purchased powers and activeLoadout has room or was uninitialized, keep explicit loadout order
  return extras;
}

export function createEmptyPowerCooldowns(): Record<PowerId, number> {
  return {
    fire: 0,
    ice: 0,
    lightning: 0,
    thunder: 0,
    earth: 0,
    wind: 0,
    shield: 0,
    super_punch: 0,
    energy_blast: 0,
    ultimate: 0,
    laser_blast: 0,
    rocket_attack: 0,
    speed_boost: 0,
    plasma_cannon: 0,
    ground_shockwave: 0,
    meteor_strike: 0,
    healing_power: 0,
    ultimate_energy_blast: 0,
    thunder_storm: 0,
    mega_laser: 0,
    dragon_fire: 0,
    ice_explosion: 0,
    shadow_strike: 0,
    giant_energy_wave: 0,
    meteor_rain: 0,
    super_shield: 0,
    rage_mode: 0,
    time_slow: 0,
    teleport_attack: 0,
    hero_surge: 0,
  };
}

export const CLASSIC_MONSTER_POWERS: Record<
  'm_fire' | 'm_ice' | 'm_lightning' | 'm_heavy_punch' | 'm_energy_blast' | 'm_special' | 'm_ultimate',
  MonsterPowerDef
> = {
  m_fire: {
    id: 'm_fire',
    name: 'Monster Fire Attack',
    sinhalaName: 'රාක්ෂ ගිනි ප්‍රහාරය',
    damage: 18,
    color: '#ff4500',
    hexColor: 0xff4500,
    icon: 'flame',
    description: 'Boss hurls an explosive magma fireball across the ring.',
  },
  m_ice: {
    id: 'm_ice',
    name: 'Monster Ice Attack',
    sinhalaName: 'රාක්ෂ අයිස් ප්‍රහාරය',
    damage: 16,
    color: '#0ea5e9',
    hexColor: 0x0ea5e9,
    icon: 'snowflake',
    description: 'Boss fires piercing sub-zero frost lances.',
  },
  m_lightning: {
    id: 'm_lightning',
    name: 'Monster Lightning Attack',
    sinhalaName: 'රාක්ෂ විදුලි ප්‍රහාරය',
    damage: 20,
    color: '#eab308',
    hexColor: 0xeab308,
    icon: 'zap',
    description: 'Boss discharges a high-voltage electric arc.',
  },
  m_heavy_punch: {
    id: 'm_heavy_punch',
    name: 'Monster Heavy Punch',
    sinhalaName: 'රාක්ෂ දරුණු පහර',
    damage: 22,
    color: '#ef4444',
    hexColor: 0xef4444,
    icon: 'fist',
    description: 'Crushing close-range titan slam with ground tremor.',
  },
  m_energy_blast: {
    id: 'm_energy_blast',
    name: 'Monster Energy Blast',
    sinhalaName: 'රාක්ෂ ශක්ති ප්‍රහාරය',
    damage: 21,
    color: '#a855f7',
    hexColor: 0xa855f7,
    icon: 'sparkles',
    description: 'Dark matter orb hurled from the Boss core.',
  },
  m_special: {
    id: 'm_special',
    name: 'Special Monster Attack',
    sinhalaName: 'විශේෂ රාක්ෂ ප්‍රහාරය',
    damage: 26,
    color: '#f97316',
    hexColor: 0xf97316,
    icon: 'waves',
    description: 'Boss signature multi-directional shockwave.',
  },
  m_ultimate: {
    id: 'm_ultimate',
    name: 'Ultimate Boss Attack',
    sinhalaName: 'අතිශය බිහිසුණු ප්‍රහාරය',
    damage: 34,
    color: '#dc2626',
    hexColor: 0xdc2626,
    icon: 'orbit',
    description: 'Cataclysmic arena-wide slam. Dodge or Block on telegraph!',
  },
};

export function getMonsterPowerDef(id: MonsterPowerId): MonsterPowerDef {
  if (id in CLASSIC_MONSTER_POWERS) {
    return CLASSIC_MONSTER_POWERS[id as keyof typeof CLASSIC_MONSTER_POWERS];
  }
  const p = PLAYER_POWERS[id as PowerId];
  return {
    id: p.id,
    name: p.name,
    sinhalaName: p.sinhalaName,
    damage: Math.max(16, Math.round(p.damage * 0.62)),
    color: p.color,
    hexColor: p.hexColor,
    icon: p.icon,
    description: p.description,
  };
}

export const MAX_POWER_LEVEL = 5;

export interface UpgradedPowerStats {
  level: number;
  damage: number;
  rangeMult: number;
  vfxScale: number;
  durationBonus: number;
  shieldReduction: number; // 0..0.95 fraction cut (for shield/super_shield)
  healBase: number; // base HP restored (for healing_power / super_shield)
  critBonus: number; // +0..0.32 crit chance bonus
  extraCount: number; // extra projectiles/meteors unlocked at higher levels
}

const DAMAGE_MULTS = [1, 1.24, 1.5, 1.8, 2.15];
const RANGE_MULTS = [1, 1.14, 1.28, 1.44, 1.62];
const VFX_SCALES = [1, 1.14, 1.28, 1.42, 1.58];
const UPGRADE_BASE_COSTS = [110, 210, 340, 520]; // Lv1->2, 2->3, 3->4, 4->5

export function getPowerLevel(
  upgrades: Partial<Record<PowerId, number>> | undefined,
  powerId: PowerId,
): number {
  const raw = upgrades?.[powerId] ?? 1;
  return Math.max(1, Math.min(MAX_POWER_LEVEL, Math.floor(raw)));
}

export function getPowerUpgradeCost(powerId: PowerId, currentLevel: number): number {
  if (currentLevel >= MAX_POWER_LEVEL) return 0;
  const idx = Math.max(0, Math.min(UPGRADE_BASE_COSTS.length - 1, currentLevel - 1));
  const def = PLAYER_POWERS[powerId];
  const tierFactor =
    powerId === 'hero_surge'
      ? 0.85
      : def.damage >= 48 || powerId === 'ultimate'
      ? 1.25
      : def.damage >= 36
      ? 1.1
      : 1.0;
  return Math.round((UPGRADE_BASE_COSTS[idx] * tierFactor) / 10) * 10;
}

export function getUpgradedPowerStats(powerId: PowerId, level: number): UpgradedPowerStats {
  const lv = Math.max(1, Math.min(MAX_POWER_LEVEL, Math.floor(level)));
  const idx = lv - 1;
  const def = PLAYER_POWERS[powerId];

  const damage = def.damage > 0 ? Math.round(def.damage * DAMAGE_MULTS[idx]) : 0;
  const rangeMult = RANGE_MULTS[idx];
  const vfxScale = VFX_SCALES[idx];
  const durationBonus = idx * 1.1; // +1.1s per upgrade level for buffs/stuns/slows
  const baseShieldCut = powerId === 'super_shield' ? 0.8 : 0.65;
  const shieldReduction = Math.min(0.92, baseShieldCut + idx * 0.04);
  const baseHeal = powerId === 'healing_power' ? 42 : powerId === 'super_shield' ? 22 : 0;
  const healBase = baseHeal > 0 ? Math.round(baseHeal * (1 + idx * 0.28)) : 0;
  const critBonus = idx * 0.07;
  const extraCount = lv >= 5 ? 2 : lv >= 3 ? 1 : 0;

  return {
    level: lv,
    damage,
    rangeMult,
    vfxScale,
    durationBonus,
    shieldReduction,
    healBase,
    critBonus,
    extraCount,
  };
}

export function getPowerUpgradeHighlights(powerId: PowerId, currentLevel: number): string[] {
  const cur = getUpgradedPowerStats(powerId, currentLevel);
  const next = getUpgradedPowerStats(powerId, Math.min(MAX_POWER_LEVEL, currentLevel + 1));
  const lines: string[] = [];

  if (cur.damage > 0) {
    lines.push(`Damage ${cur.damage} → ${next.damage}`);
  }
  if (powerId === 'shield' || powerId === 'super_shield') {
    lines.push(
      `Shield ${Math.round(cur.shieldReduction * 100)}% → ${Math.round(next.shieldReduction * 100)}%`,
    );
    const baseDur = powerId === 'super_shield' ? 8.0 : 6.0;
    lines.push(
      `Duration ${(baseDur + cur.durationBonus).toFixed(1)}s → ${(baseDur + next.durationBonus).toFixed(1)}s`,
    );
  }
  if (powerId === 'healing_power' || powerId === 'super_shield') {
    lines.push(`Repair +${cur.healBase} HP → +${next.healBase} HP`);
  }
  if (powerId === 'speed_boost' || powerId === 'rage_mode' || powerId === 'time_slow') {
    const baseDur = powerId === 'rage_mode' ? 7.5 : 6.0;
    lines.push(
      `Active Time ${(baseDur + cur.durationBonus).toFixed(1)}s → ${(baseDur + next.durationBonus).toFixed(1)}s`,
    );
  }
  lines.push(
    `Range ${Math.round(cur.rangeMult * 100)}% → ${Math.round(next.rangeMult * 100)}%`,
  );
  lines.push(
    `Explosion VFX ${Math.round(cur.vfxScale * 100)}% → ${Math.round(next.vfxScale * 100)}%`,
  );
  if (next.extraCount > cur.extraCount) {
    if (
      powerId === 'fire' ||
      powerId === 'ice' ||
      powerId === 'wind' ||
      powerId === 'hero_surge' ||
      powerId === 'rocket_attack' ||
      powerId === 'energy_blast' ||
      powerId === 'dragon_fire'
    ) {
      lines.push(`Bonus: +1 Extra Projectile Wave!`);
    } else if (powerId === 'meteor_strike' || powerId === 'meteor_rain') {
      lines.push(`Bonus: +1 Extra Sky Meteor!`);
    }
  }
  return lines;
}

