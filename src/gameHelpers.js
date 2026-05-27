// ── GAME HELPERS ────────────────────────────────────────────────────────
// Pure computation functions — no React, no side effects.

import {
  HEROES, UPGRADES, HERO_MILESTONES, ARTIFACT_UPGRADES,
  LOOT_PREFIXES, LOOT_TYPES, EQUIP_SLOTS, RARITIES,
  COMPANION_ABILITIES, ACHIEVEMENTS, REBIRTH_MILESTONES,
  ENEMIES_BY_ZONE, BOSSES, BOSS_ZONES, REGIONS, ZONE_LORE, COMPANIONS,
  SUFFIXES,
} from './gameData.js';

function getHeroMilestoneMult(level) {
  let m = 1;
  for (const ms of HERO_MILESTONES) {
    if (level >= ms.level) m = ms.mult;
  }
  return m;
}

// Hero passive bonuses — summed from all owned heroes
function computeHeroPassiveBonuses(heroLevels) {
  const b = { clickAdd: 0, dmgMult: 0, goldMult: 0, cdReduce: 0, dpsAdd: 0 };
  for (const hero of HEROES) {
    if (!(heroLevels[hero.id] > 0)) continue;
    if (!hero.passive) continue;
    const { type, value } = hero.passive;
    if (type === "clickAdd") b.clickAdd += value;
    if (type === "dmgMult")  b.dmgMult  += value;
    if (type === "goldMult") b.goldMult += value;
    if (type === "cdReduce") b.cdReduce += value;
    if (type === "dpsAdd")   b.dpsAdd   += value;
  }
  return b;
}

// Human-readable passive description
function passiveDesc(passive) {
  if (!passive) return "";
  const pct = v => `+${Math.round(v * 100)}%`;
  switch (passive.type) {
    case "clickAdd":  return `+${passive.value} click dmg (passive)`;
    case "dmgMult":   return `${pct(passive.value)} click dmg (passive)`;
    case "goldMult":  return `${pct(passive.value)} gold drops (passive)`;
    case "cdReduce":  return `${pct(passive.value)} CD reduction (passive)`;
    case "dpsAdd":    return `${pct(passive.value)} all DPS (passive)`;
    default: return "";
  }
}

function getItemRarity(bonus) {
  if (bonus >= 36) return "Legendary";
  if (bonus >= 23) return "Epic";
  if (bonus >= 12) return "Rare";
  return "Common";
}

