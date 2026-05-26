import { useState, useEffect, useRef, useCallback } from "react";

// ── DATA ────────────────────────────────────────────────────────────────────

const WORLDS = [
  {
    id: 1,
    name: "Ashen Forest",
    description: "The cursed woods where weak void creatures first appeared.",
    bg: "/backgrounds/forest.jpg",
    enemies: ["slime", "wolf", "goblin"],
  },
  {
    id: 2,
    name: "Crimson Caverns",
    description: "Blood-red caves filled with corrupted miners.",
    bg: "/backgrounds/cave.jpg",
    enemies: ["bat", "orc", "troll"],
  },
  {
    id: 3,
    name: "Eclipse Citadel",
    description: "The dark kingdom ruled by the Eclipse Emperor.",
    bg: "/backgrounds/eclipse.jpg",
    enemies: ["knight", "lich", "dragon"],
  },
];

const STORY_EVENTS = [
  {
    zone: 1,
    speaker: "Narrator",
    text: "The forest feels wrong. Something watches you from the shadows...",
  },
  {
    zone: 20,
    speaker: "Unknown Voice",
    text: "You should not have come here, mortal.",
  },
  {
    zone: 30,
    speaker: "Eclipse Emperor",
    text: "Your world will dissolve into darkness.",
  },
];

const BOSSES = [
  {
    zone: 10,
    name: "Slime King",
    image: "/bosses/slime.png",
    bgm: "boss-theme.mp3",
  },
  {
    zone: 20,
    name: "The Hollow Beast",
    image: "/bosses/the hollow beast.png",
    bgm: "boss-theme.mp3",
  },
  {
    zone: 30,
    name: "Eclipse Emperor",
    image: "/bosses/eclipse emperor.png",
    bgm: "final-boss.mp3",
  },
];

const ENEMIES = [
  {
    id: "slime",
    name: "Slime",
    enemyKey: "slime",
    emoji: "",
    image: "/monsters/slime.png",
    idleAnim: "float",
    baseHp: 20,
    baseGold: 3,
    zone: 1,
  },
  {
    id: "goblin",
    name: "Goblin",
    enemyKey: "goblin",
    emoji: "",
    image: "/monsters/goblin.png",
    idleAnim: "shake",
    baseHp: 60,
    baseGold: 8,
    zone: 11,
  },
  {
    id: "skeleton",
    name: "Skeleton",
    enemyKey: "skeleton",
    emoji: "",
    image: "/monsters/skeleton.png",
    idleAnim: "float",
    baseHp: 150,
    baseGold: 18,
    zone: 15,
  },
  {
    id: "orc",
    name: "Orc",
    enemyKey: "orc",
    emoji: "",
    image: "/monsters/orc.png",
    idleAnim: "float",
    baseHp: 350,
    baseGold: 40,
    zone: 17,
  },
  {
    id: "troll",
    name: "Troll",
    enemyKey: "troll",
    emoji: "",
    image: "/monsters/troll.png",
    idleAnim: "float",
    baseHp: 800,
    baseGold: 90,
    zone: 18,
  },
  {
    id: "dark_knight",
    name: "Dark Knight",
    enemyKey: "knight",
    emoji: "",
    image: "/monsters/dark knight.png",
    idleAnim: "float",
    baseHp: 2000,
    baseGold: 220,
    zone: 21,
  },
  {
    id: "dragon",
    name: "Dragon",
    enemyKey: "dragon",
    emoji: "",
    image: "/monsters/dragon.png",
    idleAnim: "dragonHover",
    baseHp: 6000,
    baseGold: 600,
    zone: 25,
  },
  {
    id: "lich",
    name: "Lich King",
    enemyKey: "lich",
    emoji: "",
    image: "/monsters/lich king.png",
    idleAnim: "float",
    baseHp: 20000,
    baseGold: 2000,
    zone: 29,
  },
];

const HEROES = [
  // acquisition: { kind: 'start' | 'shop' | 'chest' | 'realmoney', note: string }
  // passive: { type: 'dmgMult'|'goldMult'|'cdReduce'|'clickAdd'|'dpsAdd', value: number }
  { id: "squire",   name: "Squire",       emoji: "🧑‍⚔️", baseDps: 1,    baseCost: 15,    costMult: 1.15, lore: "A farmboy who survived the first eclipse. He fights because nobody else will.", acquisition: { kind: "start", note: "You begin with him." }, passive: { type: "clickAdd", value: 1 } },
  { id: "archer",   name: "Archer",       emoji: "🏹",  baseDps: 5,    baseCost: 100,   costMult: 1.15, lore: "Her forest was swallowed by darkness. She shoots arrows toward a horizon she can't see.", acquisition: { kind: "chest", note: "Drops from Goblin Crags chests." }, passive: { type: "dmgMult", value: 0.05 } },
  { id: "mage",     name: "Mage",         emoji: "🧙",  baseDps: 20,   baseCost: 500,   costMult: 1.15, lore: "Refused to flee when the eclipse came. His tower is rubble, but his spells survive.", acquisition: { kind: "shop", note: "Available after unlocking Mage training." }, passive: { type: "cdReduce", value: 0.02 } },
  { id: "paladin",  name: "Paladin",      emoji: "⚔️",  baseDps: 80,   baseCost: 2000,  costMult: 1.15, lore: "One of the last who refused the Lich's offer of immortality. He fights as penance.", acquisition: { kind: "realmoney", note: "Limited Relic Store offer." }, passive: { type: "goldMult", value: 0.05 } },
  { id: "assassin", name: "Assassin",     emoji: "🗡️",  baseDps: 300,  baseCost: 8000,  costMult: 1.15, lore: "Sold her blade to the highest bidder until the eclipse swallowed them all. Now one cause remains.", acquisition: { kind: "chest", note: "Rare chest drop (Skeleton Catacombs)." }, passive: { type: "dpsAdd", value: 0.02 } },
  { id: "dragon",   name: "Dragon Rider", emoji: "🐲",  baseDps: 1200, baseCost: 35000, costMult: 1.15, lore: "The last free dragon chose a rider. Neither fully understands why. Both are grateful.", acquisition: { kind: "shop", note: "Purchasable after zone milestone." }, passive: { type: "dmgMult", value: 0.10 } },
  { id: "titan",    name: "Titan Guard",  emoji: "🗿",  baseDps: 5000, baseCost: 150000,costMult: 1.15, lore: "An ancient stone guardian reawakened by the first eclipse-quake. It has no allegiance — only purpose.", acquisition: { kind: "chest", note: "Obsidian Citadel chest reward." }, passive: { type: "goldMult", value: 0.08 } },
  { id: "seraph",   name: "Seraph",       emoji: "😇",  baseDps: 20000,baseCost: 800000,costMult: 1.15, lore: "Fell through a crack in the sky when the eclipse weakened the veil. It fights beside mortals, awed and confused.", acquisition: { kind: "realmoney", note: "Heavenbound offer." }, passive: { type: "clickAdd", value: 3 } },
];


const UPGRADES = [
  { id: "click1", name: "Sharp Blade",      desc: "+5 click dmg",    cost: 50,     type: "click", value: 5 },
  { id: "click2", name: "Battle Axe",       desc: "+20 click dmg",   cost: 500,    type: "click", value: 20 },
  { id: "click3", name: "Holy Sword",       desc: "+100 click dmg",  cost: 5000,   type: "click", value: 100 },
  { id: "click4", name: "Eclipse Breaker",  desc: "+1K click dmg",   cost: 100000, type: "click", value: 1000 },
  { id: "hero1",  name: "Squire Training",  desc: "Squire ×2 DPS",   cost: 200,    type: "hero",  heroId: "squire",   mult: 2 },
  { id: "hero2",  name: "Eagle Eye",        desc: "Archer ×2 DPS",   cost: 1000,   type: "hero",  heroId: "archer",   mult: 2 },
  { id: "hero3",  name: "Arcane Tome",      desc: "Mage ×2 DPS",     cost: 5000,   type: "hero",  heroId: "mage",     mult: 2 },
  { id: "hero4",  name: "Divine Shield",    desc: "Paladin ×2 DPS",  cost: 20000,  type: "hero",  heroId: "paladin",  mult: 2 },
  { id: "hero5",  name: "Shadow Contract",  desc: "Assassin ×2 DPS", cost: 80000,  type: "hero",  heroId: "assassin", mult: 2 },
  { id: "hero6",  name: "Dragon Pact",      desc: "Dragon Rider ×2", cost: 400000, type: "hero",  heroId: "dragon",   mult: 2 },
];

// Hero level milestones — landmark levels granting damage multipliers
const HERO_MILESTONES = [
  { level: 25,  mult: 2, label: "×2" },
  { level: 50,  mult: 4, label: "×4" },
  { level: 100, mult: 8, label: "×8" },
];

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

const ACQ_LABEL = { start: "Starting Hero", shop: "Gold Shop", chest: "Chest Drop", realmoney: "Relic Store" };
const ACQ_EMOJI = { start: "⭐", shop: "🏪", chest: "🎁", realmoney: "💎" };

// Artifact tree — bought with Soul Crystals from rebirth
const ARTIFACT_UPGRADES = [
  { id: "art_gold1",    name: "Gilded Wake",       emoji: "🪙", desc: "+10% gold drops",         cost: 1, type: "gold",     value: 0.10 },
  { id: "art_gold2",    name: "Fortune's Tide",    emoji: "💰", desc: "+25% gold drops",         cost: 2, type: "gold",     value: 0.25 },
  { id: "art_gold3",    name: "Eclipse Hoard",     emoji: "👑", desc: "+50% gold drops",         cost: 4, type: "gold",     value: 0.50 },
  { id: "art_cd1",      name: "Swift Strike",      emoji: "⚡", desc: "-10% ability cooldowns",  cost: 1, type: "cooldown", value: 0.10 },
  { id: "art_cd2",      name: "Relentless Flow",   emoji: "🌀", desc: "-20% ability cooldowns",  cost: 2, type: "cooldown", value: 0.20 },
  { id: "art_click1",   name: "Iron Resolve",      emoji: "🗡️", desc: "+20% click damage",       cost: 1, type: "clickMult",value: 0.20 },
  { id: "art_click2",   name: "Sundered Edge",     emoji: "⚔️", desc: "+50% click damage",       cost: 3, type: "clickMult",value: 0.50 },
  { id: "art_dps1",     name: "Warcry Echo",       emoji: "📯", desc: "+15% all hero DPS",       cost: 2, type: "dpsMult",  value: 0.15 },
  { id: "art_dps2",     name: "Soul Resonance",    emoji: "💎", desc: "+30% all hero DPS",       cost: 3, type: "dpsMult",  value: 0.30 },
  { id: "art_synergy1", name: "Bound Spirits",     emoji: "🧭", desc: "Companions deal 5% of click dmg (synergy)", cost: 2, type: "synergy", value: 0.05 },
  { id: "art_synergy2", name: "Eclipse Bond",      emoji: "🔮", desc: "Companions deal 12% of click dmg (synergy)", cost: 4, type: "synergy", value: 0.12 },
];

// Boss loot — equippable items dropped at 10% chance on zone milestone kills
const LOOT_PREFIXES = ["Ancient", "Cursed", "Sunken", "Blazing", "Spectral", "Obsidian", "Voidforged", "Lich-Touched"];
const LOOT_TYPES = [
  { type: "Sword",  emoji: "🗡️", stat: "clickMult", label: "Click Dmg" },
  { type: "Armor",  emoji: "🛡️", stat: "dpsMult",   label: "Hero DPS"  },
  { type: "Ring",   emoji: "💍", stat: "gold",      label: "Gold Drop" },
  { type: "Amulet", emoji: "📿", stat: "cdReduce",  label: "CD Reduce" },
];

function rollLootItem(zone) {
  const prefix = LOOT_PREFIXES[Math.floor(Math.random() * LOOT_PREFIXES.length)];
  const t      = LOOT_TYPES[Math.floor(Math.random() * LOOT_TYPES.length)];
  // Bonus scales softly with zone: 5-40%
  const bonus  = Math.round((5 + Math.min(zone * 0.3, 35)) * (0.7 + Math.random() * 0.6));
  return {
    id:     `loot_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    name:   `${prefix} ${t.type}`,
    emoji:  t.emoji,
    type:   t.type,
    stat:   t.stat,
    label:  t.label,
    bonus,  // percentage
    zone,
    equipped: false,
  };
}

// Companions — lore characters that auto-attack, levelable
const COMPANIONS = [
  {
    id: "dusk",
    name: "Dusk",
    title: "The Wandering Blade",
    emoji: "🧭",
    lore: "A sellsword who lost his memory when the Eclipse fell. He fights not for glory — only to remember who he was.",
    baseDmg: 2,
    interval: 500,
    baseCost: 75,
    costMult: 1.2,
  },
  {
    id: "mira",
    name: "Mira",
    title: "Shadow Scout",
    emoji: "🏹",
    lore: "She maps the corrupted lands one arrow at a time, leaving marks so others may find their way.",
    baseDmg: 10,
    interval: 700,
    baseCost: 500,
    costMult: 1.2,
  },
  {
    id: "aldric",
    name: "Brother Aldric",
    title: "Last Cleric of Dawn",
    emoji: "☀️",
    lore: "His order was destroyed in the first night of the Eclipse. He prays to the hidden sun anyway.",
    baseDmg: 35,
    interval: 1000,
    baseCost: 3000,
    costMult: 1.2,
  },
  {
    id: "zeph",
    name: "Zeph",
    title: "The Void Dancer",
    emoji: "🌀",
    lore: "Zeph slips between the cracks of fractured time, striking where corruption least expects.",
    baseDmg: 120,
    interval: 600,
    baseCost: 15000,
    costMult: 1.2,
  },
  {
    id: "lyra",
    name: "Lyra",
    title: "Archmage of the Broken Tower",
    emoji: "🔮",
    lore: "She converted her ruined tower into a beacon. Every spell is a message: we are still here.",
    baseDmg: 500,
    interval: 1500,
    baseCost: 80000,
    costMult: 1.2,
  },
  {
    id: "vex",
    name: "Commander Vex",
    title: "The Eternal Soldier",
    emoji: "💀",
    lore: "Vex has died and returned seventeen times. Each Rebirth makes him stronger. He understands your burden.",
    baseDmg: 2000,
    interval: 2000,
    baseCost: 500000,
    costMult: 1.2,
  },
];

// ── COMPANION ABILITIES ───────────────────────────────────────────────────────
// Each companion unlocks an ability when recruited (level >= 1).
// Ability power scales through 4 tiers based on companion level.
// Effects: burstDmg (% of currentEnemy maxHp), clickBuff (mult for duration),
//          goldBuff (mult for duration), dpsBuff (mult for duration),
//          healPercent (restores nothing — visual only, but adds feel),
//          slowField (reduces effective enemy hp regeneration — reflected as burst dmg)
// auto: always true — fires automatically when cooldown expires, no manual press.

const COMPANION_ABILITIES = [
  {
    compId: "dusk",
    id: "ca_dusk",
    name: "Phantom Strike",
    emoji: "🗡️",
    color: "#88aaff",
    origin: "A memory surfaces — a single perfect cut, from a life before the Eclipse.",
    // Thematic: sellsword, lost memory — single devastating strike (burst damage)
    tiers: [
      { minLevel: 1,  desc: "Deal 30% enemy max HP as burst",  cooldown: 20000, effect: { burstDmgPct: 0.30 } },
      { minLevel: 10, desc: "Deal 60% enemy max HP as burst",  cooldown: 18000, effect: { burstDmgPct: 0.60 } },
      { minLevel: 25, desc: "Deal 100% enemy max HP as burst", cooldown: 15000, effect: { burstDmgPct: 1.00 } },
      { minLevel: 50, desc: "Deal 200% enemy max HP as burst", cooldown: 12000, effect: { burstDmgPct: 2.00 } },
    ],
  },
  {
    compId: "mira",
    id: "ca_mira",
    name: "Rain of Arrows",
    emoji: "🏹",
    color: "#aaee55",
    origin: "Every arrow she fires is a mark on the map — she never forgets where she's been.",
    // Thematic: scout, mapper — rapid volley boosting all DPS briefly
    tiers: [
      { minLevel: 1,  desc: "+50% Hero DPS for 6s",  cooldown: 25000, effect: { dpsBuff: 0.50, dur: 6000 } },
      { minLevel: 10, desc: "+100% Hero DPS for 8s",  cooldown: 22000, effect: { dpsBuff: 1.00, dur: 8000 } },
      { minLevel: 25, desc: "+200% Hero DPS for 10s", cooldown: 18000, effect: { dpsBuff: 2.00, dur: 10000 } },
      { minLevel: 50, desc: "+400% Hero DPS for 12s", cooldown: 14000, effect: { dpsBuff: 4.00, dur: 12000 } },
    ],
  },
  {
    compId: "aldric",
    id: "ca_aldric",
    name: "Dawn's Blessing",
    emoji: "☀️",
    color: "#ffdd44",
    origin: "He speaks a prayer to the hidden sun. For a moment, everyone fights a little harder.",
    // Thematic: cleric, dawn — gold aura (prayers turn enemies' greed against them)
    tiers: [
      { minLevel: 1,  desc: "2× Gold drops for 8s",  cooldown: 30000, effect: { goldBuff: 2,   dur: 8000 } },
      { minLevel: 10, desc: "3× Gold drops for 10s", cooldown: 26000, effect: { goldBuff: 3,   dur: 10000 } },
      { minLevel: 25, desc: "4× Gold drops for 12s", cooldown: 22000, effect: { goldBuff: 4,   dur: 12000 } },
      { minLevel: 50, desc: "6× Gold drops for 15s", cooldown: 16000, effect: { goldBuff: 6,   dur: 15000 } },
    ],
  },
  {
    compId: "zeph",
    id: "ca_zeph",
    name: "Void Step",
    emoji: "🌀",
    color: "#cc77ff",
    origin: "Zeph slips sideways through fractured time, striking from directions that shouldn't exist.",
    // Thematic: time dancer — click multiplier (striking from many timelines at once)
    tiers: [
      { minLevel: 1,  desc: "3× Click damage for 5s",  cooldown: 22000, effect: { clickBuff: 3, dur: 5000 } },
      { minLevel: 10, desc: "5× Click damage for 7s",  cooldown: 19000, effect: { clickBuff: 5, dur: 7000 } },
      { minLevel: 25, desc: "8× Click damage for 9s",  cooldown: 16000, effect: { clickBuff: 8, dur: 9000 } },
      { minLevel: 50, desc: "15× Click damage for 12s",cooldown: 12000, effect: { clickBuff: 15,dur: 12000 } },
    ],
  },
  {
    compId: "lyra",
    id: "ca_lyra",
    name: "Arcane Nova",
    emoji: "🔮",
    color: "#ff88cc",
    origin: "The beacon fires. Every surviving mage within a hundred leagues feels it — and fights harder.",
    // Thematic: archmage, tower — massive burst + brief DPS amp
    tiers: [
      { minLevel: 1,  desc: "50% HP burst + +80% DPS 6s",   cooldown: 35000, effect: { burstDmgPct: 0.50, dpsBuff: 0.80, dur: 6000 } },
      { minLevel: 10, desc: "100% HP burst + +150% DPS 8s",  cooldown: 30000, effect: { burstDmgPct: 1.00, dpsBuff: 1.50, dur: 8000 } },
      { minLevel: 25, desc: "200% HP burst + +300% DPS 10s", cooldown: 24000, effect: { burstDmgPct: 2.00, dpsBuff: 3.00, dur: 10000 } },
      { minLevel: 50, desc: "400% HP burst + +600% DPS 12s", cooldown: 18000, effect: { burstDmgPct: 4.00, dpsBuff: 6.00, dur: 12000 } },
    ],
  },
  {
    compId: "vex",
    id: "ca_vex",
    name: "Eclipse Veteran",
    emoji: "💀",
    color: "#cc3333",
    origin: "Vex has fought this enemy seventeen times. He knows exactly where to hit.",
    // Thematic: eternal soldier, reborn — stacks ALL buffs simultaneously (click + DPS + gold + burst)
    tiers: [
      { minLevel: 1,  desc: "2× Click+DPS+Gold for 5s",  cooldown: 45000, effect: { clickBuff: 2,  dpsBuff: 1.00, goldBuff: 2,  dur: 5000,  burstDmgPct: 0.20 } },
      { minLevel: 10, desc: "3× Click+DPS+Gold for 8s",  cooldown: 40000, effect: { clickBuff: 3,  dpsBuff: 2.00, goldBuff: 3,  dur: 8000,  burstDmgPct: 0.50 } },
      { minLevel: 25, desc: "5× Click+DPS+Gold for 10s", cooldown: 32000, effect: { clickBuff: 5,  dpsBuff: 4.00, goldBuff: 5,  dur: 10000, burstDmgPct: 1.00 } },
      { minLevel: 50, desc: "8× Click+DPS+Gold for 15s", cooldown: 24000, effect: { clickBuff: 8,  dpsBuff: 8.00, goldBuff: 8,  dur: 15000, burstDmgPct: 2.00 } },
    ],
  },
];

// Get the current tier for a companion ability based on level
function getCompAbilityTier(ability, level) {
  if (!level || level < 1) return null;
  let tier = ability.tiers[0];
  for (const t of ability.tiers) {
    if (level >= t.minLevel) tier = t;
  }
  return tier;
}

const ABILITIES = [
  { id: "berserk",   name: "Berserker", emoji: "💢", desc: "10× click dmg", duration: 5000,  cooldown: 15000, color: "#cc2200" },
  { id: "battlecry", name: "Battle Cry",emoji: "📯", desc: "2× all dmg",   duration: 5000,  cooldown: 30000, color: "#f5c518" },
  { id: "goldrush",  name: "Gold Rush", emoji: "✨", desc: "2× gold drops", duration: 10000, cooldown: 60000, color: "#44cc88" },
];

// Commander Paths — chosen once per Rebirth, reset each cycle
const COMMANDER_PATHS = [
  {
    id: "vanguard",
    name: "The Vanguard",
    emoji: "⚔️",
    color: "#cc4422",
    subtitle: "Active Click Focus",
    lore: "You are the blade itself. Your hand never rests, your strikes never falter. The Eclipse bleeds where you point.",
    bonuses: ["×2 all click damage", "Berserker cooldown −50%"],
  },
  {
    id: "tactician",
    name: "The Tactician",
    emoji: "📯",
    color: "#c8900a",
    subtitle: "Idle DPS Focus",
    lore: "Generals win wars, not soldiers. You command from high ground, and your army fights twice as hard for it.",
    bonuses: ["+40% Hero & Companion DPS", "+20% gold from every kill"],
  },
  {
    id: "void_mage",
    name: "The Void Mage",
    emoji: "🔮",
    color: "#8844cc",
    subtitle: "Ability Synergist",
    lore: "The fractures in time are tools, not obstacles. You bend the eclipse's own dark energy back against its master.",
    bonuses: ["+5s to all ability durations", "Max 3 weak points on screen", "Weak point crits deal ×4 damage"],
  },
];

// Story lore unlocked by zone
const ZONE_LORE = [
  { zone: 1,  text: "The Eclipse fell three years ago. The Lich King shattered time itself to plunge the world into endless night. You are the Eternal Commander — the only one who remembers every lifetime." },
  { zone: 3,  text: "Goblin warbands roam freely now, emboldened by the dark. They say the Lich King promised them the moon." },
  { zone: 5,  text: "Skeleton legions patrol the old roads — soldiers who died in the first wave, reanimated by the Lich's will. Friends, once." },
  { zone: 10, text: "You begin to sense the fracture in time. Déjà vu. You have fought this Orc before. You will again. The question is: how much stronger can you become?" },
  { zone: 15, text: "Trolls have built crude temples to the endless night. They worship the Eclipse as a god. They do not know it is a cage." },
  { zone: 20, text: "Dark Knights — fallen paladins who pledged allegiance to the Lich for immortality. They got it. They regret it." },
  { zone: 30, text: "Dragon bones litter the sky roads. The Lich turned the great ones into weapons. A few still resist in the deep valleys." },
  { zone: 40, text: "You can feel him watching now. The Lich King has seen you die before. He does not understand why you keep returning." },
  { zone: 50, text: "The fracture in time is wide enough. You feel the pull of Rebirth. Another lifetime. Another chance. Each death is a step." },
  { zone: 75, text: "Your companions remember fragments across lifetimes. Dusk almost recalled his name today. The Eclipse is thinning — barely." },
  { zone: 100, text: "One hundred zones. The Lich King's fortress looms on the horizon of every vision. You will reach it. You always do." },
];

// Map regions — zone ranges with flavour
const REGIONS = [
  {
    minZone: 1,  maxZone: 9,
    name: "The Slime Outskirts", emoji: "🌾", accent: "#3a6a20",
    desc: "Once-peaceful farmland, now overrun by acidic oozes seeping from the eclipse wounds in the earth.",
    lore: "Three years ago these fields fed a dozen villages. Farmers left their tools in the soil and never came back — some fled, some were taken, some simply dissolved when the ooze reached their doorsteps. The crops still grow here, twisted and wrong, fed by whatever the slimes leave behind. You can still see the scarecrows standing in rows. They don't frighten anything anymore. The slimes drift between them like they own the place. Which, perhaps now, they do.",
  },
  {
    minZone: 10, maxZone: 19,
    name: "Goblin Crags", emoji: "⛰️", accent: "#6a5a20",
    desc: "A rocky labyrinth where goblin ambushers pick apart traveling merchants and lost patrols.",
    lore: "The goblins didn't cause the Eclipse — they simply moved in after it happened, like vermin into an abandoned house. The merchant road through these crags once carried silk and spice from the eastern ports. Now it carries nothing. Goblin warchiefs have staked out every choke point, every narrow pass, every blind corner. They squabble constantly over territory, which is the only reason any traveler gets through at all. The infighting keeps them distracted. Barely.",
  },
  {
    minZone: 20, maxZone: 29,
    name: "The Forgotten Catacombs", emoji: "🪦", accent: "#4a3a6a",
    desc: "Where the restless skeletons of ancient soldiers guard rusted armor and oaths made to dead kings.",
    lore: "Beneath the old capital lie centuries of buried soldiers, sealed in stone and given their final rites. The Lich King's first act was to unseal every tomb he could find. These men and women died with honor. They rise without it — their personalities scraped out, their bodies reduced to weapons. Somewhere beneath these corridors, there are names carved into walls. Epitaphs. Families who believed their loved ones were at rest. The Lich gave them movement, but took away everything that made them worth mourning.",
  },
  {
    minZone: 30, maxZone: 39,
    name: "Orcish Wastes", emoji: "🏜️", accent: "#7a4a10",
    desc: "Scorched flatlands where orc warlords carve out kingdoms in the Lich's name, fighting for his favor.",
    lore: "The Lich King made a promise to the orc clans: serve me and inherit the world once the light is gone. The orcs believed him. They burned their own ancestral homelands in tribute, salted their own wells, shattered their own monuments — proof of devotion. Now they wait in the ruins of what they destroyed. The promised reward has not come. The Lich ignores them. But they cannot admit the bargain was a lie, because then they would have to live with what they gave up for nothing.",
  },
  {
    minZone: 40, maxZone: 49,
    name: "The Troll Marshes", emoji: "🌿", accent: "#2a5a3a",
    desc: "Fetid swamps where troll shamans commune with the darkness, growing stronger with each eclipse cycle.",
    lore: "Trolls have always been creatures of rot and regrowth — cut one down and it rises again, larger. The Eternal Eclipse suits them perfectly. Their shamans discovered they could draw power directly from the dark sky, channeling it through crude ritual stones half-submerged in the murk. Each cycle that passes without a sunrise makes them a little stronger. A little larger. A little harder to kill. The marshes themselves seem to be changing too — the water is darker, the mist thicker, the trees bent at angles that suggest something has been pushing against them from within.",
  },
  {
    minZone: 50, maxZone: 59,
    name: "Citadel Approach", emoji: "🏰", accent: "#3a3a7a",
    desc: "The broken road to the Lich King's domain. Dark Knights patrol in unwavering, undying formation.",
    lore: "These were once holy paladins. The most decorated. The most faithful. The Lich King offered them immortality and they took it — not out of cowardice, but because they believed they could serve longer, protect more, endure further. The cost wasn't explained until after. They cannot remove their armor. They cannot sleep. They cannot stop moving. The order that trained them is long dead, its temples ash. They march these roads forever because there is no other command left to follow, and following a command is the only shape their existence still holds.",
  },
  {
    minZone: 60, maxZone: 69,
    name: "The Dragon Highlands", emoji: "🐉", accent: "#7a2a10",
    desc: "Volcanic ridges where corrupted dragons circle endlessly, loyal to the Lich's call by dark sorcery.",
    lore: "Dragons do not submit. That is the oldest truth about them. So the Lich King did not ask them to submit — he simply rewrote the part of them that could refuse. Something in their minds was turned, like a key in a lock, and now they fly patterns they did not choose over territory they do not remember claiming. A few escaped into the deep valleys before the corruption spread. You can hear them sometimes, far below — calling out in a language too old to translate. Whether it is rage or grief is impossible to say. Both, probably.",
  },
  {
    minZone: 70, maxZone: 999,
    name: "The Obsidian Citadel", emoji: "🌋", accent: "#5a1a1a",
    desc: "The volcanic throne of the Eclipse and birthplace of the Lich King's dark power. The air itself burns.",
    lore: "The Citadel was not built. It grew — a crystallization of dark magic around the point where the Eclipse first anchored to the earth. The walls are not stone but compressed shadow, hardened over years into something that rings like iron when struck. The Lich King does not need to be present for it to be terrible. The building has absorbed so much of his will that it acts on his behalf — corridors that rearrange, stairs that descend into nothing, rooms that remember every commander who has come this far and died. It has seen you before. Every version of you. It is still waiting to see if this time is different.",
  },
];

// Chronicle milestones — pop up once when a zone threshold is first crossed
const CHRONICLES = [
  { zone: 10,  icon: "🗺️", title: "The Crags Await",           text: "You cross into the Goblin Crags. The farmlands are behind you — scorched and gone. Mira's arrows find purchase in the rocky walls. She says she has been here before. In another life, perhaps." },
  { zone: 25,  icon: "⚰️", title: "Into the Catacombs",         text: "The ground hollows beneath your boots. The Forgotten Catacombs swallow sound itself. Brother Aldric crosses himself and prays. The skeletons here were not always enemies. They had names once." },
  { zone: 50,  icon: "📜", title: "Oracle's Prophecy Unlocked", text: "Your mortal shell has reached its limit against the corrupting fog. You stand before the threshold of ancient power. To go any further, you must shatter your current timeline and scatter your gold to ascend into spirit form." },
  { zone: 75,  icon: "🌋", title: "The Obsidian Citadel",       text: "The air smells of sulfur and old magic. The Lich King's fortress rises from the volcanic rock like a wound that never healed. Vex touches the wall. 'I have died here before,' he says quietly. 'More than once.'" },
  { zone: 100, icon: "☠️", title: "The Threshold of the Lich",  text: "One hundred zones. The Eclipse pulses above like a heartbeat. The Lich King knows your name now. He has always known it. Every lifetime, every Rebirth — he has been waiting. This time, you are stronger." },
];

// ── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
// Each achievement tracks a lifetime stat and grants a permanent multiplier.
// bonus.type mirrors the artifact bonus types so we can reuse computeAchievementBonuses().
const ACHIEVEMENTS = [
  // ── CLICK FEATS ──
  {
    id: "carpal_tunnel",
    name: "The Carpal Tunnel Special",
    emoji: "🖱️",
    desc: "Click 10,000 times total",
    flavor: "Your wrist aches. The Eclipse retreats anyway.",
    stat: "totalClicks", threshold: 10000,
    bonus: { type: "clickMult", value: 0.05 },
    rewardText: "+5% Click Damage — permanently",
  },
  {
    id: "clickzilla",
    name: "Clickzilla",
    emoji: "👊",
    desc: "Click 100,000 times total",
    flavor: "At this point the enemy is less afraid of the Eclipse and more afraid of you.",
    stat: "totalClicks", threshold: 100000,
    bonus: { type: "clickMult", value: 0.15 },
    rewardText: "+15% Click Damage — permanently",
  },
  {
    id: "tap_ascendant",
    name: "Tap Ascendant",
    emoji: "✨",
    desc: "Click 1,000,000 times total",
    flavor: "You have become one with the button.",
    stat: "totalClicks", threshold: 1000000,
    bonus: { type: "clickMult", value: 0.30 },
    rewardText: "+30% Click Damage — permanently",
  },

  // ── KILL FEATS ──
  {
    id: "monster_mash",
    name: "Monster Mash",
    emoji: "💀",
    desc: "Defeat 1,000 enemies",
    flavor: "They keep coming. So do you.",
    stat: "totalKills", threshold: 1000,
    bonus: { type: "goldMult", value: 0.02 },
    rewardText: "+2% Gold Dropped — permanently",
  },
  {
    id: "genocide_lite",
    name: "Eclipse Exterminator",
    emoji: "☠️",
    desc: "Defeat 10,000 enemies",
    flavor: "The Lich King has noticed. He is not pleased.",
    stat: "totalKills", threshold: 10000,
    bonus: { type: "goldMult", value: 0.08 },
    rewardText: "+8% Gold Dropped — permanently",
  },
  {
    id: "lich_nightmare",
    name: "The Lich's Nightmare",
    emoji: "🌑",
    desc: "Defeat 100,000 enemies",
    flavor: "You are the thing that hunts in the dark now.",
    stat: "totalKills", threshold: 100000,
    bonus: { type: "goldMult", value: 0.20 },
    rewardText: "+20% Gold Dropped — permanently",
  },

  // ── GOLD SPENT FEATS ──
  {
    id: "rich_gets_richer",
    name: "Rich Gets Richer",
    emoji: "💰",
    desc: "Spend 1,000,000 gold total",
    flavor: "It costs gold to make gold. The accountants of the Eclipse weep.",
    stat: "totalGoldSpent", threshold: 1000000,
    bonus: { type: "upgradeCostReduce", value: 0.05 },
    rewardText: "−5% Hero Upgrade Costs — permanently",
  },
  {
    id: "void_economy",
    name: "Void Economist",
    emoji: "🏦",
    desc: "Spend 100,000,000 gold total",
    flavor: "You have personally funded the entire war effort. Multiple times.",
    stat: "totalGoldSpent", threshold: 100000000,
    bonus: { type: "upgradeCostReduce", value: 0.15 },
    rewardText: "−15% Hero Upgrade Costs — permanently",
  },

  // ── GOLD EARNED FEATS ──
  {
    id: "first_million",
    name: "First Million",
    emoji: "🪙",
    desc: "Earn 1,000,000 gold lifetime",
    flavor: "The first million is always the hardest.",
    stat: "totalGoldEarned", threshold: 1000000,
    bonus: { type: "goldMult", value: 0.05 },
    rewardText: "+5% Gold Dropped — permanently",
  },
  {
    id: "eclipse_treasury",
    name: "Eclipse Treasury",
    emoji: "👑",
    desc: "Earn 1,000,000,000 gold lifetime",
    flavor: "The Eclipse itself owes you money at this point.",
    stat: "totalGoldEarned", threshold: 1000000000,
    bonus: { type: "goldMult", value: 0.15 },
    rewardText: "+15% Gold Dropped — permanently",
  },

  // ── ZONE FEATS ──
  {
    id: "deep_diver",
    name: "Deep Diver",
    emoji: "🗺️",
    desc: "Reach Zone 25",
    flavor: "Most commanders never leave the forest. You are not most commanders.",
    stat: "maxZone", threshold: 25,
    bonus: { type: "dpsMult", value: 0.10 },
    rewardText: "+10% All Hero DPS — permanently",
  },
  {
    id: "lich_door",
    name: "At the Lich's Door",
    emoji: "🏰",
    desc: "Reach Zone 75",
    flavor: "Few have stood this close. Fewer still lived long enough to count it.",
    stat: "maxZone", threshold: 75,
    bonus: { type: "dpsMult", value: 0.25 },
    rewardText: "+25% All Hero DPS — permanently",
  },

  // ── REBIRTH FEATS ──
  {
    id: "once_more",
    name: "Once More Into the Eclipse",
    emoji: "🔁",
    desc: "Rebirth 3 times",
    flavor: "Death is not an end. It is a strategy.",
    stat: "totalRebirths", threshold: 3,
    bonus: { type: "clickMult", value: 0.10 },
    rewardText: "+10% Click Damage — permanently",
  },
  {
    id: "eternal_soldier",
    name: "Eternal Soldier",
    emoji: "♾️",
    desc: "Rebirth 10 times",
    flavor: "You and Commander Vex have more in common than you thought.",
    stat: "totalRebirths", threshold: 10,
    bonus: { type: "dpsMult", value: 0.20 },
    rewardText: "+20% All Hero DPS — permanently",
  },

  // ── COMBO FEATS ──
  {
    id: "combo_apprentice",
    name: "Combo Apprentice",
    emoji: "⚡",
    desc: "Reach a ×5 combo multiplier",
    flavor: "Faster. They can't keep up.",
    stat: "maxCombo", threshold: 30,
    bonus: { type: "clickMult", value: 0.05 },
    rewardText: "+5% Click Damage — permanently",
  },
];

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

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return "0";
  n = Math.floor(n);
  if (n < 1000) return n.toString();
  let i = 0; let v = n;
  while (v >= 1000 && i < SUFFIXES.length - 1) { v /= 1000; i++; }
  return v.toFixed(2) + SUFFIXES[i];
}

// Slime King — special boss enemy for zone 9 (end of Slime Outskirts)
const SLIME_KING = {
  id: "slime_king",
  name: "Slime King",
  emoji: "👑",
  image: "/monsters/slime_king.png",
  idleAnim: "float",
  baseHp: 1800,
  baseGold: 180,
  zone: 9,
};

function getEnemyForZone(zone) {
  // Zone 9 — Slime King boss
  if (zone === 9) {
    return { ...SLIME_KING, maxHp: SLIME_KING.baseHp, goldReward: SLIME_KING.baseGold };
  }
  // Slime Outskirts (zones 1-8): 99.9% slime, 0.1% rare goblin
  if (zone >= 1 && zone <= 8) {
    const slime = ENEMIES[0]; // slime
    const scale = Math.pow(1.4, zone - 1);
    if (Math.random() < 0.001) {
      // Rare goblin visitor
      const goblin = ENEMIES[1];
      return { ...goblin, name: "Lost Goblin", maxHp: Math.floor(goblin.baseHp * scale), goldReward: Math.floor(goblin.baseGold * scale * 3) };
    }
    return { ...slime, maxHp: Math.floor(slime.baseHp * scale), goldReward: Math.floor(slime.baseGold * scale) };
  }
  const idx  = Math.min(zone - 1, ENEMIES.length - 1);
  const base = ENEMIES[idx];
  const scale = Math.pow(1.5, Math.max(0, zone - base.zone));
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
    const upg  = UPGRADES.find(u => u.type === "hero" && u.heroId === hero.id);
    const upgMult = upg && boughtUpgrades.includes(upg.id) ? upg.mult : 1;
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
    if (a.type === "synergy")   b.synergyPct = Math.max(b.synergyPct, a.value);
  }
  return b;
}

// Compute equipped loot bonuses
function computeLootBonuses(lootItems) {
  const b = { clickMult: 0, dpsMult: 0, gold: 0, cdReduce: 0 };
  for (const item of lootItems) {
    if (!item.equipped) continue;
    if (item.stat === "clickMult") b.clickMult += item.bonus / 100;
    if (item.stat === "dpsMult")   b.dpsMult   += item.bonus / 100;
    if (item.stat === "gold")      b.gold       += item.bonus / 100;
    if (item.stat === "cdReduce")  b.cdReduce   += item.bonus / 100;
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

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function IdleRPG() {
  // ── Audio (placeholder) ───────────────────────────────────────────────
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const musicRef = useRef(null);
  const bgmLoopRef = useRef(false);

  const playSfx = useCallback((src) => {
    if (!sfxEnabled || !src) return;
    try {
      const a = new Audio(src);
      a.volume = 0.6;
      a.play().catch(() => {});
    } catch (_) {}
  }, [sfxEnabled]);

  const playBgm = useCallback((src) => {
    if (!musicEnabled || !src) return;
    try {
      if (musicRef.current) {
        try { musicRef.current.pause(); } catch (_) {}
      }
      const a = new Audio(src);
      a.loop = true;
      a.volume = 0.4;
      a.play().catch(() => {});
      musicRef.current = a;
      bgmLoopRef.current = true;
    } catch (_) {}
  }, [musicEnabled]);

  const stopBgm = useCallback(() => {
    try {
      if (musicRef.current) musicRef.current.pause();
    } catch (_) {}
    musicRef.current = null;
    bgmLoopRef.current = false;
  }, []);


  const [gold, setGold]         = useState(0);
  const [zone, setZone]         = useState(1);
  const [killCount, setKillCount] = useState(0);

  const initEnemy = getEnemyForZone(1);
  const [currentEnemy, setCurrentEnemy] = useState(initEnemy);
  const [enemyHp, setEnemyHp]           = useState(initEnemy.maxHp);

  const [heroLevels, setHeroLevels]         = useState({});
  const [companionLevels, setCompanionLevels] = useState({});
  const [boughtUpgrades, setBoughtUpgrades]   = useState([]);
  const [clickDmg, setClickDmg]             = useState(1);

  // New systems
  const [soulCrystals, setSoulCrystals]       = useState(0);   // spendable rebirth currency
  const [artifactOwned, setArtifactOwned]     = useState([]);  // bought artifact upgrades
  const [lootItems, setLootItems]             = useState([]);  // dropped equippable items
  const [voidDust, setVoidDust]               = useState(0);   // 🌌 from scrapping loot
  const [lootModal, setLootModal]             = useState(null);// pending loot to show
  const [milestoneToast, setMilestoneToast]   = useState(null);// hero milestone notification
  const [activePanel, setActivePanel]         = useState(null);// "artifacts" | "loot"

  const [abilityState, setAbilityState] = useState(
    Object.fromEntries(ABILITIES.map(a => [a.id, { activeUntil: 0, cdUntil: 0 }]))
  );
  // Companion ability state — keyed by ca_id, same shape as abilityState
  const [compAbilityState, setCompAbilityState] = useState(
    Object.fromEntries(COMPANION_ABILITIES.map(a => [a.id, { activeUntil: 0, cdUntil: 0 }]))
  );
  // Active companion buffs (multiplicative, applied in derived values)
  const [compBuffs, setCompBuffs] = useState({ clickMult: 1, dpsMult: 1, goldMult: 1 });
  const [now, setNow] = useState(Date.now());

  const [floats, setFloats] = useState([]);
  const [shake, setShake]   = useState(false);
  const [weakPoints, setWeakPoints] = useState([]);
  const [comboCount, setComboCount] = useState(0); // rapid-click combo counter // dynamic crit hotspots on enemy

  const [storyPopup, setStoryPopup] = useState(null);
  const [seenStoryZones, setSeenStoryZones] = useState([]);

  const [enemyHitNonce, setEnemyHitNonce] = useState(0);

  const [tab, setTab] = useState("battle");

  // Auto-Advance vs Farm toggle
  const [farmMode, setFarmMode] = useState(false); // false = auto-advance, true = farm same zone

  // Companion bulk-buy mode
  const [buyMode, setBuyMode] = useState("x1"); // "x1" | "x10" | "x100" | "max"

  // Boss stage timer
  const [bossTimerEnd, setBossTimerEnd] = useState(null); // timestamp | null
  const [bossFailToast, setBossFailToast] = useState(null); // { prevZone } | null

  // ── Achievement system ────────────────────────────────────────────────────
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [achievementToast, setAchievementToast]         = useState(null);
  const [totalClicks, setTotalClicks]                   = useState(0);
  const [totalKills, setTotalKills]                     = useState(0);
  const [totalGoldEarned, setTotalGoldEarned]           = useState(0);
  const [totalGoldSpent, setTotalGoldSpent]             = useState(0);
  const [maxZoneReached, setMaxZoneReached]             = useState(1);
  const [maxComboReached, setMaxComboReached]           = useState(0);

  const [offlineModal, setOfflineModal]       = useState(null);
  const [rebirthCount, setRebirthCount]       = useState(0);
  const [rebirthConfirm, setRebirthConfirm]   = useState(false);
  const [commanderPath, setCommanderPath]     = useState(null); // null | "vanguard" | "tactician" | "void_mage"
  const [pathChoiceModal, setPathChoiceModal] = useState(false);
  const [seenChronicles, setSeenChronicles]   = useState([]);
  const [activeChronicle, setActiveChronicle] = useState(null);

  // (placeholder for future world-transition polish)
  const [pendingWorldBg, setPendingWorldBg] = useState(null);



  // ── refs ──────────────────────────────────────────────────────────────────
  const floatId  = useRef(0);
  const zoneRef  = useRef(zone);
  const enemyRef = useRef(currentEnemy);
  zoneRef.current  = zone;
  enemyRef.current = currentEnemy;

  const goldRef            = useRef(gold);            goldRef.current            = gold;
  const heroLevelsRef      = useRef(heroLevels);      heroLevelsRef.current      = heroLevels;
  const companionLevelsRef = useRef(companionLevels); companionLevelsRef.current = companionLevels;
  const boughtUpgradesRef  = useRef(boughtUpgrades);  boughtUpgradesRef.current  = boughtUpgrades;
  const clickDmgRef        = useRef(clickDmg);        clickDmgRef.current        = clickDmg;
  const killCountRef       = useRef(killCount);       killCountRef.current       = killCount;
  const rebirthCountRef    = useRef(rebirthCount);    rebirthCountRef.current    = rebirthCount;
  const seenChroniclesRef  = useRef(seenChronicles);  seenChroniclesRef.current  = seenChronicles;
  const artifactOwnedRef   = useRef(artifactOwned);   artifactOwnedRef.current   = artifactOwned;
  const soulCrystalsRef    = useRef(soulCrystals);    soulCrystalsRef.current    = soulCrystals;
  const lootItemsRef       = useRef(lootItems);       lootItemsRef.current       = lootItems;
  const voidDustRef        = useRef(voidDust);        voidDustRef.current        = voidDust;
  const saveLoadedRef      = useRef(false);
  const wpIdRef            = useRef(0);
  const commanderPathRef   = useRef(commanderPath);   commanderPathRef.current   = commanderPath;
  const maxWpRef           = useRef(2);               maxWpRef.current           = commanderPath === "void_mage" ? 3 : 2;
  const seenStoryZonesRef = useRef(seenStoryZones); seenStoryZonesRef.current = seenStoryZones;
  const farmModeRef       = useRef(farmMode);        farmModeRef.current       = farmMode;
  const bossTimerEndRef   = useRef(bossTimerEnd);    bossTimerEndRef.current   = bossTimerEnd;
  const lastClickTimeRef  = useRef(0); // timestamp of last click, for combo window

  // Companion ability refs
  const compAbilityStateRef = useRef(compAbilityState); compAbilityStateRef.current = compAbilityState;
  const compBuffsRef        = useRef(compBuffs);         compBuffsRef.current        = compBuffs;

  // Achievement refs (always-current for use inside callbacks)
  const totalClicksRef          = useRef(totalClicks);          totalClicksRef.current          = totalClicks;
  const totalKillsRef           = useRef(totalKills);           totalKillsRef.current           = totalKills;
  const totalGoldEarnedRef      = useRef(totalGoldEarned);      totalGoldEarnedRef.current      = totalGoldEarned;
  const totalGoldSpentRef       = useRef(totalGoldSpent);       totalGoldSpentRef.current       = totalGoldSpent;
  const maxZoneReachedRef       = useRef(maxZoneReached);       maxZoneReachedRef.current       = maxZoneReached;
  const maxComboReachedRef      = useRef(maxComboReached);      maxComboReachedRef.current      = maxComboReached;
  const unlockedAchievementsRef = useRef(unlockedAchievements); unlockedAchievementsRef.current = unlockedAchievements;


  // ── derived values ────────────────────────────────────────────────────────
  const isBerserk   = now < (abilityState.berserk?.activeUntil   || 0);
  const isBattleCry = now < (abilityState.battlecry?.activeUntil || 0);
  const isGoldRush  = now < (abilityState.goldrush?.activeUntil  || 0);

  const artBonuses  = computeArtifactBonuses(artifactOwned);
  const lootBonuses = computeLootBonuses(lootItems);
  const heroPassives = computeHeroPassiveBonuses(heroLevels);
  const achBonuses  = computeAchievementBonuses(unlockedAchievements);

  // Effective cooldown multiplier from artifacts + loot + hero passives
  const cdReduction = Math.min(0.7, artBonuses.cdReduce + lootBonuses.cdReduce + heroPassives.cdReduce); // cap at 70%

  const dmgMult         = isBattleCry ? 2 : 1;
  const rebirthMult     = 1 + rebirthCount * 0.5;
  const pathClickMult   = commanderPath === "vanguard"  ? 2   : 1;
  const pathDpsMult     = commanderPath === "tactician" ? 1.4 : 1;
  const pathGoldBonus   = commanderPath === "tactician" ? 0.2 : 0;
  const clickArtMult    = 1 + artBonuses.clickMult + lootBonuses.clickMult + achBonuses.clickMult;
  const effectiveDmg    = (clickDmg + heroPassives.clickAdd) * (isBerserk ? 10 : 1) * dmgMult * clickArtMult * pathClickMult * (1 + heroPassives.dmgMult) * compBuffs.clickMult;
  const idleDps         = computeIdleDps(heroLevels, boughtUpgrades, artifactOwned) * (1 + lootBonuses.dpsMult + achBonuses.dpsMult) * (1 + heroPassives.dpsAdd) * dmgMult * rebirthMult * pathDpsMult * compBuffs.dpsMult;

  const goldMultRef    = useRef(1); goldMultRef.current    = isGoldRush ? 2 : 1;
  const rebirthMultRef = useRef(1); rebirthMultRef.current = rebirthMult;
  const idleDpsRef     = useRef(0); idleDpsRef.current     = idleDps;
  const artGoldMultRef = useRef(1); artGoldMultRef.current = (1 + artBonuses.goldMult + lootBonuses.gold + pathGoldBonus + heroPassives.goldMult + achBonuses.goldMult) * compBuffs.goldMult;
  const effectiveDmgRef= useRef(1); effectiveDmgRef.current= effectiveDmg;
  const artSynergyRef  = useRef(0); artSynergyRef.current  = artBonuses.synergyPct;
  const pathDpsMultRef = useRef(1); pathDpsMultRef.current = pathDpsMult;

  const currentLore = getCurrentLore(zone);

  const currentWorld = WORLDS.find((w) => zone <= w.id * 5) || WORLDS[WORLDS.length - 1];
  const currentBoss = BOSSES.find((b) => b.zone === zone) || null;


  // ── clock tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  // ── spawn enemy ───────────────────────────────────────────────────────────
  const spawnEnemy = useCallback((nextZone) => {
    const e = getEnemyForZone(nextZone);
    setCurrentEnemy(e);
    setEnemyHp(e.maxHp);
    enemyRef.current = e;
  }, []);

  // ── Achievement checker ───────────────────────────────────────────────────
  const checkAchievements = useCallback((stats) => {
    const statMap = {
      totalClicks:    stats.totalClicks    ?? totalClicksRef.current,
      totalKills:     stats.totalKills     ?? totalKillsRef.current,
      totalGoldEarned:stats.totalGoldEarned?? totalGoldEarnedRef.current,
      totalGoldSpent: stats.totalGoldSpent ?? totalGoldSpentRef.current,
      maxZone:        stats.maxZone        ?? maxZoneReachedRef.current,
      maxCombo:       stats.maxCombo       ?? maxComboReachedRef.current,
      totalRebirths:  stats.totalRebirths  ?? rebirthCountRef.current,
    };
    for (const ach of ACHIEVEMENTS) {
      if (unlockedAchievementsRef.current.includes(ach.id)) continue;
      if (statMap[ach.stat] >= ach.threshold) {
        unlockedAchievementsRef.current = [...unlockedAchievementsRef.current, ach.id];
        setUnlockedAchievements(prev => [...prev, ach.id]);
        setAchievementToast(ach);
        setTimeout(() => setAchievementToast(null), 4000);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── load save + offline earnings ──────────────────────────────────────────
  useEffect(() => {
    async function loadSave() {
      try {
        const result = await window.storage.get('crusade_save');
        if (!result) return;
        const sv = JSON.parse(result.value);
        if (sv.gold           != null) setGold(sv.gold);
        if (sv.heroLevels)             setHeroLevels(sv.heroLevels);
        if (sv.companionLevels)        setCompanionLevels(sv.companionLevels);
        else if (sv.hasAdventurer)     setCompanionLevels({ dusk: 1 }); // migrate old save
        if (sv.boughtUpgrades)         setBoughtUpgrades(sv.boughtUpgrades);
        if (sv.clickDmg       != null) setClickDmg(sv.clickDmg);
        if (sv.killCount      != null) setKillCount(sv.killCount);
        if (sv.rebirthCount   != null) setRebirthCount(sv.rebirthCount);
        if (sv.zone           != null) {
          setZone(sv.zone);
          zoneRef.current = sv.zone;
          spawnEnemy(sv.zone);
        }
        if (sv.seenChronicles)         setSeenChronicles(sv.seenChronicles);
        if (sv.seenStoryZones)        setSeenStoryZones(sv.seenStoryZones);
        if (sv.soulCrystals    != null) setSoulCrystals(sv.soulCrystals);
        if (sv.artifactOwned)          setArtifactOwned(sv.artifactOwned);
        if (sv.lootItems)              setLootItems(sv.lootItems);
        if (sv.voidDust        != null) setVoidDust(sv.voidDust);
        if (sv.commanderPath)          setCommanderPath(sv.commanderPath);
        if (sv.farmMode != null)       setFarmMode(sv.farmMode);
        // Achievement stats
        if (sv.unlockedAchievements)   setUnlockedAchievements(sv.unlockedAchievements);
        if (sv.totalClicks    != null) setTotalClicks(sv.totalClicks);
        if (sv.totalKills     != null) setTotalKills(sv.totalKills);
        if (sv.totalGoldEarned!= null) setTotalGoldEarned(sv.totalGoldEarned);
        if (sv.totalGoldSpent != null) setTotalGoldSpent(sv.totalGoldSpent);
        if (sv.maxZoneReached != null) setMaxZoneReached(sv.maxZoneReached);
        if (sv.maxComboReached!= null) setMaxComboReached(sv.maxComboReached);
        saveLoadedRef.current = true;
        if (sv.lastSeen && sv.savedDps > 0) {
          const elapsed = Math.min((Date.now() - sv.lastSeen) / 1000, 4 * 3600);
          if (elapsed >= 60) {
            const earned = Math.floor(sv.savedDps * elapsed);
            setGold(g => g + earned);
            setOfflineModal({ gold: earned, seconds: Math.floor(elapsed) });
          }
        }
      } catch (_) { /* fresh start */ }
    }
    loadSave();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── save state on hide ────────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => {
      if (!document.hidden) return;
      window.storage.set('crusade_save', JSON.stringify({
        gold:           goldRef.current,
        heroLevels:     heroLevelsRef.current,
        companionLevels:companionLevelsRef.current,
        boughtUpgrades: boughtUpgradesRef.current,
        clickDmg:       clickDmgRef.current,
        zone:           zoneRef.current,
        killCount:      killCountRef.current,
        rebirthCount:   rebirthCountRef.current,
        seenChronicles: seenChroniclesRef.current,
        soulCrystals:   soulCrystalsRef.current,
        artifactOwned:  artifactOwnedRef.current,
        lootItems:      lootItemsRef.current,
        voidDust:       voidDustRef.current,
        commanderPath:  commanderPathRef.current,
        farmMode:       farmModeRef.current,
        savedDps:       idleDpsRef.current,
        lastSeen:       Date.now(),
        seenStoryZones: seenStoryZonesRef.current,
        // Achievement stats (lifetime, survive rebirth)
        unlockedAchievements: unlockedAchievementsRef.current,
        totalClicks:          totalClicksRef.current,
        totalKills:           totalKillsRef.current,
        totalGoldEarned:      totalGoldEarnedRef.current,
        totalGoldSpent:       totalGoldSpentRef.current,
        maxZoneReached:       maxZoneReachedRef.current,
        maxComboReached:      maxComboReachedRef.current,
      })).catch(() => {});

    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []);

  // ── deal damage ───────────────────────────────────────────────────────────
  const dealDamage = useCallback((amount) => {
    setEnemyHp((prev) => {
      const next = prev - amount;
      if (next <= 0) {
        const reward = Math.floor(
          enemyRef.current.goldReward *
            goldMultRef.current *
            rebirthMultRef.current *
            artGoldMultRef.current
        );
        setGold((g) => g + reward);
        // Track lifetime gold earned
        const newGoldEarned = totalGoldEarnedRef.current + reward;
        setTotalGoldEarned(newGoldEarned);

        // Clear boss timer — player beat the boss in time
        setBossTimerEnd(null);

        // Farm mode: respawn same enemy, freeze zone progress, skip chest drops
        if (farmModeRef.current) {
          // Still track the kill
          const fmKills = totalKillsRef.current + 1;
          setTotalKills(fmKills);
          checkAchievements({ totalKills: fmKills, totalGoldEarned: newGoldEarned });
          spawnEnemy(zoneRef.current);
          return 0;
        }

        setKillCount((k) => {
          const newK = k + 1;
          // Track lifetime kills
          const newTotalKills = totalKillsRef.current + 1;
          setTotalKills(newTotalKills);
          const isBossKill = newK % 10 === 0; // every 10th kill advances zone

          if (isBossKill) {
            const nz = zoneRef.current + 1;
            setZone(nz);
            zoneRef.current = nz;
            spawnEnemy(nz);
            // Track max zone
            const newMaxZone = Math.max(maxZoneReachedRef.current, nz);
            if (newMaxZone > maxZoneReachedRef.current) setMaxZoneReached(newMaxZone);
            checkAchievements({ totalKills: newTotalKills, totalGoldEarned: newGoldEarned, maxZone: newMaxZone });

            // Chest drop system:
            // - 10% chance to get a chest on boss milestone kills
            // - chest contains: (a) hero unlock from acquisition.kind === "chest" or (b) loot items
            if (Math.random() < 0.1) {
              // pick chest type based on zone/enemy flavor; kept simple for now
              const chestZone = zoneRef.current;

              // decide hero vs loot
              const chestHeroes = HEROES.filter(h => h.acquisition?.kind === "chest");
              const willDropHero = chestHeroes.length > 0 && Math.random() < Math.min(0.35, 0.12 + chestZone * 0.002);

              if (willDropHero) {
                const hero = chestHeroes[Math.floor(Math.random() * chestHeroes.length)];
                setLootModal({
                  // reuse lootModal renderer by storing a special kind payload
                  chest: true,
                  chestKind: "hero",
                  heroId: hero.id,
                  zone: chestZone,
                  // keep compatibility with existing modal UI
                  emoji: hero.emoji,
                  name: `Chest Unsealed · ${hero.name}`,
                  label: "Hero Unlock",
                  bonus: 0,
                });
              } else {
                const itemCount = 1 + (Math.random() < 0.25 ? 1 : 0);
                // store as chest+items; we will render an opening modal and then add items/loot
                setLootModal({
                  chest: true,
                  chestKind: "loot",
                  zone: chestZone,
                  emoji: "🎁",
                  name: `Chest Unsealed · Zone ${chestZone}`,
                  label: "Loot",
                  bonus: 0,
                  items: Array.from({ length: itemCount }, () => rollLootItem(chestZone)),
                });
              }
            }
          } else {
            checkAchievements({ totalKills: newTotalKills, totalGoldEarned: newGoldEarned });
            spawnEnemy(zoneRef.current);
          }
          return newK;
        });

        return 0;
      }

      // hit flash
      setEnemyHitNonce((n) => n + 1);

      return next;
    });
  }, [spawnEnemy]);

  // ── click handler ─────────────────────────────────────────────────────────
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = floatId.current++;
    // Drive combo counter (cap at 30 — max tier)
    lastClickTimeRef.current = Date.now();
    const newCombo = Math.min(30, comboCount + 1);
    setComboCount(newCombo);
    // Track lifetime clicks
    const newClicks = totalClicksRef.current + 1;
    setTotalClicks(newClicks);
    // Track max combo
    const newMaxCombo = Math.max(maxComboReachedRef.current, newCombo);
    if (newMaxCombo > maxComboReachedRef.current) setMaxComboReached(newMaxCombo);
    checkAchievements({ totalClicks: newClicks, maxCombo: newMaxCombo });
    // Float color: berserk > high-combo gold > mid-combo blue > base red
    const floatColor = isBerserk ? "#ff8800" : comboMult >= 4 ? "#f5c518" : comboMult >= 2 ? "#4488ff" : "#ff4444";
    setFloats(f => [...f, { id, x, y, value: comboDmg, color: floatColor }]);
    setTimeout(() => setFloats(f => f.filter(fl => fl.id !== id)), 900);
    setShake(true);
    setTimeout(() => setShake(false), 150);
    dealDamage(comboDmg);
  };

  // ── idle DPS tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (idleDpsRef.current > 0) dealDamage(idleDpsRef.current / 10);
    }, 100);
    return () => clearInterval(t);
  }, [dealDamage]);

  // ── companion tick (every 500ms) ──────────────────────────────────────────
  const companionLevelsRefForTick = useRef(companionLevels);
  companionLevelsRefForTick.current = companionLevels;

  useEffect(() => {
    const t = setInterval(() => {
      const dmg = computeCompanionTickDmg(companionLevelsRefForTick.current, artSynergyRef.current, effectiveDmgRef.current) * rebirthMultRef.current * pathDpsMultRef.current;
      if (dmg > 0) dealDamage(dmg);
    }, 500);
    return () => clearInterval(t);
  }, [dealDamage]);

  // ── weak point spawner — every 2.5s, up to 2/3 active hotspots ──────────
  useEffect(() => {
    const t = setInterval(() => {
      setWeakPoints(prev => {
        if (prev.length >= maxWpRef.current) return prev;
        const id = wpIdRef.current++;
        const x = 12 + Math.random() * 76;
        const y = 12 + Math.random() * 55;
        setTimeout(() => setWeakPoints(p => p.filter(w => w.id !== id)), 1500);
        return [...prev, { id, x, y }];
      });
    }, 2500);
    return () => clearInterval(t);
  }, []);

  // ── combo decay — every 150ms, drain combo if player stopped tapping ──────
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - lastClickTimeRef.current > 800) {
        setComboCount(c => (c > 0 ? Math.max(0, c - 3) : 0));
      }
    }, 150);
    return () => clearInterval(t);
  }, []);

  // ── companion ability auto-fire tick (every 500ms) ────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      let anyFired = false;
      const newState = { ...compAbilityStateRef.current };

      for (const ab of COMPANION_ABILITIES) {
        const level = companionLevelsRef.current[ab.compId] || 0;
        if (level < 1) continue; // companion not hired
        const tier = getCompAbilityTier(ab, level);
        if (!tier) continue;

        const st = newState[ab.id];
        // Skip if still on cooldown or still active
        if (now < st.cdUntil) continue;

        anyFired = true;
        const dur = tier.effect.dur || 0;
        newState[ab.id] = { activeUntil: now + dur, cdUntil: now + tier.cooldown };

        // Apply burst damage immediately
        if (tier.effect.burstDmgPct) {
          const burstDmg = enemyRef.current.maxHp * tier.effect.burstDmgPct;
          dealDamage(burstDmg);
        }
      }

      if (anyFired) {
        setCompAbilityState(newState);

        // Recompute active buffs from all currently-active companion abilities
        let clickMult = 1, dpsMult = 1, goldMult = 1;
        for (const ab of COMPANION_ABILITIES) {
          const st = newState[ab.id];
          if (now >= st.activeUntil) continue;
          const level = companionLevelsRef.current[ab.compId] || 0;
          const tier = getCompAbilityTier(ab, level);
          if (!tier) continue;
          if (tier.effect.clickBuff) clickMult *= tier.effect.clickBuff;
          if (tier.effect.dpsBuff)   dpsMult   *= (1 + tier.effect.dpsBuff);
          if (tier.effect.goldBuff)  goldMult  *= tier.effect.goldBuff;
        }
        setCompBuffs({ clickMult, dpsMult, goldMult });
      }
    }, 500);
    return () => clearInterval(t);
  }, [dealDamage]);

  // ── companion buff expiry watcher (every 200ms via now tick) ──────────────
  useEffect(() => {
    let clickMult = 1, dpsMult = 1, goldMult = 1;
    for (const ab of COMPANION_ABILITIES) {
      const st = compAbilityState[ab.id];
      if (!st || now >= st.activeUntil) continue;
      const level = companionLevels[ab.compId] || 0;
      const tier = getCompAbilityTier(ab, level);
      if (!tier) continue;
      if (tier.effect.clickBuff) clickMult *= tier.effect.clickBuff;
      if (tier.effect.dpsBuff)   dpsMult   *= (1 + tier.effect.dpsBuff);
      if (tier.effect.goldBuff)  goldMult  *= tier.effect.goldBuff;
    }
    const prev = compBuffsRef.current;
    if (prev.clickMult !== clickMult || prev.dpsMult !== dpsMult || prev.goldMult !== goldMult) {
      setCompBuffs({ clickMult, dpsMult, goldMult });
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── chronicle trigger — fires once per threshold, skips on initial save-load ──
  useEffect(() => {
    if (!saveLoadedRef.current) return; // suppress on restore
    const entry = CHRONICLES.find(c => c.zone === zone);
    if (!entry) return;
    if (seenChroniclesRef.current.includes(zone)) return;
    setSeenChronicles((prev) => [...prev, zone]);
    setActiveChronicle(entry);
  }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── story popup trigger — based on STORY_EVENTS, once per zone ──
  useEffect(() => {
    if (!saveLoadedRef.current) return;
    const ev = STORY_EVENTS.find((e) => e.zone === zone);
    if (!ev) return;
    if (seenStoryZonesRef.current.includes(zone)) return;
    setSeenStoryZones((prev) => {
      const next = [...prev, zone];
      seenStoryZonesRef.current = next;
      return next;
    });
    setStoryPopup(ev);
  }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── boss stage timer — start 30s countdown on every 5th zone (auto-advance only) ──
  useEffect(() => {
    if (!saveLoadedRef.current) return;
    if (!BOSSES.some(b => b.zone === zone)) { setBossTimerEnd(null); return; } // not a boss zone — clear any timer
    if (farmMode)        { setBossTimerEnd(null); return; } // farm mode — no DPS check
    setBossTimerEnd(Date.now() + 30000);
  }, [zone, farmMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── boss timer expiry — kick back to previous zone in farm mode ──
  useEffect(() => {
    if (bossTimerEnd === null) return;
    if (now < bossTimerEnd)   return;
    // Timer ran out — push back
    const prevZone = Math.max(1, zone - 1);
    setBossTimerEnd(null);
    setZone(prevZone);
    zoneRef.current = prevZone;
    spawnEnemy(prevZone);
    setFarmMode(true);
    setBossFailToast({ prevZone });
    setTimeout(() => setBossFailToast(null), 2500);
  }, [now, bossTimerEnd, zone, spawnEnemy]);


  // ── buy hero ──────────────────────────────────────────────────────────────
  const buyHero = (hero, count = 1, totalCost = null) => {
    const level = heroLevels[hero.id] || 0;
    const achDiscount = computeAchievementBonuses(unlockedAchievements).upgradeCostReduce;
    const cost = totalCost ?? Math.max(1, Math.floor(heroCost(hero, level) * (1 - achDiscount)));
    if (count < 1 || gold < cost) return;

    const acquisitionKind = hero.acquisition?.kind || "shop";

    // Chest / real-money heroes cannot be bought via gold.
    if (level === 0 && (acquisitionKind === "chest" || acquisitionKind === "realmoney")) return;

    setGold(g => g - cost);
    const newSpent = totalGoldSpentRef.current + cost;
    setTotalGoldSpent(newSpent);
    checkAchievements({ totalGoldSpent: newSpent });

    const newLevel = level + count;
    setHeroLevels(prev => ({ ...prev, [hero.id]: newLevel }));

    // Check for milestone crossing (any milestone between old and new level)
    const crossedMs = HERO_MILESTONES.filter(m => m.level > level && m.level <= newLevel);
    if (crossedMs.length > 0) {
      const ms = crossedMs[crossedMs.length - 1];
      setMilestoneToast({ hero, level: newLevel, mult: ms.label });
      setTimeout(() => setMilestoneToast(null), 3000);
    }
  };

  // ── buy companion (bulk-aware) ─────────────────────────────────────────────
  const buyCompanion = (comp, count = 1, totalCost = null) => {
    const level = companionLevels[comp.id] || 0;
    const cost  = totalCost ?? companionCost(comp, level);
    if (count < 1 || gold < cost) return;
    setGold(g => g - cost);
    const newSpentC = totalGoldSpentRef.current + cost;
    setTotalGoldSpent(newSpentC);
    checkAchievements({ totalGoldSpent: newSpentC });
    setCompanionLevels(prev => ({ ...prev, [comp.id]: (prev[comp.id] || 0) + count }));
  };

  // ── buy upgrade ───────────────────────────────────────────────────────────
  const buyUpgrade = (upg) => {
    if (gold < upg.cost || boughtUpgrades.includes(upg.id)) return;
    setGold(g => g - upg.cost);
    const newSpentU = totalGoldSpentRef.current + upg.cost;
    setTotalGoldSpent(newSpentU);
    checkAchievements({ totalGoldSpent: newSpentU });
    setBoughtUpgrades(prev => [...prev, upg.id]);
    if (upg.type === "click") setClickDmg(d => d + upg.value);
  };

  // ── use ability ───────────────────────────────────────────────────────────
  const useAbility = (ab) => {
    const state = abilityState[ab.id];
    if (now < state.cdUntil) return;
    const t = Date.now();
    let reducedCd = Math.floor(ab.cooldown * (1 - cdReduction));
    if (commanderPath === "vanguard" && ab.id === "berserk") reducedCd = Math.floor(reducedCd * 0.5);
    let duration = ab.duration;
    if (commanderPath === "void_mage") duration += 5000;
    setAbilityState(prev => ({ ...prev, [ab.id]: { activeUntil: t + duration, cdUntil: t + reducedCd } }));
  };

  // ── buy artifact upgrade ──────────────────────────────────────────────────
  const buyArtifact = (art) => {
    if (soulCrystals < art.cost || artifactOwned.includes(art.id)) return;
    setSoulCrystals(c => c - art.cost);
    setArtifactOwned(prev => [...prev, art.id]);
  };

  // ── equip / unequip loot ──────────────────────────────────────────────────
  const toggleEquip = (itemId) => {
    setLootItems(prev => prev.map(it => it.id === itemId ? { ...it, equipped: !it.equipped } : it));
  };

  // ── claim loot from modal ─────────────────────────────────────────────────
  // Placeholder ad flow (Google AdMob rewarded video):
  // later you can replace this function with your actual rewarded-ad SDK.
  const watchAd = async () => {
    // eslint-disable-next-line no-unused-vars
    const _ = true;
    // Return true to allow chest opening.
    return true;
  };

  const claimLoot = () => {
    if (!lootModal) return;

    // Chest hero unlock
    if (lootModal.chest && lootModal.chestKind === "hero") {
      const heroId = lootModal.heroId;
      const hero = HEROES.find(h => h.id === heroId);
      if (!hero) {
        setLootModal(null);
        return;
      }
      // If already unlocked, convert to loot as consolation
      setHeroLevels(prev => {
        const current = prev[heroId] || 0;
        if (current > 0) return prev;
        return { ...prev, [heroId]: 1 };
      });
      setLootModal(null);
      return;
    }

    // Chest loot
    if (lootModal.chest && lootModal.chestKind === "loot") {
      const items = (lootModal.items || []).map(it => ({ ...it, equipped: true }));
      setLootItems(prev => [...prev, ...items]);
      setLootModal(null);
      return;
    }

    // Normal single loot item (legacy behavior)
    setLootItems(prev => [...prev, { ...lootModal, equipped: true }]);
    setLootModal(null);
  };

  // ── scrap item → earn Void Dust ───────────────────────────────────────────
  const scrapItem = (itemId) => {
    setLootItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const dust = Math.max(1, Math.floor(item.bonus / 5));
      setVoidDust(d => d + dust);
      return prev.filter(i => i.id !== itemId);
    });
  };

  // ── reforge item → spend Void Dust for +bonus% ────────────────────────────
  const reforgeItem = (itemId, amount, cost) => {
    if (voidDust < cost) return;
    setVoidDust(d => d - cost);
    setLootItems(prev => prev.map(i => i.id === itemId ? { ...i, bonus: i.bonus + amount } : i));
  };

  // ── weak point crit click ─────────────────────────────────────────────────
  const handleWeakPointClick = (e, wp) => {
    e.stopPropagation();
    const critMult = commanderPath === "void_mage" ? 4 : 3;
    const critDmg = effectiveDmg * critMult;
    const rect = e.currentTarget.closest('[data-enemycard]').getBoundingClientRect();
    const cx = (wp.x / 100) * rect.width;
    const cy = (wp.y / 100) * rect.height;
    const id = floatId.current++;
    setFloats(f => [...f, { id, x: cx, y: cy, value: critDmg, color: "#ffcc00", crit: true }]);
    setTimeout(() => setFloats(f => f.filter(fl => fl.id !== id)), 1000);
    setWeakPoints(p => p.filter(w => w.id !== wp.id));
    dealDamage(critDmg);
  };

  // ── rebirth ───────────────────────────────────────────────────────────────
  const doRebirth = () => {
    const newRebirthCount = rebirthCount + 1;
    setRebirthCount(newRebirthCount);
    checkAchievements({ totalRebirths: newRebirthCount });
    setSoulCrystals(c => c + 1);
    setGold(0);
    setHeroLevels({});
    setCompanionLevels({});
    setBoughtUpgrades([]);
    setClickDmg(1);
    setKillCount(0);
    setZone(1);
    zoneRef.current = 1;
    spawnEnemy(1);
    setCommanderPath(null);
    setRebirthConfirm(false);
    setPathChoiceModal(true); // choose new path for this lifetime
  };

  const chooseCommanderPath = (pathId) => {
    setCommanderPath(pathId);
    setPathChoiceModal(false);
  };

  const hpPct = Math.max(0, (enemyHp / currentEnemy.maxHp) * 100);
  const companionDps = computeCompanionTickDmg(companionLevels, artBonuses.synergyPct, effectiveDmg) * 2 * rebirthMult * pathDpsMult;
  const activePath      = COMMANDER_PATHS.find(p => p.id === commanderPath) || null;
  const isBossZone      = BOSSES.some(b => b.zone === zone);
  const bossTimeLeft    = bossTimerEnd !== null ? Math.max(0, Math.ceil((bossTimerEnd - now) / 1000)) : null;
  const bossTimePct     = bossTimerEnd !== null ? Math.max(0, ((bossTimerEnd - now) / 30000) * 100) : 0;
  const bossTimerDanger = bossTimeLeft !== null && bossTimeLeft <= 10;
  const comboMult       = getComboMult(comboCount);
  const comboColor      = getComboColor(comboCount);
  const comboDmg        = effectiveDmg * comboMult; // actual click damage with combo
  const comboPct        = Math.min(100, (comboCount / 30) * 100);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{css}</style>

      {/* HEADER */}
      <header style={S.header}>
        <div>
          <div style={S.logo}>⚔ IDLE CRUSADE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={S.subtitle}>Eclipse Year III · Zone {zone}</span>
            {activePath && (
              <span style={{ fontSize: 9, fontWeight: "bold", letterSpacing: 1, padding: "1px 6px", borderRadius: 4, border: `1px solid ${activePath.color}88`, background: activePath.color + "22", color: activePath.color }}>
                {activePath.emoji} {activePath.name.replace("The ", "")}
              </span>
            )}
          </div>
        </div>
        <div style={S.goldPill}>🪙 <span style={S.goldNum}>{fmt(gold)}</span></div>
      </header>

      {/* ABILITY BARS — ultra-compact strip */}
      <div style={{ background: "#0a0908", borderBottom: "1px solid #1e1810", flexShrink: 0, padding: "2px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Player abilities row */}
        <div style={{ display: "flex", gap: 4 }}>
          {ABILITIES.map(ab => {
            const st     = abilityState[ab.id];
            const active = now < st.activeUntil;
            const onCd   = now < st.cdUntil && !active;
            const cdSec  = onCd   ? Math.ceil((st.cdUntil - now) / 1000) : 0;
            const actSec = active ? Math.ceil((st.activeUntil - now) / 1000) : 0;
            return (
              <button key={ab.id}
                style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 3,
                  padding: "2px 6px", borderRadius: 5,
                  border: `1px solid ${active ? ab.color : onCd ? "#2a2010" : ab.color + "66"}`,
                  background: active ? ab.color + "22" : "#110d08",
                  opacity: onCd ? 0.5 : 1, cursor: onCd ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
                onClick={() => useAbility(ab)} disabled={onCd}
              >
                <span style={{ fontSize: 11 }}>{ab.emoji}</span>
                <span style={{ fontSize: 8, fontWeight: "bold", color: active ? ab.color : "#c8b89a", flex: 1, textAlign: "left" }}>{ab.name}</span>
                <span style={{ fontSize: 8, color: active ? ab.color : onCd ? "#5a4a2a" : "#6a8a4a", fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {active ? `${actSec}s` : onCd ? `${cdSec}s` : ab.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Companion abilities row — only if any companion hired */}
        {COMPANION_ABILITIES.some(ab => (companionLevels[ab.compId] || 0) >= 1) && (() => {
          const hired = COMPANION_ABILITIES.filter(ab => (companionLevels[ab.compId] || 0) >= 1);
          return (
            <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 1 }}>
              {hired.map(ab => {
                const level  = companionLevels[ab.compId] || 0;
                const tier   = getCompAbilityTier(ab, level);
                const st     = compAbilityState[ab.id];
                const active = now < st.activeUntil;
                const onCd   = now < st.cdUntil && !active;
                const cdSec  = onCd   ? Math.ceil((st.cdUntil - now) / 1000) : 0;
                const actSec = active ? Math.ceil((st.activeUntil - now) / 1000) : 0;
                const cdPct  = onCd && tier ? Math.max(0, ((st.cdUntil - now) / tier.cooldown) * 100) : 0;
                return (
                  <div key={ab.id} style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 3,
                    padding: "1px 5px", borderRadius: 4, position: "relative",
                    border: `1px solid ${active ? ab.color : onCd ? "#2a2010" : ab.color + "44"}`,
                    background: active ? ab.color + "15" : "#0d0b08",
                    opacity: onCd ? 0.6 : 1, minWidth: 0,
                  }}>
                    <span style={{ fontSize: 10 }}>{ab.emoji}</span>
                    <span style={{ fontSize: 7, fontWeight: "bold", color: active ? ab.color : "#a89878", whiteSpace: "nowrap" }}>{ab.name}</span>
                    <span style={{ fontSize: 7, color: active ? ab.color : onCd ? "#5a4a2a" : "#44aa44", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {active ? `⚡${actSec}s` : onCd ? `${cdSec}s` : "▶"}
                    </span>
                    {onCd && tier && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#1e1810", borderRadius: "0 0 4px 4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${100 - cdPct}%`, background: ab.color, transition: "width 0.5s linear" }} />
                      </div>
                    )}
                    <span style={{ fontSize: 5, color: "#3a2a1a", position: "absolute", top: 1, right: 2 }}>AUTO</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* CONTENT */}
      <div style={S.content}>

        {/* ACHIEVEMENT TOAST */}
        {achievementToast && (
          <div style={{
            position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
            zIndex: 200, minWidth: 280, maxWidth: 340,
            background: "linear-gradient(135deg,#1a0e2a,#0d1a1a)",
            border: "2px solid #7a40cc",
            borderRadius: 14, padding: "14px 18px",
            boxShadow: "0 0 40px #7a40cc55",
            animation: "achieveSlide 0.3s ease",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 32, flexShrink: 0 }}>{achievementToast.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#a060ee", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Achievement Unlocked</div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "#e0c8ff", marginBottom: 3 }}>{achievementToast.name}</div>
              <div style={{ fontSize: 11, color: "#44cc88", fontWeight: "bold" }}>{achievementToast.rewardText}</div>
              <div style={{ fontSize: 10, color: "#6a5a7a", fontStyle: "italic", marginTop: 2 }}>{achievementToast.flavor}</div>
            </div>
          </div>
        )}

        {/* STORY POPUP — only when no chronicle is blocking */}
        {storyPopup && !activeChronicle && (
          <div
            style={{
              background: "#18140f",
              border: "2px solid #a855f7",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "16px",
              width: "100%",
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
              boxShadow: "0 0 30px #a855f722",
            }}
          >
            <div style={{ color: "#fbbf24", fontWeight: "bold", marginBottom: "8px" }}>
              {storyPopup.speaker}
            </div>
            <div style={{ color: "#e5e7eb" }}>{storyPopup.text}</div>
            <button
              onClick={() => setStoryPopup(null)}
              style={{
                marginTop: "12px",
                background: "#a855f7",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ── BATTLE ── */}
        {tab === "battle" && (
          <div style={S.battleView}>

            <div
              data-enemycard
              style={{
                ...S.enemyCard,
                backgroundImage: `url(${currentWorld.bg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              onClick={handleClick}
              className={shake ? "shake" : ""}
            >
              {currentBoss ? (
                <>
                  <div style={{ fontSize: 10, color: "#44cc88", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                    BOSS FIGHT
                  </div>
                  <img
                    key={currentBoss.image}
                    src={currentBoss.image}
                    alt={currentBoss.name}
                    className={`enemy-sprite ${currentBoss.zone === 10 ? "dragonHover" : "float"}`}
                    style={{ marginBottom: 8 }}
                    onError={(e) => { e.currentTarget.hidden = true; const fb = e.currentTarget.nextSibling; if (fb) fb.hidden = false; }}
                  />
                  <div hidden className="enemy-idle" style={{ ...S.enemyEmoji, marginBottom: 8 }}>👑</div>
                  <div style={S.enemyName}>{currentBoss.name}</div>
                </>
              ) : (
                <>
                  <img
                    src={currentEnemy.image}
                    alt={currentEnemy.name}
                    key={enemyHitNonce}
                    className={`enemy-sprite ${currentEnemy.idleAnim || "float"}${enemyHitNonce > 0 ? " enemy-hit" : ""}`}
                    style={{ marginBottom: 8 }}
                    onError={(e) => { e.currentTarget.hidden = true; const fb = e.currentTarget.nextSibling; if (fb) fb.hidden = false; }}
                  />
                  <div hidden className="enemy-idle" style={{ ...S.enemyEmoji, marginBottom: 8 }}>{currentEnemy.emoji}</div>
                  <div style={S.enemyName}>{currentEnemy.name}</div>
                </>
              )}

              <div style={S.hpBar}><div style={{ ...S.hpFill, width: `${hpPct}%` }} /></div>
              <div style={S.hpText}>{fmt(enemyHp)} / {fmt(currentEnemy.maxHp)}</div>
              {(isBerserk || isBattleCry || isGoldRush) && (
                <div style={S.activeBadges}>
                  {isBerserk   && <span style={{ ...S.badge, background: "#cc220033", color: "#ff6644" }}>💢 BERSERK</span>}
                  {isBattleCry && <span style={{ ...S.badge, background: "#f5c51833", color: "#f5c518" }}>📯 BATTLE CRY</span>}
                  {isGoldRush  && <span style={{ ...S.badge, background: "#44cc8833", color: "#44cc88" }}>✨ GOLD RUSH</span>}
                </div>
              )}
              <div style={S.tapHint}>
                Tap to attack · {fmt(comboDmg)} dmg{comboMult > 1 ? ` · ×${comboMult} combo` : ""}
              </div>


              {/* Weak point hotspots */}
              {weakPoints.map(wp => (
                <div
                  key={wp.id}
                  className="weak-point"
                  style={{ position: "absolute", left: `${wp.x}%`, top: `${wp.y}%`, transform: "translate(-50%,-50%)", width: 34, height: 34, borderRadius: "50%", background: "#ff220066", border: "2px solid #ff6600", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 12px #ff440088" }}
                  onClick={(e) => handleWeakPointClick(e, wp)}
                >
                  💥
                </div>
              ))}

              {/* Damage floats */}
              {floats.map(f => (
                <div key={f.id} className="float-dmg" style={{ left: f.x, top: f.y, color: f.color, fontSize: f.crit ? 22 : 18 }}>
                  {f.crit ? `⚡ CRIT -${fmt(f.value)}` : `-${fmt(f.value)}`}
                </div>
              ))}
            </div>

            <div style={S.rewardRow}>
              <span style={S.dim}>🪙 {fmt(currentEnemy.goldReward)}{isGoldRush ? " ×2" : ""}</span>
              <span style={S.dim}>⚡ {fmt(idleDps + companionDps)} DPS</span>
            </div>

            {/* Active companion ability badges */}
            {COMPANION_ABILITIES.some(ab => now < compAbilityState[ab.id].activeUntil) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, width: "100%", justifyContent: "center" }}>
                {COMPANION_ABILITIES.filter(ab => now < compAbilityState[ab.id].activeUntil).map(ab => {
                  const level = companionLevels[ab.compId] || 0;
                  const tier  = getCompAbilityTier(ab, level);
                  const secLeft = Math.ceil((compAbilityState[ab.id].activeUntil - now) / 1000);
                  return (
                    <span key={ab.id} style={{ fontSize: 10, fontWeight: "bold", padding: "2px 7px", borderRadius: 5, background: ab.color + "22", border: `1px solid ${ab.color}66`, color: ab.color }}>
                      {ab.emoji} {ab.name} {secLeft}s
                    </span>
                  );
                })}
              </div>
            )}

            {/* ── COMBO METER ── */}
            <div style={S.comboWrap}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: comboCount > 0 ? comboColor : "#3a2a1a", fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase", transition: "color 0.2s" }}>
                  ⚡ Click Combo
                </span>
                <span style={{ fontSize: 13, fontWeight: "bold", color: comboCount > 0 ? comboColor : "#3a2a1a", transition: "color 0.2s", fontVariantNumeric: "tabular-nums" }}>
                  {comboCount > 0
                    ? (comboMult > 1 ? `×${comboMult} · ${comboCount} hits` : `${comboCount} hits`)
                    : "tap rapidly to build"}
                </span>
              </div>
              <div style={S.comboBarTrack}>
                <div style={{
                  ...S.comboBarFill,
                  width: `${comboPct}%`,
                  background: comboCount === 0
                    ? "#1e1810"
                    : `linear-gradient(90deg, ${comboColor}88, ${comboColor})`,
                  boxShadow: comboCount >= 12 ? `0 0 8px ${comboColor}88` : "none",
                }} />
                {/* tier notches at 3 / 6 / 12 / 20 / 30 hits */}
                {[3, 6, 12, 20].map(n => (
                  <div key={n} style={{
                    position: "absolute",
                    left: `${(n / 30) * 100}%`,
                    top: 0, bottom: 0,
                    width: 1,
                    background: "#0d0b0a",
                    opacity: 0.6,
                  }} />
                ))}
              </div>
              {/* Tier labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                {[
                  { hits: 3,  label: "×1.5" },
                  { hits: 6,  label: "×2" },
                  { hits: 12, label: "×3" },
                  { hits: 20, label: "×4" },
                  { hits: 30, label: "×5" },
                ].map(tier => (
                  <span key={tier.hits} style={{
                    fontSize: 9,
                    color: comboCount >= tier.hits ? comboColor : "#3a2a1a",
                    fontWeight: "bold",
                    transition: "color 0.2s",
                    letterSpacing: 0.5,
                  }}>{tier.label}</span>
                ))}
              </div>
            </div>

            {/* Boss Stage Timer */}
            {bossTimerEnd !== null && (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: "bold", color: bossTimerDanger ? "#ff4444" : "#f5c518", letterSpacing: 1 }}>
                    {bossTimerDanger ? "⚠️ BOSS CHALLENGE" : "⚔️ BOSS CHALLENGE"}
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: "bold",
                    color: bossTimerDanger ? "#ff4444" : "#f5c518",
                    fontVariantNumeric: "tabular-nums",
                    ...(bossTimerDanger ? { animation: "timerPulse 0.6s ease-in-out infinite" } : {}),
                  }}>
                    {bossTimeLeft}s
                  </span>
                </div>
                <div style={S.bossTimerBar}>
                  <div style={{
                    ...S.bossTimerFill,
                    width: `${bossTimePct}%`,
                    background: bossTimerDanger
                      ? "linear-gradient(90deg,#8b0000,#ff2200)"
                      : "linear-gradient(90deg,#8a6010,#f5c518)",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "#4a3a2a", marginTop: 4, textAlign: "center" }}>
                  Defeat the boss or be pushed back to Zone {Math.max(1, zone - 1)}
                </div>
              </div>
            )}

            {/* Auto-Advance / Farm toggle */}
            <div style={S.modeToggleWrap}>
              <button
                style={{ ...S.modeBtn, ...(farmMode ? S.modeBtnOff : S.modeBtnOn) }}
                onClick={() => setFarmMode(false)}
              >
                ⚔️ Auto-Advance
              </button>
              <button
                style={{ ...S.modeBtn, ...(farmMode ? S.modeBtnOn : S.modeBtnOff) }}
                onClick={() => { setFarmMode(true); setBossTimerEnd(null); }}
              >
                🌾 Farm Zone
              </button>
            </div>

            {/* Zone progress */}
            <div style={S.zoneProgressWrap}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={S.dim}>Zone progress</span>
                {farmMode
                  ? <span style={{ ...S.dim, color: "#6a8a3a", fontWeight: "bold" }}>🌾 FARMING</span>
                  : <span style={S.dim}>{killCount % 10} / 10</span>
                }
              </div>
              <div style={S.zonePrgBar}>
                <div style={{
                  ...S.zonePrgFill,
                  width: farmMode ? "100%" : `${(killCount % 10) * 10}%`,
                  background: farmMode
                    ? "linear-gradient(90deg,#2a5a10,#4a8a20)"
                    : "linear-gradient(90deg,#3a7a20,#6acc30)",
                }} />
              </div>
            </div>

            {/* Region name — name only, no description */}
            {(() => {
              const r = getCurrentRegion(zone);
              return (
                <div style={{
                  ...S.regionHeader,
                  borderColor: r.accent + "66",
                  background: r.accent + "12",
                }}>
                  <span style={S.regionEmoji}>{r.emoji}</span>
                  <span style={{ ...S.regionName, color: r.accent }}>{r.name}</span>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── LORE ── */}
        {tab === "lore" && (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── WORLD MAP ── */}
            <div>
              <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                🗺 World Map
              </div>
              <div style={{ background: "#0a0808", border: "1px solid #2a2010", borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 6 }}>
                {REGIONS.map((r, idx) => {
                  const isCurrentRegion = zone >= r.minZone && zone <= r.maxZone;
                  const isUnlocked = maxZoneReached >= r.minZone;
                  const isLocked = !isUnlocked;
                  const prevRegion = REGIONS[idx - 1];
                  const canTravel = !isLocked && !isCurrentRegion;

                  // zone milestone nodes to show inside each region strip
                  const milestoneZones = [];
                  const start = r.minZone;
                  const end = Math.min(r.maxZone === 999 ? r.minZone + 29 : r.maxZone, r.minZone + 29);
                  for (let z = start; z <= end; z += Math.ceil((end - start + 1) / 5)) {
                    milestoneZones.push(z);
                  }

                  return (
                    <div key={r.name}>
                      {/* Connector line between regions */}
                      {idx > 0 && (
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                          <div style={{ width: 2, height: 12, background: isUnlocked ? "#3a2a10" : "#1a1810", borderRadius: 1 }} />
                        </div>
                      )}
                      <div style={{
                        border: `1px solid ${isCurrentRegion ? r.accent : isUnlocked ? r.accent + "44" : "#1e1810"}`,
                        borderRadius: 10,
                        background: isCurrentRegion ? r.accent + "18" : isUnlocked ? "#0d0b08" : "#090807",
                        padding: "8px 10px",
                        opacity: isLocked ? 0.45 : 1,
                        transition: "all 0.2s",
                      }}>
                        {/* Region header row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 16 }}>{isLocked ? "🔒" : r.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: "bold", color: isCurrentRegion ? r.accent : isUnlocked ? "#c8b888" : "#4a3a2a" }}>
                              {r.name}
                              {isCurrentRegion && <span style={{ marginLeft: 6, fontSize: 9, background: r.accent + "33", color: r.accent, border: `1px solid ${r.accent}66`, borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>HERE</span>}
                            </div>
                            <div style={{ fontSize: 9, color: "#5a4a2a", marginTop: 1 }}>
                              {isLocked ? `Locked · Reach Zone ${r.minZone}` : `Zones ${r.minZone}–${r.maxZone === 999 ? "∞" : r.maxZone}`}
                            </div>
                          </div>
                          {canTravel && (
                            <button
                              style={{ fontSize: 9, padding: "4px 8px", borderRadius: 5, border: `1px solid ${r.accent}88`, background: r.accent + "22", color: r.accent, cursor: "pointer", fontFamily: "inherit", fontWeight: "bold", whiteSpace: "nowrap" }}
                              onClick={() => {
                                const targetZone = r.minZone;
                                setZone(targetZone);
                                zoneRef.current = targetZone;
                                spawnEnemy(targetZone);
                                setKillCount(0);
                                setTab("battle");
                              }}
                            >
                              → Travel
                            </button>
                          )}
                        </div>

                        {/* Zone node track */}
                        {isUnlocked && (
                          <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 2 }}>
                            {Array.from({ length: Math.min(r.maxZone === 999 ? 20 : r.maxZone - r.minZone + 1, 20) }, (_, i) => {
                              const z = r.minZone + i;
                              const isHere = z === zone;
                              const visited = z <= maxZoneReached;
                              const isBoss = z % 5 === 0;
                              return (
                                <div key={z} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                                  {/* connector */}
                                  {i > 0 && (
                                    <div style={{ width: 8, height: 2, background: visited ? r.accent + "66" : "#1e1810", flexShrink: 0 }} />
                                  )}
                                  {/* node */}
                                  <div
                                    title={`Zone ${z}`}
                                    onClick={() => {
                                      if (!visited) return;
                                      setZone(z);
                                      zoneRef.current = z;
                                      spawnEnemy(z);
                                      setKillCount(0);
                                      setTab("battle");
                                    }}
                                    style={{
                                      width: isHere ? 16 : isBoss ? 12 : 9,
                                      height: isHere ? 16 : isBoss ? 12 : 9,
                                      borderRadius: "50%",
                                      background: isHere ? r.accent : visited ? (isBoss ? "#f5c518" : r.accent + "88") : "#1e1810",
                                      border: isHere ? `2px solid #fff8` : isBoss && visited ? "1px solid #f5c51888" : "none",
                                      cursor: visited ? "pointer" : "default",
                                      flexShrink: 0,
                                      boxShadow: isHere ? `0 0 8px ${r.accent}` : "none",
                                      transition: "all 0.15s",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 6,
                                    }}
                                  >
                                    {isBoss && visited && !isHere ? "★" : ""}
                                  </div>
                                </div>
                              );
                            })}
                            {r.maxZone === 999 && <div style={{ fontSize: 9, color: "#4a3a2a", marginLeft: 6 }}>…</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {(() => { const r = getCurrentRegion(zone); return (
              <div>
                <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                  ⚔ Environment
                </div>
                <div style={{ background: `linear-gradient(135deg,#0d0b0a,#100e0a)`, border: `1px solid ${r.accent}66`, borderRadius: 14, overflow: "hidden" }}>
                  {/* Header band */}
                  <div style={{ background: `linear-gradient(90deg,${r.accent}22,transparent)`, borderBottom: `1px solid ${r.accent}33`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 26 }}>{r.emoji}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: "bold", color: "#e8dcc8", letterSpacing: 0.5 }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: r.accent, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>Zones {r.minZone}–{r.maxZone === 999 ? "∞" : r.maxZone} · Currently Zone {zone}</div>
                    </div>
                  </div>
                  {/* Short tagline */}
                  <div style={{ padding: "10px 16px 0", fontSize: 12, color: "#a89870", fontStyle: "italic", lineHeight: 1.6 }}>
                    {r.desc}
                  </div>
                  {/* Long lore */}
                  <div style={{ padding: "10px 16px 16px", fontSize: 12, color: "#7a6a52", lineHeight: 1.75 }}>
                    {r.lore}
                  </div>
                </div>
              </div>
            ); })()}

            {/* ── CURRENT CHRONICLE ── */}
            <div>
              <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                📜 Chronicle
              </div>
              <div style={{ background: "#0a0808", border: "1px solid #2a1810", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#5a4a2a", letterSpacing: 1, marginBottom: 8 }}>Zone {currentLore.zone} — The Eternal Commander's Record</div>
                <div style={{ fontSize: 13, color: "#9a8a6a", fontStyle: "italic", lineHeight: 1.75 }}>"{currentLore.text}"</div>
              </div>
            </div>

            {/* ── CHRONICLE ARCHIVE ── */}
            {ZONE_LORE.filter(e => zone >= e.zone).length > 1 && (
              <div>
                <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                  🗂 Chronicle Archive
                </div>
                <div style={{ background: "#0a0808", border: "1px solid #1e1810", borderRadius: 12, padding: "14px 16px" }}>
                  {ZONE_LORE.filter(e => zone >= e.zone).slice().reverse().slice(1).map(entry => (
                    <div key={entry.zone} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #1a1410" }}>
                      <div style={{ fontSize: 10, color: "#4a3a22", letterSpacing: 1, marginBottom: 5 }}>Zone {entry.zone}</div>
                      <div style={{ fontSize: 11, color: "#5a4a32", fontStyle: "italic", lineHeight: 1.65 }}>"{entry.text}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── VOICES FROM THE ECLIPSE ── */}
            {seenStoryZones.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: "#8a4a9a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #2a1a3a" }}>
                  👁 Voices from the Eclipse
                </div>
                <div style={{ background: "#0a0808", border: "1px solid #2a1a3a", borderRadius: 12, padding: "14px 16px" }}>
                  {STORY_EVENTS.filter(e => seenStoryZones.includes(e.zone)).map(ev => (
                    <div key={ev.zone} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #1e1820" }}>
                      <div style={{ fontSize: 11, fontWeight: "bold", color: "#c0a0d0", marginBottom: 5 }}>{ev.speaker}</div>
                      <div style={{ fontSize: 12, color: "#8a7a9a", fontStyle: "italic", lineHeight: 1.65 }}>"{ev.text}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── COMPANION LORE ── */}
            <div>
              <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                🧭 Companion Lore
              </div>
              <div style={{ background: "#0a0808", border: "1px solid #1e1a10", borderRadius: 12, padding: "14px 16px" }}>
                {COMPANIONS.filter(c => (companionLevels[c.id] || 0) > 0).map(comp => {
                  const ab = COMPANION_ABILITIES.find(a => a.compId === comp.id);
                  return (
                    <div key={comp.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #1e1810" }}>
                      <div style={{ fontSize: 13, fontWeight: "bold", color: "#e8dcc8", marginBottom: 2 }}>{comp.emoji} {comp.name}</div>
                      <div style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 1, marginBottom: 7 }}>— {comp.title}</div>
                      <div style={{ fontSize: 12, color: "#6a5a42", fontStyle: "italic", lineHeight: 1.7, marginBottom: ab ? 8 : 0 }}>"{comp.lore}"</div>
                      {ab && <div style={{ fontSize: 10, color: ab.color + "cc", fontStyle: "italic", lineHeight: 1.5 }}>✦ {ab.origin}</div>}
                    </div>
                  );
                })}
                {COMPANIONS.every(c => (companionLevels[c.id] || 0) === 0) && (
                  <div style={{ fontSize: 11, color: "#4a3a2a", fontStyle: "italic" }}>Recruit companions to unlock their stories.</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── COMPANIONS ── */}
        {tab === "companions" && (
          <div style={S.shopView}>
            <div style={S.storyBanner}>
              <div style={S.storyTitle}>☀️ The Eternal Eclipse</div>
              <div style={S.storyBody}>
                The world has been plunged into an endless eclipse by the Lich King. Time itself is fractured. As the Eternal Commander, you rally fallen heroes through multiple lifetimes — each Rebirth a new dawn against the darkness.
              </div>
            </div>

            {/* ── Buy-mode toggle ── */}
            <div style={S.buyToggleWrap}>
              <span style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 1, flexShrink: 0 }}>BUY</span>
              {["x1", "x10", "x100", "max"].map(mode => (
                <button
                  key={mode}
                  style={{ ...S.buyToggleBtn, ...(buyMode === mode ? S.buyToggleBtnActive : {}) }}
                  onClick={() => setBuyMode(mode)}
                >
                  {mode === "max" ? "Max" : mode}
                </button>
              ))}
            </div>

            <div style={S.sectionLabel}>Your Companions</div>
            {COMPANIONS.map(comp => {
              const level = companionLevels[comp.id] || 0;
              const hired = level > 0;
              const dps   = hired
                ? (comp.baseDmg * level * (1000 / comp.interval) * rebirthMult * pathDpsMult).toFixed(1)
                : null;

              const bulk       = calcBulkCompanionBuy(comp, level, gold, buyMode);
              const canAfford  = bulk.count > 0;
              const baseAction = !hired ? "Recruit" : "Lvl Up";
              const countTag   = bulk.count > 1 ? ` ×${bulk.count}` : "";
              const btnLabel   = canAfford
                ? `${baseAction}${countTag} · 🪙${fmt(bulk.totalCost)}`
                : buyMode === "max"
                  ? "Not enough 🪙"
                  : `${baseAction} · 🪙${fmt(bulk.totalCost)}`; // show cost even when greyed

              return (
                <div key={comp.id} style={{ ...S.companionCard, borderColor: hired ? "#3a2d1a" : "#1e1810" }}>
                  <div style={S.companionTop}>
                    <span style={S.companionEmoji}>{comp.emoji}</span>
                    <div style={S.companionInfo}>
                      <div style={S.companionName}>
                        {comp.name}
                        {hired && <span style={S.lvlBadge}>Lv {level}</span>}
                      </div>
                      <div style={S.companionTitle}>{comp.title}</div>
                      {hired && <div style={S.companionDps}>⚡ {fmt(dps)} DPS</div>}
                      {(() => {
                        const ab = COMPANION_ABILITIES.find(a => a.compId === comp.id);
                        if (!ab) return null;
                        const tier = getCompAbilityTier(ab, level);
                        const nextTier = ab.tiers.find(t => t.minLevel > level);
                        const st = compAbilityState[ab.id];
                        const isActive = now < st.activeUntil;
                        const isOnCd = now < st.cdUntil && !isActive;
                        if (!tier) return (
                          <div style={{ fontSize: 10, color: "#4a3a5a", marginTop: 3 }}>
                            {ab.emoji} <span style={{ color: ab.color + "88" }}>{ab.name}</span> · Unlocks at Lv1
                          </div>
                        );
                        return (
                          <div style={{ fontSize: 10, marginTop: 3 }}>
                            <span style={{ color: ab.color }}>{ab.emoji} {ab.name}</span>
                            <span style={{ color: "#6a5a3a" }}> · {tier.desc}</span>
                            {isActive && <span style={{ color: ab.color, fontWeight: "bold" }}> ⚡ACTIVE</span>}
                            {isOnCd && <span style={{ color: "#5a4a2a" }}> · {Math.ceil((st.cdUntil - now) / 1000)}s CD</span>}
                            {nextTier && !isActive && <span style={{ color: "#5a4a2a" }}> (↑Lv{nextTier.minLevel})</span>}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div style={S.companionLore}>"{comp.lore}"</div>
                  <button
                    style={{ ...S.companionBtn, ...(canAfford ? S.companionBtnActive : S.companionBtnDisabled) }}
                    onClick={() => buyCompanion(comp, bulk.count, bulk.totalCost)}
                    disabled={!canAfford}
                  >
                    {btnLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SHOP ── */}
        {tab === "shop" && (
          <div style={S.shopView}>

            {/* ── Buy-mode toggle ── */}
            <div style={S.buyToggleWrap}>
              <span style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 1, flexShrink: 0 }}>BUY</span>
              {["x1", "x10", "x100", "max"].map(mode => (
                <button
                  key={mode}
                  style={{ ...S.buyToggleBtn, ...(buyMode === mode ? S.buyToggleBtnActive : {}) }}
                  onClick={() => setBuyMode(mode)}
                >
                  {mode === "max" ? "Max" : mode}
                </button>
              ))}
            </div>

            <div style={S.sectionLabel}>Idle Heroes</div>
            {HEROES.map(hero => {
              const level        = heroLevels[hero.id] || 0;
              const achDiscount  = achBonuses.upgradeCostReduce;
              const acqKind      = hero.acquisition?.kind || "shop";
              const isGoldBuyable = acqKind === "start" || acqKind === "shop";
              const isLocked     = level === 0 && !isGoldBuyable;

              const bulk      = isLocked ? { count: 0, totalCost: 0 } : calcBulkHeroBuy(hero, level, gold, buyMode, achDiscount);
              const canAfford = !isLocked && bulk.count > 0;
              const countTag  = bulk.count > 1 ? ` ×${bulk.count}` : "";
              const costLabel = isLocked
                ? null
                : canAfford
                  ? `🪙${fmt(bulk.totalCost)}${countTag}`
                  : buyMode === "max"
                    ? "Not enough 🪙"
                    : `🪙${fmt(bulk.totalCost)}`;

              const btnStyle = isLocked
                ? S.shopBtnDisabled
                : canAfford ? S.shopBtnActive : S.shopBtnDisabled;

              return (
                <button key={hero.id}
                  style={{ ...S.shopBtn, ...btnStyle, ...(isLocked ? { opacity: 0.55 } : {}) }}
                  onClick={() => buyHero(hero, bulk.count, bulk.totalCost)}
                  disabled={isLocked || !canAfford}
                >
                  <span style={S.shopEmoji}>{hero.emoji}</span>
                  <div style={S.shopInfo}>
                    <span style={S.shopName}>{hero.name}{level > 0 && <span style={S.lvlBadge}>Lv {level}</span>}</span>
                    <span style={S.shopSub}>{fmt(hero.baseDps)} DPS base</span>
                    <span style={S.heroLore}>{hero.lore}</span>
                  </div>
                  {isLocked
                    ? <span style={{ ...S.shopCost, fontSize: 10, color: "#8a6a3a", textAlign: "right", whiteSpace: "normal", maxWidth: 60 }}>{ACQ_EMOJI[acqKind]}<br/>{ACQ_LABEL[acqKind]}</span>
                    : <span style={{ ...S.shopCost, color: canAfford ? "#f5c518" : "#666" }}>{costLabel}</span>}
                </button>
              );
            })}

            <div style={{ ...S.sectionLabel, marginTop: 12 }}>Upgrades</div>
            {UPGRADES.map(upg => {
              const bought    = boughtUpgrades.includes(upg.id);
              const canAfford = !bought && gold >= upg.cost;
              return (
                <button key={upg.id} style={{ ...S.shopBtn, ...(bought ? S.shopBtnBought : canAfford ? S.shopBtnActive : S.shopBtnDisabled) }} onClick={() => buyUpgrade(upg)} disabled={bought || !canAfford}>
                  <span style={S.shopEmoji}>{bought ? "✅" : "🔮"}</span>
                  <div style={S.shopInfo}>
                    <span style={S.shopName}>{upg.name}</span>
                    <span style={S.shopSub}>{upg.desc}</span>
                  </div>
                  {bought
                    ? <span style={{ ...S.shopCost, color: "#444" }}>Owned</span>
                    : <span style={{ ...S.shopCost, color: canAfford ? "#f5c518" : "#666" }}>🪙{fmt(upg.cost)}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* ── COLLECTION ── */}
        {tab === "collection" && (
          <div style={S.shopView}>
            <div style={S.sectionLabel}>Hero Collection</div>
            <div style={{ fontSize: 12, color: "#8a7a5a", marginBottom: 12, fontStyle: "italic" }}>
              Heroes are unique. Some are found via chests, some are bought with gold, and some are offered as real-money relics.

            </div>

            {HEROES.map((hero, i) => {
              const rarity = i < 2 ? "Common" : i < 4 ? "Rare" : i < 6 ? "Epic" : "Legendary";
              const rarityColor = rarity === "Common" ? "#6a5a3a" : rarity === "Rare" ? "#3a6a90" : rarity === "Epic" ? "#8844cc" : "#f5c518";

              const level = heroLevels[hero.id] || 0;
              const unlocked = level > 0;
              const acquisitionKind = hero.acquisition?.kind || "shop";
              const pDesc = passiveDesc(hero.passive);

              return (
                <div key={hero.id} style={{ ...S.heroCollectionCard, borderColor: unlocked ? rarityColor + "88" : "#1e1810" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 26, width: 40, textAlign: "center" }}>{hero.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: "bold", color: unlocked ? "#e8dcc8" : "#6a5a3a" }}>
                          {hero.name}
                        </div>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, border: `1px solid ${rarityColor}44`, color: rarityColor }}>
                          {rarity}
                        </span>
                        {unlocked && <span style={S.lvlBadge}>Lv {level}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: unlocked ? "#8a7a5a" : "#4a3a2a", fontStyle: "italic", lineHeight: 1.4, marginBottom: 6 }}>
                        "{hero.lore}"
                      </div>
                      {pDesc && (
                        <div style={{ fontSize: 11, color: unlocked ? "#44cc88" : "#2a4a2a", marginBottom: 4 }}>
                          ✦ {pDesc}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: "#5a4a2a" }}>
                        {ACQ_EMOJI[acquisitionKind]} {ACQ_LABEL[acquisitionKind]}
                        {hero.acquisition?.note ? ` — ${hero.acquisition.note}` : ""}
                      </div>
                    </div>
                  </div>

                  {!unlocked && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#4a3a2a", fontStyle: "italic" }}>
                      {acquisitionKind === "chest"     && "Find in chests dropped by zone bosses."}
                      {acquisitionKind === "realmoney" && "Available in the Relic Store."}
                      {(acquisitionKind === "shop" || acquisitionKind === "start") && "Recruit in the Shop with gold."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STATS ── */}
        {tab === "stats" && (
          <div style={S.statsView}>
            {/* Soul Crystal balance + panel toggles */}
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <button style={{ ...S.shopBtn, flex: 1, ...(activePanel === "artifacts" ? S.shopBtnActive : S.shopBtnDisabled), justifyContent: "center" }}
                onClick={() => setActivePanel(p => p === "artifacts" ? null : "artifacts")}>
                <span>💎 Artifacts</span>
                <span style={{ marginLeft: 6, fontSize: 12, color: "#c0a0ff" }}>{soulCrystals} crystals</span>
              </button>
              <button style={{ ...S.shopBtn, flex: 1, ...(activePanel === "loot" ? S.shopBtnActive : S.shopBtnDisabled), justifyContent: "center" }}
                onClick={() => setActivePanel(p => p === "loot" ? null : "loot")}>
                <span>🎒 Loot</span>
                <span style={{ marginLeft: 6, fontSize: 12, color: "#f5c518" }}>{lootItems.length} items</span>
              </button>
            </div>

            {/* Artifact Tree Panel */}
            {activePanel === "artifacts" && (
              <div style={{ ...S.statCard, borderColor: "#4a2a8a" }}>
                <div style={{ ...S.statCardTitle, color: "#c0a0ff" }}>Artifact Tree · 💎 {soulCrystals} Soul Crystals</div>
                <div style={{ fontSize: 11, color: "#6a5a8a", marginBottom: 10, fontStyle: "italic" }}>Permanent upgrades. Survive Rebirth.</div>
                {ARTIFACT_UPGRADES.map(art => {
                  const owned     = artifactOwned.includes(art.id);
                  const canAfford = !owned && soulCrystals >= art.cost;
                  return (
                    <button key={art.id} style={{ ...S.shopBtn, ...(owned ? S.shopBtnBought : canAfford ? S.shopBtnActive : S.shopBtnDisabled), marginBottom: 5 }}
                      onClick={() => buyArtifact(art)} disabled={owned || !canAfford}>
                      <span style={S.shopEmoji}>{art.emoji}</span>
                      <div style={S.shopInfo}>
                        <span style={S.shopName}>{art.name}</span>
                        <span style={S.shopSub}>{art.desc}</span>
                      </div>
                      {owned
                        ? <span style={{ ...S.shopCost, color: "#5a7a5a" }}>✓</span>
                        : <span style={{ ...S.shopCost, color: canAfford ? "#c0a0ff" : "#4a3a6a" }}>💎{art.cost}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Loot Panel */}
            {activePanel === "loot" && (
              <div style={{ ...S.statCard, borderColor: "#5a3a10" }}>
                <div style={{ ...S.statCardTitle, color: "#f5c518", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Loot · {lootItems.filter(i=>i.equipped).length} equipped</span>
                  <span style={{ color: "#8a6aaa", fontSize: 12 }}>🌌 {voidDust} Void Dust</span>
                </div>
                {lootItems.length === 0
                  ? <div style={{ fontSize: 12, color: "#4a3a2a", fontStyle: "italic" }}>No loot yet. Defeat zone bosses for a 10% drop chance.</div>
                  : lootItems.map(item => {
                    const scrapYield = Math.max(1, Math.floor(item.bonus / 5));
                    return (
                      <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid #1e1810" }}>
                        {/* Top row: icon + name + equip */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                          <span style={{ fontSize: 22 }}>{item.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: "bold", color: item.equipped ? "#f5c518" : "#8a7a5a" }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: "#6a5a3a" }}>+{item.bonus}% {item.label} · Zone {item.zone}</div>
                          </div>
                          <button style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                            background: item.equipped ? "#2a1e08" : "#110d08",
                            borderColor: item.equipped ? "#f5c518" : "#3a2a10",
                            color: item.equipped ? "#f5c518" : "#8a7a5a" }}
                            onClick={() => toggleEquip(item.id)}>
                            {item.equipped ? "Unequip" : "Equip"}
                          </button>
                        </div>
                        {/* Bottom row: Reforge + Scrap */}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid", fontSize: 10, fontWeight: "bold", cursor: voidDust >= 3 ? "pointer" : "not-allowed", fontFamily: "inherit",
                              background: voidDust >= 3 ? "#0f0a18" : "#0a0808",
                              borderColor: voidDust >= 3 ? "#7a40cc88" : "#1e1810",
                              color: voidDust >= 3 ? "#c0a0ff" : "#4a3a5a" }}
                            onClick={() => reforgeItem(item.id, 1, 3)}
                            disabled={voidDust < 3}
                          >
                            🔨 +1% · 🌌3
                          </button>
                          <button
                            style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid", fontSize: 10, fontWeight: "bold", cursor: voidDust >= 5 ? "pointer" : "not-allowed", fontFamily: "inherit",
                              background: voidDust >= 5 ? "#0f0a18" : "#0a0808",
                              borderColor: voidDust >= 5 ? "#7a40cc" : "#1e1810",
                              color: voidDust >= 5 ? "#e0c0ff" : "#4a3a5a" }}
                            onClick={() => reforgeItem(item.id, 2, 5)}
                            disabled={voidDust < 5}
                          >
                            ⚡ +2% · 🌌5
                          </button>
                          <button
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #3a1a1a", fontSize: 10, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit",
                              background: "#120808", color: "#aa4444" }}
                            onClick={() => scrapItem(item.id)}
                          >
                            🗑 +🌌{scrapYield}
                          </button>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            <div style={S.statCard}>
              <div style={S.statCardTitle}>Combat</div>
              <StatRow label="Click Damage"   value={fmt(effectiveDmg)} highlight={isBerserk || isBattleCry} />
              <StatRow label="Hero DPS"        value={fmt(idleDps)} highlight={isBattleCry} />
              <StatRow label="Companion DPS"   value={fmt(companionDps)} />
              <StatRow label="Total DPS"       value={fmt(idleDps + companionDps)} highlight />
              {rebirthCount > 0 && <StatRow label="Soul Bonus" value={`×${rebirthMult.toFixed(1)}`} highlight />}
              {(artBonuses.clickMult + lootBonuses.clickMult) > 0 &&
                <StatRow label="Click Art+Loot" value={`+${Math.round((artBonuses.clickMult + lootBonuses.clickMult)*100)}%`} />}
              {artBonuses.synergyPct > 0 &&
                <StatRow label="Companion Synergy" value={`${artBonuses.synergyPct*100}% of click`} highlight />}
              {cdReduction > 0 &&
                <StatRow label="CD Reduction" value={`-${Math.round(cdReduction*100)}%`} />}
              {heroPassives.clickAdd > 0 &&
                <StatRow label="Hero Passive Click" value={`+${heroPassives.clickAdd}`} />}
              {heroPassives.dmgMult > 0 &&
                <StatRow label="Hero Passive Dmg" value={`+${Math.round(heroPassives.dmgMult*100)}%`} />}
              {heroPassives.goldMult > 0 &&
                <StatRow label="Hero Passive Gold" value={`+${Math.round(heroPassives.goldMult*100)}%`} />}
            </div>
            <div style={S.statCard}>
              <div style={S.statCardTitle}>Progress</div>
              <StatRow label="Zone" value={zone} />
              <div style={{ marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={S.dim}>Area progress</span>
                  <span style={S.dim}>{killCount % 10}/10</span>
                </div>
                <div style={S.zonePrgBar}>
                  <div style={{ ...S.zonePrgFill, width: `${(killCount % 10) * 10}%` }} />
                </div>
              </div>
            </div>

            {/* Hero Milestones reference */}
            <div style={S.statCard}>
              <div style={S.statCardTitle}>Hero Milestones</div>
              <div style={{ fontSize: 11, color: "#6a5a3a", marginBottom: 8, fontStyle: "italic" }}>Landmark levels multiply a hero's damage permanently.</div>
              {HERO_MILESTONES.map(ms => (
                <div key={ms.level} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={S.dim}>Level {ms.level}</span>
                  <strong style={{ color: "#f5c518" }}>{ms.label} damage</strong>
                </div>
              ))}
              <div style={{ marginTop: 8, borderTop: "1px solid #1e1810", paddingTop: 8 }}>
                {HEROES.filter(h => (heroLevels[h.id] || 0) > 0).map(hero => {
                  const lv = heroLevels[hero.id];
                  const mm = getHeroMilestoneMult(lv);
                  const next = HERO_MILESTONES.find(m => m.level > lv);
                  return (
                    <div key={hero.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={S.dim}>{hero.emoji} {hero.name} <span style={S.lvlBadge}>Lv {lv}</span></span>
                      <span style={{ color: mm > 1 ? "#f5c518" : "#6a5a3a" }}>
                        {mm > 1 ? `${mm}× active` : next ? `→ Lv ${next.level}` : "max"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={S.statCard}>
              <div style={S.statCardTitle}>Rebirth</div>
              {rebirthCount > 0 && <div style={S.rebirthCrystals}>{"💎".repeat(Math.min(rebirthCount, 10))}{rebirthCount > 10 ? ` ×${rebirthCount}` : ""}</div>}
              <div style={S.rebirthDesc}>
                {rebirthCount === 0
                  ? "Rebirth resets progress but grants a permanent Soul Bonus multiplying all DPS and gold, plus 1 Soul Crystal for the Artifact Tree."
                  : `Reborn ${rebirthCount}× — current bonus: ×${rebirthMult.toFixed(1)} to all DPS & gold. ${soulCrystals} Soul Crystals available.`}
              </div>
              <div style={S.rebirthNextBonus}>Next rebirth: ×{(1 + (rebirthCount + 1) * 0.5).toFixed(1)} bonus + 💎1 Soul Crystal</div>
              {zone >= 50
                ? <button style={S.rebirthBtn} onClick={() => setRebirthConfirm(true)}>🔁 Rebirth Now</button>
                : <div style={S.rebirthLocked}>🔒 Reach Zone 50 to unlock · Zone {zone}/50</div>}
            </div>

            {/* ── ACHIEVEMENTS ── */}
            <div style={{ ...S.statCard, borderColor: "#3a2060" }}>
              <div style={{ ...S.statCardTitle, color: "#a060ee" }}>
                Achievements
                <span style={{ float: "right", color: "#44cc88", fontWeight: "bold" }}>
                  {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6a5a7a", fontStyle: "italic", marginBottom: 10 }}>
                Lifetime goals that grant permanent multipliers. Survive rebirth.
              </div>
              {/* Active bonuses summary */}
              {unlockedAchievements.length > 0 && (() => {
                const b = achBonuses;
                return (
                  <div style={{ background: "#0f0a18", border: "1px solid #3a2060", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#7a50bb", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Active Bonuses</div>
                    {b.clickMult > 0    && <div style={{ fontSize: 12, color: "#e0c8ff", marginBottom: 3 }}>⚔️ +{Math.round(b.clickMult * 100)}% Click Damage</div>}
                    {b.goldMult > 0     && <div style={{ fontSize: 12, color: "#e0c8ff", marginBottom: 3 }}>🪙 +{Math.round(b.goldMult * 100)}% Gold Dropped</div>}
                    {b.dpsMult > 0      && <div style={{ fontSize: 12, color: "#e0c8ff", marginBottom: 3 }}>📯 +{Math.round(b.dpsMult * 100)}% Hero DPS</div>}
                    {b.upgradeCostReduce > 0 && <div style={{ fontSize: 12, color: "#e0c8ff", marginBottom: 3 }}>🏷️ −{Math.round(b.upgradeCostReduce * 100)}% Hero Costs</div>}
                  </div>
                );
              })()}
              {/* Achievement list */}
              {ACHIEVEMENTS.map(ach => {
                const unlocked = unlockedAchievements.includes(ach.id);
                // Compute progress for the stat
                const statCurrent = ach.stat === "totalClicks"    ? totalClicks
                                  : ach.stat === "totalKills"     ? totalKills
                                  : ach.stat === "totalGoldEarned"? totalGoldEarned
                                  : ach.stat === "totalGoldSpent" ? totalGoldSpent
                                  : ach.stat === "maxZone"        ? maxZoneReached
                                  : ach.stat === "maxCombo"       ? maxComboReached
                                  : ach.stat === "totalRebirths"  ? rebirthCount
                                  : 0;
                const pct = Math.min(100, (statCurrent / ach.threshold) * 100);
                return (
                  <div key={ach.id} style={{
                    padding: "10px 0",
                    borderBottom: "1px solid #1e1810",
                    opacity: unlocked ? 1 : 0.7,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                      <span style={{ fontSize: 22, flexShrink: 0, filter: unlocked ? "none" : "grayscale(1)" }}>{ach.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: "bold", color: unlocked ? "#c0a0ff" : "#8a7a9a" }}>{ach.name}</span>
                          {unlocked && <span style={{ fontSize: 9, background: "#2a1a4a", color: "#a060ee", border: "1px solid #6a30cc", borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>DONE</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#6a5a7a" }}>{ach.desc}</div>
                        <div style={{ fontSize: 10, color: "#44cc88", marginTop: 2 }}>{ach.rewardText}</div>
                      </div>
                    </div>
                    {!unlocked && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6a5a7a", marginBottom: 3 }}>
                          <span>{fmt(statCurrent)} / {fmt(ach.threshold)}</span>
                          <span>{Math.floor(pct)}%</span>
                        </div>
                        <div style={{ height: 4, background: "#1e1810", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#5a20aa,#a060ee)", borderRadius: 2, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    )}
                    {unlocked && (
                      <div style={{ fontSize: 10, color: "#6a5a7a", fontStyle: "italic" }}>{ach.flavor}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* NAV */}
      <nav style={S.nav}>
        {[
          { id: "battle",     emoji: "⚔️",  label: "Battle"  },
          { id: "lore",       emoji: "🗺️",  label: "Map"     },
          { id: "companions", emoji: "👥",  label: "Allies"  },
          { id: "shop",       emoji: "🏪",  label: "City"    },
          { id: "stats",      emoji: "📊",  label: "Stats"   },
        ].map(t => (
          <button key={t.id} style={{ ...S.navBtn, ...(tab === t.id ? S.navBtnActive : {}) }} onClick={() => setTab(t.id)}>
            <span style={S.navEmoji}>{t.emoji}</span>
            <span style={S.navLabel}>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* OFFLINE MODAL */}
      {offlineModal && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <div style={S.modalIcon}>⏳</div>
            <div style={S.modalTitle}>Welcome Back!</div>
            <div style={S.modalBody}>Your companions held the line while you were away.</div>
            <div style={S.modalTime}>
              {offlineModal.seconds >= 3600
                ? `${Math.floor(offlineModal.seconds / 3600)}h ${Math.floor((offlineModal.seconds % 3600) / 60)}m`
                : `${Math.floor(offlineModal.seconds / 60)}m ${offlineModal.seconds % 60}s`} offline
            </div>
            <div style={S.modalGold}>🪙 +{fmt(offlineModal.gold)}</div>
            <button style={S.modalBtn} onClick={() => setOfflineModal(null)}>Claim Earnings</button>
          </div>
        </div>
      )}

      {/* REBIRTH MODAL */}
      {rebirthConfirm && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <div style={S.modalIcon}>💎</div>
            <div style={S.modalTitle}>Rebirth?</div>
            <div style={S.modalBody}>Time fractures. You die. You return. Your companions will forget — but the Eclipse will fear you more.</div>
            <div style={{ ...S.modalGold, fontSize: 18, marginBottom: 8 }}>Soul Crystal #{rebirthCount + 1}</div>
            <div style={{ fontSize: 13, color: "#44cc88", marginBottom: 24 }}>
              New bonus: ×{(1 + (rebirthCount + 1) * 0.5).toFixed(1)} to all DPS & gold — forever
            </div>
            <button style={S.modalBtn} onClick={doRebirth}>🔁 Confirm Rebirth</button>
            <button style={{ ...S.modalBtn, marginTop: 10, background: "#1e1810", border: "1px solid #3a2d1a", color: "#8a7a5a" }} onClick={() => setRebirthConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* CHRONICLE MODAL */}
      {activeChronicle && (
        <div style={S.modalOverlay} onClick={() => setActiveChronicle(null)}>
          <div style={S.chronicleBox} onClick={e => e.stopPropagation()}>
            <div style={S.chronicleIcon}>{activeChronicle.icon}</div>
            <div style={S.chronicleEra}>Chronicle</div>
            <div style={S.chronicleTitle}>{activeChronicle.title}</div>
            <div style={S.chronicleText}>{activeChronicle.text}</div>
            <button style={S.modalBtn} onClick={() => setActiveChronicle(null)}>Continue</button>
          </div>
        </div>
      )}

      {/* LOOT DROP / CHEST MODAL */}
      {lootModal && (
        <div style={S.modalOverlay}>
          <div
            style={{
              ...S.modalBox,
              borderColor: lootModal.chest ? (lootModal.chestKind === "hero" ? "#5a4010" : "#c8900a") : "#c8900a",
            }}
          >
            <div style={S.modalIcon}>{lootModal.emoji}</div>
            <div
              style={{
                fontSize: 10,
                color: "#8a6a3a",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {lootModal.chest ? `Chest Unsealed · Zone ${lootModal.zone}` : `Boss Drop · Zone ${lootModal.zone}`}
            </div>

            <div style={S.modalTitle}>{lootModal.name}</div>

            {lootModal.chest ? (
              <div style={S.modalBody}>
                {lootModal.chestKind === "hero"
                  ? "A hero contract was sealed into the chest. Will you claim it?"
                  : "Inside the chest, multiple loot fragments flicker with eclipse-energy."}
              </div>
            ) : (
              <div style={S.modalBody}>A rare item fallen from the eclipse-touched boss.</div>
            )}

            {lootModal.chest && lootModal.chestKind === "loot" ? (
              <div style={{ marginTop: -6, marginBottom: 14 }}>
                {(lootModal.items || []).map((it, idx) => (
                  <div
                    key={it.id || idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 12,
                      color: "#8a7a5a",
                      padding: "4px 0",
                      borderBottom: "1px solid #1e1810",
                    }}
                  >
                    <span>
                      {it.emoji} {it.name}
                    </span>
                    <span style={{ color: "#f5c518" }}>+{it.bonus}%</span>
                  </div>
                ))}
              </div>
            ) : !lootModal.chest ? (
              <div style={{ ...S.modalGold, fontSize: 22, color: "#44cc88" }}>+{lootModal.bonus}% {lootModal.label}</div>
            ) : (
              <div style={{ ...S.modalGold, fontSize: 22, color: "#44cc88" }}>Hero Unlocked</div>
            )}

            <button
              style={S.modalBtn}
              onClick={async () => {
                if (lootModal.chest) {
                  const ok = await watchAd();
                  if (!ok) return;
                  claimLoot();
                  return;
                }
                claimLoot();
              }}
            >
              {lootModal.chest ? "🎁 Watch Ad to Open" : "⚔ Equip & Claim"}
            </button>

            <button
              style={{ ...S.modalBtn, marginTop: 8, background: "#1e1810", border: "1px solid #3a2d1a", color: "#6a5a3a" }}
              onClick={() => {
                // For chest hero/loot, always claim immediately (ads-required behavior can be added later).
                // Keeping this button for consistent UX; it just closes modal.
                setLootModal(null);
              }}
            >
              {lootModal.chest ? "Skip" : "Store in Bag"}
            </button>
          </div>
        </div>
      )}

      {/* MILESTONE TOAST */}
      {milestoneToast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200, pointerEvents: "none",
          background: "linear-gradient(135deg,#1a1008,#2a1a08)", border: "2px solid #f5c518",
          borderRadius: 12, padding: "10px 18px", textAlign: "center", boxShadow: "0 0 30px #f5c51844" }}>
          <div style={{ fontSize: 20 }}>{milestoneToast.hero.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#f5c518" }}>{milestoneToast.hero.name} Milestone!</div>
          <div style={{ fontSize: 11, color: "#44cc88" }}>Level {milestoneToast.level} · Damage {milestoneToast.mult}</div>
        </div>
      )}

      {/* BOSS FAIL TOAST */}
      {bossFailToast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200, pointerEvents: "none",
          background: "linear-gradient(135deg,#1a0808,#2a0808)", border: "2px solid #cc2200",
          borderRadius: 12, padding: "12px 20px", textAlign: "center", boxShadow: "0 0 30px #cc220044",
          whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>💀</div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#ff4444" }}>Boss Timer Expired!</div>
          <div style={{ fontSize: 11, color: "#8a5a5a", marginTop: 3 }}>Pushed back → Zone {bossFailToast.prevZone} · Farming</div>
        </div>
      )}

      {/* COMMANDER PATH CHOICE MODAL */}
      {pathChoiceModal && (
        <div style={S.modalOverlay}>
          <div style={{ ...S.modalBox, maxWidth: 380, padding: "24px 20px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={S.modalIcon}>👁️</div>
            <div style={S.modalTitle}>Choose Your Path</div>
            <div style={{ ...S.modalBody, marginBottom: 20 }}>
              "Time has shattered. You stand at the crossroads of your next lifetime, Eternal Commander. How will you fight?"
            </div>
            {COMMANDER_PATHS.map(path => (
              <div key={path.id} style={{ ...S.pathCard, borderColor: path.color + "66" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>{path.emoji}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: "bold", color: path.color }}>{path.name}</div>
                    <div style={{ fontSize: 10, color: "#8a7a5a", letterSpacing: 1 }}>{path.subtitle}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#6a5a4a", fontStyle: "italic", marginBottom: 10, lineHeight: 1.5 }}>
                  "{path.lore}"
                </div>
                <div style={{ marginBottom: 12 }}>
                  {path.bonuses.map((b, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#c8b888", marginBottom: 3 }}>
                      ✦ {b}
                    </div>
                  ))}
                </div>
                <button
                  style={{ ...S.modalBtn, background: `linear-gradient(90deg, ${path.color}aa, ${path.color})`, fontSize: 13, padding: "11px 0" }}
                  onClick={() => chooseCommanderPath(path.id)}
                >
                  Choose {path.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <div style={S.statRow}>
      <span style={S.dim}>{label}</span>
      <strong style={{ color: highlight ? "#f5c518" : "#e8dcc8" }}>{value}</strong>
    </div>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  root: { height: "100vh", background: "#0d0b0a", color: "#e8dcc8", fontFamily: "'Georgia','Times New Roman',serif", display: "flex", flexDirection: "column", overflow: "hidden", maxWidth: 480, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "linear-gradient(90deg,#1a1108,#0d0b0a)", borderBottom: "1px solid #2a2010", flexShrink: 0 },
  logo: { fontSize: 17, fontWeight: "bold", color: "#f5c518", letterSpacing: 2, textShadow: "0 0 16px #f5c51855" },
  subtitle: { fontSize: 10, color: "#6a5a3a", letterSpacing: 1 },
  goldPill: { background: "#1e1710", border: "1px solid #3a2d1a", borderRadius: 20, padding: "5px 14px", fontSize: 15, display: "flex", alignItems: "center", gap: 6 },
  goldNum: { color: "#f5c518", fontWeight: "bold" },

  abilityBar: { display: "flex", gap: 8, padding: "8px 12px", background: "#0f0c08", borderBottom: "1px solid #2a2010", flexShrink: 0 },
  abilityBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 6px", borderRadius: 10, border: "2px solid", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", gap: 3 },
  abilityEmoji: { fontSize: 26 },
  abilityName:  { fontSize: 10, fontWeight: "bold", color: "#e8dcc8", letterSpacing: 0.5 },
  abilityTimer: { fontSize: 10, fontWeight: "bold" },

  content: { flex: 1, overflowY: "auto", padding: "0 0 8px 0" },

  battleView: { display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 12px", gap: 8 },
  zoneLabel: { fontSize: 11, color: "#8a7a5a", letterSpacing: 2, textTransform: "uppercase" },
  enemyCard: { position: "relative", background: "linear-gradient(145deg,#1a1108,#110d05)", border: "2px solid #3a2d1a", borderRadius: 14, padding: "14px 28px", cursor: "pointer", userSelect: "none", textAlign: "center", width: "100%", boxSizing: "border-box", boxShadow: "0 0 40px #00000088,inset 0 0 40px #00000044", display: "flex", flexDirection: "column", alignItems: "center" },
  enemyEmoji: { fontSize: 56, display: "block", marginBottom: 6 },
  enemyName:  { fontSize: 16, fontWeight: "bold", color: "#f5c518", marginBottom: 8, width: "100%", textAlign: "center" },
  hpBar: { height: 7, background: "#1e1710", borderRadius: 4, border: "1px solid #3a2d1a", overflow: "hidden", marginBottom: 4, width: "100%" },
  hpFill: { height: "100%", background: "linear-gradient(90deg,#8b0000,#cc2200)", borderRadius: 4, transition: "width 0.1s linear" },
  hpText: { fontSize: 10, color: "#8a7a5a", marginBottom: 6, width: "100%", textAlign: "center" },
  tapHint: { fontSize: 10, color: "#4a3a2a", letterSpacing: 1, width: "100%", textAlign: "center" },
  activeBadges: { display: "flex", gap: 4, justifyContent: "center", marginBottom: 8, flexWrap: "wrap", width: "100%" },
  badge: { fontSize: 9, fontWeight: "bold", letterSpacing: 1, padding: "2px 6px", borderRadius: 4 },
  rewardRow: { display: "flex", justifyContent: "space-between", width: "100%", fontSize: 12 },

  // Combo meter
  comboWrap:    { width: "100%", padding: "6px 10px", background: "#0d0b0a", border: "1px solid #1e1810", borderRadius: 8, boxSizing: "border-box" },
  comboBarTrack: { position: "relative", height: 6, background: "#1a1510", borderRadius: 3, border: "1px solid #2a2010", overflow: "visible" },
  comboBarFill:  { height: "100%", borderRadius: 3, transition: "width 0.1s ease, background 0.3s ease, box-shadow 0.3s ease", minWidth: 0 },
  zoneProgressWrap: { width: "100%" },
  zonePrgBar: { height: 6, background: "#1e1710", borderRadius: 3, border: "1px solid #2a2010", overflow: "hidden" },
  zonePrgFill: { height: "100%", background: "linear-gradient(90deg,#3a7a20,#6acc30)", borderRadius: 3, transition: "width 0.3s ease" },

  // Mode toggle
  modeToggleWrap: { display: "flex", width: "100%", background: "#0f0c08", border: "1px solid #2a2010", borderRadius: 7, overflow: "hidden" },
  modeBtn:    { flex: 1, padding: "6px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5, transition: "all 0.2s" },
  modeBtnOn:  { background: "#1e2a10", color: "#6acc30", borderBottom: "2px solid #4a8a20" },
  modeBtnOff: { background: "transparent", color: "#4a3a2a" },

  // Boss stage timer bar
  bossTimerBar:  { height: 7, background: "#1e1208", borderRadius: 4, border: "1px solid #3a1a08", overflow: "hidden" },
  bossTimerFill: { height: "100%", borderRadius: 4, transition: "width 0.2s linear, background 0.5s" },

  loreCard: { width: "100%", background: "#0a0808", border: "1px solid #1e1410", borderRadius: 10, padding: "12px 14px" },
  loreZone: { fontSize: 9, color: "#5a4a2a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  loreText: { fontSize: 12, color: "#8a7a5a", fontStyle: "italic", lineHeight: 1.6 },

  shopView: { padding: "12px 14px" },
  sectionLabel: { fontSize: 10, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #1e1810" },

  // Story banner in companions tab
  storyBanner: { background: "linear-gradient(135deg,#0f0a18,#130d08)", border: "1px solid #2a1a3a", borderRadius: 12, padding: "14px 16px", marginBottom: 16 },
  storyTitle: { fontSize: 14, fontWeight: "bold", color: "#c0a0ff", letterSpacing: 1, marginBottom: 8 },
  storyBody: { fontSize: 12, color: "#8a7a9a", lineHeight: 1.65, fontStyle: "italic" },

  // Companion cards
  companionCard: { background: "#13100a", border: "1px solid", borderRadius: 12, padding: "12px 14px", marginBottom: 10 },
  companionTop: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  companionEmoji: { fontSize: 28, flexShrink: 0 },
  companionInfo: { flex: 1 },
  companionName: { fontSize: 14, fontWeight: "bold", color: "#e8dcc8" },
  companionTitle: { fontSize: 10, color: "#8a6a3a", letterSpacing: 1, marginBottom: 2 },
  companionDps: { fontSize: 11, color: "#44cc88" },
  companionLore: { fontSize: 11, color: "#6a5a4a", fontStyle: "italic", lineHeight: 1.5, marginBottom: 10 },
  companionBtn: { width: "100%", padding: "9px 0", borderRadius: 8, border: "1px solid", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: "bold", letterSpacing: 0.5 },
  companionBtnActive:   { background: "#1e1608", borderColor: "#5a4010", color: "#f5c518" },
  companionBtnDisabled: { background: "#110d08", borderColor: "#1e1810", color: "#4a3a2a", cursor: "not-allowed" },

  // Buy-mode toggle (Companions tab)
  buyToggleWrap:      { display: "flex", alignItems: "center", gap: 5, marginBottom: 10, padding: "8px 2px" },
  buyToggleBtn:       { flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid #2a2010", background: "#110d08", color: "#6a5a3a", fontSize: 12, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer", letterSpacing: 0.5, transition: "all 0.15s" },
  buyToggleBtnActive: { background: "#2a1e08", borderColor: "#f5c518", color: "#f5c518", boxShadow: "0 0 8px #f5c51833" },

  shopBtn: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px", marginBottom: 6, borderRadius: 8, border: "1px solid", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s", boxSizing: "border-box" },
  shopBtnActive:   { background: "#1e1608", borderColor: "#5a4010", color: "#e8dcc8" },
  shopBtnDisabled: { background: "#110d08", borderColor: "#1e1810", color: "#4a3a2a", cursor: "not-allowed" },
  shopBtnBought:   { background: "#0d1208", borderColor: "#1e2a10", color: "#5a7a5a", cursor: "default" },
  shopEmoji: { fontSize: 22, flexShrink: 0 },
  shopInfo:  { display: "flex", flexDirection: "column", flex: 1 },
  shopName:  { fontSize: 13, fontWeight: "bold" },
  shopSub:   { fontSize: 11, color: "#6a5a3a" },
  shopCost:  { fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap" },
  lvlBadge: { fontSize: 10, background: "#f5c51822", color: "#f5c518", border: "1px solid #f5c51844", borderRadius: 4, padding: "1px 5px", marginLeft: 6 },

  statsView: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 },
  statCard: { background: "#13100a", border: "1px solid #2a2010", borderRadius: 10, padding: 14 },
  statCardTitle: { fontSize: 10, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #1e1810" },
  statRow: { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7 },
  dim: { color: "#6a5a3a", fontSize: 12 },

  rebirthCrystals: { fontSize: 22, marginBottom: 8, letterSpacing: 2 },
  rebirthDesc: { fontSize: 12, color: "#8a7a5a", lineHeight: 1.5, marginBottom: 10 },
  rebirthNextBonus: { fontSize: 12, color: "#44cc88", marginBottom: 14 },
  rebirthBtn: { width: "100%", padding: "13px 0", background: "linear-gradient(90deg,#2a0a6a,#5a10cc)", border: "1px solid #7a30ff88", borderRadius: 10, color: "#e0d0ff", fontSize: 15, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer", letterSpacing: 1, boxShadow: "0 0 20px #5a10cc44" },
  rebirthLocked: { fontSize: 12, color: "#4a3a2a", textAlign: "center", padding: "10px 0", border: "1px solid #1e1810", borderRadius: 8 },

  nav: { display: "flex", background: "#0f0c08", borderTop: "1px solid #2a2010", flexShrink: 0 },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "9px 0 11px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", gap: 2, borderTop: "2px solid transparent" },
  navBtnActive: { borderTop: "2px solid #f5c518", background: "#1a1408" },
  navEmoji: { fontSize: 18 },
  navLabel: { fontSize: 9, color: "#8a7a5a", letterSpacing: 1 },

  modalOverlay: { position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 },
  modalBox: { background: "linear-gradient(160deg,#1e1608,#110d05)", border: "2px solid #5a4010", borderRadius: 18, padding: "32px 28px", textAlign: "center", width: "100%", maxWidth: 340, boxShadow: "0 0 60px #f5c51822" },
  modalIcon:  { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#f5c518", marginBottom: 8 },
  modalBody:  { fontSize: 13, color: "#8a7a5a", marginBottom: 16, lineHeight: 1.5 },
  modalTime:  { fontSize: 12, color: "#6a5a3a", marginBottom: 8 },
  modalGold:  { fontSize: 32, fontWeight: "bold", color: "#f5c518", marginBottom: 24, textShadow: "0 0 20px #f5c51888" },
  modalBtn: { width: "100%", padding: "14px 0", background: "linear-gradient(90deg,#8a6010,#c8900a)", border: "none", borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer", letterSpacing: 1 },

  // Region header in battle tab
  regionHeader: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "#0d0b0a", border: "1px solid", borderRadius: 10, padding: "10px 14px" },
  regionEmoji:  { fontSize: 28, flexShrink: 0 },
  regionName:   { fontSize: 13, fontWeight: "bold", letterSpacing: 0.5, marginBottom: 2 },

  // Hero lore in shop
  heroLore: { fontSize: 10, color: "#5a4a2a", fontStyle: "italic", lineHeight: 1.4, marginTop: 3 },

  // Chronicle modal
  chronicleBox:   { background: "linear-gradient(160deg,#0f0818,#0d0a14)", border: "2px solid #4a2a8a", borderRadius: 18, padding: "32px 28px", textAlign: "center", width: "100%", maxWidth: 340, boxShadow: "0 0 60px #5a10cc44" },
  chronicleIcon:  { fontSize: 52, marginBottom: 10 },
  chronicleEra:   { fontSize: 9, color: "#6a4a9a", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 },
  chronicleTitle: { fontSize: 20, fontWeight: "bold", color: "#c0a0ff", marginBottom: 14 },
  chronicleText:  { fontSize: 13, color: "#8a7a9a", lineHeight: 1.65, fontStyle: "italic", marginBottom: 24 },

  // Commander path card inside path choice modal
  pathCard: { background: "#13100a", border: "1px solid", borderRadius: 12, padding: "14px", marginBottom: 12, textAlign: "left" },

  heroCollectionCard: {
    background: "#13100a",
    border: "1px solid #2a2010",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 10,
  },
};

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  @keyframes shake {
    0%   { transform: translate(0,0) rotate(0deg); }
    25%  { transform: translate(-4px,2px) rotate(-1deg); }
    50%  { transform: translate(4px,-2px) rotate(1deg); }
    75%  { transform: translate(-2px,4px) rotate(-0.5deg); }
    100% { transform: translate(0,0) rotate(0deg); }
  }
  .shake { animation: shake 0.15s ease; }
  @keyframes enemy-float {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-8px); }
  }
  .enemy-idle { animation: enemy-float 3s ease-in-out infinite; display: block; }

  .enemy-sprite {
    width: 160px;
    height: 160px;
    object-fit: contain;
    image-rendering: pixelated;
    pointer-events: none;
    user-select: none;
    display: block;
    margin: 0 auto;
  }

  /* float alias (use enemy-float keyframes so idleAnim === "float" works like the pasted animation) */
  @keyframes float {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-8px); }
  }
  .float {
    animation: float 3s ease-in-out infinite;
    display: block;
    margin: 0 auto;
  }


  @keyframes dragonHover {
    0%,100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-15px) scale(1.04); }
  }
  .dragonHover {
    animation: dragonHover 4s ease-in-out infinite;
    display: block;
    margin: 0 auto;
  }

  @keyframes hitFlash {
    0% { filter: brightness(2); }
    100% { filter: brightness(1); }
  }
  .enemy-hit {
    animation: hitFlash 0.15s ease;
  }

  @keyframes floatUp {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-60px) scale(1.4); }
  }
  .float-dmg {
    position: absolute;
    pointer-events: none;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 0 0 8px currentColor;
    animation: floatUp 0.9s ease-out forwards;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    font-family: Georgia, serif;
  }
  @keyframes weakPulse {
    0%,100% { transform: translate(-50%,-50%) scale(1);   box-shadow: 0 0 12px #ff440088; }
    50%     { transform: translate(-50%,-50%) scale(1.35); box-shadow: 0 0 24px #ff6600cc; }
  }
  .weak-point { animation: weakPulse 0.45s ease-in-out infinite !important; }

  @keyframes timerPulse {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.4; }
  }
  @keyframes achieveSlide {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-16px); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