function rollLootItem(zone) {
  const prefix = LOOT_PREFIXES[Math.floor(Math.random() * LOOT_PREFIXES.length)];
  const t      = LOOT_TYPES[Math.floor(Math.random() * LOOT_TYPES.length)];
  // Bonus scales softly with zone: 5-40%
  const bonus  = Math.round((5 + Math.min(zone * 0.3, 35)) * (0.7 + Math.random() * 0.6));
  const rarity = getItemRarity(bonus);
  // Rings randomly fill ring1 or ring2 slot
  const slot = t.slot === "ring" ? (Math.random() < 0.5 ? "ring1" : "ring2") : t.slot;
  return {
    id:     `loot_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    name:   `${prefix} ${t.type}`,
    emoji:  t.emoji,
    type:   t.type,
    slot,
    stat:   t.stat,
    label:  t.label,
    bonus,  // percentage
    rarity,
    zone,
    equipped: false,
    upgradeLevel: 0,
  };
}

// Companions — lore characters that auto-attack, levelable
function getCompAbilityTier(ability, level) {
  if (!level || level < 1) return null;
  let tier = ability.tiers[0];
  for (const t of ability.tiers) {
    if (level >= t.minLevel) tier = t;
  }
  return tier;
}

function computeAchievementBonuses(unlockedIds) {
  const b = { clickMult: 0, goldMult: 0, dpsMult: 0, upgradeCostReduce: 0 };
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.includes(ach.id)) continue;
    const { type, value } = ach.bonus;
    if (b[type] !== undefined) b[type] += value;
  }
  return b;
}

// Hero bulk-buy calculator (same logic as companion, but uses heroCost)
function calcBulkHeroBuy(hero, startLevel, gold, mode, costDiscount = 0) {
  const cost = (lvl) => Math.max(1, Math.floor(heroCost(hero, lvl) * (1 - costDiscount)));
  if (mode === "max") {
    let remaining = gold;
    let count = 0;
    while (remaining >= cost(startLevel + count)) {
      remaining -= cost(startLevel + count);
      count++;
      if (count >= 10000) break;
    }
    return { count, totalCost: gold - remaining };
  }
  const n = mode === "x1" ? 1 : mode === "x10" ? 10 : 100;
  let totalCost = 0;
  for (let i = 0; i < n; i++) totalCost += cost(startLevel + i);
  return { count: totalCost <= gold ? n : 0, totalCost };
}

function getCurrentRegion(zone) {
  return REGIONS.find(r => zone >= r.minZone && zone <= r.maxZone) || REGIONS[REGIONS.length - 1];
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return "0";
  n = Math.floor(n);
  if (n < 1000) return n.toString();
  let i = 0; let v = n;
  while (v >= 1000 && i < SUFFIXES.length - 1) { v /= 1000; i++; }
  // Trim trailing zeros: "1.50" → "1.5", "2.00" → "2"
  const raw = v.toFixed(2).replace(/\.?0+$/, "");
  return raw + SUFFIXES[i];
}

function getEnemyForZone(zone, rebirthMult = 1) {
  // Boss zones — one per region's final zone
  if (BOSS_ZONES.has(zone)) {
    const boss = BOSSES.find(b => b.zone === zone);
    // Scale boss HP by rebirth multiplier (capped at 50× so late bosses stay beatable)
    const bossHpScale = Math.min(rebirthMult, 50);
    return {
      ...boss,
      id:         boss.name.toLowerCase().replace(/\s+/g, "_"),
      enemyKey:   boss.name.toLowerCase().replace(/\s+/g, "_"),
      maxHp:      Math.floor(boss.baseHp * bossHpScale),
      goldReward: Math.floor(boss.baseGold * bossHpScale),
      isBoss:     true,
    };
  }
  // Slime Outskirts (zones 1-8): slimes with occasional goblin cameo
  if (zone >= 1 && zone <= 8) {
    const slime = ENEMIES[0];
    const scale = Math.pow(1.4, zone - 1);
    if (Math.random() < 0.001) {
      const goblin = ENEMIES[1];
      return { ...goblin, name: "Lost Goblin", maxHp: Math.floor(goblin.baseHp * scale), goldReward: Math.floor(goblin.baseGold * scale * 3) };
    }
    return { ...slime, maxHp: Math.floor(slime.baseHp * scale), goldReward: Math.floor(slime.baseGold * scale) };
  }
  // All other zones: find the highest-zone enemy at or below current zone, scale up
  // ENEMIES is pre-sorted by zone descending at module load — no sort needed here
  const base = ENEMIES_BY_ZONE.find(e => zone >= e.zone) || ENEMIES[ENEMIES.length - 1];
  // Cap the exponent to avoid Number overflow (Infinity) at extreme zones
  const exponent = Math.min(Math.max(0, zone - base.zone), 60);
  const scale = Math.pow(1.5, exponent);
  return { ...base, maxHp: Math.floor(base.baseHp * scale), goldReward: Math.floor(base.baseGold * scale) };
}

function heroCost(hero, level) {
  return Math.floor(hero.baseCost * Math.pow(hero.costMult, level));
}

function companionCost(comp, level) {
  return Math.floor(comp.baseCost * Math.pow(comp.costMult, level));
}

function computeIdleDps(heroLevels, boughtUpgrades, artifactOwned = []) {
  const artDpsMult = ARTIFACT_UPGRADES
    .filter(a => a.type === "dpsMult" && artifactOwned.includes(a.id))
    .reduce((s, a) => s + a.value, 0);
  return HEROES.reduce((total, hero) => {
    const level = heroLevels[hero.id] || 0;
    if (level === 0) return total;
    const heroUpgs = UPGRADES.filter(u => u.type === "hero" && u.heroId === hero.id && boughtUpgrades.includes(u.id));
    const upgMult = heroUpgs.reduce((m, u) => m * u.mult, 1);
    const milestoneMult = getHeroMilestoneMult(level);
    return total + hero.baseDps * level * upgMult * milestoneMult * (1 + artDpsMult);
  }, 0);
}

// Compute artifact bonuses as a lookup object
function computeArtifactBonuses(artifactOwned) {
  const b = { goldMult: 0, cdReduce: 0, clickMult: 0, synergyPct: 0 };
  for (const a of ARTIFACT_UPGRADES) {
    if (!artifactOwned.includes(a.id)) continue;
    if (a.type === "gold")      b.goldMult  += a.value;
    if (a.type === "cooldown")  b.cdReduce  += a.value;
    if (a.type === "clickMult") b.clickMult += a.value;
    if (a.type === "synergy")   b.synergyPct += a.value;
  }
  return b;
}

// Compute equipped loot bonuses
function computeLootBonuses(lootItems) {
  const b = { clickMult: 0, dpsMult: 0, gold: 0, cdReduce: 0 };
  for (const item of lootItems) {
    if (!item.equipped) continue;
    const totalBonus = (item.bonus + (item.upgradeLevel || 0)) / 100;
    if (item.stat === "clickMult") b.clickMult += totalBonus;
    if (item.stat === "dpsMult")   b.dpsMult   += totalBonus;
    if (item.stat === "gold")      b.gold       += totalBonus;
    if (item.stat === "cdReduce")  b.cdReduce   += totalBonus;
  }
  return b;
}

// Companion total damage dealt every 500ms tick, with optional synergy % of click dmg
function computeCompanionTickDmg(companionLevels, synergyPct = 0, clickDmgBase = 0) {
  const flatDmg = COMPANIONS.reduce((sum, c) => {
    const level = companionLevels[c.id] || 0;
    if (level === 0) return sum;
    return sum + c.baseDmg * level * (500 / c.interval);
  }, 0);
  const synergyBonus = synergyPct > 0 ? clickDmgBase * synergyPct : 0;
  return flatDmg + synergyBonus;
}

// Companion bulk-buy calculator.
// x1/x10/x100: all-or-nothing for the fixed count (button disabled if short on gold).
// max: walk levels until gold runs out, return exact count + exact total cost.
function calcBulkCompanionBuy(comp, startLevel, gold, mode) {
  if (mode === "max") {
    let remaining = gold;
    let count = 0;
    while (remaining >= companionCost(comp, startLevel + count)) {
      remaining -= companionCost(comp, startLevel + count);
      count++;
      if (count >= 10000) break; // safety cap
    }
    return { count, totalCost: gold - remaining };
  }
  const n = mode === "x1" ? 1 : mode === "x10" ? 10 : 100;
  let totalCost = 0;
  for (let i = 0; i < n; i++) totalCost += companionCost(comp, startLevel + i);
  return { count: totalCost <= gold ? n : 0, totalCost };
}

function getCurrentLore(zone) {
  let lore = ZONE_LORE[0];
  for (const entry of ZONE_LORE) {
    if (zone >= entry.zone) lore = entry;
  }
  return lore;
}

// Combo multiplier tiers — rewards rapid tapping
function getComboMult(combo) {
  if (combo >= 30) return 5;
  if (combo >= 20) return 4;
  if (combo >= 12) return 3;
  if (combo >= 6)  return 2;
  if (combo >= 3)  return 1.5;
  return 1;
}

function getComboColor(combo) {
  if (combo >= 30) return "#ff2200";
  if (combo >= 20) return "#ff8800";
  if (combo >= 12) return "#f5c518";
  if (combo >= 6)  return "#44cc88";
  if (combo >= 3)  return "#4488ff";
  return "#4a3a2a";
}


export {
  getHeroMilestoneMult, computeHeroPassiveBonuses, passiveDesc,
  getItemRarity, rollLootItem, getCompAbilityTier,
  computeAchievementBonuses, calcBulkHeroBuy, getCurrentRegion,
  fmt, getEnemyForZone, heroCost, companionCost, computeIdleDps,
  computeArtifactBonuses, computeLootBonuses, computeCompanionTickDmg,
  calcBulkCompanionBuy, getCurrentLore, getComboMult, getComboColor,
};
